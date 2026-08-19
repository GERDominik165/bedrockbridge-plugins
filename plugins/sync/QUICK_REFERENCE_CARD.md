# ⚡ QUICK REFERENCE CARD - V9.0
## Essential Commands & Operations at a Glance

---

## 🚀 STARTING THE SYSTEM

### Terminal 1: Node.js Backend
```bash
cd D:\BB\bridgePlugins\sync
npm start

# Expected output:
# ✅ API Server running on http://localhost:3001
# ✅ Ready for Minecraft connections
```

### Terminal 2: Minecraft Server
```bash
# Start your normal Minecraft Bedrock server
# Should load ABSOLUTE_COMPLETE_SYSTEM.js automatically

# Watch for:
# ✅ SYSTEM FULLY OPERATIONAL
```

---

## 🎮 MINECRAFT COMMANDS

### Basic Commands
| Command | Effect |
|---------|--------|
| `/sync save` | Save current inventory |
| `/sync load` | Load last saved inventory |
| `/sync status` | Show current status |
| `/sync stats` | Show detailed statistics |
| `/sync logs` | Show system logs |
| `/sync form` | Show interactive menu |
| `/sync clear` | Clear current inventory |

### Admin Commands
| Command | Effect |
|---------|--------|
| `/sync admin info` | Show system info |
| `/sync admin reset` | Reset statistics |
| `/sync admin config` | Show configuration |

### Database Commands
| Command | Effect |
|---------|--------|
| `/sync dbread` | Show saved snapshots |
| `/sync dbinfo` | Show detailed info |
| `/sync dblogs` | Show operation logs |

---

## 🔧 CONFIGURATION QUICK EDITS

### API URL (if not localhost)
**File**: `ABSOLUTE_COMPLETE_SYSTEM.js`
```javascript
api: {
  baseUrl: "http://localhost:3001",  // Change here
  timeout: 30,
  retries: 3
}
```

### Sync Interval (auto-sync frequency)
**File**: `ABSOLUTE_COMPLETE_SYSTEM.js`
```javascript
sync: {
  autoSyncInterval: 300,  // Change 300 = 15 seconds
}
```

### Database Credentials
**File**: `.env`
```
DB_HOST=db.pavl21.de
DB_USER=s2654_bedrock
DB_PASSWORD=YOUR_PASSWORD_HERE
```

---

## 💾 MYSQL QUICK QUERIES

### Check if data is saving
```sql
mysql -h db.pavl21.de -u s2654_bedrock -p s2654_bedrock_sync

-- Count all saves
SELECT COUNT(*) FROM player_inventories;

-- Show latest saves
SELECT player_name, capture_time FROM player_inventories
ORDER BY capture_time DESC LIMIT 5;

-- Check success rate
SELECT status, COUNT(*) FROM transaction_logs GROUP BY status;
```

### Check specific player
```sql
SELECT * FROM player_inventories
WHERE player_name = 'PlayerName'
ORDER BY capture_time DESC LIMIT 1;
```

### Verify tables exist
```sql
SHOW TABLES;
-- Should show 6 tables
```

---

## 🐛 TROUBLESHOOTING QUICK FIXES

| Problem | Fix |
|---------|-----|
| **"ECONNREFUSED 127.0.0.1:3001"** | Node.js not running → Run `npm start` |
| **"ER_ACCESS_DENIED_ERROR"** | Wrong password → Check `.env` DB_PASSWORD |
| **"Cannot find module 'express'"** | Missing deps → Run `npm install` |
| **"Unknown database"** | DB doesn't exist → Create with `CREATE DATABASE...` |
| **Inventory not saving** | API down → Check Node.js is running |
| **Slow performance** | Database slow → Check MySQL server |
| **Server crashes** | Plugin error → Check ABSOLUTE_COMPLETE_SYSTEM.js syntax |

---

## 📊 PERFORMANCE TARGETS

| Metric | Target |
|--------|--------|
| Capture Inventory | 5-10ms |
| HTTP Request | 10-20ms |
| Database Save | 10-20ms |
| **Total per Player** | **35-50ms** |
| Success Rate | >95% |
| API Response | <100ms |

---

## 🔒 SECURITY CHECKLIST

- [ ] .env has strong API_KEY (32+ chars)
- [ ] .env NOT in git
- [ ] Port 3001 only on localhost
- [ ] Firewall blocks external access
- [ ] MySQL password NOT in code
- [ ] Regular database backups

---

## 📈 MONITORING ESSENTIALS

### What to watch in console
```
[API] ✅ Saved inventory for Player (45ms)      ← Good
[Health] ✅ System health: 100%                 ← Good
[API] ❌ Error: ECONNREFUSED                    ← Bad - restart Node.js
```

### Daily checks
- [ ] Check console for errors
- [ ] Verify `/sync stats` shows >95% success
- [ ] Monitor MySQL disk usage
- [ ] Check Node.js memory (should be <250MB)

---

## 📁 FILE LOCATIONS

```
D:\BB\bridgePlugins\sync\
├── ABSOLUTE_COMPLETE_SYSTEM.js   ← Main plugin
├── nodejs-api-server.js           ← Backend (run with npm start)
├── package.json                   ← Dependencies
├── .env                           ← Your config (KEEP SECURE)
└── node_modules/                 ← Installed packages
```

---

## 🆘 EMERGENCY PROCEDURES

### If system crashes:
```bash
# 1. Restart Node.js
Ctrl+C (in terminal)
npm start

# 2. Restart Minecraft server
# 3. Try sync again: /sync save
```

### If MySQL disconnects:
```bash
# 1. Check MySQL is running
# 2. Verify DB_HOST in .env
# 3. Restart Node.js: npm start
```

### If everything fails:
```bash
# 1. Backup .env file (has your passwords!)
# 2. Restore from backup
# 3. Run npm install again
# 4. Check logs for specific error
```

---

## 📞 DOCUMENTATION FILES

| Need | File |
|------|------|
| Overview | README_ABSOLUTE_COMPLETE_V9.md |
| Install | FINAL_INSTALLATION_VERIFICATION_GUIDE.md |
| Architecture | COMPLETE_SERVER_NET_SETUP.md |
| Database | DATABASE_READ_GUIDE.md |
| BedrockBridge | BEDROCKBRIDGE_ABSOLUTE_COMPLETE.md |
| File Index | SYSTEM_FILES_MANIFEST.md |

---

## ✅ VERIFICATION QUICK TEST

Run these in order:

```
1. /sync save
   Expected: "✅ Inventar gespeichert!"

2. Drop all items

3. /sync load
   Expected: Items reappear

4. /sync status
   Expected: Shows current status

5. /sync stats
   Expected: Shows success rate >95%

6. Check MySQL:
   mysql> SELECT COUNT(*) FROM player_inventories;
   Expected: Shows count
```

All 6 pass? ✅ **System is working!**

---

## 🎯 TYPICAL WORKFLOW

### Installation (First Time - 2 hours)
1. Read: `README_ABSOLUTE_COMPLETE_V9.md`
2. Follow: `FINAL_INSTALLATION_VERIFICATION_GUIDE.md`
3. Run: `npm install`
4. Edit: `.env` with your credentials
5. Start: `npm start`
6. Test: Run commands above

### Daily Operation (1 min/day)
1. Start: `npm start` (once)
2. Use: `/sync save` and `/sync load` in game
3. Monitor: Check console for errors

### Maintenance (Weekly)
1. Check: MySQL disk space
2. Review: `SELECT * FROM error_logs` (see if any)
3. Backup: Database tables
4. Update: Node.js if new version

### Troubleshooting (As needed)
1. Check: Console error messages
2. Search: `FINAL_INSTALLATION_VERIFICATION_GUIDE.md` troubleshooting
3. Query: Database to verify data
4. Test: `/sync` commands manually

---

## 🚀 DEPLOYMENT OPTIONS

### Local (Easy)
```bash
npm start  # One terminal
```

### Windows Service (Permanent)
```bash
nssm install SyncAPI "C:\Program Files\nodejs\node.exe" "path\nodejs-api-server.js"
nssm start SyncAPI
```

### Docker (Best)
```bash
docker build -t sync-api .
docker run -p 3001:3001 --env-file .env sync-api
```

### PM2 (Recommended)
```bash
npm install -g pm2
pm2 start nodejs-api-server.js --name "SyncAPI"
pm2 startup
pm2 save
```

---

## 📋 COMPONENT STATUS CHECK

All 20 components should show ✅:

1. ✅ Core Sync Engine
2. ✅ HTTP Client (@minecraft/server-net)
3. ✅ Database Manager
4. ✅ Logger System
5. ✅ Inventory Manager (51 slots)
6. ✅ Item Serializer
7. ✅ Player Manager
8. ✅ World Manager
9. ✅ Dimension Manager
10. ✅ Event System
11. ✅ Command Handler
12. ✅ UI Forms
13. ✅ Statistics Engine
14. ✅ Health Monitor
15. ✅ Network Monitoring
16. ✅ Performance Profiler
17. ✅ Error Recovery
18. ✅ Backup System
19. ✅ Cache Manager
20. ✅ Config Manager

Check: `npm start` console should show all initialized ✅

---

## 🎓 LEARNING PATH

**Never used before?**
1. Read this card (5 min)
2. Read README (30 min)
3. Follow installation guide (2 hours)

**Already installed?**
1. Use this card (quick reference)
2. Check FINAL_INSTALLATION_VERIFICATION_GUIDE for troubleshooting

**Need deep dive?**
1. Read COMPLETE_SERVER_NET_SETUP.md (architecture)
2. Read source code (ABSOLUTE_COMPLETE_SYSTEM.js)
3. Read nodejs-api-server.js

---

## 🔗 NEXT STEPS

1. **First Time**: Follow `FINAL_INSTALLATION_VERIFICATION_GUIDE.md`
2. **During Use**: Reference `README_ABSOLUTE_COMPLETE_V9.md`
3. **Problem Solving**: Check `FINAL_INSTALLATION_VERIFICATION_GUIDE.md` troubleshooting
4. **Deep Dive**: Read `COMPLETE_SERVER_NET_SETUP.md`
5. **Database Queries**: See `DATABASE_READ_GUIDE.md`

---

**Version**: 9.0.0
**Status**: ✅ Production Ready
**Last Updated**: 2025-11-14

**Everything you need on one page.** 📄
