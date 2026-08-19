# Bedrock Bridge API Integration - v1.2.1

**Version**: 1.2.1
**Status**: ✅ Complete
**Date**: 2025-11-22

---

## Overview

The Server-Net plugin now supports **Bedrock Bridge API command registration**. Commands are automatically registered with both:
- ✅ Chat-based interface (!command syntax)
- ✅ Bedrock Bridge API (if available)

---

## What's New

### New Component: CommandRegistry

**File**: `bridge/command-registry.js`
**Purpose**: Unified command management for both chat and Bridge API

**Features**:
- Register commands once, execute via chat or Bridge API
- Bridge API auto-detection (graceful fallback)
- Command metadata support (description, usage, aliases, permissions)
- Argument parsing with flags and options
- Context validation for safe execution
- Error handling and logging

---

## Architecture

### Dual Registration System

```
┌─────────────────────────────────────────────┐
│         CommandRegistry (Central Hub)       │
├─────────────────────────────────────────────┤
│                                             │
│  Register Commands Once                     │
│  ├─ Chat Handler Registration              │
│  └─ Bridge API Registration (if available) │
│                                             │
└──────────────┬──────────────┬──────────────┘
               │              │
          ┌────▼─┐        ┌───▼────┐
          │ Chat │        │ Bridge  │
          │ (!x) │        │  API    │
          └──────┘        └─────────┘
```

### Command Flow

```
User Input
   ├─ Chat Message (!command)
   │  └─ registerCommands()
   │     └─ world.beforeEvents.chatSend
   │        └─ CommandRegistry.executeCommand()
   │           └─ Handler
   │
   └─ Bridge API Call
      └─ CommandRegistry.handleBridgeCommand()
         └─ CommandRegistry.executeCommand()
            └─ Handler
```

---

## Registration Process

### Step 1: CommandRegistry Initialization (index.js - Step 6)

```javascript
this.commandRegistry = new CommandRegistry(this.logger);
const bridgeConnected = await this.commandRegistry.initializeBridge();
```

### Step 2: Command Registration (index.js - registerCommands())

```javascript
this.commandRegistry.registerCommands([
    {
        name: 'dashboard',
        handler: (args, context) => this.handleDashboard(context.player),
        metadata: {
            description: 'Open the main dashboard UI',
            usage: '!dashboard',
            aliases: ['!dash'],
            requiresAdmin: false
        }
    },
    // ... more commands
]);
```

### Step 3: Command Execution

**Via Chat**:
```javascript
world.beforeEvents.chatSend.subscribe((event) => {
    const commandName = command.substring(1);  // Remove !
    this.commandRegistry.executeCommand(commandName, args, { player });
});
```

**Via Bridge API** (automatic):
```javascript
bridge.commands.register({
    name: 'dashboard',
    handler: (args, context) => {
        return this.commandRegistry.handleBridgeCommand('dashboard', args, context);
    }
});
```

---

## Command API Reference

### CommandRegistry Methods

#### `initializeBridge()`
**Purpose**: Connect to Bedrock Bridge API
**Returns**: `boolean` - true if connected
**Usage**:
```javascript
const connected = await commandRegistry.initializeBridge();
```

#### `registerCommand(name, handler, metadata)`
**Purpose**: Register a single command
**Parameters**:
- `name` (string): Command name (without !)
- `handler` (function): Command handler
- `metadata` (object): Optional metadata

**Handler Signature**:
```javascript
async handler(args, context) {
    // args: Array of arguments
    // context: { player: Player object }
    return result;
}
```

**Metadata**:
```javascript
{
    description: 'Command description',
    usage: '!command [args]',
    aliases: ['!alias1', '!alias2'],
    requiresAdmin: false
}
```

**Returns**: `boolean` - success
**Usage**:
```javascript
commandRegistry.registerCommand('mycommand', async (args, context) => {
    context.player.sendMessage('Hello!');
}, {
    description: 'My custom command',
    usage: '!mycommand [arg1]'
});
```

#### `registerCommands(commandList)`
**Purpose**: Register multiple commands at once
**Parameters**:
- `commandList` (array): Array of command objects

**Command Object**:
```javascript
{
    name: 'commandname',
    handler: async (args, context) => { },
    metadata: { /* ... */ }
}
```

**Returns**: `boolean` - success
**Usage**:
```javascript
commandRegistry.registerCommands([
    { name: 'cmd1', handler: ..., metadata: {...} },
    { name: 'cmd2', handler: ..., metadata: {...} }
]);
```

#### `executeCommand(name, args, context)`
**Purpose**: Execute a registered command
**Parameters**:
- `name` (string): Command name
- `args` (array): Command arguments
- `context` (object): { player: Player }

**Returns**:
```javascript
{
    success: boolean,
    result: any,
    error: string
}
```

**Usage**:
```javascript
const result = await commandRegistry.executeCommand('dashboard', [], { player });
```

#### `getCommand(name)`
**Purpose**: Get command object
**Returns**: Command object or null
**Usage**:
```javascript
const cmd = commandRegistry.getCommand('dashboard');
```

#### `hasCommand(name)`
**Purpose**: Check if command exists
**Returns**: `boolean`
**Usage**:
```javascript
if (commandRegistry.hasCommand('dashboard')) { ... }
```

#### `getAllCommands()`
**Purpose**: Get all registered commands
**Returns**: Array of command objects
**Usage**:
```javascript
const commands = commandRegistry.getAllCommands();
```

#### `getCommandHelp(name)`
**Purpose**: Get help for a single command
**Returns**: Help object
**Usage**:
```javascript
const help = commandRegistry.getCommandHelp('dashboard');
// {
//   name: 'dashboard',
//   description: 'Open the main dashboard UI',
//   usage: '!dashboard',
//   aliases: ['!dash']
// }
```

#### `getAllCommandsHelp()`
**Purpose**: Get help for all commands
**Returns**: Array of help objects
**Usage**:
```javascript
const helpList = commandRegistry.getAllCommandsHelp();
```

#### `unregisterCommand(name)`
**Purpose**: Remove a registered command
**Returns**: `boolean` - success
**Usage**:
```javascript
commandRegistry.unregisterCommand('oldcommand');
```

#### `parseArgs(args)`
**Purpose**: Parse command arguments
**Returns**: { positional, flags, options }
**Usage**:
```javascript
// Input: ['!http', 'get', 'https://api.example.com', '--timeout', '5000']
const parsed = commandRegistry.parseArgs(['get', 'https://api.example.com', '--timeout', '5000']);
// {
//   positional: ['get', 'https://api.example.com'],
//   flags: { timeout: '5000' },
//   options: {}
// }
```

#### `getStatus()`
**Purpose**: Get command registry status
**Returns**: Status object
**Usage**:
```javascript
const status = commandRegistry.getStatus();
// {
//   totalCommands: 4,
//   bridgeConnected: false,
//   commands: [...]
// }
```

---

## Registered Commands (v1.2.1)

All commands are registered with CommandRegistry:

### 1. !dashboard
- **Description**: Open the main dashboard UI
- **Usage**: `!dashboard`
- **Aliases**: `!dash`
- **Admin Only**: No
- **Bridge**: ✅ Available via Bridge API

### 2. !http
- **Description**: Execute HTTP requests
- **Usage**: `!http [get|post|put|delete] <url> [options]`
- **Examples**:
  - `!http get https://api.github.com`
  - `!http post https://httpbin.org/post --body "{data}"`
- **Bridge**: ✅ Available via Bridge API

### 3. !netstatus
- **Description**: Show network plugin status
- **Usage**: `!netstatus`
- **Bridge**: ✅ Available via Bridge API

### 4. !nethelp
- **Description**: Show command help
- **Usage**: `!nethelp`
- **Aliases**: `!network-help`
- **Bridge**: ✅ Available via Bridge API

---

## Bridge API Usage Examples

### Example 1: Direct Command Execution

```javascript
// Via Bridge API (if available)
const result = bridge.commands.execute('dashboard', [], { player });
// Returns: { success: true, message: '...', data: {...} }
```

### Example 2: Command Registration

```javascript
// Bridge API auto-registers all commands from CommandRegistry
// If bridge.commands.register is available:
bridge.commands.register({
    name: 'dashboard',
    description: 'Open the main dashboard UI',
    handler: (args, context) => {
        return commandRegistry.handleBridgeCommand('dashboard', args, context);
    }
});
```

### Example 3: Get Available Commands

```javascript
const status = commandRegistry.getStatus();
console.log(`Total commands: ${status.totalCommands}`);
console.log(`Bridge connected: ${status.bridgeConnected}`);

for (const cmd of status.commands) {
    console.log(`${cmd.name}: Chat=${cmd.chatEnabled}, Bridge=${cmd.bridgeEnabled}`);
}
```

---

## Error Handling

All command execution is wrapped in try-catch:

```javascript
try {
    const result = await commandRegistry.executeCommand(name, args, context);
    if (result.success) {
        // Command executed successfully
    } else {
        // Command failed - result.error contains error message
    }
} catch (error) {
    // Execution error - error.message contains details
    logger.error('Command execution failed', error);
}
```

---

## Chat vs Bridge API

### Chat-Based Commands

**How It Works**:
1. Player types `!command` in chat
2. `beforeEvents.chatSend` handler triggers
3. CommandRegistry identifies command
4. Handler executes
5. Response sent to player via `sendMessage()`

**Advantages**:
- ✅ Always available
- ✅ No Bridge API needed
- ✅ Player feedback automatic

**Example**:
```
Player: !dashboard
Server: Dashboard opens for player
```

### Bridge API Commands

**How It Works**:
1. Bridge API calls registered handler
2. CommandRegistry intercepts
3. Handler executes
4. Response sent back to Bridge

**Advantages**:
- ✅ Works with Bridge tools
- ✅ Programmatic access
- ✅ Remote execution capability

**Example**:
```javascript
// Bridge API (if available)
const result = bridge.commands.execute('http', ['get', 'https://api.github.com']);
// Returns structured response
```

---

## Graceful Degradation

**Bridge API Not Available?**
- ✅ Chat commands still work
- ✅ No errors thrown
- ✅ Logs warning message
- ✅ Plugin continues normally

**Example Log Output**:
```
[INFO] Step 6: Command registry initialized (Bridge: not available)
[WARN] Bridge API not available - using chat-based commands only
[INFO] Step 7: Command handlers registered
```

---

## Integration Points

### Where CommandRegistry Is Used

1. **Initialization** (`initialize()` method)
   - Step 6: Create and initialize CommandRegistry
   - Connect to Bridge API if available

2. **Command Registration** (`registerCommands()` method)
   - Register all commands with CommandRegistry
   - Register with Bridge API if available

3. **Command Execution** (Chat event handler)
   - Parse chat message
   - Check CommandRegistry
   - Execute via CommandRegistry
   - Log results

### Files Involved

```
bridge/
└── command-registry.js          NEW - Command management

index.js (UPDATED)
├── Import CommandRegistry
├── Initialize in Step 6
├── Register commands in registerCommands()
└── Execute via commandRegistry

core/logger.js (unchanged)
├── Logs command registration
└── Logs execution errors
```

---

## Configuration

### Optional Settings (Future)

```json
{
  "commands": {
    "enabled": true,
    "requireAdmin": false,
    "bridge": {
      "enabled": true,
      "autoRegister": true,
      "namespace": "net"
    }
  }
}
```

---

## Testing Commands

### Test in Chat

```
!nethelp
Response: List of all commands

!netstatus
Response: Plugin status

!dashboard
Response: Dashboard opens

!http get https://api.github.com
Response: Request queued and result shown
```

### Test via CommandRegistry

```javascript
// In console or via test script
const registry = plugin.commandRegistry;

// Get status
console.log(registry.getStatus());

// Get help for all commands
console.log(registry.getAllCommandsHelp());

// Get specific command
const cmd = registry.getCommand('dashboard');
console.log(cmd.metadata);
```

---

## Future Enhancements

Potential improvements:

1. **Subcommands**
   - `!http get`, `!http post`, etc. as separate commands
   - Better organization

2. **Advanced Permissions**
   - Role-based access control
   - Per-command permissions

3. **Command Aliases**
   - Dynamic alias management
   - User-defined shortcuts

4. **Analytics**
   - Track command usage
   - Monitor popularity
   - Performance metrics

5. **Remote Execution**
   - Execute commands from Bridge tools
   - REST API for command execution
   - Webhooks integration

---

## File Structure

```
D:\BB\bridgePlugins\net\
├── bridge/
│   └── command-registry.js          NEW (280 lines)
├── index.js                         UPDATED (v1.2.1)
│   ├── Import CommandRegistry
│   ├── Initialize in Step 6
│   ├── Register commands
│   └── Execute via registry
└── [all other files unchanged]
```

---

## Summary

**CommandRegistry provides**:
- ✅ Unified command management
- ✅ Chat + Bridge API support
- ✅ Automatic registration
- ✅ Graceful fallback
- ✅ Error handling
- ✅ Help system
- ✅ Argument parsing
- ✅ Permission checking

**Result**:
- ✅ Commands work in chat
- ✅ Commands work via Bridge API (if available)
- ✅ Single point of registration
- ✅ Professional command system
- ✅ Future-proof architecture

---

## Version History

| Version | Changes |
|---------|---------|
| 1.2.0 | Chat-only commands |
| 1.2.1 | ✅ Bridge API Integration |

---

**Status**: ✅ Production Ready

All commands registered and ready for execution via both chat and Bedrock Bridge API!
