# Pterodactyl Bedrock Bridge - API Reference

**Vollständige Dokumentation aller API Endpoints**

---

## 📑 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [HTTP Client](#http-client)
3. [Server Endpoints](#server-endpoints)
4. [File Endpoints](#file-endpoints)
5. [Database Endpoints](#database-endpoints)
6. [Backup Endpoints](#backup-endpoints)
7. [Schedule Endpoints](#schedule-endpoints)
8. [Allocation Endpoints](#allocation-endpoints)
9. [User Endpoints](#user-endpoints)
10. [Startup Endpoints](#startup-endpoints)
11. [Settings Endpoints](#settings-endpoints)
12. [Error Handling](#error-handling)

---

## 📊 Übersicht

Das Plugin implementiert **60+ API Methoden** über folgende Endpunkt-Klassen:

| Klasse | Methoden | Zweck |
|--------|----------|-------|
| ServerManager | 7 | Server-Verwaltung |
| FileManager | 8 | Datei-Operationen |
| DatabaseManager | 4 | Datenbank-CRUD |
| BackupManager | 5 | Backup-Verwaltung |
| ScheduleManager | 3 | Zeitplan-Management |
| AllocationManager | 4 | Port-Verwaltung |
| UserManager | 4 | Subuser-Verwaltung |
| StartupManager | 2 | Startup-Variablen |
| SettingsManager | 3 | Server-Einstellungen |

---

## 🌐 HTTP Client

### Übersicht
Der HTTP Client wrrappt alle Anfragen an das Pterodactyl Panel mit Retry-Logik, Rate-Limiting und Error-Handling.

### Eigenschaften
```javascript
// Rate Limiting
RATE_LIMIT_MAX: 240         // 240 Anfragen/Minute
RATE_LIMIT_PERIOD: 60000    // Sliding window (ms)

// Timeouts
TIMEOUT: 30000              // Default 30 Sekunden
MAX_TIMEOUT: 120000         // Maximum 2 Minuten

// Retry
RETRY_ATTEMPTS: 3           // Bis zu 3 Versuche
RETRY_DELAY: 1000          // Initial 1 Sekunde
MAX_RETRY_DELAY: 10000     // Max 10 Sekunden (exponentiell)
```

### Methoden

#### request()
```javascript
async request(endpoint, method = "GET", body = null)

// Parameter
endpoint  - API Endpoint-String
method    - HTTP Method (GET, POST, PUT, PATCH, DELETE)
body      - Request Body (für POST/PUT)

// Rückgabe
Promise<Object>  - API Response

// Beispiel
const response = await client.request('/api/client/servers', 'GET');
```

#### mit Retry-Logik
```javascript
// Automatisches Retry bei Timeout/Network-Fehler
// Exponential Backoff: 1s → 2s → 4s → 8s → 10s
// Wartet automatisch bei Rate-Limit (429)
```

---

## 🖥️ Server Endpoints

### ServerManager Klasse

#### listServers()
**Beschreibung**: Alle Server abrufen

```javascript
async listServers()

// Rückgabe
Promise<Array<{
  server_id: string,
  name: string,
  node: string,
  status: 'running' | 'stopped' | 'starting',
  limits: {
    memory: number,      // MB
    disk: number,        // MB
    cpu: number,         // Prozente
    swap: number,        // MB
    io: number,          // I/O Priority
    oom_disabled: boolean
  }
}>>
```

#### getServer(serverId)
**Beschreibung**: Einzelnen Server abrufen

```javascript
async getServer(serverId: string)

// Parameter
serverId  - Server ID (z.B. "abc123")

// Rückgabe
Promise<{
  server_id: string,
  name: string,
  status: string,
  limits: {...},
  feature_limits: {
    databases: number,
    allocations: number,
    backups: number
  }
}>
```

#### getResources(serverId)
**Beschreibung**: Ressourcen-Auslastung abrufen

```javascript
async getResources(serverId: string)

// Rückgabe
Promise<{
  server_id: string,
  status: 'running' | 'stopped',
  resources: {
    memory_bytes: number,
    memory_limit_bytes: number,
    cpu_absolute: number,
    network: {
      rx_bytes: number,
      tx_bytes: number
    },
    disk_bytes: number
  }
}>
```

#### sendPowerCommand(serverId, signal)
**Beschreibung**: Power-Befehl senden

```javascript
async sendPowerCommand(serverId: string, signal: string)

// Parameter
serverId  - Server ID
signal    - 'start' | 'stop' | 'restart' | 'kill'

// Rückgabe
Promise<void>
```

#### sendCommand(serverId, command)
**Beschreibung**: Konsolen-Befehl senden

```javascript
async sendCommand(serverId: string, command: string)

// Parameter
serverId  - Server ID
command   - z.B. "say Hello World"

// Rückgabe
Promise<void>
```

#### getWebSocketToken(serverId)
**Beschreibung**: WebSocket-Token für Konsole abrufen

```javascript
async getWebSocketToken(serverId: string)

// Rückgabe
Promise<{
  token: string,
  socket: string  // WebSocket URL
}>
```

#### updateServerSettings(serverId, settings)
**Beschreibung**: Server-Einstellungen aktualisieren

```javascript
async updateServerSettings(serverId: string, settings: {
  name?: string,
  description?: string,
  docker_image?: string
})

// Rückgabe
Promise<{
  server_id: string,
  name: string,
  [...]
}>
```

---

## 📄 File Endpoints

### FileManager Klasse

#### listFiles(serverId, directory = "/")
**Beschreibung**: Dateien in Verzeichnis auflisten

```javascript
async listFiles(serverId: string, directory: string = "/")

// Parameter
serverId   - Server ID
directory  - Verzeichnispfad (z.B. "/home")

// Rückgabe
Promise<Array<{
  name: string,
  mode: string,           // 'file' | 'directory' | 'symlink'
  size: number,           // Bytes
  modified_at: string,    // ISO 8601
  is_file: boolean,
  is_directory: boolean,
  is_symlink: boolean
}>>
```

#### getFileContents(serverId, path)
**Beschreibung**: Datei-Inhalt abrufen

```javascript
async getFileContents(serverId: string, path: string)

// Parameter
serverId - Server ID
path     - Dateipfad (z.B. "/config.txt")

// Rückgabe
Promise<string>  // Roher Datei-Inhalt
```

#### createFolder(serverId, directory)
**Beschreibung**: Verzeichnis erstellen

```javascript
async createFolder(serverId: string, directory: string)

// Parameter
serverId  - Server ID
directory - Pfad (z.B. "/home/plugins")

// Rückgabe
Promise<void>
```

#### writeFile(serverId, path, contents)
**Beschreibung**: Datei schreiben/erstellen

```javascript
async writeFile(serverId: string, path: string, contents: string)

// Parameter
serverId - Server ID
path     - Dateipfad
contents - Datei-Inhalt

// Rückgabe
Promise<void>
```

#### renameFile(serverId, root, files)
**Beschreibung**: Datei umbenennen

```javascript
async renameFile(serverId: string, root: string, files: Array<{
  from: string,
  to: string
}>)

// Rückgabe
Promise<void>
```

#### copyFile(serverId, location, path)
**Beschreibung**: Datei kopieren

```javascript
async copyFile(serverId: string, location: string, path: string)

// Parameter
location - Quelldatei
path     - Zieldatei

// Rückgabe
Promise<void>
```

#### compressFiles(serverId, files)
**Beschreibung**: Dateien komprimieren

```javascript
async compressFiles(serverId: string, files: {
  root: string,
  files: string[]
})

// Rückgabe
Promise<{
  size: number,
  mime: string,
  hash: string,
  hash_algo: string
}>
```

#### deleteFiles(serverId, files)
**Beschreibung**: Dateien löschen

```javascript
async deleteFiles(serverId: string, files: {
  root: string,
  files: string[]
})

// Rückgabe
Promise<void>
```

---

## 🗄️ Database Endpoints

### DatabaseManager Klasse

#### listDatabases(serverId)
**Beschreibung**: Alle Datenbanken des Servers

```javascript
async listDatabases(serverId: string)

// Rückgabe
Promise<Array<{
  id: string,
  server_id: string,
  host_id: number,
  database: string,
  username: string,
  max_connections: number,
  relationships: {...}
}>>
```

#### createDatabase(serverId, database)
**Beschreibung**: Neue Datenbank erstellen

```javascript
async createDatabase(serverId: string, database: {
  database: string,
  remote: string
})

// Parameter
database.database - DB Name (z.B. "game_data")
database.remote   - Remote IP Pattern (z.B. "%")

// Rückgabe
Promise<{
  object: 'server_database',
  attributes: {...}
}>
```

#### rotateDatabasePassword(serverId, databaseId)
**Beschreibung**: Datenbank-Passwort ändern

```javascript
async rotateDatabasePassword(serverId: string, databaseId: string)

// Rückgabe
Promise<{
  password: string  // Neues Passwort
}>
```

#### deleteDatabase(serverId, databaseId)
**Beschreibung**: Datenbank löschen

```javascript
async deleteDatabase(serverId: string, databaseId: string)

// Rückgabe
Promise<void>
```

---

## 💾 Backup Endpoints

### BackupManager Klasse

#### listBackups(serverId)
**Beschreibung**: Alle Backups des Servers

```javascript
async listBackups(serverId: string)

// Rückgabe
Promise<Array<{
  backup_id: string,
  uuid: string,
  is_successful: boolean,
  is_locked: boolean,
  bytes: number,
  created_at: string,
  completed_at: string | null
}>>
```

#### createBackup(serverId, name = null)
**Beschreibung**: Neues Backup erstellen

```javascript
async createBackup(serverId: string, name: string = null)

// Parameter
name - Optional: Backup-Name

// Rückgabe
Promise<{
  backup_id: string,
  is_successful: boolean,
  [...weitere Felder...]
}>
```

#### restoreBackup(serverId, backupId)
**Beschreibung**: Backup wiederherstellen

```javascript
async restoreBackup(serverId: string, backupId: string)

// Rückgabe
Promise<void>
```

#### deleteBackup(serverId, backupId)
**Beschreibung**: Backup löschen

```javascript
async deleteBackup(serverId: string, backupId: string)

// Rückgabe
Promise<void>
```

#### getBackupDownloadUrl(serverId, backupId)
**Beschreibung**: Download-URL abrufen

```javascript
async getBackupDownloadUrl(serverId: string, backupId: string)

// Rückgabe
Promise<{
  url: string,
  expires_at: string
}>
```

---

## ⏰ Schedule Endpoints

### ScheduleManager Klasse

#### listSchedules(serverId)
**Beschreibung**: Alle Zeitpläne auflisten

```javascript
async listSchedules(serverId: string)

// Rückgabe
Promise<Array<{
  schedule_id: string,
  name: string,
  cron: string,           // Cron Expression
  is_active: boolean,
  is_processing: boolean,
  last_run_at: string | null,
  next_run_at: string | null,
  tasks: Array<{...}>
}>>
```

#### getScheduleTasks(serverId, scheduleId)
**Beschreibung**: Tasks eines Zeitplans abrufen

```javascript
async getScheduleTasks(serverId: string, scheduleId: string)

// Rückgabe
Promise<Array<{
  task_id: string,
  action: string,
  payload: string,
  time_offset: number
}>>
```

#### executeSchedule(serverId, scheduleId)
**Beschreibung**: Zeitplan sofort ausführen

```javascript
async executeSchedule(serverId: string, scheduleId: string)

// Rückgabe
Promise<void>
```

---

## 🔗 Allocation Endpoints

### AllocationManager Klasse

#### listAllocations(serverId)
**Beschreibung**: Alle Allocations auflisten

```javascript
async listAllocations(serverId: string)

// Rückgabe
Promise<Array<{
  allocation_id: string,
  ip: string,
  alias: string | null,
  port: number,
  notes: string | null,
  is_default: boolean
}>>
```

#### updateAllocationNotes(serverId, allocationId, notes)
**Beschreibung**: Allocation-Notizen aktualisieren

```javascript
async updateAllocationNotes(
  serverId: string,
  allocationId: string,
  notes: string
)

// Rückgabe
Promise<void>
```

#### setPrimaryAllocation(serverId, allocationId)
**Beschreibung**: Primäre Allocation setzen

```javascript
async setPrimaryAllocation(serverId: string, allocationId: string)

// Rückgabe
Promise<void>
```

#### deleteAllocation(serverId, allocationId)
**Beschreibung**: Allocation löschen

```javascript
async deleteAllocation(serverId: string, allocationId: string)

// Rückgabe
Promise<void>
```

---

## 👥 User Endpoints

### UserManager Klasse

#### listSubusers(serverId)
**Beschreibung**: Alle Subuser auflisten

```javascript
async listSubusers(serverId: string)

// Rückgabe
Promise<Array<{
  user_id: string,
  uuid: string,
  username: string,
  email: string,
  image: string,
  '2fa_enabled': boolean,
  permissions: string[]
}>>
```

#### createSubuser(serverId, userData)
**Beschreibung**: Neuen Subuser erstellen

```javascript
async createSubuser(serverId: string, userData: {
  email: string,
  permissions: string[]
})

// Rückgabe
Promise<{
  object: 'server_subuser',
  attributes: {...}
}>
```

#### updateSubuserPermissions(serverId, userId, permissions)
**Beschreibung**: Subuser-Berechtigungen ändern

```javascript
async updateSubuserPermissions(
  serverId: string,
  userId: string,
  permissions: string[]
)

// Rückgabe
Promise<void>
```

#### deleteSubuser(serverId, userId)
**Beschreibung**: Subuser löschen

```javascript
async deleteSubuser(serverId: string, userId: string)

// Rückgabe
Promise<void>
```

---

## 🚀 Startup Endpoints

### StartupManager Klasse

#### getStartupVariables(serverId)
**Beschreibung**: Startup-Variablen abrufen

```javascript
async getStartupVariables(serverId: string)

// Rückgabe
Promise<Array<{
  variable_id: string,
  env_variable: string,
  description: string,
  server_value: string | null,
  user_viewable: boolean,
  user_editable: boolean,
  rules: string
}>>
```

#### updateStartupVariable(serverId, variableId, value)
**Beschreibung**: Startup-Variable aktualisieren

```javascript
async updateStartupVariable(
  serverId: string,
  variableId: string,
  value: string
)

// Rückgabe
Promise<void>
```

---

## ⚙️ Settings Endpoints

### SettingsManager Klasse

#### renameServer(serverId, name)
**Beschreibung**: Server umbenennen

```javascript
async renameServer(serverId: string, name: string)

// Rückgabe
Promise<void>
```

#### reinstallServer(serverId)
**Beschreibung**: Server neu installieren

```javascript
async reinstallServer(serverId: string)

// Rückgabe
Promise<void>
```

#### updateDockerImage(serverId, image)
**Beschreibung**: Docker-Image aktualisieren

```javascript
async updateDockerImage(serverId: string, image: string)

// Rückgabe
Promise<void>
```

---

## ❌ Error Handling

### Error-Klassen

```javascript
// ApiError
if (error instanceof ApiError) {
  console.error(error.statusCode);  // HTTP Status
  console.error(error.message);     // Error Message
}

// NetworkError
if (error instanceof NetworkError) {
  console.error("Connection failed:", error.message);
}

// TimeoutError
if (error instanceof TimeoutError) {
  console.error("Request timed out after", error.timeout, "ms");
}

// ValidationError
if (error instanceof ValidationError) {
  console.error("Invalid input:", error.message);
}
```

### Common HTTP Status Codes

| Status | Bedeutung | Lösung |
|--------|-----------|--------|
| 400 | Bad Request | Überprüfe Input-Parameter |
| 401 | Unauthorized | API Key überprüfen |
| 403 | Forbidden | Berechtigungen überprüfen |
| 404 | Not Found | Server/Ressource existiert nicht |
| 429 | Too Many Requests | Rate Limit - automatisch gewartet |
| 500 | Server Error | Panel-Problem, später versuchen |
| 503 | Service Unavailable | Panel Down |

---

## 🔄 Rate Limiting

Das Plugin respektiert das Pterodactyl Rate Limit (240 Requests/Minute):

```javascript
// Auto-Handling
- Requests werden gezählt
- Bei Annäherung an Limit warnt System
- Bei 429: Automatisches Warten
- Exponential Backoff für Retries
```

---

## 💡 Best Practices

### 1. Error Handling
```javascript
try {
  const servers = await serverManager.listServers();
} catch (error) {
  logger.error("Failed to list servers", error);
  // User-freundliche Meldung zeigen
}
```

### 2. Caching nutzen
```javascript
// Häufig abgerufene Daten cachen
// CACHE_TTL anpassen basierend auf Bedarf
```

### 3. Rate Limits respektieren
```javascript
// Nicht zu häufig aktualisieren
// Monitoring Interval anpassen
// Batch Operations wo möglich
```

### 4. Logging aktivieren
```javascript
// Debug Mode für Fehlersuche
// Logs anzeigen und analysieren
```

---

## 📋 Zusammenfassung

| Kategorie | Endpoints | Methoden |
|-----------|-----------|----------|
| Server | 7 | listServers, getServer, getResources, sendPower, sendCommand, getWebSocketToken, updateSettings |
| Files | 8 | listFiles, getContents, createFolder, writeFile, renameFile, copyFile, compress, delete |
| Database | 4 | listDatabases, createDatabase, rotatePassword, deleteDatabase |
| Backups | 5 | listBackups, createBackup, restoreBackup, deleteBackup, downloadUrl |
| Schedules | 3 | listSchedules, getTasks, executeSchedule |
| Allocations | 4 | listAllocations, updateNotes, setPrimary, deleteAllocation |
| Users | 4 | listSubusers, createSubuser, updatePermissions, deleteSubuser |
| Startup | 2 | getVariables, updateVariable |
| Settings | 3 | renameServer, reinstallServer, updateDockerImage |

**Total: 40 Endpoints mit vollständiger Fehlerbehandlung**

---

**Version**: 3.0.0
**Letzte Aktualisierung**: 2024
**Status**: Vollständig dokumentiert ✅
