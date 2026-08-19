/**
 * RSS-Bridge Configuration File
 * Comprehensive settings and utilities for RSS Plugin
 * Version: 2.0.0
 */

// ================= PLUGIN CONFIGURATION =================
export const RSS_CONFIG = {
  // Plugin Metadata
  plugin: {
    name: "RSS-Bridge",
    version: "2.0.0",
    description: "Advanced RSS Feed Management with BedrockBridge Integration",
    author: "TheFelixLive / BedrockBridge Integration"
  },

  // HTTP Request Settings
  http: {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    userAgent: "RSS-Bridge/2.0.0 (+Minecraft/Bedrock)",
    cacheTimeout: 300000, // 5 minutes
    maxCacheSize: 100 // Maximum number of cached feeds
  },

  // Feed Update Settings
  updates: {
    enabled: true,
    defaultInterval: 600000, // 10 minutes
    minInterval: 300000, // Minimum 5 minutes
    maxInterval: 3600000, // Maximum 1 hour
    checkOnStartup: true,
    maxConcurrentFetches: 3 // Maximum parallel feed requests
  },

  // Display Settings
  display: {
    maxFeedsPerPage: 10,
    maxItemsPerFeed: 20,
    defaultItemsDisplay: 5,
    titleMaxLength: 50,
    descriptionMaxLength: 256,
    dateFormat: "MMM DD, HH:mm"
  },

  // Discord Integration
  discord: {
    enabled: true,
    sendEmbeds: true,
    updateNotifications: true,
    errorNotifications: true,
    embedColor: 3447003, // Blue
    successColor: 3066993, // Green
    warningColor: 16776960, // Yellow
    errorColor: 15158332, // Red
    maxEmbedLength: 2048,
    mentionOnUpdate: false,
    deleteEmbedAfter: 0 // 0 = never delete
  },

  // Database Settings
  database: {
    autoSave: true,
    saveInterval: 60000, // 1 minute
    exportFormat: "json",
    backupOnUpdate: true,
    maxBackups: 5
  },

  // Notification Settings
  notifications: {
    player: {
      onFeedAdded: true,
      onFeedRemoved: true,
      onFeedUpdated: true,
      onSubscribe: true,
      onUnsubscribe: true
    },
    discord: {
      onPluginStart: true,
      onFeedError: true,
      onUpdateCycle: false,
      onPlayerAction: true
    }
  },

  // Categories (Predefined)
  categories: [
    {
      name: "News",
      color: "§c",
      icon: "📰"
    },
    {
      name: "Technology",
      color: "§b",
      icon: "💻"
    },
    {
      name: "Gaming",
      color: "§d",
      icon: "🎮"
    },
    {
      name: "Entertainment",
      color: "§6",
      icon: "🎬"
    },
    {
      name: "Sports",
      color: "§a",
      icon: "⚽"
    },
    {
      name: "Science",
      color: "§3",
      icon: "🔬"
    },
    {
      name: "General",
      color: "§f",
      icon: "📋"
    }
  ],

  // Command Settings
  commands: {
    enabled: true,
    prefix: "!",
    chatCommands: [
      {
        name: "feed",
        aliases: ["/feed", "!feed"],
        description: "Open RSS Feed management menu",
        usage: "!feed",
        permission: "default"
      },
      {
        name: "addfeed",
        aliases: ["!addfeed"],
        description: "Quickly add a new RSS feed",
        usage: "!addfeed <URL> [category]",
        permission: "default"
      },
      {
        name: "feeds",
        aliases: ["!feeds", "/feeds"],
        description: "List all current RSS feeds",
        usage: "!feeds",
        permission: "default"
      },
      {
        name: "feedupdate",
        aliases: ["!feedupdate"],
        description: "Manually trigger feed update",
        usage: "!feedupdate [feedId]",
        permission: "operator"
      }
    ]
  },

  // UI Settings
  ui: {
    colorScheme: {
      primary: "§6",
      secondary: "§b",
      success: "§a",
      error: "§c",
      warning: "§e",
      info: "§7"
    },
    fontSize: "default",
    animateMenus: true,
    confirmDangerousActions: true
  },

  // Performance Settings
  performance: {
    enableCaching: true,
    enableCompression: false,
    poolConnections: true,
    asyncUpdates: true,
    maxMemoryCache: 50 // MB
  },

  // Logging Settings
  logging: {
    enabled: true,
    level: "info", // debug, info, warn, error
    logToConsole: true,
    logToFile: false,
    logFilePath: "./logs/rss-bridge.log",
    logFeedEvents: true,
    logDiscordEvents: true,
    maxLogSize: 10485760 // 10 MB
  },

  // Security Settings
  security: {
    validateUrls: true,
    allowedProtocols: ["http", "https"],
    blockIPRanges: ["127.0.0.1", "192.168."],
    sanitizeContent: true,
    maxFeedsPerPlayer: 50,
    rateLimit: {
      enabled: true,
      requestsPerMinute: 30,
      requestsPerHour: 500
    }
  }
};

// ================= HELPER FUNCTIONS =================
export class RSSConfigHelper {
  /**
   * Get configuration value with fallback
   */
  static getConfig(path, defaultValue = null) {
    const keys = path.split(".");
    let value = RSS_CONFIG;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set configuration value
   */
  static setConfig(path, value) {
    const keys = path.split(".");
    let current = RSS_CONFIG;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get category by name
   */
  static getCategory(name) {
    return RSS_CONFIG.categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Validate feed URL
   */
  static validateFeedUrl(url) {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.slice(0, -1); // Remove trailing colon

      if (!RSS_CONFIG.security.allowedProtocols.includes(protocol)) {
        return { valid: false, error: "Invalid protocol" };
      }

      if (RSS_CONFIG.security.blockIPRanges.some(range => urlObj.hostname.startsWith(range))) {
        return { valid: false, error: "Blocked IP range" };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Format timestamp based on config
   */
  static formatDate(timestamp) {
    const date = new Date(timestamp);
    const format = RSS_CONFIG.display.dateFormat;

    const replacements = {
      "YYYY": date.getFullYear(),
      "MM": String(date.getMonth() + 1).padStart(2, "0"),
      "DD": String(date.getDate()).padStart(2, "0"),
      "HH": String(date.getHours()).padStart(2, "0"),
      "mm": String(date.getMinutes()).padStart(2, "0"),
      "ss": String(date.getSeconds()).padStart(2, "0"),
      "MMM": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()],
      "ddd": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]
    };

    let formatted = format;
    for (const [key, value] of Object.entries(replacements)) {
      formatted = formatted.replace(key, value);
    }

    return formatted;
  }

  /**
   * Truncate text with ellipsis
   */
  static truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * Check if player has permission for command
   */
  static checkPermission(player, requiredPermission) {
    if (requiredPermission === "default") return true;
    if (requiredPermission === "operator") {
      // This would need to integrate with your permission system
      return player.isOp ? player.isOp() : false;
    }
    return false;
  }

  /**
   * Color string based on type
   */
  static colorText(text, type) {
    const colors = RSS_CONFIG.ui.colorScheme;
    const color = colors[type] || colors.info;
    return `${color}${text}§r`;
  }

  /**
   * Get icon for category
   */
  static getCategoryIcon(categoryName) {
    const category = this.getCategory(categoryName);
    return category ? category.icon : "📋";
  }

  /**
   * Convert bytes to readable size
   */
  static formatBytes(bytes) {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Get next update time
   */
  static getNextUpdateTime(lastUpdate, interval) {
    return new Date(lastUpdate + interval).toLocaleString();
  }

  /**
   * Log message with config level
   */
  static log(level, message) {
    if (!RSS_CONFIG.logging.enabled) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[RSS_CONFIG.logging.level] || 1;

    if (levels[level] >= configLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      if (RSS_CONFIG.logging.logToConsole) {
        console.info(logMessage);
      }

      if (RSS_CONFIG.logging.logToFile) {
        // File logging would need system file access
        // This is a placeholder for your implementation
      }
    }
  }
}

// ================= EXPORT =================
export default RSS_CONFIG;
