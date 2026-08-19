/**
 * ImageFrame - Complete Configuration File
 * Enthält alle einstellbaren Parameter für das Plugin
 *
 * Alle Werte können ohne Code-Änderungen angepasst werden
 */

export const CONFIG = {
  // ════════════════════════════════════════════════════════════════
  // PLUGIN INFORMATION
  // ════════════════════════════════════════════════════════════════

  plugin: {
    name: "ImageFrame",
    version: "1.0.0",
    author: "Your Server Team",
    prefix: "§b[ImageFrame]§r",
    description: "Advanced image management for Bedrock Edition"
  },

  // ════════════════════════════════════════════════════════════════
  // FEATURES TOGGLE
  // ════════════════════════════════════════════════════════════════

  features: {
    // Core Features
    mapSupport: true,                    // Support für Minecraft Maps
    itemFrameSupport: true,              // Support für Item Frames

    // Advanced Features
    overlaySupport: true,                // Bilder über Vanilla Maps legen
    markerSupport: true,                 // Markierungen auf Maps
    gifAnimationSupport: true,           // GIF Animation Support
    multiMapSupport: true,               // Bilder über mehrere Maps
    combinedImageMaps: true,             // Combined Map Items

    // Server Features
    refreshMapsCommand: true,            // /imageframe refresh Befehl
    survivalFriendly: true,              // Leere Maps erforderlich

    // API Features
    sharingSystem: true,                 // Bilder mit anderen teilen
    markerSharing: true,                 // Markierungen teilen

    // Optional Features
    webhookIntegration: false,           // Discord Webhooks (optional)
    advancedImageProcessing: false       // OpenCV Integration (optional)
  },

  // ════════════════════════════════════════════════════════════════
  // IMAGE PROCESSING SETTINGS
  // ════════════════════════════════════════════════════════════════

  image: {
    // Format Support
    supportedFormats: ["png", "jpeg", "jpg", "webp", "gif"],

    // Size Limits
    maxImageSize: 1024 * 1024 * 10,      // 10 MB Maximum
    minImageSize: 1024,                  // 1 KB Minimum

    // Network Settings
    defaultTimeout: 30000,               // 30 Sekunden Timeout
    maxRetries: 3,                       // Max Versuche für fehlgeschlagene Downloads

    // Quality Settings
    imageQuality: "high",                // "low", "medium", "high"
    autoCompression: true,               // Automatische Kompression

    // Caching
    enableCache: true,                   // Image Caching aktivieren
    maxCacheSize: 1024 * 1024 * 500,     // 500 MB Max Cache
    cacheExpiration: 7 * 24 * 60 * 60000 // 7 Tage Cache TTL
  },

  // ════════════════════════════════════════════════════════════════
  // MAP RENDERING SETTINGS
  // ════════════════════════════════════════════════════════════════

  map: {
    // Map Dimensions
    mapWidth: 128,                       // Pixel Breite
    mapHeight: 128,                      // Pixel Höhe

    // Colors
    defaultMapColor: [255, 255, 255, 255], // RGBA White
    backgroundColor: [255, 255, 255, 255],

    // Quality
    colorDepth: 32,                      // 8, 16, 24 oder 32 bit
    scalingQuality: "bicubic",           // "nearest", "linear", "bicubic"

    // Multi-Map Support
    maxMapWidth: 10,                     // Max 10x Maps in X-Richtung
    maxMapHeight: 10,                    // Max 10x Maps in Y-Richtung
    minMapWidth: 1,
    minMapHeight: 1,

    // Automatic Fitting
    autoFitImage: true,                  // Bilder automatisch anpassen
    preserveAspectRatio: true            // Seitenverhältnis beibehalten
  },

  // ════════════════════════════════════════════════════════════════
  // ITEM FRAME SETTINGS
  // ════════════════════════════════════════════════════════════════

  itemFrame: {
    // Entity Settings
    entity: "minecraft:item_frame",
    glowing: false,                      // Glühende Item Frames
    invisible: false,                    // Unsichtbare Item Frames

    // Marker Settings
    maxMarkersPerMap: 20,                // Max 20 Markierungen pro Map
    markerIconSize: 16,                  // Icon Größe in Pixel

    // Auto Placement
    autoDetectFrames: true,              // Automatische Erkennung
    smartPlacement: true,                // Intelligente Platzierung

    // Protection
    allowBreaking: true,                 // Item Frames brechen erlauben
    requirePermission: false             // Berechtigung für Item Frames
  },

  // ════════════════════════════════════════════════════════════════
  // ANIMATION SETTINGS
  // ════════════════════════════════════════════════════════════════

  animation: {
    // GIF Support
    gifEnabled: true,
    gifMaxFPS: 20,                       // Max 20 FPS für GIFs
    gifMinFPS: 1,                        // Min 1 FPS
    gifDefaultFPS: 10,                   // Standard 10 FPS

    // Animation Performance
    maxConcurrentAnimations: 10,         // Max gleichzeitige Animationen
    animationQuality: "high",            // "low", "medium", "high"

    // Frame Handling
    skipFrames: false,                   // Frames überspringen bei Performance-Problemen
    adaptiveQuality: true                // Qualität basierend auf FPS anpassen
  },

  // ════════════════════════════════════════════════════════════════
  // STORAGE & DATABASE SETTINGS
  // ════════════════════════════════════════════════════════════════

  storage: {
    // Player Limits
    maxImagesPerPlayer: 50,              // Standard Player Limit
    maxImagesAdmin: 100,                 // Admin Limit
    maxImageMapSize: {
      width: 10,
      height: 10
    },

    // Auto Save
    autoSaveEnabled: true,
    autoSaveInterval: 5 * 60 * 1000,     // Alle 5 Minuten speichern
    autoDeleteAfterDays: 90,             // Bilder nach 90 Tagen löschen (0 = deaktiviert)

    // Database
    useDatabase: true,                   // Datenbankunterstützung
    databaseName: "imageframe",
    persistenceMode: "sqlite",           // "sqlite", "json" (fallback)

    // Cleanup
    autoCleanup: true,
    cleanupInterval: 24 * 60 * 60 * 1000 // Täglich aufräumen
  },

  // ════════════════════════════════════════════════════════════════
  // USER INTERFACE SETTINGS
  // ════════════════════════════════════════════════════════════════

  ui: {
    // Titles & Messages
    title: "§b§lImageFrame§r",
    prefix: "§b[ImageFrame]§r ",

    // Colors
    colors: {
      primary: "§b",      // Cyan
      secondary: "§3",    // Dark Cyan
      success: "§a",      // Green
      warning: "§e",      // Yellow
      error: "§c",        // Red
      info: "§7",         // Gray
      header: "§6",       // Gold
      accent: "§d"        // Magenta
    },

    // UI Behavior
    autoCloseMenus: false,               // Menüs nach Auswahl schließen
    confirmDelete: true,                 // Bestätigung vor Löschen
    showConfirmations: true,             // Bestätigungsmeldungen anzeigen

    // Notifications
    enableNotifications: true,
    notificationStyle: "chat",           // "chat", "actionbar", "title"
    notificationDuration: 5000            // 5 Sekunden
  },

  // ════════════════════════════════════════════════════════════════
  // PERMISSIONS & ACCESS CONTROL
  // ════════════════════════════════════════════════════════════════

  permissions: {
    // Survival Mode
    requireEmptyMapSurvival: true,       // Leere Maps im Survival erforderlich

    // Image Limits
    defaultImageLimit: 10,               // Standard Limit für neue Spieler
    adminImageLimit: 100,                // Admin Limit

    // Per-Player Settings
    defaultAccessLevel: "private",       // Standard Zugriff: "private", "view", "edit"
    allowPublicImages: true,             // Öffentliche Bilder erlauben

    // Sharing Permissions
    allowSharing: true,
    shareAccessLevels: ["view", "edit", "admin"],
    defaultShareLevel: "view"
  },

  // ════════════════════════════════════════════════════════════════
  // ADVANCED SETTINGS
  // ════════════════════════════════════════════════════════════════

  advanced: {
    // Debugging
    debugLogging: true,                  // Debug Logs aktivieren
    verboseLogging: false,               // Ausführliches Logging
    logToFile: false,                    // Logs in Datei speichern
    logFile: "./logs/imageframe.log",

    // Performance
    enablePerformanceMonitoring: true,
    performanceThreshold: 50,            // ms - Warning bei langsamen Operationen

    // Development
    developmentMode: false,              // Entwicklungsmodus
    allowTestCommands: false,            // Test-Befehle erlauben

    // Experimental
    experimentalFeatures: false,
    betaFeatures: false,

    // Memory Management
    maxMemoryUsageMB: 512,               // Max Memory für Plugin
    aggressiveGarbageCollection: false,  // Aggressive Speicherfreigabe

    // Network
    proxySupport: true,                  // Proxy Support für URLs
    customHeaders: {
      "User-Agent": "BedrockBridge-ImageFrame/1.0.0"
    }
  },

  // ════════════════════════════════════════════════════════════════
  // COMMAND SETTINGS
  // ════════════════════════════════════════════════════════════════

  commands: {
    // Main Command
    mainCommand: "imageframe",
    mainCommandAlias: ["img"],

    // Admin Command
    adminCommand: "imageframeadmin",
    adminCommandAlias: ["imgadmin"],

    // Command Cooldown
    commandCooldown: 500,                // 500ms zwischen Befehlen

    // Command Restrictions
    restrictInCreative: false,           // Einschränkung in Creative?
    requireAdminForAdmin: true           // Admin Befehle nur für Admins?
  },

  // ════════════════════════════════════════════════════════════════
  // MARKER SETTINGS
  // ════════════════════════════════════════════════════════════════

  markers: {
    // Marker Types
    availableTypes: [
      "mansion",
      "temple",
      "stronghold",
      "spawner",
      "banner_white",
      "banner_black",
      "banner_red",
      "banner_blue",
      "banner_green",
      "banner_yellow"
    ],

    // Display
    showMarkerLabels: true,
    labelFontSize: 12,
    labelMaxLength: 20,

    // Limits
    maxMarkers: 20,                      // Pro Map
    maxMarkerDistance: 127,              // Max Koordinatenwert

    // Colors
    defaultMarkerColor: "red",
    markerColors: ["red", "blue", "green", "yellow", "white", "black"]
  },

  // ════════════════════════════════════════════════════════════════
  // AUTO-SAVE & SCHEDULING
  // ════════════════════════════════════════════════════════════════

  scheduling: {
    // Auto-Save
    autoSaveEnabled: true,
    autoSaveInterval: 5 * 60 * 1000,     // Alle 5 Minuten

    // Cache Cleanup
    cacheCleanupInterval: 30 * 60 * 1000, // Alle 30 Minuten
    cacheCleanupAge: 24 * 60 * 60 * 1000, // Einträge älter als 24h löschen

    // Database Optimization
    dbOptimizeInterval: 24 * 60 * 60 * 1000, // Täglich

    // Statistics
    statisticsInterval: 60 * 60 * 1000   // Stündlich
  },

  // ════════════════════════════════════════════════════════════════
  // API ENDPOINTS (für zukünftige Erweiterungen)
  // ════════════════════════════════════════════════════════════════

  api: {
    // External APIs
    enableExternalAPIs: false,
    imageProcessingAPI: "https://api.example.com/process-image",

    // Webhooks
    webhooksEnabled: false,
    webhookTimeout: 5000,
    webhookRetries: 3
  }
};

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

export default CONFIG;
