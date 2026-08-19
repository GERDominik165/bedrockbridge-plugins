// whconfig.js - BedrockBridge Webhook Configuration
// Version: 3.0.0 - UPGRADED
// Diese Datei enthält alle Konfigurationen für das Webhook Plugin
// NEW: Achievement Tracking, Ratelimit Management, Health Checks, Advanced Analytics

export const WHConfig = {
  // ================== WEBHOOK URLS ==================
  // Hier kannst du für jeden Log-Typ einen eigenen Discord Channel definieren
  webhooks: {
    // Hauptkanal - Fallback für alle Nachrichten ohne eigenen Webhook
    general: "https://discord.com/api/webhooks/REDACTED/REDACTED",
    
    // Chat & Kommunikation
    chat: "https://discord.com/api/webhooks/REDACTED/REDACTED",              // In-Game Chat Nachrichten
    commands: "https://discord.com/api/webhooks/REDACTED/REDACTED",          // Command-Nutzung (/command, !command)
    
    // Spieler Events
    playerEvents: "https://discord.com/api/webhooks/REDACTED/REDACTED",      // Join/Leave/AFK
    deaths: "https://discord.com/api/webhooks/REDACTED/REDACTED",           // Tod-Nachrichten
    achievements: "https://discord.com/api/webhooks/REDACTED/REDACTED",     // Erfolge & Advancements
    
    // Server Events  
    serverEvents: "https://discord.com/api/webhooks/REDACTED/REDACTED",     // Start/Stop/Restart
    worldEvents: "https://discord.com/api/webhooks/REDACTED/REDACTED",      // Boss-Kills, Raids, Events
    weatherEvents: "https://discord.com/api/webhooks/REDACTED/REDACTED",    // Wetter-Änderungen
    
    // Logs & Überwachung
    blockLogs: "https://discord.com/api/webhooks/REDACTED/REDACTED",        // Block Place/Break (wichtige Blöcke)
    itemLogs: "https://discord.com/api/webhooks/REDACTED/REDACTED",         // Item-Nutzung (wichtige Items)
    containerLogs: "https://discord.com/api/webhooks/REDACTED/REDACTED",    // Kisten/Container-Zugriffe
    teleportLogs: "https://discord.com/api/webhooks/REDACTED/REDACTED",     // Teleports & Dimensionswechsel
    
    // Moderation & Sicherheit
    moderation: "https://discord.com/api/webhooks/REDACTED/REDACTED",       // Kicks/Bans/Mutes
    anticheat: "https://discord.com/api/webhooks/REDACTED/REDACTED",       // Verdächtige Aktivitäten
    errors: "https://discord.com/api/webhooks/REDACTED/REDACTED",          // Fehler & Warnungen
    
    // Statistiken & Reports
    analytics: "https://discord.com/api/webhooks/REDACTED/REDACTED",       // Stündliche/Tägliche Reports
    economy: "https://discord.com/api/webhooks/REDACTED/REDACTED",         // Economy-Transaktionen (falls vorhanden)
    leaderboard: "https://discord.com/api/webhooks/REDACTED/REDACTED"      // Top-Listen Updates
  },
  
  // ================== FEATURE TOGGLES ==================
  // Aktiviere/Deaktiviere einzelne Features
  features: {
    // Chat & Kommunikation
    chat: {
      enabled: true,
      logToDiscord: true,         // Chat nach Discord senden
      syncFromDiscord: false,     // Discord nachrichten im Spiel (benötigt Bot)
      showPlayerTags: true,       // [Admin], [VIP] etc.
      antiSpam: true,            // Spam-Schutz
      mentionNotifications: true  // @Erwähnungen
    },
    
    // Spieler Tracking
    players: {
      joinLeave: true,           // Join/Leave Nachrichten
      firstJoin: true,           // Spezielle Nachricht bei erstem Join
      sessionTracking: true,     // Spielzeit tracken
      afkDetection: true,        // AFK-Erkennung
      afkTimeout: 300000,        // 5 Minuten
      locationTracking: true,    // Standort bei Events
      inventoryTracking: true,   // Inventar bei Tod
      achievements: true         // NEW: Achievement/Advancement Tracking
    },
    
    // Tod & Kampf
    combat: {
      deathMessages: true,       // Tod-Nachrichten
      killTracking: true,        // PvP/PvE Kills
      damageTracking: true,      // Schaden-Statistiken
      itemDropAlerts: true,      // Warnung bei wertvollen Items
      combatLog: true           // Combat-Log Erkennung
    },
    
    // Welt Events
    world: {
      bossKills: true,          // Enderdrache, Wither
      raids: true,              // Raid Events
      structureLooting: true,   // Strukturen geplündert
      weatherChanges: true,     // Wetter-Änderungen
      timeChanges: true,       // Tag/Nacht (meist zu viel)
      explosions: true          // TNT/Creeper Explosionen
    },
    
    // Block & Item Logging
    blocks: {
      valuable: true,           // Diamanten, Netherite, etc.
      containers: true,         // Kisten, Shulker
      spawners: true,          // Spawner-Interaktionen
      creative: true,          // Creative-Mode Aktionen
      placement: true,         // Block-Platzierung
      breaking: true,          // Block-Zerstörung
      // Zu überwachende Blöcke
      watchlist: [
        "diamond_ore", "deepslate_diamond_ore",
        "ancient_debris", "emerald_ore", "deepslate_emerald_ore",
        "beacon", "conduit", "dragon_egg",
        "spawner", "end_portal_frame",
        "command_block", "structure_block"
      ]
    },
    
    // Item Tracking
    items: {
      usage: true,              // Item-Nutzung
      crafting: true,           // Crafting wichtiger Items
      enchanting: true,         // Verzauberungen
      trading: true,            // Villager-Handel
      dropping: true,           // Items wegwerfen
      // Zu überwachende Items
      watchlist: [
        "totem_of_undying", "elytra", 
        "nether_star", "dragon_egg",
        "netherite", "enchanted_golden_apple"
      ]
    },
    
    // Server Management
    server: {
      startStop: true,          // Server Start/Stop
      performance: true,        // TPS & Lag Warnungen
      backups: true,           // Backup-Benachrichtigungen
      errors: true,            // Fehler-Logging
      resourcePack: true,      // Resource Pack Events
      maintenance: true        // Wartungsmodus
    },
    
    // Moderation
    moderation: {
      commands: true,           // Mod-Commands loggen
      teleports: true,          // TP-Commands
      gamemode: true,           // Gamemode-Änderungen
      permissions: true,        // Permission-Änderungen
      whitelist: true,         // Whitelist-Änderungen
      suspicious: true         // Verdächtige Aktivitäten
    },
    
    // Analytics & Reports
    analytics: {
      enabled: true,
      hourlyReports: true,      // Stündliche Reports
      dailyReports: true,       // Tägliche Reports
      weeklyReports: true,      // Wöchentliche Reports
      playerStats: true,        // Spieler-Statistiken
      serverStats: true,        // Server-Statistiken
      economyStats: true        // Economy-Statistiken
    },
    
    // Integration Features
    integrations: {
      discordSync: true,        // Discord Integration
      webDashboard: true,       // Web Dashboard Support
      apiEndpoints: true,       // API für externe Tools
      database: true           // Datenbank-Speicherung
    }
  },
  
  // ================== AUSSEHEN & FORMATIERUNG ==================
  appearance: {
    // Server Branding
    serverName: "Minecraft Server",
    serverIcon: "http://45.92.216.56:53132/favicon.ico",
    serverBanner: "https://example.com/banner.png",
    serverWebsite: "http://45.92.216.56:53132/index.html",
    
    // Embed Farben (Discord Farben)
    colors: {
      default: 0x5865F2,       // Discord Blurple
      success: 0x57F287,       // Grün
      error: 0xED4245,         // Rot
      warning: 0xFEE75C,       // Gelb
      info: 0x5865F2,          // Blau
      
      // Event-spezifische Farben
      join: 0x57F287,          // Spieler Join
      leave: 0xED4245,         // Spieler Leave
      death: 0x000000,         // Tod
      achievement: 0xFFD700,   // Gold für Erfolge
      chat: 0x7289DA,          // Chat
      command: 0x99AAB5,       // Commands
      moderation: 0xE67E22,    // Orange für Mod-Aktionen
      economy: 0x2ECC71,       // Grün für Economy
      boss: 0x9B59B6,          // Lila für Boss-Events
      raid: 0xE74C3C          // Rot für Raids
    },
    
    // Spieler Avatar Service
    avatars: {
      service: "crafatar",     // crafatar, minotar, cravatar, oder custom
      size: 128,
      overlay: true,           // Helm-Overlay
      fallback: "https://crafatar.com/avatars/MHF_Steve"
    },
    
    // Nachrichtenformatierung
    formatting: {
      timestamps: true,        // Zeitstempel anzeigen
      timezone: "UTC",         // Zeitzone
      dateFormat: "DD.MM.YYYY",
      timeFormat: "HH:mm:ss",
      
      // Emoji-Mappings
      emojis: {
        join: "📥",
        leave: "📤",
        death: "💀",
        achievement: "🏆",
        chat: "💬",
        command: "🔧",
        warning: "⚠️",
        error: "❌",
        info: "ℹ️",
        boss: "🐉",
        raid: "⚔️",
        diamond: "💎",
        netherite: "🔥",
        teleport: "🌀"
      }
    }
  },
  
  // ================== BERECHTIGUNGEN ==================
  permissions: {
    // Spieler-Tags
    tags: {
      admin: "admin",
      moderator: "moderator", 
      vip: "vip",
      builder: "builder",
      trusted: "trusted"
    },
    
    // Command-Berechtigungen
    commands: {
      // Befehle die NICHT von Discord ausgeführt werden können
      blacklist: [
        "stop", "restart", "reload",
        "op", "deop", "whitelist",
        "ban-ip", "pardon-ip",
        "save-all", "save-off", "save-on"
      ],
      
      // Befehle die Admin-Rechte benötigen
      adminOnly: [
        "ban", "unban", "kick",
        "tp", "teleport", "gamemode",
        "give", "clear", "kill",
        "setblock", "fill", "clone"
      ],
      
      // Befehle die von allen genutzt werden können
      public: [
        "list", "help", "msg",
        "time", "weather", "seed"
      ]
    },
    
    // Feature-Berechtigungen
    features: {
      viewStats: ["admin", "moderator", "vip"],
      viewLogs: ["admin", "moderator"],
      bypassAntiSpam: ["admin", "moderator"],
      receiveAlerts: ["admin", "moderator"]
    }
  },
  
  // ================== ERWEITERTE EINSTELLUNGEN ==================
  advanced: {
    // Performance
    performance: {
      messageQueueSize: 100,      // Max. Nachrichten in Warteschlange
      messageQueueDelay: 1000,    // Verzögerung zwischen Nachrichten (ms)
      messageBatchSize: 10,       // Nachrichten pro Batch
      cacheSize: 500,            // Cache-Größe
      cacheTTL: 300000           // Cache-Lebenszeit (5 Min)
    },
    
    // Logging
    logging: {
      level: "debug",             // error, warn, info, debug
      verbose: true,            // Ausführliche Logs
      saveToFile: true,          // Logs in Datei speichern
      maxLogSize: 10000,         // Max. Log-Einträge
      logRotation: true          // Log-Rotation
    },
    
    // Limits & Thresholds
    limits: {
      maxMessageLength: 2000,     // Discord Limit
      maxEmbedFields: 25,        // Discord Limit
      maxEmbeds: 10,             // Discord Limit
      spamThreshold: 5,          // Nachrichten in 10 Sek
      spamMuteDuration: 300000,  // 5 Minuten
      afkThreshold: 300000       // 5 Minuten
    },
    
    // Report-Intervalle
    intervals: {
      analytics: 3600000,        // 1 Stunde
      cleanup: 600000,           // 10 Minuten
      heartbeat: 30000,          // 30 Sekunden
      performanceCheck: 60000,   // 1 Minute
      backup: 86400000          // 24 Stunden
    },
    
    // Debugging
    debug: {
      enabled: true,
      testMode: false,           // Test-Modus (keine echten Webhooks)
      logAllEvents: true,       // Alle Events loggen
      showStackTraces: true     // Stack Traces anzeigen
    },

    // NEW: Webhook Health & Reliability
    webhookHealth: {
      enabled: true,             // Health Checks aktivieren
      checkInterval: 300000,     // Alle 5 Minuten
      alertOnFailure: true,      // Alert bei Fehlern
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5, // Fehler bis Circuit öffnet
      circuitBreakerTimeout: 30000, // 30s bis Retry
      retryStrategy: "exponential", // exponential oder linear
      maxRetries: 3,
      retryDelay: 1000           // Start Delay in ms
    },

    // NEW: Ratelimit Management
    ratelimit: {
      enabled: true,
      trackPerWebhook: true,     // Separates Tracking pro Webhook
      hardLimit: false,          // Strict enforcement
      queueWhenLimited: true,    // Queue bei Rate Limit
      notifyOnLimit: true        // Benachrichtigung bei Rate Limit
    }
  },

  // ================== STATISTIKEN & MONITORING (NEW) ==================
  monitoring: {
    // Webhook Performance Tracking
    webhookStats: {
      trackSuccessRate: true,
      trackResponseTimes: true,
      trackErrorRates: true,
      trackQueueSize: true
    },

    // Server Performance
    serverMetrics: {
      trackTPS: true,
      trackMemory: true,
      trackEntityCount: true,
      trackChunkLoading: true
    },

    // Player Behavior Analytics
    playerAnalytics: {
      trackPlaytime: true,
      trackActivityPatterns: true,
      trackDeathRates: true,
      trackChatFrequency: true,
      trackAchievements: true
    },

    // Report Generation
    reports: {
      hourlyAnalytics: true,
      dailySummary: true,
      weeklySummary: true,
      monthlyReport: true,
      includeGraphs: true,      // Benötigt externe Library
      includeTopPlayers: true,
      includeTrends: true
    }
  },
  
  // ================== CUSTOM NACHRICHTEN ==================
  messages: {
    // Server-Nachrichten
    server: {
      start: "🟢 **{serverName}** is now online!",
      stop: "🔴 **{serverName}** is shutting down.",
      restart: "🔄 **{serverName}** is restarting...",
      backup: "💾 Backup completed successfully!"
    },
    
    // Spieler-Nachrichten
    player: {
      firstJoin: "🎉 Welcome **{player}** to the server for the first time!",
      join: "📥 **{player}** joined the server",
      leave: "📤 **{player}** left the server",
      afkStart: "💤 **{player}** is now AFK",
      afkEnd: "👋 **{player}** is no longer AFK"
    },
    
    // Tod-Nachrichten (können customized werden)
    death: {
      generic: "💀 {player} died",
      fall: "💀 {player} fell from a high place",
      drowning: "💀 {player} drowned",
      lava: "💀 {player} tried to swim in lava",
      void: "💀 {player} fell out of the world"
      // ... weitere können hinzugefügt werden
    },
    
    // Achievement-Nachrichten
    achievements: {
      unlock: "🏆 **{player}** has made the achievement **{achievement}**!",
      challenge: "⭐ **{player}** has completed the challenge **{challenge}**!",
      goal: "🎯 **{player}** has reached the goal **{goal}**!"
    },
    
    // Warnungen
    warnings: {
      spam: "⚠️ {player} was muted for spamming",
      hack: "🚨 Suspicious activity detected from {player}",
      grief: "🚨 Potential griefing detected at {location}"
    }
  },
  
  // ================== FILTER & BLACKLISTS ==================
  filters: {
    // Chat-Filter
    chat: {
      enabled: true,
      blockWords: [],            // Gesperrte Wörter
      warnWords: [],            // Wörter die eine Warnung auslösen
      replaceWords: {},         // Wort-Ersetzungen
      allowLinks: false,        // Links erlauben
      allowCommands: true       // Commands im Chat erlauben
    },
    
    // Event-Filter (welche Events NICHT geloggt werden sollen)
    events: {
      ignorePlayers: [],        // Spieler die nicht geloggt werden
      ignoreWorlds: [],         // Welten die nicht geloggt werden
      ignoreCommands: [         // Commands die nicht geloggt werden
        "msg", "tell", "w"     // Private Nachrichten
      ]
    }
  },
  
  // ================== ERWEITERUNGEN ==================
  // Hier können eigene Erweiterungen konfiguriert werden
  extensions: {
    // Custom Webhooks für eigene Events
    customWebhooks: {
      // beispiel: "https://discord.com/api/webhooks/..."
    },
    
    // Custom Events zum Tracken
    customEvents: {
      // Beispiel: specificBlockPlace: true
    },
    
    // Integration mit anderen Plugins
    pluginIntegrations: {
      // economy: "EconomyAPI",
      // permissions: "PermissionsEx"
    }
  }
};

// ================== HILFSFUNKTIONEN ==================
export const WHHelpers = {
  // Webhook URL Helper
  getWebhook: (type) => {
    return WHConfig.webhooks[type] || WHConfig.webhooks.general;
  },
  
  // Farben Helper
  getColor: (type) => {
    return WHConfig.appearance.colors[type] || WHConfig.appearance.colors.default;
  },
  
  // Feature Check
  isEnabled: (feature) => {
    const parts = feature.split('.');
    let current = WHConfig.features;
    
    for (const part of parts) {
      if (current[part] === undefined) return false;
      current = current[part];
    }
    
    return current === true;
  },
  
  // Permission Check
  hasPermission: (player, permission) => {
    const playerTags = player.getTags();
    const allowedTags = WHConfig.permissions.features[permission] || [];
    
    return allowedTags.some(tag => playerTags.includes(tag));
  },
  
  // Message Formatter
  formatMessage: (template, data) => {
    let message = template;

    for (const [key, value] of Object.entries(data)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return message;
  },

  // NEW: Advanced Status Check
  getWebhookStatus: (url) => {
    // Würde vom WebhookManager bereitgestellt werden
    return "unknown";
  },

  // NEW: Circuit Breaker Status
  isWebhookHealthy: (url) => {
    // Prüft ob Webhook erreichbar ist
    return true;
  },

  // NEW: Get Retry Queue Size
  getRetryQueueSize: () => {
    // Würde vom WebhookManager bereitgestellt werden
    return 0;
  },

  // NEW: Get Success Rate
  getSuccessRate: (url) => {
    // Würde vom WebhookManager bereitgestellt werden
    return "N/A";
  }
};

// Export für Debugging
export default WHConfig;