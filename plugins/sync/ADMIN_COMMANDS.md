# 🛠️ ADMIN-BEFEHLE & VERWALTUNG - CrossServerSync V3

> Alle Befehle funktionieren in der Konsole oder im Spiel

---

## 📋 Befehl-Übersicht

### Spieler-Befehle

```bash
/sync                              # Menü öffnen
/sync transfer <main|farming>      # Direkt transferieren
/sync help                          # Hilfe anzeigen
/sync status                        # MySQL Status
```

### Admin-Befehle

```bash
/syncdebug sessions                # Aktive Sessions
/syncdebug database                # DB Status
/syncdebug stats                   # Statistiken
/syncdebug backup                  # Backup erstellen
/syncdebug clear-logs              # Logs löschen
```

---

## 🔍 Detaillierte Befehle

### 1. **Player Management**

```sql
-- Alle Spieler anzeigen
SELECT name, current_server, total_transfers, last_seen
FROM players
ORDER BY last_seen DESC;

-- Spieler-Details
SELECT * FROM players WHERE name = 'SpielerName';

-- Bannliste
SELECT name, banned FROM players WHERE banned = 1;

-- Whitelist
SELECT name, whitelisted FROM players WHERE whitelisted = 1;
```

**Im Spiel:**
```bash
/sync status
# Zeigt deinen Status an
```

### 2. **Session Management**

```sql
-- Aktive Sessions
SELECT
  p.name,
  s.server_id,
  s.login_time,
  TIMESTAMPDIFF(MINUTE, s.login_time, NOW()) as minutes_online
FROM sessions s
JOIN players p ON s.player_uuid = p.uuid
WHERE s.status = 'active';

-- Beende eine Session manuell
UPDATE sessions
SET logout_time = NOW(), status = 'ended'
WHERE session_id = 'session_xyz';
```

### 3. **Inventar-Verwaltung**

```sql
-- Alle gespeicherten Inventare
SELECT p.name, i.server_id, i.version, i.last_saved
FROM inventories i
JOIN players p ON i.player_uuid = p.uuid
ORDER BY i.last_saved DESC;

-- Letzte Inventory eines Spielers
SELECT * FROM inventories
WHERE player_uuid = 'bedrock_spielername_abc'
ORDER BY version DESC LIMIT 1;

-- Items eines Spielers ansehen
SELECT
  p.name,
  i.server_id,
  JSON_EXTRACT(i.items, '$[*].typeId') as items
FROM inventories i
JOIN players p ON i.player_uuid = p.uuid
WHERE p.name = 'SpielerName';
```

### 4. **Transfer-Historie**

```sql
-- Alle Transfers
SELECT
  p.name,
  from_server,
  to_server,
  duration_ms,
  success,
  transfer_time
FROM transfers t
JOIN players p ON t.player_uuid = p.uuid
ORDER BY transfer_time DESC;

-- Transfers eines Spielers
SELECT * FROM transfers
WHERE player_uuid = 'bedrock_spielername_abc'
ORDER BY transfer_time DESC;

-- Fehlerhafte Transfers
SELECT
  p.name,
  error_message,
  transfer_time
FROM transfers t
JOIN players p ON t.player_uuid = p.uuid
WHERE success = 0
ORDER BY transfer_time DESC;

-- Transfer-Statistik
SELECT
  DATE(transfer_time) as date,
  COUNT(*) as total,
  SUM(success) as successful,
  COUNT(*) - SUM(success) as failed,
  AVG(duration_ms) as avg_duration_ms
FROM transfers
GROUP BY DATE(transfer_time)
ORDER BY date DESC;
```

### 5. **System-Logs**

```sql
-- Letzte 50 Log-Einträge
SELECT timestamp, level, category, message
FROM system_logs
ORDER BY timestamp DESC
LIMIT 50;

-- Fehler der letzten Stunde
SELECT timestamp, message, category
FROM system_logs
WHERE level = 'error'
AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC;

-- Logs eines Spielers
SELECT timestamp, level, message
FROM system_logs
WHERE player_uuid = 'bedrock_spielername_abc'
ORDER BY timestamp DESC;

-- Logs einer Kategorie
SELECT timestamp, message FROM system_logs
WHERE category = 'Transfer'
ORDER BY timestamp DESC
LIMIT 100;

-- Logs löschen (älter als 30 Tage)
DELETE FROM system_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 6. **Statistiken & Monitoring**

```sql
-- Spieler-Statistik
SELECT
  COUNT(*) as total_players,
  SUM(CASE WHEN banned = 1 THEN 1 ELSE 0 END) as banned_players,
  SUM(CASE WHEN whitelisted = 1 THEN 1 ELSE 0 END) as whitelisted,
  MAX(last_seen) as last_player_seen
FROM players;

-- Server-Auslastung
SELECT
  current_server,
  COUNT(*) as online_players,
  COUNT(DISTINCT date(last_seen)) as unique_players_today
FROM players
GROUP BY current_server;

-- Top transferring players
SELECT
  p.name,
  COUNT(*) as transfer_count,
  AVG(duration_ms) as avg_duration
FROM transfers t
JOIN players p ON t.player_uuid = p.uuid
GROUP BY p.uuid
ORDER BY transfer_count DESC
LIMIT 10;

-- Performance-Stats
SELECT
  DATE(transfer_time) as date,
  COUNT(*) as transfers,
  ROUND(AVG(duration_ms), 2) as avg_ms,
  MIN(duration_ms) as min_ms,
  MAX(duration_ms) as max_ms
FROM transfers
WHERE transfer_time > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(transfer_time)
ORDER BY date DESC;
```

### 7. **Backups**

```sql
-- Alle Backups anzeigen
SELECT
  backup_id,
  backup_type,
  DATE(created_at) as created,
  ROUND(size_bytes/1024/1024, 2) as size_mb,
  restore_count
FROM backups
ORDER BY created_at DESC;

-- Backups eines Spielers
SELECT backup_id, created_at, size_bytes
FROM backups
WHERE player_uuid = 'bedrock_spielername_abc'
ORDER BY created_at DESC;

-- Abgelaufene Backups löschen
DELETE FROM backups
WHERE expires_at IS NOT NULL AND expires_at < NOW();

-- Alte Backups löschen (älter als 30 Tage)
DELETE FROM backups
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 8. **Wartungs-Commands**

```sql
-- Datenbank-Größe prüfen
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 's2654_bedrock_sync'
ORDER BY (data_length + index_length) DESC;

-- Indizes optimieren
OPTIMIZE TABLE players;
OPTIMIZE TABLE inventories;
OPTIMIZE TABLE transfers;
OPTIMIZE TABLE sessions;

-- Tabelle reparieren (falls beschädigt)
REPAIR TABLE players;
REPAIR TABLE inventories;

-- Datenbank-Integrität prüfen
CHECK TABLE players;
CHECK TABLE inventories;
CHECK TABLE transfers;
```

---

## 🎯 Use-Cases

### Szenario 1: Spieler hat Daten verloren

```sql
-- 1. Finde die letzten Backups
SELECT * FROM inventories
WHERE player_uuid = 'bedrock_spielername_abc'
ORDER BY last_saved DESC LIMIT 3;

-- 2. Stelle Version her (in JSON Format)
SELECT items FROM inventories
WHERE player_uuid = 'bedrock_spielername_abc'
AND version = 2;  -- Ältere Version

-- 3. Backup das neue Inventar
INSERT INTO backups (backup_id, player_uuid, backup_type, data)
VALUES ('backup_spieler_2025-11-14', 'bedrock_spielername_abc', 'player', ...);
```

### Szenario 2: Doppel-Login Fehler

```sql
-- Spieler sitzt fest in anderer Welt

-- 1. Finde die aktive Session
SELECT * FROM sessions
WHERE player_uuid = 'bedrock_spielername_abc'
AND status = 'active';

-- 2. Beende sie manuell
UPDATE sessions
SET status = 'ended', logout_time = NOW()
WHERE player_uuid = 'bedrock_spielername_abc'
AND status = 'active';

-- 3. Spieler kann sich jetzt neu connecten
```

### Szenario 3: Transfer-Fehler debuggen

```sql
-- 1. Finde fehlgeschlagene Transfers
SELECT * FROM transfers
WHERE success = 0
ORDER BY transfer_time DESC;

-- 2. Prüfe die Error-Message
SELECT error_message, player_uuid, from_server, to_server
FROM transfers
WHERE transfer_id = 'transfer_xyz';

-- 3. Prüfe ob Inventar gespeichert wurde
SELECT * FROM inventories
WHERE player_uuid = (
  SELECT player_uuid FROM transfers WHERE transfer_id = 'transfer_xyz'
);
```

### Szenario 4: Speicher-Probleme

```sql
-- 1. Größte Tabellen identifizieren
SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) as MB
FROM information_schema.TABLES
WHERE table_schema = 's2654_bedrock_sync'
ORDER BY (data_length + index_length) DESC;

-- 2. Alte Logs löschen
DELETE FROM system_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 3. Alte Backups löschen
DELETE FROM backups
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 4. Datenbank komprimieren
OPTIMIZE TABLE system_logs;
OPTIMIZE TABLE backups;
```

### Szenario 5: Spieler-Whitelist verwalten

```sql
-- 1. Spieler zur Whitelist hinzufügen
UPDATE players
SET whitelisted = 1
WHERE name = 'Spielername';

-- 2. Spieler bannen
UPDATE players
SET banned = 1, notes = 'Grund: Cheating'
WHERE name = 'Spielername';

-- 3. Spieler entsperren
UPDATE players
SET banned = 0
WHERE name = 'Spielername';

-- 4. Alle weißlisten Spieler zeigen
SELECT name FROM players
WHERE whitelisted = 1
ORDER BY name;
```

---

## 📊 Performance-Überwachung

### Health-Check Query

```sql
-- Alle wichtigen Metriken auf einen Blick
SELECT
  (SELECT COUNT(*) FROM players) as total_players,
  (SELECT COUNT(*) FROM sessions WHERE status = 'active') as active_sessions,
  (SELECT COUNT(*) FROM transfers WHERE transfer_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as transfers_24h,
  (SELECT COUNT(*) FROM system_logs WHERE level = 'error' AND timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as errors_24h,
  (SELECT AVG(duration_ms) FROM transfers WHERE transfer_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as avg_transfer_ms;
```

### Täglicher Report

```sql
-- Kopiere diese Query in eine Datei und führe täglich aus
SELECT NOW() as report_time;
SELECT 'PLAYERS' as section, COUNT(*) as count FROM players;
SELECT 'SESSIONS' as section, COUNT(*) as count FROM sessions;
SELECT 'TRANSFERS' as section, COUNT(*) as count FROM transfers;
SELECT 'ERRORS' as section, COUNT(*) as count FROM system_logs WHERE level = 'error';
SELECT 'AVG_TRANSFER_MS' as section, AVG(duration_ms) as count FROM transfers;
```

---

## 🔒 Sicherheits-Befehle

```sql
-- 1. Überprüfe kritische Fehler
SELECT COUNT(*) as critical_errors
FROM system_logs
WHERE level = 'error'
AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- 2. Prüfe auf ungewöhnliche Aktivitäten
SELECT p.name, COUNT(*) as transfer_count
FROM transfers t
JOIN players p ON t.player_uuid = p.uuid
WHERE transfer_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY p.uuid
HAVING COUNT(*) > 10;  -- Mehr als 10 Transfers pro Stunde = verdächtig

-- 3. Prüfe auf korrupte Daten
SELECT COUNT(*) as invalid_checksums
FROM inventories
WHERE checksum IS NULL;

-- 4. Audit-Log for banned/whitelisted changes
SELECT * FROM system_logs
WHERE category = 'Player'
AND (message LIKE '%banned%' OR message LIKE '%whitelist%')
ORDER BY timestamp DESC;
```

---

## 🎉 Checkliste - Regelmäßige Wartung

**Täglich:**
- [ ] Error-Count prüfen
- [ ] Transfer-Success-Rate überprüfen

**Wöchentlich:**
- [ ] Datenbank-Größe prüfen
- [ ] Alte Logs löschen
- [ ] Backups kontrollieren

**Monatlich:**
- [ ] Vollständiger Datenbank-Check
- [ ] Performance-Optimization
- [ ] Backup-Archivierung

---

**Version:** 3.0.0
**Datum:** 2025-11-14
