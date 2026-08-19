# 🎰 SHELF GAMBLING SYSTEM v1.0.0

Ultra-krasses, durchdachtes Glücksspiel-Plugin für Minecraft Bedrock 1.21.121+
Funktioniert mit **Bedrock-Bridge** und der **BridgeAPI** für vollständige Discord-Integration.

---

## 📋 Inhaltsverzeichnis

1. [Features](#features)
2. [Installation](#installation)
3. [Konfiguration](#konfiguration)
4. [Commands](#commands)
5. [Spielmechaniken](#spielmechaniken)
6. [Redstone Integration](#redstone-integration)
7. [Discord Integration](#discord-integration)
8. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 🎮 Core Gambling System
- **Slot Machine UI**: 3-Walzen-Slots mit visuellen Animationen
- **Flexible Wetten**: 1-64 Coins, oder custom Beträge
- **Vielfältige Symbole**: 6 verschiedene Gewinn-Symbole mit unterschiedlichen Multiplier
- **Dynamische Quoten**: Wahrscheinlichkeitsbasierte Reel-Drops

### 💰 Coin/Balance System
- **Scoreboard-basiert**: Vollständige Integration mit MC Scoreboards
- **Persistent Storage**: Spieler-Guthaben werden gespeichert
- **Default Balance**: 100 Coins für neue Spieler
- **Transaction Logging**: Anti-Cheat Tracking

### 🎁 Jackpot System
- **Progressive Pools**: 5% aller Wetten → Jackpot
- **Rare Wins**: 0.1% Chance auf Jackpot
- **Automatische Resets**: Nach Jackpot-Gewinn auf 0
- **Discord Broadcast**: Gewinner werden server-weit bekannt gemacht

### 🏆 Leaderboard & Rankings
- **Top 10 Rankings**: Basierend auf Total Winnings
- **Spieler-Statistiken**: Wins, Losses, Win Rate
- **Automatische Updates**: Echtzeit-Sync
- **Persistent Data**: Speicherung in World DynamicProperties

### 🎊 Tournament System
- **Timed Tournaments**: Konfigurierbare Dauer
- **Automatische Preise**: Top 3 erhalten Coins
- **Live Standings**: Real-time Leaderboard während Turnier
- **Discord Updates**: Turnier-Ankündigungen und Ergebnisse

### ⚙️ Redstone Automation
- **Shelf Block Detection**: Automatische Registrierung
- **Power Detection**: Redstone-Signale triggern Spins
- **Comparator Output**: Signal basierend auf Slot-Inhalt
- **Hopper Integration**: Automatische Item-Transfer
- **Connected Shelves**: Bis zu 3 Shelves können zusammenhängen

### 🔒 Anti-Cheat System
- **Win Rate Monitoring**: Warnung bei unwahrscheinlichen Quoten (>80%)
- **Consecutive Win Detection**: Flaggt >20 Gewinne in Folge
- **Transaction Logging**: Alle Bets/Wins werden geloggt
- **Admin Alerts**: Discord-Benachrichtigungen bei verdächtigem Verhalten

### 🔗 Discord Integration
- **Embed Messages**: Schöne formatted Discord Nachrichten
- **Win Broadcasting**: Große Gewinne werden bekannt gemacht
- **Leaderboard Sync**: Top Players auf Discord
- **Daily Reports**: Tägliche Statistiken
- **Anti-Cheat Alerts**: Verdächtige Aktivitäten melden

---

## 📦 Installation

### Voraussetzungen
- Minecraft Bedrock Server 1.21.120+
- **Bedrock-Bridge** v1.6.10+ installiert
- World mit Script API aktiviert

### Setup-Schritte

1. **Kopiere Plugin-Ordner**
   ```bash
   Kopiere D:\BB\bridgePlugins\shelf\
   zu deinem Bedrock Server: bedrock_server\bridge_plugins\shelf\
   ```

2. **Aktiviere Plugin in index.js**
   ```javascript
   // Füge zu D:\BB\bridgePlugins\index.js hinzu:
   import "./shelf/index.js"
   ```

3. **Reload Server**
   ```
   /reload
   ```

4. **Verifiziere Installation**
   - Meldung: `[ShelfGamble] ✓ Plugin erfolgreich initialisiert!`
   - Command `/gamble_coins` zeigt deine Coins

---

## ⚙️ Konfiguration

Alle Settings sind in `config.js` zentral konfigurierbar:

### Grundlegende Settings
```javascript
GAMBLING_CONFIG.betting.minBet = 1;      // Minimale Wette
GAMBLING_CONFIG.betting.maxBet = 64;     // Maximale Wette
GAMBLING_CONFIG.betting.defaultBalance = 100;  // Startguthaben
```

### Jackpot
```javascript
GAMBLING_CONFIG.jackpot.enabled = true;
GAMBLING_CONFIG.jackpot.jackpotChance = 0.001;  // 0.1% Chance
GAMBLING_CONFIG.jackpot.contributionRate = 0.05; // 5% aller Wetten
```

### Anti-Cheat
```javascript
GAMBLING_CONFIG.antiCheat.enabled = true;
GAMBLING_CONFIG.antiCheat.suspiciousWinRateThreshold = 0.8; // 80%
GAMBLING_CONFIG.antiCheat.consecutiveWinThreshold = 20;
```

### Discord Integration
```javascript
GAMBLING_CONFIG.discord.enabled = true;
GAMBLING_CONFIG.discord.broadcastWins = true;
GAMBLING_CONFIG.discord.broadcastJackpots = true;
```

---

## 🎮 Commands

### Spieler-Commands

| Command | Beschreibung |
|---------|-------------|
| `/gamble_play` | Öffne Gambling Machine UI |
| `/gamble_coins` | Zeige deine Coins |
| `/gamble_myrank` | Zeige deinen Rang & Stats |
| `/gamble_leaderboard` | Top 10 Spieler anzeigen |

### Admin-Commands

| Command | Beschreibung |
|---------|-------------|
| `/gamble_create` | Erstelle Gambling Machine an Position |
| `/gamble_tournament start <name>` | Starte Turnier |
| `/gamble_tournament end` | Beende Turnier |
| `/gamble_give <player> <amount>` | Gebe Coins an Spieler |

---

## 🎰 Spielmechaniken

### Wie funktioniert es?

1. **Spieler klickt auf Shelf-Block** → UI öffnet sich
2. **Wette platzieren** → Coins werden abgezogen
3. **Spin starten** → 3 Reels drehen sich (Animation)
4. **Ergebnis berechnen**:
   - 3x gleich = 3x Wetten-Multiplikator ✓
   - 2x gleich = 1,5x Multiplikator ✓
   - Keine = Verlust ✗

### Symbole & Gewinnquoten

| Symbol | Gewinnquote | Multiplikator |
|--------|------------|--------------|
| Apple | 100% | 2x |
| Emerald | 80% | 4x |
| Diamond | 50% | 5x |
| Gold Block | 30% | 10x |
| Amethyst | 20% | 20x |
| Netherite | 10% | **50x** |

### Mathematik

```
Gewinn = Wette × Multiplikator
Jackpot = 5% aller Wetten akkumuliert
House Edge = 5% (Automatisch berechnet)
```

---

## ⚙️ Redstone Integration

### Automatische Spins

Verbinde einen **Redstone** Comparator mit deinem Shelf:

```
        [Lever/Clock]
              |
        [Redstone]
              |
         [SHELF] ← Wenn powered = automatischer Spin!
              |
         [Hopper] → Auszahlung
```

### Connected Shelves

Shelves können sich verbinden (bis zu 3):

- **1 Shelf**: Swap 3 Hotbar-Slots (rechts)
- **2 Shelves**: Swap 6 Hotbar-Slots
- **3 Shelves**: Swap all 9 Hotbar-Slots

### Comparator Output

Shelf gibt Comparator-Signal basierend auf Inhalt:

- **Left Slot** = Signalstärke 1
- **Middle Slot** = Signalstärke 2
- **Right Slot** = Signalstärke 4
- **Max** = 7 (alle Slots gefüllt)

---

## 🔗 Discord Integration

### Setup

1. **Bedrock-Bridge Discord Bot** bereits aktiviert?
   - Ja? → Automatisch aktiv!

2. **Webhook konfigurieren (optional)**
   ```javascript
   gamblingBridge.initialize("https://discord.com/api/webhooks/...", "channel_id");
   ```

### Automatische Messages

✅ **Wins werden angezeigt**:
```
🎰 Player hat 50 Coins gewonnen!
Reels: ◆ | ◆ | ◆
```

✅ **Jackpots werden breitgetreten**:
```
🎉 JACKPOT GEWONNEN!
Player hat den Jackpot geknackt!
Gewinn: 5000 coins!
```

✅ **Leaderboard wird updated**:
- Automatisch alle 5 Minuten
- Top 10 Spieler angezeigt

✅ **Tägliche Reports**:
- Um 00:00 UTC
- Statistiken des Tages

---

## 🔒 Anti-Cheat

Das System monitort automatisch:

### Überwachte Metriken

- **Win Rate**: Warnung wenn >80%
- **Consecutive Wins**: Flagged wenn >20 in Folge
- **Large Payouts**: Logged wenn >500 coins
- **Suspicious Patterns**: AI-basierte Anomalie-Erkennung

### Admin Review

```
/gamble_anticheat logs    → Alle Logs
/gamble_anticheat suspend <player>  → Temporär sperren
/gamble_anticheat review <player>   → Spieler untersuchen
```

---

## 📊 Statistiken & Daten

### Gespeicherte Daten

- **Spieler-Balance**: In Coins-Objective
- **Win Statistiken**: In DynamicProperties
- **Leaderboard**: Top 10 Spieler
- **Transaktionen**: Anti-Cheat Logs
- **Jackpot Pool**: Aktuelle Summe

### Daten exportieren

```javascript
// Hole alle Statistiken
const stats = world.getDynamicProperty('gamble_');
console.log(stats);
```

---

## 🐛 Troubleshooting

### Problem: "Keine Gambling Machine hier"

**Lösung**: Erstelle mit `/gamble_create` oder klicke direkt auf einen Shelf-Block!

### Problem: Shelf wird nicht erkannt

**Lösung**: Stelle sicher, dass der Shelf v1.21.120+ ist. Alle 12 Varianten werden unterstützt.

### Problem: Coins werden nicht abgezogen

**Lösung**:
1. Prüfe: `/scoreboard players list coins`
2. Spieler initialisieren: `/reload`

### Problem: Discord Messages kommen nicht

**Lösung**:
1. Prüfe Bedrock-Bridge Verbindung
2. Discord Bot hat Permissions?
3. Webhook URL korrekt?

### Problem: Redstone triggert nicht

**Lösung**:
1. Powered-State wird geprüft
2. Redstone-Block muss direkt beim Shelf sein
3. Comparator-Output zum Detektieren

---

## 📈 Performance

### Optimierungen

- **Lazy Loading**: Machines nur bei Bedarf erstellen
- **Event Debouncing**: Spam-Prevention (1s Cooldown)
- **Efficient Storage**: DynamicProperty-basiert
- **Threading**: Spins auf async System-Ticks

### Benchmarks

- **Spin berechnung**: ~5ms
- **UI Render**: ~10ms
- **Discord Send**: ~500ms (asynchron)
- **Leaderboard Update**: ~50ms

---

## 🔐 Sicherheit

### Implementierte Sicherheitsmaßnahmen

1. **Input Validation**: Alle Wetten validiert
2. **Anti-Duplication**: Coins können nicht dupliziert werden
3. **Immutable Transactions**: Alle Transaktionen geloggt
4. **Admin-Only Actions**: Bestimmte Commands erfordern Admin-Tag
5. **Rate Limiting**: Verhindert Spam

---

## 📝 Lizenz & Credits

- **Author**: InnateAlpaca
- **License**: MIT
- **Part of**: Bedrock-Bridge Project
- **Version**: 1.0.0
- **Minecraft Version**: 1.21.120+

---

## 🤝 Support

Probleme? Kontaktiere:
- **GitHub**: [InnateAlpaca/BedrockBridge](https://github.com/InnateAlpaca/BedrockBridge)
- **Discord**: [Esploratori Development](https://discord.gg/esploratori-development)

---

**Viel Spaß beim Gambling! 🎰**
