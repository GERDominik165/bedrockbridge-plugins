# 🚀 ImageFrame - QUICKSTART GUIDE v1.0.1

**Status:** ✅ Fixed & Ready to Use
**Version:** 1.0.1 (All Bugs Fixed)

---

## ⚡ 5-MINUTE SETUP

### Step 1: Copy Plugin
```bash
cp D:\BB\bridgePlugins\ImageFrame\imageframe.js
# File is ready!
```

### Step 2: Restart Server
- Restart Bedrock Bridge Server
- Check logs for: `[ImageFrame] Plugin initialized successfully!`

### Step 3: Test
```
/imageframe help
```

✅ **Done!** Plugin is active.

---

## 📖 COMPLETE WORKFLOW

### 🖼️ **Load an Image**

```
Step 1: /imageframe load https://example.com/image.png
        ↓
        Form opens with:
        • Image URL field
        • Map Width (1-10)
        • Map Height (1-10)
        • Animated (GIF)
        ↓
Step 2: Fill in and submit
        ↓
Step 3: Image loads and appears in your inventory
```

### 📍 **Apply to Item Frames** (CORRECT WORKFLOW)

```
Step 1: /imageframe itemframes
        ✓ Frame Selection Mode ENABLED
        ↓
Step 2: Right-click item frames in world
        ✓ Frame #1 selected!
        ✓ Frame #2 selected!
        ✓ Frame #3 selected!
        ↓
Step 3: /imageframe menu
        Opens main menu
        ↓
Step 4: Choose "Apply to Item Frames"
        Shows your selected frames
        ↓
Step 5: Click "Apply Now"
        ✓ Image applied to 3 frame(s)!
        ↓
Step 6: Selection cleared automatically
        Done!
```

### 📌 **Add Markers to Images**

```
Step 1: /imageframe menu
        ↓
Step 2: Choose "My Images"
        ↓
Step 3: Select your image
        ↓
Step 4: Choose "Add Marker"
        Form opens:
        • Marker Label (name)
        • X Position (0-127)
        • Y Position (0-127)
        • Icon Type (mansion, temple, etc)
        ↓
Step 5: Fill and submit
        ✓ Marker added!
```

### 🤝 **Share Images with Players**

```
Step 1: /imageframe menu → My Images → Select Image
        ↓
Step 2: Choose "Share Image"
        Form opens:
        • Player Name (recipient)
        • Access Level (View/Edit/Admin)
        ↓
Step 3: Fill and submit
        ✓ Image shared!
```

### 🔄 **Refresh Image from URL**

```
Step 1: /imageframe refresh <imageId>
        ↓
Step 2: Image reloads from original URL
        ✓ Refreshed successfully!
```

---

## 📋 ALL COMMANDS

| Command | What It Does |
|---------|-------------|
| `/imageframe` | Open main menu |
| `/imageframe menu` | Open main menu |
| `/imageframe help` | Show this help |
| `/imageframe load <URL>` | Load image from URL |
| `/imageframe list` | Show your images |
| `/imageframe refresh <id>` | Refresh image |
| `/imageframe delete <id>` | Delete image |
| `/imageframe itemframes` | **ENABLE frame selection** |
| `/imageframe clearframes` | Clear selection |
| `/imageframe stopframes` | Stop selection mode |
| `/imageframeadmin stats` | Show statistics |
| `/imageframeadmin clear` | Delete all images |
| `/imageframeadmin clearcache` | Clear cache |

---

## ✨ FEATURES CHECKLIST

### Implemented & Working ✅

- ✅ Load images from URLs (PNG, JPEG, WEBP, GIF)
- ✅ Multiple map sizes (1x1 to 10x10)
- ✅ Apply images to item frames
- ✅ Add markers to maps
- ✅ Share images with other players
- ✅ Refresh images from source
- ✅ GIF animation support
- ✅ Database storage (auto-save)
- ✅ Admin commands
- ✅ Complete UI (all forms working)
- ✅ Item frame selection system (FIXED!)
- ✅ Error handling & logging
- ✅ Player messages & feedback

---

## 🔧 ITEM FRAME SYSTEM (FIXED IN v1.0.1)

### How It Works

1. **Enable Selection Mode**
   ```
   /imageframe itemframes
   ```
   - This activates frame selection for this player
   - When enabled, right-clicks on frames are intercepted
   - Selection counter shows how many frames selected

2. **Select Frames**
   - Right-click each item frame
   - Each frame is added to your selection
   - Chat shows: "✓ Frame #1 selected!"

3. **Apply Image**
   - Open menu: `/imageframe menu`
   - Go to "My Images"
   - Select image
   - Choose "Apply to Item Frames"
   - See list of selected frames
   - Click "Apply Now"
   - ✓ Image applied!

4. **Manage Selection**
   - `/imageframe clearframes` - Clear all
   - `/imageframe stopframes` - Stop selection mode

---

## ⚙️ CONFIGURATION

Most settings are auto-configured, but you can customize:

```javascript
// In imageframe.js, find CONFIG:

CONFIG.permissions.defaultImageLimit = 50  // Images per player
CONFIG.image.maxImageSize = 10 * 1024 * 1024  // Max 10 MB
CONFIG.animation.gifMaxFPS = 20  // GIF speed
CONFIG.storage.autoSaveInterval = 5 * 60 * 1000  // Auto-save every 5 min
```

---

## 🐛 BUGS FIXED IN v1.0.1

### ✅ Fixed Issues

1. **ModalFormData TypeError** - Form parameter syntax corrected
2. **Player Message Error** - Player validation simplified
3. **Item Frame Selection** - Complete workflow redesign
   - Now uses `beforeEvents.playerInteractWithBlock`
   - Works with right-clicks while UI closed
   - Proper mode enable/disable

---

## 📊 SERVER ADMIN COMMANDS

```bash
# Check statistics
/imageframeadmin stats

# Output:
# Total Images: 5
# Total Maps: 12
# Cache Entries: 8
# Cache Size: 2.5MB

# Delete ALL images (careful!)
/imageframeadmin clear

# Clear cache (frees memory)
/imageframeadmin clearcache
```

---

## 💡 TIPS & TRICKS

### Best Image Sources
- imgur.com - Fast & reliable
- unsplash.com - Free high-quality
- pixabay.com - Royalty-free
- pexels.com - Professional photos

### Image Size Guidelines
- Maps work best with square images
- Recommended: 256x256 - 1024x1024px
- Compress before upload to save bandwidth

### GIF Animations
- GIFs must be under 5 MB
- Ideal: 10 FPS @ 128x128px
- Too large GIFs may timeout

### Multiple Frames
- Select multiple frames before applying
- Useful for large displays
- Can span across walls

---

## 🎯 COMMON WORKFLOWS

### Display a Banner
```
1. /imageframe load https://example.com/banner.png
2. /imageframe itemframes
3. Right-click frame 5 times (5x1 grid)
4. /imageframe menu → My Images → Select → Apply → Done!
```

### Create a Map Wall
```
1. Load multiple images
2. Place 20 item frames (4x5 grid on wall)
3. For each image:
   - /imageframe itemframes
   - Right-click 4 frames
   - /imageframe menu → Apply
   - /imageframe stopframes
```

### Add Location Markers
```
1. Load map image
2. /imageframe menu → My Images → Select
3. "Add Marker" → Add spawn point marker
4. "Add Marker" → Add base marker
5. "Add Marker" → Add mine marker
```

---

## 📞 SUPPORT

### If something doesn't work

**1. Check Help**
```
/imageframe help
```

**2. View Stats**
```
/imageframeadmin stats
```

**3. Check Logs** - Look for:
```
[ImageFrame] Plugin initialized successfully!
```

**4. Try Debug**
```javascript
// In console:
globalThis.ImageFrame.debug.getStats()
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid URL format" | URL must start with https:// |
| "Image exceeds max size" | Compress image, max 10 MB |
| "HTTP 404 Error" | URL doesn't exist or image moved |
| Frames not selecting | Run `/imageframe itemframes` first |
| Forms not opening | Check if player is valid |

---

## 🎮 MINECRAFT EDITION

- **Edition:** Bedrock Edition
- **Version:** 1.21.120+
- **Bridge:** BedrockBridge required
- **Node.js:** 14.0+

---

## 📚 DOCUMENTATION FILES

- `README.md` - Full user guide
- `SETUP_GUIDE.md` - Installation & config
- `DEVELOPER_GUIDE.md` - Technical reference
- `BUGFIX_LOG.md` - What was fixed
- `QUICKSTART.md` - This file!

---

## ✅ VERIFICATION CHECKLIST

After installation, verify everything works:

- [ ] `/imageframe help` shows help menu
- [ ] `/imageframe load <url>` loads an image
- [ ] `/imageframe list` shows loaded images
- [ ] `/imageframe itemframes` enables selection
- [ ] Right-click item frame shows selection message
- [ ] `/imageframe menu` opens main menu
- [ ] "Apply to Item Frames" shows selected frames
- [ ] `/imageframeadmin stats` shows statistics

If all ✅, you're good to go!

---

## 🚀 YOU'RE READY!

Everything is set up and working. Start using ImageFrame:

```
1. /imageframe load https://example.com/image.png
2. /imageframe itemframes
3. Right-click frames
4. /imageframe menu
5. Apply!
```

**Enjoy displaying images on your Bedrock server!** 🎨

---

**Version:** 1.0.1
**Status:** ✅ Production Ready
**Last Updated:** 2025-11-19

All features tested and working! 🎉
