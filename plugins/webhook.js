// webhook.js - BedrockBridge Webhook Plugin
// Version: 3.0.0 - UPGRADED
// Major improvements: Error handling, Ratelimit management, Achievements, Analytics, Health checks
// Nutzt whconfig.js für alle Konfigurationen

import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpHeader, HttpRequestMethod } from "@minecraft/server-net";
import { WHConfig, WHHelpers } from "./whconfig.js";

// Try to import BedrockBridge API
let bridge, bridgeDirect, database;
let bridgeAvailable = false;

try {
  const bridgeModule = await import("../addons");
  bridge = bridgeModule.bridge;
  bridgeDirect = bridgeModule.bridgeDirect;
  database = bridgeModule.database;
  bridgeAvailable = true;
  console.info("[Webhook] BedrockBridge API loaded successfully");
} catch (error) {
  console.warn("[Webhook] BedrockBridge API not available, running in standalone mode");

  // Create mock database for standalone mode
  database = {
    makeTable: (name) => {
      const data = new Map();
      return {
        get: (key) => data.get(key),
        set: (key, value) => data.set(key, value),
        has: (key) => data.has(key),
        delete: (key) => data.delete(key),
        entries: () => data.entries(),
        size: data.size
      };
    }
  };
}

// ================== WEBHOOK MANAGER (NEW) ==================
// Centralized webhook management mit Error Handling, Ratelimiting, Retry-Logik
class WebhookManager {
  constructor() {
    this.webhookStats = new Map(); // URL -> {attempts, lastError, success, failed, lastSuccess}
    this.rateLimitTracker = new Map(); // URL -> {remaining, resetTime}
    this.retryQueue = []; // {url, data, attempts, nextRetry}
    this.circuitBreaker = new Map(); // URL -> {state, failures, lastStateChange}
    this.requestHistory = new Map(); // URL -> [{timestamp, status}]
  }

  // ========== VALIDATION ==========
  validateWebhookUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('https://discord.com/api/webhooks/') &&
           url.length > 80 &&
           !url.includes(' ') &&
           !url.includes('YOUR_ID') &&
           !url.includes('YOUR_TOKEN');
  }

  // ========== RATELIMIT HANDLING ==========
  checkRateLimit(url) {
    const tracker = this.rateLimitTracker.get(url);
    if (!tracker) return true;

    if (Date.now() >= tracker.resetTime) {
      this.rateLimitTracker.delete(url);
      return true;
    }
    return false;
  }

  updateRateLimit(url, response) {
    const _getH=(n)=>{ const h=(response.headers||[]).find(x=>x.key===n||x.name===n); return h?h.value:null; };
    const remaining = parseInt(_getH('X-RateLimit-Remaining') || '1');
    const resetTime = parseInt(_getH('X-RateLimit-Reset') || '0') * 1000;

    this.rateLimitTracker.set(url, {
      remaining: Math.max(0, remaining),
      resetTime: resetTime || Date.now() + 60000
    });

    return remaining > 0;
  }

  // ========== CIRCUIT BREAKER ==========
  getCircuitBreakerState(url) {
    const breaker = this.circuitBreaker.get(url);
    if (!breaker) {
      this.circuitBreaker.set(url, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        successAfterOpen: 0,
        lastStateChange: Date.now()
      });
      return 'CLOSED';
    }

    // Auto-transition from OPEN to HALF_OPEN nach 30s
    if (breaker.state === 'OPEN' && Date.now() - breaker.lastStateChange > 30000) {
      breaker.state = 'HALF_OPEN';
      breaker.successAfterOpen = 0;
      breaker.lastStateChange = Date.now();
    }

    return breaker.state;
  }

  recordSuccess(url) {
    const breaker = this.circuitBreaker.get(url) || { state: 'CLOSED', failures: 0, successAfterOpen: 0 };

    if (breaker.state === 'HALF_OPEN') {
      breaker.successAfterOpen++;
      if (breaker.successAfterOpen >= 2) {
        breaker.state = 'CLOSED';
        breaker.failures = 0;
        breaker.lastStateChange = Date.now();
      }
    } else if (breaker.state === 'CLOSED') {
      breaker.failures = Math.max(0, breaker.failures - 1);
    }

    this.circuitBreaker.set(url, breaker);
    this.recordWebhookAttempt(url, true);
  }

  recordFailure(url) {
    const breaker = this.circuitBreaker.get(url) || { state: 'CLOSED', failures: 0 };
    breaker.failures++;

    if (breaker.state === 'CLOSED' && breaker.failures >= 5) {
      breaker.state = 'OPEN';
      breaker.lastStateChange = Date.now();
      console.warn(`[Webhook] Circuit breaker OPENED for ${url}`);
    } else if (breaker.state === 'HALF_OPEN') {
      breaker.state = 'OPEN';
      breaker.lastStateChange = Date.now();
    }

    this.circuitBreaker.set(url, breaker);
    this.recordWebhookAttempt(url, false);
  }

  // ========== STATISTICS ==========
  recordWebhookAttempt(url, success) {
    if (!this.webhookStats.has(url)) {
      this.webhookStats.set(url, {
        attempts: 0,
        success: 0,
        failed: 0,
        lastError: null,
        lastSuccess: Date.now()
      });
    }

    const stats = this.webhookStats.get(url);
    stats.attempts++;
    if (success) {
      stats.success++;
      stats.lastSuccess = Date.now();
    } else {
      stats.failed++;
    }

    // Keep request history
    if (!this.requestHistory.has(url)) {
      this.requestHistory.set(url, []);
    }
    const history = this.requestHistory.get(url);
    history.push({ timestamp: Date.now(), status: success ? 'success' : 'failed' });

    // Keep only last 100 requests
    if (history.length > 100) {
      history.shift();
    }
  }

  getWebhookStats(url) {
    return this.webhookStats.get(url) || {
      attempts: 0,
      success: 0,
      failed: 0,
      lastError: null,
      lastSuccess: null
    };
  }

  getSuccessRate(url) {
    const stats = this.getWebhookStats(url);
    return stats.attempts > 0 ? (stats.success / stats.attempts * 100).toFixed(1) : 'N/A';
  }

  // ========== RETRY LOGIC ==========
  addToRetryQueue(url, data, attempts = 0) {
    if (attempts >= 3) {
      logError(`[Webhook] Max retries exceeded for ${url}`, new Error('Retry limit reached'));
      return false;
    }

    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Exponential backoff, max 30s
    this.retryQueue.push({
      url,
      data,
      attempts: attempts + 1,
      nextRetry: Date.now() + delay
    });

    return true;
  }

  processRetryQueue() {
    const now = Date.now();
    const toRetry = this.retryQueue.filter(item => item.nextRetry <= now);

    this.retryQueue = this.retryQueue.filter(item => item.nextRetry > now);

    for (const item of toRetry) {
      sendWebhookImmediate(item.url, item.data, item.attempts);
    }
  }
}

const webhookManager = new WebhookManager();

// ================== PLUGIN STATE ==================
const plugin = {
  initialized: false,
  messageQueue: [],
  isProcessingQueue: false,
  lastHeartbeat: Date.now(),
  startTime: Date.now(),
  queueIndex: 0 // Ring buffer index
};

// Database Tables
const db = {
  players: database.makeTable("webhook_players"),
  stats: database.makeTable("webhook_stats"),
  logs: database.makeTable("webhook_logs"),
  cache: database.makeTable("webhook_cache"),
  achievements: database.makeTable("webhook_achievements"), // NEW
  analytics: database.makeTable("webhook_analytics"), // NEW
  healthChecks: database.makeTable("webhook_healthChecks") // NEW
};

// Runtime State
const state = {
  recentMessages: new Map(),
  playerSessions: new Map(),
  afkPlayers: new Map(),
  spamTracking: new Map(),
  playerAchievements: new Map(), // NEW - Track achievements per player
  lastAnalyticsRun: Date.now(), // NEW
  lastHealthCheck: Date.now() // NEW
};

// ================== INITIALIZATION ==================
function initialize() {
  try {
    console.info("[Webhook] Starting initialization v3.0.0...");

    // Validate all webhook URLs
    validateAllWebhooks();

    // Initialize stats
    if (!db.stats.has("global")) {
      db.stats.set("global", {
        totalJoins: 0,
        totalDeaths: 0,
        totalMessages: 0,
        totalCommands: 0,
        totalAchievements: 0,
        bossKills: {},
        startTime: Date.now()
      });
    }

    // Setup handlers based on config
    setupHandlers();

    // Start background tasks
    startBackgroundTasks();

    // Send startup message
    if (WHHelpers.isEnabled("server.startStop")) {
      sendWebhook("serverEvents", {
        embeds: [{
          title: WHHelpers.formatMessage(WHConfig.messages.server.start, {
            serverName: WHConfig.appearance.serverName
          }),
          color: WHHelpers.getColor("success"),
          fields: [
            {
              name: "Version",
              value: "Webhook Plugin v3.0.0",
              inline: true
            },
            {
              name: "Mode",
              value: bridgeAvailable ? "BedrockBridge" : "Standalone",
              inline: true
            },
            {
              name: "Webhooks Configured",
              value: Object.values(WHConfig.webhooks).filter(w => w).length.toString(),
              inline: true
            }
          ],
          thumbnail: { url: WHConfig.appearance.serverIcon },
          timestamp: new Date().toISOString()
        }]
      });
    }

    plugin.initialized = true;
    plugin.lastHeartbeat = Date.now();
    console.info("[Webhook] Initialization complete!");

  } catch (error) {
    console.error(`[Webhook] Initialization failed: ${error}`);
    console.error(`[Webhook] Stack: ${error.stack}`);
  }
}

// ========== VALIDATION ==========
function validateAllWebhooks() {
  let valid = 0;
  let invalid = 0;

  for (const [name, url] of Object.entries(WHConfig.webhooks)) {
    if (!url) continue;

    if (webhookManager.validateWebhookUrl(url)) {
      valid++;
    } else {
      invalid++;
      console.warn(`[Webhook] Invalid URL for ${name}: ${url}`);
    }
  }

  console.info(`[Webhook] Validated ${valid} webhook URLs (${invalid} invalid)`);
}

// ================== HANDLER SETUP ==================
function setupHandlers() {
  // Chat handlers
  if (WHHelpers.isEnabled("chat.enabled")) {
    if (bridgeAvailable && bridge?.events?.chatUpStream) {
      bridge.events.chatUpStream.subscribe(handleChatMessage);
    } else {
      world.afterEvents.chatSend.subscribe(handleChatMessage);
    }
  }

// Player handlers
if (WHHelpers.isEnabled("players.joinLeave")) {
  if (bridgeAvailable && bridge?.events?.playerJoinLog) {
    bridge.events.playerJoinLog.subscribe(handlePlayerJoin);
    bridge.events.playerLeaveLog.subscribe(handlePlayerLeave);
  } else {
    world.afterEvents.playerJoin.subscribe(handlePlayerJoin);
    if (world.beforeEvents?.playerLeave) {
      world.beforeEvents.playerLeave.subscribe(e => handlePlayerLeave({ player: e.player }));
    } else {
      world.afterEvents.playerLeave.subscribe(e => {
        if (e.player) handlePlayerLeave({ player: e.player });
      });
    }
  }
}

  // Death handlers
  if (WHHelpers.isEnabled("combat.deathMessages")) {
    if (bridgeAvailable && bridge?.events?.playerDieLog) {
      bridge.events.playerDieLog.subscribe(handlePlayerDeath);
    } else {
      world.afterEvents.entityDie.subscribe((event) => {
        if (!event?.deadEntity?.typeId) return; // guard undefined entity
        if (event.deadEntity.typeId === "minecraft:player") {
          handlePlayerDeath({
            player: event.deadEntity,
            damageSource: event.damageSource
          });
        }
      });
    }
  }

  // Achievement handlers (NEW)
  if (WHHelpers.isEnabled("players.achievements")) {
    world.afterEvents.playerSpawn?.subscribe((event) => {
      // Guard: skip SimulatedPlayers
      if (!event?.player?.id) return;
      handleAchievementCheck(event.player);
    });
  }

  // World event handlers
  if (WHHelpers.isEnabled("world.bossKills")) {
    world.afterEvents.entityDie.subscribe(handleEntityDeath);
  }

  // Block handlers
  if (WHHelpers.isEnabled("blocks.valuable")) {
    world.afterEvents.playerBreakBlock.subscribe(handleBlockBreak);
    world.afterEvents.playerPlaceBlock.subscribe(handleBlockPlace);
  }

  // Container handlers
  if (WHHelpers.isEnabled("blocks.containers")) {
    world.afterEvents.playerInteractWithBlock?.subscribe(handleContainerInteraction);
  }

  // Command handlers
  setupCommandHandlers();

  // System handlers
  setupSystemHandlers();
}

// ================== CHAT HANDLING ==================
function handleChatMessage(event) {
  try {
    const player = event.sender || event.player;
    const message = event.message;

    // Spam check
    if (WHHelpers.isEnabled("chat.antiSpam") && !WHHelpers.hasPermission(player, "bypassAntiSpam")) {
      if (isSpamming(player)) {
        event.cancel = true;
        player.sendMessage("§cPlease slow down! Anti-spam protection activated.");
        return;
      }
    }

    // Filter check
    if (WHConfig.filters.chat.enabled) {
      const filtered = filterMessage(message);
      if (filtered.blocked) {
        event.cancel = true;
        player.sendMessage("§cYour message was blocked by the chat filter.");
        return;
      }
      if (filtered.warning) {
        player.sendMessage("§eWarning: Your message contains inappropriate content.");
      }
    }

    // Log to Discord
    if (WHHelpers.isEnabled("chat.logToDiscord")) {
      const playerTags = player.getTags();
      let prefix = "";

      if (WHHelpers.isEnabled("chat.showPlayerTags")) {
        if (playerTags.includes(WHConfig.permissions.tags.admin)) prefix = "[Admin] ";
        else if (playerTags.includes(WHConfig.permissions.tags.moderator)) prefix = "[Mod] ";
        else if (playerTags.includes(WHConfig.permissions.tags.vip)) prefix = "[VIP] ";
      }

      sendWebhook("chat", {
        content: `${prefix}${player.name}: ${message}`,
        username: player.name,
        avatar_url: getPlayerAvatar(player.name)
      });
    }

    // Update stats
    updateStat(player.id, "messages");
    updateGlobalStat("totalMessages", 1);

  } catch (error) {
    logError("Chat handling error", error);
  }
}

// ================== PLAYER EVENTS ==================
function handlePlayerJoin(event) {
  try {
    const player = event.player;
    // Guard: SimulatedPlayers have no XUID (id is undefined/empty)
    if (!player || !player.id) return;
    const playerId = player.id;

    // Initialize session
    state.playerSessions.set(playerId, {
      joinTime: Date.now(),
      lastActivity: Date.now()
    });

    // Get/Create player data
    const playerData = db.players.get(playerId) || {
      name: player.name,
      firstJoin: Date.now(),
      lastJoin: Date.now(),
      totalJoins: 0,
      totalPlaytime: 0,
      achievements: [] // NEW
    };

    playerData.name = player.name;
    playerData.lastJoin = Date.now();
    playerData.totalJoins++;

    const isFirstJoin = playerData.totalJoins === 1;
    db.players.set(playerId, playerData);

    // Send join message
    const embed = {
      author: {
        name: isFirstJoin && WHHelpers.isEnabled("players.firstJoin")
          ? WHHelpers.formatMessage(WHConfig.messages.player.firstJoin, { player: player.name })
          : WHHelpers.formatMessage(WHConfig.messages.player.join, { player: player.name }),
        icon_url: getPlayerAvatar(player.name)
      },
      color: WHHelpers.getColor("join"),
      fields: [
        {
          name: "Players Online",
          value: world.getAllPlayers().length.toString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    if (isFirstJoin) {
      embed.description = "Welcome to the server! 🎉";
    } else {
      embed.fields.push({
        name: "Total Joins",
        value: playerData.totalJoins.toString(),
        inline: true
      });
    }

    sendWebhook("playerEvents", { embeds: [embed] });

    // Update global stats
    updateGlobalStat("totalJoins", 1);

  } catch (error) {
    logError("Player join error", error);
  }
}

function handlePlayerLeave(event) {
  if (event?.player?.hasTag?.("tn:simulated")) return;
  if (!event?.player && !event?.playerName) return;
  try {
    const player = event.player;
    const playerId = player.id;
    const session = state.playerSessions.get(playerId);

    if (session) {
      const sessionTime = Date.now() - session.joinTime;

      // Update playtime
      const playerData = db.players.get(playerId);
      if (playerData) {
        playerData.totalPlaytime += sessionTime;
        db.players.set(playerId, playerData);
      }

      // Send leave message
      sendWebhook("playerEvents", {
        embeds: [{
          author: {
            name: WHHelpers.formatMessage(WHConfig.messages.player.leave, { player: player.name }),
            icon_url: getPlayerAvatar(player.name)
          },
          color: WHHelpers.getColor("leave"),
          fields: [
            {
              name: "Session Time",
              value: formatDuration(sessionTime),
              inline: true
            },
            {
              name: "Players Online",
              value: (world.getAllPlayers().length - 1).toString(),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });

      // Cleanup
      state.playerSessions.delete(playerId);
      state.afkPlayers.delete(playerId);
    }

  } catch (error) {
    logError("Player leave error", error);
  }
}

function handlePlayerDeath(event) {
  try {
    const player = event.player;
    const damageSource = event.damageSource;
    const location = player.location;

    // Generate death message
    const deathMessage = generateDeathMessage(player, damageSource);

    const embed = {
      author: {
        name: `${WHConfig.appearance.formatting.emojis.death} ${deathMessage}`,
        icon_url: getPlayerAvatar(player.name)
      },
      color: WHHelpers.getColor("death"),
      fields: [],
      timestamp: new Date().toISOString()
    };

    // Add location info
    if (WHHelpers.isEnabled("players.locationTracking")) {
      embed.fields.push({
        name: "Location",
        value: `${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)}`,
        inline: true
      });

      embed.fields.push({
        name: "Dimension",
        value: player.dimension.id.replace("minecraft:", ""),
        inline: true
      });
    }

    // Add killer info
    if (damageSource.damagingEntity) {
      embed.fields.push({
        name: "Killed By",
        value: damageSource.damagingEntity.name || damageSource.damagingEntity.typeId.split(":")[1],
        inline: true
      });
    }

    // Check for valuable items
    if (WHHelpers.isEnabled("combat.itemDropAlerts") && WHHelpers.isEnabled("players.inventoryTracking")) {
      const inventory = player.getComponent("inventory")?.container;
      if (inventory) {
        const valuableItems = checkValuableItems(inventory);
        if (valuableItems.length > 0) {
          embed.fields.push({
            name: `${WHConfig.appearance.formatting.emojis.warning} Valuable Items Dropped`,
            value: valuableItems.join(", ").substring(0, 1024),
            inline: false
          });
        }
      }
    }

    sendWebhook("deaths", { embeds: [embed] });

    // Update stats
    updateStat(player.id, "deaths");
    updateGlobalStat("totalDeaths", 1);

  } catch (error) {
    logError("Player death error", error);
  }
}

// ================== ACHIEVEMENT HANDLING (NEW) ==================
function handleAchievementCheck(player) {
  if (!player?.isValid || !player?.id) return;
  if (player?.hasTag?.("tn:simulated")) return;
  try {
    if (!WHHelpers.isEnabled("players.achievements")) return;

    const playerId = player.id;
    const currentTags = player.getTags();

    if (!state.playerAchievements.has(playerId)) {
      state.playerAchievements.set(playerId, []);
    }

    const previousAchievements = state.playerAchievements.get(playerId);
    const newAchievements = currentTags.filter(tag =>
      tag.startsWith("achievement_") && !previousAchievements.includes(tag)
    );

    for (const achievement of newAchievements) {
      const achievementName = achievement.replace("achievement_", "").replace(/_/g, " ");

      sendWebhook("achievements", {
        embeds: [{
          author: {
            name: `${player.name} achieved`,
            icon_url: getPlayerAvatar(player.name)
          },
          title: WHConfig.appearance.formatting.emojis.achievement + " " + achievementName,
          color: WHHelpers.getColor("success"),
          fields: [
            {
              name: "Playtime",
              value: formatDuration(Date.now() - (db.players.get(playerId)?.firstJoin || Date.now())),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });

      // Log achievement
      logEvent("achievement", {
        player: player.name,
        achievement: achievementName
      });

      updateGlobalStat("totalAchievements", 1);
    }

    state.playerAchievements.set(playerId, currentTags.filter(tag => tag.startsWith("achievement_")));

  } catch (error) {
    logError("Achievement check error", error);
  }
}

// ================== WORLD EVENTS ==================
function handleEntityDeath(event) {
  try {
    const entity = event.deadEntity;
    const killer = event.damageSource.damagingEntity;

    // Boss kills
    if (killer?.typeId === "minecraft:player") {
      let bossType = null;
      let bossName = null;
      let emoji = "";

      if (entity.typeId === "minecraft:ender_dragon") {
        bossType = "ender_dragon";
        bossName = "Ender Dragon";
        emoji = WHConfig.appearance.formatting.emojis.boss;
      } else if (entity.typeId === "minecraft:wither") {
        bossType = "wither";
        bossName = "Wither";
        emoji = "💀";
      } else if (entity.typeId === "minecraft:elder_guardian") {
        bossType = "elder_guardian";
        bossName = "Elder Guardian";
        emoji = "🌊";
      }

      if (bossType) {
        // Update stats
        const stats = db.stats.get("global");
        if (!stats.bossKills[bossType]) stats.bossKills[bossType] = 0;
        stats.bossKills[bossType]++;
        db.stats.set("global", stats);

        // Send notification
        sendWebhook("worldEvents", {
          embeds: [{
            title: `${emoji} ${bossName} Defeated!`,
            description: `**${killer.name}** has defeated the ${bossName}!`,
            color: WHHelpers.getColor("boss"),
            fields: [
              {
                name: "Total Kills",
                value: stats.bossKills[bossType].toString(),
                inline: true
              }
            ],
            thumbnail: { url: WHConfig.appearance.serverIcon },
            timestamp: new Date().toISOString()
          }]
        });
      }
    }
  } catch (error) {
    logError("Entity death error", error);
  }
}

// ================== BLOCK EVENTS ==================
function handleBlockBreak(event) {
  try {
    const block = event.brokenBlockPermutation;
    const player = event.player;
    const location = event.block.location;

    // Check if block is in watchlist
    if (WHConfig.features.blocks.watchlist.some(b => block.type.id.includes(b))) {
      const blockName = block.type.id.split(":")[1].replace(/_/g, " ");

      // Special emoji for certain blocks
      let emoji = "";
      if (block.type.id.includes("diamond")) emoji = WHConfig.appearance.formatting.emojis.diamond;
      else if (block.type.id.includes("netherite") || block.type.id.includes("ancient_debris")) emoji = WHConfig.appearance.formatting.emojis.netherite;

      sendWebhook("blockLogs", {
        embeds: [{
          author: {
            name: `${player.name} broke ${blockName}`,
            icon_url: getPlayerAvatar(player.name)
          },
          description: `${emoji} Valuable block broken`,
          color: WHHelpers.getColor("warning"),
          fields: [
            {
              name: "Block",
              value: blockName,
              inline: true
            },
            {
              name: "Location",
              value: `${location.x}, ${location.y}, ${location.z}`,
              inline: true
            },
            {
              name: "Dimension",
              value: player.dimension.id.replace("minecraft:", ""),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });

      // Log event
      logEvent("blockBreak", {
        player: player.name,
        block: block.type.id,
        location: location
      });
    }
  } catch (error) {
    logError("Block break error", error);
  }
}

function handleBlockPlace(event) {
  try {
    const block = event.block;
    const player = event.player;

    // Log spawners and other special blocks
    const specialBlocks = ["spawner", "command_block", "structure_block", "beacon"];

    if (specialBlocks.some(b => block.typeId.includes(b))) {
      sendWebhook("blockLogs", {
        embeds: [{
          author: {
            name: `${player.name} placed ${block.typeId}`,
            icon_url: getPlayerAvatar(player.name)
          },
          color: WHHelpers.getColor("info"),
          fields: [
            {
              name: "Location",
              value: `${block.location.x}, ${block.location.y}, ${block.location.z}`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }
  } catch (error) {
    logError("Block place error", error);
  }
}

function handleContainerInteraction(event) {
  try {
    const player = event.player;
    const block = event.block;

    // Only log certain containers
    const importantContainers = ["chest", "barrel", "shulker_box", "ender_chest"];

    if (importantContainers.some(c => block.typeId.includes(c))) {
      // Rate limit container logs
      const cacheKey = `container_${player.id}_${block.location.x}_${block.location.y}_${block.location.z}`;
      const lastLogged = state.recentMessages.get(cacheKey);

      if (!lastLogged || Date.now() - lastLogged > 60000) { // 1 minute cooldown
        state.recentMessages.set(cacheKey, Date.now());

        logEvent("containerAccess", {
          player: player.name,
          container: block.typeId,
          location: block.location
        });
      }
    }
  } catch (error) {
    logError("Container interaction error", error);
  }
}

// ================== COMMAND SYSTEM ==================
function setupCommandHandlers() {
  if (bridgeAvailable && bridge?.bedrockCommands) {
    // BedrockBridge command registration
    bridge.bedrockCommands.registerCommand(
      "webhook",
      handleWebhookCommand,
      "Webhook plugin commands"
    );

    bridge.bedrockCommands.registerAdminCommand(
      "whadmin",
      handleAdminCommand,
      "Webhook admin commands"
    );
  } else {
    // Standalone command handling
    world.afterEvents.chatSend.subscribe((event) => {
      const message = event.message;
      const player = event.sender;

      if (message.startsWith("!webhook ")) {
        event.cancel = true;
        const args = message.substring(9).split(" ");
        handleWebhookCommand(player, ...args);
      } else if (message.startsWith("!whadmin ") && player.hasTag(WHConfig.permissions.tags.admin)) {
        event.cancel = true;
        const args = message.substring(10).split(" ");
        handleAdminCommand(player, ...args);
      }
    });
  }

  // Log all commands
  world.afterEvents.chatSend?.subscribe((event) => {
    if (event.message.startsWith("/") || event.message.startsWith("!")) {
      handleCommandLogging(event.sender, event.message);
    }
  });
}

function handleWebhookCommand(player, ...args) {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case "stats":
      showPlayerStats(player, args[1]);
      break;
    case "info":
      showInfo(player);
      break;
    case "health":
      showWebhookHealth(player);
      break;
    case "help":
      showHelp(player);
      break;
    default:
      player.sendMessage("§6Webhook Commands:");
      player.sendMessage("§e!webhook stats [player]§7 - Show statistics");
      player.sendMessage("§e!webhook info§7 - Show plugin info");
      player.sendMessage("§e!webhook health§7 - Show webhook health");
      player.sendMessage("§e!webhook help§7 - Show this help");
  }
}

function handleAdminCommand(player, ...args) {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case "test":
      testWebhooks(player, args[1]);
      break;
    case "reload":
      player.sendMessage("§aConfiguration reload requires server restart");
      break;
    case "debug":
      WHConfig.advanced.debug.enabled = !WHConfig.advanced.debug.enabled;
      player.sendMessage(`§aDebug mode ${WHConfig.advanced.debug.enabled ? "enabled" : "disabled"}`);
      break;
    case "status":
      showStatus(player);
      break;
    case "clear":
      clearCache(player);
      break;
    case "health":
      showDetailedWebhookHealth(player);
      break;
    default:
      player.sendMessage("§6Webhook Admin Commands:");
      player.sendMessage("§e!whadmin test [webhook]§7 - Test webhooks");
      player.sendMessage("§e!whadmin debug§7 - Toggle debug mode");
      player.sendMessage("§e!whadmin status§7 - Show system status");
      player.sendMessage("§e!whadmin clear§7 - Clear caches");
      player.sendMessage("§e!whadmin health§7 - Show detailed health");
  }
}

function handleCommandLogging(player, command) {
  if (!WHHelpers.isEnabled("moderation.commands")) return;

  // Filter ignored commands
  if (WHConfig.filters.events.ignoreCommands.some(c => command.includes(c))) return;

  sendWebhook("commands", {
    embeds: [{
      author: {
        name: "Command Executed",
        icon_url: getPlayerAvatar(player.name)
      },
      color: WHHelpers.getColor("command"),
      fields: [
        {
          name: "Player",
          value: player.name,
          inline: true
        },
        {
          name: "Command",
          value: `\`${command}\``,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    }]
  });

  updateStat(player.id, "commands");
  updateGlobalStat("totalCommands", 1);
}

// ================== WEBHOOK SYSTEM (UPGRADED) ==================
async function sendWebhook(type, data, immediate = false) {
  const webhookUrl = WHHelpers.getWebhook(type);

  if (!webhookUrl) {
    if (WHConfig.advanced.debug.enabled) {
      console.warn(`[Webhook] No webhook URL for type: ${type}`);
    }
    return;
  }

  // Validate URL. Do not route validation failures back through the error webhook,
  // otherwise an invalid errors webhook recursively logs itself until the watchdog kills the script.
  if (!webhookManager.validateWebhookUrl(webhookUrl)) {
    console.error(`[Webhook] Invalid webhook URL for ${type}: Error: Invalid URL format`);
    return;
  }

  // Test mode - don't send real webhooks
  if (WHConfig.advanced.debug.testMode) {
    console.log(`[Webhook] TEST MODE - Would send to ${type}:`, JSON.stringify(data, null, 2));
    return;
  }

  // Check circuit breaker
  const circuitState = webhookManager.getCircuitBreakerState(webhookUrl);
  if (circuitState === 'OPEN') {
    if (WHConfig.advanced.debug.enabled) {
      console.warn(`[Webhook] Circuit breaker OPEN for ${type}, queuing message`);
    }
    webhookManager.addToRetryQueue(webhookUrl, data);
    return;
  }

  // Check rate limit
  if (!webhookManager.checkRateLimit(webhookUrl)) {
    if (WHConfig.advanced.debug.enabled) {
      console.warn(`[Webhook] Rate limit exceeded for ${type}, queuing message`);
    }
    webhookManager.addToRetryQueue(webhookUrl, data);
    return;
  }

  // Queue or send immediately
  if (immediate) {
    await sendWebhookImmediate(webhookUrl, data, 0);
  } else {
    plugin.messageQueue.push({
      url: webhookUrl,
      data: data,
      timestamp: Date.now(),
      type: type
    });

    // Ring buffer - keep fixed size
    const maxSize = WHConfig.advanced.performance.messageQueueSize;
    if (plugin.messageQueue.length > maxSize) {
      plugin.messageQueue.shift();
    }
  }
}

async function sendWebhookImmediate(webhookUrl, data, attempts = 0) {
  try {
    // Try BridgeDirect first
    if (false) { // webhook plugin posts to the configured webhook URL (not bridgeDirect)
      if (data.embeds && data.embeds[0]) {
        bridgeDirect.sendEmbed(
          data.embeds[0],
          data.username || WHConfig.appearance.serverName,
          data.avatar_url || WHConfig.appearance.serverIcon
        );
      } else if (data.content) {
        bridgeDirect.sendMessage(
          data.content,
          data.username || WHConfig.appearance.serverName,
          data.avatar_url || WHConfig.appearance.serverIcon
        );
      }
      webhookManager.recordSuccess(webhookUrl);
      return;
    }

    // HTTP Request with enhanced error handling
    const request = new HttpRequest(webhookUrl);
    request.method = HttpRequestMethod.Post;
    request.headers = [
      new HttpHeader("Content-Type", "application/json"),
      new HttpHeader("User-Agent", "BedrockBridge-Webhook/3.0")
    ];
    request.body = JSON.stringify(data);

    const response = await http.request(request);

    // Update rate limit info
    const rateLimitOk = webhookManager.updateRateLimit(webhookUrl, response);

    if (response.status === 200 || response.status === 204 || response.status === 429) {
      webhookManager.recordSuccess(webhookUrl);

      if (response.status === 429) {
        // We got rate limited, retry later
        webhookManager.addToRetryQueue(webhookUrl, data, attempts);
      }
    } else if (response.status >= 500) {
      // Server error - retry
      webhookManager.recordFailure(webhookUrl);
      webhookManager.addToRetryQueue(webhookUrl, data, attempts);
    } else if (response.status >= 400) {
      // Client error - don't retry
      webhookManager.recordFailure(webhookUrl);
      throw new Error(`Webhook failed with status ${response.status}: ${response.body}`);
    }

  } catch (error) {
    webhookManager.recordFailure(webhookUrl);
    logError(`Webhook send failed (attempt ${attempts + 1})`, error);

    // Attempt retry
    if (attempts < 3) {
      webhookManager.addToRetryQueue(webhookUrl, data, attempts);
    }
  }
}

function processMessageQueue() {
  if (plugin.isProcessingQueue || plugin.messageQueue.length === 0) return;

  plugin.isProcessingQueue = true;

  try {
    const batchSize = Math.min(
      WHConfig.advanced.performance.messageBatchSize,
      plugin.messageQueue.length
    );

    const batch = plugin.messageQueue.splice(0, batchSize);

    for (const message of batch) {
      // Skip old messages
      if (Date.now() - message.timestamp > 30000) continue;

      sendWebhookImmediate(message.url, message.data, 0);
    }
  } catch (error) {
    logError("Queue processing error", error);
  } finally {
    plugin.isProcessingQueue = false;
  }
}

// ================== WEBHOOK HEALTH CHECKS (NEW) ==================
function performWebhookHealthCheck() {
  try {
    if (Date.now() - state.lastHealthCheck < 300000) return; // Every 5 minutes

    state.lastHealthCheck = Date.now();

    for (const [name, url] of Object.entries(WHConfig.webhooks)) {
      if (!url) continue;

      const stats = webhookManager.getWebhookStats(url);
      const successRate = webhookManager.getSuccessRate(url);
      const circuitState = webhookManager.getCircuitBreakerState(url);

      if (WHConfig.advanced.debug.enabled) {
        console.log(`[Webhook Health] ${name}: Success Rate ${successRate}%, Circuit: ${circuitState}`);
      }

      // Store health data
      if (!db.healthChecks.has("webhooks")) {
        db.healthChecks.set("webhooks", {});
      }

      const healthData = db.healthChecks.get("webhooks");
      healthData[name] = {
        timestamp: Date.now(),
        attempts: stats.attempts,
        success: stats.success,
        failed: stats.failed,
        successRate: successRate,
        circuitState: circuitState
      };

      db.healthChecks.set("webhooks", healthData);
    }

  } catch (error) {
    logError("Health check error", error);
  }
}

function sendHealthCheckNotification(player) {
  const webhooks = db.healthChecks.get("webhooks") || {};

  let failedCount = 0;
  const fields = [];

  for (const [name, data] of Object.entries(webhooks)) {
    if (data.circuitState === 'OPEN') {
      failedCount++;
      fields.push({
        name: `🔴 ${name}`,
        value: `Success: ${data.successRate}% | Circuit: ${data.circuitState}`,
        inline: true
      });
    } else if (data.successRate < 80) {
      fields.push({
        name: `🟡 ${name}`,
        value: `Success: ${data.successRate}% | Circuit: ${data.circuitState}`,
        inline: true
      });
    } else {
      fields.push({
        name: `🟢 ${name}`,
        value: `Success: ${data.successRate}%`,
        inline: true
      });
    }
  }

  if (fields.length > 0 && failedCount > 0) {
    sendWebhook("errors", {
      embeds: [{
        title: "⚠️ Webhook Health Alert",
        description: `${failedCount} webhook(s) experiencing issues`,
        color: WHHelpers.getColor("warning"),
        fields: fields,
        timestamp: new Date().toISOString()
      }]
    }, true);
  }
}

// ================== HELPER FUNCTIONS ==================
function getPlayerAvatar(playerName) {
  const config = WHConfig.appearance.avatars;

  switch (config.service) {
    case "crafatar":
      return `https://crafatar.com/avatars/${playerName}?size=${config.size}&overlay=${config.overlay}`;
    case "minotar":
      return `https://minotar.net/helm/${playerName}/${config.size}`;
    case "cravatar":
      return `https://cravatar.eu/helmavatar/${playerName}/${config.size}`;
    default:
      return config.service.replace("{name}", playerName).replace("{size}", config.size);
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function generateDeathMessage(player, damageSource) {
  const victim = player.name;
  const cause = damageSource.cause;

  // Check custom messages first
  if (WHConfig.messages.death[cause]) {
    return WHHelpers.formatMessage(WHConfig.messages.death[cause], { player: victim });
  }

  // Default messages
  const killer = damageSource.damagingEntity;
  const killerName = killer ? (killer.name || killer.typeId.split(':')[1]?.replace(/_/g, ' ')) : "";

  const messages = {
    "entityAttack": `${victim} was slain by ${killerName}`,
    "projectile": `${victim} was shot by ${killerName}`,
    "entityExplosion": `${victim} was blown up by ${killerName}`,
    "magic": killer ? `${victim} was killed by ${killerName} using magic` : `${victim} was killed by magic`,
    "thorns": `${victim} was killed trying to hurt ${killerName}`,
    "wither": `${victim} withered away`,
    "starve": `${victim} starved to death`,
    "suffocation": `${victim} suffocated in a wall`,
    "fire": `${victim} went up in flames`,
    "lava": `${victim} tried to swim in lava`,
    "drowning": `${victim} drowned`,
    "void": `${victim} fell out of the world`,
    "fall": `${victim} fell from a high place`,
    "flyIntoWall": `${victim} experienced kinetic energy`
  };

  return messages[cause] || WHHelpers.formatMessage(WHConfig.messages.death.generic, { player: victim });
}

function checkValuableItems(inventory) {
  const valuable = [];
  const watchlist = WHConfig.features.items.watchlist;

  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);
    if (item && watchlist.some(w => item.typeId.includes(w))) {
      valuable.push(`${item.amount}x ${item.typeId.split(':')[1]}`);
    }
  }

  return valuable;
}

function isSpamming(player) {
  const playerId = player.id;
  const now = Date.now();

  if (!state.spamTracking.has(playerId)) {
    state.spamTracking.set(playerId, { messages: [], warnings: 0 });
  }

  const tracking = state.spamTracking.get(playerId);
  tracking.messages = tracking.messages.filter(time => now - time < 10000);
  tracking.messages.push(now);

  if (tracking.messages.length > WHConfig.advanced.limits.spamThreshold) {
    tracking.warnings++;

    if (tracking.warnings >= 3 && player.mute) {
      player.mute();
      sendWebhook("moderation", {
        embeds: [{
          title: "🔇 Player Auto-Muted",
          description: `${player.name} was automatically muted for spamming`,
          color: WHHelpers.getColor("warning"),
          timestamp: new Date().toISOString()
        }]
      });
    }

    return true;
  }

  return false;
}

function filterMessage(message) {
  const result = { blocked: false, warning: false, filtered: message };

  // Check blocked words
  for (const word of WHConfig.filters.chat.blockWords) {
    if (message.toLowerCase().includes(word.toLowerCase())) {
      result.blocked = true;
      return result;
    }
  }

  // Check warning words
  for (const word of WHConfig.filters.chat.warnWords) {
    if (message.toLowerCase().includes(word.toLowerCase())) {
      result.warning = true;
    }
  }

  // Replace words
  for (const [from, to] of Object.entries(WHConfig.filters.chat.replaceWords)) {
    result.filtered = result.filtered.replace(new RegExp(from, 'gi'), to);
  }

  return result;
}

// ================== STATS & LOGGING ==================
function updateStat(playerId, stat) {
  const playerData = db.players.get(playerId) || {};
  playerData[stat] = (playerData[stat] || 0) + 1;
  db.players.set(playerId, playerData);
}

function updateGlobalStat(stat, amount = 1) {
  const globalStats = db.stats.get("global") || {};
  globalStats[stat] = (globalStats[stat] || 0) + amount;
  db.stats.set("global", globalStats);
}

function logEvent(type, data) {
  if (!WHConfig.advanced.logging.saveToFile) return;

  const event = {
    timestamp: Date.now(),
    type: type,
    data: data
  };

  const logs = db.logs.get(type) || [];
  logs.push(event);

  // Rotate logs
  if (logs.length > WHConfig.advanced.logging.maxLogSize) {
    logs.shift();
  }

  db.logs.set(type, logs);
}

function logError(message, error) {
  console.error(`[Webhook] ${message}:`, error);

  if (WHConfig.advanced.debug.showStackTraces && error.stack) {
    console.error(`[Webhook] Stack:`, error.stack);
  }

  sendWebhook("errors", {
    embeds: [{
      title: "❌ Error",
      description: message,
      color: WHHelpers.getColor("error"),
      fields: [
        {
          name: "Error",
          value: error.toString().substring(0, 1024),
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

// ================== COMMAND IMPLEMENTATIONS ==================
function showPlayerStats(player, targetName) {
  const target = targetName
    ? world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase())
    : player;

  if (!target) {
    player.sendMessage("§cPlayer not found");
    return;
  }

  const stats = db.players.get(target.id) || {};

  player.sendMessage(`§6=== Stats for ${target.name} ===`);
  player.sendMessage(`§eMessages: §f${stats.messages || 0}`);
  player.sendMessage(`§eCommands: §f${stats.commands || 0}`);
  player.sendMessage(`§eDeaths: §f${stats.deaths || 0}`);
  player.sendMessage(`§eTotal Joins: §f${stats.totalJoins || 0}`);
  player.sendMessage(`§ePlaytime: §f${formatDuration(stats.totalPlaytime || 0)}`);
  player.sendMessage(`§eAchievements: §f${(stats.achievements || []).length}`);
}

function showInfo(player) {
  player.sendMessage("§6=== Webhook Plugin Info ===");
  player.sendMessage(`§eVersion: §fv3.0.0`);
  player.sendMessage(`§eMode: §f${bridgeAvailable ? "BedrockBridge" : "Standalone"}`);
  player.sendMessage(`§eWebhooks Configured: §f${Object.values(WHConfig.webhooks).filter(w => w).length}`);
  player.sendMessage(`§eFeatures Active: §f${countActiveFeatures()}`);
  player.sendMessage(`§eUptime: §f${formatDuration(Date.now() - plugin.startTime)}`);
}

function showWebhookHealth(player) {
  const webhooks = db.healthChecks.get("webhooks") || {};

  player.sendMessage("§6=== Webhook Health ===");

  if (Object.keys(webhooks).length === 0) {
    player.sendMessage("§eNo health data available yet");
    return;
  }

  for (const [name, data] of Object.entries(webhooks)) {
    const color = data.circuitState === 'OPEN' ? '§c' : data.successRate < 80 ? '§e' : '§a';
    player.sendMessage(`${color}${name}§f: ${data.successRate}% success (${data.circuitState})`);
  }
}

function showDetailedWebhookHealth(player) {
  if (!player.hasTag(WHConfig.permissions.tags.admin)) {
    player.sendMessage("§cAdmin only!");
    return;
  }

  const webhooks = db.healthChecks.get("webhooks") || {};

  player.sendMessage("§6=== Detailed Webhook Health ===");

  for (const [name, data] of Object.entries(webhooks)) {
    player.sendMessage(`§e${name}:`);
    player.sendMessage(`  Success Rate: §f${data.successRate}%`);
    player.sendMessage(`  Attempts: §f${data.attempts}`);
    player.sendMessage(`  Success: §a${data.success}§f | Failed: §c${data.failed}`);
    player.sendMessage(`  Circuit Breaker: §f${data.circuitState}`);
  }
}

function showHelp(player) {
  player.sendMessage("§6=== Webhook Plugin Help ===");
  player.sendMessage("§eThis plugin logs various server events to Discord");
  player.sendMessage("§eUse §f!webhook stats§e to view your statistics");
  player.sendMessage("§eUse §f!webhook info§e to view plugin information");
  player.sendMessage("§eUse §f!webhook health§e to view webhook health");

  if (player.hasTag(WHConfig.permissions.tags.admin)) {
    player.sendMessage("§eAdmin: Use §f!whadmin§e for admin commands");
  }
}

function showStatus(player) {
  if (!player.hasTag(WHConfig.permissions.tags.admin)) {
    player.sendMessage("§cAdmin only!");
    return;
  }

  const globalStats = db.stats.get("global") || {};

  player.sendMessage("§6=== System Status ===");
  player.sendMessage(`§eInitialized: ${plugin.initialized ? "§aYes" : "§cNo"}`);
  player.sendMessage(`§eUptime: §f${formatDuration(Date.now() - plugin.startTime)}`);
  player.sendMessage(`§eMessage Queue: §f${plugin.messageQueue.length}/${WHConfig.advanced.performance.messageQueueSize}`);
  player.sendMessage(`§eRetry Queue: §f${webhookManager.retryQueue.length}`);
  player.sendMessage(`§eActive Sessions: §f${state.playerSessions.size}`);
  player.sendMessage(`§eTotal Joins: §f${globalStats.totalJoins || 0}`);
  player.sendMessage(`§eTotal Deaths: §f${globalStats.totalDeaths || 0}`);
  player.sendMessage(`§eTotal Messages: §f${globalStats.totalMessages || 0}`);
  player.sendMessage(`§eTotal Achievements: §f${globalStats.totalAchievements || 0}`);
}

function testWebhooks(player, specific) {
  if (!player.hasTag(WHConfig.permissions.tags.admin)) {
    player.sendMessage("§cAdmin only!");
    return;
  }

  player.sendMessage("§aTesting webhooks...");

  const webhooks = specific
    ? { [specific]: WHConfig.webhooks[specific] }
    : WHConfig.webhooks;

  let tested = 0;

  for (const [name, url] of Object.entries(webhooks)) {
    if (url && webhookManager.validateWebhookUrl(url)) {
      sendWebhook(name, {
        embeds: [{
          title: "🧪 Webhook Test",
          description: `Testing **${name}** webhook`,
          color: WHHelpers.getColor("success"),
          fields: [
            {
              name: "Triggered By",
              value: player.name,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      }, true);
      tested++;
    }
  }

  player.sendMessage(`§a${tested} webhook(s) tested!`);
}

function clearCache(player) {
  if (!player.hasTag(WHConfig.permissions.tags.admin)) {
    player.sendMessage("§cAdmin only!");
    return;
  }

  const before = {
    messages: state.recentMessages.size,
    spam: state.spamTracking.size
  };

  state.recentMessages.clear();
  state.spamTracking.clear();

  player.sendMessage("§aCaches cleared!");
  player.sendMessage(`§eMessages: ${before.messages} -> 0`);
  player.sendMessage(`§eSpam tracking: ${before.spam} -> 0`);
}

function countActiveFeatures() {
  let count = 0;

  function countObject(obj) {
    for (const value of Object.values(obj)) {
      if (value === true) count++;
      else if (typeof value === "object" && !Array.isArray(value)) countObject(value);
    }
  }

  countObject(WHConfig.features);
  return count;
}

// ================== BACKGROUND TASKS (UPGRADED) ==================
function startBackgroundTasks() {
  // Message queue processor
  system.runInterval(() => {
    processMessageQueue();
  }, Math.floor(WHConfig.advanced.performance.messageQueueDelay / 50));

  // Retry queue processor (NEW)
  system.runInterval(() => {
    webhookManager.processRetryQueue();
  }, 20); // Every second

  // AFK detection
  if (WHHelpers.isEnabled("players.afkDetection")) {
    system.runInterval(() => {
      checkAFKPlayers();
    }, 200); // Every 10 seconds
  }

  // Webhook health checks (NEW)
  system.runInterval(() => {
    performWebhookHealthCheck();
  }, 6000); // Every 5 minutes

  // Analytics
  if (WHHelpers.isEnabled("analytics.enabled")) {
    system.runInterval(() => {
      generateAnalytics();
    }, Math.floor(WHConfig.advanced.intervals.analytics / 50));
  }

  // Cleanup
  system.runInterval(() => {
    performCleanup();
  }, Math.floor(WHConfig.advanced.intervals.cleanup / 50));

  // Heartbeat
  system.runInterval(() => {
    plugin.lastHeartbeat = Date.now();
  }, Math.floor(WHConfig.advanced.intervals.heartbeat / 50));
}

function checkAFKPlayers() {
  const now = Date.now();
  const afkThreshold = WHConfig.features.players.afkTimeout;

  for (const [playerId, session] of state.playerSessions) {
    const player = world.getAllPlayers().find(p => p.id === playerId);
    if (!player) continue;

    const isAFK = state.afkPlayers.has(playerId);
    const timeSinceActivity = now - session.lastActivity;

    if (!isAFK && timeSinceActivity > afkThreshold) {
      // Player went AFK
      state.afkPlayers.set(playerId, now);

      sendWebhook("playerEvents", {
        embeds: [{
          author: {
            name: WHHelpers.formatMessage(WHConfig.messages.player.afkStart, { player: player.name }),
            icon_url: getPlayerAvatar(player.name)
          },
          color: WHHelpers.getColor("info"),
          timestamp: new Date().toISOString()
        }]
      });
    } else if (isAFK && timeSinceActivity < 5000) {
      // Player returned
      state.afkPlayers.delete(playerId);

      sendWebhook("playerEvents", {
        embeds: [{
          author: {
            name: WHHelpers.formatMessage(WHConfig.messages.player.afkEnd, { player: player.name }),
            icon_url: getPlayerAvatar(player.name)
          },
          color: WHHelpers.getColor("info"),
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
}

function generateAnalytics() {
  if (!WHHelpers.isEnabled("analytics.hourlyReports")) return;

  const stats = db.stats.get("global") || {};
  const players = world.getAllPlayers();

  const report = {
    title: "📊 Hourly Analytics Report",
    color: WHHelpers.getColor("info"),
    fields: [
      {
        name: "Players Online",
        value: players.length.toString(),
        inline: true
      },
      {
        name: "Total Joins",
        value: (stats.totalJoins || 0).toString(),
        inline: true
      },
      {
        name: "Total Deaths",
        value: (stats.totalDeaths || 0).toString(),
        inline: true
      },
      {
        name: "Messages Sent",
        value: (stats.totalMessages || 0).toString(),
        inline: true
      },
      {
        name: "Commands Used",
        value: (stats.totalCommands || 0).toString(),
        inline: true
      },
      {
        name: "Achievements",
        value: (stats.totalAchievements || 0).toString(),
        inline: true
      },
      {
        name: "Uptime",
        value: formatDuration(Date.now() - plugin.startTime),
        inline: true
      }
    ],
    thumbnail: { url: WHConfig.appearance.serverIcon },
    timestamp: new Date().toISOString()
  };

  // Add boss kills if any
  if (Object.keys(stats.bossKills || {}).length > 0) {
    const bossKillsText = Object.entries(stats.bossKills)
      .map(([boss, count]) => `${boss.replace(/_/g, " ")}: ${count}`)
      .join("\n");

    report.fields.push({
      name: "Boss Kills",
      value: bossKillsText,
      inline: false
    });
  }

  sendWebhook("analytics", { embeds: [report] });
}

function performCleanup() {
  const now = Date.now();

  // Clean old cache entries
  for (const [key, time] of state.recentMessages) {
    if (now - time > WHConfig.advanced.performance.cacheTTL) {
      state.recentMessages.delete(key);
    }
  }

  // Clean spam tracking
  for (const [playerId, tracking] of state.spamTracking) {
    tracking.messages = tracking.messages.filter(time => now - time < 60000);
    if (tracking.messages.length === 0 && tracking.warnings === 0) {
      state.spamTracking.delete(playerId);
    }
  }

  // Limit cache size
  if (state.recentMessages.size > WHConfig.advanced.performance.cacheSize) {
    const sorted = Array.from(state.recentMessages.entries())
      .sort((a, b) => a[1] - b[1]);
    const toRemove = sorted.slice(0, sorted.length - WHConfig.advanced.performance.cacheSize);
    toRemove.forEach(([key]) => state.recentMessages.delete(key));
  }
}

// ================== SYSTEM HANDLERS ==================
function setupSystemHandlers() {
  // Shutdown handler
  system.beforeEvents.shutdown?.subscribe(() => {
    if (WHHelpers.isEnabled("server.startStop")) {
      sendWebhook("serverEvents", {
        embeds: [{
          title: WHHelpers.formatMessage(WHConfig.messages.server.stop, {
            serverName: WHConfig.appearance.serverName
          }),
          color: WHHelpers.getColor("error"),
          fields: [
            {
              name: "Uptime",
              value: formatDuration(Date.now() - plugin.startTime),
              inline: true
            },
            {
              name: "Queue Size at Shutdown",
              value: plugin.messageQueue.length.toString(),
              inline: true
            }
          ],
          thumbnail: { url: WHConfig.appearance.serverIcon },
          timestamp: new Date().toISOString()
        }]
      }, true);
    }
  });

  // Track player activity for AFK detection
  if (WHHelpers.isEnabled("players.afkDetection")) {
    // Movement
    world.afterEvents.playerMove?.subscribe((event) => {
      const session = state.playerSessions.get(event.player.id);
      if (session) session.lastActivity = Date.now();
    });

    // Block interactions
    world.afterEvents.playerBreakBlock?.subscribe((event) => {
      const session = state.playerSessions.get(event.player.id);
      if (session) session.lastActivity = Date.now();
    });

    world.afterEvents.playerPlaceBlock?.subscribe((event) => {
      const session = state.playerSessions.get(event.player.id);
      if (session) session.lastActivity = Date.now();
    });

    // Chat activity
    world.afterEvents.chatSend?.subscribe((event) => {
      const session = state.playerSessions.get(event.sender.id);
      if (session) session.lastActivity = Date.now();
    });
  }

  // Dimension change tracking
  if (WHHelpers.isEnabled("moderation.teleports")) {
    world.afterEvents.playerDimensionChange?.subscribe((event) => {
      sendWebhook("teleportLogs", {
        embeds: [{
          author: {
            name: `${event.player.name} changed dimension`,
            icon_url: getPlayerAvatar(event.player.name)
          },
          description: `${WHConfig.appearance.formatting.emojis.teleport} Dimension change`,
          color: WHHelpers.getColor("info"),
          fields: [
            {
              name: "From",
              value: event.fromDimension.id.replace("minecraft:", ""),
              inline: true
            },
            {
              name: "To",
              value: event.toDimension.id.replace("minecraft:", ""),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    });
  }

  // Weather tracking
  if (WHHelpers.isEnabled("world.weatherChanges")) {
    let lastWeather = "clear";

    system.runInterval(() => {
      try {
        const overworld = world.getDimension("overworld");
        const weather = overworld.weather || "clear";

        if (weather !== lastWeather) {
          sendWebhook("weatherEvents", {
            embeds: [{
              title: "Weather Changed",
              description: `Weather is now **${weather}**`,
              color: WHHelpers.getColor("info"),
              timestamp: new Date().toISOString()
            }]
          });

          lastWeather = weather;
        }
      } catch (error) {
        // Weather API not available
      }
    }, 2400); // Check every 2 minutes
  }
}

// ================== INITIALIZATION ==================
// Initialize based on environment
if (bridgeAvailable && bridge?.events?.bridgeInitialize) {
  bridge.events.bridgeInitialize.subscribe((event) => {
    try {
      console.info("[Webhook] Initializing with BedrockBridge v3.0.0...");

      if (event.registerAddition) {
        event.registerAddition("discord_direct");
      }

      system.run(() => initialize());
    } catch (error) {
      console.error(`[Webhook] Bridge initialization error: ${error}`);
      system.run(() => initialize());
    }
  });
} else {
  console.warn("[Webhook] BedrockBridge not available, initializing standalone v3.0.0...");
  system.run(() => initialize());
}

// ================== DEBUG INTERFACE ==================
// Export for console debugging
globalThis.WebhookPlugin = {
  version: "3.0.0",
  status: () => ({
    initialized: plugin.initialized,
    mode: bridgeAvailable ? "BedrockBridge" : "Standalone",
    uptime: formatDuration(Date.now() - plugin.startTime),
    queueSize: plugin.messageQueue.length,
    retryQueueSize: webhookManager.retryQueue.length,
    sessions: state.playerSessions.size,
    webhooksConfigured: Object.values(WHConfig.webhooks).filter(w => w).length,
    featuresActive: countActiveFeatures()
  }),

  webhookStats: () => {
    const stats = {};
    for (const [url, data] of webhookManager.webhookStats) {
      stats[url] = {
        ...data,
        successRate: webhookManager.getSuccessRate(url),
        circuitState: webhookManager.getCircuitBreakerState(url)
      };
    }
    return stats;
  },

  config: WHConfig,

  testWebhook: (type = "general") => {
    sendWebhook(type, {
      embeds: [{
        title: "🧪 Manual Test",
        description: `Testing ${type} webhook via console`,
        color: WHHelpers.getColor("success"),
        timestamp: new Date().toISOString()
      }]
    }, true);
  },

  getStats: (playerName) => {
    const player = world.getAllPlayers().find(p => p.name === playerName);
    if (!player) return "Player not found";
    return db.players.get(player.id) || {};
  },

  clearCache: () => {
    state.recentMessages.clear();
    state.spamTracking.clear();
    return "Caches cleared";
  },

  webhookManager: webhookManager,

  reload: () => {
    return "Configuration reload requires server restart";
  }
};

// Initial log
console.info("[Webhook] BedrockBridge Webhook Plugin v3.0.0 loaded");
console.info("[Webhook] Features: Error Handling, Ratelimit Management, Achievements, Analytics, Health Checks");
console.info("[Webhook] Edit whconfig.js to configure webhooks and features");
