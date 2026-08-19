# 🚀 Installation & Quick Start Guide

## Schritt-für-Schritt Installation des Shelf Gambling Systems

---

## 📋 Voraussetzungen

- ✅ Minecraft Bedrock Server 1.21.120+
- ✅ Bedrock-Bridge v1.6.10+ Installation
- ✅ World mit Script API Enable
- ✅ Administrator Zugriff auf Server

---

## 🔧 Installation

### 1. Plugin-Dateien kopieren

Die Dateien sind bereits vorhanden in:
```
D:\BB\bridgePlugins\shelf\
```

Falls nicht, stelle sicher, dass folgende Dateien existieren:
- ✅ `shelfGamble.js` - Core Gambling System
- ✅ `shelfAdvanced.js` - Jackpot, Leaderboard, Tournaments
- ✅ `shelfRedstone.js` - Redstone & Block Integration
- ✅ `shelfDiscord.js` - Discord Bridge
- ✅ `config.js` - Konfiguration
- ✅ `index.js` - Entry Point
- ✅ `README.md` - Dokumentation

### 2. Plugin in Bridge aktivieren

**Datei öffnen**: `D:\BB\bridgePlugins\index.js`

**Füge diese Zeile hinzu**:
```javascript
import "./shelf/index.js"  // 🎰 Shelf Gambling System
```

**Vollständiges Beispiel**:
```javascript
/**
 * BedrockBridge-Plugins
 * BridgeAPI @version 1.0.2
 */

import "./external"         // bridgeDirect capabilities
import "./landclaim.js"     // LandClaim Plugin
import "./shelf/index.js"   // 🎰 SHELF GAMBLING SYSTEM (NEU)

// ... andere Plugins
```

### 3. Server Reload

Im Server führe aus:
```
/reload
```

**Erwartete Output**:
```
§6[ShelfGamble] Coins-Objective erstellt
§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert!
```

### 4. Verifiziere Installation

Spieler (beliebiger) führt aus:
```
/gamble_coins
```

**Erwartete Output**:
```
§6Deine Coins: §a100
```

---

## ⚙️ Erste Konfiguration

### Optionale Anpassungen in `config.js`

#### A) Coin-Einstellungen
```javascript
GAMBLING_CONFIG.betting.minBet = 5;        // Min: 5 coins
GAMBLING_CONFIG.betting.maxBet = 100;      // Max: 100 coins
GAMBLING_CONFIG.betting.defaultBalance = 500;  // Startguthaben erhöht
```

#### B) Jackpot-Einstellungen
```javascript
GAMBLING_CONFIG.jackpot.jackpotChance = 0.005;  // 0.5% Chance
GAMBLING_CONFIG.jackpot.contributionRate = 0.10; // 10% aller Wetten
```

#### C) Discord aktivieren
```javascript
GAMBLING_CONFIG.discord.enabled = true;    // Bereits true
GAMBLING_CONFIG.discord.broadcastWins = true;
GAMBLING_CONFIG.discord.dailyReports = true;
```

**Speichern und `/reload` ausführen!**

---

## 🎮 Erste Schritte im Spiel

### Step 1: Spieler Coins geben

```bash
# Admin gibt neuem Spieler Coins (wenn nötig)
# Spieler: /gamble_coins
# Admin: /gamble_give <player> 50
```

### Step 2: Shelf-Block platzieren

```
1. Suche nach einem Shelf-Block im Creative oder:
2. /give @s oak_shelf (oder andere Variante)
3. Platziere den Shelf-Block irgendwo
```

### Step 3: Erste Wette

```
1. Spieler klickt auf den Shelf-Block
2. UI sollte sich öffnen
3. Wähle "10 Coins" zum Spielen
4. Spin-Animation läuft
5. Ergebnis: Gewinn oder Verlust
```

### Step 4: Statistiken checken

```bash
# Spieler schaut seine Statistiken
/gamble_myrank

# Top 10 anschauen
/gamble_leaderboard
```

---

## 🔗 Discord Integration Setup

### Automatische Integration (Empfohlen)

Wenn Bedrock-Bridge bereits mit Discord verbunden ist:
1. Plugin wird automatisch erkannt
2. Gewinne werden zu Discord geschickt
3. Keine weitere Konfiguration nötig!

**Testen**:
```bash
# Im Spiel einen Gewinn erzeugen
# Sollte Discord-Nachricht erscheinen mit Embed
```

### Manueller Webhook Setup (Optional)

Falls vorhanden:
```javascript
// In shelfDiscord.js:
gamblingBridge.initialize(
    "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
    "CHANNEL_ID"
);
```

---

## 🧪 Testing Checklist

Nach Installation folgende Tests durchführen:

- [ ] `/gamble_coins` zeigt 100 coins
- [ ] Spieler kann auf Shelf klicken
- [ ] UI öffnet sich mit korrektem Text
- [ ] 10-Coins Wette kann platziert werden
- [ ] Coins werden abgezogen
- [ ] Spin-Animation läuft (ca. 1 Sekunde)
- [ ] Ergebnis wird angezeigt (Gewinn/Verlust)
- [ ] `/gamble_leaderboard` zeigt Spieler
- [ ] `/gamble_myrank` zeigt korrekten Rang
- [ ] **[Optional]** Discord erhält Gewinn-Message

---

## 🐛 Häufige Installation-Fehler

### ❌ Error: "bridge is not defined"

**Ursache**: index.js konnte addons.js nicht importieren

**Lösung**:
```javascript
// Prüfe dass Pfad korrekt ist:
import { bridge } from '../addons';  // ← Relativer Pfad!
```

### ❌ Error: "world is not defined"

**Ursache**: Import fehlt

**Lösung**:
```javascript
// Stelle sicher dass oben vorhanden:
import { world, system, Player } from '@minecraft/server';
```

### ❌ Command `/gamble_coins` funktioniert nicht

**Ursache**: Plugin nicht richtig aktiviert oder Reload fehlt

**Lösung**:
```bash
1. Überprüfe dass import in index.js existiert
2. Führe /reload aus
3. Warte 5 Sekunden
4. Probiere erneut
```

### ❌ Coins werden nicht abgezogen

**Ursache**: Coins-Objective nicht initialisiert

**Lösung**:
```bash
/scoreboard players list coins
# Sollte zumindest einen Spieler zeigen
# Falls leer: /reload ausführen
```

---

## 🔐 Sichere Konfiguration

### Production Checklist

- [ ] Anti-Cheat aktiviert (`config.js`)
- [ ] Discord Integration getestet
- [ ] House Edge auf 5% gesetzt
- [ ] Max Payout pro Spieler begrenzt
- [ ] Backups eingerichtet
- [ ] Admin Tags zugewiesen

### Backup-Plan

```bash
# Tägliche Backups machen
# Shelf Gambling Daten sind in DynamicProperties
# -> Automatisch in world gespeichert

# Manueller Export (Admin):
/execute as @a run scoreboard players get @s coins
```

---

## 🚀 Erweiterte Konfiguration

### Automatische Redstone-Spins

```
[Clock (12 Ticks)]
        ↓
[Redstone Dust]
        ↓
     [SHELF] ← Macht automatische Spins!
        ↓
    [Hopper]
        ↓
[Item Destination]
```

### Mehrere Shelves verbinden

```
[Shelf 1] - [Shelf 2] - [Shelf 3]
     ↑
   Powered

→ Alle 3 zusammen = automatischer Swap aller 9 Hotbar-Slots!
```

### Custom Symbole hinzufügen

In `config.js`:
```javascript
GAMBLING_CONFIG.symbols.custom_item = {
    name: "§d✦ Custom Item",
    weight: 0.3,
    multiplier: 8,
    description: "Custom 8x Gewinn"
};
```

---

## 📞 Support & Help

### Wenn etwas nicht funktioniert:

1. **Überprüfe Logs**:
   ```bash
   # Server Console hat Fehler?
   # Schreib sie auf
   ```

2. **Teste Manuell**:
   ```bash
   /gamble_coins
   /gamble_leaderboard
   /gamble_myrank
   ```

3. **Debug Mode aktivieren**:
   ```javascript
   // In config.js:
   debugMode: true
   ```

4. **Kontaktiere Support**:
   - GitHub: [InnateAlpaca/BedrockBridge](https://github.com/InnateAlpaca/BedrockBridge)
   - Discord: Esploratori Development

---

## ✅ Installation Abgeschlossen!

Du kannst jetzt:
- ✅ Spiele auf Shelves
- ✅ Gewinne Coins oder verliere
- ✅ Sehe deine Statistiken
- ✅ Concurriere im Leaderboard
- ✅ Gewinne große Jackpots!

**Viel Spaß! 🎰🎉**
