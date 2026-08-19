# Quick Start Guide - Server-Net Plugin

## 30 Second Setup

1. **Copy folder**: The `net` folder is already in `D:\BB\bridgePlugins\`
2. **Grant admin**: `/tag @s add admin` (as operator)
3. **Test**: `/execute` chat command `!dashboard` in-game

## Your First Commands

### Open Dashboard
```
!dashboard
```
Opens the professional control panel with all features.

### Send a GET Request
```
!http get https://api.github.com/users/github
```

### Check Status
```
!http stats
```

### Get Help
```
!nethelp
```

## Key Features at a Glance

| Feature | What It Does |
|---------|-------------|
| **!dashboard** | Open interactive control panel |
| **!http get URL** | Send HTTP GET request |
| **!http post URL data** | Send HTTP POST request |
| **!http stats** | View statistics |
| **!http status** | Quick status check |
| **!netstatus** | Compact status display |

## What's Happening Behind the Scenes

### Automatic Features
✅ **Smart Queue** - Processes 5 requests at a time automatically
✅ **Auto-Retry** - Failed requests retry up to 3 times
✅ **Smart Cache** - Responses cached for 1 hour by default
✅ **Logging** - All requests logged with timestamps
✅ **Health Monitoring** - System health tracked in real-time

### You Get These Capabilities
- 🌐 HTTP requests (GET, POST, PUT, DELETE)
- 📊 Real-time statistics and metrics
- 📝 Full request history with details
- 🔒 Admin-only access control
- ⚙️ Fully configurable settings
- 💾 LRU caching with TTL
- 📋 Professional UI dashboard
- 🔄 Automatic queue management

## Dashboard Tour (30 seconds)

### Main Menu
```
┌─ Server-Net Dashboard ─┐
├─ 📊 Statistics        ←─ View overall metrics
├─ 📋 Queue Status      ←─ Monitor requests
├─ 📝 Request History   ←─ Recent requests
├─ ⚙️  HTTP Test        ←─ Test endpoints
└─ 🔴 Settings         ←─ Configure
```

### Statistics View
```
Total Requests: 42
Successful: 39 (92%)
Failed: 3 (7%)
Avg Response: 234ms
Active: 0
Queued: 0
```

### Queue Status View
```
Active Requests: 0
Queued: 0
Max Concurrent: 5
Active: 0 / 5
[Cancel All] button if requests pending
```

### Request History View
```
✓ [GET] https://api.github.com... (145ms)
✓ [POST] https://api.example.com... (89ms)
✗ [GET] https://timeout.api.com... (timeout)
```

## Configuration - The Easy Way

Edit `D:\BB\bridgePlugins\net\config\settings.json`

### Common Adjustments

**Increase timeout for slow APIs:**
```json
"api": {
  "timeout": 20000  // 20 seconds instead of 10
}
```

**More concurrent requests:**
```json
"api": {
  "maxConcurrentRequests": 10  // 10 instead of 5
}
```

**Disable caching:**
```json
"cache": {
  "enabled": false
}
```

**More verbose logging:**
```json
"logging": {
  "level": "debug"  // More detailed logs
}
```

## Common Tasks

### Task 1: Test an API
```
!dashboard
→ Select "HTTP Test"
→ Choose method (GET/POST)
→ Enter URL
→ See result instantly
```

### Task 2: Check if System is Healthy
```
!netstatus
```
Shows: Health level, Success rate, Active requests

### Task 3: View Request History
```
!dashboard
→ Select "Request History"
→ See last 20 requests with status
→ Optional: Clear history
```

### Task 4: Check Statistics
```
!http stats
```
Shows: Total, Success, Failed, Success rate, Avg response time

### Task 5: Cancel All Requests
```
!dashboard
→ Queue Status
→ Cancel All
```

## Troubleshooting

### Commands Not Working?
**Check 1:** Do you have admin tag?
```
/tag @s add admin
```

**Check 2:** Use correct format
```
✓ !http get https://api.example.com
✗ !http get api.example.com (missing https://)
✗ http get https://... (missing !)
```

### Requests Timing Out?
In `settings.json`:
```json
"api": {
  "timeout": 15000  // Increase from 10000
}
```

### Too Many Failures?
In `settings.json`:
```json
"api": {
  "retries": 5  // Retry more times
}
```

### Dashboard Won't Open?
1. Check you have admin tag: `/tag @s add admin`
2. Check console for errors
3. Try commands instead: `!http stats`

## Advanced: JavaScript Integration

Import the plugin in other scripts:

```javascript
import plugin from '@net';

// Send request
const id = plugin.requestManager.get('https://api.example.com/data');

// Get stats
const stats = plugin.requestManager.getStats();
console.log('Success rate:', stats.successCount / stats.totalRequests);

// Cache data
plugin.cache.set('mykey', { data: 'value' }, 3600);
```

## Performance Tips

### For High-Traffic Servers
- Increase `maxConcurrentRequests` to 10-15
- Reduce timeout to 5000ms for quick fail
- Enable caching for frequently accessed data

### For Low-Resource Servers
- Disable caching: `"cache": { "enabled": false }`
- Reduce max concurrent to 2-3
- Reduce log history

### For Development
- Set log level to "debug"
- Keep history high for debugging
- Use smaller timeouts to catch issues quickly

## Next Steps

1. **Read Full Docs**: Check `README.md` for complete API
2. **See Examples**: Check `EXAMPLES.md` for code samples
3. **Understand Architecture**: Read `ARCHITECTURE.md` for deep dive
4. **Configure**: Customize `settings.json` to your needs
5. **Integrate**: Use in your other plugins/scripts

## File Structure Reference

```
D:\BB\bridgePlugins\net\
├── index.js                 ← Main plugin
├── README.md               ← Full documentation
├── QUICKSTART.md          ← This file
├── ARCHITECTURE.md        ← Technical details
├── EXAMPLES.md            ← Code examples
├── config/
│   └── settings.json      ← Customize here
├── core/
│   ├── logger.js
│   ├── config-manager.js
│   └── cache.js
├── net/
│   ├── http-client.js
│   ├── request-queue.js
│   └── request-manager.js
└── ui/
    └── dashboard.js
```

## Cheat Sheet

```bash
# Commands Quick Reference
!dashboard               # Open UI
!http get URL           # GET request
!http post URL DATA     # POST request
!http stats            # Show stats
!http status           # Show health
!netstatus             # Quick status
!nethelp               # Show help

# Settings Quick Reference
api.timeout            # Request timeout (ms)
api.retries            # Retry count
api.maxConcurrentRequests  # Concurrent limit
cache.ttl              # Cache duration (seconds)
cache.maxSize          # Max cache entries
logging.level          # Log verbosity
```

## Common Patterns

### Pattern 1: Test an Endpoint
```
!http get https://your-api.com/health
→ Check !http stats for result
```

### Pattern 2: Monitor System Health
```
Every minute check: !netstatus
Look for: Health level and Success Rate
```

### Pattern 3: Debug Failed Requests
```
!dashboard
→ Request History
→ Find failed request
→ Check !http stats for error details
```

### Pattern 4: Optimize Performance
```
1. Check current stats: !http stats
2. Open dashboard: !dashboard
3. Settings → API Settings
4. Adjust timeout/retries
5. Verify with !netstatus
```

## Support Resources

| What | Where |
|------|-------|
| **Full API** | README.md |
| **Code Examples** | EXAMPLES.md |
| **Technical Details** | ARCHITECTURE.md |
| **Settings** | config/settings.json |
| **Logs** | !dashboard → Settings → View Logs |

## Getting Help

1. **In-Game Help**: `/help !nethelp`
2. **Read Docs**: Start with README.md
3. **Check Examples**: See EXAMPLES.md for patterns
4. **View Logs**: !dashboard → Settings → View Logs
5. **Review Config**: Check settings.json

## You're Ready! 🚀

Start with:
```
!dashboard
```

Explore the UI, test with !http commands, and check the documentation when you need more details.

Happy networking! 🌐
