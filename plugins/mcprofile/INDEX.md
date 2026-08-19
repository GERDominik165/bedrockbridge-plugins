# MCProfile Plugin - Documentation Index

**Version:** 2.0.0 | **Status:** ✅ Production Ready

---

## 📑 Quick Navigation

### Getting Started 🚀
1. **[QUICKSTART.md](QUICKSTART.md)** ⭐ START HERE
   - 5-minute setup guide
   - Basic commands
   - First-time verification
   - ~150 lines

2. **[INSTALLATION.md](INSTALLATION.md)**
   - Detailed installation steps
   - Configuration setup
   - Troubleshooting
   - ~300 lines

### Documentation 📚
3. **[README.md](README.md)** - COMPREHENSIVE GUIDE
   - Feature overview
   - Usage examples
   - Command reference
   - Architecture documentation
   - Monitoring & logging
   - Security considerations
   - ~500+ lines

4. **[API_REFERENCE.md](API_REFERENCE.md)**
   - MCProfile.io API endpoints
   - Request/response formats
   - Error codes
   - Integration examples
   - ~200 lines

### Reference 📖
5. **[SUMMARY.md](SUMMARY.md)**
   - Complete project overview
   - Feature checklist
   - Architecture overview
   - Statistics
   - ~300 lines

6. **[CHANGELOG.md](CHANGELOG.md)**
   - Version history
   - New features
   - Bug fixes
   - Migration guides
   - ~100 lines

7. **[LICENSE](LICENSE)** - MIT License

---

## 📁 File Structure Guide

```
D:\BB\bridgePlugins\mcprofile\
│
├── 📋 DOCUMENTATION FILES
│   ├── README.md                 ← Comprehensive guide
│   ├── QUICKSTART.md             ← Start here (5 min)
│   ├── INSTALLATION.md           ← Detailed setup
│   ├── API_REFERENCE.md          ← API documentation
│   ├── CHANGELOG.md              ← Version history
│   ├── SUMMARY.md                ← Project overview
│   ├── INDEX.md                  ← This file
│   └── LICENSE                   ← MIT License
│
├── 💻 SOURCE CODE
│   ├── index.js                  ← Main plugin (300+ lines)
│   ├── package.json              ← NPM configuration
│   │
│   ├── 📁 api/
│   │   └── mcprofile-api.js      ← API client (200+ lines)
│   │
│   ├── 📁 core/
│   │   ├── cache.js              ← Caching (150+ lines)
│   │   ├── admin-filter.js       ← Permissions (150+ lines)
│   │   ├── event-handler.js      ← Events (100+ lines)
│   │   ├── command-registry.js   ← Commands (150+ lines)
│   │   ├── logger.js             ← Logging (150+ lines)
│   │   └── config-manager.js     ← Config (200+ lines)
│   │
│   ├── 📁 net/
│   │   └── network-manager.js    ← HTTP (150+ lines)
│   │
│   ├── 📁 ui/
│   │   └── ui-manager.js         ← UI (200+ lines)
│   │
│   ├── 📁 config/
│   │   └── settings.json         ← Configuration
│   │
│   └── 📁 scripts/
│       ├── mcprofile-api-tester.py      ← API tester
│       └── profile-config-generator.py  ← Config tool
```

---

## 🎯 How to Use This Documentation

### I'm New - Where Do I Start?
1. Read [QUICKSTART.md](QUICKSTART.md) (5 minutes)
2. Follow [INSTALLATION.md](INSTALLATION.md) step-by-step
3. Check the verification checklist
4. Start using the plugin

### I Want Full Details
1. Read [README.md](README.md) - Complete guide
2. Review [API_REFERENCE.md](API_REFERENCE.md) for API details
3. Check [SUMMARY.md](SUMMARY.md) for architecture
4. Look at specific modules in `api/`, `core/`, `net/`, `ui/`

### I Need to Troubleshoot
1. Check [README.md#-troubleshooting](README.md#-troubleshooting)
2. Review [INSTALLATION.md#-troubleshooting-installation](INSTALLATION.md#-troubleshooting-installation)
3. Run `python3 scripts/mcprofile-api-tester.py`
4. Check logs for detailed error messages

### I Want to Configure
1. Edit `config/settings.json`
2. Run `python3 scripts/profile-config-generator.py <profile>`
3. Choose: `development`, `production`, or `high-performance`
4. Reload with `/mcprofile-reload`

### I'm Integrating with Code
1. Review [API_REFERENCE.md](API_REFERENCE.md)
2. Look at `api/mcprofile-api.js` implementation
3. Check module exports in specific files
4. Use NetworkManager for HTTP requests

---

## 📌 Key Sections by Topic

### Installation & Setup
- [QUICKSTART.md](QUICKSTART.md) - Quick setup
- [INSTALLATION.md](INSTALLATION.md) - Detailed installation
- [README.md#-installation](README.md#-installation) - Alternative approaches

### Usage & Commands
- [README.md#-usage](README.md#-usage) - Player join flow
- [README.md#-commands-reference](README.md#-commands-reference) - All commands
- [QUICKSTART.md#-useful-commands](QUICKSTART.md#-useful-commands) - Common commands

### Configuration
- [README.md#-configuration](README.md#-configuration) - Config options
- [scripts/profile-config-generator.py](scripts/profile-config-generator.py) - Config tool
- Configuration profiles: dev, prod, perf

### Architecture & Design
- [README.md#-architecture](README.md#-architecture) - System design
- [SUMMARY.md#-architecture](SUMMARY.md#-architecture) - Module structure
- Source code files in `core/`, `api/`, `net/`, `ui/`

### API Integration
- [API_REFERENCE.md](API_REFERENCE.md) - MCProfile.io API
- [api/mcprofile-api.js](api/mcprofile-api.js) - Implementation
- [scripts/mcprofile-api-tester.py](scripts/mcprofile-api-tester.py) - Testing

### Security & Permissions
- [README.md#-security-considerations](README.md#-security-considerations)
- [core/admin-filter.js](core/admin-filter.js) - Permission logic
- Permission levels and role hierarchy

### Monitoring & Logging
- [README.md#-monitoring--logging](README.md#-monitoring--logging)
- [core/logger.js](core/logger.js) - Logger implementation
- Statistics and health checks

### Troubleshooting
- [README.md#-troubleshooting](README.md#-troubleshooting) - Common issues
- [INSTALLATION.md#-troubleshooting-installation](INSTALLATION.md#-troubleshooting-installation) - Setup issues
- [QUICKSTART.md#-troubleshooting-quick-fixes](QUICKSTART.md#-troubleshooting-quick-fixes) - Quick fixes

---

## 📊 Documentation Statistics

| Document | Lines | Purpose | Read Time |
|----------|-------|---------|-----------|
| QUICKSTART.md | 150+ | 5-min setup | 5 min |
| INSTALLATION.md | 300+ | Detailed setup | 15 min |
| README.md | 500+ | Complete guide | 30 min |
| API_REFERENCE.md | 200+ | API details | 15 min |
| SUMMARY.md | 300+ | Overview | 15 min |
| CHANGELOG.md | 100+ | Version info | 10 min |
| **Total** | **1,500+** | Full coverage | **90 min** |

---

## 💡 Reading Paths

### Path 1: Quick Start (15 minutes)
```
QUICKSTART.md → config/settings.json → Start server → Done!
```

### Path 2: Complete Setup (45 minutes)
```
QUICKSTART.md → INSTALLATION.md → Configure → Verify → Deploy
```

### Path 3: Full Understanding (2 hours)
```
QUICKSTART.md → INSTALLATION.md → README.md → API_REFERENCE.md →
SUMMARY.md → Review source code
```

### Path 4: Troubleshooting (30 minutes)
```
[Identify issue] → QUICKSTART.md (quick fixes) →
README.md (troubleshooting) → Run tests → Check logs
```

---

## 🔍 Search This Documentation

### By Feature
- **Caching:** [README.md#caching-system](README.md#-caching-system) | [core/cache.js](core/cache.js)
- **Admin Filter:** [README.md#admin-management](README.md#-admin-management) | [core/admin-filter.js](core/admin-filter.js)
- **Commands:** [README.md#-commands-reference](README.md#-commands-reference)
- **Events:** [core/event-handler.js](core/event-handler.js)
- **Logging:** [README.md#monitoring--logging](README.md#-monitoring--logging) | [core/logger.js](core/logger.js)

### By Task
- **Install plugin:** [INSTALLATION.md](INSTALLATION.md)
- **Configure plugin:** [README.md#-configuration](README.md#-configuration)
- **Add admin:** [QUICKSTART.md#-as-admin-user](QUICKSTART.md#-as-admin-user)
- **Query profile:** [README.md#-commands-reference](README.md#-commands-reference)
- **Clear cache:** [QUICKSTART.md#-common-tasks](QUICKSTART.md#-common-tasks)
- **Fix issues:** [README.md#-troubleshooting](README.md#-troubleshooting)

### By Audience
- **Beginners:** QUICKSTART.md → INSTALLATION.md
- **Administrators:** README.md → API_REFERENCE.md
- **Developers:** README.md → source code → SUMMARY.md
- **DevOps:** INSTALLATION.md → Configuration → Monitoring

---

## 🔗 External Resources

### MCProfile.io
- [Official Website](https://mcprofile.io/)
- [API Documentation](https://mcprofile.io/api)

### Bedrock Bridge
- [Repository](https://github.com/Bedrock-Bridge)
- [Documentation](https://bedrock-bridge.readthedocs.io/)

### Minecraft
- [Bedrock Edition](https://www.minecraft.net/bedrock)
- [Java Edition](https://www.minecraft.net/java)

---

## ⚙️ System Requirements

### Minimum
- Bedrock Edition Server 1.19.0+
- Bedrock Bridge latest version
- 10MB disk space
- 50MB RAM

### Recommended
- Bedrock Edition Server 1.21+
- 50MB disk space
- 100MB RAM
- Internet connection (for API)

### Optional
- Python 3.7+ (for testing/config tools)
- Node.js 14+ (for development)

---

## 🚀 Quick Reference Card

### Commands
```
/mcprofile <xuid>           Query profile
/mcprofile-info             Show status
/mcprofile-cache clear      Clear cache
/mcprofile-reload           Reload config
/tag @s add admin           Add admin tag
```

### Configuration Profiles
```bash
python3 scripts/profile-config-generator.py default
python3 scripts/profile-config-generator.py development
python3 scripts/profile-config-generator.py production
python3 scripts/profile-config-generator.py high-performance
```

### Testing
```bash
python3 scripts/mcprofile-api-tester.py
```

### File Locations
```
Main Plugin:      index.js
Configuration:    config/settings.json
Modules:          api/, core/, net/, ui/
Documentation:    README.md, QUICKSTART.md, etc.
```

---

## 📞 Support Resources

| Need | Resource |
|------|----------|
| Quick setup | [QUICKSTART.md](QUICKSTART.md) |
| Detailed install | [INSTALLATION.md](INSTALLATION.md) |
| All features | [README.md](README.md) |
| API details | [API_REFERENCE.md](API_REFERENCE.md) |
| Architecture | [SUMMARY.md](SUMMARY.md) |
| Version info | [CHANGELOG.md](CHANGELOG.md) |
| Issues | [README.md#-troubleshooting](README.md#-troubleshooting) |

---

## 📝 Version

**Current Version:** 2.0.0
**Release Date:** November 2025
**Status:** ✅ Production Ready
**Last Updated:** November 21, 2025

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## ✅ Next Steps

1. **Start Here:** [QUICKSTART.md](QUICKSTART.md)
2. **Install Plugin:** [INSTALLATION.md](INSTALLATION.md)
3. **Learn Features:** [README.md](README.md)
4. **Integrate API:** [API_REFERENCE.md](API_REFERENCE.md)
5. **Understand Design:** [SUMMARY.md](SUMMARY.md)

---

**Happy coding! 🎉**
