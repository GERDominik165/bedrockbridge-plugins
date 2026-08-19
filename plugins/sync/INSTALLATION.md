# 🚀 Cross-Server Sync Plugin - Installationsanleitung

## ⚡ Schnellinstallation (5 Minuten)

### Schritt 1: Dateien überprüfen
Stelle sicher dass alle 3 Dateien vorhanden sind:
```
D:\BB\bridgePlugins\sync\
├── crossServerSync.js
├── CONFIG.md
├── README.md
└── INSTALLATION.md
```

### Schritt 2: BedrockBridge konfigurieren
Öffne deine **BedrockBridge-Hauptkonfiguration** und füge das Import hinzu:

```javascript
// Am Anfang der Datei mit den anderen Imports:
import "./bridgePlugins/sync/crossServerSync.js";
```

### Schritt 3: Server neu starten
Starte deinen Bedrock Server neu:
```bash
# Je nach deinem Setup
./start_server.sh
# oder über das Bedrock Launcher UI
```

### Schritt 4: Teste das Plugin
Sobald der Server online ist:
1. Joine mit einem Spieler-Account
2. Gib ein: `/sync`
3. Das Menü sollte erscheinen ✅

## 📋 Was wird installiert?

### Dateien
- ✅ `crossServerSync.js` - Das Hauptplugin (1200+ Zeilen)
- ✅ Automatische Datenbanken werden beim Start erstellt (4 Tabellen)
- ✅ Auto-Save System aktiviert

### Befehle
- ✅ `/sync` - Für alle Spieler
- ✅ `/syncadmin` - Für Admins

### Menü-Systeme
- ✅ Hauptmenü mit Server-Wahl
- ✅ Transfer-Bestätigung
- ✅ Statistiken-Anzeige
- ✅ Admin-Tools-Panel

## ⚙️ Konfiguration anpassen

Öffne `crossServerSync.js` und ändere diese Werte am Anfang:

### Server-Namen ändern
```javascript
SERVER_CONFIG = {
  mainServer: {
    name: "Deine Hauptwelt",  // ← Hier ändern
    id: "main",
    icon: "🏠"
  },
  farmingServer: {
    name: "Deine Farmingwelt",  // ← Hier ändern
    id: "farming",
    icon: "🌾"
  }
};
```

### Transfer-Cooldown ändern
```javascript
DEFAULT_CONFIG = {
  transferCooldown: 300,  // ← 300 Sekunden = 5 Minuten
  // Bei Bedarf ändern: 1800 = 30 Minuten, 60 = 1 Minute
};
```

### Whitelist aktivieren (nur bestimmte Spieler)
```javascript
DEFAULT_CONFIG = {
  whitelist: ["PlayerName1", "PlayerName2"],  // ← Spieler eintragen
  // Leer lassen = alle Spieler dürfen
};
```

### Blacklist aktivieren (Spieler blockieren)
```javascript
DEFAULT_CONFIG = {
  blacklist: ["SpamPlayer", "Hacker"],  // ← Spieler eintragen
};
```

## 🔍 Überprüfung nach Installation

### Im Server-Log solltest du sehen:
```
[CrossServerSync ...] ✅ CrossServerSync v1.0.0 initialisiert
[CrossServerSync ...] ✅ Hauptserver: Deine Hauptwelt
[CrossServerSync ...] ✅ Farmingserver: Deine Farmingwelt
[CrossServerSync ...] ✅ Discord-Logging: Aktiv
```

### Spieler sollten sehen:
```
💡 Tipp: Nutze /sync um deinen Server zu wechseln!
```

### Admin sollte testen mit:
```
/syncadmin
```
→ Admin-Menü sollte erscheinen

## 🐛 Häufige Installationsprobleme

### Problem: "/sync Befehl existiert nicht"
**Lösung:**
1. Überprüfe ob `import "./bridgePlugins/sync/crossServerSync.js";` in der Hauptkonfiguration ist
2. Server neu starten
3. Überprüfe Server-Logs auf Fehler

### Problem: "Fehler beim Laden des Plugins"
**Lösung:**
1. Überprüfe ob `crossServerSync.js` im korrekten Ordner ist:
   ```
   D:\BB\bridgePlugins\sync\crossServerSync.js
   ```
2. Überprüfe ob die Syntax gültig ist:
   ```bash
   node -c "D:\BB\bridgePlugins\sync\crossServerSync.js"
   ```
   Sollte `✅ SYNTAX GÜLTIG` anzeigen

### Problem: "Datenbanken werden nicht erstellt"
**Lösung:**
1. Stelle sicher dass `database` vom BedrockBridge `addons.js` importiert wird
2. Überprüfe ob der Ordner `D:\BB\bridgePlugins\sync\` existiert und schreibbar ist
3. Überprüfe BedrockBridge-Logs

### Problem: "Discord-Benachrichtigungen kommen nicht an"
**Lösung:**
1. Überprüfe ob `discordLogging: true` in der Konfiguration ist
2. Überprüfe ob `bridgeDirect` korrekt konfiguriert ist
3. In der Konfiguration setzen: `discordLogging: false` um Discord auszuschalten

## 📝 Erste Schritte nach Installation

### 1. Spieler willkommen heißen
Gib diesen Befehl im Chat ein:
```
/say 🌐 Cross-Server Sync ist aktiv! Nutze /sync um zwischen Welten zu wechseln!
```

### 2. Admin-Basiseinstellungen
Als Admin: `/syncadmin` → System-Status überprüfen

### 3. Whitelist einrichten (optional)
Wenn nur bestimmte Spieler transferieren dürfen:
1. Öffne `crossServerSync.js`
2. Ändere `whitelist: []` zu `whitelist: ["AdminName", "VIPName"]`
3. Server neu starten

### 4. Discord-Integration testen
Mach einen Transfer und überprüfe ob die Nachricht auf Discord ankommt

## 🔐 Sicherheits-Checkliste

Vor dem Produktivbetrieb:
- [ ] Whitelist eingerichtet (falls gewünscht)
- [ ] Discord-Integration getestet
- [ ] Transfer-Cooldown angepasst
- [ ] Admin-Passwörter sicher
- [ ] Backups geplant
- [ ] Logs überprüft

## 📞 Support & Kontakt

**Bei Problemen:**
1. Überprüfe die Logs: `/syncadmin` → Logs anzeigen
2. Lese die CONFIG.md durch
3. Lese die README.md durch
4. Überprüfe dieses Dokument

**Häufige Ressourcen:**
- 📖 **CONFIG.md** - Detaillierte Konfiguration
- 📖 **README.md** - Übersicht & Befehle
- 📖 **INSTALLATION.md** - Diese Datei
- 🎮 **In-Game Hilfe** - `/sync help`

## ✅ Installation erfolgreich?

Wenn folgendes funktioniert, ist die Installation erfolgreich:
1. ✅ `/sync` öffnet das Menü
2. ✅ `/sync help` zeigt die Anleitung
3. ✅ `/syncadmin` öffnet Admin-Tools (für Admins)
4. ✅ Transfer ist möglich
5. ✅ Discord erhält Benachrichtigungen (wenn aktiviert)

---

**Glückwunsch! Das Cross-Server Sync Plugin ist installiert und einsatzbereit! 🎉**

Bei Fragen: `/sync help` oder wende dich an einen Admin.
