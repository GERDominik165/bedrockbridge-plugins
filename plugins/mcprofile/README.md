# MCProfile Integration Plugin for Bedrock Bridge

**Version:** 2.0.0
**Author:** KobeNetwork Development Team
**License:** MIT

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [API Integration](#api-integration)
7. [Commands](#commands)
8. [Architecture](#architecture)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## 🎯 Overview

The MCProfile Integration Plugin is a comprehensive Bedrock Bridge addon that seamlessly integrates with the [MCProfile.io](https://mcprofile.io/) API to retrieve and display player profile information. This plugin is specifically designed to show player profiles exclusively to administrators with the "admin" tag when they join the server.

### Key Capabilities

- **Real-time Profile Retrieval**: Fetch player profiles from MCProfile.io API
- **Admin-Only Access**: Display profiles only to users with admin permissions
- **Intelligent Caching**: Reduce API calls with smart caching system
- **Multiple Lookup Methods**: Support XUID, Floodgate UID, Java UUID, and Gamertag lookups
- **Server-Net Integration**: Native HTTP communication with full error handling
- **Server-UI System**: Beautiful admin notifications and UI forms
- **Comprehensive Logging**: Full audit trail of all operations
- **Command Registry**: Custom admin commands with permission validation

---

## ✨ Features

### 1. **API Integration**
- ✅ XUID lookup (`/api/v1/bedrock/xuid/{xuid}`)
- ✅ Floodgate UID lookup (`/api/v1/bedrock/fuid/{fuid}`)
- ✅ Java UUID lookup (`/api/v1/java/uuid/{uuid}`)
- ✅ Profile data caching with TTL
- ✅ Automatic retry logic with exponential backoff
- ✅ Request timeout handling

### 2. **Admin Management**
- ✅ Tag-based permission system
- ✅ Role hierarchy (Owner > Admin > Moderator > Helper > Member)
- ✅ Custom admin tag validation
- ✅ Admin-only profile visibility
- ✅ Audit logging for all admin actions

### 3. **Caching System**
- ✅ LRU (Least Recently Used) eviction
- ✅ Configurable TTL (Time To Live)
- ✅ Cache statistics and monitoring
- ✅ Automatic cleanup on player leave
- ✅ Memory-efficient storage

### 4. **Event Handling**
- ✅ Player join event monitoring
- ✅ Player leave event handling
- ✅ Chat message interception
- ✅ Custom event emission system
- ✅ Event history tracking

### 5. **User Interface**
- ✅ Admin dashboard with statistics
- ✅ Profile information forms
- ✅ Settings panel
- ✅ Notification system
- ✅ Error dialogs with user feedback

### 6. **Command System**
- ✅ `/mcprofile <identifier>` - Query player profile
- ✅ `/mcprofile-reload` - Reload configuration
- ✅ `/mcprofile-cache [clear|stats]` - Manage cache
- ✅ `/mcprofile-info` - Display plugin information
- ✅ Permission-based command execution

### 7. **Logging & Monitoring**
- ✅ Multi-level logging (error, warn, info, debug, trace)
- ✅ Request/response logging
- ✅ Performance monitoring
- ✅ Network statistics
- ✅ Log export functionality

---

## 📦 Installation

### Prerequisites
- Bedrock Edition Server with Bridge enabled
- Node.js 14+ (for Python scripts)
- Access to MCProfile.io API

### Installation Steps

1. **Create Plugin Directory**
```bash
mkdir -p D:\BB\bridgePlugins\mcprofile
cd D:\BB\bridgePlugins\mcprofile
```

2. **Copy Plugin Files**
```bash
# Copy all plugin files from source
cp -r * D:\BB\bridgePlugins\mcprofile\
```

3. **Install Dependencies** (if using actual network requests)
```bash
npm install axios  # or your preferred HTTP client
```

4. **Configure Plugin**
```bash
# Edit configuration file
vi config/settings.json
```

5. **Enable Plugin in Bridge**
```javascript
// In your bridge configuration
import mcProfilePlugin from './bridgePlugins/mcprofile/index.js';
```

6. **Restart Server**
```bash
# Server will load the plugin on startup
```

---

## ⚙️ Configuration

### Configuration File Structure

**Location:** `config/settings.json`

```json
{
  "api": {
    "endpoint": "https://api.mcprofile.io",
    "timeout": 10000,
    "retries": 3,
    "enabled": true
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "maxSize": 1000,
    "cleanupOnLeave": true
  },
  "admin": {
    "tags": ["admin", "operator", "owner"],
    "showProfileOnJoin": true,
    "notifyAdminsOnJoin": true,
    "logProfileAccess": true
  },
  "ui": {
    "enabled": true,
    "showOnJoin": true,
    "useActionForm": true,
    "theme": "default"
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "maxHistory": 1000,
    "enableConsole": true,
    "enableFile": false
  }
}
```

### Configuration Profiles

#### Development Profile
```bash
python3 scripts/profile-config-generator.py development
```
- **TTL:** 5 minutes
- **Log Level:** DEBUG
- **File Logging:** Enabled
- **Analytics:** Enabled

#### Production Profile
```bash
python3 scripts/profile-config-generator.py production
```
- **TTL:** 2 hours
- **Log Level:** WARNING
- **Cache Size:** 5000
- **Rate Limit:** 1000 req/min

#### High-Performance Profile
```bash
python3 scripts/profile-config-generator.py high-performance
```
- **TTL:** 3 hours
- **API Timeout:** 5 seconds
- **Retries:** 2
- **Cache Size:** 10000

---

## 🚀 Usage

### Player Join Event

When a player joins the server:

1. **Regular Player**
   - No profile information displayed
   - Standard join message

2. **Admin User** (has 'admin' tag)
   - Profile automatically fetched from MCProfile API
   - Displayed via admin notifications
   - UI form shown if enabled
   - Event logged for audit trail

### Example Flow

```
Player joins server
    ↓
Plugin detects player join event
    ↓
Check if player has 'admin' tag
    ↓
[YES] Fetch profile from MCProfile API
    ↓
Check cache first (if enabled)
    ↓
[CACHE HIT] Return cached profile
    [CACHE MISS] API request with retry logic
    ↓
Validate response structure
    ↓
Display profile to admin
    ↓
Show UI form (if enabled)
    ↓
Log access to audit trail
    ↓
Cache profile for future use
```

### Admin Commands

#### 1. Query Player Profile
```
/mcprofile <identifier>
```

**Examples:**
```
/mcprofile 25332248730d7792              # By XUID
/mcprofile 00000000-0000-0000-0009-000004ed8eb0  # By Floodgate UID
/mcprofile cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee # By Java UUID
/mcprofile kobenetwork                   # By Gamertag
/mcprofile jensco                        # By Java name
```

#### 2. Reload Configuration
```
/mcprofile-reload
```
Reloads configuration from `settings.json` file without restarting the plugin.

#### 3. Manage Cache
```
/mcprofile-cache stats    # Show cache statistics
/mcprofile-cache clear    # Clear entire cache
```

#### 4. Plugin Information
```
/mcprofile-info
```
Displays plugin version, API endpoint, and feature status.

---

## 🔌 API Integration

### MCProfile.io API Endpoints

#### Bedrock XUID Lookup
```http
GET /api/v1/bedrock/xuid/{xuid}
```

**Response:**
```json
{
  "gamertag": "kobenetwork",
  "xuid": "25332248730d7792",
  "floodgateuid": "00000000-0000-0000-0009-000004ed8eb0",
  "icon": "https://images-eds-ssl.xboxlive.com/image?url=...",
  "gamescore": "14895",
  "accounttier": "Silver",
  "textureid": "5006a1a7340",
  "skin": "https://textures.minecraft.net/texture/5006a1a7340",
  "linked": true,
  "java_uuid": "cb7a4c0c-a7cd-4846-8bdf-477de8f5f3ee",
  "java_name": "jensco"
}
```

#### Bedrock Floodgate UID Lookup
```http
GET /api/v1/bedrock/fuid/{fuid}
```

**Response:** Same as XUID endpoint

#### Java UUID Lookup
```http
GET /api/v1/java/uuid/{uuid}
```

**Response:**
```json
{
  "username": "jensco",
  "uuid": "cb7a4c0c-a7cd-4846-8c6f-477de8f5d3ee",
  "skin": "http://textures.minecraft.net/texture/123",
  "cape": "http://textures.minecraft.net/texture/123",
  "linked": true,
  "bedrock_gamertag": "kobenetwork",
  "bedrock_xuid": 2533224873007792,
  "bedrock_fuid": "00000000-0000-0000-0009-000004ed8eb0"
}
```

### Error Handling

The plugin handles various API errors:

| Error Type | Status Code | Handling |
|-----------|------------|----------|
| Invalid Input | 400 | User message + logging |
| Not Found | 404 | Graceful fallback |
| Rate Limited | 429 | Automatic retry with backoff |
| Server Error | 5xx | Retry logic + user notification |
| Timeout | - | Retry with exponential backoff |

---

## 📝 Commands Reference

### Admin Commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/mcprofile <id>` | admin | Query player profile |
| `/mcprofile-reload` | owner | Reload configuration |
| `/mcprofile-cache clear` | admin | Clear cache |
| `/mcprofile-cache stats` | admin | Show cache statistics |
| `/mcprofile-info` | helper | Display plugin info |

### Chat Commands

| Command | Usage |
|---------|-------|
| `!profile <name>` | Query profile in chat |

---

## 🏗️ Architecture

### Directory Structure

```
D:\BB\bridgePlugins\mcprofile\
├── index.js                          # Main plugin entry point
├── README.md                         # This file
├── config/
│   └── settings.json                # Configuration file
├── api/
│   └── mcprofile-api.js             # API client
├── core/
│   ├── cache.js                     # Caching system
│   ├── admin-filter.js              # Permission management
│   ├── event-handler.js             # Event system
│   ├── command-registry.js          # Command system
│   ├── logger.js                    # Logging system
│   └── config-manager.js            # Configuration management
├── net/
│   └── network-manager.js           # Network/HTTP handling
├── ui/
│   └── ui-manager.js                # UI components
└── scripts/
    ├── mcprofile-api-tester.py      # API testing script
    └── profile-config-generator.py  # Config generation script
```

### Class Hierarchy

```
MCProfilePlugin (Main)
  ├── ConfigManager
  ├── Logger
  ├── ProfileCache
  ├── MCProfileAPI
  │   └── NetworkManager
  ├── AdminFilter
  ├── EventHandler
  ├── CommandRegistry
  └── UIManager
```

### Module Responsibilities

| Module | Responsibility |
|--------|-----------------|
| `index.js` | Plugin initialization & orchestration |
| `MCProfileAPI` | API communication & response parsing |
| `ProfileCache` | Caching with LRU eviction |
| `AdminFilter` | Permission checking & tag validation |
| `EventHandler` | Game event subscription & emission |
| `CommandRegistry` | Command registration & execution |
| `Logger` | Multi-level logging & audit trail |
| `ConfigManager` | Configuration loading & validation |
| `NetworkManager` | HTTP requests & connection pooling |
| `UIManager` | UI forms & notifications |

---

## 🔍 Monitoring & Logging

### Log Levels

```
ERROR (0)   - Critical errors only
WARN (1)    - Warnings and errors
INFO (2)    - General information [DEFAULT]
DEBUG (3)   - Detailed debugging info
TRACE (4)   - Very detailed tracing
```

### Viewing Logs

```javascript
// Get recent logs
const logs = plugin.logger.getHistory({ limit: 50 });

// Get logs by level
const errors = plugin.logger.getHistory({ level: 'error' });

// Export logs
const exported = plugin.logger.exportLogs();
```

### Performance Metrics

```javascript
// Cache statistics
const cacheStats = plugin.cache.getStats();
console.log(cacheStats);
// Output:
// {
//   size: 45,
//   maxSize: 1000,
//   ttl: 3600,
//   hits: 234,
//   misses: 15,
//   hitRate: '93.95',
//   evictions: 2
// }

// Network statistics
const netStats = plugin.networkManager.getStats();
// Output:
// {
//   totalRequests: 100,
//   successfulRequests: 98,
//   failedRequests: 2,
//   successRate: '98.00',
//   activeRequests: 0,
//   queuedRequests: 0
// }
```

---

## 🐛 Troubleshooting

### Issue: Plugin Not Loading

**Symptoms:**
- Plugin not showing in `/mcprofile-info`
- No messages from plugin on startup

**Solutions:**
1. Check Bedrock Bridge is properly loaded
2. Verify plugin path is correct
3. Check `config/settings.json` is valid JSON
4. Review console logs for errors
5. Ensure Node.js/Minecraft compatibility

### Issue: API Not Responding

**Symptoms:**
- "Could not retrieve profile data" messages
- API timeout errors in logs

**Solutions:**
1. Verify internet connection
2. Check API endpoint in config
3. Increase timeout value: `api.timeout: 15000`
4. Increase retries: `api.retries: 5`
5. Test API manually:
   ```bash
   python3 scripts/mcprofile-api-tester.py
   ```

### Issue: Cache Growing Too Large

**Symptoms:**
- High memory usage
- Slow plugin performance

**Solutions:**
1. Reduce cache TTL: `cache.ttl: 1800` (30 min)
2. Reduce cache size: `cache.maxSize: 500`
3. Enable cleanup on leave: `cache.cleanupOnLeave: true`
4. Clear cache manually: `/mcprofile-cache clear`

### Issue: Admin Can't See Profiles

**Symptoms:**
- Profiles only show for some admins
- "You don't have permission" messages

**Solutions:**
1. Verify admin has correct tag:
   ```
   /tag @s add admin
   ```
2. Check admin tag in config: `admin.tags: ["admin", ...]`
3. Verify `admin.showProfileOnJoin` is true
4. Check plugin logs for permission errors

---

## 📊 Statistics & Monitoring

### Get Plugin Status

```javascript
const status = plugin.getStatus();
// Returns:
// {
//   name: "MCProfile",
//   version: "2.0.0",
//   enabled: true,
//   cacheSize: 45,
//   uptime: 120000 (ticks)
// }
```

### Monitor Real-Time Data

```javascript
// Cache stats
console.log(plugin.cache.getStats());

// Network stats
console.log(plugin.networkManager.getStats());

// Command stats
console.log(plugin.commandRegistry.getStats());

// Logger stats
console.log(plugin.logger.getStats());
```

---

## 🔒 Security Considerations

### Best Practices

1. **Always use HTTPS** - API communication is encrypted
2. **Validate Admin Tags** - Only users with 'admin' tag can see profiles
3. **Rate Limiting** - Default 100 req/min, increase cautiously
4. **API Key Security** - If using API keys, store securely
5. **Log Rotation** - Implement log rotation for large servers
6. **SSL Verification** - Enable `security.enforceSSL: true`

### Permission Model

```
Level 5: Owner
  └─ All commands
  └─ Config reload

Level 4: Admin
  └─ Profile queries
  └─ Cache management

Level 3: Moderator
  └─ View cache stats

Level 2: Helper
  └─ Plugin info only

Level 1: Member
  └─ No access

Level 0: Guest
  └─ No access
```

---

## 🔧 Advanced Configuration

### Custom API Endpoint

```json
{
  "api": {
    "endpoint": "https://your-mcprofile-mirror.com",
    "timeout": 10000,
    "retries": 3
  }
}
```

### Production Environment

```bash
python3 scripts/profile-config-generator.py production
```

This generates:
- Higher cache TTL (2 hours)
- Larger cache size (5000)
- Reduced logging (WARN level)
- Higher rate limits (1000 req/min)

---

## 📚 API Testing

### Run Tests

```bash
python3 scripts/mcprofile-api-tester.py
```

### Test Results

The tester validates:
- ✅ XUID endpoint functionality
- ✅ Floodgate UID endpoint
- ✅ Java UUID endpoint
- ✅ Response structure validation
- ✅ Error handling
- ✅ Rate limiting
- ✅ API health

---

## 🤝 Contributing

### Code Style
- Use ES6+ JavaScript
- Follow Bedrock Bridge conventions
- Add JSDoc comments
- Include error handling

### Adding Features
1. Update plugin version in `index.js`
2. Add new feature to appropriate module
3. Update configuration in `config/settings.json`
4. Document in README.md
5. Test thoroughly

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review logs: `/mcprofile-cache stats`
- Test API: `python3 scripts/mcprofile-api-tester.py`
- Check MCProfile.io documentation

---

## 🎉 Version History

### v2.0.0 (Current)
- Complete MCProfile API integration
- Admin-only profile visibility
- Comprehensive caching system
- Event handling system
- Command registry with permissions
- Server-Net integration
- Server-UI notifications
- Multi-level logging
- Configuration management
- Python testing utilities

### v1.0.0
- Initial release
- Basic API integration

---

**Last Updated:** November 2025
**Maintained By:** KobeNetwork Development Team
