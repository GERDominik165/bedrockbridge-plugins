# 🔧 Pterodactyl Plugin Registration Fix

**Date:** 2025-11-17
**Status:** ✅ FIXED
**Issue:** Custom command not registering with BedrockBridge

---

## Problem

The Pterodactyl plugin file (`pterodactyl-bridge-bbcmd.js`) was not being registered with BedrockBridge's command system, so commands like `bedrockbridge pterodactyl help` were not working.

**Root Cause:** The plugin was in the `bridgePlugins` directory but was not registered in the pluginManager database.

---

## Solution Applied

### 1. **Added Plugin to PluginManager Database**

**File:** `D:\BB\Bedrock-Bridge\scripts\pluginManager.js`
**Line:** 27

Changed:
```javascript
pluginsDB.set("plugins", [
    { path: "./bridgePlugins/basicNicerChat", enabled: true },
    // ... other plugins ...
]);
```

To:
```javascript
pluginsDB.set("plugins", [
    { path: "./bridgePlugins/basicNicerChat", enabled: true },
    // ... other plugins ...
    { path: "./bridgePlugins/ptero/pterodactyl-bridge-bbcmd", enabled: true },
    // ... more plugins ...
]);
```

This registers the plugin in BedrockBridge's plugin manager, so it loads on server startup.

---

### 2. **Imported BedrockBridge API**

**File:** `D:\BB\bridgePlugins\ptero\pterodactyl-bridge-bbcmd.js`
**Line:** 29

Added:
```javascript
import { bridge } from '../../Bedrock-Bridge/scripts/addons.js';
```

This imports the BedrockBridge API so the plugin can register itself.

---

### 3. **Registered Command with BedrockBridge**

**File:** `D:\BB\bridgePlugins\ptero\pterodactyl-bridge-bbcmd.js`
**Lines:** 1243-1260

Added:
```javascript
// Register with BedrockBridge command system
if (bridge && bridge.bedrockCommands) {
  try {
    bridge.bedrockCommands.registerCommand(
      CONFIG.SUBCOMMAND,  // 'pterodactyl'
      async (player, ...args) => {
        const result = await plugin.handleCommand(args);
        if (result) {
          player.sendMessage(result);
        }
      },
      'Pterodactyl Panel Management System - Use: pterodactyl help'
    );
    Logger.info('Command registered with BedrockBridge', { command: CONFIG.SUBCOMMAND });
  } catch (error) {
    Logger.error('Failed to register command with BedrockBridge', { error: error.message });
  }
}
```

This registers the `pterodactyl` command with BedrockBridge's command system, making it callable with:
```
bedrockbridge pterodactyl <subcommand> [args]
```

---

## How It Works Now

1. **Server Startup:**
   - PluginManager loads enabled plugins from database
   - Pterodactyl plugin file is imported: `./bridgePlugins/ptero/pterodactyl-bridge-bbcmd`
   - Plugin initialization code runs

2. **Plugin Initialization:**
   - Plugin imports the bridge API
   - Registers command handler with `bridge.bedrockCommands.registerCommand()`
   - Health monitoring starts
   - Plugin logs successful registration

3. **User Command:**
   - Player types: `bedrockbridge pterodactyl servers`
   - BedrockBridge routes command to registered handler
   - Handler calls `plugin.handleCommand(['servers'])`
   - Response is sent back to player

---

## Testing

To verify the plugin is registered and working:

```
bedrockbridge pterodactyl help
```

Expected output: Help message with all available commands

```
bedrockbridge pterodactyl test
```

Expected output: Connection test result showing Pterodactyl panel status

```
bedrockbridge pterodactyl servers
```

Expected output: List of all Pterodactyl servers

---

## Files Modified

| File | Changes |
|------|---------|
| `D:\BB\Bedrock-Bridge\scripts\pluginManager.js` | Added pterodactyl plugin to database (line 27) |
| `D:\BB\bridgePlugins\ptero\pterodactyl-bridge-bbcmd.js` | Added bridge import (line 29) + Command registration (lines 1243-1260) |

---

## Documentation

- 📖 `BEDROCKBRIDGE_INTEGRATION.md` - Complete integration guide
- 📖 `FINAL_BEDROCKBRIDGE_v2.md` - Full feature documentation
- 📖 `INSTALL_NOW.txt` - Quick installation guide
- 📖 `D:\BB\bridgeAPI\pterodactylAPI.md` - Official API documentation

---

## Status

✅ **Registration Fixed**
✅ **Command System Integrated**
✅ **Ready for Use**

The Pterodactyl plugin is now fully integrated with BedrockBridge and ready to use!

---

## Command Usage

All Pterodactyl Panel management commands are now available:

```
bedrockbridge pterodactyl help              # Show all commands
bedrockbridge pterodactyl servers           # List all servers
bedrockbridge pterodactyl server <id>       # Server details
bedrockbridge pterodactyl server <id> start # Start server
bedrockbridge pterodactyl databases <id>    # List databases
bedrockbridge pterodactyl backups <id>      # List backups
bedrockbridge pterodactyl files <id>        # List files
```

**Viel Spaß mit deinem Plugin!** 🚀

