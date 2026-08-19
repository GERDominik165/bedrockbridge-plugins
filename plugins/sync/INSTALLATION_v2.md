# 🚀 Cross-Server Sync v2.0 - Installationsanleitung

**Schnelle Installation des automatischen Welt-Synchronisations-Systems**

---

## ⚡ 5-Minuten Quick Install

### Schritt 1: Dateien vorbereiten

Stelle sicher, dass diese Datei im Ordner existiert:

```
D:\BB\bridgePlugins\sync\
├── crossServerSync_v2.js          ← Diese Datei
├── CONFIG_v2.md                   (optional)
├── README_v2.md                   (optional)
└── INSTALLATION_v2.md             (diese Datei)
```

### Schritt 2: BedrockBridge konfigurieren

Öffne deine **BedrockBridge Hauptkonfiguration** (meist `main.js` oder `index.js`) und füge diese Zeile hinzu:

```javascript
// Bei den anderen Imports:
import "./bridgePlugins/sync/crossServerSync_v2.js";
```

**Beispiel (vollständig):**
```javascript
import { bridge, database, consoleTools } from "./addons";
import "./bridgePlugins/afkcamera/afkcamera.js";
import "./bridgePlugins/saplingPlanter/saplingPlanter.js";
import "./bridgePlugins/sync/crossServerSync_v2.js";  // ← NEUE ZEILE
```

### Schritt 3: Server starten

Starte deinen Bedrock Server neu:

```bash
./start.sh
# oder über das UI
```

### Schritt 4: Überprüfen

Schaue in die **Server-Console** für diese Meldungen:

```
[CrossServerSyncV2 HH:MM:SS] ✅ CrossServerSyncV2 v2.0.0 initialisiert
[CrossServerSyncV2 HH:MM:SS] ✅ 2 Welten initialisiert
[CrossServerSyncV2 HH:MM:SS] ✅ Befehl /syncworld registriert
```

### Schritt 5: Test

Login mit Admin-Account und gib ein:

```
/syncworld
```

→ Admin-Panel sollte öffnen ✅

---

## 📋 Detaillierte Installation

### Was wird installiert?

#### Plugin-Datei
- `crossServerSync_v2.js` - 900+ Zeilen vollständig implementiertes System

#### Datenbanken (automatisch erstellt)
```
✅ crossSync_worlds_v2       - Welt-Konfiguration
✅ crossSync_players_v2      - Spieler-Sync-Daten
✅ crossSync_inventory_v2    - Inventar-Backups
✅ crossSync_xp_v2           - XP/Level-Backups
✅ crossSync_logs_v2         - System-Logs
✅ crossSync_connections_v2  - Welt-Verbindungen
```

#### Befehle
```
✅ /syncworld          - Admin-Panel öffnen
```

#### Features
```
✅ Automatische Inventar-Synchronisation (Login/Logout)
✅ Automatische XP-Synchronisation
✅ Inter-Plugin Communication via Database
✅ Periodische Hintergrund-Sync (alle 60 Sekunden)
✅ Welt-Verbindungs-Management
✅ Auto-Sync Konfiguration
```

---

## ⚙️ Basis-Konfiguration

Das System funktioniert **out-of-the-box** mit Standard-Einstellungen.

### Schnelle Konfiguration (optional)

Öffne `crossServerSync_v2.js` und ändere diese Werte:

#### Sync-Interval ändern

```javascript
// Zeile ~54
autoSyncInterval: 60,   // Sekunden zwischen automatischen Syncs
// Beispiele:
// 30 = schnell (kleine Server)
// 60 = normal (empfohlen)
// 300 = langsam (große Server)
```

#### Auto-Sync deaktivieren (falls nicht gewünscht)

```javascript
// Zeile ~53
autoSyncEnabled: true,  // → false zum Deaktivieren
```

#### Discord ausschalten

```javascript
// Zeile ~60
discordLogging: true,   // → false zum Deaktivieren
```

#### Server-Namen ändern

```javascript
// Zeile ~29-48
const DEFAULT_WORLDS = {
  world1: {
    name: "Hauptwelt",      // ← Ändern
    icon: "🏠",            // ← Emoji ändern (optional)
  },
  world2: {
    name: "Farmingwelt",    // ← Ändern
    icon: "🌾",            // ← Emoji ändern (optional)
  }
};
```

---

## 🔍 Nach Installation überprüfen

### Server-Log überprüfen

Suche nach diesen Zeilen im Server-Log:

```
╔════════════════════════════════════════════════════════════════════════════╗
║              🌐 CROSS-SERVER SYNC v2.0 - PRODUCTION READY                ║
╠════════════════════════════════════════════════════════════════════════════╣
║  ✅ Automatische Inventar-Synchronisation                                 ║
║  ✅ Automatische XP/Level-Synchronisation                                 ║
║  ✅ Inter-Plugin Communication System                                      ║
║  ✅ Welt-Verbindungs-Management                                           ║
║  ✅ Automatische Trigger (Login/Logout)                                   ║
║  ✅ Periodische Hintergrund-Synchronisation                               ║
║  ✅ Admin-Panel zur Verwaltung                                            ║
║                                                                            ║
║  Befehl: /syncworld - Welt-Verwaltungspanel öffnen (Admin)               ║
║                                                                            ║
║  ✅ VOLLAUTOMATISCHES SYNC-SYSTEM AKTIV                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Admin-Panel testen

1. Login mit Admin-Account
2. Gib `/syncworld` ein
3. Sollte dieses Menü erscheinen:

```
┌────────────────────────────────────────────────────┐
│    🌐 WELT-VERBINDUNGSVERWALTUNG                   │
├────────────────────────────────────────────────────┤
│  ➕ Neue Welt hinzufügen                           │
│  🔗 Welten verbinden                               │
│  ❌ Welten trennen                                 │
│  📊 Verbindungsstatus                              │
│  ⚙️ Auto-Sync Einstellungen                        │
│  🔙 Zurück                                         │
└────────────────────────────────────────────────────┘
```

### Spieler-Test

1. Spieler joinet Server
2. Gib Items ins Inventar
3. Spieler loggt aus
4. Spieler joinet anderen verbundenen Server
5. Inventar sollte da sein ✓

---

## 🛠️ Häufige Installations-Probleme

### Problem 1: "/syncworld Befehl existiert nicht"

**Ursache:** Plugin wurde nicht importiert oder nicht neu gestartet

**Lösung:**
```javascript
// 1. Überprüfe BedrockBridge main config:
import "./bridgePlugins/sync/crossServerSync_v2.js";

// 2. Server neu starten

// 3. Überprüfe Server-Log auf Fehler

// 4. Stelle sicher Plugin-Datei existiert:
D:\BB\bridgePlugins\sync\crossServerSync_v2.js
```

### Problem 2: "Plugin Fehler beim Laden"

**Ursache:** Syntax-Fehler in der Datei

**Lösung:**
```bash
# Node Syntax-Check:
node -c "D:\BB\bridgePlugins\sync\crossServerSync_v2.js"

# Sollte Kein Output = OK

# Falls Fehler:
# - Überprüfe die genaue Fehlermeldung
# - Vergleiche mit dem Original
# - Stelle sicher keine Zeilen gelöscht wurden
```

### Problem 3: "Datenbanken werden nicht erstellt"

**Ursache:** Database API nicht korrekt initialisiert

**Lösung:**
```javascript
// 1. Überprüfe dass database importiert wird:
import { bridge, bridgeDirect, database } from "../addons";

// 2. Überprüfe BedrockBridge addons.js:
database sollte exportiert sein

// 3. Server-Logs auf Fehler prüfen
```

### Problem 4: "Inventar wird nicht synchronisiert"

**Ursache:** syncOnLogin ist deaktiviert oder Welten nicht verbunden

**Lösung:**
```javascript
// 1. Überprüfe Einstellung:
config.syncOnLogin = true;

// 2. Admin-Panel überprüfen:
/syncworld → 📊 Verbindungsstatus
// → Welten sollten mit "Verbunden mit:" angezeigt werden

// 3. Test-Spieler mit Debug-Logs testen
```

### Problem 5: "Discord-Nachrichten kommen nicht an"

**Ursache:** bridgeDirect nicht konfiguriert oder discordLogging aus

**Lösung:**
```javascript
// 1. Discord in Config aktivieren:
config.discordLogging = true;

// 2. BedrockBridge Discord-Integration überprüfen
// - Webhook URL korrekt?
// - Discord-Permissions OK?

// 3. Falls nicht gewünscht, einfach ausschalten:
config.discordLogging = false;
```

---

## 📝 Nach Installation - Erste Schritte

### 1. Welten überprüfen

```
/syncworld → 📊 Verbindungsstatus
```

Standard-Setup zeigt:
```
🏠 Hauptwelt (world1)
   Status: Aktiv
   Auto-Sync: Aktiv
   Verbunden mit: 🌾 Farmingwelt

🌾 Farmingwelt (world2)
   Status: Aktiv
   Auto-Sync: Aktiv
   Verbunden mit: 🏠 Hauptwelt
```

### 2. Test-Spieler einladen

```
1. Spieler A joinet Hauptwelt
2. Gibt Items ins Inventar
3. Spieler A loggt aus
4. Spieler A joinet Farmingwelt
5. Items sollten da sein ✓
```

### 3. Auto-Sync Einstellungen überprüfen

```
/syncworld → ⚙️ Auto-Sync Einstellungen
```

Standard sollte sein:
```
✓ Inventar: An
✓ XP: An
✓ Beim Login synchen: An
✓ Beim Logout synchen: An
```

### 4. Logs monitoring

Schau im Server-Log nach Sync-Meldungen:

```
[CrossServerSyncV2] ✅ Player Spawn (Auto-Sync Trigger): Alex
[CrossServerSyncV2] ✅ Letztes Inventar gefunden: Alex
[CrossServerSyncV2] ✅ Inventar wiederhergestellt: Alex
```

---

## 🔐 Sicherheits-Checkliste

Vor Production-Betrieb:

```
☐ crossServerSync_v2.js hat keine Fehler
☐ Import in BedrockBridge eingebunden
☐ Server wurde neu gestartet
☐ /syncworld funktioniert
☐ Test mit Admin-Account erfolgreich
☐ Welten sind verbunden
☐ Auto-Sync ist aktiviert
☐ Inventar-Sync funktioniert
☐ XP-Sync funktioniert
☐ Discord konfiguriert (falls gewünscht)
☐ Logs werden erstellt
☐ Keine Fehler im Console-Output
```

---

## 📊 Performance-Empfehlungen

### Kleine Server (1-10 Spieler)

```javascript
autoSyncInterval: 30,
discordLogging: true,
syncOnLogin: true,
syncOnLogout: true
```

### Mittlere Server (10-50 Spieler)

```javascript
autoSyncInterval: 60,        // ← Standard
discordLogging: true,
syncOnLogin: true,
syncOnLogout: true
```

### Große Server (50+ Spieler)

```javascript
autoSyncInterval: 300,       // 5 Minuten
discordLogging: false,       // Reduziert Load
syncOnLogin: true,
syncOnLogout: true
```

---

## 🔄 Upgrade von v1.0 zu v2.0

Falls du v1.0 benutzt hast:

### Schritt 1: Backup machen

```bash
# Sicherung der alten Installation:
cp crossServerSync.js crossServerSync_v1.backup.js
```

### Schritt 2: Neue Version installieren

```bash
# Ersetze den alten Import mit dem neuen:
# ALT:  import "./bridgePlugins/sync/crossServerSync.js";
# NEU:  import "./bridgePlugins/sync/crossServerSync_v2.js";
```

### Schritt 3: Alte Datenbanken (optional)

```javascript
// Alte v1.0 Datenbanken:
// crossServerSync_players
// crossServerSync_inventory
// crossServerSync_transfers
// crossServerSync_logs

// Bleiben bestehen, aber v2.0 nutzt neue Namen:
// crossSync_worlds_v2
// crossSync_players_v2
// etc.
```

### Schritt 4: Testen

- ✅ Admin-Panel funktioniert?
- ✅ Inventar synchronisiert automatisch?
- ✅ Keine Fehler in Logs?

---

## 🚀 Nächste Schritte

1. **Weiterlesen:**
   - `README_v2.md` - Alle Features verstehen
   - `CONFIG_v2.md` - Erweiterte Optionen

2. **Testen:**
   - Mit mehreren Test-Spielern
   - Verschiedene Welten-Kombinationen
   - Unter Last testen

3. **Monitoring:**
   - Logs regelmäßig überprüfen
   - Performance beobachten
   - Auto-Sync Interval anpassen wenn nötig

4. **Production:**
   - Nach erfolgreichem Test starten
   - Admin-Team trainieren
   - Backup-System einrichten

---

## ✅ Installations-Überprüfung

Alles installiert wenn:

| Punkt | Status |
|-------|--------|
| Plugin-Datei existiert | ✅ |
| Import in BedrockBridge | ✅ |
| Server neu gestartet | ✅ |
| `/syncworld` funktioniert | ✅ |
| 6 Datenbanken erstellt | ✅ |
| Server-Log zeigt Initialisierung | ✅ |
| Keine Fehler im Log | ✅ |
| Test-Sync funktioniert | ✅ |

---

## 📞 Support & Hilfe

**Wenn etwas nicht funktioniert:**

1. **Überprüfe die Logs:**
   ```
   Server-Console nach Fehlern durchsuchen
   Suche nach: ERROR oder error
   ```

2. **Überprüfe die Konfiguration:**
   - `crossServerSync_v2.js` in Editor öffnen
   - Ganz oben die `DEFAULT_CONFIG` überprüfen

3. **Überprüfe die Datei-Pfade:**
   ```
   D:\BB\bridgePlugins\sync\crossServerSync_v2.js
   ```

4. **Nutze Admin-Panel zum Debuggen:**
   ```
   /syncworld → 📊 Verbindungsstatus
   Zeigt alle Welten & Verbindungen
   ```

5. **Lese die Dokumentation:**
   - `README_v2.md` - Übersicht
   - `CONFIG_v2.md` - Details
   - `TROUBLESHOOTING` - Probleme

---

## ✨ Glückwunsch!

Du hast erfolgreich das automatische Welt-Synchronisations-System installiert! 🎉

**Das System ist jetzt:**
- ✅ Vollautomatisch aktiv
- ✅ Alle Spieler synchronisiert
- ✅ Inter-Plugin Communication aktiv
- ✅ Production-Ready

Viel Erfolg mit deinem Server! 🚀

---

**Version:** 2.0.0
**Status:** Production Ready
**Installation Zeit:** ~5 Minuten
**Komplexität:** Minimal

*Automatische Welt-Synchronisation - Einfach funktionierend! ✨*
