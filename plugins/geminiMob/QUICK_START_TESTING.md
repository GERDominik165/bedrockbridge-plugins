# 🎮 QUICK START - TESTING GUIDE

## Before You Start
Make sure the plugin is loaded. You should see this on server startup:
```
[GeminiMob] 🚀 Gemini Mob Plugin v1.0.0 Initialized
[GeminiMob] ✓ Configuration loaded
[GeminiMob] ✓ Database initialized
```

---

## ⚡ 5-Minute Test Run

### Test 1: Spawn a Mob (30 seconds)
```
/summon minecraft:cow
```
**Expected**: Cow appears with a unique name (Bessie, Daisy, etc.) as nametag
**What it shows**: Personality generation is working ✅

---

### Test 2: Feed the Mob (1 minute)
```
/hold wheat
/mob feed
```
**Expected**: Chat shows "Fed 1 mob(s)!" and cow responds
**What it shows**: Feeding system works ✅

---

### Test 3: Pet the Mob (1 minute)
```
/mob pet
```
**Expected**: Chat shows "Petted 1 mob(s)!"
**What it shows**: Petting interaction works ✅

---

### Test 4: Weapon Aggression (1 minute)
```
/hold diamond_sword
```
(Attack the cow)
```
/mob status
```
**Expected**:
- Cow looks angry
- Trust value drops
- Mood becomes angry/scared

**What it shows**: Weapon detection and threat system works ✅

---

### Test 5: Healing (1 minute)
```
/hold golden_apple
```
(You need to use a command or healing mechanic to apply)
```
/mob talk
```
(Type something nice to the cow)

**Expected**: Cow responds positively
**What it shows**: Healing and mood recovery system works ✅

---

## 🎯 Deep Testing (10 minutes)

### Test 6: Loyalty System
```
/summon minecraft:cow
/hold wheat
/mob feed
/mob feed
/mob feed
/mob pet
/mob pet
/mob loyalty
```
**Expected**: Shows "FRIENDLY" or "LOYAL" status with color coding (green/blue)
**What it shows**: Loyalty tracking works ✅

---

### Test 7: Item Guide
```
/mob items
```
**Expected**: Shows weapons, healing items, and food preferences
**What it shows**: Item documentation system works ✅

---

### Test 8: Conversation
```
/mob talk hello there!
```
**Expected**: Cow responds with personality-based message
**What it shows**: Gemini AI integration works ✅

---

## 🐮 Complete Gameplay Test (15 minutes)

### Build a Loyal Mob Team

**Step 1: Spawn & Name (2 min)**
```
/summon minecraft:cow
/summon minecraft:sheep
/summon minecraft:pig
```
Each gets a unique personality name automatically.

**Step 2: Check Personalities (2 min)**
```
/mob info
```
Shows detailed personality traits for each mob.

**Step 3: Build Trust (5 min)**
```
/hold wheat
/mob feed
/mob pet
/mob pet
```
Repeat with each mob type, using their preferred food:
- Cows: wheat, golden carrot
- Sheep: wheat, golden carrot
- Pigs: carrot, potato

**Step 4: Check Loyalty (2 min)**
```
/mob loyalty
```
Should show FRIENDLY or LOYAL status.

**Step 5: Verify Combat Alliance (4 min)**
```
/hold diamond_sword
(Attack yourself from another player's account)
```
**Expected**: Your loyal mobs should attack the other player!
**What it shows**: Combat alliance system works ✅

---

## 🔍 Detailed Mechanic Tests

### Weapon Detection
```
For each weapon type:
- Hold it: /hold diamond_sword
- Attack mob
- Check: /mob status
- Expected: Mob becomes HOSTILE, trust drops
```

Weapon threat levels tested:
- ✅ Netherite Sword (extreme threat)
- ✅ Diamond Sword (high threat)
- ✅ Iron Sword (high threat)
- ✅ Bow (medium threat)

### Food Preferences
```
Test each mob's favorites:

COWS: /hold wheat → /mob feed
      /hold golden_carrot → /mob feed

SHEEP: /hold wheat → /mob feed
       /hold hay_block → /mob feed

PIGS: /hold carrot → /mob feed
      /hold potato → /mob feed

RABBITS: /hold carrot → /mob feed
         /hold dandelion → /mob feed

WOLVES: /hold beef → /mob feed
        /hold bone → /mob feed

CHICKENS: /hold seeds → /mob feed
```

### Healing Items
```
Test healing item trust bonuses:

Enchanted Golden Apple: +100 trust
Golden Apple: +50 trust
Milk Bucket: +30 trust
Honey Bottle: +25 trust
```

---

## 📊 Verification Checklist

Print this and check off as you test:

### Core Systems
- [ ] Mob spawning generates unique personality
- [ ] Unique names appear as nametags (Bessie, Daisy, etc.)
- [ ] Personality information displays correctly
- [ ] Database stores mob data

### Interactions
- [ ] /mob feed increases trust
- [ ] /mob pet increases trust
- [ ] /mob talk generates AI response
- [ ] /mob tame works on high-trust mobs
- [ ] /mob status shows correct mood/stats
- [ ] /mob info shows full personality details

### Item System
- [ ] /mob items shows weapons/healing/food guide
- [ ] Holding weapon triggers aggression on attack
- [ ] Holding healing item increases trust more
- [ ] Mob-specific foods increase trust more
- [ ] Wrong food decreases trust or has no effect

### Loyalty System
- [ ] /mob loyalty shows relationship status
- [ ] Trust < 0 shows HOSTILE (red)
- [ ] Trust 0-50 shows NEUTRAL (gray)
- [ ] Trust 50-80 shows FRIENDLY (green)
- [ ] Trust 80+ shows LOYAL (blue)
- [ ] LOYAL mobs show "⚔️ WILL FIGHT FOR YOU"

### Combat Alliance
- [ ] Loyal mob (trust > 80) defends player when attacked
- [ ] Mob attacks player's enemies
- [ ] Multiple loyal mobs fight together
- [ ] Mob stops defending if betrayed with weapon

### Logging & Debug
- [ ] Server logs show proper initialization
- [ ] Debug messages appear for interactions
- [ ] Error messages helpful if something breaks
- [ ] No crashes during normal gameplay

---

## 🐛 If Something Goes Wrong

### Mob won't feed
**Check**:
- Do you have the right food? (`/mob items`)
- Is it a mob type that eats? (Some mobs don't accept food)
- Check logs for error messages

### Weapon not triggering aggression
**Check**:
- Are you holding an actual weapon? (Check with `/mob items`)
- Did you attack the mob with the weapon?
- Check if weapon is in list of detected weapons

### Loyalty not tracking
**Check**:
- Have you built enough trust? (Need positive trust value)
- Run `/mob loyalty` near the mob
- Check server logs for memory errors

### Mob not responding to talk
**Check**:
- Is Gemini API configured? (Check config.js)
- Does API key work? (Test with other Gemini features)
- Check logs for API errors

### General Troubleshooting
1. Check logs: Look for [GeminiMob] error messages
2. Reload plugin: Restart BedrockBridge
3. Clear data: Delete mob memory data and respawn mobs
4. Check syntax: All modules verified to pass `node -c`

---

## 🎊 Success Indicators

**You'll know it's working when:**

✅ Each spawned mob has a unique name (not just "minecraft:cow")
✅ Mobs respond to feeding with trust increases
✅ Holding weapons makes mobs angry
✅ Healing items make mobs happy
✅ `/mob loyalty` shows colored relationship status
✅ Loyal mobs (blue) defend you in combat
✅ `/mob items` shows all available interactions
✅ `/mob talk` gets responses from mobs
✅ Server logs show no errors
✅ Plugin loads without crashing

**If all these work, the system is operating perfectly!**

---

**Happy testing! 🎮**
