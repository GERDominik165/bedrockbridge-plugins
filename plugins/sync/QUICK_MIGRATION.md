# ⚡ SCHNELL-MIGRATION: Von Lokal zu MySQL

> **Zielzeit:** 5 Minuten | **Komplexität:** Einfach

---

## 🎯 Schritt-für-Schritt

### 1️⃣ Backup machen (5 Sek)

```bash
# Falls vorhanden: alte Daten sichern
# D:\BB\bridgePlugins\sync\BACKUP_$(date).json
```

### 2️⃣ Neue Dateien kopieren (30 Sek)

```bash
# Kopiere diese 2 Dateien in D:\BB\bridgePlugins\sync\
✅ DatabaseConnector.js
✅ crossServerSync_mysql.js
```

### 3️⃣ Server starten (1 Min)

```bash
# Server neustarten (mit Pterodactyl oder direkt)
# Warte bis "✅ SYSTEM BEREIT | PRODUKTION" in der Konsole
```

### 4️⃣ Datenbank verifizieren (2 Min)

```bash
# Öffne phpMyAdmin oder MySQL Client:
mysql -h db.pavl21.de -u u2654_ml0hZ8Ntyf -p

# Wechsle zur Datenbank:
USE s2654_bedrock_sync;

# Prüfe Tabellen:
SHOW TABLES;

# Sollte 7 Tabellen anzeigen!
```

### 5️⃣ Im Spiel testen (1 Min)

```bash
# Spieler joined dem Server
/sync status
# Sollte antworten: "MySQL Status: 🟢 AKTIV"

# Sammle ein Item
# Warte 30 Sekunden

# Prüfe in MySQL:
SELECT COUNT(*) FROM inventories;
# Sollte > 0 sein!
```

---

## ✅ Fertig!

Wenn alle Checks grün sind: **MySQL ist produktiv!**

---

## 🆘 Wenn's nicht funktioniert

### Fehler: "MySQL Connection Pool initialization failed"

**Lösung:**
```sql
-- Verbindung manuell prüfen
mysql -h db.pavl21.de -u u2654_ml0hZ8Ntyf -p REDACTED
USE s2654_bedrock_sync;
SHOW TABLES;

-- Falls leer: Tabellen manuell erstellen
-- (siehe MYSQL_SETUP_GUIDE.md)
```

### Fehler: "ECONNREFUSED"

**Lösung:**
```bash
# Überprüfe in Pterodactyl:
# - IP 45.92.216.56 ist in "Erlaubte Verbindungen" für DB?
# - Database existiert wirklich?
# - Passwort ist korrekt?
```

### Fehler: "ER_NO_REFERENCED_ROW"

**Lösung:**
```sql
-- Spieler-Daten sind korrupt
-- Lösche alle Tabellen und lass Plugin neu erstellen:
DROP TABLE IF EXISTS inventories;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS transfers;
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS backups;
DROP TABLE IF EXISTS sync_stats;
DROP TABLE IF EXISTS players;

-- Server neustarten - alles wird neu erstellt!
```

---

## 📊 Kurz-Vergleich: Lokal vs. MySQL

| Feature | Lokal | MySQL |
|---------|-------|-------|
| Daten bleibt erhalten bei Crash | ❌ | ✅ |
| Multi-Server Sync | ❌ | ✅ |
| Automatische Backups | ❌ | ✅ |
| Performance bei vielen Spielern | ❌ | ✅ |
| Datensicherheit | ⚠️ | ✅ |
| Spieler-Historie | ❌ | ✅ |
| Admin-Tools | ⚠️ | ✅ |

---

## 🎉 Fertig!

Dein System nutzt jetzt die volle Kraft von MySQL!

**Nächste Schritte:**
- Überwache Logs für Fehler
- Mache regelmäßige Backups
- Nutze Admin-Befehle zum Verwalten

---

**Status:** ✅ Migration Complete
