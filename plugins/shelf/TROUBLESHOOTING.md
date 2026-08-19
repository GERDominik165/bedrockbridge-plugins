# 🛠️ Troubleshooting Guide - Shelf Gambling System

## Fehler & Lösungen

---

## Error 1: "Import [bridgePlugins/addons.js] not found"

### ❌ Problem
```
[ERROR] [Scripting] Failed to load plugin ./bridgePlugins/shelf/index:
Import [bridgePlugins/addons.js] not found.
```

### ✅ Lösung (v1.0.1 - bereits gefixt)
- `addons.js` befindet sich in `Bedrock-Bridge/scripts/`, nicht in `bridgePlugins/`
- Bridge wird jetzt dynamisch geladen mit Dependency Injection
- **Action**: `/reload` ausführen

---

## Error 2: "cannot read property 'bedrockCommands' of null"

### ❌ Problem
```
[ERROR] [Scripting] Unhandled promise rejection: TypeError:
cannot read property 'bedrockCommands' of null
```

### ❌ Ursache
Commands wurden vor Bridge-Loading registriert

### ✅ Lösung (v1.0.1 - bereits gefixt)
- Alle Commands aus Sub-Modulen entfernt
- Commands werden jetzt in `index.js` **NACH** Bridge geladen registriert
- **Action**: `/reload` ausführen

---

## Error 3: "Cannot find module 'shelfGamble.js'"

### ❌ Problem
```
[ERROR] [Scripting] Failed to load [...]: Cannot find module 'shelfGamble.js'
```

### ✅ Lösung
1. Überprüfe Dateien existieren:
   ```bash
   D:\BB\bridgePlugins\shelf\shelfGamble.js
   D:\BB\bridgePlugins\shelf\shelfAdvanced.js
   D:\BB\bridgePlugins\shelf\shelfRedstone.js
   D:\BB\bridgePlugins\shelf\shelfDiscord.js
   D:\BB\bridgePlugins\shelf\config.js
   D:\BB\bridgePlugins\shelf\index.js
   ```

2. Überprüfe dass import in `index.js` existiert:
   ```javascript
   import "./shelf/index.js"
   ```

3. Server Reload:
   ```
   /reload
   ```

---

## Error 4: "scoreboard players [...]"

### ❌ Problem
```
[ERROR] [...] scoreboard players [...]
```

### ✅ Lösung
1. Reload ausführen:
   ```
   /reload
   ```

2. Warte 5 Sekunden

3. Probiere erneut:
   ```
   /gamble_coins
   ```

---

## Command funktioniert nicht

### ❌ Problem
```
/gamble_coins  → Keine Response
```

### ✅ Lösungsschritte

**1. Überprüfe Console auf Errors**
- Schaue auf Server-Console ob [ERROR] gezeigt wird
- Notiere die Fehlermeldung

**2. Warte nach Reload**
```
/reload
[Warte 3-5 Sekunden]
/gamble_coins
```

**3. Probiere anderen Command**
```
/gamble_leaderboard
/gamble_myrank
```

**4. Überprüfe Bridge**
- Bedrock-Bridge installiert und aktiv?
- in `index.js` importiert?

---

## Plugin lädt nicht

### ❌ Problem
```
[ERROR] [Scripting] Failed to load plugin ./bridgePlugins/shelf/index: [...]
```

### ✅ Debug-Schritte

1. **Überprüfe Syntax der Dateien**
   ```bash
   # Auf Windows:
   type "D:\BB\bridgePlugins\index.js" | find "shelf"
   ```

2. **Überprüfe dass Import da ist**
   ```javascript
   // D:\BB\bridgePlugins\index.js sollte haben:
   import "./shelf/index.js"  // ← Diese Zeile!
   ```

3. **Vollständiger Reload**
   ```
   /reload
   ```

4. **Server Neustart (falls nötig)**
   - Server komplett stoppen
   - Starten
   - `/reload`

---

## Coins zeigen nicht

### ❌ Problem
```
/gamble_coins
§6Deine Coins: §a0  (oder undefined)
```

### ✅ Lösung

**Option 1: Reload**
```
/reload
/gamble_coins
```

**Option 2: Manuell setzen (Admin)**
```
/gamble_give <dein_name> 100
```

**Option 3: Scoreboard Check (Admin)**
```
/scoreboard players list coins
# Sollte deine Namen zeigen
```

---

## UI öffnet nicht beim Shelf-Klick

### ❌ Problem
Klick auf Shelf → Nichts passiert

### ✅ Lösung

1. **Stellsicher dass Shelf platziert ist**
   - `/give @s oak_shelf` (oder andere Variante)
   - Platziere Block

2. **Klicke direkt auf Block**
   - Nicht daneben
   - Nicht auf anderem Block

3. **Warte zwischen Klicks**
   - Minimum 1 Sekunde

4. **Reload und probiere erneut**
   ```
   /reload
   [Klicke auf Shelf]
   ```

---

## Discord Messages kommen nicht

### ❌ Problem
Gewinne werden nicht zu Discord gesendet

### ✅ Lösung

1. **Überprüfe dass Bridge aktiv ist**
   - Console sollte zeigen: `§6[ShelfGamble] Bridge API geladen`

2. **Überprüfe Discord-Bot Permissions**
   - Bot muss Write-Permission haben
   - Channel muss zugänglich sein

3. **Test-Win erzeugen**
   - Spielen bis gewonnen
   - Sollte Discord-Message erscheinen (optional Feature)

---

## Performance/Lag

### ⚠️ Problem
Server laggt beim Spielen

### ✅ Optimierungen

1. **Reduziere Spieler-Anzahl** beim Spielen
2. **Disable Anti-Cheat** wenn nicht nötig:
   ```javascript
   // config.js:
   GAMBLING_CONFIG.antiCheat.enabled = false;
   ```

3. **Disable Discord Integration** wenn nicht nötig:
   ```javascript
   GAMBLING_CONFIG.discord.enabled = false;
   ```

4. **Server Reload** einmal pro Tag

---

## Crashes/Errors in Log

### 📋 Häufige Crash-Gründe

**RangeError: Invalid array length**
- Zu viele Spieler online
- Leaderboard zu groß
- → Restartet Server

**TypeError: Cannot read property**
- Bridge nicht korrekt geladen
- → `/reload` ausführen

**Unhandled promise rejection**
- Async-Code Fehler
- → Logge den vollständigen Error

---

## Wie man einen Error reportet

Wenn du Error hast, sammle folgende Info:

```
1. Vollständige Error-Message (copy-paste aus Console)
2. Wann tritt Error auf? (Bei Command? Beim Spielen?)
3. Was hast du gemacht davor?
4. Minecraft Version?
5. Plugin Version?
```

**Beispiel guter Report**:
```
Error: TypeError: cannot read property 'x' of undefined
  at showGamblingUI (bridgePlugins/shelf/index.js:200)

Passiert wenn: Klick auf Shelf-Block
Meine Schritte vorher:
1. /reload
2. /gamble_coins (funktioniert)
3. Klick auf Shelf
4. Crash

Plugin Version: 1.0.1
Minecraft: 1.21.121
```

---

## Schnelle Fixes (TL;DR)

| Problem | Schnellfix |
|---------|-----------|
| Plugin lädt nicht | `/reload` |
| Command funktioniert nicht | `/reload` |
| Coins zeigen nicht | `/gamble_give <name> 100` |
| UI öffnet nicht | Klick direkt auf Shelf, nicht daneben |
| Bridge-Fehler | Überprüfe dass Bedrock-Bridge aktiv |
| Console voller Errors | Vollständiger Server Restart |

---

## Support Kontakt

Falls Probleme nicht gelöst werden:

1. **Überprüfe Documentation**:
   - README.md
   - INSTALLATION.md
   - FIXES_APPLIED.md

2. **Überprüfe alle Fehler** in Console

3. **Kontaktiere Developer**:
   - GitHub: [InnateAlpaca/BedrockBridge](https://github.com/InnateAlpaca/BedrockBridge)
   - Discord: Esploratori Development

4. **Erstelle Issue** mit vollem Error-Log

---

## Checkliste für Debugging

- [ ] Alle Dateien in `shelf/` existieren?
- [ ] `import "./shelf/index.js"` in `bridgePlugins/index.js`?
- [ ] `/reload` ausgeführt?
- [ ] Keine [ERROR] in Console?
- [ ] `/gamble_coins` funktioniert?
- [ ] Coins > 0?
- [ ] Shelf-Block platziert?
- [ ] Auf Shelf klicken funktioniert?
- [ ] UI öffnet sich?
- [ ] Spielen funktioniert?

Wenn alle ✓ = **Plugin ready to go!** 🎉

---

*Last Updated: 2025-11-18*
*Plugin Version: 1.0.1*
*Status: ✅ Production Ready*
