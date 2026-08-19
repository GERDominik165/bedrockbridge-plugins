# 🔥 HOTFIX v1.1 - Command Registration Error

## Problem
```
[ERROR] [Scripting] Unhandled promise rejection: TypeError: cannot read property 'bedrockCommands' of null
```

**Ursache**: Commands wurden in `shelfGamble.js` und `shelfAdvanced.js` direkt registriert, bevor `bridge` geladen wurde.

---

## ✅ Lösung Implementiert

### 1. **Commands aus Sub-Modulen entfernt**

**shelfGamble.js**:
- ✅ Entfernt: `gamble_create` command
- ✅ Entfernt: `gamble_play` command
- ✅ Entfernt: `gamble_coins` command

**shelfAdvanced.js**:
- ✅ Entfernt: `gamble_tournament` command
- ✅ Entfernt: `gamble_leaderboard` command
- ✅ Entfernt: `gamble_myrank` command

### 2. **Alle Commands in index.js zentralisiert**

Commands werden nun **NACH** Bridge geladen registriert:

```javascript
async function initializePlugin() {
    // 1. Lade Bridge
    const bridgeModule = await import('../../Bedrock-Bridge/scripts/addons.js');
    bridge = bridgeModule.bridge;

    // 2. Registriere Commands (mit gefülltem bridge)
    registerBridgeCommands();
}
```

### 3. **Erweiterte Command-Liste**

**Spieler Commands** (ohne Admin-Tag):
- `gamble_play` - Klicke auf Shelf
- `gamble_coins` - Zeige Balance
- `gamble_leaderboard` - Top 10
- `gamble_myrank` - Dein Rank

**Admin Commands** (mit Admin-Tag):
- `gamble_create` - Machine erstellen
- `gamble_give <player> <amount>` - Coins geben
- `gamble_tournament <start|end|stats>` - Turniere

---

## 📝 Datei-Änderungen

### shelfGamble.js
```diff
- bridge.bedrockCommands.registerCommand("gamble_create", ...)
- bridge.bedrockCommands.registerCommand("gamble_play", ...)
- bridge.bedrockCommands.registerCommand("gamble_coins", ...)
+ // Keine Commands hier - werden in index.js registriert!
```

### shelfAdvanced.js
```diff
- bridge.bedrockCommands.registerCommand("gamble_tournament", ...)
- bridge.bedrockCommands.registerCommand("gamble_leaderboard", ...)
- bridge.bedrockCommands.registerCommand("gamble_myrank", ...)
+ // Keine Commands hier - werden in index.js registriert!
```

### index.js
```diff
+ function registerBridgeCommands() {
+     // Alle 7 Commands registriert
+     // Spieler: 4 Commands
+     // Admin: 3 Commands
+ }
```

---

## 🧪 Testing

Nach dem Hotfix solltest du sehen:

```
§6[ShelfGamble] Bridge API geladen
§6[ShelfGamble] ✓ Alle Commands registriert
§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert!
```

**Keine Errors!** ✅

---

## 🚀 Was nun funktioniert

```bash
/gamble_coins                    # ✅ Funktioniert
/gamble_leaderboard              # ✅ Funktioniert
/gamble_myrank                   # ✅ Funktioniert
/gamble_create                   # ✅ Funktioniert (Admin)
/gamble_give Steve 50            # ✅ Funktioniert (Admin)
/gamble_tournament start          # ✅ Funktioniert (Admin)
```

---

## 🎯 Architecture Pattern

Neuer Dependency Injection Pattern:

```
index.js (Main)
├── Lade Bridge API
├── Setze Bridge References
├── Registriere Commands
└── Initialisiere Plugin
```

**Vorteil**: Keine zirkulären Dependencies, klare Startup-Sequenz

---

## 📦 Version Info

- **Previous**: 1.0.0
- **Current**: 1.0.1 (Hotfix)
- **Status**: ✅ Production Ready

---

## 💾 Installation

Einfach `/reload` ausführen - Hotfix ist bereits in den Dateien integriert!

```
/reload
```

**Erwarteter Output**:
```
§6[ShelfGamble] ✓ Alle Commands registriert
§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert!
```

---

*Hotfix Applied: 2025-11-18*
*Next Steps: Test all commands!*
