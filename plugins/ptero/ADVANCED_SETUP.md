# Pterodactyl Bedrock Bridge - Advanced Setup Guide

**Erweiterte Konfiguration und Optimierung**

---

## 📑 Inhaltsverzeichnis

1. [Performance-Optimierung](#performance-optimierung)
2. [Sicherheit](#sicherheit)
3. [Multi-Server Setup](#multi-server-setup)
4. [Custom Configuration](#custom-configuration)
5. [Monitoring & Analytics](#monitoring--analytics)
6. [Caching Strategien](#caching-strategien)
7. [Error Recovery](#error-recovery)
8. [Automation](#automation)

---

## 🚀 Performance-Optimierung

### Cache-Strategie

#### Aggressive Caching (Sehr Performance-fokussiert)
```javascript
CACHE_TTL: 1200000          // 20 Minuten
MONITORING_INTERVAL: 30000  // 30 Sekunden
MAX_CACHE_ENTRIES: 200      // Mehr Einträge

// Ideal für:
// - Große Server mit vielen Spielern
// - Stabile Konfiguration
// - Weniger häufige Änderungen
```

#### Balanced (Standard)
```javascript
CACHE_TTL: 300000           // 5 Minuten
MONITORING_INTERVAL: 5000   // 5 Sekunden
MAX_CACHE_ENTRIES: 100      // Standard

// Ideal für:
// - Die meisten Setups
// - Balance zwischen Performance und Aktualität
```

#### Live Monitoring (Sehr Aktuell)
```javascript
CACHE_TTL: 30000            // 30 Sekunden
MONITORING_INTERVAL: 1000   // 1 Sekunde
MAX_CACHE_ENTRIES: 50       // Weniger Einträge

// Ideal für:
// - Development
// - Debugging
// - Hochdynamische Umgebungen
```

### Netzwerk-Optimierung

#### Timeout Anpassung
```javascript
// Für schnelle lokale Netzwerke
TIMEOUT: 5000               // 5 Sekunden
RETRY_ATTEMPTS: 2
RETRY_DELAY: 500

// Für Standard Internet
TIMEOUT: 30000              // 30 Sekunden
RETRY_ATTEMPTS: 3
RETRY_DELAY: 1000

// Für langsame/unstabile Netzwerke
TIMEOUT: 60000              // 60 Sekunden
RETRY_ATTEMPTS: 5
RETRY_DELAY: 2000
```

#### Batch Operations
```javascript
// Nicht:
for (let i = 0; i < 100; i++) {
  await fileManager.deleteFiles(serverId, [file]);  // 100 Requests!
}

// Sondern:
const files = [...];
await fileManager.deleteFiles(serverId, files);     // 1 Request
```

### Memory Management

```javascript
// Log-Buffer begrenzen
MAX_LOG_ENTRIES: 500        // Nicht zu groß

// Cache-Einträge begrenzen
MAX_CACHE_ENTRIES: 100      // Verhindert Memory-Leak

// History-Tracking
MAX_HISTORY_ENTRIES: 100    // Für Analytics

// Tipps:
// - Regelmäßig Logs löschen
// - Cache invalidieren wenn nötig
// - Monitoring deaktivieren wenn nicht genutzt
```

---

## 🔐 Sicherheit

### API-Key Management

#### Best Practices
```javascript
// 1. Niemals in Code hardcoden!
// FALSCH:
const API_KEY = "REDACTED";

// RICHTIG:
// Key via Environment Variable oder In-Game Config

// 2. Key regelmäßig rotieren (alle 3-6 Monate)
// 3. Minimale Permissions nutzen
// 4. Separate Keys für verschiedene Umgebungen
```

#### Permission Scopes
```javascript
// Minimal (nur Lesezugriff):
- Servers (read)
- Files (read)
- Backups (read)
- Databases (read)

// Standard (Management):
- Servers (all)
- Files (all)
- Databases (all)
- Backups (all)
- Schedules (all)

// Admin (Vollzugriff):
- Alle Permissions
```

### Network Security

#### HTTPS Only
```javascript
// Zwinge HTTPS
PANEL_URL: "https://your-panel.com"  // Nie http://

// Self-Signed Certificates?
// - Netzwerk-Admin informieren
// - Certificate Validation prüfen
```

#### Firewall-Regeln
```javascript
// Outbound nur zum Panel:
- Allow: <PANEL_URL>
- Deny: Everything else

// Inbound nur für authorized Players:
- /pman nur für OPs
- Admin-Befehle nur für spezifische Rollen
```

#### Logging & Auditing
```javascript
// Alle Aktionen loggung:
- Wer führte Aktion aus
- Welche Aktion
- Wann
- Ergebnis

// Logs regelmäßig prüfen auf:
- Unauthorized Versuche
- Falsch konfigurierte Permissions
- Unusual Activity Patterns
```

### Input Validation

```javascript
// Plugin prüft automatisch:
- Panel URL Format (https://)
- API Key Format (ptlc_ prefix)
- Zahl-Bereiche (min/max)
- File-Pfade (no traversal)
- Server-IDs (valid format)

// Best Practice:
// - Immer Validierungen nutzen
// - Keine Raw Input akzeptieren
// - User-Eingaben escapen
```

---

## 📊 Multi-Server Setup

### Szenario 1: Production + Testing

```javascript
// Production Server
const PROD_CONFIG = {
  PANEL_URL: "https://prod-panel.com",
  API_KEY: "REDACTED",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 5,
  AUTO_SAVE: true,
  AUTO_SAVE_INTERVAL: 60000,
  NOTIFICATIONS: true
};

// Testing Server
const TEST_CONFIG = {
  PANEL_URL: "https://test-panel.com",
  API_KEY: "REDACTED",
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 2,
  AUTO_SAVE: false,
  DEBUG_MODE: true,
  LOG_LEVEL: "DEBUG"
};

// Switch im Spiel: /pman switch-preset <production|testing>
```

### Szenario 2: Regional Distributed

```javascript
// EU Server
EU_CONFIG = {
  PANEL_URL: "https://eu.panel.com",
  API_KEY: "REDACTED",
  MONITORING_INTERVAL: 5000,
  CACHE_TTL: 300000
};

// US Server
US_CONFIG = {
  PANEL_URL: "https://us.panel.com",
  API_KEY: "REDACTED",
  MONITORING_INTERVAL: 10000,
  CACHE_TTL: 600000  // Höher wegen Latenz
};

// ASIA Server
ASIA_CONFIG = {
  PANEL_URL: "https://asia.panel.com",
  API_KEY: "REDACTED",
  MONITORING_INTERVAL: 15000,
  CACHE_TTL: 900000  // Noch höher
};
```

### Szenario 3: Load Balancing

```javascript
// Backup Panel
const PRIMARY_PANEL = "https://primary.panel.com";
const BACKUP_PANEL = "https://backup.panel.com";

// Fallback-Logik:
try {
  const response = await client.request(PRIMARY_PANEL, endpoint);
} catch (error) {
  // Fallback zu Backup
  const fallbackResponse = await client.request(BACKUP_PANEL, endpoint);
}
```

---

## ⚙️ Custom Configuration

### Config-Datei Struktur
```javascript
const CUSTOM_CONFIG = {
  // ============ API SETTINGS ============
  PANEL_URL: "https://your-panel.com",
  API_KEY: "REDACTED",
  API_KEY_TYPE: "client",        // or "application"

  // ============ TIMEOUTS ============
  TIMEOUT: 30000,                // ms
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,             // ms

  // ============ MONITORING ============
  MONITORING_INTERVAL: 5000,     // ms
  ENABLE_MONITORING: true,

  // ============ CACHING ============
  CACHE_TTL: 300000,             // ms
  ENABLE_CACHING: true,
  MAX_CACHE_ENTRIES: 100,

  // ============ PERSISTENCE ============
  AUTO_SAVE: true,
  AUTO_SAVE_INTERVAL: 60000,     // ms
  ENABLE_PERSISTENCE: true,

  // ============ GUI/UX ============
  COMMAND_PREFIX: "pman",
  THEME: "dark",                 // or "light"
  NOTIFICATIONS: true,

  // ============ LOGGING ============
  LOG_LEVEL: "INFO",             // DEBUG, INFO, WARN, ERROR
  DEBUG_MODE: false,
  ENABLE_CONSOLE: true,
  MAX_LOG_ENTRIES: 500,

  // ============ FEATURE TOGGLES ============
  ENABLE_WEBSOCKET: true,
  ENABLE_FILE_MANAGER: true,
  ENABLE_DATABASE_MANAGER: true,
  ENABLE_BACKUP_MANAGER: true,
  ENABLE_SCHEDULE_MANAGER: true,
  ENABLE_ALLOCATION_MANAGER: true,
  ENABLE_USER_MANAGER: true,
  ENABLE_STARTUP_MANAGER: true,
  ENABLE_SETTINGS_MANAGER: true,

  // ============ RATE LIMITING ============
  RATE_LIMIT_MAX: 240,           // requests/minute
  RATE_LIMIT_PERIOD: 60000,      // ms

  // ============ HISTORY & ANALYTICS ============
  MAX_HISTORY_ENTRIES: 100,
  TRACK_PERFORMANCE: true,
  ALERT_THRESHOLDS: {
    CPU: 90,                      // %
    MEMORY: 85,                   // %
    DISK: 80,                     // %
  }
};
```

### Environment-spezifische Configs

```javascript
// Development
const DEV_CONFIG = {
  ...CUSTOM_CONFIG,
  LOG_LEVEL: "DEBUG",
  DEBUG_MODE: true,
  MONITORING_INTERVAL: 1000,
  CACHE_TTL: 30000,
  AUTO_SAVE: false
};

// Staging
const STAGING_CONFIG = {
  ...CUSTOM_CONFIG,
  LOG_LEVEL: "INFO",
  DEBUG_MODE: false,
  MONITORING_INTERVAL: 5000,
  CACHE_TTL: 300000,
  AUTO_SAVE: true
};

// Production
const PROD_CONFIG = {
  ...CUSTOM_CONFIG,
  LOG_LEVEL: "WARN",
  DEBUG_MODE: false,
  MONITORING_INTERVAL: 10000,
  CACHE_TTL: 600000,
  AUTO_SAVE: true,
  NOTIFICATIONS: true
};

// Select basierend auf Environment
const ACTIVE_CONFIG =
  process.env.NODE_ENV === 'development' ? DEV_CONFIG :
  process.env.NODE_ENV === 'staging' ? STAGING_CONFIG :
  PROD_CONFIG;
```

---

## 📊 Monitoring & Analytics

### Metriken tracken

```javascript
// MonitoringService bietet:
- Real-time CPU/Memory/Disk/Network
- History-Tracking (letzte 100 Einträge)
- Performance-Analytics
- Alert-System

// Beispiel:
const monitor = MonitoringService.getInstance();
const stats = monitor.getServerData('server-id');

console.log(`
  CPU: ${stats.cpu}%
  Memory: ${stats.memory}%
  Disk: ${stats.disk}%
  Network RX: ${stats.network.rx_bytes}
  Network TX: ${stats.network.tx_bytes}
  Uptime: ${stats.uptime}s
`);
```

### Alert Thresholds

```javascript
// Configure Alerts
ALERT_THRESHOLDS = {
  CPU: 90,        // Warnung bei 90% CPU
  MEMORY: 85,     // Warnung bei 85% Memory
  DISK: 80,       // Warnung bei 80% Disk
};

// Alerts auslösen automatisch bei Überschreitung:
// - In-Game Nachricht an OPs
// - Log-Eintrag
// - Optional: Externe Benachrichtigung
```

### Performance-Analytics

```javascript
// Track Performance
const history = monitor.getHistory('server-id');

// Berechne Durchschnitte
const avgCPU = history.reduce((sum, h) => sum + h.cpu, 0) / history.length;
const avgMemory = history.reduce((sum, h) => sum + h.memory, 0) / history.length;
const avgDisk = history.reduce((sum, h) => sum + h.disk, 0) / history.length;

// Trends identifizieren
console.log(`
  Durchschnittliche CPU: ${avgCPU}%
  Durchschnittliche Memory: ${avgMemory}%
  Durchschnittliche Disk: ${avgDisk}%
  Peak CPU: ${Math.max(...history.map(h => h.cpu))}%
  Peak Memory: ${Math.max(...history.map(h => h.memory))}%
`);
```

---

## 💾 Caching Strategien

### Cache Invalidation Patterns

#### Pattern 1: Time-based (TTL)
```javascript
// Cache wird automatisch nach TTL gelöscht
CACHE_TTL: 300000  // 5 Minuten

// Gut für: Stabile Daten
// Nachteil: Kann veraltete Daten zeigen
```

#### Pattern 2: Event-based
```javascript
// Cache invalidieren nach Aktion
async createServer(data) {
  const result = await api.post('/servers', data);

  // Invalidiere Liste
  cacheManager.invalidate('servers:list');

  return result;
}
```

#### Pattern 3: LRU (Least Recently Used)
```javascript
// Cache begrenzen auf MAX_CACHE_ENTRIES
// Älteste Einträge werden entfernt

MAX_CACHE_ENTRIES: 100
// Bei 100 Einträgen: Ältester wird gelöscht
```

#### Pattern 4: Refresh-on-Access
```javascript
// Cache wird aktualisiert wenn zugegriffen
const data = await cacheManager.get('key', async () => {
  // Refresh wenn nicht im Cache
  return await api.get('/endpoint');
});
```

### Cache TTL Empfehlungen

```javascript
// Nach Datentyp:
SERVERS_TTL: 120000         // 2 min (ändern sich selten)
RESOURCES_TTL: 30000        // 30 sec (ändern sich oft)
FILES_TTL: 300000           // 5 min (selten änderung)
DATABASES_TTL: 600000       // 10 min (stabiel)
BACKUPS_TTL: 900000         // 15 min (stabiel)
SCHEDULES_TTL: 1200000      // 20 min (stabiel)
ALLOCATIONS_TTL: 600000     // 10 min (ändern sich selten)
USERS_TTL: 1800000          // 30 min (stabiel)
```

---

## 🔄 Error Recovery

### Automatic Retry Strategies

```javascript
// Exponential Backoff
const RETRY_DELAYS = [
  1000,     // 1s
  2000,     // 2s
  4000,     // 4s
  8000,     // 8s
  10000     // 10s (max)
];

// Wird automatisch für:
// - Network Timeouts
// - 5xx Server Errors
// - Connection Failures

// Nicht für:
// - 4xx Client Errors
// - Authentication Failures
```

### Fallback Strategies

```javascript
// Strategy 1: Cache Fallback
async getServers() {
  try {
    return await api.listServers();
  } catch (error) {
    // Zeige gecachte Daten wenn API down
    return cacheManager.get('servers:list') || [];
  }
}

// Strategy 2: Default Values
async getServerResources(serverId) {
  try {
    return await api.getResources(serverId);
  } catch (error) {
    // Zeige Placeholder wenn API nicht erreichbar
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: { rx_bytes: 0, tx_bytes: 0 }
    };
  }
}

// Strategy 3: User Notification
async criticalOperation() {
  try {
    return await api.operation();
  } catch (error) {
    // Warnung anzeigen
    showError("Operation failed. Retry again.");
    throw error;
  }
}
```

### Health Check System

```javascript
// Periodisch Panel-Erreichbarkeit prüfen
async function healthCheck() {
  try {
    await client.request('/api/client');
    updateStatus('HEALTHY');
  } catch (error) {
    updateStatus('UNHEALTHY');
    logger.warn('Panel unreachable');
  }
}

// Dann: Verhalten basierend auf Health anpassen
if (status === 'UNHEALTHY') {
  // Nutze Cache statt Live-Data
  // Reduziere Monitoring Interval
  // Zeige Warnung an User
}
```

---

## 🤖 Automation

### Command Automation

```javascript
// /pman auto-backup <server-id> [interval]
// Erstelle automatische Backups

// /pman auto-restart <server-id> [time]
// Restarte Server zu bestimmter Zeit

// /pman auto-update <server-id>
// Überprüfe automatisch auf Updates

// /pman auto-cleanup <server-id>
// Lösche alte Dateien/Backups
```

### Scheduled Tasks

```javascript
// Mit Pterodactyl Schedules:
1. Erstelle Schedule im Panel
2. Konfiguriere Tasks
3. Plugin führt sie aus

// Beispiele:
- Täglich um 3 Uhr: Backup
- Jede Stunde: Server-Neustart
- Täglich um 23:00: Datei-Cleanup
- Monatlich: Alte Backups löschen
```

### Webhook Integration (Future)

```javascript
// Geplant für nächste Version:
- Panel-Events auslösen Plugin-Aktionen
- Plugin-Aktionen senden Notifications
- Integration mit Discord/Slack
- Custom Event Handlers
```

---

## 📈 Skalierung

### Single Server
```javascript
// Optimal für 1-2 Server
MONITORING_INTERVAL: 5000
CACHE_TTL: 300000
AUTO_SAVE: true
```

### Medium Farm (5-10 Server)
```javascript
// Optimal für 5-10 Server
MONITORING_INTERVAL: 10000   // Reduziert auf 10s
CACHE_TTL: 600000            // Erhöht auf 10min
MAX_CACHE_ENTRIES: 200       // Mehr Cache
AUTO_SAVE: true
AUTO_SAVE_INTERVAL: 120000   // Seltener speichern
```

### Large Farm (10+ Server)
```javascript
// Optimal für 10+ Server
MONITORING_INTERVAL: 30000   // 30 Sekunden
CACHE_TTL: 1200000          // 20 Minuten
MAX_CACHE_ENTRIES: 500      // Viel Cache
AUTO_SAVE: true
AUTO_SAVE_INTERVAL: 300000  // Jede 5 Minuten
LOG_LEVEL: "WARN"           // Weniger Logging
DEBUG_MODE: false           // Kein Debug
NOTIFICATIONS: false        // Weniger Nachrichten
```

---

## 🎯 Checkliste

- [ ] Config für deine Umgebung erstellt
- [ ] API Keys sicher gespeichert (nicht hardcoded)
- [ ] Permissions minimiert
- [ ] Firewall-Regeln konfiguriert
- [ ] Caching-Strategie ausgewählt
- [ ] Monitoring aktiviert
- [ ] Backup-Schedules erstellt
- [ ] Error-Handling getestet
- [ ] Logs konfiguriert
- [ ] Performance-Tests durchgeführt

---

**Version**: 3.0.0
**Letzte Aktualisierung**: 2024
**Status**: Vollständig dokumentiert ✅
