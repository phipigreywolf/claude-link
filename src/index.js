/**
 * ClaudeLink - Core Connector Module
 * @author Grey Wolf <beitholim@proton.me>
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class ClaudeLink {
  constructor(options = {}) {
    this.watchDir = options.watchDir || path.join(process.env.HOME, 'Downloads');
    this.processedDir = options.processedDir || path.join(process.env.HOME, '.claudelink', 'processed');
    this.logFile = options.logFile || path.join(process.env.HOME, '.claudelink', 'claudelink.log');
    this.confirmMode = options.confirmMode || false;
    this.allowedPatterns = ['.claude.json', 'claude-cmd-'];
    
    this._ensureDirectories();
  }

  _ensureDirectories() {
    const dirs = [this.processedDir, path.dirname(this.logFile)];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Security: Validate command against blocklist
   * @param {string} cmd - Command to validate
   * @returns {object} - { valid: boolean, reason?: string }
   */
  validateCommand(cmd) {
    const blockedPatterns = [
      { pattern: /rm\s+(-rf?|--recursive)\s+\/(\s|$|;|\||&)/, reason: 'Destructive: rm root' },
      { pattern: /rm\s+-rf\s+\/\s*--no-preserve/, reason: 'Destructive: rm no-preserve-root' },
      { pattern: /mkfs.*\/dev\/sd/, reason: 'Destructive: format disk' },
      { pattern: /dd\s+.*of=\/dev\/sd/, reason: 'Destructive: dd to disk' },
      { pattern: /:\(\)\{\s*:\|:\s*&\s*\}\s*;:/, reason: 'Fork bomb detected' },
      { pattern: />\s*\/dev\/sd/, reason: 'Destructive: write to disk' },
      { pattern: /curl.*\|\s*(ba)?sh/, reason: 'Remote code execution' },
      { pattern: /wget.*\|\s*(ba)?sh/, reason: 'Remote code execution' },
    ];

    for (const { pattern, reason } of blockedPatterns) {
      if (pattern.test(cmd)) {
        return { valid: false, reason };
      }
    }

    return { valid: true };
  }

  /**
   * Parse command file (JSON format)
   * @param {string} filePath - Path to .claude.json file
   * @returns {object} - { command, description, metadata }
   */
  parseCommandFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      return {
        command: data.command || data.cmd || data.script || null,
        description: data.description || data.desc || 'No description',
        metadata: {
          id: data.id || crypto.randomUUID(),
          timestamp: data.timestamp || new Date().toISOString(),
          source: data.source || 'unknown'
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Execute a validated command
   * @param {string} cmd - Command to execute
   * @param {object} options - Execution options
   * @returns {Promise<object>} - { stdout, stderr, exitCode, duration }
   */
  async execute(cmd, options = {}) {
    const validation = this.validateCommand(cmd);
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Command blocked: ${validation.reason}`,
        exitCode: -1
      };
    }

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const proc = spawn('bash', ['-c', cmd], {
        cwd: options.cwd || process.env.HOME,
        env: { ...process.env, ...options.env },
        timeout: options.timeout || 30000
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        if (options.onStdout) options.onStdout(data.toString());
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        if (options.onStderr) options.onStderr(data.toString());
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          duration
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          exitCode: -1,
          duration: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Check if file is a Claude command file
   * @param {string} filename - Filename to check
   * @returns {boolean}
   */
  isCommandFile(filename) {
    return this.allowedPatterns.some(pattern => {
      if (pattern.startsWith('.')) {
        return filename.endsWith(pattern);
      }
      return filename.startsWith(pattern);
    });
  }

  /**
   * Log execution result
   * @param {object} result - Execution result
   */
  log(entry) {
    const logLine = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry
    }) + '\n';
    
    fs.appendFileSync(this.logFile, logLine);
  }

  /**
   * Process a command file
   * @param {string} filePath - Path to command file
   * @returns {Promise<object>} - Processing result
   */
  async processFile(filePath) {
    const filename = path.basename(filePath);
    
    if (!this.isCommandFile(filename)) {
      return { skipped: true, reason: 'Not a command file' };
    }

    const parsed = this.parseCommandFile(filePath);
    
    if (parsed.error) {
      this.log({ file: filename, error: parsed.error });
      return { success: false, error: parsed.error };
    }

    if (!parsed.command) {
      this.log({ file: filename, error: 'No command found' });
      return { success: false, error: 'No command in file' };
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📄 File: ${filename}`);
    console.log(`📝 Description: ${parsed.description}`);
    console.log(`⚡ Command: ${parsed.command}`);
    console.log(`${'─'.repeat(60)}`);

    const result = await this.execute(parsed.command);

    if (result.success) {
      console.log(`\n✅ SUCCESS (${result.duration}ms)`);
      console.log(`${'─'.repeat(40)}`);
      console.log(result.stdout);
    } else {
      console.log(`\n❌ FAILED (exit: ${result.exitCode})`);
      if (result.error) console.log(`Error: ${result.error}`);
      if (result.stderr) console.log(`Stderr: ${result.stderr}`);
    }

    this.log({
      file: filename,
      command: parsed.command,
      exitCode: result.exitCode,
      duration: result.duration,
      success: result.success
    });

    // Move to processed
    const destPath = path.join(this.processedDir, `${Date.now()}-${filename}`);
    fs.renameSync(filePath, destPath);

    return result;
  }
}

module.exports = ClaudeLink;
