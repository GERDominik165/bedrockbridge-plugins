# Pterodactyl Bedrock Bridge - Quick Start Guide

## ⚡ 5-Minuten Setup

### Schritt 1: Konfiguration
```bash
# config.json bearbeiten:
{
  "pterodactyl": {
    "panelUrl": "https://dein-panel.de/",
    "apiKey": "REDACTED"
  }
}
```

### Schritt 2: Build
```bash
npm install
npm run build
```

### Schritt 3: Test
```bash
# Im Minecraft Chat:
/bedrockbridge help
```

**Fertig!** 🎉

---

## 🎮 Commands

```
/bedrockbridge gui         → Hauptmenü öffnen
/bedrockbridge servers     → Server-Liste anzeigen
/bedrockbridge status      → Server-Status
/bedrockbridge start <id>  → Server starten
/bedrockbridge stop <id>   → Server stoppen
/bedrockbridge console     → Konsole öffnen
/bedrockbridge help        → Hilfe anzeigen
```

---

## 🔍 Troubleshooting Quick Fix

### Problem: "401 Unauthorized"
```json
✓ API Key überprüfen in config.json
✓ API Key regenerieren vom Panel
✓ Server neustarten
```

### Problem: "Connection Timeout"
```json
✓ Panel-URL überprüfen (HTTPS!)
✓ Firewall Einstellungen überprüfen
✓ timeout erhöhen: "timeout": 60
```

### Problem: "Commands funktionieren nicht"
```json
✓ Befehl mit "bedrockbridge" starten
✓ "/bedrockbridge help" testen
✓ debugMode: true setzen für Logs
```

---

## 📊 Features

| Feature | Status | Command |
|---------|--------|---------|
| Server verwalten | ✅ | `/bedrockbridge servers` |
| Power Control | ✅ | `/bedrockbridge start <id>` |
| Konsole | ✅ | `/bedrockbridge console` |
| Datenbanken | ✅ | `/bedrockbridge gui` |
| Sicherungen | ✅ | `/bedrockbridge gui` |
| Dateien | ✅ | `/bedrockbridge gui` |
| Überwachung | ✅ | `/bedrockbridge gui` |

---

## 🚀 Produktive Einstellungen

```json
{
  "pterodactyl": {
    "panelUrl": "https://your-panel.com/",
    "apiKey": "REDACTED",
    "timeout": 30,
    "retryAttempts": 3
  },
  "bedrock": {
    "debugMode": false,
    "monitoringEnabled": true
  },
  "cache": {
    "enabled": true,
    "defaultTTL": 300000
  }
}
```

---

**Für detaillierte Anleitung:** Siehe `SETUP_GUIDE.md`
**Bei Problemen:** Siehe `TROUBLESHOOTING_GUIDE.md`

---

**Version:** 1.0.0 | **Status:** Production Ready ✅
