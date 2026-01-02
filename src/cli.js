#!/usr/bin/env node
/**
 * ClaudeLink CLI
 * @author Grey Wolf <beitholim@proton.me>
 */

const path = require('path');
const fs = require('fs');
const ClaudeLink = require('./index');
const Watcher = require('./watcher');

const VERSION = '1.0.0';

const HELP = `
ClaudeLink v${VERSION} - Local AI Bridge

Usage:
  claudelink [command] [options]

Commands:
  watch           Start file watcher (default)
  exec <file>     Execute a single .claude.json file
  validate <cmd>  Check if a command is allowed
  test            Run self-tests
  version         Show version
  help            Show this help

Options:
  --watch-dir <path>    Directory to watch (default: ~/Downloads)
  --confirm             Require confirmation before execution
  --quiet               Minimal output

Examples:
  claudelink                           # Start watcher
  claudelink watch --watch-dir /tmp    # Watch custom directory
  claudelink exec command.claude.json  # Execute single file
  claudelink validate "ls -la"         # Check if command is safe

Author: Grey Wolf <beitholim@proton.me>
`;

function parseArgs(args) {
  const result = { command: 'watch', options: {}, args: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '_');
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        result.options[key] = next;
        i++;
      } else {
        result.options[key] = true;
      }
    } else if (!result.command || result.command === 'watch') {
      if (['watch', 'exec', 'validate', 'test', 'version', 'help'].includes(arg)) {
        result.command = arg;
      } else {
        result.args.push(arg);
      }
    } else {
      result.args.push(arg);
    }
  }
  
  return result;
}

async function main() {
  const { command, options, args } = parseArgs(process.argv.slice(2));
  
  const link = new ClaudeLink({
    watchDir: options.watch_dir,
    confirmMode: options.confirm
  });

  switch (command) {
    case 'help':
      console.log(HELP);
      break;
      
    case 'version':
      console.log(`ClaudeLink v${VERSION}`);
      break;
      
    case 'watch':
      const watcher = new Watcher();
      watcher.start();
      break;
      
    case 'exec':
      if (!args[0]) {
        console.error('Error: No file specified');
        console.log('Usage: claudelink exec <file.claude.json>');
        process.exit(1);
      }
      const filePath = path.resolve(args[0]);
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }
      const result = await link.processFile(filePath);
      process.exit(result.success ? 0 : 1);
      break;
      
    case 'validate':
      if (!args[0]) {
        console.error('Error: No command specified');
        console.log('Usage: claudelink validate "command"');
        process.exit(1);
      }
      const validation = link.validateCommand(args.join(' '));
      if (validation.valid) {
        console.log('✅ Command is allowed');
        process.exit(0);
      } else {
        console.log(`❌ Command blocked: ${validation.reason}`);
        process.exit(1);
      }
      break;
      
    case 'test':
      require('../tests/run-tests');
      break;
      
    default:
      console.log(HELP);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
