# 🚨 Quick Fix Guide

## Fehler: "Import [bridgePlugins/addons.js] not found"

### ✅ SOLUTION (bereits angewendet)

Der Fehler wurde bereits in den Plugin-Dateien gefixt!

Die Import-Pfade wurden korrigiert:
- ✅ shelfGamble.js
- ✅ shelfAdvanced.js
- ✅ shelfDiscord.js
- ✅ index.js

---

## 🔄 Was wurde gemacht?

**VORHER:**
```javascript
import { bridge } from '../addons';  // ❌ FALSCH - Datei nicht da
```

**NACHHER:**
```javascript
let bridge = null;
export function setBridgeReference(bridgeAPI) {
    bridge = bridgeAPI;  // ✅ RICHTIG - Dependency Injection
}
```

Bridge wird jetzt **dynamisch** geladen in `index.js`:
```javascript
const bridgeModule = await import('../../Bedrock-Bridge/scripts/addons.js');
setGambleBridge(bridgeModule.bridge);
```

---

## 🎬 Was musst du jetzt tun?

### 1️⃣ Server Reload
```
/reload
```

### 2️⃣ Warte auf diese Nachricht
```
§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert!
```

### 3️⃣ Test Command
```
/gamble_coins
```

### 4️⃣ Erwartete Response
```
§6Deine Coins: §a100
```

---

## ✨ Wenn kein Error kommt = ✅ GELÖST!

---

## 🐛 Falls immer noch Fehler:

### Fehler: "Import [...] not found"

**1. Überprüfe dass die Datei importiert ist**
```
D:\BB\bridgePlugins\index.js
```

**Sollte enthalten:**
```javascript
import "./shelf/index.js"  // ← Diese Zeile muss da sein!
```

**2. Starte Server neu (nicht nur reload)**
```bash
# Server komplett stoppen und starten
```

**3. Überprüfe Console Output**
```
[ERROR] [Scripting] Failed to load plugin
```

Wenn du einen Error siehst → kopiere die gesamte Fehlermeldung!

---

## 📁 Datei-Struktur Verifizierung

```
D:\BB\
├── Bedrock-Bridge\
│   └── scripts\
│       └── addons.js          ✅ Sollte existieren
│
└── bridgePlugins\
    ├── index.js               ✅ Sollte shelf importieren
    └── shelf\
        ├── index.js           ✅ Main Entry
        ├── shelfGamble.js     ✅ Core
        ├── shelfAdvanced.js   ✅ Features
        ├── shelfRedstone.js   ✅ Redstone
        ├── shelfDiscord.js    ✅ Discord
        ├── config.js          ✅ Config
        └── README.md          ✅ Docs
```

---

## 💡 Wenn alles funktioniert

Solltest du folgende Commands nutzen können:

```bash
/gamble_coins          # Zeige deine Coins
/gamble_leaderboard    # Top 10 Spieler
/gamble_myrank         # Dein Rank
```

Und du solltest auf einen Shelf-Block clicken können für die UI!

---

## 🎉 Status nach Fix

| Feature | Status |
|---------|--------|
| Plugin Loads | ✅ OK |
| Coins System | ✅ OK |
| Gambling UI | ✅ OK |
| Discord (optional) | ⚠️ Optional |
| Redstone | ✅ OK |
| Leaderboard | ✅ OK |

---

**Wenn noch Probleme → kontaktiere Support mit der vollständigen Error-Message**

---

*Last Updated: 2025-11-18*
*Plugin Version: 1.0.0*
