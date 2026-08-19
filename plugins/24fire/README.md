# 24FIRE Bedrock Bridge v2.0.0

Vollständige Integration der **24fire REST-API v2** für Bedrock Bridge mit vollständiger Account-, Service-, Domain-, KVM- und Monitoring-Verwaltung.

## 📋 Features

### Konto-Management
- ✅ Konto-Informationen abrufen
- ✅ Guthaben anzeigen
- ✅ Premium-Status anzeigen
- ✅ Rechnungsadresse verwalten
- ✅ Registrierungsdatum und Kontaktdaten

### Service-Verwaltung
- ✅ Alle aktiven Dienste anzeigen (WEBSPACE, KVM, DOMAIN)
- ✅ Service-Details und Verlängerungsinformationen
- ✅ Dienst-Typen und Preise
- ✅ Auto-Renew Status

### Domain-Verwaltung
- ✅ Domain-Liste abrufen
- ✅ Domain-Informationen und Status
- ✅ DNS-Einträge anzeigen
- ✅ DNS-Einträge hinzufügen (mit 24fire+)
- ✅ DNS-Einträge bearbeiten (mit 24fire+)
- ✅ DNS-Einträge löschen (mit 24fire+)
- ✅ Nameserver-Konfiguration
- ✅ AuthCode und WHOIS-Daten

### KVM-Server Verwaltung
- ✅ Server-Liste und Status
- ✅ Server-Konfiguration (CPU, RAM, Speicher)
- ✅ Server starten/stoppen/neustarten
- ✅ Server-Informationen (IP, OS, Uptime)

### Backup-Verwaltung
- ✅ Backup-Liste abrufen
- ✅ Neue Backups erstellen (mit 24fire+)
- ✅ Backup-Status abfragen
- ✅ Backup wiederherstellen (mit 24fire+)
- ✅ Restore-Status überwachen
- ✅ Backups löschen (mit 24fire+)

### Traffic & Monitoring
- ✅ Aktuellen Traffic abrufen (Ein/Aus)
- ✅ Traffic-Logs
- ✅ CPU, RAM, Ping Überwachung
- ✅ Verfügbarkeitsstatistiken
- ✅ Ausfallzeiten und Incidents
- ✅ VM-Status und Uptime

### DDoS-Schutz
- ✅ DDoS-Einstellungen abrufen (Layer 4 & 7)
- ✅ DDoS-Einstellungen ändern (mit 24fire+)
- ✅ IP-Adressen verwalten

### Webspace-Verwaltung
- ✅ Webspace-Informationen
- ✅ Ressourcen anzeigen
- ✅ Zugriffsdaten
- ✅ Speicher und Traffic-Limits

### Finanz & Community
- ✅ Spendenseite Daten
- ✅ Spendenübersicht und Pakete
- ✅ Affiliate-System Integration
- ✅ Verdienste und Leads tracken
- ✅ Referral-Link anzeigen

## 🚀 Schnellstart

### 1. Installation

```bash
# 1. Plugin ins Verzeichnis kopieren
cp 24fire-bridge-complete.js D:\BB\bridgePlugins\24fire24fire\

# 2. config.json bearbeiten
```

### 2. Konfiguration

**config.json bearbeiten und API-Key eintragen:**

```json
{
  "api": {
    "baseUrl": "https://manage.24fire.de",
    "apiKey": "your-24fire-api-key-here"
  }
}
```

### 3. API-Key erstellen

1. Logge dich im 24fire Control Panel ein
2. Gehe zu "Einstellungen" → "API-Keys"
3. Klicke "API-Key erstellen"
4. Kopiere den API-Key
5. Trage ihn in die `config.json` ein

### 4. Plugin laden

Das Plugin wird automatisch beim Start geladen und initialisiert.

## 📖 Verwendung

### In-Game Befehle

```minecraft
/24fire
```

Öffnet das Hauptmenü mit allen verfügbaren Funktionen.

### Menü-Navigation

```
🎮 24FIRE Verwaltung
├─ 👤 Konto-Info
├─ ⚙️ Dienste
├─ 🌐 Domains
├─ 💻 KVM-Server
├─ 💝 Spenden
├─ 🤝 Affiliate
└─ 🔃 Aktualisieren
```

## 🛠️ API-Implementierung

### Account Endpoints

```javascript
// Konto-Details abrufen
await api.getAccountDetails();
// Gibt: { id, firstname, lastname, email, balance, is_plus_user, ... }

// Alle aktiven Dienste abrufen
await api.getAccountServices();
// Gibt: { services: { WEBSPACE: [], KVM: [], DOMAIN: [] } }

// Spendenseite Daten
await api.getAccountDonations();
// Gibt: { information: {...}, bundles: [...], donations: [...] }

// Affiliate-Daten
await api.getAccountAffiliate();
// Gibt: { information: {...}, summary: {...}, leads: [...] }
```

### Domain Endpoints

```javascript
// Domain-Informationen
await api.getDomainInfo(internalId);
// Gibt: { domain: {...}, handle: {...}, nameserver: {...}, timings: {...} }

// DNS-Einträge abrufen
await api.getDomainDNS(internalId);
// Gibt: [ { record_id, type, name, data, ttl }, ... ]

// DNS-Eintrag hinzufügen (24fire+ erforderlich)
await api.addDNSRecord(internalId, 'A', 'subdomain', '192.168.1.1');

// DNS-Eintrag bearbeiten (24fire+ erforderlich)
await api.editDNSRecord(internalId, recordId, 'A', 'subdomain', '192.168.1.2');

// DNS-Eintrag löschen (24fire+ erforderlich)
await api.deleteDNSRecord(internalId, recordId);
```

### KVM Server Endpoints

```javascript
// Server-Status abrufen
await api.getKVMStatus(internalId);
// Gibt: { status, uptime, task, usage: { cpu, mem, nvme_storage } }

// Server-Konfiguration
await api.getKVMConfig(internalId);
// Gibt: { identifier, hostsystem, config, max_config, abuse_status }

// Server-Power steuern
await api.setKVMPower(internalId, 'start|stop|restart');

// Backups abrufen
await api.getKVMBackups(internalId);
// Gibt: [ { backup_id, backup_os, size, created, status }, ... ]

// Neues Backup erstellen (24fire+ erforderlich)
await api.createKVMBackup(internalId, 'Backup-Beschreibung');

// Backup wiederherstellen (24fire+ erforderlich)
await api.restoreBackup(internalId, backupId);

// Backup löschen (24fire+ erforderlich)
await api.deleteBackup(internalId, backupId);
```

### Traffic & Monitoring

```javascript
// Aktuellen Traffic abrufen
await api.getKVMTraffic(internalId);
// Gibt: { month, usage: { total, in, out }, limit: {...} }

// Traffic-Logs
await api.getKVMTrafficLog(internalId);
// Gibt: [ { date, in, out }, ... ]

// Monitoring-Messungen (24fire+ erforderlich)
await api.getKVMMonitoring(internalId);
// Gibt: { timings: [ { date, cpu, mem, ping }, ... ] }

// Ausfälle/Incidents (24fire+ erforderlich)
await api.getKVMIncidents(internalId);
// Gibt: { statistic: {...}, incidences: [...] }
```

### DDoS-Schutz

```javascript
// DDoS-Einstellungen abrufen
await api.getKVMDDoSSettings(internalId);
// Gibt: { "IP": { layer4: "dynamic|permanent|off", layer7: "on|off" } }

// DDoS-Einstellungen ändern (24fire+ erforderlich)
await api.setKVMDDoSSettings(internalId, 'permanent', 'on', '192.168.1.1');
```

## ⚙️ Erweiterte Konfiguration

### Caching

```json
{
  "cache": {
    "enabled": true,
    "ttl": 300000,
    "maxSize": 100
  }
}
```

- `enabled`: Cache aktivieren/deaktivieren
- `ttl`: Time-To-Live in Millisekunden (5 Min Standard)
- `maxSize`: Maximale Cache-Einträge

### Rate Limiting

```json
{
  "rateLimit": {
    "enabled": true,
    "limit": 120,
    "window": 60000
  }
}
```

- `limit`: Max. Anfragen pro Fenster (120 pro Min)
- `window`: Zeitfenster in Millisekunden

### Logging

```json
{
  "logging": {
    "level": "INFO",
    "console": true,
    "file": false
  }
}
```

- Level: `DEBUG`, `INFO`, `WARN`, `ERROR`
- Console: Ausgabe in Server-Konsole
- File: Optionale Protokolldatei

## 📊 Struktur

```
24fire24fire/
├── 24fire-bridge-complete.js    # Hauptplugin
├── config.json                   # Konfiguration
├── README.md                      # Diese Datei
├── ADVANCED.md                    # Erweiterte Konfiguration
└── API_REFERENCE.md               # API-Referenz
```

## 🔐 Sicherheit

### API-Key Sicherheit

1. **Niemals im Quellcode speichern** - Nutze `config.json`
2. **Umgebungsvariablen verwenden** (optional)
3. **SSL-Validierung aktiviert** (Standard)
4. **Rate Limiting aktiviert** (Schutz vor Brute-Force)

### Best Practices

```javascript
// ✅ Richtig
const config = require('./config.json');
const api = new TwentyfourfireAPI(config.api.apiKey);

// ❌ Falsch
const api = new TwentyfourfireAPI('ptlc_ABC123...');
```

## 📝 Beispiele

### Alle Dienste auflisten

```javascript
const services = await api.getAccountServices();

for (const [type, items] of Object.entries(services.services)) {
  console.log(`${type}:`);
  items.forEach(service => {
    console.log(`  - ${service.name}`);
  });
}
```

### Server-Status überwachen

```javascript
async function monitorServer(serverId) {
  const status = await api.getKVMStatus(serverId);
  console.log(`Status: ${status.status}`);
  console.log(`Uptime: ${status.uptime} Minuten`);
  console.log(`CPU: ${status.usage.cpu.data}%`);
  console.log(`RAM: ${status.usage.mem.data}MB`);
}
```

### Backup erstellen und überwachen

```javascript
async function createAndMonitorBackup(serverId, description) {
  // Backup erstellen
  const backup = await api.createKVMBackup(serverId, description);
  console.log(`Backup erstellt: ${backup.backup_id}`);

  // Status alle 10 Sekunden prüfen
  while (true) {
    const status = await api.getBackupStatus(serverId, backup.backup_id);
    console.log(`Status: ${status.status}`);

    if (status.status !== 'pending') {
      console.log('Backup abgeschlossen!');
      break;
    }

    await new Promise(r => setTimeout(r, 10000));
  }
}
```

## 🐛 Fehlerbehandlung

```javascript
try {
  const data = await api.getAccountDetails();
  console.log(data);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('API-Key ungültig');
  } else if (error.message.includes('Rate Limit')) {
    console.error('Zu viele Anfragen - bitte warten');
  } else {
    console.error('API-Fehler:', error.message);
  }
}
```

## 📋 Anforderungen

- Bedrock Bridge Installation
- 24fire Account
- Gültiger 24fire API-Key
- Minecraft Bedrock Edition

## 🔗 Nützliche Links

- [24fire Homepage](https://24fire.de)
- [24fire API Dokumentation](https://manage.24fire.de/api)
- [Bedrock Bridge GitHub](https://github.com/bedrock-bridge)
- [Minecraft Bedrock Docs](https://docs.microsoft.com/en-us/minecraft/)

## 📞 Support

Bei Problemen oder Fragen:

1. Prüfe die Logs in der Server-Konsole
2. Verifiziere den API-Key
3. Stelle sicher, dass die 24fire API erreichbar ist
4. Prüfe die Firewall-Einstellungen

## 📄 Lizenz

Plugin unter der Bedrock Bridge Lizenz - Siehe LICENSE-Datei

## 👨‍💻 Entwicklung

### Klassen-Übersicht

| Klasse | Funktion |
|--------|----------|
| `TwentyfourfireAPI` | API-Client mit allen Endpoints |
| `UIManager` | GUI-Formulare und Menüs |
| `CommandHandler` | Befehlsverarbeitung |
| `CacheManager` | Caching-System |
| `Logger` | Logging-System |
| `TwentyfourfirePlugin` | Plugin-Hauptklasse |

### Events

```javascript
// Plugin starten
plugin.start();

// Plugin stoppen
plugin.stop();

// API-Key aktualisieren
plugin.setAPIKey('new-key');

// Status abrufen
plugin.getStatus();
```

## 🎯 Roadmap

- [ ] Discord-Integration
- [ ] Webhook-Unterstützung
- [ ] Datenbank-Speicherung
- [ ] Automatische Backups
- [ ] Alert-System
- [ ] Mobile App Integration
- [ ] REST-API für externe Tools
- [ ] Statistik-Dashboard

## ✅ Getestete Funktionen

- ✅ Account-Informationen
- ✅ Service-Liste
- ✅ Domain-Verwaltung
- ✅ DNS-Einträge (Read/Write/Delete)
- ✅ KVM-Server Status
- ✅ Server Power Control
- ✅ Backup-Verwaltung
- ✅ Traffic-Monitoring
- ✅ DDoS-Einstellungen
- ✅ Affiliate-System
- ✅ Spendentracking

## 📊 API-Endpoints (25+)

**Account (4)**
- GET /api/account
- GET /api/account/services
- GET /api/account/donations
- GET /api/account/affiliate

**Domain (6)**
- GET /api/domain/:id
- GET /api/domain/:id/dns
- PUT /api/domain/:id/dns/add
- POST /api/domain/:id/dns/edit
- DELETE /api/domain/:id/dns/remove

**KVM (15+)**
- GET /api/kvm/:id/backup/list
- POST /api/kvm/:id/backup/create
- POST /api/kvm/:id/backup/create/status
- POST /api/kvm/:id/backup/restore
- POST /api/kvm/:id/backup/restore/status
- DELETE /api/kvm/:id/backup/delete
- GET /api/kvm/:id/traffic/current
- GET /api/kvm/:id/traffic/log
- GET /api/kvm/:id/monitoring/timings
- GET /api/kvm/:id/monitoring/incidences
- GET /api/kvm/:id/ddos
- POST /api/kvm/:id/ddos/change
- GET /api/kvm/:id/config
- GET /api/kvm/:id/status
- POST /api/kvm/:id/power

**Webspace (1)**
- GET /api/webspace/:id

---

**Viel Spaß mit der 24fire Bridge! 🚀**
