# Quick Start Guide - Gemini Mob Plugin

Get up and running in 5 minutes!

## 1. Installation (2 minutes)

✓ Copy `geminiMob` folder to `scripts/bridgePlugins/`

✓ Get API key from https://ai.google.dev (1 minute)

✓ In Minecraft chat:
```
/mob config apikey YOUR_KEY_HERE
```

## 2. First Interaction (1 minute)

Spawn a cow in the world:
```
/summon cow
```

Then try these commands:

### Feed the Cow
```
/mob feed wheat
```

### Pet the Cow
```
/mob pet
```

### Talk to the Cow
```
/mob talk What's your name?
```

Expected response from AI:
```
[Cow] *happy moo* I'm just a simple cow, but I'm glad you're here!
```

## 3. Check Status (30 seconds)

```
/mob status
```

Shows the mob's mood, energy, hunger, and your relationship!

## 4. Build Relationship (1 minute)

Repeat these to build trust:
```
/mob feed wheat
/mob pet
/mob talk You're my favorite cow!
```

After a few interactions, watch the trust level increase! ✓

## 5. Tame a Wolf (1 minute)

```
/summon wolf
/mob feed meat
/mob feed meat
/mob feed meat
/mob tame
```

Success! Your wolf now follows you everywhere.

## Command Cheat Sheet

| Command | Effect |
|---------|--------|
| `/mob pet` | Show affection (↑ trust & happiness) |
| `/mob feed wheat` | Give food (↑ trust, ↓ hunger) |
| `/mob talk hello` | Start conversation |
| `/mob status` | Check mood/energy/hunger |
| `/mob info` | Detailed information |
| `/mob list` | See all mobs |
| `/mob help` | Show all commands |

## Food Guide

Quick reference for what mobs like:

| Mob | Favorite Food |
|-----|---------------|
| Cow | Wheat, Grass |
| Sheep | Grass, Clover |
| Pig | Carrot |
| Chicken | Seeds |
| Rabbit | Carrot |
| Wolf | Meat (after taming) |

## Personality Examples

### Friendly Sheep 😊
- Loves being petted
- Quick to trust
- Follows you around

### Playful Pig 🎮
- Jumps around a lot
- Quick to respond
- Curious about everything

### Protective Wolf 🛡️
- Loyal to owner
- Defends you
- Takes longer to trust

### Curious Rabbit 👀
- Always exploring
- Investigates everything
- Easily scared

## Tips for Success

### To Build Trust Quickly
1. Feed with favorite food (2x trust gain)
2. Pet regularly (+happiness)
3. Talk positively (+mood)
4. Avoid hitting (-trust!)

### To Breed Mobs
1. Get two mobs of same type
2. Feed both until happy
3. Pet both several times
4. Get both trust above 30
5. Use breeding mechanics

### To Tame a Mob
1. Build trust to 50+ with feeding/petting
2. Ensure good mood
3. Use `/mob tame`
4. Mob now follows you!

### To Have Better Conversations
1. Build relationship first (trust 30+)
2. Keep mood positive (happy/ecstatic)
3. Reference shared memories
4. Use natural language
5. Be consistent with personality

## Common Mistakes (Avoid These!)

❌ **DON'T** hit mobs - massive trust loss!
❌ **DON'T** feed wrong foods - mobs dislike some foods
❌ **DON'T** expect instant taming - needs high trust
❌ **DON'T** spam commands - AI needs cooldown
❌ **DON'T** ignore mood - angry/sad mobs won't respond

✓ **DO** feed with favorite food
✓ **DO** pet regularly for affection
✓ **DO** talk to build relationship
✓ **DO** wait for positive mood
✓ **DO** be patient - trust takes time

## Advanced Features (When You're Ready)

### Breed Mobs
Create new mobs with combined traits:
```
/mob breed [mob1] [mob2]
```

### Check Memories
See what a mob remembers about you:
```
/mob info
```

### Monitor Statistics
Track plugin performance:
```
/mob stats
```

### Customize Configuration
Edit `config.js` for:
- Faster/slower mobs
- Different AI personality
- More/less memory storage
- Custom food preferences

## Troubleshooting

### "No mobs nearby"
→ Spawn one: `/summon cow`

### "Mob didn't respond"
→ Build trust first with feed/pet

### "API error"
→ Check your API key: `/mob config show`

### "Mob won't tame"
→ Need trust above 50, try more feeding

### "Command not recognized"
→ Use exact format: `/mob feed wheat`
→ Check `/mob help` for all commands

## What's Happening Behind the Scenes?

1. **Personality**: Each mob gets 2-3 random traits
2. **Memory**: Every interaction is remembered
3. **Trust**: Builds based on positive interactions
4. **Mood**: Changes based on recent events
5. **AI**: Gemini creates responses in character

## Next Steps

✓ Read full README.md for complete features
✓ Experiment with different mobs and personalities
✓ Build relationships with your favorite mobs
✓ Try different foods and interactions
✓ Explore the memory and breeding systems

## FAQ

**Q: Can I tame all mobs?**
A: Only compatible ones (wolves, etc). Passive mobs can be very friendly but not "tamed" in game sense.

**Q: How long does trust take to build?**
A: ~5-10 interactions to go from neutral to friendly.

**Q: Do mobs forget me?**
A: No, memories persist! They have very long memory.

**Q: Can multiple players interact with same mob?**
A: Yes! Each player has separate relationship with each mob.

**Q: What happens when mobs die?**
A: Their data is saved. If respawned, they remember everything!

**Q: Do I need internet?**
A: Yes, for AI responses. Basic interactions work offline.

**Q: Is my API key safe?**
A: Yes, it's stored locally. Don't share your key with others!

---

## Have Fun! 🎉

You're now ready to interact with living, intelligent Minecraft mobs!

Try these fun ideas:
- Build a farm with loyal cows
- Create a wolf army to protect your base
- Have deep conversations with your pets
- Watch mobs form friendships
- Breed special personality combinations

**Happy adventuring!** 🐕🐄🐷

For more details, see: **README.md**
For installation help, see: **INSTALLATION.md**
