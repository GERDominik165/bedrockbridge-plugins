# 🔍 Gemini Mob Plugin - Debug Log Guide

## Overview

The Gemini Mob Plugin now includes **comprehensive debug logging** at every stage of operation. This guide explains what logs you'll see and what they mean.

---

## 📋 Log Levels

### ℹ️ INFO
**Purpose**: General information about plugin operations
**Example**: `Starting AI tick system`, `Initializing configuration`
**Action**: No action needed - for awareness only

### ✅ SUCCESS
**Purpose**: Confirmation that an operation completed successfully
**Example**: `✓ config.js loaded`, `Module initialization COMPLETE`
**Action**: Indicates system is working as expected

### ⚠️ WARN
**Purpose**: Warning about a condition that isn't critical but should be noted
**Example**: `No mobs nearby`, `API key NOT configured`
**Action**: May require attention depending on context

### ❌ ERROR
**Purpose**: Something failed or encountered an error
**Example**: `Plugin initialization failed`, `Command execution failed`
**Action**: Should investigate - indicates malfunction

### 🔍 DEBUG
**Purpose**: Detailed information for troubleshooting
**Example**: `Creating new personality for minecraft:cow`, `Feeding cow with wheat`
**Action**: Useful for understanding what's happening step-by-step

### 📡 EVENT
**Purpose**: Game events being processed
**Example**: `Player damaged mob`, `Entity spawned`
**Action**: Shows what's happening in the game

### 🎮 INTERACT
**Purpose**: Player interactions with mobs
**Example**: `Player petted cow`, `Player fed sheep`
**Action**: Shows player activity with mobs

---

## 🏷️ Log Categories

| Category | Description | When You'll See It |
|----------|-------------|-------------------|
| **BOOT** | Plugin startup and initialization | World loads |
| **IMPORT** | Module loading | During boot |
| **CONFIG** | Configuration operations | Boot and config changes |
| **DATABASE** | Database operations | Boot and when saving |
| **HANDLERS** | Event handler registration | During boot |
| **INIT** | General initialization | Boot |
| **CMD** | Command processing | When player uses `/mob` commands |
| **PET** | Pet command | When `/mob pet` is used |
| **FEED** | Feed command | When `/mob feed` is used |
| **TALK** | Talk/chat command | When `/mob talk` is used |
| **DAMAGE** | Damage events | When player hits a mob |
| **SPAWN** | Mob spawn events | When mobs spawn |
| **DEATH** | Mob death events | When mobs die |
| **TICK** | AI tick system | Every tick (regular intervals) |

---

## 📊 Expected Log Sequence on Boot

When the world loads, you should see logs in this order:

```
════════════════════════════════════════════════════════════════════════════════
[GeminiMob] 🚀 MODULE LOADING STARTED
[GeminiMob] ✓ Imported @minecraft/server
[GeminiMob] 📋 DEBUG LOG CATEGORIES:
  (category reference...)
════════════════════════════════════════════════════════════════════════════════

[BOOT] 🚀 World loaded - Starting plugin initialization
[IMPORT] Dynamically importing all modules...
[IMPORT] ✓ config.js loaded
[IMPORT] ✓ mobPersonality.js loaded
[IMPORT] ✓ mobMemory.js loaded
[IMPORT] ✓ mobInteractions.js loaded
[IMPORT] ✓ mobActions.js loaded
[IMPORT] ✓ conversationManager.js loaded
[IMPORT] ✓ mobDatabase.js loaded
[IMPORT] ✓ messageFormatter.js loaded
[IMPORT] ✅ All modules imported successfully

[CONFIG] Initializing configuration...
[CONFIG] ✓ Configuration initialized

[DATABASE] Initializing database...
[DATABASE] ✓ Database initialized

[HANDLERS] Registering event handlers...
[INIT] ✓ Entity damage handler registered
[INIT] ✓ Entity death handler registered
[INIT] ✓ Entity spawn handler registered
[INIT] ✓ Chat command handler registered
[INIT] ✅ All event handlers initialized successfully!

[CONFIG] ✓ API key configured

[TICK] Starting AI tick system (interval: 40 ticks)
[TICK] ✓ AI tick system initialized

[BOOT] ════════════════════════════════════════════════════════════════════════════════
[BOOT] ✅ Plugin initialization COMPLETE - Ready to use!
[BOOT] ════════════════════════════════════════════════════════════════════════════════
```

---

## 🎮 Expected Logs During Gameplay

### When a player pets a mob:
```
[CMD] Executing command handler: pet
[CMD_PET] Handling pet command
[PET] Player_Name trying to pet mobs
[PET] Found mob: minecraft:cow
[DEBUG] INTERACT/PET - Player_Name petted minecraft:cow
```

### When a player feeds a mob:
```
[CMD] Executing command handler: feed
[CMD_FEED] Handling feed command
[FEED] Player_Name trying to feed mobs with wheat
[FEED] Feeding minecraft:cow with wheat
[SUCCESS] INTERACT/FEED - Player_Name fed minecraft:cow
```

### When a mob spawns:
```
[EVENT] SPAWN - minecraft:cow spawned
[DEBUG] SPAWN - Creating new personality for minecraft:cow
[SUCCESS] SPAWN - Generated personality: Bessie
[DEBUG] SPAWN - Set mob name tag to Bessie
```

### When a player damages a mob:
```
[EVENT] DAMAGE - Player_Name damaged minecraft:cow
[INTERACT] DAMAGE - Mob reacting to attack
```

---

## ⚠️ Troubleshooting with Logs

### Plugin didn't initialize
**Look for**: ERROR in [BOOT] section
**Example**: `[BOOT] CRITICAL: Plugin initialization failed!`
**Solution**: Check the error message for details

### Commands not working
**Look for**: ERROR in [CMD] section
**Example**: `[CMD] Command execution failed`
**Solution**: Check what command and what error message appears

### Mobs not spawning with personalities
**Look for**: ERROR or WARN in [SPAWN] section
**Example**: `[SPAWN] No personality data`
**Solution**: Check if database is working properly

### Mobs not responding to interactions
**Look for**: WARN in [PET], [FEED], or [TALK] sections
**Example**: `[PET] Pet attempt failed`
**Solution**: Check if the mob is compatible with that interaction

### API not working
**Look for**: WARN in [CONFIG] section
**Example**: `[CONFIG] ⚠️ API key NOT configured`
**Solution**: Set API key with `/mob config apikey YOUR_KEY`

---

## 🔧 Using Logs to Debug

1. **Check Boot Sequence**: Make sure all modules imported successfully
2. **Check Handler Registration**: All handlers should be registered
3. **Monitor Events**: Watch for ERROR messages during gameplay
4. **Track Commands**: Each command should produce logs showing what happened
5. **Verify API**: Watch [CONFIG] logs to confirm API is ready

---

## 📝 Log Format

All logs follow this format:

```
[HH:MM:SS] [GeminiMob/CATEGORY] EMOJI Message
           └─ Data: {...additional info...}
```

**Example**:
```
[14:32:45] [GeminiMob/PET] 🎮 Player_Name petted minecraft:cow
           └─ Data: { "trustGain": 3 }
```

---

## 💡 Tips

- **Copy entire log**: Right-click console and "Select All" to copy boot sequence
- **Find errors**: Search for "ERROR" or "CRITICAL" in console
- **Track progress**: Watch [TICK] logs to see system is actively running
- **Monitor commands**: Commands show detailed logs for each step

---

## 🎯 What Should You See?

✅ **Good Signs**:
- All modules imported successfully
- All handlers registered
- API key configured
- AI tick system running

❌ **Bad Signs**:
- ERROR or CRITICAL messages
- Missing module imports
- No tick system logs
- Commands producing errors

---

For more information, see:
- **README.md** - Feature documentation
- **DEPLOYMENT_GUIDE.md** - Setup instructions
- **QUICKSTART.md** - Quick start guide
