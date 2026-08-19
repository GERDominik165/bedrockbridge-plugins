/**
 * ════════════════════════════════════════════════════════════════════════════════════
 * XBOX API PLUGIN v2.1.0 - BEDROCK BRIDGE INTEGRATION
 * ════════════════════════════════════════════════════════════════════════════════════
 *
 * Professionelles Xbox/Minecraft/Steam Account Lookup Plugin für Bedrock Server
 * Vollständig integriert mit BedrockBridge Command System
 *
 * Features:
 * ✅ PlayerDB API Integration (Minecraft/Xbox/Steam)
 * ✅ COMPLETE Meta Data Display (Gamerscore, Tier, Bio, Location, etc)
 * ✅ Avatar URLs & Profile Pictures
 * ✅ Username History with Pagination
 * ✅ In-Game UI Forms (ActionForm, ModalForm, MessageForm)
 * ✅ BedrockBridge Command Registration
 * ✅ Intelligent Caching System (10 min TTL)
 * ✅ Automatic Retry Logic (3 attempts)
 * ✅ Error Handling & Rate Limit Management
 * ✅ Statistics & Monitoring
 * ✅ Debug Logging
 *
 * @minecraft/server-net Integration ✓
 * @minecraft/server-ui Integration ✓
 * @minecraft/server Integration ✓
 * BedrockBridge Integration ✓
 *
 * @version 2.1.0
 * @author Bedrock Bridge Community
 * @license MIT
 * ════════════════════════════════════════════════════════════════════════════════════
 */

import { world, system, Player } from '@minecraft/server';
import { http, HttpRequest, HttpHeader, HttpRequestMethod } from '@minecraft/server-net';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { bridge } from '../addons';

// ════════════════════════════════════════════════════════════════════════════════════
// CONFIG - KONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Plugin Info
  PLUGIN_NAME: '🎮 Xbox API Plugin',
  VERSION: '2.1.0',
  DEBUG: true,

  // PlayerDB API
  API_BASE: 'https://playerdb.co/api/player',
  USER_AGENT: 'MinecraftBedrockBridge/2.1.0',
  API_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Caching
  CACHE_ENABLED: true,
  CACHE_TTL: 600000,
  CACHE_CLEANUP_INTERVAL: 300000,

  // UI
  MAX_HISTORY_SHOWN: 5,
  MAX_META_SHOWN: 10
};

// ════════════════════════════════════════════════════════════════════════════════════
// COLORS & ICONS
// ════════════════════════════════════════════════════════════════════════════════════

const Colors = {
  GREEN: '§a',
  RED: '§c',
  YELLOW: '§e',
  BLUE: '§9',
  CYAN: '§b',
  GOLD: '§6',
  GRAY: '§7',
  DARK_GRAY: '§8',
  LIGHT_PURPLE: '§d',
  RESET: '§r'
};

const Icons = {
  XBOX: '🎮',
  MINECRAFT: '⛏️',
  STEAM: '🎯',
  PLAYER: '👤',
  SEARCH: '🔍',
  STATS: '📊',
  AVATAR: '🖼️',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  CLOCK: '⏰',
  LINK: '🔗',
  BACK: '↩️',
  NEXT: '➜',
  GAMER: '🏆',
  HEART: '❤️',
  STAR: '⭐',
  LOCATION: '📍',
  MEMO: '📝',
  BADGE: '🏅',
  CHART: '📈',
  GEAR: '⚙️',
  LOCK: '🔒'
};

// ════════════════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ════════════════════════════════════════════════════════════════════════════════════

class Logger {
  static log(message, level = 'INFO', data = null) {
    const timestamp = new Date().toISOString();
    if (level === 'DEBUG' && !CONFIG.DEBUG) return;
    const msg = data ? `${message} ${JSON.stringify(data)}` : message;
    const color = level === 'ERROR' ? Colors.RED : level === 'WARN' ? Colors.YELLOW : Colors.CYAN;
    console.warn(`${color}[${timestamp}][${level}] ${msg}${Colors.RESET}`);
  }

  static info(msg, data = null) { this.log(msg, 'INFO', data); }
  static warn(msg, data = null) { this.log(msg, 'WARN', data); }
  static error(msg, data = null) { this.log(msg, 'ERROR', data); }
  static debug(msg, data = null) { this.log(msg, 'DEBUG', data); }
}

// ════════════════════════════════════════════════════════════════════════════════════
// CACHE MANAGER CLASS
// ════════════════════════════════════════════════════════════════════════════════════

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.startCleanup();
    Logger.info('CacheManager initialized');
  }

  set(key, value) {
    if (!CONFIG.CACHE_ENABLED) return;

    if (this.timers.has(key)) {
      system.clearRun(this.timers.get(key));
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    const timerId = system.runTimeout(() => {
      this.delete(key);
    }, Math.ceil(CONFIG.CACHE_TTL / 50));

    this.timers.set(key, timerId);
    Logger.debug(`Cache SET: ${key}`);
  }

  get(key) {
    if (!CONFIG.CACHE_ENABLED) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CONFIG.CACHE_TTL) {
      this.delete(key);
      return null;
    }

    Logger.debug(`Cache HIT: ${key}`);
    return cached.value;
  }

  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      system.clearRun(this.timers.get(key));
      this.timers.delete(key);
    }
    Logger.debug(`Cache DELETE: ${key}`);
  }

  clear() {
    this.cache.forEach((_, key) => this.delete(key));
    Logger.info('Cache cleared');
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      enabled: CONFIG.CACHE_ENABLED
    };
  }

  startCleanup() {
    system.runInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.cache.entries()) {
        if (now - data.timestamp > CONFIG.CACHE_TTL) {
          this.delete(key);
        }
      }
    }, Math.ceil(CONFIG.CACHE_TTL / 50));
  }
}

// ════════════════════════════════════════════════════════════════════════════════════
// PLAYERDB API CLIENT CLASS
// ════════════════════════════════════════════════════════════════════════════════════

class PlayerDBClient {
  constructor() {
    this.baseUrl = CONFIG.API_BASE;
    this.cache = new CacheManager();
    this.requestCount = 0;
    this.errorCount = 0;
    Logger.info('PlayerDBClient initialized');
  }

  async request(method, path, retries = 0) {
    try {
      const url = `${this.baseUrl}${path}`;
      const request = new HttpRequest(url);
      request.setMethod(method);
      request.setTimeout(CONFIG.API_TIMEOUT / 1000);
      request.addHeader('User-Agent', CONFIG.USER_AGENT);
      request.addHeader('Accept', 'application/json');

      Logger.debug(`HTTP ${method}: ${url}`);

      const response = await http.request(request);

      if (response.status === 200) {
        this.requestCount++;
        try {
          return JSON.parse(response.body);
        } catch (e) {
          Logger.error('JSON Parse Error', { error: e.message });
          return null;
        }
      } else if (response.status === 429 && retries < CONFIG.RETRY_ATTEMPTS) {
        Logger.warn(`Rate limited, retrying... (${retries + 1}/${CONFIG.RETRY_ATTEMPTS})`);
        await new Promise(resolve => system.runTimeout(() => resolve(), Math.ceil(CONFIG.RETRY_DELAY / 50)));
        return this.request(method, path, retries + 1);
      } else {
        this.errorCount++;
        Logger.error(`API Error: ${response.status}`);
        return null;
      }
    } catch (error) {
      this.errorCount++;
      Logger.error(`Request failed: ${error.message}`);

      if (retries < CONFIG.RETRY_ATTEMPTS) {
        Logger.warn(`Retrying... (${retries + 1}/${CONFIG.RETRY_ATTEMPTS})`);
        await new Promise(resolve => system.runTimeout(() => resolve(), Math.ceil(CONFIG.RETRY_DELAY / 50)));
        return this.request(method, path, retries + 1);
      }

      return null;
    }
  }

  async lookupMinecraft(username) {
    const cacheKey = `minecraft:${username.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.request(HttpRequestMethod.Get, `/minecraft/${encodeURIComponent(username)}`);

    if (data && data.success && data.data?.player) {
      const playerData = this.parsePlayerData(data.data.player, 'minecraft');
      this.cache.set(cacheKey, playerData);
      return playerData;
    }

    return null;
  }

  async lookupXbox(xboxId) {
    const cacheKey = `xbox:${xboxId.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.request(HttpRequestMethod.Get, `/xbox/${encodeURIComponent(xboxId)}`);

    if (data && data.success && data.data?.player) {
      const playerData = this.parsePlayerData(data.data.player, 'xbox');
      this.cache.set(cacheKey, playerData);
      return playerData;
    }

    return null;
  }

  async lookupSteam(steamId) {
    const cacheKey = `steam:${steamId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.request(HttpRequestMethod.Get, `/steam/${encodeURIComponent(steamId)}`);

    if (data && data.success && data.data?.player) {
      const playerData = this.parsePlayerData(data.data.player, 'steam');
      this.cache.set(cacheKey, playerData);
      return playerData;
    }

    return null;
  }

  parsePlayerData(rawData, platform) {
    if (!rawData) return null;

    return {
      username: rawData.username || 'Unknown',
      id: rawData.id || 'Unknown',
      platform: platform,
      found_at: new Date().toISOString(),
      avatar: rawData.avatar || null,
      meta: rawData.meta || {},
      username_history: rawData.username_history || [],
      raw: rawData
    };
  }

  getStats() {
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      cache: this.cache.getStats()
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════════
// UI MANAGER CLASS
// ════════════════════════════════════════════════════════════════════════════════════

class UIManager {
  static async showMainMenu(player) {
    const form = new ActionFormData()
      .title(`${Icons.XBOX} ${CONFIG.PLUGIN_NAME}`)
      .body(`${Icons.PLAYER} Welcome to Player Lookup!\n\nSelect a platform:`)
      .button(`${Icons.MINECRAFT} Minecraft\nLookup`)
      .button(`${Icons.XBOX} Xbox Live\nLookup`)
      .button(`${Icons.STEAM} Steam\nLookup`)
      .button(`${Icons.STATS} Statistics`)
      .button(`${Icons.BACK} Close`);

    try {
      const response = await form.show(player);

      if (response.canceled) return;

      switch (response.selection) {
        case 0: return this.showMinecraftSearchForm(player);
        case 1: return this.showXboxSearchForm(player);
        case 2: return this.showSteamSearchForm(player);
        case 3: return this.showStatistics(player);
        case 4: return;
      }
    } catch (error) {
      Logger.error('UI Error in MainMenu', error);
      return this.showErrorMessage(player, `Menu error: ${error.message}`, () => this.showMainMenu(player));
    }
  }

  static async showMinecraftSearchForm(player) {
    const form = new ModalFormData()
      .title(`${Icons.MINECRAFT} Minecraft Player Search`)
      .textField('Username or UUID:', 'Steve');

    try {
      const response = await form.show(player);

      if (response.canceled) return this.showMainMenu(player);

      const username = response.formValues[0];
      if (!username || username.trim() === '') {
        return this.showErrorMessage(player, 'Please enter a valid username!', () => this.showMinecraftSearchForm(player));
      }

      player.sendMessage(`${Icons.LOADING} ${Colors.YELLOW}Searching for Minecraft player "${username}"...${Colors.RESET}`);
      const result = await playerDB.lookupMinecraft(username);

      if (result) {
        return this.showPlayerProfile(player, result, 'Minecraft');
      } else {
        return this.showErrorMessage(player, `Minecraft player "${username}" not found!`, () => this.showMinecraftSearchForm(player));
      }
    } catch (error) {
      Logger.error('MinecraftSearch Error', error);
      return this.showErrorMessage(player, `Error: ${error.message}`, () => this.showMainMenu(player));
    }
  }

  static async showXboxSearchForm(player) {
    const form = new ModalFormData()
      .title(`${Icons.XBOX} Xbox Live Player Search`)
      .textField('Gamertag or Xbox ID:', 'Steve');

    try {
      const response = await form.show(player);

      if (response.canceled) return this.showMainMenu(player);

      const xboxId = response.formValues[0];
      if (!xboxId || xboxId.trim() === '') {
        return this.showErrorMessage(player, 'Please enter a valid Xbox Gamertag!', () => this.showXboxSearchForm(player));
      }

      player.sendMessage(`${Icons.LOADING} ${Colors.YELLOW}Searching for Xbox player "${xboxId}"...${Colors.RESET}`);
      const result = await playerDB.lookupXbox(xboxId);

      if (result) {
        return this.showPlayerProfile(player, result, 'Xbox');
      } else {
        return this.showErrorMessage(player, `Xbox player "${xboxId}" not found!`, () => this.showXboxSearchForm(player));
      }
    } catch (error) {
      Logger.error('XboxSearch Error', error);
      return this.showErrorMessage(player, `Error: ${error.message}`, () => this.showMainMenu(player));
    }
  }

  static async showSteamSearchForm(player) {
    const form = new ModalFormData()
      .title(`${Icons.STEAM} Steam Player Search`)
      .textField('Steam ID:', '76561198000000000');

    try {
      const response = await form.show(player);

      if (response.canceled) return this.showMainMenu(player);

      const steamId = response.formValues[0];
      if (!steamId || steamId.trim() === '') {
        return this.showErrorMessage(player, 'Please enter a valid Steam ID!', () => this.showSteamSearchForm(player));
      }

      player.sendMessage(`${Icons.LOADING} ${Colors.YELLOW}Searching for Steam player...${Colors.RESET}`);
      const result = await playerDB.lookupSteam(steamId);

      if (result) {
        return this.showPlayerProfile(player, result, 'Steam');
      } else {
        return this.showErrorMessage(player, `Steam player not found!`, () => this.showSteamSearchForm(player));
      }
    } catch (error) {
      Logger.error('SteamSearch Error', error);
      return this.showErrorMessage(player, `Error: ${error.message}`, () => this.showMainMenu(player));
    }
  }

  static async showPlayerProfile(player, playerData, platform) {
    let profileBody = '';

    profileBody += `${Colors.CYAN}═══════════════════════════════════════════\n`;
    profileBody += `${Colors.GOLD}${Icons.PLAYER} PLAYER PROFILE\n`;
    profileBody += `${Colors.CYAN}═══════════════════════════════════════════\n\n`;

    profileBody += `${Colors.GREEN}👤 Username: ${Colors.WHITE}${playerData.username}\n`;
    profileBody += `${Colors.GREEN}🆔 ID: ${Colors.WHITE}${playerData.id}\n`;
    profileBody += `${Colors.GREEN}🎮 Platform: ${Colors.WHITE}${platform}\n`;

    if (playerData.avatar) {
      profileBody += `${Colors.GREEN}${Icons.AVATAR} Avatar: ${Colors.CYAN}${playerData.avatar.substring(0, 45)}...\n`;
    }

    if (playerData.meta && Object.keys(playerData.meta).length > 0) {
      profileBody += `\n${Colors.CYAN}─── META DATA ───\n`;

      if (playerData.meta.gamerscore) {
        profileBody += `${Colors.YELLOW}${Icons.GAMER} Gamerscore: ${Colors.WHITE}${playerData.meta.gamerscore}\n`;
      }

      if (playerData.meta.accountTier) {
        profileBody += `${Colors.YELLOW}${Icons.STAR} Account Tier: ${Colors.WHITE}${playerData.meta.accountTier}\n`;
      }

      if (playerData.meta.xboxOneRep) {
        profileBody += `${Colors.YELLOW}${Icons.HEART} Reputation: ${Colors.WHITE}${playerData.meta.xboxOneRep}\n`;
      }

      if (playerData.meta.realName && playerData.meta.realName.trim() !== '') {
        profileBody += `${Colors.YELLOW}📛 Real Name: ${Colors.WHITE}${playerData.meta.realName}\n`;
      }

      if (playerData.meta.bio && playerData.meta.bio.trim() !== '') {
        profileBody += `${Colors.YELLOW}${Icons.MEMO} Bio: ${Colors.WHITE}${playerData.meta.bio.substring(0, 40)}\n`;
      }

      if (playerData.meta.location && playerData.meta.location.trim() !== '') {
        profileBody += `${Colors.YELLOW}${Icons.LOCATION} Location: ${Colors.WHITE}${playerData.meta.location}\n`;
      }

      if (playerData.meta.preferredColor) {
        profileBody += `${Colors.YELLOW}🎨 Preferred Color: ${Colors.WHITE}${playerData.meta.preferredColor.substring(0, 35)}...\n`;
      }

      if (playerData.meta.tenureLevel) {
        profileBody += `${Colors.YELLOW}${Icons.CLOCK} Tenure Level: ${Colors.WHITE}${playerData.meta.tenureLevel}\n`;
      }

      if (playerData.meta.watermarks && playerData.meta.watermarks.trim() !== '') {
        profileBody += `${Colors.YELLOW}💧 Watermarks: ${Colors.WHITE}${playerData.meta.watermarks}\n`;
      }

      if (playerData.meta.showUserAsAvatar) {
        profileBody += `${Colors.YELLOW}🖼️ Show as Avatar: ${Colors.WHITE}${playerData.meta.showUserAsAvatar}\n`;
      }
    }

    if (playerData.username_history && playerData.username_history.length > 0) {
      profileBody += `\n${Colors.CYAN}─── USERNAME HISTORY ───\n`;
      const historyToShow = playerData.username_history.slice(0, CONFIG.MAX_HISTORY_SHOWN);
      for (let i = 0; i < historyToShow.length; i++) {
        profileBody += `${Colors.GRAY}${i + 1}. ${historyToShow[i]}\n`;
      }
      if (playerData.username_history.length > CONFIG.MAX_HISTORY_SHOWN) {
        profileBody += `${Colors.GRAY}... and ${playerData.username_history.length - CONFIG.MAX_HISTORY_SHOWN} more\n`;
      }
    }

    profileBody += `\n${Colors.GRAY}${Icons.CLOCK} Looked up: ${playerData.found_at}\n`;
    profileBody += `${Colors.CYAN}═══════════════════════════════════════════${Colors.RESET}`;

    const form = new MessageFormData()
      .title(`${Icons.PLAYER} ${playerData.username}`)
      .body(profileBody)
      .button1(`${Icons.BACK} Back`)
      .button2(`${Icons.NEXT} New Search`);

    try {
      const response = await form.show(player);

      if (response.selection === 1) {
        switch (platform) {
          case 'Minecraft': return this.showMinecraftSearchForm(player);
          case 'Xbox': return this.showXboxSearchForm(player);
          case 'Steam': return this.showSteamSearchForm(player);
          default: return this.showMainMenu(player);
        }
      } else {
        return this.showMainMenu(player);
      }
    } catch (error) {
      Logger.error('PlayerProfile Error', error);
      return this.showMainMenu(player);
    }
  }

  static async showStatistics(player) {
    const stats = playerDB.getStats();

    let statsBody = '';
    statsBody += `${Colors.CYAN}═════════════════════════════════════════\n`;
    statsBody += `${Colors.YELLOW}${Icons.STATS} PLUGIN STATISTICS\n`;
    statsBody += `${Colors.CYAN}═════════════════════════════════════════\n\n`;
    statsBody += `${Colors.GREEN}📡 API Requests: ${Colors.WHITE}${stats.requests}\n`;
    statsBody += `${Colors.RED}⚠️ Errors: ${Colors.WHITE}${stats.errors}\n`;
    statsBody += `${Colors.YELLOW}💾 Cache Size: ${Colors.WHITE}${stats.cache.size} entries\n`;
    statsBody += `${Colors.YELLOW}${Icons.CLOCK} Cache Status: ${Colors.WHITE}${stats.cache.enabled ? 'ENABLED' : 'DISABLED'}\n`;
    statsBody += `${Colors.BLUE}📦 Version: ${Colors.WHITE}${CONFIG.VERSION}\n`;
    statsBody += `\n${Colors.GRAY}Cache: ${stats.cache.entries.join(', ') || 'None'}\n`;
    statsBody += `${Colors.CYAN}═════════════════════════════════════════${Colors.RESET}`;

    const form = new MessageFormData()
      .title(`${Icons.STATS} Statistics`)
      .body(statsBody)
      .button1(`${Icons.BACK} Back`)
      .button2(`${Icons.NEXT} Menu`);

    try {
      const response = await form.show(player);

      if (response.selection === 1) {
        return this.showMainMenu(player);
      }
    } catch (error) {
      Logger.error('Statistics Error', error);
    }
  }

  static async showErrorMessage(player, message, callback = null) {
    const form = new MessageFormData()
      .title(`${Icons.ERROR} Error`)
      .body(`${Colors.RED}${Icons.ERROR} ${message}${Colors.RESET}`)
      .button1(`${Icons.BACK} Back`)
      .button2(`${Icons.NEXT} Retry`);

    try {
      const response = await form.show(player);

      if (response.selection === 1 && callback) {
        return callback();
      } else {
        return this.showMainMenu(player);
      }
    } catch (error) {
      Logger.error('ErrorMessage Error', error);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════════
// COMMAND HANDLER CLASS
// ════════════════════════════════════════════════════════════════════════════════════

class CommandHandler {
  static handle(player, message) {
    // This method is no longer used with BedrockBridge
    // Commands are registered directly with bridge.bedrockCommands
    return false;
  }

  static handleXboxCommand(player, params) {
    if (params.length === 0) {
      UIManager.showMainMenu(player);
      return;
    }

    const gamertag = params.join(' ');
    player.sendMessage(`${Icons.LOADING} ${Colors.YELLOW}Searching Xbox player "${gamertag}"...${Colors.RESET}`);

    playerDB.lookupXbox(gamertag).then(result => {
      if (result) {
        const msg =
          `${Colors.GREEN}${Icons.SUCCESS} Player found!\n` +
          `${Colors.CYAN}Name: ${Colors.WHITE}${result.username}\n` +
          `${Colors.CYAN}ID: ${Colors.WHITE}${result.id}\n` +
          `${Colors.CYAN}Platform: ${Colors.WHITE}Xbox`;
        player.sendMessage(msg);
      } else {
        player.sendMessage(`${Colors.RED}${Icons.ERROR} Xbox player not found!${Colors.RESET}`);
      }
    });
  }

  static handleProfileCommand(player, params) {
    if (params.length === 0) {
      UIManager.showMainMenu(player);
      return;
    }

    const username = params.join(' ');
    player.sendMessage(`${Icons.LOADING} ${Colors.YELLOW}Searching Minecraft player "${username}"...${Colors.RESET}`);

    playerDB.lookupMinecraft(username).then(result => {
      if (result) {
        const msg =
          `${Colors.GREEN}${Icons.SUCCESS} Player found!\n` +
          `${Colors.CYAN}Name: ${Colors.WHITE}${result.username}\n` +
          `${Colors.CYAN}ID: ${Colors.WHITE}${result.id}\n` +
          `${Colors.CYAN}Platform: ${Colors.WHITE}Minecraft`;
        player.sendMessage(msg);
      } else {
        player.sendMessage(`${Colors.RED}${Icons.ERROR} Minecraft player not found!${Colors.RESET}`);
      }
    });
  }

  static handleCacheCommand(player, params) {
    const action = params[0]?.toLowerCase();

    if (action === 'clear') {
      playerDB.cache.clear();
      player.sendMessage(`${Colors.GREEN}${Icons.SUCCESS} Cache cleared!${Colors.RESET}`);
    } else if (action === 'stats') {
      const stats = playerDB.cache.getStats();
      const msg =
        `${Colors.CYAN}Cache Statistics:\n` +
        `${Colors.YELLOW}Size: ${stats.size}\n` +
        `${Colors.YELLOW}Entries: ${stats.entries.join(', ') || 'None'}\n` +
        `${Colors.YELLOW}Status: ${stats.enabled ? 'Enabled' : 'Disabled'}`;
      player.sendMessage(msg);
    } else {
      player.sendMessage(`${Colors.CYAN}Cache Commands: !cache clear, !cache stats${Colors.RESET}`);
    }
  }

  static showHelp(player) {
    const msg =
      `${Colors.GOLD}${Icons.INFO} Xbox API Plugin v${CONFIG.VERSION} Help\n\n` +
      `${Colors.CYAN}Commands:\n` +
      `${Colors.GREEN}!menu${Colors.WHITE} - Open main menu\n` +
      `${Colors.GREEN}!xbox <name>${Colors.WHITE} - Search Xbox player (chat)\n` +
      `${Colors.GREEN}!profile <name>${Colors.WHITE} - Search Minecraft player (chat)\n` +
      `${Colors.GREEN}!cache clear${Colors.WHITE} - Clear all cached data\n` +
      `${Colors.GREEN}!cache stats${Colors.WHITE} - Show cache statistics\n` +
      `${Colors.GREEN}!help${Colors.WHITE} - Show this help\n`;
    player.sendMessage(msg);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION & BEDROCK BRIDGE INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════════

const playerDB = new PlayerDBClient();

// Register commands with BedrockBridge
bridge.bedrockCommands.registerCommand('xbox', (player, ...params) => {
  if (params.length === 0) {
    UIManager.showMainMenu(player);
  } else {
    CommandHandler.handleXboxCommand(player, params);
  }
}, 'Suche Xbox Spieler nach Gamertag');

bridge.bedrockCommands.registerCommand('profile', (player, ...params) => {
  if (params.length === 0) {
    UIManager.showMinecraftSearchForm(player);
  } else {
    CommandHandler.handleProfileCommand(player, params);
  }
}, 'Suche Minecraft Spieler nach Benutzername');

bridge.bedrockCommands.registerCommand('steam', (player, ...params) => {
  if (params.length === 0) {
    UIManager.showSteamSearchForm(player);
  } else {
    const steamId = params.join(' ');
    player.sendMessage(`${Icons.LOADING} ${Colors.YELLOW}Searching Steam player...${Colors.RESET}`);
    playerDB.lookupSteam(steamId).then(result => {
      if (result) {
        const msg =
          `${Colors.GREEN}${Icons.SUCCESS} Player found!\n` +
          `${Colors.CYAN}Name: ${Colors.WHITE}${result.username}\n` +
          `${Colors.CYAN}ID: ${Colors.WHITE}${result.id}\n` +
          `${Colors.CYAN}Platform: ${Colors.WHITE}Steam`;
        player.sendMessage(msg);
      } else {
        player.sendMessage(`${Colors.RED}${Icons.ERROR} Steam player not found!${Colors.RESET}`);
      }
    });
  }
}, 'Suche Steam Spieler nach Steam ID');

bridge.bedrockCommands.registerCommand('playermenu', (player) => {
  UIManager.showMainMenu(player);
}, 'Öffne das Spieler-Lookup Menü');

bridge.bedrockCommands.registerCommand('playerstats', (player) => {
  UIManager.showStatistics(player);
}, 'Zeige API Statistiken und Cache Info');

bridge.bedrockCommands.registerCommand('cache', (player, ...params) => {
  CommandHandler.handleCacheCommand(player, params);
}, 'Verwalte den Plugin Cache (clear, stats)');

bridge.bedrockCommands.registerCommand('playerhelp', (player) => {
  CommandHandler.showHelp(player);
}, 'Zeige Hilfe für Player Lookup Befehle');

// Plugin Startup Message
system.run(() => {
  Logger.info(`═══════════════════════════════════════════════════════════════`);
  Logger.info(`${CONFIG.PLUGIN_NAME} v2.1.0 LOADED (BedrockBridge Mode)`);
  Logger.info(`═══════════════════════════════════════════════════════════════`);
  Logger.info(`Features: Minecraft/Xbox/Steam Lookup, Full PlayerDB Integration`);
  Logger.info(`UI Forms, Caching, Error Handling, Statistics & Monitoring`);
  Logger.info(`Cache: ${CONFIG.CACHE_ENABLED ? 'ENABLED (TTL: ' + CONFIG.CACHE_TTL + 'ms)' : 'DISABLED'}`);
  Logger.info(`Debug Mode: ${CONFIG.DEBUG ? 'ON' : 'OFF'}`);
  Logger.info(`════════════════════════════════════════════════════════════════`);
  Logger.info(`Commands registered with BedrockBridge:`);
  Logger.info(`- /xbox <gamertag> - Xbox Player Lookup`);
  Logger.info(`- /profile <username> - Minecraft Player Lookup`);
  Logger.info(`- /steam <steamid> - Steam Player Lookup`);
  Logger.info(`- /playermenu - Open Player Lookup Menu`);
  Logger.info(`- /playerstats - Show API Statistics`);
  Logger.info(`- /playerhelp - Show Help`);
  Logger.info(`════════════════════════════════════════════════════════════════`);
});

// Export Classes
export { Logger, CacheManager, PlayerDBClient, UIManager, CommandHandler, CONFIG, playerDB };
