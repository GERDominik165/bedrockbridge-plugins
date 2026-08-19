# 📦 LandClaim Premium - Installationsanleitung

**Bedrock 1.21.121 | BedrockBridge Edition**

---

## ⚡ Quick Start (5 Minuten)

### 1. Dateien kopieren
```bash
D:\BB\bridgePlugins\lc\
├── main.js           ✓ Kern-Plugin
├── config.js         ✓ Einstellungen
├── admin.js          ✓ Admin-Tools
├── README.md         ✓ Dokumentation
└── INSTALLATION.md   ✓ Diese Datei
```

### 2. Plugin aktivieren
**Datei**: `D:\BB\bridgePlugins\index.js`

Füge diese Zeile hinzu:
```javascript
import "./lc/main"
```

Sollte ungefähr so aussehen:
```javascript
import "./external"
import "./lc/main"           // ← Neu hinzugefügt

// Andere Plugins...
```

### 3. Server starten
- BedrockBridge neu starten
- Auf Fehlermeldungen prüfen
- Erfolgsmeldung: `🏰 LandClaim Premium Plugin v2.0.0 loaded!`

### 4. Testen
Im Spiel schreiben:
```
/lc
```

✓ Menü sollte sich öffnen!

---

## 📁 Dateien erklären

| Datei | Zweck | Größe |
|-------|--------|-------|
| **main.js** | Kern-System: Claims, GUI, Schutz | ~25 KB |
| **config.js** | Alle Einstellungen mit Vorsets | ~12 KB |
| **admin.js** | Admin-Tools & Verwaltung | ~20 KB |
| **README.md** | Vollständige Dokumentation | ~30 KB |
| **INSTALLATION.md** | Diese Anleitung | ~10 KB |

**Gesamt**: ~97 KB

---

## 🔧 Detaillierte Installationsschritte

### Schritt 1: Plugin-Ordner erstellen

```bash
# Windows Explorer öffnen
# Zu diesem Pfad navigieren:
D:\BB\bridgePlugins\

# Neuen Ordner erstellen (falls nicht vorhanden):
Rechtsklick → Neuer Ordner → "lc"
```

### Schritt 2: Dateien platzieren

**Option A: Manuell kopieren**
1. Alle 5 Dateien in `D:\BB\bridgePlugins\lc\` kopieren
2. Datei-Rechte prüfen (Read/Write)

**Option B: Download**
- GitHub: https://github.com/InnateAlpaca/BedrockBridge
- Ordner: `bridge_plugins/lc/`
- Alle Dateien herunterladen

### Schritt 3: index.js bearbeiten

```javascript
// Datei: D:\BB\bridgePlugins\index.js

// Oben in die Datei schreiben:
import "./lc/main"

// Sollte so aussehen:
/*
 * BedrockBridge-Plugins
 * ...
 */

import "./external"
import "./lc/main"              // ← Neu hier

// Andere Plugins...
// import "./basicNicerChat"
// import "./basicCustomCommands"
```

**WICHTIG**:
- Neue Zeile nach `import "./external"`
- Keine Fehler im Code (z.B. keine `import` am Ende von index.js)

### Schritt 4: Server-Test

```bash
# Console in BedrockBridge öffnen
# Fehlermeldungen suchen

# Erfolgreich wenn:
✓ LandClaim Plugin initialized successfully
✓ 🏰 LandClaim Premium Plugin v2.0.0 loaded!

# Fehler wenn:
✗ LandClaim Plugin Error: ...
```

### Schritt 5: Ingame testen

```
/lc          # Menü öffnen
/claim       # Schnell-Claim
/claiminfo   # Info anzeigen
```

---

## ⚙️ Konfiguration nach Installation

### config.js anpassen

**Datei**: `D:\BB\bridgePlugins\lc\config.js`

#### Beispiel 1: Kosten ändern
```javascript
// Zeile ~20
economy: {
    costPerChunk: 100,        // Standard: 100
    // Ändere auf:
    costPerChunk: 50,         // Billiger
    // oder:
    costPerChunk: 250,        // Teurer
}
```

#### Beispiel 2: Max Claims erhöhen
```javascript
// Zeile ~23
maxChunksPerPlayer: 50,       // Standard: 50
// Ändere auf:
maxChunksPerPlayer: 100,      // Mehr Claims erlauben
```

#### Beispiel 3: Wirtschaft ausschalten
```javascript
// Zeile ~30
enableEconomy: true,          // Standard: aktiviert
// Ändere auf:
enableEconomy: false,         // Claims kostenlos
```

#### Beispiel 4: Vorgesetzte anwenden
```javascript
// Am Ende von config.js:
applyPreset("SURVIVAL");  // Survival-Server Einstellungen

// Verfügbare Vorsets:
// SANDBOX     - Frei spielen
// SURVIVAL    - Balanced
// PVP         - Wenig Schutz
// HARDCORE    - Max Schutz
// COMMUNITY   - Zusammenarbeit
```

---

## 🎮 Erste Schritte nach Installation

### 1. Spieler hinzufügen
```
/tag @s add member    # Als normaler Spieler
/tag @s add admin     # Als Admin
```

### 2. Plugin testen
```
/lc                   # Hauptmenü
```

### 3. Erstes Claim erstellen
```
/claim               # Schnell-Claim (1×1 Chunk)
# oder via Menu: /lc → ➕ Neuen Claim erstellen
```

### 4. Admin-Panel öffnen
```
/lc admin           # Admin-Panel (nur für Admins)
```

---

## 🐛 Fehlerbehebung

### Problem: Plugin lädt nicht
```
Fehler: "LandClaim Plugin Error"
```

**Lösung**:
1. Überprüfe `index.js` auf Syntax-Fehler
2. Prüfe ob Zeile `import "./lc/main"` existiert
3. Keine weiteren Import-Fehler in `main.js`?
4. Server Logs durchsuchen
5. Console erneut öffnen mit `F3 + ESC`

### Problem: Menü öffnet nicht
```
Ingame: /lc → Nichts passiert
```

**Lösung**:
1. Chat schließen (`ESC`)
2. 2-5 Sekunden warten
3. `/lc` erneut versuchen
4. Server-Neustart
5. Bedrock-Neustart

### Problem: Claims funktionieren nicht
```
Ingame: /claim → Fehler "max_claims_reached"
```

**Lösung**:
1. `maxChunksPerPlayer` in `config.js` erhöhen (Zeile ~23)
2. Alte Claims mit `/unclaim` löschen
3. Admin-Override: Claims löschen mit Admin-Panel

### Problem: Daten gehen verloren
```
Nach Neustart: Alle Claims weg!
```

**Lösung**:
1. Überprüfe `bridge.database` Verbindung
2. Prüfe ob `landclaim_territories` gespeichert ist
3. Manuell speichern: Admin-Panel → System Tools → Speichern
4. Backup-Datei prüfen (falls vorhanden)

### Problem: Berechtigungen funktionieren nicht
```
Member kann bauen obwohl canBuild: false
```

**Lösung**:
1. Prüfe `config.js` - Permissions Section
2. Territory-Einstellungen überprüfen
3. Cache leeren: Admin-Panel → System Tools → Cache leeren
4. Server neustarten

---

## 📊 Performance & Skalierung

### Für kleine Server (bis 20 Spieler)
```javascript
// config.js
economy.maxChunksPerPlayer = 50
protection.globalGriefProtection = true
features.enableVisualizer = true
```

### Für große Server (20+ Spieler)
```javascript
// config.js
economy.maxChunksPerPlayer = 30    // Limiterung
protection.preventBlockPlace = true
features.enableVisualizer = false  // Performance
admin.autoSaveInterval = 600       // Öfter speichern
```

### Speicher-Optimierung
```javascript
// config.js
database.enableBackup = false      // Backups ausschalten
player.maxClaimsPerPlayer = 20     // Weniger Claims
performance.enableCache = false    // Falls Probleme
```

---

## 🔗 Integration mit anderen Plugins

### Mit Economy-Plugin
```javascript
// In main.js (wenn Economy existiert)
const money = bridge.database.get(`player_money_${player.name}`);
if (money >= costPerChunk * radius) {
    // Geld abziehen
    bridge.database.set(`player_money_${player.name}`, money - cost);
}
```

### Mit Permission-Plugin
```javascript
// In config.js
admin.adminTag = "admin"           // Admin-Tag anpassen
admin.moderatorTag = "moderator"   # Moderator-Tag
```

### Mit Chat-Plugin
```javascript
// In main.js
bridge.events.chatUpStreamEvent.subscribe((e) => {
    // Claims können in Chat erwähnt werden
    if (e.message.includes("claim")) {
        // Nachricht anpassen
    }
});
```

---

## 📞 Support & Hilfe

### Fehlermeldung gefunden?
1. **Console-Output kopieren** (F3 + ESC)
2. **Im Discord melden**: [Link]
3. **Auf GitHub posten**: Issues-Sektion

### Fragen?
- **README.md** - Grundlagen & Features
- **config.js** - Alle Optionen mit Erklärung
- **INSTALLATION.md** - Diese Anleitung
- **Discord** - Community Hilfe

### Dokumentation
```
D:\BB\bridgePlugins\lc\README.md      - Vollständig
D:\BB\bridgePlugins\lc\config.js      - Code-Kommentare
D:\BB\bridgePlugins\lc\admin.js       - Admin-Funktionen
D:\BB\bridgePlugins\lc\main.js        - Quellcode
```

---

## ✅ Installations-Checkliste

- [ ] Plugin-Ordner erstellt: `D:\BB\bridgePlugins\lc\`
- [ ] Alle 5 Dateien kopiert
- [ ] `index.js` bearbeitet mit `import "./lc/main"`
- [ ] Server neu gestartet
- [ ] Konsole auf Fehler geprüft
- [ ] `/lc` Befehl getestet
- [ ] Erstes Claim erstellt mit `/claim`
- [ ] Admin-Panel mit `/lc admin` getestet
- [ ] `config.js` angepasst (falls nötig)
- [ ] Berechtigungen mit `/tag` gesetzt

---

## 🚀 Du bist fertig!

Das Plugin ist jetzt vollständig installiert und einsatzbereit.

Viel Spaß mit deinem Premium LandClaim System! 🏰

---

**Version**: 2.0.0
**Bedrock**: 1.21.121+
**BedrockBridge**: 1.0.2+
**Letztes Update**: 2025-11-13
