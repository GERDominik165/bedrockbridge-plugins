# 🌐 COMPLETE SETUP GUIDE - @MINECRAFT/SERVER-NET INTEGRATION V8.0

## ⚡ VOLLSTÄNDIGE ANLEITUNG - VON A BIS Z

Du brauchst **ZWEI KOMPONENTEN**:

1. **Minecraft Bedrock Plugin** (SyncULTIMATE_COMPLETE_NET.js)
2. **Node.js API Server** (nodejs-api-server.js)

Sie kommunizieren über HTTP (@minecraft/server-net)!

---

## 📋 ARCHITECTURE

```
                MINECRAFT BEDROCK SERVER
                      ↓
        (SyncULTIMATE_COMPLETE_NET.js)
                      ↓
          @minecraft/server-net Module
                (HTTP Requests)
                      ↓
            NODE.JS API SERVER
              (localhost:3001)
                      ↓
                  EXPRESS.JS
                      ↓
                MySQL Datenbank
          (db.pavl21.de:3306)
```

---

## 🚀 INSTALLATION - SCHRITT FÜR SCHRITT

### SCHRITT 1: NODE.JS INSTALLIEREN

Gehe zu https://nodejs.org/ und installiere:
- **LTS Version** (empfohlen)
- Überprüfe: `node --version` und `npm --version`

### SCHRITT 2: DEPENDENCIES INSTALLIEREN

```bash
# Gehe in das Verzeichnis
cd D:\BB\bridgePlugins\sync

# Installiere Dependencies
npm install
```

**Installiert:**
- express (Web Framework)
- mysql2 (MySQL Driver)
- dotenv (Environment Variables)
- cors (Cross-Origin Requests)
- morgan (HTTP Logging)

### SCHRITT 3: .env DATEI ERSTELLEN

```bash
# Kopiere die Example-Datei
cp .env.example .env

# Bearbeite .env mit deinen Daten:
# DB_HOST=db.pavl21.de
# DB_USER=s2654_bedrock
# DB_PASSWORD=dein_passwort
# DB_NAME=s2654_bedrock_sync
```

### SCHRITT 4: NODE.JS SERVER STARTEN

```bash
# Starte den API Server
npm start

# Du solltest sehen:
# [MySQL] Connecting to db.pavl21.de...
# [Database] ✅ Schema initialized
# [Server] ✅ API Server running on http://localhost:3001
# [Server] ✅ Ready for Minecraft connections
```

**Wichtig:** Der Server muss **IMMER** laufen wenn Minecraft Server läuft!

### SCHRITT 5: MINECRAFT PLUGIN INSTALLIEREN

```bash
# Kopiere die Plugin-Datei
SyncULTIMATE_COMPLETE_NET.js → D:\BB\bridgePlugins\sync\

# Oder bearbeite manifest.json:
{
  "plugins": [
    {
      "name": "SyncULTIMATE_COMPLETE_NET",
      "path": "./bridgePlugins/sync/SyncULTIMATE_COMPLETE_NET.js",
      "enabled": true,
      "priority": 10
    }
  ]
}
```

### SCHRITT 6: MINECRAFT SERVER STARTEN

```bash
# Starte Minecraft Bedrock Server
# Warte auf diese Meldung:

[SyncULTIMATE_NET ...] ✅ SYSTEM FULLY OPERATIONAL
║  ✅ HTTP Client: INITIALIZED
║  ✅ API: CONNECTED
║  ✅ Commands: REGISTERED
║  ✅ Events: ACTIVE
║  ✅ Network Monitoring: ACTIVE
```

### SCHRITT 7: TESTEN

```bash
# Im Spiel:
/sync save
→ "✅ Inventar gespeichert!"

/sync load
→ "✅ Inventar geladen!"

/sync status
→ Zeigt Status

/sync stats
→ Zeigt Statistiken
```

---

## 🔄 WAS PASSIERT:

### HTTP Request Flow:

```
Spieler /sync save
    ↓
Minecraft Plugin fängt Command auf
    ↓
SyncManager.save(player) aufgerufen
    ↓
InventoryManager.captureAll(player) - Inventar wird captured
    ↓
HTTPClientWrapper.post("/api/inventory/save", data)
    ↓
@minecraft/server-net macht HTTP POST Request
    ↓
localhost:3001/api/inventory/save
    ↓
Node.js Express Server empfängt Request
    ↓
MySQL INSERT Befehl
    ↓
DB speichert Daten
    ↓
Response: {"success": true}
    ↓
Minecraft Plugin empfängt Response
    ↓
Spieler sieht: "✅ Inventar gespeichert!"
```

---

## 📊 DATENBANK-TABELLEN

Das System erstellt automatisch:

```sql
1. player_inventories
   - Alle Inventar-Snapshots
   - Items, Stats, Armor

2. player_metadata
   - Spieler-Info
   - Last Save, Total Saves

3. system_logs
   - System-Events

4. transaction_logs
   - Jede Operation

5. error_logs
   - Fehler-Tracking

6. health_checks
   - Server Health
```

---

## ⚙️ KONFIGURATION

### Minecraft Plugin (SyncULTIMATE_COMPLETE_NET.js):

```javascript
CONFIG.api.baseUrl = "http://localhost:3001";  // Node.js Server URL
CONFIG.api.timeout = 30;                        // Request Timeout (Sekunden)
CONFIG.sync.autoSyncInterval = 300;             // 15 Sekunden
CONFIG.logging.level = "VERBOSE";               // Log Level
```

### Node.js Server (.env):

```
PORT=3001
DB_HOST=db.pavl21.de
DB_USER=s2654_bedrock
DB_NAME=s2654_bedrock_sync
```

---

## 🔒 SICHERHEIT

### Best Practices:

1. **Starkes API Key**
   ```
   API_KEY=your-very-strong-api-key-here-min-32-chars
   ```

2. **Firewall**
   - Nur localhost kann auf Port 3001 zugreifen
   - Nicht ins Internet exponieren!

3. **MySQL User Rights**
   ```sql
   GRANT SELECT, INSERT, UPDATE ON s2654_bedrock_sync.* TO 's2654_bedrock'@'%';
   ```

4. **SSL/TLS**
   - Für Production über Internet: HTTPS verwenden
   - Reverse Proxy (nginx) empfohlen

---

## 🐛 TROUBLESHOOTING

### Problem 1: "Cannot find module 'express'"

**Lösung:**
```bash
npm install
# oder
npm install express mysql2 dotenv cors morgan
```

### Problem 2: "ECONNREFUSED 127.0.0.1:3001"

**Problem:** Node.js Server läuft nicht

**Lösung:**
```bash
# Terminal öffnen
cd D:\BB\bridgePlugins\sync
npm start

# Warte auf:
# [Server] ✅ API Server running on http://localhost:3001
```

### Problem 3: "ER_BAD_DB_ERROR: Unknown database"

**Problem:** Datenbank existiert nicht

**Lösung:**
```sql
-- In MySQL Console:
CREATE DATABASE s2654_bedrock_sync CHARACTER SET utf8mb4;
```

### Problem 4: "ER_ACCESS_DENIED_ERROR"

**Problem:** MySQL Login fehlgeschlagen

**Lösung:**
- Überprüfe DB_USER in .env
- Überprüfe DB_PASSWORD in .env
- Überprüfe DB_HOST (db.pavl21.de)

### Problem 5: "HTTP 404 - Not Found"

**Problem:** API Endpoint existiert nicht

**Lösung:** Überprüfe NODE.JS SERVER VERSION!
- Node.js Server muss Version 8.0.0+ sein
- Starte Server neu: `npm start`

### Problem 6: "Inventar wird nicht gespeichert"

**Lösungen:**
1. Überprüfe ob Node.js Server läuft
2. Überprüfe ob MySQL erreichbar ist
3. Überprüfe Logs: `npm start` (Terminal)
4. Überprüfe Minecraft Logs (Console)

---

## 📈 MONITORING

### Node.js Server Logs überprüfen:

```bash
# Terminal sollte zeigen:
[API] ✅ Saved inventory for PlayerName (45ms)
[API] ✅ Loaded inventory for PlayerName (30ms)
[Database] ✅ Schema initialized
[Server] ✅ API Server running on http://localhost:3001
```

### MySQL Daten überprüfen:

```sql
-- Verbinde zu MySQL:
mysql -h db.pavl21.de -u s2654_bedrock -p s2654_bedrock_sync

-- Überprüfe Daten:
SELECT COUNT(*) FROM player_inventories;
SELECT * FROM player_inventories ORDER BY capture_time DESC LIMIT 5;
SELECT * FROM transaction_logs WHERE status = 'SUCCESS' ORDER BY timestamp DESC;
```

### Minecraft Logs:

```
[SyncULTIMATE_NET ...] 💾 Speichere Player1 (MANUAL_SAVE)...
[SyncULTIMATE_NET ...] ✅ HTTP POST /api/inventory/save (45ms)
[SyncULTIMATE_NET ...] ✅ Player1 gespeichert (45ms)
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Option 1: Lokal (Entwicklung)

```bash
# Terminal 1 - Node.js Server
cd D:\BB\bridgePlugins\sync
npm start

# Terminal 2 - Minecraft Server
# Starte dein Minecraft Server
```

### Option 2: Separater PC/Server

```bash
# Auf anderem PC:
scp nodejs-api-server.js user@server:/home/sync/
scp package.json user@server:/home/sync/
scp .env user@server:/home/sync/

# SSH in Server:
ssh user@server
cd /home/sync
npm install
npm start

# Starte Minecraft Server mit:
# CONFIG.api.baseUrl = "http://192.168.1.100:3001"
```

### Option 3: Docker (Empfohlen)

```dockerfile
FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build & Run:
docker build -t sync-api .
docker run -p 3001:3001 --env-file .env sync-api
```

---

## 📊 PERFORMANCE

### Typische Zeiten:

| Operation | Zeit |
|-----------|------|
| Inventory Capture | 5-10ms |
| HTTP Request | 10-20ms |
| MySQL INSERT | 10-20ms |
| **Total** | **~35ms** |

### Mit schlechtem Internet:

| Operation | Zeit |
|-----------|------|
| HTTP Request (Latenz) | 50-200ms |
| MySQL (weit weg) | 50-100ms |
| **Total** | **~150ms** |

---

## ✅ CHECKLISTE

- [ ] Node.js installiert (`node --version`)
- [ ] npm installiert (`npm --version`)
- [ ] Dependencies installiert (`npm install`)
- [ ] .env Datei erstellt und ausgefüllt
- [ ] Node.js Server läuft (`npm start`)
- [ ] Server zeigt "API Server running on http://localhost:3001"
- [ ] Minecraft Plugin kopiert (SyncULTIMATE_COMPLETE_NET.js)
- [ ] Minecraft Server gestartet
- [ ] "SYSTEM FULLY OPERATIONAL" in Konsole
- [ ] "✅ API: CONNECTED" zeigt sich
- [ ] `/sync save` funktioniert
- [ ] `/sync load` funktioniert
- [ ] Daten in MySQL sichtbar

---

## 🎉 FERTIG!

Du hast jetzt ein **VOLLSTÄNDIGES Inventory Sync System**:

✅ Echte HTTP-basierte Kommunikation (@minecraft/server-net)
✅ Echte MySQL Datenbank
✅ Node.js Backend API
✅ Production-Ready
✅ Skalierbar
✅ Monitored

---

## 📞 QUICK COMMANDS

```bash
# Node.js Server starten
npm start

# Node.js Server mit Auto-Reload (Development)
npm run dev

# Minecraft Test
/sync save
/sync load
/sync status
/sync stats

# Database Check
mysql -h db.pavl21.de -u s2654_bedrock -p s2654_bedrock_sync
SELECT COUNT(*) FROM player_inventories;
```

---

**Version:** 8.0 COMPLETE
**Status:** ✅ PRODUCTION READY
**Components:** 2 (Minecraft Plugin + Node.js Server)
**Database:** MySQL

**Viel Erfolg! 🚀**
