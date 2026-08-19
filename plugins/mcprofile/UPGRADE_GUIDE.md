# MCProfile Plugin - UPGRADE GUIDE v2.0.0

**Version:** 2.0.0 UPGRADED
**Status:** ✅ FULLY AUTOMATIC PROFILE FETCHING
**Date:** November 21, 2025

---

## 🎯 WHAT'S NEW IN THIS UPGRADE

### ✅ VOLLAUTOMATISCHE PROFILABFRAGE
- **Keine manuellen API-Aufrufe mehr** - Automatisch beim Player Join
- **Echte Daten statt Placeholders** - MCProfile.io API Integration
- **Detailliertes Logging** - Alle Infos in der Konsole

### ✅ ECHTZEIT INFORMATIONEN
- **Automatischer Abruf beim Join** - Instant Profilabfrage
- **Chat-Anzeige für Admins** - Formatierte Profileinformationen
- **Server-UI Integration** - Visuelle Profil-Anzeige

### ✅ DETAILLIERTES LOGGING
- **Konsolen Output** - Alle Profileinformationen
- **Audit Trail** - Wer hat wann auf welches Profil zugegriffen
- **Error Logging** - Detaillierte Fehlerbehandlung

### ✅ SERVER-NET & SERVER-UI
- **Echte HTTP Requests** - Connection Pooling & Retry Logic
- **Admin Notifications** - Live UI Updates
- **Health Checks** - API Status Monitoring

---

## 📋 NEUE DATEIEN

### Upgraded Files
```
✅ index-upgraded.js                  Main Plugin (VOLLAUTOMATISCH)
✅ api/mcprofile-api-upgraded.js      API Client (ECHTE REQUESTS)
✅ ui/ui-manager-upgraded.js          Server-UI (ECHTE DATEN)
✅ net/network-manager-upgraded.js    Server-Net (HTTP INTEGRATION)
```

---

## 🚀 INSTALLATION DER UPGRADED VERSION

### Schritt 1: Backup erstellen
```bash
cp index.js index.js.backup
cp api/mcprofile-api.js api/mcprofile-api.js.backup
cp ui/ui-manager.js ui/ui-manager.js.backup
cp net/network-manager.js net/network-manager.js.backup
```

### Schritt 2: Upgraded Files einbauen
```bash
# Option A: Ersetze existierende Dateien
cp index-upgraded.js index.js
cp api/mcprofile-api-upgraded.js api/mcprofile-api.js
cp ui/ui-manager-upgraded.js ui/ui-manager.js
cp net/network-manager-upgraded.js net/network-manager.js

# Option B: Neue Imports in index.js hinzufügen
# Ändere alle Imports zu:
import MCProfileAPI from './api/mcprofile-api-upgraded.js';
import UIManager from './ui/ui-manager-upgraded.js';
import NetworkManager from './net/network-manager-upgraded.js';
```

### Schritt 3: Server neu starten
```bash
# Server wird jetzt mit VOLLAUTOMATISCHER PROFILABFRAGE starten
```

### Schritt 4: Verifizieren
1. Admin joins server
2. Check console for detailed logging
3. Check chat for profile information
4. Verify `/mcprofile-info` works

---

## 📊 BEISPIEL: AUTOMATISCHER PROFILABRUF

### Wenn ein Spieler Beitritt:

```
════════════════════════════════════════════════
[2025-11-21T16:04:59.921Z INFO] [MCProfile] PLAYER JOIN EVENT
════════════════════════════════════════════════
[2025-11-21T16:04:59.921Z INFO] [MCProfile] Player Name: PowerPulseOnPS4
[2025-11-21T16:04:59.921Z INFO] [MCProfile] XUID: 25332248730d7792
[2025-11-21T16:04:59.921Z INFO] [MCProfile] Admin Status: YES
[2025-11-21T16:04:59.921Z INFO] [MCProfile] Starting automatic profile fetch...

[API REQUEST] Fetching profile from MCProfile.io...
[API REQUEST] Endpoint: GET /api/v1/bedrock/xuid/25332248730d7792
[API REQUEST] Status: Requesting...

[API RESPONSE] ✓ SUCCESS - Profile data received
════════════════════════════════════════════════
║         PROFILE INFORMATION
╠════════════════════════════════════════════════╣
║ Gamertag:              kobenetwork
║ XUID:                  25332248730d7792
║ Floodgate UID:         00000000-0000-0000-0009-000004ed8eb0
║ Account Tier:          Silver
║ Gamescore:             14895
║ Account Age:           2020-05-15
║ Linked to Java:        ✓ YES
║
║ 🔗 LINKED JAVA ACCOUNT:
║ Java Name:             jensco
║ Java UUID:             cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee
║
║ Skin Texture:          5006a1a7340
║ Icon URL:              Available
════════════════════════════════════════════════

[CACHE] Profile cached successfully (TTL: 3600s)
[ADMIN DISPLAY] Admin detected: PowerPulseOnPS4
[ADMIN DISPLAY] Displaying profile information in chat...
[ADMIN DISPLAY] Status: Sending to player...

[SUCCESS] ✓ Profile information delivered to admin: PowerPulseOnPS4
[AUDIT] Profile accessed by admin PowerPulseOnPS4 for player PowerPulseOnPS4

[COMPLETE] Player join event completed successfully
════════════════════════════════════════════════
```

### Im Chat sieht der Admin:

```
§6╔════════════════════════════════════════════════╗
§6║         MCProfile Information
§6╠════════════════════════════════════════════════╣
§eGamertag (Xbox): §fkobenetwork
§eXUID: §f25332248730d7792
§eFloodgate UID: §f00000000-0000-0000-0009-000004ed8eb0

§eAccount Information:
§e├─ Tier: §fSilver
§e├─ Gamescore: §f14895
§e└─ Age: §f2020-05-15

§eSkin Information:
§e├─ Texture ID: §f5006a1a7340
§e└─ Skin URL: §f✓ Available

§eLinked to Java: §f✓ YES

§6═════════════════════════════════════════════════
§e🔗 Linked Java Account:
§e├─ Name: §fjensco
§e└─ UUID: §fcb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee

§eFetched: §f2025-11-21T16:04:59.921Z
§6═════════════════════════════════════════════════
```

---

## 🔧 NEUE FEATURES

### 1. Automatischer Profilabruf
- ✅ Beim Player Join automatisch Profil abrufen
- ✅ Keine manuellen Commands nötig für Initial Fetch
- ✅ Echtzeit-Daten von MCProfile.io API

### 2. Detailliertes Logging
- ✅ Alle API Requests geloggt
- ✅ Alle Response Daten in Konsole
- ✅ Error Handling mit Stack Traces
- ✅ Audit Trail für Admin Zugriffe

### 3. Server-Net Integration
- ✅ Connection Pooling (5 concurrent max)
- ✅ Request Queueing für Overflow
- ✅ Retry Logic mit Exponential Backoff
- ✅ Network Statistics & Monitoring

### 4. Server-UI Updates
- ✅ Echte Profildaten in UI Forms
- ✅ Admin Notifications mit Infos
- ✅ Success/Error Dialogs
- ✅ Echtzeit-Updates

### 5. Admin-Only Filtering
- ✅ Profil nur an Admins mit "admin" Tag
- ✅ Automatische Tag-Überprüfung
- ✅ Loggen von Zugriffsverweigerungen

---

## 📝 KONSOLEN LOG BEISPIELE

### Successful Profile Fetch
```
[2025-11-21T16:04:59.921Z INFO] ✓ Profile successfully fetched for PowerPulseOnPS4
[2025-11-21T16:04:59.921Z INFO] Profile cached successfully (TTL: 3600s)
[2025-11-21T16:04:59.921Z INFO] ✓ Profile information delivered to admin
```

### API Error
```
[2025-11-21T16:05:15.421Z ERROR] ✗ Failed to fetch profile: HTTP 404: Not Found
[2025-11-21T16:05:15.421Z ERROR] [RETRY] Waiting 2000ms before retry 2/3...
[2025-11-21T16:05:17.421Z INFO] [RETRY] Retry attempt 2 successful
```

### Access Control
```
[2025-11-21T16:04:59.921Z INFO] Admin detected: PowerPulseOnPS4 - Sending profile
[2025-11-21T16:05:05.421Z INFO] Regular player (no admin tag) - Profile NOT displayed
[2025-11-21T16:05:05.421Z INFO] [AUDIT] Profile accessed by admin XYZ for player ABC
```

---

## ⚙️ CONFIGURATION

Keine neuen Config Optionen nötig!

Existierende Settings gelten auch für Upgraded Version:

```json
{
  "api": {
    "endpoint": "https://api.mcprofile.io",
    "timeout": 10000,
    "retries": 3
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "admin": {
    "tags": ["admin"],
    "showProfileOnJoin": true
  },
  "ui": {
    "enabled": true,
    "showOnJoin": true
  },
  "logging": {
    "level": "info"
  }
}
```

---

## 🆕 NEW COMMANDS

Existierende Commands funktionieren auch mit Upgrade:

```
/mcprofile <identifier>      Query any profile (manual)
/mcprofile-info              Show plugin status
/mcprofile-cache stats       Show cache statistics
/mcprofile-cache clear       Clear all profiles
/mcprofile-reload            Reload configuration
```

---

## 📊 PERFORMANCE IMPROVEMENTS

- ✅ **Caching** - 1 Hour TTL für häufige Zugriffe
- ✅ **Connection Pooling** - 5 concurrent requests max
- ✅ **Request Queueing** - Overflow handling
- ✅ **Exponential Backoff** - Intelligente Retries
- ✅ **Network Monitoring** - Health checks & statistics

---

## 🔍 DEBUGGING

### Enable Debug Logging
```json
{
  "logging": {
    "level": "debug"
  }
}
```

Reload:
```
/mcprofile-reload
```

### Check Network Stats
```javascript
// In Console
plugin.networkManager.getStats()
// Returns: {
//   totalRequests: 45,
//   successfulRequests: 44,
//   failedRequests: 1,
//   successRate: "97.78",
//   activeRequests: 0,
//   averageResponseTime: 235
// }
```

### Check Cache Stats
```javascript
// In Console
plugin.cache.getStats()
// Returns: {
//   size: 12,
//   maxSize: 1000,
//   ttl: 3600,
//   hits: 234,
//   misses: 15,
//   hitRate: "93.95"
// }
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backup alte Dateien erstellt
- [ ] Neue Dateien ins Verzeichnis kopiert
- [ ] Server neu gestartet
- [ ] Plugin Meldung sichtbar: "MCProfile UPGRADED loaded"
- [ ] Player joins server
- [ ] Admin sieht automatisch Profil im Chat
- [ ] Konsole zeigt detailliertes Logging
- [ ] `/mcprofile-info` funktioniert
- [ ] `/mcprofile <xuid>` funktioniert
- [ ] Admin-Only Filter funktioniert

---

## 🎯 ROLLBACK (Falls nötig)

```bash
# Restore alte Dateien
cp index.js.backup index.js
cp api/mcprofile-api.js.backup api/mcprofile-api.js
cp ui/ui-manager.js.backup ui/ui-manager.js
cp net/network-manager.js.backup net/network-manager.js

# Server neu starten
```

---

## 📞 PROBLEME?

### Plugin lädt nicht
- Check: Ist `index-upgraded.js` als `index.js` importiert?
- Check: Alle 4 Dateien in richtigen Verzeichnissen?
- Check: Sind alte Imports korrekt aktualisiert?

### Keine Profildaten
- Check: Ist der Player Admin? (Tag prüfen)
- Check: API ist online? (Health Check in Logs)
- Check: Ist XUID korrekt? (32+ Zeichen)
- Check: Cache TTL nicht abgelaufen?

### Logging nicht detailliert
- Set `logging.level` zu `debug`
- Run `/mcprofile-reload`
- Player lässt neu joinen

---

## 📈 STATISTIKEN

Nach Upgrade siehst du in Logs:

```
[NET] Network Stats:
  Total Requests: 45
  Successful: 44 (97.78%)
  Failed: 1 (2.22%)
  Avg Response: 235ms

[CACHE] Cache Stats:
  Size: 12 profiles
  Hit Rate: 93.95%
  Evictions: 0
```

---

## 🎉 THAT'S IT!

Das Plugin läuft jetzt **VOLLAUTOMATISCH** mit:
- ✅ **Automatischen Profilabfragen beim Join**
- ✅ **Echten Daten statt Placeholders**
- ✅ **Detaillierten Konsolen-Logs**
- ✅ **Server-Net & Server-UI Integration**
- ✅ **Admin-Only Filtern**

Genießen! 🚀

---

**Version:** 2.0.0 UPGRADED
**Status:** ✅ Production Ready
**Last Updated:** November 21, 2025
