# 🗄️ MySQL SETUP & MIGRATION GUIDE - CrossServerSync V3.0

## 📋 INHALTSVERZEICHNIS

1. [Übersicht](#übersicht)
2. [Datenbank-Verbindung Setup](#datenbank-verbindung-setup)
3. [Tabellen-Struktur](#tabellen-struktur)
4. [Plugin-Installation](#plugin-installation)
5. [Daten-Migration](#daten-migration)
6. [Verifikation & Testing](#verifikation--testing)
7. [Monitoring & Wartung](#monitoring--wartung)
8. [Troubleshooting](#troubleshooting)

---

## 📊 Übersicht

### Deine Pterodactyl Datenbank
```
Host:     db.pavl21.de:3306
Database: s2654_bedrock_sync
User:     u2654_ml0hZ8Ntyf
Password: REDACTED
```

### Was wird gespeichert?

| Tabelle | Inhalt | Größe |
|---------|--------|-------|
| `players` | Spieler-Profile (UUID, Name, Server) | Klein |
| `inventories` | Komplette Inventare mit allen Items | Mittel |
| `sessions` | Login/Logout Sessions & Tracking | Groß |
| `transfers` | Transfer-History zwischen Servern | Groß |
| `system_logs` | System-Logs für Debugging | Sehr groß |
| `backups` | Automatische Backup-Snapshots | Sehr groß |
| `sync_stats` | Performance-Statistiken | Klein |

---

## 🔧 Datenbank-Verbindung Setup

### Schritt 1: Datenbankverbindung testen

```bash
# Mit MySQL CLI:
mysql -h db.pavl21.de -u u2654_ml0hZ8Ntyf -p

# Passwort eingeben: REDACTED
```

### Schritt 2: Datenbank auswählen

```sql
USE s2654_bedrock_sync;
```

### Schritt 3: Aktuell vorhandene Tabellen anzeigen

```sql
SHOW TABLES;
```

**Erwartete Ausgabe (nach Plugin-Start):**
```
+------------------------------+
| Tables_in_s2654_bedrock_sync |
+------------------------------+
| players                      |
| inventories                  |
| sessions                     |
| transfers                    |
| system_logs                  |
| backups                      |
| sync_stats                   |
+------------------------------+
```

---

## 📋 Tabellen-Struktur

### 1. **players** Tabelle

Speichert Grunddaten über jeden Spieler:

```sql
CREATE TABLE players (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,           -- Minecraft UUID
  name VARCHAR(16) UNIQUE NOT NULL,           -- Spielername
  current_server VARCHAR(50) NOT NULL,        -- Aktueller Server
  first_join TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_transfers INT DEFAULT 0,              -- Anzahl aller Transfers
  last_transfer TIMESTAMP NULL,               -- Zeitpunkt letzter Transfer
  banned BOOLEAN DEFAULT FALSE,               -- Gesperrt?
  whitelisted BOOLEAN DEFAULT TRUE,           -- Whitelist?
  notes TEXT,                                 -- Admin-Notizen
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_uuid (uuid),
  INDEX idx_name (name),
  INDEX idx_server (current_server)
);
```

**Beispiel-Daten:**
```sql
INSERT INTO players VALUES (
  NULL,                              -- id (auto)
  'bedrock_spieler_abc123',         -- uuid
  'Spieler1',                        -- name
  'main',                            -- current_server
  CURRENT_TIMESTAMP,                -- first_join
  CURRENT_TIMESTAMP,                -- last_seen
  5,                                 -- total_transfers
  CURRENT_TIMESTAMP,                -- last_transfer
  0,                                 -- banned (false)
  1,                                 -- whitelisted (true)
  'Treuer Spieler',                 -- notes
  CURRENT_TIMESTAMP                 -- created_at
);
```

### 2. **inventories** Tabelle

Speichert komplette Inventare mit Versionierung:

```sql
CREATE TABLE inventories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_uuid VARCHAR(36) NOT NULL,          -- Bezug zu Spieler
  server_id VARCHAR(50) NOT NULL,            -- Von welchem Server
  version INT DEFAULT 1,                      -- Backup-Version
  items JSON NOT NULL,                       -- Items als JSON
  armor_items JSON,                          -- Rüstung
  offhand_item JSON,                         -- Off-Hand Item
  selected_slot INT DEFAULT 0,               -- Aktiv selektierter Slot
  checksum VARCHAR(64),                      -- Zur Validierung
  last_saved TIMESTAMP,

  FOREIGN KEY (player_uuid) REFERENCES players(uuid),
  UNIQUE KEY unique_player_server (player_uuid, server_id)
);
```

**Beispiel-Items JSON:**
```json
[
  {
    "slot": 0,
    "typeId": "minecraft:diamond_sword",
    "amount": 1,
    "nameTag": "Excalibur",
    "lore": ["Legendary Sword", "Very Sharp"],
    "enchantments": [
      {"type": "sharpness", "level": 5},
      {"type": "unbreaking", "level": 3}
    ]
  },
  {
    "slot": 1,
    "typeId": "minecraft:diamond",
    "amount": 64,
    "enchantments": []
  }
]
```

### 3. **sessions** Tabelle

Tracking von Spieler-Sitzungen:

```sql
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64) UNIQUE NOT NULL,    -- Eindeutige Session-ID
  player_uuid VARCHAR(36) NOT NULL,          -- Spieler-UUID
  server_id VARCHAR(50) NOT NULL,            -- Server
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL,                -- NULL = noch online
  duration_seconds INT,                      -- Spielzeit in Sekunden
  inventory_saved BOOLEAN DEFAULT FALSE,     -- Wurde Inventar gespeichert?
  status ENUM('active', 'idle', 'ended'),    -- Session-Status

  FOREIGN KEY (player_uuid) REFERENCES players(uuid),
  INDEX idx_player_uuid (player_uuid)
);
```

### 4. **transfers** Tabelle

Komplette Transfer-Historie:

```sql
CREATE TABLE transfers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transfer_id VARCHAR(64) UNIQUE NOT NULL,
  player_uuid VARCHAR(36) NOT NULL,
  from_server VARCHAR(50) NOT NULL,         -- Z.B. 'main'
  to_server VARCHAR(50) NOT NULL,           -- Z.B. 'farming'
  inventory_saved BOOLEAN DEFAULT TRUE,
  inventory_restored BOOLEAN DEFAULT FALSE,
  transfer_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT,                          -- Transfer-Dauer
  success BOOLEAN DEFAULT TRUE,              -- Erfolgreich?
  error_message TEXT,

  FOREIGN KEY (player_uuid) REFERENCES players(uuid),
  INDEX idx_player_uuid (player_uuid),
  INDEX idx_transfer_time (transfer_time)
);
```

### 5. **system_logs** Tabelle

Alle System-Events für Debugging:

```sql
CREATE TABLE system_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  log_id VARCHAR(64) UNIQUE NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level ENUM('info', 'warn', 'error', 'success', 'debug'),
  category VARCHAR(50),                     -- Z.B. 'Transfer', 'Inventory'
  message TEXT NOT NULL,
  player_uuid VARCHAR(36),
  server_id VARCHAR(50),
  data JSON,                                -- Zusätzliche Daten

  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_category (category)
);
```

### 6. **backups** Tabelle

Automatische Backup-Verwaltung:

```sql
CREATE TABLE backups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  backup_id VARCHAR(64) UNIQUE NOT NULL,
  player_uuid VARCHAR(36),                  -- NULL = ganzes System
  backup_type ENUM('player', 'server', 'system'),
  description TEXT,
  data LONGBLOB NOT NULL,                   -- Komprimierte Daten
  size_bytes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,                     -- Auto-Löschung nach 7 Tagen
  restore_count INT DEFAULT 0,              -- Wie oft wiederhergestellt?

  INDEX idx_backup_id (backup_id),
  INDEX idx_player_uuid (player_uuid)
);
```

### 7. **sync_stats** Tabelle

Performance & Statistiken:

```sql
CREATE TABLE sync_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_id VARCHAR(64) UNIQUE NOT NULL,
  date_hour TIMESTAMP,
  total_transfers INT DEFAULT 0,
  successful_transfers INT DEFAULT 0,
  failed_transfers INT DEFAULT 0,
  avg_transfer_time_ms INT,
  total_players_online INT,
  db_queries INT DEFAULT 0,
  network_errors INT DEFAULT 0,

  INDEX idx_date_hour (date_hour)
);
```

---

## 💾 Plugin-Installation

### Schritt 1: Datei-Installation

Kopiere diese zwei Dateien in den `bridgePlugins/sync` Ordner:

```
D:\BB\bridgePlugins\sync\
├── DatabaseConnector.js          ← ✅ Neu
├── crossServerSync_mysql.js       ← ✅ Neu (Haupt-Plugin)
└── [alte Dateien]                ← Behalte diese als Backup
```

### Schritt 2: Plugin-Aktivierung

In deiner `manifest.json` oder wo auch immer deine Plugins geladen werden:

```json
{
  "plugins": {
    "crossServerSync": {
      "enabled": true,
      "version": "3.0.0",
      "file": "crossServerSync_mysql.js"
    }
  }
}
```

### Schritt 3: Server-Neustart

```bash
# Server neustarten
# Das Plugin wird automatisch die Datenbank-Tabellen erstellen
```

**Erwartete Console-Ausgabe:**

```
╔════════════════════════════════════════════════════════════════╗
║         🌐 CROSS-SERVER SYNC V3.0 - MySQL Edition             ║
╚════════════════════════════════════════════════════════════════╝

[CrossServerSyncV3] ℹ️ Initializing MySQL Connection Pool...
[MySQLPool] 🔄 Initializing connection pool to db.pavl21.de:3306...
[MySQLPool] 📊 Database: s2654_bedrock_sync
[MySQLPool] 👤 User: u2654_ml0hZ8Ntyf
[MySQLPool] 🔌 Connection limit: 10
[MySQLPool] ✅ Connection pool initialized successfully!
[MySQLPool] 📋 Initializing database tables...
[MySQLPool] ✅ Table 'players' ready
[MySQLPool] ✅ Table 'inventories' ready
[MySQLPool] ✅ Table 'sessions' ready
[MySQLPool] ✅ Table 'transfers' ready
[MySQLPool] ✅ Table 'system_logs' ready
[MySQLPool] ✅ Table 'backups' ready
[MySQLPool] ✅ Table 'sync_stats' ready
[MySQLPool] ✅ All database tables initialized!

║  ✅ MySQL Integration: AKTIV
║  ✅ Session Management: AKTIV
║  ✅ Auto-Save: AKTIV
║  ✅ SYSTEM BEREIT | PRODUKTION
╚════════════════════════════════════════════════════════════════╝
```

---

## 📥 Daten-Migration

### Option 1: Migration aus alten Daten

Wenn du bereits Daten in der lokalen DB hast:

```sql
-- Importiere alte Spieler-Daten
INSERT INTO players (uuid, name, current_server, total_transfers)
SELECT
  CONCAT('bedrock_', name, '_', id),
  name,
  'main',
  0
FROM old_players_table;

-- Importiere alte Inventare
INSERT INTO inventories (player_uuid, server_id, items, checksum)
SELECT
  CONCAT('bedrock_', player_name, '_', id),
  'main',
  items_json,
  checksum
FROM old_inventory_table;
```

### Option 2: Frischer Start

Beim Server-Start werden alle neuen Spieler automatisch in die Datenbank eingetragen.

---

## ✅ Verifikation & Testing

### Test 1: Datenbankverbindung

```bash
# Im Spiel: /sync status
# Erwartete Antwort: "MySQL Status: 🟢 AKTIV"
```

### Test 2: Spieler-Registrierung

```bash
# Spieler joined dem Server
# In MySQL überprüfen:
SELECT * FROM players WHERE name = 'Spielername';

# Sollte ein Eintrag erscheinen!
```

### Test 3: Inventar-Speicherung

```bash
# Spieler sammelt ein Item
# Spieler wartet 30 Sekunden (Auto-Save Intervall)
# In MySQL überprüfen:
SELECT * FROM inventories WHERE player_uuid LIKE '%Spielername%';

# Sollte die Items im JSON enthalten!
```

### Test 4: Transfer-Funktion

```bash
# Spieler führt "/sync transfer farming" aus
# Prüfe in MySQL:
SELECT * FROM transfers WHERE player_uuid LIKE '%Spielername%';

# Transfer sollte gelistet sein mit success=1
```

### Test 5: Session-Tracking

```bash
# Während Spieler online ist:
SELECT * FROM sessions WHERE status = 'active';

# Sollte aktive Sessions zeigen

# Nach Spieler-Logout:
SELECT * FROM sessions WHERE player_uuid LIKE '%Spielername%' ORDER BY id DESC LIMIT 1;

# logout_time sollte gesetzt sein
```

---

## 📊 Monitoring & Wartung

### Tägliche Überwachung

```sql
-- Statistiken der letzten 24h
SELECT
  DATE(transfer_time) as date,
  COUNT(*) as total_transfers,
  SUM(success) as successful,
  COUNT(*) - SUM(success) as failed,
  AVG(duration_ms) as avg_duration_ms
FROM transfers
WHERE transfer_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY DATE(transfer_time);

-- Ausgabe z.B.:
-- date      | total | successful | failed | avg_duration
-- 2025-11-14| 45    | 44         | 1      | 285
```

### Speicherverbrauch überprüfen

```sql
-- Tabellen-Größen
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 's2654_bedrock_sync'
ORDER BY (data_length + index_length) DESC;
```

### Alte Logs löschen (Speicher sparen)

```sql
-- Logs älter als 30 Tage löschen
DELETE FROM system_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Alte abgelaufene Backups löschen
DELETE FROM backups
WHERE expires_at IS NOT NULL AND expires_at < NOW();
```

### Performance-Indizes überprüfen

```sql
-- Zeige alle Indizes
SHOW INDEXES FROM players;
SHOW INDEXES FROM inventories;
SHOW INDEXES FROM transfers;

-- Overprüfe Index-Performance
ANALYZE TABLE players;
ANALYZE TABLE inventories;
ANALYZE TABLE transfers;
OPTIMIZE TABLE players;
OPTIMIZE TABLE inventories;
OPTIMIZE TABLE transfers;
```

---

## 🔧 Troubleshooting

### Problem 1: "Keine Verbindung zur Datenbank"

**Symptom:** Plugin-Start schlägt fehl mit Connection-Fehler

**Ursachen & Lösungen:**

```bash
# 1. Verbindung testen
mysql -h db.pavl21.de -u u2654_ml0hZ8Ntyf -p
# Wenn Fehler: IP-Adresse (45.92.216.56) blockiert?

# 2. Firewall-Regel prüfen
# In Pterodactyl: db.pavl21.de erlaubt 45.92.216.56 ?

# 3. Credentials überprüfen
# Host:     db.pavl21.de  ✅
# Port:     3306          ✅
# Database: s2654_bedrock_sync ✅
# User:     u2654_ml0hZ8Ntyf ✅
# Password: REDACTED ✅
```

### Problem 2: "Tabellen werden nicht erstellt"

**Symptom:** "Table 'xyz' doesn't exist" nach Server-Start

**Ursachen & Lösungen:**

```sql
-- 1. Datenbank-Existenz prüfen
SHOW DATABASES;

-- 2. Berechtigungen prüfen
GRANT ALL PRIVILEGES ON s2654_bedrock_sync.* TO 'u2654_ml0hZ8Ntyf'@'%';
FLUSH PRIVILEGES;

-- 3. Manuell Tabellen erstellen (aus DatabaseConnector.js)
-- Kopiere die CREATE TABLE Statements
```

### Problem 3: "Inventare werden nicht gespeichert"

**Symptom:** Nach Transfer sind Items weg

**Ursachen & Lösungen:**

```sql
-- 1. Überprüfe ob Items in DB gespeichert sind
SELECT * FROM inventories WHERE player_uuid LIKE '%spielername%';

-- Wenn leer: lokaler Fallback prüfen
-- Logs überprüfen auf "MySQL save failed"

-- 2. Wenn MySQL fehlschlägt: lokale DB verwenden
-- Plugin wechselt automatisch auf lokale DB
```

### Problem 4: "Session-Fehler - Doppel-Login"

**Symptom:** "Du bist bereits in einer anderen Welt aktiv!"

**Das ist BEABSICHTIGT!** Schützt vor Datenverlusten.

**Lösung:**

```sql
-- Prüfe aktive Sessions
SELECT * FROM sessions WHERE status = 'active' AND player_uuid LIKE '%spielername%';

-- Force-End einer Session (NUR als Admin!):
UPDATE sessions SET status = 'ended', logout_time = NOW()
WHERE session_id = 'session_xyz';
```

### Problem 5: "DB Speicher voll"

**Symptom:** "Disk quota exceeded" oder ähnlich

**Lösung:**

```sql
-- Größte Tabellen finden
SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) as MB
FROM information_schema.TABLES
WHERE table_schema = 's2654_bedrock_sync'
ORDER BY (data_length + index_length) DESC;

-- system_logs ist wahrscheinlich die Größte!
-- Alte Logs löschen:
DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Alte Backups löschen:
DELETE FROM backups WHERE expires_at < NOW();
```

---

## 📈 Performance-Tipps

### 1. Connection Pool Tuning

```javascript
// In DatabaseConnector.js:
const MYSQL_CONFIG = {
  connectionLimit: 10,    // Erhöhen für viele Spieler
  // Für 100+ Spieler: 20
  // Für 10-50 Spieler: 10
  // Für <10 Spieler: 5
};
```

### 2. Auto-Save Intervall anpassen

```javascript
// In crossServerSync_mysql.js:
autoSaveInterval: 600,  // 10 Minuten
// Für schnelle Server: 300 (5 Min)
// Für langsame Server: 900 (15 Min)
```

### 3. Log-Rotation

```sql
-- Archiviere alte Logs regelmäßig
INSERT INTO system_logs_archive
SELECT * FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## 🎯 Checkliste - Nach Installation

- [ ] Datenbank-Verbindung getestet
- [ ] Tabellen wurden erstellt
- [ ] Plugin startet ohne Fehler
- [ ] `/sync status` zeigt "🟢 AKTIV"
- [ ] Erstes Spieler-Profil wurde erstellt
- [ ] Inventar wird gespeichert & wiederhergestellt
- [ ] Transfer funktioniert zwischen Servern
- [ ] Sessions werden getracked
- [ ] Logs sind lesbar
- [ ] System läuft 24h ohne Fehler

---

## 📞 Support

**Häufige Fehlermeldungen:**

| Fehler | Lösung |
|--------|--------|
| `Error: connect ECONNREFUSED` | DB nicht erreichbar - IP blockiert? |
| `Error: PROTOCOL_SEQUENCE_TIMEOUT` | DB zu langsam, Timeout erhöhen |
| `Error: ER_NO_REFERENCED_ROW` | Foreign Key verletzt - konsistenz prüfen |
| `Error: DISK_FULL` | Alte Logs löschen |
| `Error: Too many connections` | Connection Pool erhöhen |

---

**Version:** 3.0.0
**Datum:** 2025-11-14
**Status:** ✅ Production Ready
