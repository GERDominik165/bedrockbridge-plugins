# MCProfile Plugin - Installation Guide

**Version:** 2.0.0

## 📋 Prerequisites

Before installing the MCProfile plugin, ensure you have:

- ✅ Bedrock Edition Server (1.19.0+)
- ✅ Bedrock Bridge installed and configured
- ✅ Administrator access to server files
- ✅ Internet connection (for API calls)
- ✅ Node.js 14+ (optional, for utilities)
- ✅ Python 3.7+ (optional, for testing scripts)

## 🔧 Installation Steps

### Step 1: Verify Bedrock Bridge Installation

First, confirm Bedrock Bridge is properly installed:

```bash
# Check if Bedrock-Bridge directory exists
ls -la D:\BB\Bedrock-Bridge\

# Verify bridge files are present
ls -la D:\BB\Bedrock-Bridge\scripts\
```

You should see files like:
- `addons.js` or similar bridge core files
- `bridgePlugins/` directory

### Step 2: Create MCProfile Plugin Directory

```bash
# Create plugin directory
mkdir -p D:\BB\bridgePlugins\mcprofile

# Navigate to plugin directory
cd D:\BB\bridgePlugins\mcprofile
```

### Step 3: Copy Plugin Files

Copy all plugin files to the directory:

```bash
# Option A: Copy all files
cp -r /source/mcprofile/* D:\BB\bridgePlugins\mcprofile\

# Option B: Individual files
# Copy main files
cp index.js D:\BB\bridgePlugins\mcprofile\
cp package.json D:\BB\bridgePlugins\mcprofile\
cp README.md D:\BB\bridgePlugins\mcprofile\

# Copy directories
cp -r api/ D:\BB\bridgePlugins\mcprofile\
cp -r core/ D:\BB\bridgePlugins\mcprofile\
cp -r net/ D:\BB\bridgePlugins\mcprofile\
cp -r ui/ D:\BB\bridgePlugins\mcprofile\
cp -r config/ D:\BB\bridgePlugins\mcprofile\
cp -r scripts/ D:\BB\bridgePlugins\mcprofile\
```

### Step 4: Verify Directory Structure

```bash
# Verify plugin directory structure
ls -la D:\BB\bridgePlugins\mcprofile\

# Expected output:
# ├── index.js
# ├── package.json
# ├── README.md
# ├── INSTALLATION.md
# ├── api/
# ├── core/
# ├── net/
# ├── ui/
# ├── config/
# └── scripts/
```

### Step 5: Configure Plugin

Edit the configuration file:

```bash
# Edit configuration
vi D:\BB\bridgePlugins\mcprofile\config\settings.json
```

Key configuration options:

```json
{
  "api": {
    "endpoint": "https://api.mcprofile.io",
    "timeout": 10000,
    "retries": 3
  },
  "admin": {
    "tags": ["admin"],
    "showProfileOnJoin": true
  },
  "logging": {
    "level": "info"
  }
}
```

### Step 6: Update Bedrock Bridge Configuration

Add the plugin to your Bedrock Bridge configuration:

**Location:** `D:\BB\Bedrock-Bridge\scripts\addons.js` (or equivalent)

```javascript
// Add this import
import mcProfilePlugin from '../bridgePlugins/mcprofile/index.js';

// The plugin will auto-initialize on load
```

Or for manual initialization:

```javascript
import MCProfilePlugin from '../bridgePlugins/mcprofile/index.js';

const mcprofile = new MCProfilePlugin();
await mcprofile.initialize();
```

### Step 7: Test Installation

#### Option A: Server Start Test

1. Start your Bedrock Bridge server
2. Check console for "MCProfile v2.0.0 initialized successfully"
3. Join server as admin user
4. Verify profile information is displayed

#### Option B: Python Testing Script

```bash
# Test MCProfile API connectivity
python3 scripts/mcprofile-api-tester.py

# Expected output should show successful API tests
```

#### Option C: Manual Command Test

In-game as admin:

```
/mcprofile-info
```

You should see:
```
§6MCProfile Plugin Info
§eVersion: §f2.0.0
§eAPI Endpoint: §fhttps://api.mcprofile.io
§eCache Enabled: §ftrue
...
```

## 🔍 Verification Checklist

After installation, verify everything works:

### System Level
- [ ] All plugin files in correct directory
- [ ] `config/settings.json` is valid JSON
- [ ] No file permission errors
- [ ] Bedrock Bridge can access plugin directory

### Plugin Level
- [ ] Plugin logs on server startup
- [ ] No console errors during load
- [ ] All commands registered successfully
- [ ] Cache initialized

### Admin Level
- [ ] Admin users have 'admin' tag: `/tag @a[name=YourName] add admin`
- [ ] Admin can see profile on join
- [ ] `/mcprofile-info` command works
- [ ] `/mcprofile <xuid>` command works

### API Level
- [ ] Internet connection working
- [ ] API endpoint is reachable: https://api.mcprofile.io
- [ ] Test script runs without errors
- [ ] Profile data is retrieved successfully

## ⚙️ Configuration Profiles

### Quick Start (Default)

```bash
# Uses default settings.json
# Good for testing and small servers
```

### Development Environment

```bash
python3 scripts/profile-config-generator.py development

# Creates optimized dev config:
# - Short cache TTL (5 min)
# - Debug logging enabled
# - File logging enabled
```

### Production Environment

```bash
python3 scripts/profile-config-generator.py production

# Creates optimized production config:
# - Long cache TTL (2 hours)
# - Minimal logging (warnings only)
# - Large cache (5000 profiles)
```

### High Performance

```bash
python3 scripts/profile-config-generator.py high-performance

# Creates high-performance config:
# - Very long TTL (3 hours)
# - Huge cache (10000 profiles)
# - Only error logging
```

## 🚀 Post-Installation

### 1. Initialize Admin Tag

```bash
# In Minecraft (as admin/operator)
/tag @s add admin

# Or in console:
/tag @a[name=PlayerName] add admin
```

### 2. Test Profile Retrieval

```bash
# In game as admin:
/mcprofile 25332248730d7792

# Should display profile information
```

### 3. Monitor Logs

```bash
# Check console for any warnings
# Look for cache initialization message
# Verify API health check passes
```

### 4. Create Backups

```bash
# Backup current configuration
cp config/settings.json config/settings.json.backup

# Backup whole plugin
cp -r . ../../mcprofile-backup-$(date +%Y%m%d)
```

## 🐛 Troubleshooting Installation

### Issue: Plugin Not Loading

**Symptoms:**
- No plugin initialization message
- `mcprofile` command not found

**Solution:**
1. Check file permissions:
   ```bash
   chmod 755 D:\BB\bridgePlugins\mcprofile\index.js
   ```

2. Verify import path in Bedrock Bridge configuration:
   ```javascript
   import mcProfilePlugin from '../bridgePlugins/mcprofile/index.js';
   ```

3. Check for syntax errors:
   ```bash
   node -c index.js
   ```

### Issue: Config File Error

**Symptoms:**
- "Invalid configuration" messages
- Plugin fails to initialize

**Solution:**
1. Validate JSON:
   ```bash
   python3 -m json.tool config/settings.json
   ```

2. Reset to default:
   ```bash
   python3 scripts/profile-config-generator.py default
   ```

3. Check file encoding (must be UTF-8):
   ```bash
   file config/settings.json
   ```

### Issue: API Connection Failed

**Symptoms:**
- "Could not retrieve profile data"
- Timeout errors in logs

**Solution:**
1. Test connectivity:
   ```bash
   python3 scripts/mcprofile-api-tester.py
   ```

2. Check network:
   ```bash
   curl https://api.mcprofile.io/health
   ```

3. Increase timeout in config:
   ```json
   {
     "api": {
       "timeout": 15000
     }
   }
   ```

### Issue: Permissions Denied

**Symptoms:**
- Admin commands not working
- "Permission denied" messages

**Solution:**
1. Verify admin tag:
   ```bash
   /tag @s list
   ```

2. Add admin tag:
   ```bash
   /tag @s add admin
   ```

3. Check config admin tags:
   ```json
   {
     "admin": {
       "tags": ["admin"]
     }
   }
   ```

## 📦 File Structure Verification

```bash
# Verify all required files exist
ls -la D:\BB\bridgePlugins\mcprofile\

# Check subdirectories
ls -la D:\BB\bridgePlugins\mcprofile\api\
ls -la D:\BB\bridgePlugins\mcprofile\core\
ls -la D:\BB\bridgePlugins\mcprofile\net\
ls -la D:\BB\bridgePlugins\mcprofile\ui\
ls -la D:\BB\bridgePlugins\mcprofile\config\
ls -la D:\BB\bridgePlugins\mcprofile\scripts\

# Count total files (should be ~20+)
find D:\BB\bridgePlugins\mcprofile\ -type f | wc -l
```

## 🔐 Security Setup

### 1. Set File Permissions

```bash
# Make plugin executable
chmod 755 D:\BB\bridgePlugins\mcprofile\index.js

# Protect configuration
chmod 644 D:\BB\bridgePlugins\mcprofile\config\settings.json
```

### 2. Enable Logging

```json
{
  "logging": {
    "enabled": true,
    "level": "info",
    "enableFile": true
  }
}
```

### 3. Configure Rate Limiting

```json
{
  "security": {
    "rateLimit": 100
  }
}
```

### 4. Enable SSL Verification

```json
{
  "security": {
    "enforceSSL": true
  }
}
```

## ✅ Final Verification

Run this final checklist:

```bash
# 1. Check plugin loads
echo "Checking plugin file..."
head -1 D:\BB\bridgePlugins\mcprofile\index.js

# 2. Validate JSON config
echo "Validating configuration..."
python3 -m json.tool D:\BB\bridgePlugins\mcprofile\config\settings.json > /dev/null && echo "✓ Config valid"

# 3. Check directory structure
echo "Verifying directory structure..."
test -d D:\BB\bridgePlugins\mcprofile\api && echo "✓ API module found"
test -d D:\BB\bridgePlugins\mcprofile\core && echo "✓ Core modules found"
test -f D:\BB\bridgePlugins\mcprofile\index.js && echo "✓ Main file found"

# 4. Test API connectivity
echo "Testing API connectivity..."
python3 scripts/mcprofile-api-tester.py
```

## 🎉 Installation Complete!

Your MCProfile plugin is now installed and ready to use.

### Next Steps:

1. **Start Server:** Run your Bedrock Bridge server
2. **Add Admin Tag:** Give yourself admin tag: `/tag @s add admin`
3. **Test:** Join and verify profile shows on join
4. **Configure:** Adjust `config/settings.json` as needed
5. **Monitor:** Check logs for any issues

### Useful Commands:

```
/mcprofile <xuid>          - Query player profile
/mcprofile-info            - Show plugin info
/mcprofile-cache stats     - Show cache statistics
/mcprofile-cache clear     - Clear cache
/mcprofile-reload          - Reload configuration
```

---

## 📞 Support

If you encounter issues:

1. Check [Troubleshooting Installation](#-troubleshooting-installation) section
2. Review logs in console
3. Run API test script
4. Check README.md for detailed documentation
5. Verify all prerequisites are met

---

**Installation Guide v2.0.0**
Last Updated: November 2025
