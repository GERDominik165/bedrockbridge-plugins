# 🌐 NETWORK DATABASE GUIDE

## CrossServerSync v2.0 - @minecraft/server-net Integration

**Mit HTTP-basierter externer Datenbank**

---

## 📋 ÜBERBLICK

Das Plugin nutzt jetzt **@minecraft/server-net Module** für Kommunikation mit einer externen HTTP-basierten Datenbank-API.

### Was ist der Unterschied?

| Aspect | Lokal | Network |
|--------|-------|---------|
| **Speicherung** | In lokalem DB | Auf externer DB Server |
| **Zugriff** | Schnell (lokal) | Über HTTP (mit Fallback) |
| **Mehrere Server** | Getrennte Datenbanken | Zentrale Datenbank |
| **Redundanz** | Keine | Mit Network Cache |
| **Ausfallsicherheit** | Server Crash = Datenverlust | Fallback zur lokalen DB |

---

## 🔧 KONFIGURATION

### Standard-Einstellungen (config)

```javascript
{
  externalDatabaseEnabled: true,  // Externe DB an/aus
  externalDatabaseUrl: "http://localhost:3000/api",  // API-URL
  externalDatabaseRetries: 3,     // Wiederholungsversuche
  externalDatabaseTimeout: 5000   // Timeout in ms
}
```

### Umgebungsvariablen

```bash
# Token für Authentifizierung
export EXTERNAL_DB_TOKEN="REDACTED"

# Oder in .env Datei:
EXTERNAL_DB_TOKEN=your-secret-token
```

### Konfiguration ändern

```javascript
// Im Plugin selbst:
config.externalDatabaseEnabled = true;
config.externalDatabaseUrl = "http://your-db-server:3000/api";
config.externalDatabaseRetries = 3;
config.externalDatabaseTimeout = 5000;
```

---

## 🌐 NETZWERK-KLASSE

### NetworkDatabase Klasse

Alle statischen Methoden für Netzwerk-Kommunikation:

#### saveInventoryToNetwork(playerName, inventoryData, worldId)

Speichert Inventar in externe DB via HTTP POST

```javascript
const success = await NetworkDatabase.saveInventoryToNetwork(
  "alex",
  {items: [...], selectedSlot: 0},
  "world1"
);

// Was wird gesendet:
{
  action: "save_inventory",
  playerName: "alex",
  worldId: "world1",
  data: {
    items: [...],
    metadata: {
      itemCount: 15,
      savedAt: "2025-11-12T10:30:45.123Z"
    },
    checksum: "a1b2c3d4e5f6g7h8"
  },
  timestamp: 1731400245123
}
```

**HTTP-Header:**
```
Content-Type: application/json
X-Minecraft-Server: CrossServerSyncV2
Authorization: Bearer <TOKEN>
```

**Endpoint:** `POST /api/inventory/save`

---

#### loadInventoryFromNetwork(playerName)

Lädt Inventar aus externe DB via HTTP GET

```javascript
const inventoryData = await NetworkDatabase.loadInventoryFromNetwork("alex");

// Rückgabe:
{
  items: [...],
  metadata: {itemCount: 15},
  checksum: "a1b2c3d4e5f6g7h8"
}
```

**Endpoint:** `GET /api/inventory/load?playerName=alex`

**Cache-Mechanismus:**
- Speichert Daten lokal
- Nutzt Cache wenn <5 Min alt
- Reduziert Netzwerk-Last

---

#### checkInventoryAlreadyLoaded(playerName)

Prüft ob Inventar kürzlich geladen wurde

```javascript
const alreadyLoaded = await NetworkDatabase.checkInventoryAlreadyLoaded("alex");

// true = wurde vor <5 Min geladen
// false = frei zum Laden
```

**Endpoint:** `GET /api/inventory/check?playerName=alex`

---

#### markInventoryAsLoaded(playerName, worldId)

Markiert Inventar als geladen (Duplikat-Prävention)

```javascript
await NetworkDatabase.markInventoryAsLoaded("alex", "world2");

// POST Body:
{
  playerName: "alex",
  worldId: "world2",
  loadedAt: "2025-11-12T10:30:45.123Z"
}
```

**Endpoint:** `POST /api/inventory/mark-loaded`

---

#### saveSessionToNetwork(sessionId, sessionData)

Speichert Session-Info in externe DB

```javascript
await NetworkDatabase.saveSessionToNetwork(
  "session_alex_123456_xyz",
  {
    playerName: "alex",
    worldId: "world1",
    startTime: Date.now(),
    status: "active"
  }
);
```

**Endpoint:** `POST /api/session/save`

---

#### getBackupsFromNetwork(playerName)

Holt alle Backups eines Spielers

```javascript
const backups = await NetworkDatabase.getBackupsFromNetwork("alex");

// Rückgabe:
[
  {timestamp: 1731400245123, itemCount: 15, checksum: "a1b2c3d4"},
  {timestamp: 1731400145123, itemCount: 14, checksum: "b2c3d4e5"},
  ...
]
```

**Endpoint:** `GET /api/inventory/backups?playerName=alex`

---

#### checkDatabaseHealth()

Prüft Verbindung & Health der externen DB

```javascript
const health = await NetworkDatabase.checkDatabaseHealth();

// Rückgabe:
{
  healthy: true,
  status: "operational",
  version: "1.0",
  responseTime: 45
}
```

**Endpoint:** `GET /api/health`

---

#### testNetworkConnection()

Teste die Verbindung mit Logging

```javascript
const connected = await NetworkDatabase.testNetworkConnection();

// Logs:
// ✅ Externe DB Verbindung: OK
// oder
// ❌ Externe DB Verbindung: FEHLER (unreachable)
// ⚠️ Fallback zur lokalen Datenbank
```

---

#### clearNetworkCache(playerName)

Lösche Network Cache

```javascript
// Einen Spieler:
NetworkDatabase.clearNetworkCache("alex");
// Log: "Cache gelöscht für: alex"

// Alle:
NetworkDatabase.clearNetworkCache();
// Log: "Gesamter Network Cache gelöscht"
```

---

## 📡 API-ENDPOINTS REFERENZ

### Health Check
```
GET /api/health
Response: {healthy: boolean, status: string}
```

### Inventar speichern
```
POST /api/inventory/save
Body: {action, playerName, worldId, data, timestamp}
Response: {success: boolean}
```

### Inventar laden
```
GET /api/inventory/load?playerName=alex
Response: {data: {items, metadata, checksum}}
```

### Inventar-Status prüfen
```
GET /api/inventory/check?playerName=alex
Response: {alreadyLoaded: boolean, lastLoaded: timestamp}
```

### Geladen markieren
```
POST /api/inventory/mark-loaded
Body: {playerName, worldId, loadedAt}
Response: {success: boolean}
```

### Backups abrufen
```
GET /api/inventory/backups?playerName=alex
Response: {backups: [...]}
```

### Session speichern
```
POST /api/session/save
Body: {sessionId, playerName, worldId, ...}
Response: {success: boolean}
```

---

## 🔒 SICHERHEIT

### Authentifizierung

```javascript
Authorization: Bearer <TOKEN>
```

Token wird aus Umgebungsvariable gelesen:
```bash
EXTERNAL_DB_TOKEN=your-secret-token
```

### Checksummen

Alle Daten werden mit Checksum versehen:

```javascript
checksum: generateChecksum(items)
// Validierung beim Laden
// Warnung bei Mismatch
```

### Verschlüsselung

Für Production sollte HTTPS verwendet werden:
```javascript
config.externalDatabaseUrl = "https://your-db-server/api"
```

---

## 🔄 FEHLERBEHANDLUNG

### Netzwerk-Fehler

```javascript
try {
  const data = await NetworkDatabase.loadInventoryFromNetwork(playerName);
  if (!data) {
    // Fallback zur lokalen DB
    log("⚠️ Externe DB Fehler - Fallback zur lokalen DB", "warn");
    return getLatestInventory(playerName);
  }
} catch (e) {
  // Netzwerk-Fehler
  log(`⚠️ Netzwerk-Fehler: ${e} - Fallback`, "warn");
  return getLatestInventory(playerName);
}
```

### Automatischer Fallback

Wenn externe DB nicht erreichbar:
1. ✅ Cache wird genutzt (falls vorhanden)
2. ✅ Fallback zur lokalen Datenbank
3. ✅ Spieler sieht keine Unterschied
4. ✅ Daten werden lokal gespeichert

---

## 📊 PERFORMANCE

### Caching-Strategie

```javascript
// Cache-Hit (0-2ms):
// Wenn Daten <5 Min alt sind, nutze lokale Kopie

// Cache-Miss (50-100ms):
// Hole neue Daten von externe DB
// Speichere in lokalem Cache
```

### Netzwerk-Latenzen

| Operation | Latenz | Mit Cache |
|-----------|--------|-----------|
| Save | 100-500ms | N/A |
| Load | 100-500ms | 1-5ms |
| Check | 50-200ms | (kein Cache) |
| Health | 50-150ms | N/A |

---

## 🛠️ SETUP EXTERNE DATENBANK-SERVER

### Minimal Node.js API Server

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json());

// Authentifizierung
const authToken = REDACTED || "default-token";
const auth = (req, res, next) => {
  const token = REDACTED"Bearer ", "");
  if (token !== authToken) return res.status(401).json({error: "Unauthorized"});
  next();
};

app.use(auth);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    healthy: true,
    status: "operational",
    version: "1.0",
    responseTime: 45
  });
});

// Speichere Inventar
const inventories = {};
app.post('/api/inventory/save', (req, res) => {
  const {playerName, data} = req.body;
  inventories[playerName] = data;
  res.json({success: true});
});

// Lade Inventar
app.get('/api/inventory/load', (req, res) => {
  const {playerName} = req.query;
  const data = inventories[playerName];
  if (!data) return res.status(404).json({error: "not found"});
  res.json({data});
});

app.listen(3000, () => {
  console.log('External DB API running on :3000');
});
```

### Docker Setup

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package.json .
RUN npm install

COPY server.js .

ENV EXTERNAL_DB_TOKEN=your-secret-token
EXPOSE 3000

CMD ["node", "server.js"]
```

```bash
# Starten
docker run -p 3000:3000 -e EXTERNAL_DB_TOKEN=secret minecraft-db-api
```

---

## 🧪 TESTING

### Verbindung testen

```javascript
// In der Konsole oder Admin-Command:
const result = await NetworkDatabase.testNetworkConnection();
// Zeigt: ✅ oder ❌
```

### Health-Check

```javascript
const health = await NetworkDatabase.checkDatabaseHealth();
console.log(health);
// {healthy: true, status: "operational", ...}
```

### Inventar speichern/laden

```javascript
// Speichern
await NetworkDatabase.saveInventoryToNetwork("TestPlayer",
  {items: [{slot: 0, typeId: "minecraft:diamond", amount: 1}]},
  "world1"
);

// Laden
const data = await NetworkDatabase.loadInventoryFromNetwork("TestPlayer");
console.log(data);
```

---

## 📈 MONITORING

### Logs überprüfen

```
✅ Externe DB (HTTP): Inventar gespeichert (alex)
✅ Externe DB (HTTP): Inventar geladen (alex)
✅ Cache-Hit: Nutze lokale Kopie (alex)
⚠️ Externe DB Netzwerk-Fehler: ... - Fallback
❌ Externe DB Verbindung: FEHLER (unreachable)
```

### Metriken tracken

```javascript
// Speichern Sie diese Logs und analysieren Sie:
// - Erfolgsrate
// - Response-Zeit
// - Fehlerrate
// - Cache-Hit-Rate
```

---

## 🚀 BEST PRACTICES

### 1. HTTPS verwenden (Production)

```javascript
config.externalDatabaseUrl = "https://your-secure-db.com/api";
```

### 2. Token schützen

```bash
# Nicht in Code hardcoden!
# Verwende Umgebungsvariablen:
export EXTERNAL_DB_TOKEN=$(openssl rand -hex 32)
```

### 3. Regelmäßig Backups machen

```javascript
// Automatisch alle 6 Stunden
system.runInterval(() => {
  world.getAllPlayers().forEach(p => {
    NetworkDatabase.saveInventoryToNetwork(p.name, /* data */);
  });
}, 6 * 60 * 60 * 20); // 6 Stunden
```

### 4. Health-Checks durchführen

```javascript
system.runInterval(async () => {
  const health = await NetworkDatabase.checkDatabaseHealth();
  if (!health.healthy) {
    console.warn("⚠️ Externe DB Status: " + health.reason);
  }
}, 5 * 60 * 20); // Alle 5 Minuten
```

### 5. Cache regelmäßig leeren

```javascript
// Wöchentlich clearen
system.runInterval(() => {
  NetworkDatabase.clearNetworkCache();
  log("Cache geleert", "info");
}, 7 * 24 * 60 * 60 * 20); // Wöchentlich
```

---

## 🎯 ZUSAMMENFASSUNG

**NetworkDatabase Class** bietet:

✅ **HTTP-basierte externe Datenbank**
- Zentrale Speicherung für mehrere Server
- Automatisches Caching
- Fallback bei Fehler

✅ **Vollständige API**
- Speichern, Laden, Backup
- Health-Checks
- Session-Management

✅ **Sicherheit**
- Token-basierte Authentifizierung
- Checksummen-Validierung
- HTTPS Support

✅ **Zuverlässigkeit**
- Automatischer Fallback
- Error-Handling
- Ausführliche Logs

---

**Version:** 2.0.0
**Module:** @minecraft/server-net
**Status:** ✅ PRODUCTION READY

