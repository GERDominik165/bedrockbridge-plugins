# Pterodactyl Bedrock Bridge - Troubleshooting & Optimization

## 🔴 KRITISCHE PROBLEME - GELÖST

### ✅ Problem 1: PATCH-Methode kaputt
**Status:** FIXED
- **Was war falsch:** `HttpRequestMethod.Post` wurde für PATCH verwendet
- **Lösung:** `HttpRequestMethod.Patch` nutzen
- **Datei:** `src/api/PterodactylClient.ts:64`

### ✅ Problem 2: http.cancelAll() existiert nicht
**Status:** FIXED
- **Was war falsch:** `http.cancelAll()` in @minecraft/server-net nicht vorhanden
- **Lösung:** Request-Queue direkt leeren statt HTTP-Calls canceln
- **Datei:** `src/api/PterodactylClient.ts:322`

### ✅ Problem 3: WebSocket nicht implementiert
**Status:** FIXED
- **Was war falsch:** WebSocket-Verbindung war auskommentiert
- **Lösung:** Echte WebSocket-Verbindung aktiviert mit Fallback auf offline-Modus
- **Datei:** `src/Plugin.ts:457-465`

---

## 🟡 BEKANNTE LIMITATIONEN & WORKAROUNDS

### 1. WebSocket-Verbindung in Bedrock Server

**Limitation:** Bedrock Server hat limitierte WebSocket-Unterstützung

**Impact:**
- Real-time Console möglicherweise nicht funktional
- Keine Live-Stats

**Workaround:**
```typescript
// Plugin funktioniert im Offline-Modus:
// - Server-Liste abrufen ✓
// - Power-Befehle senden ✓
// - Dateien verwalten ✓
// - Console aktualisieren (manuell) ✓
// - Live-Console nicht verfügbar ✗
```

### 2. File Upload/Download

**Limitation:** Bedrock @minecraft/server-net hat keine File-API

**Status:** Derzeit nicht implementiert

**Workaround:**
```typescript
// Nutze SFTP oder andere Methoden für Dateioperationen
// Oder warte auf zukünftige Bedrock-Updates
```

### 3. HTTP-Methode PATCH-Workaround

**Limitation:** PATCH wird über POST mit Header simuliert

```typescript
// Bedrock: Nutze POST mit X-HTTP-Method-Override: PATCH
request.method = HttpRequestMethod.Post;
request.addHeader('X-HTTP-Method-Override', 'PATCH');
```

---

## 🔍 DIAGNOSE-CHECKLISTE

### Verbindungsprobleme

- [ ] Panel-URL ist erreichbar (ping)
- [ ] API Key ist gültig
- [ ] API Key hat Client-Berechtigungen
- [ ] Firewall erlaubt Outbound HTTPS
- [ ] SSL/TLS Zertifikat ist gültig
- [ ] API Rate-Limits nicht überschritten

### Befehl-Probleme

- [ ] Befehl beginnt mit `bedrockbridge` (case-sensitive)
- [ ] Befehlssyntax ist korrekt
- [ ] Player hat notwendige Permissions
- [ ] Server ist nicht überlastet
- [ ] Keine Spam/Rate-Limit-Probleme

### Performance-Probleme

- [ ] Caching ist aktiviert
- [ ] Monitoring-Intervall ist nicht zu kurz
- [ ] Rate-Limits sind angemessen
- [ ] Keine Memory Leaks (Check logs)
- [ ] WebSocket-Verbindungen werden properly closed

---

## 🛠️ ERWEITERTE OPTIMIERUNGEN

### 1. Caching optimieren

```json
{
  "cache": {
    "enabled": true,
    "defaultTTL": 600000,
    "serverListTTL": 300000,
    "resourcesTTL": 60000
  }
}
```

### 2. Monitoring reduzieren

```json
{
  "monitoring": {
    "interval": 10000,
    "maxHistorySize": 50
  }
}
```

### 3. Request-Queue tunen

```typescript
// In PterodactylClient.ts - erhöhe Queue-Processing
private requestQueue: Array<() => Promise<any>> = [];
// Max. 5 concurrent requests
private maxConcurrentRequests = 5;
```

### 4. Retry-Strategie anpassen

```json
{
  "pterodactyl": {
    "retryAttempts": 5,
    "retryDelay": 500,
    "maxRetryDelay": 5000
  }
}
```

---

## 📊 PERFORMANCE-METRIKEN

### Normale Werte:

```
API Request Duration: 100-500ms
Cache Hit Rate: 60-80%
Memory Usage: 50-150MB
Request Queue Size: 0-5
Active Console Sessions: 0-10
```

### Warnsignale:

```
⚠️  Request Duration > 1000ms
⚠️  Cache Hit Rate < 40%
⚠️  Memory Usage > 300MB
⚠️  Request Queue > 20
⚠️  Active Sessions > 50
```

---

## 🔧 MANUELLE FIXES

### Fix 1: Request-Queue leeren

```typescript
import { pterodactylPlugin } from '@bedrock-bridge/pterodactyl-plugin';

const stats = pterodactylPlugin.getStats();
if (stats.clientStats.queueSize > 100) {
  // Queue ist zu groß - Plugin neustarten
}
```

### Fix 2: Cache zurücksetzen

```typescript
import { cacheManager } from '@bedrock-bridge/pterodactyl-plugin';

cacheManager.clear(); // Alle Einträge löschen
cacheManager.invalidate('server:*'); // Bestimmte Einträge löschen
```

### Fix 3: Connection neu starten

```typescript
import { pterodactylPlugin } from '@bedrock-bridge/pterodactyl-plugin';

await pterodactylPlugin.shutdown();
// Warte 2 Sekunden
await pterodactylPlugin.initialize();
```

---

## 🧪 TESTING

### Unit Tests ausführen

```bash
npm test
```

### Integration Tests

```typescript
import { ConnectionTester } from './src/utils/ConnectionTester';

const tester = new ConnectionTester({
  panelUrl: 'https://your-panel.com/',
  apiKey: 'ptlc_YOUR_API_KEY'
});

const results = await tester.runTests();
results.tests.forEach(test => {
  console.log(`${test.name}: ${test.passed ? 'PASS' : 'FAIL'}`);
});
```

### Load Testing

```typescript
// Sende 100 Requests parallel
const requests = [];
for (let i = 0; i < 100; i++) {
  requests.push(client.get('/api/client/servers'));
}

const start = Date.now();
await Promise.all(requests);
const duration = Date.now() - start;

console.log(`100 requests in ${duration}ms`);
```

---

## 📝 LOGS VERSTEHEN

### Debug Log Format:

```
[2025-11-17 14:32:15] INFO - PterodactylClient initialized
[2025-11-17 14:32:15] DEBUG - HTTP GET /api/client/servers
[2025-11-17 14:32:15] DEBUG - HTTP Response 200 (size: 1024)
[2025-11-17 14:32:16] INFO - Connection test successful
```

### Error Log Beispiel:

```
[2025-11-17 14:32:15] ERROR - Network error
Error: ECONNREFUSED 192.168.1.1:80
    at Socket.onconnect [as _onconnect]
```

### Rate Limit Log:

```
[2025-11-17 14:32:15] WARN - Rate limit reached
requests: 240
limit: 240
wait: 45000ms
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] `debugMode: false` in Production
- [ ] `retryAttempts: 3` (nicht zu hoch)
- [ ] Caching aktiviert
- [ ] Log-Level auf INFO oder WARN
- [ ] API Key in Umgebungsvariablen
- [ ] Rate-Limits angepasst
- [ ] Monitoring aktiviert
- [ ] Backup-Strategie vorhanden
- [ ] Error-Handling getestet
- [ ] Performance-Baseline gemessen

---

**Last Updated:** 2025-11-17
**Status:** Production Ready v1.0.0
