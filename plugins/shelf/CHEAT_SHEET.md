# 🎰 Shelf Gambling System - Cheat Sheet

Schnelle Referenz für Spieler, Admins und Entwickler

---

## 👤 SPIELER COMMANDS

```bash
# Zeige deine Coins
/gamble_coins

# Öffne Gambling UI neben Shelf
/gamble_play

# Zeige deinen Rang & Statistiken
/gamble_myrank

# Sieh Top 10 Spieler
/gamble_leaderboard
```

---

## 🛠️ ADMIN COMMANDS

```bash
# Erstelle Gambling Machine an Position
/gamble_create

# Gebe Coins an Spieler
/gamble_give <player> <amount>
Beispiel: /gamble_give Steve 500

# Starte Turnier
/gamble_tournament start <name>
Beispiel: /gamble_tournament start "Weekend Challenge"

# Beende Turnier
/gamble_tournament end

# Zeige Turnier-Stats
/gamble_tournament stats

# Leaderboard aktualisieren
/gamble_leaderboard

# Anti-Cheat Logs checken
/gamble_anticheat logs

# Spieler suspendieren (verdächtig)
/gamble_anticheat suspend <player>
```

---

## 🎮 SPIELMECHANIK

### Gewinn-Multiplikatoren
```
3x Symbole  = Wette × 3  (Grün)
2x Symbole  = Wette × 1.5 (Gold)
0x Symbole  = Verlust    (Rot)
```

### Symbol-Chancen
```
Apple        = 34.5% Chance | 2x Multiplier
Emerald      = 27.6% Chance | 4x Multiplier
Diamond      = 17.2% Chance | 5x Multiplier
Gold Block   = 10.3% Chance | 10x Multiplier
Amethyst     = 6.9% Chance  | 20x Multiplier
Netherite    = 3.4% Chance  | 50x Multiplier
```

### Quick Bets
```
10 Coins    = Niedriges Risiko
25 Coins    = Mittleres Risiko
50 Coins    = Hohes Risiko
Custom      = Deine Wahl
```

---

## ⚙️ REDSTONE AUTOMATION

### Automatische Spins Setup
```
[Clock (12 Ticks)]
        ↓
[Redstone Dust]
        ↓
    [SHELF] ← Powers it
        ↓
   [Hopper]
        ↓
[Coins/Items]
```

### Connected Shelves
```
[Shelf 1] ← [Shelf 2] ← [Shelf 3]
   (powered)

= Automatischer Swap aller 9 Hotbar-Slots!
```

### Comparator Output
```
Left Slot   = Signal 1
Mid Slot    = Signal 2
Right Slot  = Signal 4
Max (All 3) = Signal 7
```

---

## 🔗 DISCORD COMMANDS

Automatisch aktiviert wenn Bedrock-Bridge mit Discord verbunden!

### Automatische Messages
```
✅ Win Broadcast    → Discord zeigt Gewinne
✅ Jackpot Alert    → Server-wide Benachrichtigung
✅ Leaderboard Sync → Top 10 auf Discord
✅ Daily Reports    → Täglich um 00:00 UTC
✅ Anti-Cheat Alert → Verdächtige Aktivitäten
```

### Discord Format
```
🎰 GEWINN NACHRICHTEN
━━━━━━━━━━━━━━━━━━━━━━
Spieler: Steve
Gewinn: 150 coins
Reels: ◆ | ◆ | ◆
Position: X:100 Y:64 Z:200
```

---

## 📊 STATISTIKEN VERGLEICH

### Deine Stats
```
/gamble_myrank

→ Rang: #5
→ Gewinne: 23
→ Spiele: 89
→ Win Rate: 25.8%
→ Total Winnings: 2340 coins
```

### Leaderboard
```
/gamble_leaderboard

1. 🥇 Steve       - 5000 coins (45 Wins)
2. 🥈 Alex        - 3200 coins (32 Wins)
3. 🥉 Sarah       - 2800 coins (28 Wins)
...
10.    PlayerXYZ  - 500 coins (5 Wins)
```

---

## 💾 KONFIGURATION (config.js)

### Schnelle Anpassungen

```javascript
// Minimal Bet
GAMBLING_CONFIG.betting.minBet = 1;

// Maximal Bet
GAMBLING_CONFIG.betting.maxBet = 64;

// Start Coins für Spieler
GAMBLING_CONFIG.betting.defaultBalance = 100;

// Jackpot Chance (0.001 = 0.1%)
GAMBLING_CONFIG.jackpot.jackpotChance = 0.001;

// Jackpot Contribution (5% aller Wetten)
GAMBLING_CONFIG.jackpot.contributionRate = 0.05;

// Anti-Cheat aktivieren
GAMBLING_CONFIG.antiCheat.enabled = true;

// Discord aktivieren
GAMBLING_CONFIG.discord.enabled = true;

// Redstone Automation
GAMBLING_CONFIG.automation.autoSpinOnPower = true;
```

---

## 🐛 TROUBLESHOOTING

### Problem: Coins zeigen nicht
```bash
Lösung:
1. /reload (Reload Server)
2. /gamble_coins (Probiere nochmal)
3. /scoreboard players list coins (Zeige alle)
```

### Problem: UI öffnet nicht
```bash
Lösung:
1. Stelle sicher, dass Shelf platziert ist
2. Klicke direkt auf den Shelf (nicht daneben)
3. Warte 1 Sekunde zwischen Klicks
```

### Problem: Keine Discord Messages
```bash
Lösung:
1. Prüfe Bedrock-Bridge Connection
2. Bot hat Discord Permissions?
3. Webhook konfiguriert?
4. /reload ausführen
```

### Problem: Jackpot kommt nie
```bash
Lösung:
1. Chance ist 0.1% = sehr selten!
2. Viel spielen = mehr Chancen
3. Debug-Mode einschalten zum Testen
```

---

## 📈 BALANCING GUIDE (für Server-Owner)

### Gewinnquoten erhöhen
```javascript
// Symbol-Multiplizierer erhöhen
GAMBLING_CONFIG.symbols.diamond.multiplier = 8;  // War 5

// House Edge verringern
GAMBLING_CONFIG.balance.houseEdgePct = 2;  // War 5
```

### Gewinnquoten verringern
```javascript
// Symbol-Gewichte anpassen
GAMBLING_CONFIG.symbols.netherite.weight = 0.05;  // War 0.1

// Jackpot weniger wahrscheinlich
GAMBLING_CONFIG.jackpot.jackpotChance = 0.0005;  // War 0.001
```

### Coins-Wert ändern
```javascript
// Start-Coins erhöhen
GAMBLING_CONFIG.betting.defaultBalance = 500;  // War 100

// Neue Spiele-Grenzen
GAMBLING_CONFIG.betting.minBet = 5;   // War 1
GAMBLING_CONFIG.betting.maxBet = 100; // War 64
```

---

## 🔐 SICHERHEIT CHECKLIST

```
[ ] Anti-Cheat aktiviert?
[ ] Admin-Tags zugewiesen?
[ ] Discord Integration getestet?
[ ] Backups eingerichtet?
[ ] Balance Limits gesetzt?
[ ] Max Payout pro Spieler?
[ ] Log-Retention konfiguriert?
[ ] Verdächtige Spieler monitorieren?
```

---

## 📝 WICHTIGE DATEIEN

```
D:\BB\bridgePlugins\shelf\
├── index.js          ← Main Plugin
├── shelfGamble.js    ← Core Logic
├── shelfAdvanced.js  ← Jackpot/Leaderboard/Tournaments
├── shelfRedstone.js  ← Redstone/Block Integration
├── shelfDiscord.js   ← Discord Messages
├── config.js         ← ALLE EINSTELLUNGEN HIER!
├── README.md         ← Vollständige Doku
└── INSTALLATION.md   ← Setup Guide
```

---

## 🎮 GAME FLOW

```
1. Spieler klickt auf Shelf
   ↓
2. UI öffnet (Menü mit Optionen)
   ↓
3. Wette wählen (10/25/50 oder custom)
   ↓
4. Spin Animation (1 Sekunde)
   ↓
5. Ergebnis berechnet
   ↓
6. Auszahlung/Verlust
   ↓
7. Discord Broadcast (wenn gewonnen)
   ↓
8. Leaderboard Update
   ↓
9. [Zurück zu Schritt 1 oder Menu schließen]
```

---

## 💡 PRO TIPS

### Für Spieler
```
💰 Spiele mit Bedacht
   - Große Wetten = höheres Risiko
   - Niedrige Wetten = mehr Spiele mit selben Budget
   - Statistiken checken um Chancen zu verstehen

🎰 Nutze Tournaments
   - Extra Preise verdienen
   - Compete gegen andere
   - Top 3 bekommen Coins

📊 Tracke dein Ranking
   - /gamble_myrank regelmäßig
   - Vergleiche mit anderen
   - Verbesserungen sehen
```

### Für Admins
```
🛠️ Balancing ist Kunst
   - Zu einfach = Spieler verlieren schnell
   - Zu schwer = Niemand spielt
   - Teste verschiedene Settings

💾 Backups regelmäßig machen
   - DynamicProperties sind wichtig
   - Weekly Backups empfohlen
   - Snapshot vor großen Changes

📈 Monitore Statistiken
   - Wer spielt viel?
   - Welche Symbole sind beliebt?
   - Ist Balance fair?
```

### Für Entwickler
```
🔧 Erweiterungspoints
   - Neue Symbole hinzufügen: config.js
   - Custom UI: index.js showMainGamblingUI()
   - Neue Commands: bridge.bedrockCommands.registerCommand()
   - Discord Messages: shelfDiscord.js

🐛 Debugging
   - DEBUG_CONFIG für Test-Mode
   - console.warn() für Logs
   - DynamicProperties mit inspect
   - Test lokale Änderungen erst

📦 Deployment
   - Verifiziere alle Imports
   - Test mit /reload
   - Backup vor Release
   - Monitor erste 24h
```

---

## 🎯 HÄUFIGE FRAGEN

**F: Können Coins dupliziert werden?**
A: Nein - Anti-Duplication durch Scoreboard + DynamicProperty Sync

**F: Ist es fair?**
A: Ja - Weighted RNG mit statistischem Balance

**F: Kann ich Coins verlieren?**
A: Ja - Das ist das Glücksspiel-Risiko!

**F: Wie oft gewinne ich?**
A: ~55% Win Rate im Durchschnitt (mit House Edge)

**F: Was ist der Jackpot?**
A: 0.1% Chance um alle Coins aus dem Pool zu gewinnen

**F: Arbeitet es mit Vanilla Shelves?**
A: Ja! Alle 12 Varianten unterstützt

**F: Brauche ich Redstone?**
A: Nein - Optional für Automation

**F: Discord Integration?**
A: Automatisch wenn Bedrock-Bridge aktiv

---

## 📞 QUICK SUPPORT

```
Fehler bei: /gamble_coins
→ /reload ausführen

UI öffnet nicht
→ Clicke direkt auf Shelf-Block

Keine Discord Messages
→ Bridge verbunden? Permissions OK?

Coins weg
→ /gamble_coins zeigen Balance

Verdächtige Aktivität?
→ /gamble_anticheat logs prüfen
```

---

**🎰 Viel Spaß beim Spielen! May your reels align! 🎰**

---

*Cheat Sheet für Shelf Gambling System v1.0.0*
*Made for Minecraft Bedrock 1.21.120+*
