# ⚡ QUICK START - INVENTORY SYNC V6.0 - MYSQL ONLY

## 🚀 3-MINUTEN INSTALLATION

### Schritt 1: Datei wählen und kopieren

**Wähle EINE dieser Optionen:**

#### Option A: Mit BedrockBridge ⭐ EMPFOHLEN
```
Kopiere: SyncBridgeMySQL.js
Zielort: D:\BB\bridgePlugins\sync\SyncBridgeMySQL.js
```

#### Option B: Standalone (ohne Bridge)
```
Kopiere: InventorySyncMySQL.js
Zielort: D:\BB\bridgePlugins\sync\InventorySyncMySQL.js
```

### Schritt 2: Server starten

```bash
# Server neustarten
# Warte auf diese Meldung:

[SYNC 12:34:56] ✅ SYSTEM FULLY OPERATIONAL
```

### Schritt 3: Test

```bash
# Im Spiel:
/sync save    # Sollte "✅ Inventar gespeichert!" anzeigen
/sync load    # Sollte "✅ Inventar geladen!" anzeigen
/sync status  # Sollte dein Status anzeigen
```

✅ **FERTIG!** System läuft!

---

## 🎮 BEFEHLE (NUR MIT OPTION A)

```bash
/sync save       → Manuell speichern
/sync load       → Manuell laden
/sync status     → Status anzeigen
/sync clear      → Inventar löschen
```

---

## 🔄 WAS PASSIERT AUTOMATISCH?

### Beim Spielen:
- ✅ Alle 15 Sekunden: Inventar wird in MySQL gespeichert
- ✅ Beim Login: Letztes Inventar wird automatisch geladen
- ✅ Beim Logout: Finales Inventar wird gespeichert

**Spieler müssen NICHTS tun - alles passiert automatisch!**

---

## 🗄️ MYSQL-DATEN

```
Host:     db.pavl21.de
Port:     3306
User:     s2654_bedrock
Database: s2654_bedrock_sync
```

### Tabellen (werden automatisch erstellt):
- `player_inventories` - Alle gespeicherten Inventare
- `player_metadata` - Spieler-Info
- `system_logs` - Logs
- Und weitere...

---

## ❌ FEHLER BEHEBEN

### Fehler 1: "Import [...] not found"
**Problem:** Datei ist an falscher Position
**Lösung:**
```
Richtig:   D:\BB\bridgePlugins\sync\SyncBridgeMySQL.js
Falsch:    D:\BB\bridgePlugins\SyncBridgeMySQL.js
```

### Fehler 2: "MySQL connection failed"
**Problem:** Datenbank nicht erreichbar
**Lösung:**
1. Überprüfe Host: `db.pavl21.de`
2. Überprüfe Port: `3306`
3. Überprüfe User: `s2654_bedrock`
4. Überprüfe Database: `s2654_bedrock_sync`

### Fehler 3: "playerSpawn is not defined"
**Problem:** Event-Fehler
**Lösung:** Warte bis Server vollständig geladen ist

### Fehler 4: "Inventar wird nicht geladen"
**Problem:** Keine Daten in MySQL oder falsche UUID
**Lösung:**
- Spieler muss erst einmal `/sync save` ausführen
- Dann beim nächsten Login `/sync load` verwenden

---

## 📊 ÜBERPRÜFUNG

### MySQL-Datenbank checken:

```sql
-- Verbinde zu MySQL:
mysql -h db.pavl21.de -u s2654_bedrock -p s2654_bedrock_sync

-- Überprüfe ob Daten gespeichert werden:
SELECT COUNT(*) as total_saves FROM player_inventories;

-- Siehe letzte Saves:
SELECT player_name, capture_time FROM player_inventories ORDER BY capture_time DESC LIMIT 5;
```

---

## ✅ CHECKLISTE

- [ ] Datei kopiert
- [ ] Server neugestartet
- [ ] "SYSTEM FULLY OPERATIONAL" in Konsole
- [ ] Spieler kann /sync save ausführen
- [ ] Spieler kann /sync load ausführen
- [ ] MySQL hat Daten

---

## 📁 DATEIEN

In diesem Verzeichnis:

```
D:\BB\bridgePlugins\sync\

├── SyncBridgeMySQL.js              (Option A - MIT BRIDGE)
├── InventorySyncMySQL.js           (Option B - STANDALONE)
├── config.json                     (Konfiguration)
├── MYSQL_COMPLETE_SETUP.md         (Detailliertes Setup)
├── QUICK_START_V6.md              (Diese Datei)
└── Andere Dateien (ignorieren, alt)
```

**Verwende NUR eine dieser Dateien:**
- Entweder `SyncBridgeMySQL.js` (empfohlen mit Bridge)
- Oder `InventorySyncMySQL.js` (standalone)

---

## 🎯 KURZZUSAMMENFASSUNG

| Punkt | Status |
|-------|--------|
| Externe DB | ✅ NUR MYSQL |
| Automatisch | ✅ Alle 15 Sekunden |
| Abhängigkeiten | ✅ KEINE |
| Auto-Load | ✅ JA |
| Auto-Save | ✅ JA |
| Production Ready | ✅ JA |

---

## 🚀 START!

1. Datei kopieren
2. Server starten
3. FERTIG!

**Das System läuft jetzt vollständig automatisch!**

---

**Fragen?** → Siehe `MYSQL_COMPLETE_SETUP.md` für detaillierte Anleitung

**Version:** 6.0 | **Stand:** 2025-11-14
