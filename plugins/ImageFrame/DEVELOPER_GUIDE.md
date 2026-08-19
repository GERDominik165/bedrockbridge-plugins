# 🛠️ ImageFrame Developer Guide

Vollständiger Guide für Entwickler, die mit ImageFrame arbeiten oder es erweitern möchten.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Code Organization](#code-organization)
3. [Key Classes](#key-classes)
4. [Extension Points](#extension-points)
5. [Development Setup](#development-setup)
6. [Testing Guide](#testing-guide)
7. [Best Practices](#best-practices)
8. [Debugging](#debugging)

---

## Architecture Overview

### Plugin Flow

```
Game Start
    ↓
initializePlugin()
    ├── DatabaseManager.initialize() → Create Tables
    ├── ImageMapManager() → Create Manager
    ├── ItemFrameHandler() → Frame Handler
    ├── AnimationSystem() → Animation Loop
    ├── UIManager() → UI System
    └── registerCommands() → Register Bridge Commands
        ↓
    Event Listeners Ready
        ↓
    Player Commands / Events
        ├── /imageframe command
        ├── /imageframeadmin command
        └── Game Events (playerSpawn, breakBlock, etc)
```

### State Management Pattern

```javascript
// Global State Maps
const imageData = new Map();     // imageId -> imageObject
const mapData = new Map();       // mapId -> mapObject
const playerData = new Map();    // playerName -> playerObject
const animationStates = new Map(); // imageId -> animationObject
const worldData = { ... };       // Global counters & references
```

---

## Code Organization

### File Structure

```
D:\BB\bridgePlugins\ImageFrame\
├── imageframe.js         ← Main Plugin File (1500+ lines)
├── CONFIG.js             ← Configuration (exported module)
├── README.md             ← User Documentation
├── DEVELOPER_GUIDE.md    ← This File
├── SETUP_GUIDE.md        ← Installation Guide
└── examples/             ← Code Examples
    ├── custom-processor.js
    ├── webhook-integration.js
    └── advanced-markers.js
```

### Code Structure in imageframe.js

```javascript
// 1. Imports & Module Setup
import { world, system, Player } from "@minecraft/server";
import { HttpRequest, http } from "@minecraft/server-net";
// ...

// 2. Configuration
const CONFIG = { ... };

// 3. Utility Functions
function log() { ... }
function generateRandomId() { ... }
// ...

// 4. ImageProcessor Class
class ImageProcessor { ... }

// 5. ImageMapManager Class
class ImageMapManager { ... }

// 6. ItemFrameHandler Class
class ItemFrameHandler { ... }

// 7. AnimationSystem Class
class AnimationSystem { ... }

// 8. UIManager Class
class UIManager { ... }

// 9. DatabaseManager Class
class DatabaseManager { ... }

// 10. Command Handlers
function registerCommands() { ... }
async function handleCommand() { ... }
async function handleAdminCommand() { ... }

// 11. Event Handlers
function registerEventHandlers() { ... }

// 12. Plugin Initialization
async function initializePlugin() { ... }

// 13. Global Export
globalThis.ImageFrame = { ... };
```

---

## Key Classes

### 1. ImageProcessor

**Verantwortung:** Image Loading & Caching

```javascript
class ImageProcessor {
  // Caching-System für URLs
  cache: Map<string, imageData>

  // Laden von URLs
  async loadImageFromURL(url, timeout)

  // Image Format Detection
  detectImageFormat(url, headers)

  // Processing für Maps
  async processImageForMap(imageUrl, mapWidth, mapHeight)

  // GIF Animation Processing
  async processGIFAnimation(gifUrl, maxFrames)

  // Cache Management
  clearCache()
  getCacheStats()
}
```

**Verwendung:**
```javascript
const processor = new ImageProcessor();

// Bild laden
const imageData = await processor.loadImageFromURL(url);

// Für Map verarbeiten
const mapFrame = await processor.processImageForMap(url, 128, 128);

// GIF verarbeiten
const animation = await processor.processGIFAnimation(gifUrl);
```

### 2. ImageMapManager

**Verantwortung:** Map & Image Verwaltung

```javascript
class ImageMapManager {
  imageProcessor: ImageProcessor
  maps: Map<string, mapData>

  // Erstelle Image Map
  async createImageMap(url, owner, width, height)

  // Markierungen
  async addMapMarker(imageId, label, x, y, iconType, color)
  removeMarker(imageId, markerId)
  getImageMarkers(imageId)

  // Aktualisierung
  async refreshImageMap(imageId)

  // Löschen
  deleteImageMap(imageId)

  // Spieler-Bilder
  getPlayerImages(playerName)

  // Sharing
  shareImageMap(imageId, targetPlayer, accessLevel)
}
```

### 3. ItemFrameHandler

**Verantwortung:** Item Frame Integration

```javascript
class ItemFrameHandler {
  imageMapManager: ImageMapManager
  selectedFrames: Map<playerName, [locations]>

  // Selection Management
  selectItemFrame(player, frameLocation)
  clearSelection(player)
  getSelectedFrames(player)

  // Apply Images
  applyImageToFrames(player, imageId)
}
```

### 4. AnimationSystem

**Verantwortung:** GIF & Frame Animationen

```javascript
class AnimationSystem {
  imageMapManager: ImageMapManager
  animations: Map<imageId, animationState>

  // Animation Control
  async startAnimationForGIF(imageId, gifUrl, fps)
  stopAnimation(imageId)

  // Animation Loop
  startAnimationLoop()
}
```

### 5. UIManager

**Verantwortung:** Alle User Interface Forms

```javascript
class UIManager {
  // Main Menu
  async showMainMenu(player)

  // Image Loading
  async showLoadImageForm(player)
  async showImageOptions(player, imageId)

  // Inventory
  async showPlayerImages(player)

  // Item Frames
  async showItemFrameSelector(player)
  async showItemFrameApply(player, imageId)

  // Markers
  async showAddMarker(player, imageId)

  // Sharing
  async showShareForm(player, imageId)

  // Management
  async showRefreshForm(player)
  async showDeleteConfirm(player, imageId)

  // Info
  showStatistics(player)
  showHelp(player)
}
```

### 6. DatabaseManager

**Verantwortung:** Persistente Datenspeicherung

```javascript
class DatabaseManager {
  initialized: boolean

  // Initialization
  async initialize()

  // Image Data
  async saveImageData(imageId, imageObj)
  async loadAllImages()

  // Markers
  async saveMarker(markerId, markerObj, imageId)
  async deleteMarkers(imageId)
}
```

---

## Extension Points

### 1. Custom Image Processors

Erweitere ImageProcessor für spezielle Bildformate:

```javascript
// In imageframe.js, ImageProcessor Klasse erweitern:

async processCustomFormat(url, format) {
  const imageData = await this.loadImageFromURL(url);

  // Custom Format Processing
  if (format === "svg") {
    return await this.renderSVGToPixels(imageData);
  } else if (format === "psd") {
    return await this.processPSD(imageData);
  }

  return imageData;
}
```

### 2. Custom Marker Types

Füge neue Markierungstypen hinzu:

```javascript
// In CONFIG.markers:
availableTypes: [
  "mansion",
  "temple",
  "stronghold",
  "spawner",
  "custom:player",      // ← Custom Type
  "custom:waypoint",    // ← Custom Type
  "custom:resource"     // ← Custom Type
],

// In ItemFrameHandler:
async applyCustomMarker(imageId, markerData) {
  if (markerData.iconType.startsWith("custom:")) {
    // Custom Marker Logic
  }
}
```

### 3. External API Integration

Integriere externe APIs:

```javascript
class WebAPIIntegration {
  async fetchImagesFromAPI(query) {
    const request = new HttpRequest(`https://api.example.com/search?q=${query}`)
      .setMethod(HttpRequestMethod.Get)
      .setHeaders([new HttpHeader('Authorization', 'Bearer TOKEN')])
      .setTimeout(30000);

    const response = await http.request(request);
    return JSON.parse(response.body);
  }
}

// In UIManager:
async showAPISearch(player, query) {
  const api = new WebAPIIntegration();
  const images = await api.fetchImagesFromAPI(query);
  // Show results...
}
```

### 4. Event System Expansion

Erhöhe Event-Handling:

```javascript
// Custom Event Listener für Image Creation
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const block = event.block;

  // Custom Logic für Image-Platzierung
  if (block.typeId === "minecraft:armor_stand") {
    // Place image on armor stand?
  }
});
```

### 5. Custom Storage Backends

Alternative zu SQLite:

```javascript
class CustomDatabaseManager extends DatabaseManager {
  async initialize() {
    // Use MongoDB, PostgreSQL, REST API, etc.
    // Instead of SQLite
  }

  async saveImageData(imageId, imageObj) {
    // Custom backend implementation
  }
}
```

---

## Development Setup

### 1. IDE Setup

**Recommended:** Visual Studio Code

```bash
# Extensions
- Minecraft Development
- JavaScript/TypeScript
- Bedrock Bridge Extension
```

### 2. Project Structure

```bash
mkdir -p D:\BB\bridgePlugins\ImageFrame\dev
cd D:\BB\bridgePlugins\ImageFrame\dev

# Create development files
touch development.md
touch test-cases.js
touch example-usage.js
```

### 3. Debugging Setup

```javascript
// In imageframe.js, Enable Debug Mode
CONFIG.debugLogging = true;
CONFIG.advanced.verboseLogging = true;

// View logs via console
console.log("Debug message");

// Access debug tools
globalThis.ImageFrame.debug.getStats();
```

### 4. Configuration Overrides

```javascript
// Create local config override
const LOCAL_CONFIG = {
  storage: {
    maxImagesPerPlayer: 5  // Smaller for testing
  },
  image: {
    maxImageSize: 1024 * 100  // Smaller for testing
  }
};

// Merge with main config
Object.assign(CONFIG, LOCAL_CONFIG);
```

---

## Testing Guide

### 1. Unit Testing Patterns

```javascript
// Test ImageProcessor
async function testImageProcessing() {
  const processor = new ImageProcessor();

  try {
    const image = await processor.loadImageFromURL(
      "https://example.com/test.png"
    );
    console.assert(image.format === "png", "Format detection failed");
    console.log("✓ Image processing test passed");
  } catch (error) {
    console.error("✗ Image processing test failed:", error);
  }
}

// Test Map Creation
async function testMapCreation() {
  const manager = new ImageMapManager();

  try {
    const result = await manager.createImageMap(
      "https://example.com/test.png",
      "testplayer",
      2,
      2
    );
    console.assert(result.mapIds.length === 4, "Map count mismatch");
    console.log("✓ Map creation test passed");
  } catch (error) {
    console.error("✗ Map creation test failed:", error);
  }
}
```

### 2. Integration Testing

```javascript
// Full workflow test
async function testFullWorkflow() {
  const testUrl = "https://example.com/test.png";
  const testPlayer = "testplayer";

  try {
    // 1. Create image map
    const imageResult = await imageMapManager.createImageMap(
      testUrl,
      testPlayer,
      1,
      1
    );

    // 2. Add marker
    const marker = await imageMapManager.addMapMarker(
      imageResult.imageId,
      "Test Marker",
      64,
      64,
      "mansion"
    );

    // 3. Share image
    const shared = imageMapManager.shareImageMap(
      imageResult.imageId,
      "otherplayer",
      "view"
    );

    // 4. Refresh image
    const refreshed = await imageMapManager.refreshImageMap(
      imageResult.imageId
    );

    console.assert(shared && refreshed, "Workflow test failed");
    console.log("✓ Full workflow test passed");

  } catch (error) {
    console.error("✗ Full workflow test failed:", error);
  }
}
```

### 3. Load Testing

```javascript
// Test performance with many images
async function testLoadPerformance() {
  const startTime = Date.now();
  const testUrls = Array(100).fill("https://example.com/test.png");

  try {
    const promises = testUrls.map((url, i) =>
      imageMapManager.createImageMap(url, `testplayer${i}`, 1, 1)
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const avgTime = duration / 100;

    console.log(`Load test: ${duration}ms for 100 images`);
    console.log(`Average time: ${avgTime}ms per image`);
    console.log(`Performance: ${(100000/duration).toFixed(0)} images/minute`);

  } catch (error) {
    console.error("Load test failed:", error);
  }
}
```

---

## Best Practices

### 1. Error Handling

```javascript
// ✓ GOOD
try {
  const result = await imageMapManager.createImageMap(url, player, 1, 1);
  sendPlayerMessage(player, `${CONFIG.ui.colors.success}Image created!`);
} catch (error) {
  log("error", `Failed to create image: ${error.message}`);
  sendPlayerMessage(player, `${CONFIG.ui.colors.error}Error: ${error.message}`);
}

// ✗ BAD
const result = imageMapManager.createImageMap(url, player, 1, 1);
sendPlayerMessage(player, "Image created!");
```

### 2. Async/Await

```javascript
// ✓ GOOD - Proper async handling
async function loadAndDisplay(player, url) {
  try {
    const image = await imageProcessor.loadImageFromURL(url);
    return image;
  } catch (error) {
    sendPlayerMessage(player, "Error loading image");
  }
}

// ✗ BAD - Missing await
function loadAndDisplay(player, url) {
  const image = imageProcessor.loadImageFromURL(url);  // Returns Promise!
  return image;
}
```

### 3. Resource Management

```javascript
// ✓ GOOD - Cleanup
function deleteImage(imageId) {
  imageMapManager.deleteImageMap(imageId);
  imageMapManager.imageProcessor.cache.delete(imageId);
  animationStates.delete(imageId);
}

// ✗ BAD - Memory leak
function deleteImage(imageId) {
  imageMapManager.deleteImageMap(imageId);
  // Cache and animations still in memory!
}
```

### 4. Type Safety (JSDoc)

```javascript
// ✓ GOOD - JSDoc Comments
/**
 * Creates an image map from a URL
 * @param {string} imageUrl - The image URL (must be https)
 * @param {string} owner - Player name
 * @param {number} mapWidth - Width in maps (1-10)
 * @param {number} mapHeight - Height in maps (1-10)
 * @returns {Promise<{imageId: string, mapIds: string[]}>}
 * @throws {Error} If URL is invalid or image loading fails
 */
async createImageMap(imageUrl, owner, mapWidth, mapHeight) { ... }

// ✗ BAD - No documentation
async createImageMap(imageUrl, owner, mapWidth, mapHeight) { ... }
```

---

## Debugging

### 1. Enable Debug Mode

```javascript
// In imageframe.js
CONFIG.debugLogging = true;
CONFIG.advanced.verboseLogging = true;
```

### 2. Use Debug Console

```javascript
// Access from server console
globalThis.ImageFrame.debug.getStats()
// Output: {totalImages: 5, totalMaps: 12, ...}

globalThis.ImageFrame.debug.listAllImages()
// Output: [{id, owner, url, created}, ...]

globalThis.ImageFrame.debug.clearCache()
// Output: "Cache cleared"
```

### 3. Log Output

```
§b[ImageFrame]§r [14:30:45] INFO: Image cached successfully: https://example.com/image.png
§b[ImageFrame]§r [14:30:46] ERROR: Failed to load image from https://example.com/missing.png: HTTP 404
§b[ImageFrame]§r [14:30:47] WARN: Cache is getting full (450MB / 500MB max)
```

### 4. Common Issues

**Issue:** Image not loading
```javascript
// Check:
1. CONFIG.debugLogging = true
2. Is URL valid? log("info", url)
3. Is timeout set correctly?
4. Network access available?
```

**Issue:** Memory leak
```javascript
// Check:
1. Are old images deleted?
   imageMapManager.deleteImageMap(imageId)
2. Is cache growing?
   imageMapManager.imageProcessor.getCacheStats()
3. Are animations stopped?
   animationStates.size (should be 0 when idle)
```

**Issue:** UI not responding
```javascript
// Check:
1. Are forms properly awaited?
   const response = await form.show(player);
2. Is player valid?
   if (player && player.isValid?.())
3. Any unhandled promises?
```

---

## Performance Tips

### 1. Image Caching

```javascript
// Cache is automatic, but can be managed:
const stats = imageMapManager.imageProcessor.getCacheStats();
console.log(`Cache size: ${stats.totalBytes / 1024 / 1024}MB`);

// Clear if needed
imageMapManager.imageProcessor.clearCache();
```

### 2. Animation Optimization

```javascript
// Only animate needed GIFs
if (CONFIG.animation.gifEnabled && gifUrl.endsWith('.gif')) {
  await animationSystem.startAnimationForGIF(imageId, gifUrl);
}

// Stop animations when not visible
animationSystem.stopAnimation(imageId);
```

### 3. Database Optimization

```javascript
// Batch operations
const images = [image1, image2, image3];
for (const img of images) {
  await dbManager.saveImageData(img.id, img);
}
```

---

## Version & Compatibility

- **Bedrock:** 1.21.120+
- **BedrockBridge:** Latest
- **Node.js:** 14.0+
- **ES6 Modules:** Required

---

**Last Updated:** 2025-11-19
**Author:** Your Server Team
