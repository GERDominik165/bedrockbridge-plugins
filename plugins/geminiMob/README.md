# Gemini Mob Plugin - Comprehensive Mob AI System

**Version:** 1.0.0
**Author:** BedrockBridge Community
**Status:** Production Ready

## Overview

The **Gemini Mob Plugin** transforms Minecraft mobs into living, intelligent creatures with:

- **Dynamic Personalities** - Each mob has unique personality traits that affect behavior
- **Memory System** - Mobs remember players and past interactions
- **Relationship Tracking** - Trust levels evolve based on player actions
- **AI-Powered Dialogue** - Mobs respond to players using Gemini AI
- **Complex Interactions** - Feeding, petting, hitting, taming, breeding, and more
- **Emotional States** - Mobs have moods that affect their behavior
- **Learning Abilities** - Mobs can learn from experiences and adapt behavior

## Features

### Mob Personalities
- **Passive Mobs**: Cow, Sheep, Pig, Chicken, Rabbit
- **Neutral Mobs**: Wolf, Spider, Cave Spider
- **Hostile Mobs**: Zombie, Skeleton, Creeper, Enderman

Each mob has 2-3 personality traits like:
- Gentle, Curious, Loyal, Protective, Playful
- Intelligent, Mischievous, Friendly, Greedy
- Timid, Anxious, Predatory, Alert, Powerful

### Interaction System
- **Feed**: Give mobs food to increase trust and happiness
- **Pet**: Show affection to build relationships
- **Hit**: Damage trust and mood (careful!)
- **Talk**: Engage in AI-powered conversations
- **Tame**: Make compatible mobs your companions
- **Breed**: Create offspring with another mob
- **Observe**: Check mob status and memories

### Relationship Levels
```
Hostile (💔)      Trust: -100 to -50
Unfriendly (😠)   Trust: -50 to -10
Neutral (😐)      Trust: -10 to 10
Friendly (😊)     Trust: 10 to 50
Trusted (❤️)      Trust: 50 to 100
Bonded (💕)       Trust: 100 to 200
```

### Memory System
Mobs remember:
- All interactions with players
- Significant events (taming, breeding, injuries)
- Food preferences and likes/dislikes
- Player behavior patterns
- Time-based memory decay

### AI Chat System
- Natural language responses using Gemini AI
- Context-aware conversations
- Personality-influenced responses
- Memory integration
- Emotion-based dialogue

## Installation

### 1. Prerequisites
- Minecraft Bedrock Edition with BedrockBridge installed
- Gemini API key (https://ai.google.dev)

### 2. Setup
1. Copy the `geminiMob` folder to `scripts/bridgePlugins/`
2. Configure your Gemini API key:
   ```
   /mob config apikey YOUR_API_KEY_HERE
   ```

### 3. Verification
```
/mob stats
```

You should see active mobs listed.

## Command Reference

### Basic Commands

#### Help
```
/mob help
```
Shows all available commands.

#### List Mobs
```
/mob list
```
Shows all tracked mobs and your relationship with them.

#### Check Status
```
/mob status
```
Shows the nearest mob's current mood, energy, hunger, and happiness.

#### Get Info
```
/mob info
```
Detailed information about a mob including memories and preferences.

#### Check Statistics
```
/mob stats
```
Overall plugin statistics and database info.

### Interaction Commands

#### Feed a Mob
```
/mob feed [food_item]
```
Feed the nearest mob. Common foods:
- `wheat`, `seeds`, `carrot`, `potato`, `beetroot`
- `grass`, `dandelion`, `clover`

Example:
```
/mob feed wheat
```

#### Pet a Mob
```
/mob pet
```
Show affection to the nearest mob. Increases trust and happiness.

#### Tame a Mob
```
/mob tame
```
Attempt to tame the nearest compatible mob (requires high trust).

#### Talk to a Mob
```
/mob talk [your message]
```
Engage in conversation with the nearest mob using AI.

Example:
```
/mob talk What's your favorite food?
```

### Configuration Commands

#### Show Configuration
```
/mob config show
```

#### Set API Key
```
/mob config apikey [your_key]
```

## Personality System

### Available Traits

#### Positive Traits
| Trait | Effect | Emoji |
|-------|--------|-------|
| Gentle | Easier to pet, trusts quickly | 🐾 |
| Curious | Explores more, investigates | 👀 |
| Loyal | Follows owner, high trust | 💛 |
| Protective | Defends owner | 🛡️ |
| Playful | Higher activity, fun interactions | 🎮 |
| Intelligent | Better AI responses, learning | 🧠 |
| Friendly | Positive attitude, social | 😊 |
| Greedy | Loves food, easy to feed | 🍴 |

#### Challenging Traits
| Trait | Effect | Emoji |
|-------|--------|-------|
| Timid | Flees easily, hard to approach | 😨 |
| Anxious | Scared of events, trust loss | 😰 |
| Predatory | Aggressive, hunts | 🦈 |
| Mischievous | Unpredictable behavior | 😈 |
| Territorial | Aggressive in area | 🚩 |

## Interaction Guide

### Feeding Mobs

**Best Results:**
1. Approach mob with food item
2. Use `/mob feed [food]`
3. Observe their reaction

**Food Preferences:**
- Cows: Grass, Wheat
- Sheep: Grass, Clover
- Pigs: Carrot, Potato, Beetroot
- Chickens: Seeds, Grain
- Rabbits: Carrot, Grass, Dandelion
- Wolves: Meat (after taming)

**Effects:**
- ↑ Hunger decreases
- ↑ Happiness increases
- ↑ Trust increases (especially favorite food)
- ↓ Trust if disliked food

### Petting Mobs

**Requirements:**
- Compatible personality
- Reasonable trust level
- Mob in good mood

**Effects:**
- ↑↑ Happiness increases significantly
- ↑ Trust increases
- ↓ Energy decreases slightly

**Best for:**
- Building relationships
- Improving mood
- Daily care routine

### Taming Mobs

**Requirements:**
- Trust ≥ 50
- Compatible mob type (wolves, etc.)
- Taming item if needed

**Process:**
1. Build trust with feeding/petting
2. Ensure mood is positive
3. Use `/mob tame`
4. Tamed mobs follow you

**Benefits:**
- Follow you everywhere
- Defend you from threats
- Never leave you
- +50 trust upon taming

### Breeding Mobs

**Requirements:**
- Two mobs of same type
- Both trust ≥ 30
- Both energy ≥ 30
- Both hunger < 60

**Process:**
1. Approach both mobs
2. Feed them both
3. Pet them both
4. Use breeding mechanics

**Results:**
- New baby mob spawns
- Parents lose energy
- Both gain happiness
- New relationship tracked

## AI Chat System

### How It Works

1. **Input**: Player sends message using `/mob talk`
2. **Context**: System gathers mob's:
   - Personality traits
   - Current mood
   - Trust level
   - Memories
   - Preferences
3. **Generation**: Gemini AI generates response using context
4. **Response**: Mob replies in character

### Example Conversations

#### With a Friendly Cow
```
You: What do you like to eat?
Cow: *happy moo* I love grass and wheat! 🌾
```

#### With a Curious Rabbit
```
You: Why do you hop around so much?
Rabbit: *curious squeak* Everything is interesting! So much to explore!
```

#### With a Protective Wolf
```
You: Will you protect me?
Wolf: *woof* Of course! You're part of my pack now.
```

## Memory & Relationship System

### Relationship Levels

**Hostile** (💔) Trust -100 to -50
- Mob attacks on sight
- Never approach
- Repair through time + distance

**Unfriendly** (😠) Trust -50 to -10
- Avoids you
- Won't accept food
- Need significant time to improve

**Neutral** (😐) Trust -10 to 10
- Indifferent
- Basic interactions possible
- Can build relationship

**Friendly** (😊) Trust 10 to 50
- Approaches you
- Accepts food readily
- Responds to chat

**Trusted** (❤️) Trust 50 to 100
- Follows you
- Seeks your attention
- High interaction frequency

**Bonded** (💕) Trust 100+ to 200
- Completely devoted
- Remembers everything
- Maximum benefits unlocked

### Significant Memories

Mobs record important events:
- First meeting
- Taming event
- Being attacked
- Receiving gifts
- Breeding partners
- Dangerous situations
- Great moments together

Access memories via `/mob info`

## Statistics & Monitoring

### Plugin Statistics
```
/mob stats
```

Shows:
- Total tracked mobs
- Mob types represented
- Total interactions recorded
- Database size
- API status

### Individual Mob Info
```
/mob info
```

Shows:
- Personality breakdown
- Mood and stats
- Energy, hunger, happiness
- Trust level with gauge
- Likes/Dislikes
- Memory count

## Configuration Files

### config.js
Main configuration module with:
- Default settings
- Mob type definitions
- Personality traits
- Interaction types
- Relationship levels

Customize by editing:
```javascript
const DEFAULTS = {
    apiKey: "YOUR_KEY",
    enableMobChat: true,
    maxMobResponseLength: 200,
    // ... more options
}
```

## Advanced Features

### Learning System
Mobs can learn behaviors through:
- Repeated interactions
- Pattern recognition
- Experience modification
- Preference adaptation

### Behavior Patterns
Each personality has behavior patterns:
- Jump frequency
- Movement range
- Interactivity level
- Group behavior tendency

### AI Decision Making
Mobs make autonomous decisions based on:
- Hunger level
- Energy level
- Threat assessment
- Mood state
- Personality traits
- Curiosity level

## Troubleshooting

### Mob Won't Respond to Chat
**Causes:**
- API key not configured
- API quota exceeded
- Mob too far away
- Network timeout

**Solutions:**
1. Check API key: `/mob config show`
2. Try again after waiting
3. Move closer to mob
4. Restart server

### Trust Not Increasing
**Causes:**
- Feeding wrong food type
- Mood too negative
- Recent attacks
- Personality incompatibility

**Solutions:**
1. Use favorite food
2. Improve mood with petting
3. Give time to recover
4. Find compatible personality

### Mob Not Spawning with Personality
**Causes:**
- Mob type not supported
- Plugin not initialized
- Database corruption

**Solutions:**
1. Check mob type support
2. Restart world
3. Clear cache data
4. Verify installation

### Performance Issues
**Causes:**
- Too many mobs tracked
- AI requests too frequent
- Large memory database

**Solutions:**
1. Limit tracked mobs
2. Increase AI request delays
3. Run database cleanup
4. Reduce conversation history

## Performance Tuning

### Optimize for Speed
```javascript
// In config.js
conversationHistoryLimit: 10,      // Reduce from 20
mobAIUpdateInterval: 80,            // Increase from 40
maxMobResponseLength: 100           // Reduce from 200
```

### Optimize for Quality
```javascript
// In config.js
conversationHistoryLimit: 30,       // Increase from 20
mobAIUpdateInterval: 20,            // Decrease from 40
temperature: 0.8                    // More creative
```

## API Endpoints

### Gemini API
- **Model**: `gemini-flash-latest`
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models`
- **Rate Limit**: 100 requests/hour (configurable)

## Database

### Storage Location
Dynamic properties in world save:
```
geniimob:config:*
geniimob:mob:*
geniimob:memory:*:*
geniimob:interaction:*:*
geniimob:conversation:*:*
```

### Backup & Restore
Built-in backup system:
```javascript
// Automatic backups on demand
world.getDynamicProperty("geniimob:backup:latest")
```

### Database Cleanup
Automatically removes:
- Interactions older than 7 days
- Conversations older than 1 hour
- Personalities of dead mobs
- Stale memory entries

## Module Architecture

```
geminiMob/
├── main.js                 # Entry point & commands
├── config.js               # Configuration & definitions
├── mobPersonality.js       # Personality & mood system
├── mobMemory.js            # Memory & relationships
├── mobInteractions.js      # Player interactions
├── mobActions.js           # Emotes & animations
├── mobAI.js                # Decision making
├── httpClient.js           # API requests
├── conversationManager.js   # Dialogue system
├── mobDatabase.js          # Data persistence
├── messageFormatter.js     # Message formatting
└── README.md               # This file
```

## Contributing

To extend the plugin:

1. **Add new mob type**: Update `config.js` MOB_TYPES
2. **Add new interaction**: Create handler in `mobInteractions.js`
3. **Add new personality trait**: Update `PERSONALITY_TRAITS` in config.js
4. **Add new action**: Add emote to `mobActions.js`

## API Key Setup

### Get Gemini API Key
1. Visit https://ai.google.dev
2. Create new project
3. Enable Generative Language API
4. Create API key
5. Copy key and use: `/mob config apikey YOUR_KEY`

### Free Tier Limits
- 60 requests/minute
- 1500 requests/day

### Paid Tier Benefits
- 1000+ requests/minute
- Larger context windows
- Priority support

## Known Limitations

1. Mobs spawn without personalities initially (generated on first spawn)
2. AI responses limited to 200 characters
3. Maximum 100 interactions tracked per player/mob pair
4. Database limited to world dynamic properties (~1 MB)
5. No cross-world mob tracking (worlds are separate)

## Future Roadmap

- [ ] Mob language learning (custom words)
- [ ] Pack behavior (mobs group together)
- [ ] Territory control (mobs defend areas)
- [ ] Skill trees (mobs can gain abilities)
- [ ] Trading system (mobs trade items)
- [ ] Visual customization (color, size variants)
- [ ] Mod compatibility
- [ ] Cross-server sync

## License

Gemini Mob Plugin
© 2025 BedrockBridge Community
Open Source - Feel free to modify and distribute

## Support & Feedback

Report issues or suggest features via:
- GitHub Issues
- BedrockBridge Discord
- In-game feedback

---

**Happy playing with your intelligent mobs!** 🎮✨
