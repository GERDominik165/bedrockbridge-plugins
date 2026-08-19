# Installation Guide - Gemini Mob Plugin

## Prerequisites

- ✓ Minecraft Bedrock Edition
- ✓ BedrockBridge installed and configured
- ✓ Gemini API key (free from https://ai.google.dev)
- ✓ Administrator access to server

## Step-by-Step Installation

### Step 1: Download/Copy Plugin Files

All files should be in one folder: `geminiMob/`

Required files:
```
geminiMob/
├── main.js
├── config.js
├── mobPersonality.js
├── mobMemory.js
├── mobInteractions.js
├── mobActions.js
├── mobAI.js
├── httpClient.js
├── conversationManager.js
├── mobDatabase.js
├── messageFormatter.js
└── README.md
```

### Step 2: Place in Correct Directory

Copy the `geminiMob` folder to:
```
Bedrock-Bridge/
└── scripts/
    └── bridgePlugins/
        └── geminiMob/
            └── [all files here]
```

### Step 3: Get Gemini API Key

1. Go to https://ai.google.dev
2. Sign in with Google account
3. Click "Get API Key"
4. Click "Create API Key"
5. Choose your project (or create new)
6. Copy the generated API key

**Important:** Keep this key secret! Don't share it publicly.

### Step 4: Configure Plugin

Start your Minecraft world, then in chat:

```
/mob config apikey YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with your actual key.

Example:
```
/mob config apikey REDACTED_GEMINI_API_KEY
```

### Step 5: Verify Installation

Check if plugin is running:

```
/mob stats
```

You should see output like:
```
=== Plugin Statistics ===
Total Mobs: 0
Mob Types: 12
Total Memories: 0
```

If you see this, installation is complete! ✓

### Step 6: Test Basic Commands

Spawn a mob and test:

```
/summon cow
/mob pet
/mob feed wheat
/mob talk hello
```

## Configuration

### Basic Configuration

All settings can be found in `config.js`:

```javascript
const DEFAULTS = {
    // API Settings
    apiKey: "REDACTED",
    modelName: "gemini-flash-latest",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models",

    // Mob System
    enableMobPersonalities: true,
    enableMobMemory: true,
    enableMobInteractions: true,
    enableMobChat: true,

    // Chat Settings
    mobChatPrefix: "@m",
    maxMobResponseLength: 200,

    // Performance
    mobAIUpdateInterval: 40,
    conversationHistoryLimit: 20
};
```

### Optional: Customize Settings

Edit `config.js` to change defaults:

```javascript
// Make mobs smarter
temperature: 0.9,  // More creative responses (0-1)

// Store more conversation history
conversationHistoryLimit: 30,  // Default: 20

// Faster AI updates
mobAIUpdateInterval: 20,  // Default: 40 (ticks)
```

## Troubleshooting Installation

### Issue: Plugin doesn't load
**Solution:**
1. Check file placement - should be in `scripts/bridgePlugins/geminiMob/`
2. Verify all 11 files are present
3. Check for syntax errors in JS files
4. Restart Minecraft world

### Issue: Commands not working
**Solution:**
1. Verify API key is set: `/mob config show`
2. Check that API key is valid and not expired
3. Ensure mobs are nearby (within 32 blocks)
4. Try again after a few seconds

### Issue: API errors
**Solution:**
1. Check internet connection
2. Verify API key in `config.show`
3. Check Gemini API quota (free: 60 req/min)
4. Try with different text if over quota
5. Wait 1 minute and try again

### Issue: Mobs don't respond
**Solution:**
1. Check mob type is supported (see README.md)
2. Verify mob mood is positive
3. Build relationship with feeding/petting first
4. Use `/mob talk` with proper message format
5. Check API health: Check logs for errors

## Performance Optimization

### For Low-End Devices

```javascript
// config.js
enableMobChat: false,           // Disable AI to save resources
mobAIUpdateInterval: 100,       // Less frequent updates
conversationHistoryLimit: 5,    // Keep minimal history
maxMobResponseLength: 100       // Shorter responses
```

### For High-End Devices

```javascript
// config.js
enableMobChat: true,
enableAdvancedAI: true,
mobAIUpdateInterval: 20,        // Very frequent
conversationHistoryLimit: 50,   // Full history
maxMobResponseLength: 300       // Longer responses
```

## Server Deployment

### Multiplayer Server

1. Install on server as above
2. All players share same mobs/memories
3. Use `/mob config apikey` once per server
4. Monitor API usage across all players

### API Key Security
```
⚠️ WARNING: Keep API key private!
```

Don't include in public configurations.

### Rate Limiting

Free tier: 60 requests/minute

For multiple players:
- 1-5 players: Fine on free tier
- 5-20 players: Consider upgrading
- 20+ players: Definitely upgrade to paid

Upgrade at: https://ai.google.dev/pricing

## First-Time Setup Checklist

- [ ] Downloaded all plugin files
- [ ] Placed in `scripts/bridgePlugins/geminiMob/`
- [ ] Got Gemini API key from ai.google.dev
- [ ] Configured API key with `/mob config apikey`
- [ ] Verified installation with `/mob stats`
- [ ] Tested basic commands with nearby mob
- [ ] Read README.md for features

## Getting Help

### Common Commands for Help

```
/mob help               # Show all commands
/mob stats              # Show plugin status
/mob config show        # Show current configuration
```

### Debug Mode

Enable detailed logging:

```javascript
// In config.js
debugMode: true,
enableLogging: true
```

Check console/logs for detailed information.

### Support Resources

1. Read README.md thoroughly
2. Check troubleshooting section above
3. Verify all files are present
4. Check Gemini API status at ai.google.dev
5. Review your API quota

## Uninstallation

To remove the plugin:

1. Delete the `geminiMob` folder from `scripts/bridgePlugins/`
2. Remove any saved mob data (optional - automatic cleanup will handle it)
3. Restart Minecraft world

All mob data is stored in world save - removing plugin doesn't delete data.
To completely clean up, run:

```
/function geniimob:cleanup_all
```

## Next Steps

After successful installation:

1. **Read Full Documentation**: `README.md`
2. **Learn Commands**: `/mob help`
3. **Try Basic Interactions**: Feed, pet, talk to mobs
4. **Explore Features**: Taming, breeding, relationship building
5. **Customize Settings**: Edit `config.js` for your preference

---

**Installation Complete!** 🎉

Your mobs are now ready to become intelligent companions. Enjoy!
