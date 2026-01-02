# ClaudeLink 🐺

**Local AI Bridge** - A secure connector between Claude.ai and your local system.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/Tests-22%20passing-brightgreen.svg)](#testing)

## Overview

ClaudeLink enables Claude.ai to interact with your local Linux system through a secure, user-controlled bridge. It watches for `.claude.json` command files in your Downloads folder, validates them for safety, and executes them locally.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Claude.ai     │  file   │   ClaudeLink    │  exec   │  Local System   │
│   (Browser)     │ ──────► │   (Watcher)     │ ──────► │  (bash/python)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                          │                           │
         │   .claude.json           │   validate                │
         │   download               │   execute                 │
         │                          │   log                     │
         └──────────────────────────┴───────────────────────────┘
```

## Principles

- **User-initiated**: Every command file is downloaded by you
- **Human-in-the-loop**: You control what runs on your system
- **Security-first**: Dangerous commands are blocked automatically
- **No API keys**: Uses standard browser downloads
- **Transparent**: All executions are logged

## Installation

```bash
git clone https://github.com/phipigreywolf/claudelink.git
cd claudelink
npm install
npm link  # Makes 'claudelink' available globally
```

### Requirements

- Node.js 16+
- Linux (Ubuntu/Debian tested)

## Usage

### Start the Watcher

```bash
claudelink
# or
claudelink watch
```

ClaudeLink will display:
- Watch directory (default: `~/Downloads`)
- Processed files directory
- Log file location

### Command File Format

Create `.claude.json` files with this structure:

```json
{
  "description": "What this command does",
  "command": "your bash command here"
}
```

Alternative keys: `cmd`, `script`

### CLI Commands

```bash
claudelink watch                    # Start file watcher (default)
claudelink exec file.claude.json    # Execute single file
claudelink validate "rm -rf /tmp"   # Check if command is safe
claudelink test                     # Run test suite
claudelink help                     # Show help
```

### Options

```bash
claudelink watch --watch-dir /path/to/dir   # Custom watch directory
claudelink watch --confirm                   # Require confirmation
```

## Security

ClaudeLink automatically blocks dangerous commands:

| Pattern | Reason |
|---------|--------|
| `rm -rf /` | Destructive: root deletion |
| `mkfs /dev/sd*` | Destructive: disk format |
| `dd of=/dev/sd*` | Destructive: disk write |
| `:(){ :\|:& };:` | Fork bomb |
| `curl \| bash` | Remote code execution |

Safe commands are allowed:
- File operations in user directories
- System information queries
- Development tools (git, npm, python, etc.)
- Network utilities (curl, wget to files)

## Testing

```bash
npm test
```

Runs 22 tests covering:
- Security validation (blocked patterns)
- File detection (allowed extensions)
- JSON parsing (multiple key formats)
- Command execution (success/failure)

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDELINK_WATCH_DIR` | `~/Downloads` | Directory to watch |
| `CLAUDELINK_CONFIRM` | `false` | Require confirmation |

## How It Works

1. **You chat with Claude.ai** in your browser
2. **Claude generates a command** and provides it as a `.claude.json` file
3. **You download the file** to your Downloads folder
4. **ClaudeLink detects the file** and validates the command
5. **If safe, it executes** and logs the result
6. **You paste output back** to Claude for the next step

## Project Structure

```
claudelink/
├── src/
│   ├── index.js      # Core ClaudeLink class
│   ├── watcher.js    # File watcher module
│   └── cli.js        # Command-line interface
├── tests/
│   └── run-tests.js  # Test suite
├── package.json
├── LICENSE
└── README.md
```

## Author

**Grey Wolf**  
📧 beitholim@proton.me

## License

MIT License - See [LICENSE](LICENSE)

---

*ClaudeLink is an independent project and is not affiliated with Anthropic.*
