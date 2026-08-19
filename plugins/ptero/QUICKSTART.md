# Pterodactyl Bedrock Bridge - Quick Start Guide

**Starten Sie in 5 Minuten!**

---

## 🚀 Installation in 3 Schritten

### 1. Plugin laden
```bash
# Kopiere die Datei in dein Bedrock-Server Plugin-Verzeichnis:
D:/BB/bridgePlugins/ptero/pterodactyl.bedrock.plugin.js
```

### 2. Im Spiel verbinden
```
/pman gui
```

### 3. API-Credentials eintragen
- Panel URL: `https://your-panel.com`
- API Key: Von deinem Pterodactyl Panel kopieren (Account → API Credentials)

**Fertig!** 🎉

---

## 🔑 API Key beschaffen

1. **Panel aufrufen**: `https://your-panel.com`
2. **Oben rechts**: Account → API Credentials
3. **"Create Token" klicken**
4. **Description**: "Bedrock Plugin"
5. **Permissions**: Alle wählen (oder minimal: Server, Files, Database, Backup)
6. **Copy Token** (beginnt mit `ptlc_`)

**WICHTIG**: Diesen Key sicher speichern! ⚠️

---

## 📋 Erste Schritte im Spiel

### Hauptmenü öffnen
```
/pman gui
```

### Server auswählen
1. Wähle deinen Server aus der Liste

### Server verwalten
- **Start**: Server starten
- **Stop**: Server herunterfahren
- **Restart**: Server neu starten
- **Konsole**: Live-Konsole öffnen
- **Dateien**: Dateien verwalten
- **Datenbanken**: Datenbanken verwalten
- **Backups**: Sicherungen verwalten

---

## 🎮 Häufige Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `/pman gui` | Hauptmenü öffnen |
| `/pman servers` | Alle Server anzeigen |
| `/pman start <id>` | Server starten |
| `/pman stop <id>` | Server stoppen |
| `/pman restart <id>` | Server neustarten |
| `/pman console <id>` | Konsole öffnen |
| `/pman status` | Status anzeigen |
| `/pman help` | Hilfe |

---

## ⚙️ Konfiguration anpassen

### Standard-Einstellungen
```javascript
// Timeout (ms)
TIMEOUT: 30000              // 30 Sekunden

// Retry
RETRY_ATTEMPTS: 3           // 3 Versuche
RETRY_DELAY: 1000          // 1 Sekunde zwischen Versuchen

// Monitoring
MONITORING_INTERVAL: 5000  // Alle 5 Sekunden updaten

// Cache
CACHE_TTL: 300000          // 5 Minuten

// Auto-Save
AUTO_SAVE: true            // Automatisch speichern
AUTO_SAVE_INTERVAL: 60000 // Jede Minute
```

### Performance-Presets

#### Für schnelle Server
```javascript
TIMEOUT: 15000
RETRY_ATTEMPTS: 2
MONITORING_INTERVAL: 2000
CACHE_TTL: 60000
```

#### Für stabile Server
```javascript
TIMEOUT: 30000
RETRY_ATTEMPTS: 3
MONITORING_INTERVAL: 5000
CACHE_TTL: 300000
```

#### Für langsame Netzwerke
```javascript
TIMEOUT: 60000
RETRY_ATTEMPTS: 5
MONITORING_INTERVAL: 15000
CACHE_TTL: 600000
```

---

## 🔧 Troubleshooting

### Problem: "Panel nicht erreichbar"
**Lösung:**
1. Panel URL überprüfen (`https://` erforderlich!)
2. API Key überprüfen
3. Firewall-Regeln prüfen
4. Timeout erhöhen

### Problem: "Timeout Error"
**Lösung:**
1. Erhöhe `TIMEOUT` (z.B. 60000)
2. Erhöhe `RETRY_ATTEMPTS` (z.B. 5)
3. Überprüfe Netzwerk-Verbindung

### Problem: "API Key ungültig"
**Lösung:**
1. Neuen Key von Panel kopieren
2. Key muss mit `ptlc_` beginnen
3. Permissions überprüfen

### Problem: "Cache Problem"
**Lösung:**
1. Cache leeren im Menü
2. `CACHE_TTL` reduzieren (z.B. 60000)
3. Server neustarten

---

## 📊 Was kann ich machen?

### ✅ Server Management
- [x] Start/Stop/Restart/Kill
- [x] Ressourcen überwachen (CPU, Memory, Disk)
- [x] Live-Konsole
- [x] Server-Befehle senden
- [x] Server umbenennen
- [x] Docker-Image ändern

### ✅ Dateiverwaltung
- [x] Dateien durchsuchen
- [x] Dateien löschen
- [x] Dateien erstellen
- [x] Archivieren/Entpacken
- [x] Permissions (chmod)
- [x] Upload/Download

### ✅ Datenbanken
- [x] Datenbanken erstellen
- [x] Datenbanken löschen
- [x] Passwort erneuern
- [x] Status anzeigen

### ✅ Backups
- [x] Backups erstellen
- [x] Backups wiederherstellen
- [x] Backups löschen
- [x] Backups sperren
- [x] Download-Links

### ✅ Überwachung
- [x] Echtzeit-Stats
- [x] History-Tracking
- [x] Performance-Alerts
- [x] Trends analysieren

---

## 🎓 Nächste Schritte

1. **Dokumentation lesen**: `README.md` für Details
2. **API-Referenz**: `API_REFERENCE.md` für alle Endpoints
3. **Erweiterte Konfiguration**: `ADVANCED_SETUP.md`
4. **Fehlerbehandlung**: `TROUBLESHOOTING.md`

---

## 💡 Tipps & Tricks

### Tipp 1: Mehrere Server
- Erstelle Presets für verschiedene Server
- Schnell zwischen ihnen wechseln

### Tipp 2: Performance optimieren
- Cache-TTL erhöhen für häufige Anfragen
- Monitoring-Interval reduzieren bei Bedarf
- Unnötige Logs deaktivieren

### Tipp 3: Automatisierung
- Nutze Schedules für automatische Backups
- Automatische Power-Aktionen
- Task-Automation

### Tipp 4: Monitoring
- Alerts für hohe CPU/Memory setzen
- History tracking aktivieren
- Performance-Trends analysieren

---

## 🆘 Hilfe bekommen

- **Logs anzeigen**: `/pman logs`
- **Debug-Mode**: Aktiviere im Menü für detaillierte Logs
- **Konsole**: `/pman console <server-id>` für Live-Ausgabe
- **Test Verbindung**: Über Menu "API einstellungen" → "Test"

---

## ✅ Checkliste

- [ ] Plugin installiert
- [ ] Panel URL eingetragen
- [ ] API Key kopiert
- [ ] Test Verbindung erfolgreich
- [ ] Erster Server angezeigt
- [ ] Server-Control funktioniert
- [ ] Dateien sichtbar
- [ ] Datenbanken einsehbar
- [ ] Backups möglich
- [ ] Monitoring aktiv

---

**Version**: 3.0.0
**Status**: Production Ready ✅
**Letzte Aktualisierung**: 2024

**Viel Erfolg!** 🚀✨
