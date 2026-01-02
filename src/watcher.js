#!/usr/bin/env node
/**
 * ClaudeLink - File Watcher
 * Monitors Downloads folder for .claude.json files
 * @author Grey Wolf <beitholim@proton.me>
 */

const fs = require('fs');
const path = require('path');
const ClaudeLink = require('./index');

const BANNER = `
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗               ║
║  ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝               ║
║  ██║     ██║     ███████║██║   ██║██║  ██║█████╗                 ║
║  ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝                 ║
║  ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗               ║
║   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝               ║
║                                                                   ║
║   L I N K   v1.0.0                                               ║
║   Local AI Bridge - Secure Connector                              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`;

class Watcher {
  constructor() {
    this.link = new ClaudeLink();
    this.watchDir = this.link.watchDir;
    this.processing = new Set();
  }

  start() {
    console.log('\x1b[36m' + BANNER + '\x1b[0m');
    console.log(`\x1b[33m👁️  Watching: ${this.watchDir}\x1b[0m`);
    console.log(`\x1b[32m📁 Processed: ${this.link.processedDir}\x1b[0m`);
    console.log(`\x1b[32m📋 Log: ${this.link.logFile}\x1b[0m`);
    console.log(`\n\x1b[36mWaiting for .claude.json files...\x1b[0m\n`);

    // Process existing files first
    this._scanExisting();

    // Watch for new files
    fs.watch(this.watchDir, { persistent: true }, (eventType, filename) => {
      if (eventType === 'rename' && filename && this.link.isCommandFile(filename)) {
        const filePath = path.join(this.watchDir, filename);
        
        // Debounce - avoid processing same file twice
        if (this.processing.has(filename)) return;
        
        // Check file exists (rename fires on delete too)
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            this._processFile(filePath, filename);
          }
        }, 100);
      }
    });
  }

  _scanExisting() {
    const files = fs.readdirSync(this.watchDir);
    for (const file of files) {
      if (this.link.isCommandFile(file)) {
        const filePath = path.join(this.watchDir, file);
        this._processFile(filePath, file);
      }
    }
  }

  async _processFile(filePath, filename) {
    this.processing.add(filename);
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n\x1b[36m[${timestamp}] 📥 Command detected: ${filename}\x1b[0m`);
    
    try {
      await this.link.processFile(filePath);
    } catch (error) {
      console.error(`\x1b[31mError processing ${filename}: ${error.message}\x1b[0m`);
    }
    
    this.processing.delete(filename);
    console.log(`\n\x1b[36mWaiting for .claude.json files...\x1b[0m`);
  }
}

// Run if executed directly
if (require.main === module) {
  const watcher = new Watcher();
  
  process.on('SIGINT', () => {
    console.log('\n\x1b[33mShutting down ClaudeLink...\x1b[0m');
    process.exit(0);
  });
  
  watcher.start();
}

module.exports = Watcher;
