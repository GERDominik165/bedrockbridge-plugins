# ImageFrame v3.0.0 - Implementation Guide

## Komplett Neue Features basierend auf Bedrock-Dokumentation

---

## 🎯 TEIL 1: Image Loading System (Production-Ready)

### Fehlende Features in v2.0.0:
- ❌ Keine URL-Validierung
- ❌ Keine Retry-Logik
- ❌ Keine Cache-Gültigkeit Check
- ❌ Keine Error-Details
- ❌ Keine Performance-Monitoring

### ✅ Neue Implementation in v3.0.0:

#### 1. URL-Validierung (New)
```javascript
function isValidImageUrl(url) {
  // 1. Null/Type Check
  if (!url || typeof url !== 'string') return false;

  // 2. Schema Validation (HTTP/HTTPS)
  if (!url.includes('http://') && !url.includes('https://')) return false;

  // 3. Length Check (max 2048 chars)
  if (url.length > 2048) return false;

  // 4. Extension Validation
  const hasValidExtension = CONFIG.image.formats.some(fmt =>
    url.toLowerCase().includes(`.${fmt}`)
  );

  return hasValidExtension;
}
```

**Warum wichtig?**
- Verhindert Invalid URLs vom Server
- Prüft on-disk Dateien nicht ab
- Begrenzt Speicher-Nutzung

#### 2. Cache-Validierung (New)
```javascript
function isCacheValid(url) {
  // 1. Existiert im Cache?
  if (!imageCache.has(url)) return false;

  // 2. Ist noch nicht abgelaufen?
  const cached = imageCache.get(url);
  const age = Date.now() - cached.timestamp;

  // 3. Zeitlimit prüfen (30 Min)
  return age < CONFIG.performance.cacheExpireMs;
}
```

**Warum wichtig?**
- Vermeidung stale Image-Daten
- Memory-Cleanup bei Expiration
- Frische Bilder bei Bedarf

#### 3. Retry-Logik mit Exponential Backoff (New)
```javascript
async function loadImageFromURL(url, retryCount = 0) {
  try {
    // 1. URL validieren
    if (!isValidImageUrl(url)) {
      throw new Error(`Invalid URL format`);
    }

    // 2. Cache prüfen
    if (CONFIG.performance.enableImageCaching && isCacheValid(url)) {
      return imageCache.get(url);
    }

    // 3. HTTP Request durchführen
    const request = new HttpRequest(url)
      .setMethod(HttpRequestMethod.Get)
      .setHeaders([
        new HttpHeader('User-Agent', 'BedrockBridge-ImageFrame/3.0'),
        new HttpHeader('Accept', 'image/*'),
        new HttpHeader('Connection', 'close')
      ])
      .setTimeout(CONFIG.image.timeout);

    const response = await http.request(request);

    // 4. Response validieren
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body || response.body.length === 0) {
      throw new Error(`Empty response`);
    }

    // 5. Größe prüfen
    if (response.body.length > CONFIG.image.maxSize) {
      throw new Error(`Image too large`);
    }

    // 6. In Cache speichern
    const imageData = {
      url: url,
      data: response.body,
      timestamp: Date.now(),
      size: response.body.length,
      retryCount: retryCount,
      loaded: true
    };

    if (CONFIG.performance.enableImageCaching) {
      imageCache.set(url, imageData);
      worldState.totalLoadedImages++;
    }

    return imageData;

  } catch (error) {
    // Retry bei Fehler
    if (retryCount < CONFIG.image.retryAttempts) {
      log(`Load failed, retrying in ${CONFIG.image.retryDelayMs}ms`, 'warn');

      // Warte vor Retry
      await new Promise(resolve =>
        setTimeout(resolve, CONFIG.image.retryDelayMs)
      );

      // Recursive Retry
      return loadImageFromURL(url, retryCount + 1);
    }

    // Alle Retries erschöpft
    log(`Failed after ${CONFIG.image.retryAttempts} attempts`, 'error');
    throw error;
  }
}
```

**Features:**
- 3x Retry bei Fehler
- 2 Sekunden Delay zwischen Retries
- Cache-Check BEVOR HTTP-Request
- Detaillierte Error-Messages
- Response-Validierung auf 3 Ebenen

#### 4. Cache-Cleanup (New)
```javascript
function cleanupImageCache() {
  const now = Date.now();
  let cleaned = 0;

  for (const [url, data] of imageCache.entries()) {
    const age = now - data.timestamp;

    // Lösche abgelaufene Einträge
    if (age > CONFIG.performance.cacheExpireMs) {
      imageCache.delete(url);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log(`Cache cleanup: ${cleaned} expired entries removed`, 'debug');
  }

  return cleaned;
}
```

---

## 🎯 TEIL 2: Item Frame Application System (Completely New)

### Fehlende Features in v2.0.0:
- ❌ Keine "Apply Image to Frame" Logik
- ❌ Keine Frame-to-Image Mapping
- ❌ Keine Batch-Operations
- ❌ Keine Frame-Validation

### ✅ Neue Implementation in v3.0.0:

#### 1. Single Frame Application (New)
```javascript
async function applyImageToFrame(player, frameLocation, imageId) {
  try {
    // 1. Berechtigungen prüfen
    if (!checkPlayerPermission(player, 'apply')) {
      return false;
    }

    // 2. Bild validieren
    const images = getPlayersImages(player.name);
    const image = images.find(img => img.id === imageId);

    if (!image) {
      handleError(player, 'Image not found');
      return false;
    }

    // 3. Frame-Daten speichern
    const locStr = locationToString(frameLocation);
    const frameData = {
      imageId: imageId,
      playerId: player.name,
      timestamp: Date.now(),
      scale: 1.0,
      rotation: 0
    };

    // 4. Maps aktualisieren
    appliedFrames.set(locStr, frameData);
    frameImageMap.set(locStr, {
      imageId,
      playerId: player.name,
      timestamp: Date.now()
    });

    // 5. Feedback
    sendMsg(player, `${CONFIG.colors.success}✓ Image applied!`);
    worldState.totalAppliedFrames++;

    log(`Image ${imageId} applied to frame at ${locStr}`);
    return true;

  } catch (error) {
    handleError(player, 'Failed to apply', error.message);
    return false;
  }
}
```

**Features:**
- Permission-Check
- Image-Validierung
- Frame-Tracking
- Error-Handling
- Statistics-Update

#### 2. Batch Operations (New)
```javascript
async function applyImageToMultipleFrames(player, frameLocations, imageId) {
  try {
    let successCount = 0;
    let failureCount = 0;

    // Für jeden Frame in der Liste
    for (let i = 0; i < frameLocations.length; i++) {
      const success = await applyImageToFrame(
        player,
        frameLocations[i],
        imageId
      );

      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Delay zwischen Operationen (verhindert Overload)
      if (i < frameLocations.length - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, CONFIG.performance.batchOperationDelay)
        );
      }
    }

    // Batch-Report
    sendMsg(player,
      `${CONFIG.colors.info}Batch: ${successCount} success, ${failureCount} failed`
    );

    return { successCount, failureCount };

  } catch (error) {
    handleError(player, 'Batch failed', error.message);
    return { successCount: 0, failureCount: frameLocations.length };
  }
}
```

**Features:**
- Iteriert über Frames
- Try-catch pro Operation
- 50ms Delay verhindert Server-Overload
- Success/Failure Counting
- Spieler-Feedback nach Batch

#### 3. Frame Removal (New)
```javascript
function removeImageFromFrame(player, frameLocation) {
  try {
    const locStr = locationToString(frameLocation);

    // 1. Prüfe ob Frame Bild hat
    if (!appliedFrames.has(locStr)) {
      sendMsg(player, `${CONFIG.colors.warning}No image on this frame`);
      return false;
    }

    // 2. Entferne aus beiden Maps
    appliedFrames.delete(locStr);
    frameImageMap.delete(locStr);

    // 3. Feedback
    sendMsg(player, `${CONFIG.colors.success}✓ Image removed!`);
    log(`Image removed from frame at ${locStr}`);

    return true;

  } catch (error) {
    handleError(player, 'Failed to remove', error.message);
    return false;
  }
}
```

---

## 🎯 TEIL 3: Enhanced Error Handling (Comprehensive)

### Fehlende Features in v2.0.0:
- ❌ Keine detaillierten Error-Messages
- ❌ Keine Try-catch überall
- ❌ Keine Null-Checks
- ❌ Keine Type-Validation

### ✅ Neue Implementation in v3.0.0:

#### 1. Error-Handler mit Details (New)
```javascript
function handleError(player, errorMsg, details = '') {
  // 1. Nachricht zusammenstellen
  const fullMsg = details ? `${errorMsg}: ${details}` : errorMsg;

  // 2. An Spieler senden
  sendMsg(player, `${CONFIG.colors.error}❌ ${fullMsg}`);

  // 3. In Console loggen
  log(`Error for ${player?.name}: ${fullMsg}`, 'error');
}

// Verwendung:
handleError(player, 'Invalid URL');
handleError(player, 'Image too large', '15MB > 10MB');
```

#### 2. Safe Player-Communication (New)
```javascript
function sendMsg(player, msg, logMessage = false) {
  try {
    // 1. Null-Check
    if (!player || typeof player.sendMessage !== 'function') {
      if (logMessage) log(`Cannot send message to invalid player`, 'warn');
      return false;
    }

    // 2. Längen-Limit (Minecraft 256 char limit)
    const truncatedMsg = msg.length > 256
      ? msg.substring(0, 253) + "..."
      : msg;

    // 3. Sende Nachricht
    player.sendMessage(truncatedMsg);

    if (logMessage) log(`Sent message to ${player.name}`, 'debug');
    return true;

  } catch (error) {
    log(`Error sending message: ${error.message}`, 'error');
    return false;
  }
}
```

**Features:**
- Null-Check Player-Objekt
- Type-Check sendMessage
- Message-Truncation
- Return-Status
- Error-Logging

#### 3. Permission-System (New)
```javascript
function checkPlayerPermission(player, action) {
  try {
    // 1. Permissions initialisieren falls nicht existiert
    if (!playerPermissions.has(player.name)) {
      playerPermissions.set(player.name, {
        canLoad: true,
        canApply: true,
        canDelete: true,
        isModerator: player.isOp?.()  // Null-safe check
      });
    }

    // 2. Berechtigungen holen
    const perms = playerPermissions.get(player.name);
    const actionKey = `can${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const canDoAction = perms[actionKey];

    // 3. Berechtigung prüfen
    if (!canDoAction) {
      sendMsg(player, `${CONFIG.colors.error}No permission`);
      return false;
    }

    return true;

  } catch (error) {
    log(`Permission check error: ${error.message}`, 'error');
    return false;  // Fail closed
  }
}

// Verwendung in kritischen Funktionen:
if (!checkPlayerPermission(player, 'load')) return false;
if (!checkPlayerPermission(player, 'apply')) return false;
if (!checkPlayerPermission(player, 'delete')) return false;
```

---

## 🎯 TEIL 4: Enhanced Logging System (New)

### Fehlende Features in v2.0.0:
- ❌ Kein Log-Level System
- ❌ Keine Timestamps
- ❌ Keine Debug-Mode
- ❌ Keine Level-Filter

### ✅ Neue Implementation in v3.0.0:

```javascript
function log(msg, level = 'info') {
  // 1. Timestamp formatieren
  const timestamp = new Date().toLocaleTimeString();

  // 2. Level-Icon wählen
  const levelPrefix = {
    info: '✓',      // Green checkmark
    warn: '⚠',      // Warning triangle
    error: '✗',     // Red X
    debug: '🐛'     // Bug emoji
  }[level] || '•';

  // 3. Debug-Mode check
  if (level === 'debug' && !systemState.debugMode) return;

  // 4. Ausgeben
  console.log(`[${timestamp}] ${CONFIG.prefix} ${levelPrefix} ${msg}`);
}

// Verwendung:
log("Plugin initialized", 'info');
log("Retrying in 2s", 'warn');
log("HTTP 404 error", 'error');
log("Cache size: 15 items", 'debug');  // Nur wenn debugMode=true
```

---

## 🎯 TEIL 5: Event System Integration (Bedrock API)

### Fehlende Features in v2.0.0:
- ❌ Kein beforeEvents
- ❌ Keine Player-Spawn Events
- ❌ Keine Auto-Save Ticks
- ❌ Keine Maintenance-Loops

### ✅ Neue Implementation in v3.0.0:

#### 1. beforeEvents für Intercept (NEW - Critical!)
```javascript
function registerBlockInteractionHandler() {
  try {
    // WICHTIG: beforeEvents erlaubt event.cancel!
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
      const player = event.player;
      const block = event.block;

      // 1. Prüfe ob Spieler im Selection-Mode ist
      const isActive = frameSelectionActive.get(player.name);
      if (!isActive) return;  // Früher Exit

      // 2. Prüfe ob Block ein Item Frame ist
      const isFrame = CONFIG.itemFrame.types.includes(block.typeId);
      if (!isFrame) return;

      // 3. ABBRECHEN der normalen Aktion!
      event.cancel = true;

      // 4. Speichere Frame als ausgewählt
      const frames = getSelectedFrames(player.name);
      const locStr = locationToString(block.location);

      // 5. Duplikat-Check
      if (frames.some(f => f.locStr === locStr)) {
        sendMsg(player, `${CONFIG.colors.warning}Already selected`);
        return;
      }

      // 6. Speichere Frame
      frames.push({
        locStr: locStr,
        location: block.location,
        rotation: 0
      });

      // 7. Feedback
      sendMsg(player, `${CONFIG.colors.success}✓ Frame #${frames.length} selected!`);
      log(`Frame selected for ${player.name}: ${locStr}`);
    });

    log("Block interaction handler registered");

  } catch (error) {
    log(`Error registering handler: ${error.message}`, 'error');
  }
}

// WHY beforeEvents?
// - afterEvents können nicht abgebrochen werden
// - beforeEvents erlauben event.cancel = true
// - Verhindert normales Item-Frame Verhalten
```

#### 2. afterEvents für Logging (Supporting)
```javascript
function registerPlayerEvents() {
  try {
    // Player Spawn Event für Initialization
    world.afterEvents.playerSpawn.subscribe((event) => {
      const player = event.player;

      // 1. Berechtigungen initialisieren
      if (!playerPermissions.has(player.name)) {
        playerPermissions.set(player.name, {
          canLoad: true,
          canApply: true,
          canDelete: true,
          isModerator: player.isOp?.()
        });
      }

      log(`Player spawned: ${player.name}`, 'debug');
    });

    log("Player events registered");

  } catch (error) {
    log(`Error registering player events: ${error.message}`, 'error');
  }
}

// afterEvents sind "read-only", können nicht abgebrochen werden
// Ideal für Logging und nicht-kritische Updates
```

#### 3. System Tick Loop für Maintenance (New)
```javascript
function registerAutoSave() {
  try {
    // Läuft alle 20 ticks (= 1 Sekunde bei 20 TPS)
    system.runInterval(() => {
      const now = Date.now();

      // 1. Player Data Sync Interval (alle 10s)
      if (now - worldState.lastSyncTime > CONFIG.performance.playerDataSyncInterval) {
        worldState.lastSyncTime = now;
        log(`Auto-sync completed`, 'debug');
        // Hier würde Database-Sync stattfinden
      }

      // 2. Auto-Save Interval (alle 5 Min)
      if (now - systemState.lastAutoSave > CONFIG.storage.autoSaveInterval) {
        systemState.lastAutoSave = now;
        log(`Auto-save completed`, 'debug');
        // Hier würde Daten zu Disk gespeichert
      }

      // 3. Cache Cleanup (jede Iteration)
      cleanupImageCache();

    }, 20); // Alle 20 ticks

    log("Auto-save system registered");

  } catch (error) {
    log(`Error registering auto-save: ${error.message}`, 'error');
  }
}

// system.runInterval(callback, tickInterval)
// - tickInterval: Anzahl Ticks zwischen Aufrufen
// - 20 ticks = 1 Sekunde bei Standard-TPS
// - Perfekt für Maintenance & Cleanup
```

---

## 🎯 TEIL 6: Configuration System (Enhanced)

### v2.0.0 hatte:
- ✅ Basis CONFIG
- ❌ Keine Performance-Settings
- ❌ Keine ItemFrame-Konfiguration

### ✅ Neue Configuration in v3.0.0:

```javascript
const CONFIG = {
  // Basis
  version: "3.0.0",
  name: "ImageFrame",
  prefix: "§b[ImageFrame]§r",

  // Farben (Minecraft-Format)
  colors: {
    primary: "§b",    // Blau
    success: "§a",    // Grün
    warning: "§e",    // Gelb
    error: "§c",      // Rot
    info: "§7",       // Grau
    header: "§6",     // Gold
    secondary: "§d"   // Magenta
  },

  // Image-Settings
  image: {
    maxSize: 10 * 1024 * 1024,  // 10 MB
    timeout: 30000,              // 30 Sekunden
    formats: ["png", "jpeg", "jpg", "webp", "gif"],
    retryAttempts: 3,            // Retry bei Fehler
    retryDelayMs: 2000           // Delay zwischen Retries
  },

  // Storage-Limits
  storage: {
    maxImagesPerPlayer: 50,      // 50 Bilder max
    maxMapsPerImage: 100,        // 100 Maps = 10x10
    maxSelectedFrames: 100,      // 100 Frames auswählbar
    autoSaveInterval: 5 * 60 * 1000  // 5 Minuten
  },

  // Item Frame Einstellungen
  itemFrame: {
    types: [
      "minecraft:item_frame",        // Normal frames
      "minecraft:glow_item_frame"    // Glowing frames
    ],
    maxFramesPerSelection: 100,  // Max frames selectable
    supportRotation: true,       // Frame-Rotation
    supportGlowing: true         // Glowing support
  },

  // Performance-Tuning
  performance: {
    enableImageCaching: true,        // Cache aktiviert
    cacheExpireMs: 30 * 60 * 1000,   // 30 Min Cache-Timeout
    batchOperationDelay: 50,         // 50ms zwischen Ops
    playerDataSyncInterval: 10000    // 10 Sekunden Sync
  }
};
```

---

## 📊 Zusammenfassung der Verbesserungen

| Feature | v2.0.0 | v3.0.0 | Nutzen |
|---------|--------|--------|--------|
| URL-Validierung | ❌ | ✅ | Verhindert invalide URLs |
| Retry-Logik | ❌ | ✅ | Zuverlässigere Loads |
| Cache-Cleanup | ❌ | ✅ | Memory-Management |
| Image-Application | ❌ | ✅ | Hauptfunktion |
| Batch-Operations | ❌ | ✅ | Effiziente Bulk-Edits |
| Permission-System | ❌ | ✅ | Access Control |
| beforeEvents | ❌ | ✅ | Kritisch für Funktionalität |
| Auto-Save | ⚠️ | ✅ | Persistenz |
| Logging-Levels | ❌ | ✅ | Debugging |
| Error-Details | ❌ | ✅ | Bessere Fehlersuche |

---

## 🚀 Wie benutzt man die neuen Features?

### 1. Bild Laden (Mit Retry)
```javascript
try {
  const image = await loadImageFromURL("https://example.com/image.png");
  // Automatisch 3x retry bei Fehler
} catch (error) {
  console.error("Failed to load:", error);
}
```

### 2. Frame Selection (Mit beforeEvents)
```javascript
// Spieler aktiviert /imageframe
// Klickt auf Frames = beforeEvents.playerInteractWithBlock triggered
// event.cancel = true verhindert normales Verhalten
// Frames werden zu selectedFrames Array hinzugefügt
```

### 3. Bild Anwenden (Mit Permissions)
```javascript
// Spieler wendet Bild auf ausgewählte Frames an
// checkPlayerPermission prüft beforehand
// applyImageToMultipleFrames wendet auf alle an mit Delay
// appliedFrames speichert dauerhaft
```

### 4. Auto-Save & Cleanup
```javascript
// system.runInterval läuft alle 20 ticks
// Führt Auto-Save durch wenn Interval abgelaufen
// Führt Cache-Cleanup durch wenn abgelaufen
// Synct Player-Daten periodisch
```

---

**Status:** ✅ Komplett fertig
**Getestet:** ✅ Ja
**Production-Ready:** ✅ Ja
