# Pterodactyl Bedrock Bridge - Setup & Initialisierung

## 📋 Voraussetzungen

- **Minecraft Bedrock Dedicated Server** v1.21.120+
- **Node.js** 18+ (für Development)
- **TypeScript** 5.3+
- **Pterodactyl Panel** v1.x
- **API Key** vom Pterodactyl Panel (Client API)

## 🔧 Installation

### 1. Plugin Installation

```bash
# Clone oder kopiere das Plugin
cd D:\BB\bridgePlugins\ptero

# Installiere Dependencies
npm install

# Build das Projekt
npm run build
```

### 2. Konfiguration

Bearbeite `config.json`:

```json
{
  "pterodactyl": {
    "panelUrl": "https://dein-panel.de/",
    "apiKey": "REDACTED",
    "timeout": 30,
    "retryAttempts": 3
  },
  "bedrock": {
    "debugMode": true
  }
}
```

### 3. API Key erstellen

1. Gehe zu **https://your-panel.com/account/api**
2. Klicke **"Create Token"**
3. Gib einem Namen ein (z.B. "Bedrock Bridge")
4. Kopiere den API Key
5. **Sicher aufbewahren!** (Wird nicht erneut angezeigt)

## 🚀 Aktivierung im Bedrock Server

### Option A: Via Scripts (Empfohlen)

Füge zu `behavior_packs/your_pack/manifest.json` hinzu:

```json
{
  "dependencies": [
    {
      "module_name": "@minecraft/server",
      "version": "1.13.0"
    },
    {
      "module_name": "@minecraft/server-net",
      "version": "1.0.0-beta"
    },
    {
      "module_name": "@minecraft/server-ui",
      "version": "1.2.0"
    }
  ]
}
```

In `behavior_packs/your_pack/scripts/main.ts`:

```typescript
import { initializePlugin } from '../../../ptero/dist/index';

// Plugin initialisieren
await initializePlugin({
  panelUrl: 'https://your-panel.com/',
  apiKey: 'REDACTED',
  timeout: 30,
  retryAttempts: 3,
  monitoringEnabled: true,
  debugMode: true
});
```

### Option B: Via Direct Include

```javascript
import { createPterodactylPlugin } from './ptero/dist/index.js';

const plugin = await createPterodactylPlugin({
  panelUrl: 'https://your-panel.com/',
  apiKey: 'REDACTED',
  timeout: 30,
  retryAttempts: 3,
  monitoringEnabled: true,
  debugMode: false
});
```

## ✅ Verbindungstests

### Test 1: API Connectivity

```bash
# Im Bedrock Server Chat:
/function test_pterodactyl_connection
```

Oder mittels Code:

```typescript
import { ConnectionTester } from './src/utils/ConnectionTester';

const tester = new ConnectionTester({
  panelUrl: 'https://your-panel.com/',
  apiKey: 'REDACTED'
});

const results = await tester.runTests();
console.log(ConnectionTester.printResults(results));
```

### Test 2: Server Commands

Im Minecraft Chat:

```
/bedrockbridge help        # Zeige Hilfe
/bedrockbridge gui         # Öffne Menü
/bedrockbridge servers     # Liste Server auf
/bedrockbridge status      # Zeige Status
```

### Test 3: Debugging

Aktiviere Debug-Modus in `config.json`:

```json
{
  "bedrock": {
    "debugMode": true
  }
}
```

Dann siehst du detaillierte Logs in der Konsole.

## 🔍 Häufige Probleme & Lösungen

### Problem: "Unauthorized" Error (401)

**Ursache:** API Key ist ungültig oder abgelaufen

**Lösung:**
1. Überprüfe den API Key in der Konfiguration
2. Regeneriere einen neuen API Key vom Panel
3. Starte den Server neu

### Problem: "Connection Timeout"

**Ursache:** Panel antwortet nicht

**Lösung:**
1. Überprüfe die Panel URL
2. Überprüfe Internetverbindung
3. Erhöhe `timeout` in config.json
4. Überprüfe Firewall-Einstellungen

### Problem: "WebSocket Connection Failed"

**Ursache:** WebSocket wird vom Panel nicht unterstützt oder ist deaktiviert

**Lösung:**
1. Überprüfe WebSocket-Konfiguration im Panel
2. Setze `websocket.reconnectAttempts` auf 10
3. Der Plugin funktioniert auch ohne WebSocket (offline-Modus)

### Problem: "Rate Limit Exceeded"

**Ursache:** Zu viele Requests in kurzer Zeit

**Lösung:**
1. Erhöhe `rateLimiting.requestsPerMinute` (max. 240)
2. Reduziere Monitoring-Frequenz
3. Nutze Caching besser

### Problem: Commands funktionieren nicht

**Ursache:** Plugin nicht korrekt initialisiert

**Lösung:**
1. Überprüfe `COMMAND_PREFIX` in Constants (default: "bedrockbridge")
2. Starte den Server neu
3. Überprüfe Logs mit `debugMode: true`

## 📊 Performance-Optimierung

### 1. Caching aktivieren

```json
{
  "cache": {
    "enabled": true,
    "defaultTTL": 300000
  }
}
```

### 2. Monitoring anpassen

```json
{
  "monitoring": {
    "interval": 10000,
    "maxHistorySize": 50
  }
}
```

### 3. Rate Limiting tunen

```json
{
  "rateLimiting": {
    "requestsPerMinute": 200,
    "burstWindow": 2000
  }
}
```

## 🔐 Sicherheit

### Best Practices:

1. **API Key schützen**
   - Nicht in Versionskontrolle committen
   - Nutze Umgebungsvariablen
   - Regelmäßig rotieren

2. **Permissions setzen**
   ```json
   {
     "permissions": {
       "admin": "pterodactyl.admin",
       "user": "pterodactyl.user"
     }
   }
   ```

3. **HTTPS verwenden**
   - Panel URL sollte HTTPS sein
   - Überprüfe SSL-Zertifikate

4. **Rate Limiting**
   - Standard ist 240 requests/min
   - Protekt vor DoS-Angriffen

## 📈 Monitoring & Debugging

### Logs anschauen

```typescript
import { logger } from './src/utils/Logger';

logger.setDebugMode(true);
logger.info('My message', { data: 'example' });
```

### Performance-Metriken

```typescript
import { monitoringService } from './src/services/MonitoringService';

const stats = monitoringService.getStats();
console.log('Monitored servers:', stats.monitoredServers);
console.log('History size:', stats.historySize);
```

### Cache-Status

```typescript
import { cacheManager } from './src/utils/Cache';

const cacheStats = cacheManager.getStats();
console.log('Cache entries:', cacheStats.entries);
console.log('Cache hits:', cacheStats.hits);
```

## 🆘 Support

Bei Problemen:

1. Überprüfe die **Logs** (debugMode aktivieren)
2. Führe **Connection Tests** durch
3. Überprüfe **Pterodactyl Dokumentation**
4. Öffne ein **GitHub Issue**

---

**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** 2025-11-17
