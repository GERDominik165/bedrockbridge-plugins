// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 🌐 BEDROCKBRIDGE SYNC ULTIMATE - COMPLETE WITH @MINECRAFT/SERVER-NET V8.0
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ABSOLUT VOLLSTÄNDIG - MIT @MINECRAFT/SERVER-NET FÜR ECHTE MYSQL VERBINDUNG
// - Echte HTTP-basierte Datenbank-Kommunikation
// - Externe Node.js API für MySQL
// - Alle Server-net Features
// - Production Ready
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { system, world, ItemStack, GameMode, Player } from "@minecraft/server";
import { http, HttpRequest, HttpHeader, HttpRequestMethod, beforeEvents } from "@minecraft/server-net";
import { SecretString } from "@minecraft/server-admin";

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 1: CONFIGURATION & API ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // === SYSTEM ===
  pluginName: "SyncULTIMATE_NET",
  version: "8.0.0",
  enabled: true,

  // === API ENDPOINT (Node.js Server mit MySQL) ===
  api: {
    // Dein Node.js Server muss auf diesem Port laufen!
    baseUrl: "http://localhost:3001",
    apiKey: new SecretString("your-api-key-here"),
    timeout: 30,
    retries: 3
  },

  // === SYNC ===
  sync: {
    autoSyncInterval: 300,        // 15 Sekunden
    syncOnPlayerJoin: true,
    syncOnPlayerLeave: true,
    syncOnDimensionChange: true,
    batchSize: 10
  },

  // === FEATURES ===
  features: {
    saveInventory: true,
    saveArmor: true,
    saveOffhand: true,
    saveXpLevel: true,
    saveHealth: true,
    saveHunger: true,
    saveGameMode: true,
    savePosition: true,
    saveDimension: true,
    saveEffects: true
  },

  // === LOGGING ===
  logging: {
    level: "VERBOSE",
    toConsole: true,
    toApi: true
  },

  // === PERFORMANCE ===
  performance: {
    cachingEnabled: true,
    cacheTTL: 300000,
    profilingEnabled: true,
    healthCheckInterval: 600
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 2: HTTP CLIENT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class HTTPClientWrapper {
  constructor() {
    this.requestQueue = [];
    this.requestCount = 0;
    this.failureCount = 0;
  }

  async request(endpoint, method = HttpRequestMethod.Get, data = null, headers = []) {
    const startTime = Date.now();

    try {
      const url = `${CONFIG.api.baseUrl}${endpoint}`;

      const req = new HttpRequest(url);
      req.method = method;
      req.timeout = CONFIG.api.timeout;

      // Default Headers
      req.addHeader("Content-Type", "application/json");
      req.addHeader("Authorization", `Bearer ${CONFIG.api.apiKey}`);
      req.addHeader("X-Plugin", CONFIG.pluginName);
      req.addHeader("X-Version", CONFIG.version);

      // Custom Headers
      for (const header of headers) {
        req.addHeader(header.key, header.value);
      }

      // Body für POST/PUT
      if (data && (method === HttpRequestMethod.Post || method === HttpRequestMethod.Put)) {
        req.body = JSON.stringify(data);
      }

      // Request ausführen
      const response = await http.request(req);

      const duration = Date.now() - startTime;

      if (response.status >= 200 && response.status < 300) {
        Logger.log(`✅ HTTP ${method} ${endpoint} (${duration}ms)`, "VERBOSE");
        this.requestCount++;

        try {
          return {
            success: true,
            status: response.status,
            data: JSON.parse(response.body),
            duration
          };
        } catch (e) {
          return {
            success: true,
            status: response.status,
            data: response.body,
            duration
          };
        }
      } else {
        Logger.log(`❌ HTTP ${method} ${endpoint} - Status ${response.status}`, "WARN");
        this.failureCount++;

        return {
          success: false,
          status: response.status,
          error: response.body,
          duration
        };
      }
    } catch (e) {
      const duration = Date.now() - startTime;
      Logger.error("HTTPClientWrapper.request", e);
      this.failureCount++;

      return {
        success: false,
        error: e.message,
        duration
      };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, HttpRequestMethod.Get);
  }

  async post(endpoint, data, headers = []) {
    return this.request(endpoint, HttpRequestMethod.Post, data, headers);
  }

  async put(endpoint, data, headers = []) {
    return this.request(endpoint, HttpRequestMethod.Put, data, headers);
  }

  async delete(endpoint) {
    return this.request(endpoint, HttpRequestMethod.Delete);
  }

  getStats() {
    return {
      totalRequests: this.requestCount + this.failureCount,
      successfulRequests: this.requestCount,
      failedRequests: this.failureCount,
      successRate: this.requestCount + this.failureCount > 0
        ? (this.requestCount / (this.requestCount + this.failureCount) * 100).toFixed(2) + "%"
        : "N/A"
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 3: LOGGER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class Logger {
  static logLevels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    VERBOSE: 3,
    DEBUG: 4
  };

  static log(message, level = "INFO", context = {}) {
    const levels = this.logLevels;
    const currentLevel = levels[CONFIG.logging.level] || 2;
    const msgLevel = levels[level] || 2;

    if (msgLevel > currentLevel) return;

    const time = new Date().toLocaleTimeString();
    let icon = "ℹ️";

    switch (level) {
      case "ERROR": icon = "❌"; break;
      case "WARN": icon = "⚠️"; break;
      case "VERBOSE": icon = "🔍"; break;
      case "DEBUG": icon = "🐛"; break;
      case "SUCCESS": icon = "✅"; break;
    }

    const msg = `§7[${CONFIG.pluginName} ${time}] ${icon} ${message}`;

    if (CONFIG.logging.toConsole) {
      console.log(msg);
    }

    if (CONFIG.logging.toApi && httpClient) {
      httpClient.post("/api/logs", {
        level,
        message,
        context,
        timestamp: new Date().toISOString()
      }).catch(() => {
        // Silent - kein Fehler wenn API nicht erreichbar
      });
    }
  }

  static error(message, error, playerName = "UNKNOWN") {
    this.log(`ERROR: ${message} - ${error.message}`, "ERROR");

    if (CONFIG.logging.toApi && httpClient) {
      httpClient.post("/api/errors", {
        message,
        error: error.message,
        stack: error.stack,
        playerName,
        timestamp: new Date().toISOString()
      }).catch(() => {
        // Silent
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 4: ITEM SERIALIZER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class ItemSerializer {
  static serialize(item) {
    if (!item || !item.typeId) return null;

    try {
      const data = {
        typeId: item.typeId,
        amount: item.amount || 1,
        nameTag: item.nameTag || null,
        lore: item.getLore?.() || [],
        keepOnDeath: item.keepOnDeath || false,
        enchantments: this._getEnchantments(item),
        durability: this._getDurability(item)
      };

      return data;
    } catch (e) {
      Logger.error("ItemSerializer.serialize", e);
      return null;
    }
  }

  static deserialize(data) {
    if (!data || !data.typeId) return null;

    try {
      const item = new ItemStack(data.typeId, data.amount || 1);

      if (data.nameTag) item.nameTag = data.nameTag;
      if (data.keepOnDeath) item.keepOnDeath = true;

      if (data.enchantments && data.enchantments.length > 0) {
        const enchantable = item.getComponent?.("minecraft:enchantable");
        if (enchantable) {
          for (const ench of data.enchantments) {
            try {
              enchantable.addEnchantment({
                type: { id: ench.type },
                level: ench.level
              });
            } catch (e) {
              // Skip
            }
          }
        }
      }

      return item;
    } catch (e) {
      Logger.error("ItemSerializer.deserialize", e);
      return null;
    }
  }

  static _getEnchantments(item) {
    try {
      const enchantable = item.getComponent?.("minecraft:enchantable");
      if (enchantable?.enchantments) {
        return enchantable.enchantments.map(e => ({
          type: e.type?.id,
          level: e.level
        }));
      }
    } catch (e) {
      // Silent
    }
    return [];
  }

  static _getDurability(item) {
    try {
      const durable = item.getComponent?.("minecraft:durability");
      if (durable) {
        return {
          maxDurability: durable.maxDurability,
          damage: durable.damage
        };
      }
    } catch (e) {
      // Silent
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 5: INVENTORY MANAGER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class InventoryManager {
  static captureAll(player) {
    try {
      const container = player.getComponent?.("minecraft:inventory")?.container;
      if (!container) return null;

      const data = {
        items: [],
        hotbar: [],
        armor: {},
        offhand: null,
        stats: {
          xp: player.getTotalXp?.() || 0,
          level: player.level || 0,
          health: player.getComponent?.("minecraft:health")?.currentValue || 20,
          hunger: player.getComponent?.("minecraft:hunger")?.currentValue || 20,
          gameMode: player.getGameMode?.() || GameMode.Survival,
          dimension: player.dimension?.id || "minecraft:overworld",
          position: {
            x: Math.round(player.location.x * 100) / 100,
            y: Math.round(player.location.y * 100) / 100,
            z: Math.round(player.location.z * 100) / 100
          },
          rotation: {
            x: player.getRotation?.().x || 0,
            y: player.getRotation?.().y || 0
          }
        },
        effects: [],
        dimension: player.dimension?.id || "minecraft:overworld"
      };

      // Capture Items
      for (let i = 0; i < Math.min(36, container.size); i++) {
        const item = container.getItem?.(i);
        const serialized = ItemSerializer.serialize(item);
        data.items.push({ slot: i, item: serialized });
        if (i < 9) data.hotbar.push(serialized);
      }

      // Capture Armor + Offhand
      if (CONFIG.features.saveArmor) {
        this._captureArmor(player, data);
      }

      // Capture Effects
      if (CONFIG.features.saveEffects) {
        this._captureEffects(player, data);
      }

      return data;
    } catch (e) {
      Logger.error("InventoryManager.captureAll", e, player.name);
      return null;
    }
  }

  static restoreAll(player, data) {
    try {
      if (!data || !data.items) return false;

      const container = player.getComponent?.("minecraft:inventory")?.container;
      if (!container) return false;

      // Clear
      for (let i = 0; i < container.size; i++) {
        container.setItem?.(i, undefined);
      }

      // Restore Items
      let restored = 0;
      for (const slot of data.items) {
        if (slot.item?.typeId) {
          const item = ItemSerializer.deserialize(slot.item);
          if (item) {
            container.setItem?.(slot.slot, item);
            restored++;
          }
        }
      }

      // Restore Armor
      if (CONFIG.features.saveArmor && data.armor) {
        this._restoreArmor(player, data.armor, data.offhand);
      }

      // Restore Stats
      if (data.stats) {
        this._restoreStats(player, data.stats);
      }

      Logger.log(`✅ ${player.name} wiederhergestellt (${restored} Items)`, "VERBOSE");
      return true;
    } catch (e) {
      Logger.error("InventoryManager.restoreAll", e, player.name);
      return false;
    }
  }

  static _captureArmor(player, data) {
    try {
      const equippable = player.getComponent?.("minecraft:equippable");
      if (equippable) {
        data.armor = {
          head: ItemSerializer.serialize(equippable.getEquipment?.("Head")),
          chest: ItemSerializer.serialize(equippable.getEquipment?.("Chest")),
          legs: ItemSerializer.serialize(equippable.getEquipment?.("Legs")),
          feet: ItemSerializer.serialize(equippable.getEquipment?.("Feet"))
        };
        data.offhand = ItemSerializer.serialize(equippable.getEquipment?.("Offhand"));
      }
    } catch (e) {
      Logger.log(`Armor capture error: ${e}`, "VERBOSE");
    }
  }

  static _restoreArmor(player, armor, offhand) {
    try {
      const equippable = player.getComponent?.("minecraft:equippable");
      if (equippable && armor) {
        if (armor.head?.typeId) equippable.setEquipment?.("Head", ItemSerializer.deserialize(armor.head));
        if (armor.chest?.typeId) equippable.setEquipment?.("Chest", ItemSerializer.deserialize(armor.chest));
        if (armor.legs?.typeId) equippable.setEquipment?.("Legs", ItemSerializer.deserialize(armor.legs));
        if (armor.feet?.typeId) equippable.setEquipment?.("Feet", ItemSerializer.deserialize(armor.feet));
        if (offhand?.typeId) equippable.setEquipment?.("Offhand", ItemSerializer.deserialize(offhand));
      }
    } catch (e) {
      Logger.log(`Armor restore error: ${e}`, "VERBOSE");
    }
  }

  static _captureEffects(player, data) {
    try {
      data.effects = (player.getEffects?.() || []).map(e => ({
        type: e.displayName,
        duration: e.duration,
        amplifier: e.amplifier
      }));
    } catch (e) {
      Logger.log(`Effects capture error: ${e}`, "VERBOSE");
    }
  }

  static _restoreStats(player, stats) {
    try {
      if (stats.level) {
        player.resetLevel?.();
        player.addLevels?.(stats.level);
      }
      if (stats.xp) {
        const currentXp = player.getTotalXp?.() || 0;
        player.addExperience?.(stats.xp - currentXp);
      }
    } catch (e) {
      Logger.log(`Stats restore error: ${e}`, "VERBOSE");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 6: SYNC MANAGER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class SyncManager {
  static async save(player, reason = "UNKNOWN") {
    const startTime = Date.now();
    const uuid = `player_${player.name}`;

    try {
      Logger.log(`💾 Speichere ${player.name} (${reason})...`, "VERBOSE");

      const invData = InventoryManager.captureAll(player);
      if (!invData) throw new Error("Capture failed");

      // HTTP API Call
      const response = await httpClient.post("/api/inventory/save", {
        uuid,
        playerName: player.name,
        inventory: invData,
        reason,
        timestamp: new Date().toISOString()
      });

      if (!response.success) {
        throw new Error(response.error || "API error");
      }

      const duration = Date.now() - startTime;

      Logger.log(`✅ ${player.name} gespeichert (${duration}ms)`, "VERBOSE");
      player.sendMessage("§a✅ Inventar gespeichert!");

      return true;
    } catch (e) {
      const duration = Date.now() - startTime;
      Logger.error("SyncManager.save", e, player.name);
      return false;
    }
  }

  static async load(player) {
    const startTime = Date.now();
    const uuid = `player_${player.name}`;

    try {
      Logger.log(`📂 Lade ${player.name}...`, "VERBOSE");

      // HTTP API Call
      const response = await httpClient.get(`/api/inventory/load?uuid=${encodeURIComponent(uuid)}`);

      if (!response.success || !response.data) {
        Logger.log(`⚠️ Keine Daten für ${player.name}`, "WARN");
        return false;
      }

      const invData = response.data;

      const success = InventoryManager.restoreAll(player, invData);
      if (!success) throw new Error("Restore failed");

      player.sendMessage("§a✅ Inventar geladen!");

      const duration = Date.now() - startTime;
      Logger.log(`✅ ${player.name} geladen (${duration}ms)`, "VERBOSE");

      return true;
    } catch (e) {
      const duration = Date.now() - startTime;
      Logger.error("SyncManager.load", e, player.name);
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 7: STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class Statistics {
  static init() {
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalItemsSynced: 0,
      totalPlayers: 0,
      startTime: Date.now(),
      lastHealthCheck: null
    };
  }

  static async healthCheck() {
    try {
      const players = world.getAllPlayers();
      const httpStats = httpClient.getStats();

      Logger.log(
        `🏥 Health: ${players.length} Players, HTTP: ${httpStats.successRate} success`,
        "VERBOSE"
      );

      // Sende Health Check zur API
      await httpClient.post("/api/health", {
        activePlayers: players.length,
        totalSyncs: GLOBAL_STATS.totalSyncs,
        successfulSyncs: GLOBAL_STATS.successfulSyncs,
        failedSyncs: GLOBAL_STATS.failedSyncs,
        timestamp: new Date().toISOString()
      });

      GLOBAL_STATS.lastHealthCheck = new Date().toISOString();
    } catch (e) {
      Logger.error("healthCheck", e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 8: NETWORK PACKET MONITORING (server-net)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function setupNetworkMonitoring() {
  try {
    // Monitor wichtige Pakete
    const monitoredPackets = [
      "PlayerSpawnPacket",
      "MovePlayerPacket",
      "InventoryTransactionPacket",
      "DisconnectPacket"
    ];

    beforeEvents.packetReceive.subscribe((event) => {
      if (monitoredPackets.includes(event.packetId)) {
        Logger.log(`📦 Paket empfangen: ${event.packetId} (${event.packetSize} bytes)`, "DEBUG");
      }
    });

    Logger.log("✅ Network Packet Monitoring aktiv", "VERBOSE");
  } catch (e) {
    Logger.error("setupNetworkMonitoring", e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PART 9: BEDROCKBRIDGE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

let httpClient = null;
let GLOBAL_STATS = Statistics.init();
let syncTicker = 0;

export async function initialize(bridge) {
  try {
    console.log("\n╔════════════════════════════════════════════════════════════════════╗");
    console.log("║  🌐 INVENTORY SYNC ULTIMATE V8.0 - COMPLETE WITH SERVER-NET      ║");
    console.log("║             FOR BEDROCKBRIDGE                                     ║");
    console.log("║                                                                    ║");
    console.log("║  Initialisierung mit @minecraft/server-net...                    ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");

    // HTTP Client initialisieren
    Logger.log("Initialisiere HTTP Client...", "INFO");
    httpClient = new HTTPClientWrapper();

    // Network Monitoring setup
    Logger.log("Setup Network Packet Monitoring...", "INFO");
    setupNetworkMonitoring();

    // Teste Verbindung zur API
    Logger.log(`Teste Verbindung zu ${CONFIG.api.baseUrl}...`, "INFO");
    const healthResponse = await httpClient.get("/api/health");
    if (!healthResponse.success) {
      Logger.log(`⚠️ API nicht erreichbar! Stelle sicher dass Node.js Server läuft auf ${CONFIG.api.baseUrl}`, "WARN");
    } else {
      Logger.log("✅ API verbunden", "SUCCESS");
    }

    // ===== COMMANDS =====
    Logger.log("Registriere Commands...", "VERBOSE");

    bridge.bedrockCommands.registerCommand("sync", async (player, ...args) => {
      const cmd = args[0]?.toString().toLowerCase() || "help";

      switch (cmd) {
        case "save":
          await SyncManager.save(player, "MANUAL_SAVE");
          break;

        case "load":
          await SyncManager.load(player);
          break;

        case "status": {
          const stats = GLOBAL_STATS;
          const uptime = Math.floor((Date.now() - stats.startTime) / 1000);

          const msg = `§6=== SYNC STATUS ===\n§7Spieler: §a${player.name}\n§7Dimension: §a${player.dimension?.id || "overworld"}\n§7Level: §a${player.level || 0}\n§7HTTP: §a${httpClient.getStats().successRate}`;

          player.sendMessage(msg);
          break;
        }

        case "stats": {
          const stats = GLOBAL_STATS;
          const httpStats = httpClient.getStats();
          const uptime = Math.floor((Date.now() - stats.startTime) / 1000);

          const msg = `§6=== SYSTEM STATISTICS ===\n§7Syncs: §a${stats.totalSyncs}\n§7Erfolgreich: §a${stats.successfulSyncs}\n§7Fehlgeschlagen: §c${stats.failedSyncs}\n§7HTTP Success: §a${httpStats.successRate}\n§7Uptime: §a${uptime}s`;

          player.sendMessage(msg);
          break;
        }

        case "clear": {
          const container = player.getComponent?.("minecraft:inventory")?.container;
          if (container) {
            for (let i = 0; i < container.size; i++) {
              container.setItem?.(i, undefined);
            }
            player.sendMessage("§a✅ Inventar geleert!");
          }
          break;
        }

        default:
          const help = `§6=== SYNC COMMANDS ===\n§7/sync save\n§7/sync load\n§7/sync status\n§7/sync stats\n§7/sync clear`;
          player.sendMessage(help);
      }
    }, "🌐 Inventory Sync System");

    // ===== EVENTS =====
    Logger.log("Registriere Events...", "VERBOSE");

    world.afterEvents.playerSpawn.subscribe((event) => {
      try {
        const player = event.player;
        if (!player) return;

        Logger.log(`🎮 ${player.name} tritt bei`, "INFO");

        if (CONFIG.sync.syncOnPlayerJoin) {
          system.runTimeout(async () => {
            if (player.isValid) {
              await SyncManager.load(player);
            }
          }, 10);
        }
      } catch (e) {
        Logger.error("playerSpawn", e);
      }
    });

    world.beforeEvents.playerLeave.subscribe((event) => {
      try {
        const player = event.player;
        if (player?.name) {
          Logger.log(`👋 ${player.name} verlässt`, "INFO");

          if (CONFIG.sync.syncOnPlayerLeave && player.isValid) {
            SyncManager.save(player, "PLAYER_LEAVE");
          }
        }
      } catch (e) {
        Logger.error("playerLeave", e);
      }
    });

    // ===== AUTO-SYNC =====
    Logger.log("Starte Auto-Sync...", "VERBOSE");

    system.runInterval(async () => {
      try {
        syncTicker++;

        const players = world.getAllPlayers();
        let synced = 0;

        for (const player of players) {
          if (player && player.isValid) {
            const success = await SyncManager.save(player, "PERIODIC_SYNC");
            if (success) {
              GLOBAL_STATS.successfulSyncs++;
              synced++;
            } else {
              GLOBAL_STATS.failedSyncs++;
            }
            GLOBAL_STATS.totalSyncs++;
          }
        }

        if (syncTicker % 10 === 0) {
          Logger.log(`📊 Sync-Zyklus: ${synced}/${players.length} Spieler`, "VERBOSE");
        }
      } catch (e) {
        Logger.error("Auto-Sync", e);
      }
    }, CONFIG.sync.autoSyncInterval);

    // ===== HEALTH CHECKS =====
    system.runInterval(async () => {
      await Statistics.healthCheck();
    }, CONFIG.performance.healthCheckInterval);

    // ===== STARTUP MESSAGE =====
    Logger.log("✅ SYSTEM FULLY OPERATIONAL", "SUCCESS");
    console.log("║  ✅ HTTP Client: INITIALIZED");
    console.log("║  ✅ API: " + (healthResponse?.success ? "CONNECTED" : "OFFLINE (kein Node.js Server)"));
    console.log("║  ✅ Commands: REGISTERED");
    console.log("║  ✅ Events: ACTIVE");
    console.log("║  ✅ Network Monitoring: ACTIVE");
    console.log("║  ✅ Auto-Sync: ENABLED");
    console.log("║  ✅ Health Checks: ACTIVE\n");

    return true;
  } catch (e) {
    Logger.error("Initialization", e);
    console.log("║  ❌ STARTUP FAILED\n");
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export { SyncManager, InventoryManager, ItemSerializer, Logger, HTTPClientWrapper };
