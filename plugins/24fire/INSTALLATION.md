# 24FIRE Plugin Installationsanleitung

## 📦 Voraussetzungen

- Bedrock Bridge vollständig installiert
- Node.js 14+ (falls lokal getestet)
- 24fire Account mit API-Key
- Administratorzugriff auf Minecraft Bedrock Server

## 🔧 Schritt-für-Schritt Installation

### 1. Plugin-Dateien kopieren

```bash
# Zielverzeichnis
D:\BB\bridgePlugins\24fire24fire\

# Diese Dateien müssen vorhanden sein:
24fire-bridge-complete.js     # Hauptplugin
config.json                    # Konfiguration
README.md                       # Dokumentation
INSTALLATION.md                # Diese Datei
```

### 2. API-Key beschaffen

#### Im 24fire Control Panel:

1. Melde dich an: https://manage.24fire.de
2. Gehe zu **Einstellungen** → **API-Keys**
3. Klicke **"API-Key erstellen"**
4. Kopiere den erzeugten Schlüssel
5. Speichere ihn **sicher** ab - wird nur einmal angezeigt!

#### Beispiel API-Key:
```
ptlc_ABC123XYZ789...
```

### 3. Konfiguration anpassen

Öffne `config.json`:

```json
{
  "api": {
    "baseUrl": "https://manage.24fire.de",
    "apiKey": "REDACTED",  // ← HIER eintragen!
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

**WICHTIG:** Ersetze `YOUR_API_KEY_HERE` mit deinem echten API-Key.

### 4. Plugin aktivieren

In deinem Bedrock Bridge Starter-Skript oder Loader:

```javascript
import { TwentyfourfirePlugin } from './bridgePlugins/24fire24fire/24fire-bridge-complete.js';

// Plugin initialisieren und starten
const plugin = new TwentyfourfirePlugin();
plugin.start();
```

### 5. Server starten

```bash
# Starte deinen Bedrock Bridge Server
node server.js
```

### 6. In-Game testen

1. Betrete den Minecraft-Server
2. Gib ein: `/24fire`
3. Das Menü sollte sich öffnen
4. Überprüfe die Konto-Informationen

## ✅ Verifizierungschecklist

- [ ] Plugin-Dateien im richtigen Verzeichnis
- [ ] config.json mit API-Key ausgefüllt
- [ ] API-Key ist gültig und aktiv
- [ ] Server kann https://manage.24fire.de erreichen
- [ ] Keine Firewall-Blockierung
- [ ] `/24fire` Befehl funktioniert
- [ ] Konto-Informationen werden angezeigt

## 🐛 Häufige Probleme

### Problem: "API_KEY muss gesetzt werden"
**Lösung:** Überprüfe `config.json` - API-Key muss dort eingetragen sein.

```json
// ✅ Richtig
"apiKey": "REDACTED"

// ❌ Falsch
"apiKey": ""
"apiKey": "REDACTED"
```

### Problem: "Keine Antwort vom Server"
**Lösungen:**
1. Überprüfe Internet-Verbindung
2. Firewall-Einstellungen für https://manage.24fire.de prüfen
3. VPN deaktivieren (falls verwendet)
4. Proxy-Einstellungen prüfen

### Problem: "401 Unauthorized"
**Lösung:** API-Key ist ungültig oder abgelaufen
- Erstelle neuen API-Key im Control Panel
- Aktualisiere `config.json`
- Starte den Server neu

### Problem: "Rate Limit erreicht"
**Lösung:** Zu viele API-Anfragen in zu kurzer Zeit
- Warte 1-2 Minuten
- Rate Limit in config.json erhöhen:
```json
{
  "rateLimit": {
    "limit": 240,        // ← erhöhen
    "window": 60000
  }
}
```

### Problem: Menü öffnet sich nicht
**Lösungen:**
1. Server-Konsole auf Fehler prüfen
2. Logging-Level auf DEBUG setzen:
```json
{
  "logging": {
    "level": "DEBUG"  // ← ändern
  }
}
```
3. Logs in der Konsole lesen
4. Plugin neu laden

### Problem: "Cannot find module 'Bedrock-Bridge'"
**Lösung:** Plugin richtig einbinden:
```javascript
// Pfad muss korrekt sein
import { bridge } from '../../Bedrock-Bridge/scripts/addons.js';
```

## 🚀 Erweiterte Konfiguration

### Nur bestimmte Features aktivieren

```json
{
  "features": {
    "accountManagement": true,
    "serviceManagement": true,
    "domainManagement": false,    // deaktiviert
    "kvmManagement": true,
    "backupManagement": true,
    "trafficMonitoring": true
  }
}
```

### Custom Befehl konfigurieren

```json
{
  "commands": {
    "menu": "mein24fire",      // statt "24fire"
    "cooldown": 5000           // 5 Sekunden
  }
}
```

### Logging anpassen

```json
{
  "logging": {
    "level": "DEBUG",
    "console": true,
    "file": true,
    "filePath": "./logs/24fire.log"
  }
}
```

## 📊 Performance-Optimierung

### Cache-Einstellungen

```json
{
  "cache": {
    "enabled": true,
    "ttl": 600000,     // 10 Minuten (länger = weniger Anfragen)
    "maxSize": 200
  }
}
```

### Rate Limit anpassen

```json
{
  "rateLimit": {
    "limit": 240,      // 240 Anfragen pro Minute
    "window": 60000
  }
}
```

## 🔐 Sicherheitsempfehlungen

### 1. API-Key schützen

```javascript
// ❌ NICHT im Quellcode speichern
const apiKey = 'REDACTED';

// ✅ Aus Konfigurationsdatei laden
import config from './config.json';
const apiKey = REDACTED
```

### 2. Umgebungsvariablen nutzen

```bash
# .env Datei
TWENTYFIRE_API_KEY=REDACTED

# In Node.js
require('dotenv').config();
const apiKey = REDACTED
```

### 3. IP-Whitelist (optional)

```json
{
  "security": {
    "ipWhitelist": ["192.168.1.0/24"],
    "ipBlacklist": []
  }
}
```

### 4. SSL-Validierung

```json
{
  "security": {
    "validateSSL": true  // Immer aktiviert lassen
  }
}
```

## 🧪 Test-Checkliste

### Funktionelle Tests

```
[ ] Befehl /24fire öffnet Menü
[ ] Account-Info wird angezeigt
[ ] Services werden aufgelistet
[ ] Domains werden aufgelistet
[ ] KVM-Server werden angezeigt
[ ] Backups können aufgelistet werden
[ ] Traffic-Info ist korrekt
[ ] Spendenseite-Daten anzeigen
[ ] Affiliate-Daten anzeigen
[ ] Cache funktioniert
[ ] Rate Limiting funktioniert
```

### Performance-Tests

```
[ ] Menü öffnet sich schnell (< 2s)
[ ] Keine Freeze/Lag beim Laden
[ ] Mehrere Menü-Öffnungen hintereinander
[ ] Cache funktioniert nach 5 Minuten
[ ] Viele API-Anfragen ohne Fehler
```

### Fehlerbehandlung-Tests

```
[ ] Falscher API-Key zeigt Fehler
[ ] Keine Internet-Verbindung zeigt Fehler
[ ] Ungültige Domain-ID zeigt Fehler
[ ] Sehr lange Anfragen-Zeiten werden gehandhabt
[ ] Rate Limit wird beachtet
```

## 📝 Logs analysieren

### DEBUG-Modus aktivieren

```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```

### Wichtige Log-Meldungen

```
[INFO] API Erfolg: /api/account          → Alles OK
[WARN] API Fehler bei Versuch 1: ...     → Retry wird versucht
[ERROR] API Fehler nach 3 Versuchen      → Fehler persistent
[DEBUG] Cache hit für /api/account       → Cache funktioniert
```

## 🔄 Update und Verwaltung

### Plugin aktualisieren

```bash
# Alte Dateien sichern
copy 24fire24fire\ 24fire24fire.backup\

# Neue Dateien kopieren
copy neue-files\ 24fire24fire\

# Test mit Debug-Logging
# Falls Probleme: aus Backup zurückstellen
```

### Plugin deaktivieren

```json
{
  "plugin": {
    "enabled": false  // Plugin wird nicht geladen
  }
}
```

### Plugin entfernen

```bash
# Verzeichnis löschen
rmdir /s 24fire24fire\

# Oder aus Plugin-Loader entfernen
```

## 💾 Datenbank-Backup

```json
{
  "integrations": {
    "database": true    // Optional für zukünftige Versionen
  }
}
```

## 📞 Support-Kontakt

Wenn alles nicht funktioniert:

1. Logs mit DEBUG-Level sammeln
2. config.json prüfen (API-Key verbergen!)
3. Netzwerk-Konnektivität testen
4. API-Key Gültigkeit prüfen
5. Support kontaktieren mit Logs

## ✨ Erfolgreiche Installation

Wenn du folgende Meldung siehst:

```
[INFO] 24fire Plugin initialisiert
[INFO] 24fire Plugin gestartet
[INFO] Verfügbare Befehle: /24fire
```

✅ **Installation erfolgreich!**

---

**Viel Erfolg bei der Installation! 🎉**
