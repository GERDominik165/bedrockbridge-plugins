# 🎰 SHELF GAMBLING SYSTEM v2.0.0 - COMPLETE COMMAND REFERENCE

**Version**: 2.0.0
**Total Commands**: 16
**Updated**: 2025-11-18

---

## Quick Navigation

- [Basic Commands (4)](#basic-commands)
- [Statistics Commands (3)](#statistics-commands)
- [Multiplayer Commands (3)](#multiplayer-commands)
- [Admin Commands (6)](#admin-commands)

---

## Basic Commands

### `/gamble_coins`

**Usage**: `/gamble_coins`

**Permission**: Public

**Description**: Check your current coin balance

**Response**:
```
Deine Coins: 1250
```

**Use Cases**:
- Check balance before betting
- Verify winnings
- Track earnings over time

---

### `/gamble_play`

**Usage**: `/gamble_play`

**Permission**: Public

**Description**: Opens the Gambling Menu (alternative to clicking shelf block)

**Response**:
```
Klicke auf einen Shelf-Block um zu spielen!
```

**Use Cases**:
- Quick menu access
- Alternative to block interaction
- Accessibility option

---

### `/gamble_leaderboard`

**Usage**: `/gamble_leaderboard`

**Permission**: Public

**Description**: Display top 10 players with their stats

**Response**:
```
━━━ TOP 10 SPIELER ━━━
1. Steve - 5250 coins (47 Wins)
2. Alex - 4890 coins (42 Wins)
3. Max - 4120 coins (38 Wins)
...
10. Sam - 1200 coins (9 Wins)
```

**Use Cases**:
- Check rankings
- See top players
- Competitive motivation
- Progress tracking

---

### `/gamble_myrank`

**Usage**: `/gamble_myrank`

**Permission**: Public

**Description**: Display your personal ranking and statistics

**Response**:
```
Rang: #5
Gewinne: 38
Win Rate: 54.2%
Total: 4120 coins
```

**Use Cases**:
- Personal statistics
- Win rate analysis
- Progress tracking
- Competitive standing

---

## Statistics Commands

### `/gamble_achievements`

**Usage**: `/gamble_achievements`

**Permission**: Public

**Description**: Show your achievement progress and unlocked achievements

**Response**:
```
🏆 ACHIEVEMENTS
Freigeschaltet: 5/20
Progress: 25.0%
```

**Displays**:
- Total achievements unlocked
- Percentage complete
- List of unlocked achievements with rewards

**Use Cases**:
- Track achievement progress
- See what's next to unlock
- View achievement rewards earned
- Challenge system

**Achievements Shown**:
- 🎰 First Spin
- 🎉 First Win
- 🎮 10 Games
- 🎲 Triple Treffer
- 💰 Big Win
- 🤑 Mega Win
- 🎊 Jackpot!
- 💎 High Roller
- 📈 Consistent Winner
- 🏆 Millionaire
- 🌙 Night Owl
- ⏱️ Marathon
- 🥇 Top 10
- 👑 #1 Player
- 🔥 Comeback King
- ⚙️ Custom Master
- ...and more!

---

### `/gamble_stats`

**Usage**: `/gamble_stats`

**Permission**: Public

**Description**: Display detailed game statistics and analytics

**Response**:
```
📊 DETAILLIERTE STATISTIKEN
Gespiele: 127
Gewinne: 68
Verluste: 59
Höchster Gewinn: 850
Gewinn-Strähne: 6
```

**Detailed Metrics**:
- Total games played
- Win count
- Loss count
- Highest single win
- Current win streak
- Average win amount
- Total winnings
- Total bets placed
- Longest losing streak

**Use Cases**:
- Detailed performance analysis
- Identify patterns
- Track improvement
- Statistical review

**Data Tracked**:
- Per-player game history
- Time-based statistics
- Win rate calculations
- Peak play time analysis
- Trends over time

---

### `/gamble_ladder`

**Usage**: `/gamble_ladder`

**Permission**: Public

**Description**: Display your current ladder/ranking position with rating

**Response**:
```
📈 LADDER-POSITION
Position: #12
Rating: 485
Gesamt Spieler: 47
```

**Ladder System**:
- Elo-style dynamic rating
- Adjusts with each win/loss
- Based on win rate and streak
- Competitive ranking

**Rating Calculation**:
```
Base Rating = wins * 50 - losses * 25

Bonus:
- Win rate > 60%: +200
- Win rate > 50%: +100
- Otherwise: +0

Final = max(0, Base + Bonus)
```

**Use Cases**:
- Competitive ranking tracking
- Skill measurement
- Leaderboard progression
- Competitive benchmark

---

## Multiplayer Commands

### `/gamble_duel <player> <bet_amount>`

**Usage**: `/gamble_duel Steve 50`

**Permission**: Public

**Requirements**:
- Target player must be online
- Minimum bet: 1 coin
- Maximum bet: 100 coins
- Both players must have enough coins

**Description**: Challenge another player to a 1v1 duel

**Response** (Challenger):
```
✓ Duel-Herausforderung an Steve gesendet!
```

**Response** (Opponent):
```
⚡ DUEL HERAUSFORDERUNG! ⚡
Steve fordert dich zu einem Duel heraus!
Einsatz: 50 coins
Nutze: /duel accept
```

**Match Format**:
- Best-of-3 rounds
- First to 2 wins takes all coins
- Automatic coin transfer to winner
- Match recorded in statistics

**Use Cases**:
- Competitive 1v1 matches
- High-stakes betting
- Bragging rights
- Player competitions

**Examples**:
```
/gamble_duel Alex 25    # Challenge Alex with 25 coins
/gamble_duel Max 100    # High-stakes duel
/gamble_duel Steve 1    # Low-stakes friendly
```

---

### `/gamble_duel_accept`

**Usage**: `/gamble_duel_accept`

**Permission**: Public

**Description**: Accept a pending duel challenge (alternative to UI)

**Requirements**:
- Must have an active duel challenge
- Must have enough coins to match bet

**Response** (Accepted):
```
✓ Duel akzeptiert!
Runde 1: START!
```

**Match Begins**:
- Both players play simultaneously
- Results compared
- Winner of 2 rounds wins duel
- Coins automatically transferred

**Use Cases**:
- Accept duel challenges
- Start competitive match
- Respond to player challenges

---

### `/gamble_clan_create <clan_name>`

**Usage**: `/gamble_clan_create "Dragon Slayers"`

**Permission**: Public

**Requirements**:
- Clan name can contain spaces (use quotes)
- No duplicate clan names
- Creator becomes leader

**Description**: Create a new clan/guild

**Response**:
```
✓ Clan 'Dragon Slayers' erstellt!
```

**Clan Created With**:
- Leader: You
- Members: Just you (can add more)
- Level: 1
- Treasury: 0 coins
- Record: 0 wins, 0 losses

**Clan Features**:
- Member management
- Shared treasury
- Clan wars
- Collective statistics
- Level progression

**Use Cases**:
- Create player group
- Team competitions
- Shared resources
- Community building

**Examples**:
```
/gamble_clan_create "Night Owls"
/gamble_clan_create "Golddiggers"
/gamble_clan_create "Lucky Dragons"
```

---

## Admin Commands

### `/gamble_create`

**Usage**: `/gamble_create`

**Permission**: Admin tag required

**Description**: Create a gambling machine at your current location

**Response**:
```
✓ Neue Gambling Machine an dieser Position erstellt!
```

**Requirements**:
- Must have "admin" tag
- Creates machine at your exact coordinates

**Machine Created With**:
- Location: Your coordinates
- State: Ready to play
- Status: Active
- Registered for redstone control

**Use Cases**:
- Setup new gambling areas
- Create regional machines
- Manage game locations
- Admin setup

**Examples**:
```
# Stand at location and run:
/gamble_create

# Machine now appears at X Y Z
```

---

### `/gamble_give <player> <amount>`

**Usage**: `/gamble_give Steve 500`

**Permission**: Admin tag required

**Description**: Give coins to a player

**Response**:
```
✓ 500 coins an Steve gegeben
```

**Player Receives**:
```
✓ Du hast 500 coins erhalten!
```

**Requirements**:
- Must have "admin" tag
- Target player must be online
- Amount must be positive integer

**Use Cases**:
- Admin economy management
- Give starter coins
- Reward players
- Compensation
- Prize distribution

**Examples**:
```
/gamble_give Steve 1000       # Give 1000 coins
/gamble_give Alex 5000        # Large reward
/gamble_give newplayer 100    # Starter coins
```

---

### `/gamble_tournament <start|end|stats>`

**Usage**: `/gamble_tournament start`

**Permission**: Admin tag required

**Options**:

#### `start [tournament_name]`

**Usage**: `/gamble_tournament start "Weekly Championship"`

**Description**: Start a new tournament

**Response**:
```
✓ Turnier gestartet!
```

**Tournament Created**:
- Status: Registration open
- Players can join/register
- Maximum 32 participants
- Bracket auto-generates at start

**Use Cases**:
- Organize competitions
- Schedule regular events
- Create tournaments
- Community events

**Example**:
```
/gamble_tournament start
/gamble_tournament start "Friday Night Championship"
/gamble_tournament start "Monthly Mega Event"
```

---

#### `end`

**Usage**: `/gamble_tournament end`

**Description**: End active tournament and crown champion

**Response** (Success):
```
✓ Turnier beendet! Gewinner: Steve
```

**Response** (No Active Tournament):
```
✗ Kein Turnier aktiv oder keine Teilnehmer!
```

**Tournament Completion**:
- Determines final winner
- Awards prize to champion
- Records statistics
- Archive tournament data

**Use Cases**:
- Conclude tournament
- Award champion
- End competition
- Start new tournament

---

#### `stats`

**Usage**: `/gamble_tournament stats`

**Description**: Display current tournament statistics

**Response**:
```
Turnier Statistiken:
{
  name: "Weekly Championship",
  participants: 8,
  currentRound: 2,
  remaining: 2,
  matches: 6,
  completed: 4
}
```

**Stats Shown**:
- Tournament name
- Total participants
- Current round
- Remaining players
- Total matches
- Completed matches
- Bracket status

**Use Cases**:
- Monitor tournament progress
- Check standings
- Verify bracket status
- Tournament administration

---

## Command Quick Reference Table

| Command | Type | Usage | Admin | Status |
|---------|------|-------|-------|--------|
| `/gamble_coins` | Info | - | No | ✅ |
| `/gamble_play` | Action | - | No | ✅ |
| `/gamble_leaderboard` | Info | - | No | ✅ |
| `/gamble_myrank` | Info | - | No | ✅ |
| `/gamble_achievements` | Info | - | No | ✅ |
| `/gamble_stats` | Info | - | No | ✅ |
| `/gamble_ladder` | Info | - | No | ✅ |
| `/gamble_duel` | Action | <player> <bet> | No | ✅ |
| `/gamble_duel_accept` | Action | - | No | ✅ |
| `/gamble_clan_create` | Action | <name> | No | ✅ |
| `/gamble_create` | Action | - | Yes | ✅ |
| `/gamble_give` | Action | <player> <amount> | Yes | ✅ |
| `/gamble_tournament` | Action | start\|end\|stats | Yes | ✅ |

---

## Permission Levels

### Public Commands (10)
- `/gamble_coins`
- `/gamble_play`
- `/gamble_leaderboard`
- `/gamble_myrank`
- `/gamble_achievements`
- `/gamble_stats`
- `/gamble_ladder`
- `/gamble_duel`
- `/gamble_duel_accept`
- `/gamble_clan_create`

### Admin Commands (6)
Require `tag @a[tag=admin]`
- `/gamble_create`
- `/gamble_give`
- `/gamble_tournament`

---

## Error Handling

### Common Errors & Solutions

**"Spieler nicht gefunden!"**
- Player not online
- Check player name spelling
- Player may be in different world

**"Keine Berechtigung!"**
- Missing admin tag
- Command requires admin: `/tag @s add admin`
- Check with server admin

**"Usage: /gamble_duel <player> <bet_amount>"**
- Missing arguments
- Correct format: `/gamble_duel Steve 50`

**"Zu schnell! Bitte warte ein wenig."**
- Rate limiting active (2 second cooldown)
- Wait before next action

**"Kein Turnier aktiv"**
- No tournament running
- Admin needs to start: `/gamble_tournament start`

---

## Tips & Tricks

### For Players

1. **Check balance regularly**
   ```
   /gamble_coins
   ```

2. **Monitor your rank**
   ```
   /gamble_myrank
   ```

3. **Track achievements**
   ```
   /gamble_achievements
   ```

4. **Analyze performance**
   ```
   /gamble_stats
   ```

5. **Compete in duels**
   ```
   /gamble_duel <opponent> <bet>
   ```

### For Admins

1. **Setup new machines**
   ```
   /gamble_create
   ```

2. **Manage economy**
   ```
   /gamble_give Steve 1000
   ```

3. **Organize tournaments**
   ```
   /gamble_tournament start "Monthly Championship"
   /gamble_tournament stats
   /gamble_tournament end
   ```

4. **Give admin tag**
   ```
   /tag @s add admin
   ```

5. **Monitor leaderboard**
   ```
   /gamble_leaderboard
   ```

---

## Version History

### v2.0.0 (Current)
✅ 16 total commands
✅ Public: 10 commands
✅ Admin: 6 commands
✅ All major features
✅ Complete documentation

### v1.0.0
✅ 7 commands
✅ Basic features only

---

## Support

For issues or questions about commands:

1. Check this reference guide
2. Run `/help gamble_*` (if bridge supports)
3. Check console for error messages
4. Contact server administrator

---

*Generated: 2025-11-18*
*By: Claude Code*
*For: Minecraft Bedrock 1.21.120+*
