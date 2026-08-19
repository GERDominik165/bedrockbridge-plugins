# MCProfile Plugin - Quick Start Guide

Get the MCProfile plugin up and running in 5 minutes!

## ⚡ 5-Minute Setup

### 1. Create Directory (30 seconds)
```bash
mkdir -p D:\BB\bridgePlugins\mcprofile
cd D:\BB\bridgePlugins\mcprofile
```

### 2. Copy Files (1 minute)
Copy all plugin files from the mcprofile folder to `D:\BB\bridgePlugins\mcprofile\`

### 3. Configure (1 minute)
```bash
# Edit config file (optional, uses defaults)
vi config/settings.json
```

### 4. Enable in Bridge (1 minute)
Add to your Bedrock Bridge `addons.js`:
```javascript
import mcProfilePlugin from '../bridgePlugins/mcprofile/index.js';
```

### 5. Start Server (1 minute)
Start your Bedrock Bridge server and watch for:
```
MCProfile v2.0.0 initialized successfully
```

## 🎮 First Use

### As Admin User:

1. **Add Admin Tag**
```
/tag @s add admin
```

2. **Query a Profile**
```
/mcprofile 25332248730d7792
```

3. **See Profile Info**
```
§6========== MCProfile Info ==========
§eGamertag: §fkobenetwork
§eXUID: §f25332248730d7792
...
```

### Useful Commands:

| Command | What it does |
|---------|-------------|
| `/mcprofile 25332248730d7792` | Show profile by XUID |
| `/mcprofile-info` | Show plugin version & status |
| `/mcprofile-cache stats` | Show cache statistics |
| `/mcprofile-cache clear` | Clear all cached profiles |
| `/mcprofile-reload` | Reload configuration |

## 📋 Verification

Check that everything works:

```bash
# 1. Server logs should show:
# "MCProfile v2.0.0 initialized successfully"

# 2. Run test script (optional):
python3 scripts/mcprofile-api-tester.py

# 3. In game as admin:
/mcprofile-info

# Should see version 2.0.0 and status
```

## ⚙️ Basic Configuration

Most features work out-of-the-box. To customize:

```json
{
  "api": {
    "endpoint": "https://api.mcprofile.io",
    "timeout": 10000
  },
  "admin": {
    "showProfileOnJoin": true
  },
  "logging": {
    "level": "info"
  }
}
```

## 🚀 Advanced (Optional)

### Use Production Config
```bash
python3 scripts/profile-config-generator.py production
```

### Test API Connectivity
```bash
python3 scripts/mcprofile-api-tester.py
```

### View Logs
```
# In server console, check for MCProfile messages
# Or check logger:
plugin.logger.getHistory({ limit: 50 })
```

## 🎯 What Happens When a Player Joins

```
Regular Player ──► Normal join message

Admin User ──────► ✓ Profile fetched from MCProfile API
                  ✓ Profile displayed in chat
                  ✓ UI form shown (if enabled)
                  ✓ Access logged for audit
```

## 📱 Common Tasks

### Add More Admins
```
/tag @s add admin
```

### Query by Different ID Types
```
# By Floodgate UUID
/mcprofile 00000000-0000-0000-0009-000004ed8eb0

# By Java UUID
/mcprofile cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee

# By username
/mcprofile kobenetwork
```

### Check Cache Status
```
/mcprofile-cache stats
```

Output shows:
- Number of cached profiles
- Cache hit rate
- Evictions count

### Clear Old Profiles from Cache
```
/mcprofile-cache clear
```

## 🔍 Troubleshooting Quick Fixes

### Plugin Not Loading?
1. Check console for errors
2. Verify `config/settings.json` is valid
3. Check file permissions

### Admin Can't See Profiles?
1. Verify admin has tag: `/tag @s list`
2. Add tag if needed: `/tag @s add admin`
3. Make sure `admin.showProfileOnJoin: true` in config

### API Not Responding?
1. Test: `python3 scripts/mcprofile-api-tester.py`
2. Increase timeout: `"timeout": 15000`
3. Check internet connection

### Cache Issues?
1. Clear cache: `/mcprofile-cache clear`
2. Reduce TTL: `"ttl": 300` (5 minutes)
3. Check cache stats: `/mcprofile-cache stats`

## 📚 Next Steps

- Read [README.md](README.md) for detailed documentation
- Check [INSTALLATION.md](INSTALLATION.md) for advanced setup
- Review [API_REFERENCE.md](API_REFERENCE.md) for API details
- Explore [scripts/](scripts/) for utilities

## 🎓 Learning Path

**Day 1:** ✓ Get it working (this guide)
**Day 2:** Configure for your needs (README.md)
**Day 3:** Monitor and optimize (Advanced sections)
**Day 4+:** Integrate with other systems

## 💡 Pro Tips

1. **Use Production Config on Live Servers**
   ```bash
   python3 scripts/profile-config-generator.py production
   ```

2. **Monitor with Logging**
   ```json
   {
     "logging": {
       "level": "debug",
       "enableFile": true
     }
   }
   ```

3. **Optimize Cache for Large Servers**
   ```json
   {
     "cache": {
       "ttl": 7200,
       "maxSize": 5000
     }
   }
   ```

4. **Rate Limiting for Security**
   ```json
   {
     "security": {
       "rateLimit": 100
     }
   }
   ```

## 🆘 Get Help

1. Check [README.md#Troubleshooting](README.md#-troubleshooting) section
2. Review log files in console
3. Run: `python3 scripts/mcprofile-api-tester.py`
4. Check API connectivity manually

## ✅ Success Checklist

- [ ] Plugin directory created
- [ ] Files copied successfully
- [ ] Configuration loaded
- [ ] Bridge recognizes plugin
- [ ] Server starts without errors
- [ ] Admin can query profiles
- [ ] Profile data displays correctly
- [ ] Cache working (optional test)

---

**You're all set! Enjoy MCProfile integration!** 🎉

For more details, see [README.md](README.md)
