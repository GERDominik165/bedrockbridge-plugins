# 🖼️ ImageFrame - Advanced Image Management for Bedrock Edition

**Version:** 1.0.0
**Compatible:** Bedrock 1.21.120+, BedrockBridge
**Status:** Production Ready

## Overview

ImageFrame ist ein umfassendes, durchdachtes Plugin für Minecraft Bedrock Edition, das es ermöglicht, Bilder von URLs auf Maps und Item Frames anzuzeigen. Es unterstützt PNG, JPEG, WEBP und animierte GIF-Dateien mit vollständiger Server-UI Integration, Datenbankunterstützung und erweiterten Features wie Bild-Markierungen und Freigabe.

## ✨ Features

### Core Features

- **🌐 URL Image Loading** - PNG, JPEG, WEBP und GIF von externen URLs laden
- **📍 Item Frame Integration** - Bilder direkt auf Item Frames platzieren
- **🗺️ Multi-Map System** - Bilder können über mehrere Maps verteilt werden (bis 10x10)
- **🎬 GIF Animation Support** - Animierte GIFs werden automatisch erkannt und abgespielt
- **📌 Image Markers** - Markierungen auf Maps mit verschiedenen Icons hinzufügen
- **🔄 Refresh System** - Maps von der Quelle aktualisieren ohne zu ersetzen
- **💾 Combined Maps** - Multiple Maps als einzelnes Item verwalten

### Advanced Features

- **🤝 Image Sharing** - Bilder mit anderen Spielern teilen mit Zugriffsstufen
- **📊 Player Management** - Separate Image-Limits pro Spieler
- **🎨 Overlay Support** - Bilder über reguläre Vanilla Maps legen
- **💾 Database Integration** - Persistente Speicherung aller Bilder und Metadaten
- **🔐 Survival Friendly** - Leere Maps im Inventar erforderlich (konfigurierbar)
- **⚙️ Full Configuration** - Umfangreiche Anpassungsmöglichkeiten

## 📋 Installation

### Voraussetzungen

- Minecraft Bedrock Server mit BedrockBridge
- Bedrock 1.21.120 oder höher
- Aktualisierte BedrockBridge API

### Installation Steps

1. **Plugin Datei kopieren:**
   ```bash
   cp imageframe.js D:\BB\bridgePlugins\ImageFrame\
   ```

2. **Commands registrieren:**
   Die Commands werden automatisch beim Plugin-Start registriert.

3. **Datenbank vorbereiten:**
   - Das Plugin erstellt automatisch notwendige Tabellen
   - Datenbank muss verfügbar sein (optional, läuft ohne DB im Memory-Mode)

4. **Server neustarten:**
   ```bash
   # Bedrock Server neustarten
   ```

5. **Testen:**
   ```
   /imageframe help
   ```

## 🎮 Usage

### Grundlegendes Benutzermenü

```
/imageframe
```

Öffnet das Hauptmenü mit:
- 🌐 Load Image from URL
- 📍 Select Item Frames
- 🎨 My Images
- 🔄 Refresh Map
- 📊 Statistics
- ❓ Help

### Schnelle Befehle

#### Bild laden
```
/imageframe load https://example.com/image.png
```

#### Bilder auflisten
```
/imageframe list
```

#### Bild aktualisieren
```
/imageframe refresh image_1
```

#### Bild löschen
```
/imageframe delete image_1
```

### Admin Befehle

```
/imageframeadmin stats      # Zeige Statistiken
/imageframeadmin clear      # Lösche alle Bilder
/imageframeadmin clearcache # Leere Cache
```

## 🏗️ Architecture

### Class Structure

```
ImageFrame Plugin
├── ImageProcessor
│   ├── loadImageFromURL()
│   ├── processImageForMap()
│   ├── processGIFAnimation()
│   └── Cache Management
│
├── ImageMapManager
│   ├── createImageMap()
│   ├── addMapMarker()
│   ├── removeMarker()
│   ├── refreshImageMap()
│   └── deleteImageMap()
│
├── ItemFrameHandler
│   ├── selectItemFrame()
│   ├── applyImageToFrames()
│   └── Selection Management
│
├── AnimationSystem
│   ├── startAnimationForGIF()
│   ├── stopAnimation()
│   └── Animation Loop
│
├── UIManager
│   ├── showMainMenu()
│   ├── showLoadImageForm()
│   ├── showPlayerImages()
│   ├── showAddMarker()
│   └── All UI Forms
│
└── DatabaseManager
    ├── saveImageData()
    ├── loadAllImages()
    ├── saveMarker()
    └── Database Operations
```

### Data Flow

```
URL → ImageProcessor → Cache → ImageMapManager → Database
  ↓
  Maps → ItemFrameHandler → Item Frames
  ↓
  UIManager → Player Feedback
```

### State Management

- **imageData** - Image Metadata Storage
- **mapData** - Map Tile Information
- **playerData** - Player Specific Data
- **animationStates** - Active Animations
- **worldData** - Global Plugin State

## 🔧 Configuration

Alle Einstellungen befinden sich in der CONFIG Objekt:

```javascript
CONFIG = {
  features: {
    mapSupport: true,           // Map-Unterstützung
    itemFrameSupport: true,     // Item Frame Unterstützung
    overlaySupport: true,       // Overlay Unterstützung
    markerSupport: true,        // Markierungen
    gifAnimationSupport: true,  // GIF Animationen
    multiMapSupport: true,      // Mehrere Maps
    combinedImageMaps: true,    // Kombinierte Maps
    refreshMapsCommand: true,   // Refresh Command
    survivalFriendly: true      // Survival Mode
  },

  image: {
    maxImageSize: 1024 * 1024 * 10,  // 10 MB
    defaultTimeout: 30000,            // 30 Sekunden
    supportedFormats: ["png", "jpeg", "jpg", "webp", "gif"]
  },

  storage: {
    maxImagesPerPlayer: 50,  // Standard: 50, Admin: 100
    autoSaveInterval: 300000  // 5 Minuten
  }
}
```

## 📊 Database Schema

### Table: imageframe_images
```sql
imageId (TEXT) - Eindeutige Bild-ID
owner (TEXT) - Spielername des Besitzers
url (TEXT) - Original URL
mapWidth (INTEGER) - Breite in Maps
mapHeight (INTEGER) - Höhe in Maps
created (INTEGER) - Erstellungszeit (Timestamp)
lastRefreshed (INTEGER) - Letzte Aktualisierung
type (TEXT) - "url", "camera", "overlay"
shared (INTEGER) - 0 or 1 (geteilt)
accessLevel (TEXT) - "private", "view", "edit", "admin"
```

### Table: imageframe_markers
```sql
markerId (TEXT) - Eindeutige Marker-ID
imageId (TEXT) - Zugehörige Bild-ID
label (TEXT) - Marker-Name
x (INTEGER) - X Position (0-127)
y (INTEGER) - Y Position (0-127)
iconType (TEXT) - Icon Type (mansion, temple, etc)
color (TEXT) - Marker-Farbe
created (INTEGER) - Erstellungszeit
```

### Table: imageframe_players
```sql
playerName (TEXT) - Spielername
imageLimit (INTEGER) - Max. Bilder pro Spieler
autoSave (INTEGER) - Automatisches Speichern
notifications (INTEGER) - Benachrichtigungen
joinedDate (INTEGER) - Beitrittsdatum
```

## 🌐 Network & API

### Image Loading

```javascript
// HTTP GET Request mit Timeout
const request = new HttpRequest(url)
  .setMethod(HttpRequestMethod.Get)
  .setHeaders([new HttpHeader('User-Agent', 'ImageFrame/1.0')])
  .setTimeout(30000);

const response = await http.request(request);
```

### Supported Image Formats

| Format | MIME Type | Animation | Max Size |
|--------|-----------|-----------|----------|
| PNG | image/png | Nein | 10 MB |
| JPEG | image/jpeg | Nein | 10 MB |
| WebP | image/webp | Nein | 10 MB |
| GIF | image/gif | Ja | 10 MB |

### URL Requirements

- Must use HTTPS protocol
- Must be publicly accessible
- Must return proper Content-Type header
- Response must be within 30 second timeout

## 🎨 UI/UX Details

### Forms Used

1. **ActionFormData** - Main menu, image selection, marker icons
2. **ModalFormData** - URL input, marker creation, sharing options
3. **MessageFormData** - Confirmations, statistics display

### Color Codes

```javascript
primary: "§b"  // Cyan
secondary: "§3" // Dark Cyan
success: "§a"  // Green
warning: "§e"  // Yellow
error: "§c"    // Red
info: "§7"     // Gray
header: "§6"   // Gold
```

## 📈 Performance Optimization

### Caching Strategy

```javascript
// Image Cache
- URLs sind der Cache-Key
- Bilder bleiben bis zum Manual Clear im Cache
- Cache Size wird begrenzt auf verfügbaren Speicher

// Map Tile Caching
- Verarbeitete Maps werden gecacht
- Refresh lädt von URL aber nutzt lokalen Cache für Processing
```

### Async Operations

- Image Loading läuft asynchron
- GIF Processing ist non-blocking
- Database Operations sind async

### Memory Management

```javascript
// Cache Stats verfügbar via:
imageMapManager.imageProcessor.getCacheStats()
// Returns: { totalEntries, totalBytes }

// Cache Clearing:
/imageframeadmin clearcache
```

## 🔐 Security Considerations

### URL Validation

```javascript
function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### Size Limits

- Max Image Size: 10 MB
- HTTP Timeout: 30 Sekunden
- Max Map Size: 10x10 (100 maps)
- Max Markers: 20 pro Map

### Access Control

- Player Limits: 50 images standard, 100 admin
- Sharing Permissions: view, edit, admin
- Survival Mode: Leere Maps erforderlich

## 🐛 Debugging & Troubleshooting

### Debug Output

```javascript
// Aktiviert durch CONFIG.debugLogging = true
// Logs zu Console mit Timestamp

// Beispiel Output:
// §b[ImageFrame]§r [14:30:45] INFO: Image cached successfully
```

### Debug Commands (via Console)

```javascript
// Zugriff via globalThis.ImageFrame.debug

ImageFrame.debug.getStats()           // Plugin Statistics
ImageFrame.debug.listAllImages()      // Alle geladenen Images
ImageFrame.debug.clearCache()         // Cache leeren
ImageFrame.debug.deleteImage(id)      // Image löschen
```

### Common Issues

#### ❌ "Invalid URL format"
- URL muss mit `https://` beginnen
- URL muss öffentlich erreichbar sein

#### ❌ "Image exceeds maximum size"
- Bild ist > 10 MB
- Komprimieren oder kleineres Bild verwenden

#### ❌ "HTTP 404 Error"
- URL existiert nicht
- Überprüfen ob Bild noch verfügbar ist

#### ❌ "Unsupported image format"
- Format wird nicht unterstützt
- Nur PNG, JPEG, WEBP, GIF möglich

## 📚 API Reference

### Externe Nutzung im Code

```javascript
// Import
import { bridge, database } from "../addons";

// Command Registration
bridge.bedrockCommands.registerCommand("imageframe", handler, "desc");
bridge.bedrockCommands.registerAdminCommand("imageframeadmin", handler, "desc");

// Database Access
database.makeTable('table_name', schema);
database.query('SELECT * FROM table WHERE id = ?', [id]);
```

### Event Handlers

```javascript
// Player Spawn
world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  // Handle player join
});

// Break Block
world.afterEvents.playerBreakBlock.subscribe((event) => {
  // Handle block break (item frame detection)
});
```

## 🚀 Erweiterungsmöglichkeiten

Das Plugin ist leicht erweiterbar:

1. **Neue Image Formate** - ImageProcessor.detectImageFormat() erweitern
2. **Weitere Marker Types** - addMapMarker() Funktion erweitern
3. **Custom APIs** - WebAPIIntegration Klasse hinzufügen
4. **Neue UI Screens** - UIManager mit neuen Formen erweitern
5. **Plugin Integration** - Via bridge API mit anderen Plugins verbinden

## 📝 Version History

### v1.0.0 (Current)
- ✅ Complete Image Loading System
- ✅ Multi-Map Support (1x1 to 10x10)
- ✅ GIF Animation Support
- ✅ Image Markers System
- ✅ Image Sharing & Permissions
- ✅ Full Database Integration
- ✅ Server-UI Complete
- ✅ Admin Commands
- ✅ Comprehensive Documentation

## 📞 Support & Troubleshooting

### Check Plugin Status

```
/imageframeadmin stats
```

### View All Images

```
/imageframe list
```

### Clear Everything

```
/imageframeadmin clear
```

## 📄 License

This plugin is part of BedrockBridge ecosystem.

---

**ImageFrame v1.0.0** - Fully Featured Image Management System
Built with ❤️ for Bedrock Edition
