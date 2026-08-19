# 📖 Gemini Mob Plugin - Commands Reference

**Version**: 1.0.0
**Status**: ✅ All Commands Working via `/mob`
**Date**: 2025-11-20

---

## 🎮 Command Format

All commands use the format:
```
/mob <action> [arguments...]
```

---

## 📋 All Commands

### 1️⃣ HELP - Show All Commands

**Command**: `/mob help`

**Description**: Display help message with all available commands

**Arguments**: None

**Example**:
```
/mob help
```

**Response**:
```
[GeminiMob] === MOB PLUGIN COMMANDS ===
[GeminiMob] Commands:
[GeminiMob] • /mob help - Show this help message
[GeminiMob] • /mob pet [distance] - Pet nearby mobs
[GeminiMob] • /mob feed [distance] - Feed mobs
[GeminiMob] • /mob talk [distance] <message> - Chat with mobs
[GeminiMob] • /mob status [distance] - Check mob status
[GeminiMob] • /mob info [distance] - Detailed mob info
[GeminiMob] • /mob list - List all mobs
[GeminiMob] • /mob config <option> <value> - Configure plugin
[GeminiMob] • /mob stats - View statistics
[GeminiMob] • /mob tame [distance] - Tame mobs
```

---

### 2️⃣ PET - Pet Nearby Mobs

**Command**: `/mob pet [distance]`

**Description**: Pet all mobs within a certain distance

**Arguments**:
- `distance` (optional) - Search radius in blocks (default: 10)

**Examples**:
```
/mob pet           # Pet mobs within 10 blocks
/mob pet 20        # Pet mobs within 20 blocks
/mob pet 5         # Pet mobs within 5 blocks
```

**Response**:
```
[GeminiMob] Petted 3 mob(s)!
```

**What Happens**:
- ✓ Increases mob trust by 5-10
- ✓ Improves relationship with mob
- ✓ Mob shows positive mood change
- ✓ Increases happiness and energy

**Logs**:
```
[HH:MM:SS] [GeminiMob/PET] 🔍 PlayerName petted minecraft:cow
[HH:MM:SS] [GeminiMob/PET] ✅ PlayerName petted 3 mobs
```

---

### 3️⃣ FEED - Feed Mobs

**Command**: `/mob feed [distance]`

**Description**: Feed all mobs within a certain distance with held item

**Arguments**:
- `distance` (optional) - Search radius in blocks (default: 10)

**Examples**:
```
/mob feed          # Feed mobs within 10 blocks
/mob feed 15       # Feed mobs within 15 blocks
```

**What Happens**:
- ✓ Uses item in your hand
- ✓ Increases mob trust by 10-15
- ✓ Reduces mob hunger
- ✓ Improves mood significantly

**Response**:
```
[GeminiMob] Fed 2 mob(s)!
```

**Best Items**:
- Cow: Wheat, grass
- Sheep: Wheat, grass, clover
- Pig: Carrot, potato
- Chicken: Seed, wheat
- Rabbit: Dandelion, carrot
- Wolf: Meat, bone

---

### 4️⃣ TALK - Chat with Mobs

**Command**: `/mob talk [distance] <message...>`

**Description**: Chat with mobs using AI - mobs respond with personality

**Arguments**:
- `distance` (optional) - Search radius in blocks (default: 10)
- `message` - What you want to say (can be multiple words)

**Examples**:
```
/mob talk hello                  # Simple greeting
/mob talk 20 how are you today   # Multi-word message within 20 blocks
/mob talk what is your name      # Ask a question
```

**Response**:
```
[GeminiMob] Asking mobs for response...
Bessie: Moo! I'm doing great, thanks for asking!
Fluffy: *happily munches grass* I'm content!
```

**Requirements**:
- ✓ API key must be configured
- ✓ Requires Gemini API access
- ✓ Mobs respond based on personality and mood

**Logs**:
```
[HH:MM:SS] [GeminiMob/TALK] 🔍 PlayerName talking to Bessie
[HH:MM:SS] [GeminiMob/TALK] ✅ Bessie responded to PlayerName
```

---

### 5️⃣ STATUS - Check Mob Status

**Command**: `/mob status [distance]`

**Description**: Show current status of nearby mobs

**Arguments**:
- `distance` (optional) - Search radius in blocks (default: 10)

**Examples**:
```
/mob status        # Show status of mobs within 10 blocks
/mob status 25     # Show status of mobs within 25 blocks
```

**Response**:
```
[GeminiMob] Nearby Mobs:
Bessie | Mood: Happy | Energy: 85/100 | Trust: 45/200
Fluffy | Mood: Playful | Energy: 92/100 | Trust: 78/200
Spot | Mood: Tired | Energy: 30/100 | Trust: 12/200
```

**Status Information**:
- **Mood**: Current emotional state (7 possibilities)
- **Energy**: Fatigue level (0-100)
- **Trust**: Relationship level (-100 to +200)

---

### 6️⃣ INFO - Get Detailed Mob Information

**Command**: `/mob info [distance]`

**Description**: Show detailed information about nearby mobs

**Arguments**:
- `distance` (optional) - Search radius in blocks (default: 10)

**Examples**:
```
/mob info          # Show info on mobs within 10 blocks
/mob info 30       # Show info on mobs within 30 blocks
```

**Response**:
```
[GeminiMob] ═══════════════════════════════════
[GeminiMob] Bessie
[GeminiMob] Type: minecraft:cow
[GeminiMob] Mood: Happy
[GeminiMob] Traits: Curious, Playful, Social
[GeminiMob] Trust Level: High
[GeminiMob] ═══════════════════════════════════
```

**Information Shown**:
- Name (generated personality)
- Mob type (minecraft type ID)
- Current mood
- Top 3 personality traits
- Trust level (Low/Neutral/High)

---

### 7️⃣ LIST - Show All Mobs in Database

**Command**: `/mob list`

**Description**: List all mobs stored in the plugin database

**Arguments**: None

**Example**:
```
/mob list
```

**Response**:
```
[GeminiMob] Database contains 7 mobs:
  • Bessie (minecraft:cow)
  • Fluffy (minecraft:sheep)
  • Spot (minecraft:pig)
  • Clucky (minecraft:chicken)
  • Hopper (minecraft:rabbit)
  • Shadow (minecraft:wolf)
  • Sparkles (minecraft:enderman)
```

**Notes**:
- Shows first 10 mobs
- Displays mob name and type
- Shows total count if more than 10

---

### 8️⃣ CONFIG - Configure Plugin

**Command**: `/mob config <option> <value>`

**Description**: Configure plugin settings

**Arguments**:
- `option` - Configuration option name
- `value` - New value for option

**Available Options**:

#### Set API Key
```
/mob config apikey YOUR_GEMINI_API_KEY
```
**Description**: Set your Gemini API key for AI conversations
**Response**: `[GeminiMob] API key configured!`

#### Set Command Prefix
```
/mob config prefix !mob
```
**Description**: Change command prefix (if using prefix mode)
**Response**: `[GeminiMob] Prefix set to: !mob`

**Examples**:
```
/mob config apikey sk-1234567890abcdef
/mob config prefix !mob
```

**Important Notes**:
- API key is required for `/mob talk` command
- Get API key from Google AI Studio: https://aistudio.google.com/
- Prefix changes may require reload

---

### 9️⃣ STATS - View Statistics

**Command**: `/mob stats`

**Description**: Show plugin usage statistics

**Arguments**: None

**Example**:
```
/mob stats
```

**Response**:
```
[GeminiMob] Statistics:
  Total Mobs: 7
  Personalities: 7
  Interactions: 32
```

**Statistics**:
- **Total Mobs**: Number of mobs in database
- **Personalities**: Number of generated personalities
- **Interactions**: Total player interactions recorded

---

### 🔟 TAME - Tame Mobs

**Command**: `/mob tame [distance]`

**Description**: Attempt to tame nearby mobs

**Arguments**:
- `distance` (optional) - Search radius in blocks (default: 10)

**Examples**:
```
/mob tame          # Tame mobs within 10 blocks
/mob tame 15       # Tame mobs within 15 blocks
```

**Response**:
```
[GeminiMob] Tamed 2 mob(s)!
```

**What Happens**:
- ✓ Increases trust significantly
- ✓ Mob becomes loyal to player
- ✓ Mob follows player
- ✓ Mood improves

**Taming Tips**:
- Higher trust = easier to tame
- Well-fed and happy mobs = better chances
- Some mobs tame easier than others
- Wolves require bones and meat

---

## 📊 Quick Reference Table

| Command | Args | Distance | Logs |
|---------|------|----------|------|
| `/mob help` | - | - | CMD_HELP |
| `/mob pet [d]` | - | ✓ | PET |
| `/mob feed [d]` | - | ✓ | FEED |
| `/mob talk [d] msg` | ✓ | ✓ | TALK |
| `/mob status [d]` | - | ✓ | STATUS |
| `/mob info [d]` | - | ✓ | INFO |
| `/mob list` | - | - | LIST |
| `/mob config opt val` | ✓ | - | CONFIG |
| `/mob stats` | - | - | STATS |
| `/mob tame [d]` | - | ✓ | TAME |

---

## 🎯 Common Usage Scenarios

### Scenario 1: Meet a New Mob
```
1. /mob info          # See what it is
2. /mob talk hello    # Introduce yourself
3. /mob pet           # Build trust
4. /mob status        # Check how they feel
```

### Scenario 2: Build Relationship
```
1. /mob pet           # Pet them daily
2. /mob feed          # Feed them regularly
3. /mob talk          # Chat with them
4. /mob status        # Monitor trust level
```

### Scenario 3: Set Up Plugin
```
1. /mob config apikey YOUR_KEY  # Configure API
2. /mob help                    # See commands
3. /mob stats                   # Check database
```

### Scenario 4: Multi-mob Interaction
```
1. /summon minecraft:cow        # Spawn cow
2. /summon minecraft:sheep      # Spawn sheep
3. /mob status                  # See all nearby
4. /mob talk 30 hello everyone  # Talk to all within 30 blocks
```

---

## ⚙️ Default Values

| Setting | Default |
|---------|---------|
| Pet Distance | 10 blocks |
| Feed Distance | 10 blocks |
| Talk Distance | 10 blocks |
| Status Distance | 10 blocks |
| Info Distance | 10 blocks |
| Tame Distance | 10 blocks |
| API Key | Not configured |
| Command Prefix | /mob |

---

## 🔍 Error Messages

### "No mobs nearby!"
- **Cause**: No mobs within search distance
- **Solution**: Increase distance or spawn more mobs

### "Unknown command"
- **Cause**: Wrong command name
- **Solution**: Use `/mob help` to see all commands

### "API key NOT configured!"
- **Cause**: Can't use `/mob talk` without API key
- **Solution**: `/mob config apikey YOUR_GEMINI_KEY`

### "Error getting response from mob"
- **Cause**: API connection issue
- **Solution**: Check API key, check internet connection

---

## 💡 Tips

1. **Distance**: Default 10 blocks is usually enough
2. **Multiple Words**: `/mob talk` supports multi-word messages
3. **Persistence**: Mobs remember interactions across sessions
4. **Personalities**: Each mob generates unique personality
5. **Trust Building**: Regular interactions build trust faster
6. **Feeding**: More effective than petting for trust
7. **Talking**: Requires API key but builds strong bonds
8. **Logging**: All actions are logged in console

---

**Version**: 1.0.0
**Status**: ✅ All Commands Functional
**Date**: 2025-11-20

**All commands are working and fully logged!** 🎉
