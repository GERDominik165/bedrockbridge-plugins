# 🚀 ImageFrame Setup Guide

Schritt-für-Schritt Anleitung zur Installation und Konfiguration von ImageFrame.

## Table of Contents

- [Quick Start](#quick-start)
- [Full Installation](#full-installation)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Quick Start

### Minimale Installation (5 Minuten)

1. **Plugin Datei kopieren:**
   ```bash
   cp imageframe.js D:\BB\bridgePlugins\ImageFrame\
   ```

2. **Server neustarten:**
   ```bash
   # Restart Bedrock Bridge Server
   ```

3. **Testen:**
   ```
   /imageframe
   ```

**Das war's!** Das Plugin ist einsatzbereit.

---

## Full Installation

### Schritt 1: Voraussetzungen prüfen

```bash
# Überprüfe BedrockBridge Installation
ls D:\BB\bridgeAPI\

# Überprüfe anderen Plugins existieren
ls D:\BB\bridgePlugins\

# Überprüfe Node.js Version
node --version
# Output sollte sein: v14.0 oder höher
```

### Schritt 2: Dateistruktur vorbereiten

```bash
# Verzeichnis erstellen
mkdir -p D:\BB\bridgePlugins\ImageFrame

# Überprüfe Verzeichnis
ls D:\BB\bridgePlugins\ImageFrame
```

### Schritt 3: Plugin Dateien kopieren

```bash
# Hauptdatei
cp imageframe.js D:\BB\bridgePlugins\ImageFrame\

# Konfiguration
cp CONFIG.js D:\BB\bridgePlugins\ImageFrame\

# Dokumentation
cp README.md D:\BB\bridgePlugins\ImageFrame\
cp DEVELOPER_GUIDE.md D:\BB\bridgePlugins\ImageFrame\
cp SETUP_GUIDE.md D:\BB\bridgePlugins\ImageFrame\
```

### Schritt 4: BedrockBridge Commands registrieren

Die Commands werden automatisch beim Plugin-Start registriert. Keine manuelle Registrierung erforderlich.

**Überprüfung:**
```
/imageframe help
```

### Schritt 5: Datenbank vorbereiten (Optional)

Wenn du Persistenz-Speicherung möchtest:

```bash
# Datenbank wird automatisch erstellt beim ersten Start
# Keine manuelle Setup erforderlich
```

### Schritt 6: Server konfigurieren

Bearbeite `imageframe.js` und passe CONFIG an:

```javascript
// In imageframe.js finden und anpassen:
const CONFIG = {
  features: {
    mapSupport: true,              // ← Ändern if needed
    itemFrameSupport: true,        // ← Ändern if needed
    survivalFriendly: true,        // ← Survival Mode?
  },

  permissions: {
    defaultImageLimit: 10,         // ← Limit pro Spieler
    adminImageLimit: 100,          // ← Admin Limit
    requireEmptyMapSurvival: true, // ← Survival Mode?
  }
};
```

### Schritt 7: Server testen

```bash
# Bedrock Server starten/neustarten
# Im Server-Log solltest du sehen:
# [ImageFrame] [HH:MM:SS] INFO: Initializing ImageFrame v1.0.0
# [ImageFrame] [HH:MM:SS] INFO: Plugin initialized successfully!
```

### Schritt 8: Im Spiel testen

**Als Admin/Operator:**

```
/imageframe help
```

**Sollte anzeigen:**
```
§b§lImageFrame§r Help
═════════════════════
§7Commands:
§3/imageframe - Main menu
§3/imageframe load <url> - Load image
§3/imageframe list - View images
§3/imageframe refresh <id> - Refresh image

§7Features:
§3• PNG, JPEG, WEBP, GIF support
§3• Multiple map sizes
§3• Image markers
§3• GIF animations
§3• Image sharing
═════════════════════
```

---

## Configuration

### CONFIG.js verwenden (Alternative)

Statt imageframe.js zu ändern, kannst du CONFIG.js importieren:

```javascript
// Am Anfang von imageframe.js:
import { CONFIG as IMPORTED_CONFIG } from './CONFIG.js';

// Dann:
Object.assign(CONFIG, IMPORTED_CONFIG);
```

### Wichtige Einstellungen

#### 1. Features aktivieren/deaktivieren

```javascript
features: {
  mapSupport: true,              // Maps verwenden?
  itemFrameSupport: true,        // Item Frames verwenden?
  gifAnimationSupport: true,     // GIF-Support?
  markerSupport: true,           // Markierungen?
  sharingSystem: true,           // Sharing?
}
```

#### 2. Storage Limits

```javascript
storage: {
  maxImagesPerPlayer: 50,        // Bilder pro Spieler
  autoSaveInterval: 300000,      // Speichern alle 5 Min
}
```

#### 3. Survival Mode

```javascript
permissions: {
  requireEmptyMapSurvival: true, // Leere Maps erforderlich?
  survivalFriendly: true,        // Survival Mode aktivieren?
}
```

#### 4. Image Loading

```javascript
image: {
  maxImageSize: 1024 * 1024 * 10,     // 10 MB max
  defaultTimeout: 30000,              // 30 Sekunden
  supportedFormats: ["png", "jpeg", "jpg", "webp", "gif"]
}
```

#### 5. Performance

```javascript
animation: {
  gifMaxFPS: 20,                 // Max FPS für GIFs
  maxConcurrentAnimations: 10,   // Gleichzeitige Animationen
}
```

---

## Verification

### Server Log überprüfen

Beim Start solltest du folgende Logs sehen:

```log
§b[ImageFrame]§r ============================================
§b[ImageFrame]§r Initializing ImageFrame v1.0.0
§b[ImageFrame]§r ============================================
§b[ImageFrame]§r INFO: Database initialized successfully
§b[ImageFrame]§r INFO: Events handlers registered successfully
§b[ImageFrame]§r INFO: Commands registered successfully
§b[ImageFrame]§r ============================================
§b[ImageFrame]§r Plugin initialized successfully!
§b[ImageFrame]§r Features enabled:
§b[ImageFrame]§r   ✓ mapSupport
§b[ImageFrame]§r   ✓ itemFrameSupport
§b[ImageFrame]§r   ✓ overlaySupport
§b[ImageFrame]§r   ✓ markerSupport
§b[ImageFrame]§r   ✓ gifAnimationSupport
§b[ImageFrame]§r   ✓ multiMapSupport
§b[ImageFrame]§r   ✓ combinedImageMaps
§b[ImageFrame]§r   ✓ refreshMapsCommand
§b[ImageFrame]§r   ✓ survivalFriendly
§b[ImageFrame]§r ============================================
```

### Commands überprüfen

```bash
# Im Spiel als Admin:
/imageframe help
# Sollte Help anzeigen

/imageframeadmin stats
# Sollte Statistiken zeigen

/imageframe list
# Sollte "You have no images" zeigen
```

### Funktionalität testen

```bash
# 1. Test: Bild laden
/imageframe load https://i.imgur.com/tLQzS7Z.png
# Sollte erfolgreich sein

# 2. Test: Bild auflisten
/imageframe list
# Sollte das geladene Bild anzeigen

# 3. Test: Statistiken
/imageframeadmin stats
# Sollte 1 Image anzeigen
```

---

## Troubleshooting

### Problem: Plugin startet nicht

**Fehler:**
```
[ImageFrame] Fatal error: Cannot find module...
```

**Lösung:**
1. Überprüfe dass imageframe.js in `D:\BB\bridgePlugins\ImageFrame\` liegt
2. Überprüfe dass BedrockBridge installiert ist
3. Überprüfe Server Logs auf Details

### Problem: Commands nicht registriert

**Symptom:** `/imageframe` Command unknown

**Lösung:**
```javascript
// In imageframe.js, überprüfe:
if (!bridge || !bridge.bedrockCommands) {
  console.error("BedrockBridge not available!");
  return;
}

// Überprüfe dass registerCommands() aufgerufen wird
initializePlugin() {
  registerCommands(); // ← Muss aufgerufen werden
}
```

### Problem: Images laden nicht

**Fehler:** "HTTP Error"

**Lösung:**
1. Überprüfe URL ist gültig:
   ```
   https://example.com/image.png
   ```

2. Überprüfe Image-Format:
   - PNG, JPEG, WEBP, GIF
   - Keine BMP, TIFF, etc.

3. Überprüfe Image-Größe:
   - Max 10 MB
   - Komprimiere großen Images

4. Überprüfe Network:
   - Server kann externe URLs erreichen?
   - Firewall blockiert?

### Problem: Database Fehler

**Fehler:** "Database init error"

**Lösung:**
1. Plugin läuft ohne Database im Memory-Mode
2. Überprüfe dass Database Modul vorhanden ist
3. Überprüfe dass Write-Zugriff auf Verzeichnis besteht

```bash
# Überprüfe Schreibrechte
ls -la D:\BB\bridgePlugins\ImageFrame\
```

### Problem: UI Forms öffnen nicht

**Symptom:** Menü wird nicht angezeigt

**Lösung:**
```javascript
// Overprüfe dass Forms richtig geschlossen werden
try {
  const response = await form.show(player);
  if (response.canceled) return;
  // Process response
} catch (error) {
  console.error("Form error:", error);
}
```

### Problem: Memory Leak / Performance

**Symptom:** Server wird langsamer über Zeit

**Lösung:**
```bash
# 1. Überprüfe Cache Größe
/imageframeadmin stats

# 2. Leere Cache wenn nötig
/imageframeadmin clearcache

# 3. Überprüfe CONFIG
CONFIG.storage.autoSaveInterval    # Zu häufig?
CONFIG.animation.maxConcurrentAnimations  # Zu viele?
CONFIG.image.maxCacheSize          # Zu groß?
```

---

## Next Steps

### 1. Customize für deinen Server

**Empfohlene Anpassungen:**

```javascript
// CONFIG.permissions - Spieler Limits setzen
defaultImageLimit: 20,  // z.B. 20 statt 10

// CONFIG.storage - Auto-Save konfigurieren
autoSaveInterval: 600000,  // 10 Minuten statt 5

// CONFIG.image - Image Quality
imageQuality: "high",  // Bessere Qualität

// CONFIG.ui.colors - Farben anpassen
colors: {
  primary: "§b",  // Deine Server-Farbe?
  // ...
}
```

### 2. Deine Spieler informieren

Schreib ein MOTD oder Wiki-Eintrag:

```
🖼️ ImageFrame verfügbar!
━━━━━━━━━━━━━━━━━━━━━━━━━━
/imageframe - Menü öffnen
/imageframe load <url> - Bild laden
/imageframe help - Hilfe

Supported Formate:
📷 PNG, JPEG, WEBP, GIF

Limits:
• Max 20 Bilder pro Spieler
• Max 10MB pro Bild
```

### 3. Admin Befehle konfigurieren

Überprüfe Admin-Befehle:

```bash
# Als Admin testen:
/imageframeadmin stats        # Statistiken
/imageframeadmin clear        # Alle Bilder löschen
/imageframeadmin clearcache   # Cache leeren
```

### 4. Backup-Strategie

Sicherungsstrategie für Images:

```bash
# Regelmäßige Backups erstellen
# 1. Database backups
cp -r D:\BB\database D:\BB\database.backup.$(date +%Y%m%d)

# 2. Plugin config
cp D:\BB\bridgePlugins\ImageFrame\imageframe.js imageframe.backup.js
```

### 5. Monitoring einrichten

Überwache Plugin Performance:

```javascript
// Regelmäßig diese Befehle testen:
setInterval(() => {
  const stats = globalThis.ImageFrame.debug.getStats();
  console.log("ImageFrame Stats:", stats);
}, 3600000);  // Stündlich
```

### 6. Community Features

Teile Best Practices:

```
Best Image Sources:
• imgur.com
• imgur.com/random
• unsplash.com
• pixabay.com
• pexels.com

Pro Tips:
• Nutze externe Tools zum Komprimieren
• GIFs müssen unter 5 MB sein
• Landkarten-Bilder skalieren am besten
```

---

## Support Resources

### Dokumentation
- `README.md` - User Guide
- `DEVELOPER_GUIDE.md` - Developer Reference
- `SETUP_GUIDE.md` - Diese Datei

### Commands
- `/imageframe help` - In-Game Hilfe
- `/imageframeadmin` - Admin Menü
- `globalThis.ImageFrame.debug` - Debug Tools

### Logs
- Server Console - Real-time Logs
- `./logs/imageframe.log` - Log-Datei (wenn aktiviert)

---

## Quick Reference

### Command Summary

| Command | Description |
|---------|-------------|
| `/imageframe` | Öffne Hauptmenü |
| `/imageframe load <url>` | Lade Bild |
| `/imageframe list` | Zeige Bilder |
| `/imageframe refresh <id>` | Aktualisiere Bild |
| `/imageframe delete <id>` | Lösche Bild |
| `/imageframe help` | Hilfe |
| `/imageframeadmin stats` | Statistiken |
| `/imageframeadmin clear` | Lösche alle |
| `/imageframeadmin clearcache` | Leere Cache |

### Settings Quick Reference

```javascript
// Sicherheit
requireEmptyMapSurvival: true      // Maps im Survival?

// Performance
maxImagesPerPlayer: 50              // Bilder pro Spieler
maxImageSize: 10 MB                 // Max Bild-Größe
gifMaxFPS: 20                       // GIF-Geschwindigkeit

// Features
mapSupport: true                    // Maps?
itemFrameSupport: true              // Item Frames?
gifAnimationSupport: true           // GIF-Animationen?
```

---

**Installation Complete!** 🎉

Du bist bereit um ImageFrame auf deinem Server zu nutzen.

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
