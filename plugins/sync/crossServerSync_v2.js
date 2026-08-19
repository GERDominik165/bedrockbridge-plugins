// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 🌐 CROSS-SERVER SYNC v2.0 - AUTOMATIC WORLD SYNCHRONIZATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PROFESSIONELLES AUTOMATISCHES SYNC-SYSTEM FÜR MEHRERE BEDROCK SERVER WELTEN
//
// Features:
// • Automatische Inventar-Synchronisation
// • Automatische XP/Level-Synchronisation
// • Inter-Plugin Communication zwischen Servern
// • Welt-Verbindungs-Management
// • Spieler-Tracking & Auto-Sync
// • Discord Notifications
// • Admin-Panel zur Welt-Verwaltung
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { system, world, ItemStack, Container, Player } from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect, database } from "../addons";
import { http } from "@minecraft/server-net"; // ✨ NETZWERK FÜR EXTERNE DATENBANK

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// KONSTANTEN & KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PLUGIN_VERSION = "2.0.0";
const PLUGIN_NAME = "CrossServerSyncV2";
const SYNC_CHANNEL = "crossserver_sync_channel"; // Für Inter-Plugin Communication

// Welt-Konfiguration (wird vom Admin konfiguriert)
const DEFAULT_WORLDS = {
  world1: {
    id: "world1",
    name: "Hauptwelt",
    icon: "🏠",
    enabled: true,
    autoSync: true,
    discord_webhook: "", // Optional für externe Server
    connected_to: [] // Array von World-IDs die verbunden sind
  },
  world2: {
    id: "world2",
    name: "Farmingwelt",
    icon: "🌾",
    enabled: true,
    autoSync: true,
    discord_webhook: "",
    connected_to: ["world1"]
  }
};

// Standard-Konfiguration
const DEFAULT_CONFIG = {
  enabled: true,
  autoSyncEnabled: true,
  autoSyncInterval: 60, // Sekunden - wie oft Daten synchronisiert werden
  syncOnLogin: true, // Sofort synchen wenn Spieler eintritt
  syncOnLogout: true, // Beim Ausloggen synchen
  syncInventory: true,
  syncXP: true,
  syncHealth: false, // Optional
  discordLogging: true,
  worldConnections: DEFAULT_WORLDS, // Welten-Verbindungen

  // ✨ NEUE NETZWERK-KONFIGURATION FÜR EXTERNE DATENBANK
  externalDatabaseEnabled: true,
  externalDatabaseUrl: "http://localhost:3000/api", // Externe DB-API
  externalDatabaseRetries: 3,
  externalDatabaseTimeout: 5000 // ms
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DATENSPEICHER & KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const config = { ...DEFAULT_CONFIG };

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DATENBANK-LAYER MIT LAZY-LOADING (DATA PERSISTENCE)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// Lazy-Loading Datenbanken - werden erst erstellt, wenn benötigt
let worldSyncDb, playerSyncDb, inventoryDb, xpDb, syncLogsDb, connectionDb;
let ipcMessagesDb, ipcAcknowledgementDb, syncStateDb, syncConflictDb, worldStateDb, playerSessionDb, ipcHeartbeatDb;

// Funktion zum Initialisieren aller Datenbanken (wird sicher aufgerufen)
function initializeDatabases() {
  try {
    if (!database) {
      console.error("[CrossServerSyncV2] ❌ Database module nicht verfügbar!");
      return false;
    }

    // Haupt-Datenbanken
    worldSyncDb = database.makeTable("crossSync_worlds_v2");
    playerSyncDb = database.makeTable("crossSync_players_v2");
    inventoryDb = database.makeTable("crossSync_inventory_v2");
    xpDb = database.makeTable("crossSync_xp_v2");
    syncLogsDb = database.makeTable("crossSync_logs_v2");
    connectionDb = database.makeTable("crossSync_connections_v2");

    // Inter-Plugin Communication Datenbanken
    ipcMessagesDb = database.makeTable("crossSync_ipc_messages");
    ipcAcknowledgementDb = database.makeTable("crossSync_ipc_ack");
    syncStateDb = database.makeTable("crossSync_sync_state");
    syncConflictDb = database.makeTable("crossSync_conflicts");
    worldStateDb = database.makeTable("crossSync_world_state");
    playerSessionDb = database.makeTable("crossSync_sessions");
    ipcHeartbeatDb = database.makeTable("crossSync_heartbeat");

    console.log("[CrossServerSyncV2] ✅ Alle Datenbanken erfolgreich initialisiert");
    return true;
  } catch (e) {
    console.error(`[CrossServerSyncV2] ❌ Fehler beim Initialisieren der Datenbanken: ${e}`);
    return false;
  }
}

// In-Memory Caches für Performance
const activeSyncJobs = new Map();           // Aktuelle Sync-Jobs
const playerLastSync = new Map();           // Letzte Sync-Zeit pro Spieler
const worldConnections = new Map();         // Geladene Welt-Verbindungen
const pendingSyncQueue = new Map();         // Spieler die Synchen müssen
const ipcMessageQueue = new Map();          // Ausstehende IPC-Nachrichten
const playerSyncState = new Map();          // Aktueller Sync-Status pro Spieler
const worldHeartbeat = new Map();           // Letzter Heartbeat pro Welt
const processingMessages = new Set();       // Gerade verarbeitete Messages (Duplikat-Schutz)

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// LOGGING & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function log(message, level = "info") {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `[${PLUGIN_NAME} ${timestamp}]`;

  switch (level) {
    case "error": console.error(`${prefix} ❌ ${message}`); break;
    case "warn": console.warn(`${prefix} ⚠️ ${message}`); break;
    case "success": console.log(`${prefix} ✅ ${message}`); break;
    default: console.log(`${prefix} ℹ️ ${message}`);
  }

  try {
    // Nur in DB speichern wenn verfügbar
    if (syncLogsDb) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        level,
        logId: `log_${Date.now()}_${Math.random()}`
      };
      syncLogsDb.set(logEntry.logId, logEntry);
    }
  } catch (e) {
    console.error(`Log DB error: ${e}`);
  }
}

function sendDiscordEmbed(title, description, color, fields = []) {
  try {
    if (!config.discordLogging || !bridgeDirect) return;
    const embed = {
      title: `🌐 ${title}`,
      description,
      color,
      timestamp: new Date().toISOString(),
      fields
    };
    bridgeDirect.sendRichEmbed(embed, "minecraft:overworld");
  } catch (e) {
    console.warn(`[${PLUGIN_NAME}] Discord error: ${e}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CHECKSUMMEN-HILFSFUNKTION (KOMPATIBEL MIT BEDROCK SCRIPT)
// Erstellt einfache String-Checksummen ohne Buffer-API
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function generateChecksum(data) {
  try {
    // Konvertiere Daten zu JSON-String
    const jsonString = JSON.stringify(data);

    // Einfaches Checksummen-Verfahren kompatibel mit Bedrock Script
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit Integer
    }

    // Konvertiere zu Hex-String (16 Zeichen)
    const hex = Math.abs(hash).toString(16).padStart(16, '0');
    return hex.substring(0, 16);
  } catch (e) {
    // Fallback: Verwende Timestamp + Länge
    return `${Date.now().toString(16).padStart(8, '0')}${jsonString?.length || 0}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NETZWERK-BASIERTE EXTERNE DATENBANK (@minecraft/server-net)
// HTTP-basierte Kommunikation mit externer Datenbank-API
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class NetworkDatabase {
  // Cache für lokale Kopien (Fallback wenn Netzwerk ausfällt)
  static networkCache = new Map(); // playerName -> cachedData
  static lastSyncTime = new Map(); // playerName -> timestamp

  // Speichere Inventar in externe DB via HTTP
  static async saveInventoryToNetwork(playerName, inventoryData, worldId) {
    try {
      if (!config.externalDatabaseEnabled) {
        log(`⚠️ Externe DB deaktiviert - nutze Fallback`, "warn");
        return false;
      }

      const payload = {
        action: "save_inventory",
        playerName,
        worldId,
        data: {
          items: inventoryData.items,
          metadata: {
            itemCount: inventoryData.items?.length || 0,
            savedAt: new Date().toISOString()
          },
          checksum: generateChecksum(inventoryData.items)
        },
        timestamp: Date.now()
      };

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/inventory/save`,
        "POST"
      );
      request.headers = [
        ["Content-Type", "application/json"],
        ["X-Minecraft-Server", PLUGIN_NAME],
        ["Authorization", `Bearer ${this.getAuthToken()}`]
      ];
      request.body = JSON.stringify(payload);

      const response = await http.request(request);

      if (response && response.status >= 200 && response.status < 300) {
        this.networkCache.set(playerName, inventoryData);
        this.lastSyncTime.set(playerName, Date.now());
        log(`✅ Externe DB (HTTP): Inventar gespeichert (${playerName})`, "success");
        return true;
      } else {
        log(`⚠️ Externe DB Fehler (HTTP ${response?.status}): Fallback zur lokalen DB`, "warn");
        return false;
      }
    } catch (e) {
      log(`⚠️ Externe DB Netzwerk-Fehler: ${e} - Fallback zur lokalen DB`, "warn");
      return false;
    }
  }

  // Lade Inventar aus externe DB via HTTP
  static async loadInventoryFromNetwork(playerName) {
    try {
      if (!config.externalDatabaseEnabled) {
        return null;
      }

      // Prüfe zuerst Cache
      if (this.networkCache.has(playerName)) {
        const cachedData = this.networkCache.get(playerName);
        const cacheAge = Date.now() - (this.lastSyncTime.get(playerName) || 0);

        if (cacheAge < 5 * 60 * 1000) { // Cache ist <5 Min alt
          log(`✅ Cache-Hit: Nutze lokale Kopie (${playerName})`, "success");
          return cachedData;
        }
      }

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/inventory/load?playerName=${playerName}`,
        "GET"
      );
      request.headers = [
        ["Content-Type", "application/json"],
        ["X-Minecraft-Server", PLUGIN_NAME],
        ["Authorization", `Bearer ${this.getAuthToken()}`]
      ];

      const response = await http.request(request);

      if (response && response.status === 200) {
        const data = JSON.parse(response.body);

        if (data && data.data) {
          // Validiere Checksumme
          const calculatedChecksum = generateChecksum(data.data.items);
          if (calculatedChecksum !== data.data.checksum) {
            log(`⚠️ Checksummen-Fehler bei ${playerName} - möglicherweise beschädigte Daten`, "warn");
          }

          // Speichere in Cache
          this.networkCache.set(playerName, data.data);
          this.lastSyncTime.set(playerName, Date.now());

          log(`✅ Externe DB (HTTP): Inventar geladen (${playerName})`, "success");
          return data.data;
        }
      } else {
        log(`⚠️ Externe DB Fehler (HTTP ${response?.status})`, "warn");
      }

      return null;
    } catch (e) {
      log(`⚠️ Externe DB Laden-Fehler: ${e}`, "warn");
      return null;
    }
  }

  // Überprüfe ob Inventar kürzlich gespeichert wurde
  static async checkInventoryAlreadyLoaded(playerName) {
    try {
      if (!config.externalDatabaseEnabled) return false;

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/inventory/check?playerName=${playerName}`,
        "GET"
      );
      request.headers = [
        ["Authorization", `Bearer ${this.getAuthToken()}`]
      ];

      const response = await http.request(request);

      if (response && response.status === 200) {
        const data = JSON.parse(response.body);
        return data?.alreadyLoaded || false;
      }

      return false;
    } catch (e) {
      log(`Checkpoint-Fehler: ${e}`, "warn");
      return false;
    }
  }

  // Markiere Inventar als geladen
  static async markInventoryAsLoaded(playerName, worldId) {
    try {
      if (!config.externalDatabaseEnabled) return true;

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/inventory/mark-loaded`,
        "POST"
      );
      request.headers = [
        ["Content-Type", "application/json"],
        ["Authorization", `Bearer ${this.getAuthToken()}`]
      ];
      request.body = JSON.stringify({
        playerName,
        worldId,
        loadedAt: new Date().toISOString()
      });

      const response = await http.request(request);
      return response && response.status >= 200 && response.status < 300;
    } catch (e) {
      log(`Mark-loaded Fehler: ${e}`, "warn");
      return true; // Continue even if marking fails
    }
  }

  // Speichere Session-Info in externe DB
  static async saveSessionToNetwork(sessionId, sessionData) {
    try {
      if (!config.externalDatabaseEnabled) return false;

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/session/save`,
        "POST"
      );
      request.headers = [
        ["Content-Type", "application/json"],
        ["Authorization", `Bearer ${this.getAuthToken()}`]
      ];
      request.body = JSON.stringify({
        sessionId,
        ...sessionData,
        timestamp: Date.now()
      });

      const response = await http.request(request);
      return response && response.status >= 200 && response.status < 300;
    } catch (e) {
      log(`Session-Speicher Fehler: ${e}`, "warn");
      return true;
    }
  }

  // Hole alle Backups eines Spielers
  static async getBackupsFromNetwork(playerName) {
    try {
      if (!config.externalDatabaseEnabled) return [];

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/inventory/backups?playerName=${playerName}`,
        "GET"
      );
      request.headers = [
        ["Authorization", `Bearer ${this.getAuthToken()}`]
      ];

      const response = await http.request(request);

      if (response && response.status === 200) {
        const data = JSON.parse(response.body);
        return Array.isArray(data?.backups) ? data.backups : [];
      }

      return [];
    } catch (e) {
      log(`Backups-Abruf Fehler: ${e}`, "warn");
      return [];
    }
  }

  // Teile externe DB Health-Status mit
  static async checkDatabaseHealth() {
    try {
      if (!config.externalDatabaseEnabled) return { healthy: false, reason: "disabled" };

      const request = new (await import("@minecraft/server-net")).HttpRequest(
        `${config.externalDatabaseUrl}/health`,
        "GET"
      );

      const response = await http.request(request);

      if (response && response.status === 200) {
        const data = JSON.parse(response.body);
        log(`✅ Externe DB Health: ${data?.status || "OK"}`, "success");
        return { healthy: true, ...data };
      }

      log(`⚠️ Externe DB nicht erreichbar`, "warn");
      return { healthy: false, reason: "unreachable", status: response?.status };
    } catch (e) {
      log(`Health-Check Fehler: ${e}`, "warn");
      return { healthy: false, reason: "error", error: e.message };
    }
  }

  // Authentifizierungs-Token (kann konfiguriert werden)
  static getAuthToken() {
    return process.env.EXTERNAL_DB_TOKEN || "default-token";
  }

  // Bereinige Network Cache
  static clearNetworkCache(playerName = null) {
    if (playerName) {
      this.networkCache.delete(playerName);
      this.lastSyncTime.delete(playerName);
      log(`Cache gelöscht für: ${playerName}`, "success");
    } else {
      this.networkCache.clear();
      this.lastSyncTime.clear();
      log(`Gesamter Network Cache gelöscht`, "success");
    }
  }

  // Teste Netzwerk-Verbindung
  static async testNetworkConnection() {
    try {
      log(`🔍 Teste Externe DB Verbindung...`, "info");

      const health = await this.checkDatabaseHealth();

      if (health.healthy) {
        log(`✅ Externe DB Verbindung: OK`, "success");
        return true;
      } else {
        log(`❌ Externe DB Verbindung: FEHLER (${health.reason})`, "error");
        log(`⚠️ Fallback zur lokalen Datenbank`, "warn");
        return false;
      }
    } catch (e) {
      log(`❌ Netzwerk-Test Fehler: ${e}`, "error");
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INTER-PLUGIN COMMUNICATION PROTOCOL (IPC)
// Plugins auf verschiedenen BDS-Welten kommunizieren über Datenbank-Messages
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class InterPluginCommunicationProtocol {
  // Generiere eindeutige Message-ID
  static generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sende eine Nachricht zu anderen Plugin-Instanzen
  static sendMessage(messageType, payload, priority = "normal") {
    try {
      const messageId = this.generateMessageId();
      const message = {
        id: messageId,
        from: PLUGIN_NAME,
        timestamp: Date.now(),
        type: messageType,  // "player_sync", "world_update", "inventory_changed", etc.
        payload,
        priority,           // "high", "normal", "low"
        acknowledged: false,
        retries: 0,
        maxRetries: 3
      };

      ipcMessagesDb.set(messageId, message);
      ipcMessageQueue.set(messageId, message);

      log(`IPC: Nachricht gesendet (${messageType}) - ID: ${messageId}`, "success");
      return messageId;
    } catch (e) {
      log(`IPC Send Error: ${e}`, "error");
      return null;
    }
  }

  // Empfange und verarbeite ausstehende Nachrichten
  static receiveAndProcessMessages() {
    try {
      const allMessages = ipcMessagesDb.getAllValuesWithKeys?.() || [];

      if (!Array.isArray(allMessages)) return 0;

      let processedCount = 0;

      allMessages.forEach(({ key, value }) => {
        if (!value || value.acknowledged) return;
        if (processingMessages.has(value.id)) return; // Duplikat-Schutz

        processingMessages.add(value.id);

        try {
          // Verarbeite basierend auf Message-Type
          switch (value.type) {
            case "player_sync":
              this.handlePlayerSyncMessage(value);
              break;
            case "world_update":
              this.handleWorldUpdateMessage(value);
              break;
            case "inventory_changed":
              this.handleInventoryChangeMessage(value);
              break;
            case "xp_changed":
              this.handleXPChangeMessage(value);
              break;
            case "sync_request":
              this.handleSyncRequestMessage(value);
              break;
            case "acknowledge":
              this.handleAcknowledgement(value);
              break;
            default:
              log(`IPC: Unbekannter Message-Type: ${value.type}`, "warn");
          }

          // Markiere als verarbeitet
          value.acknowledged = true;
          ipcMessagesDb.set(key, value);
          processedCount++;

          // Sende Bestätigung zurück
          this.sendAcknowledgement(value.id);

        } catch (e) {
          log(`IPC Processing Error (${value.type}): ${e}`, "error");

          // Retry-Logik
          if (value.retries < value.maxRetries) {
            value.retries++;
            ipcMessagesDb.set(key, value);
          } else {
            log(`IPC: Nachricht nach ${value.maxRetries} Versuchen fehlgeschlagen: ${value.id}`, "error");
            value.acknowledged = true;
            ipcMessagesDb.set(key, value);
          }
        }
      });

      return processedCount;
    } catch (e) {
      log(`IPC Receive Error: ${e}`, "error");
      return 0;
    }
  }

  // Sende Bestätigung für empfangene Nachricht
  static sendAcknowledgement(messageId) {
    try {
      const ackId = `ack_${messageId}_${Date.now()}`;
      const ack = {
        id: ackId,
        messageId,
        from: PLUGIN_NAME,
        timestamp: Date.now(),
        status: "processed"
      };
      ipcAcknowledgementDb.set(ackId, ack);
      log(`IPC: Bestätigung gesendet für ${messageId}`, "success");
    } catch (e) {
      log(`IPC Acknowledgement Error: ${e}`, "error");
    }
  }

  // Handler für verschiedene Message-Typen
  static handlePlayerSyncMessage(message) {
    const { playerName, fromWorld, toWorld, inventoryData, xpData } = message.payload;
    log(`IPC: Player-Sync empfangen (${playerName}: ${fromWorld} → ${toWorld})`, "success");

    // Speichere Sync-State
    playerSyncState.set(playerName, {
      playerName,
      status: "syncing",
      fromWorld,
      toWorld,
      timestamp: Date.now()
    });
  }

  static handleWorldUpdateMessage(message) {
    const { worldId, status, data } = message.payload;
    log(`IPC: Welt-Update empfangen (${worldId})`, "success");

    // Update Welt-Status
    worldStateDb.set(`world_state_${worldId}`, {
      worldId,
      status,
      lastUpdate: Date.now(),
      data
    });
  }

  static handleInventoryChangeMessage(message) {
    const { playerName, worldId, itemsCount } = message.payload;
    log(`IPC: Inventar-Änderung empfangen (${playerName} auf ${worldId}: ${itemsCount} Items)`, "success");
  }

  static handleXPChangeMessage(message) {
    const { playerName, level, xpPercentage } = message.payload;
    log(`IPC: XP-Änderung empfangen (${playerName}: Level ${level})`, "success");
  }

  static handleSyncRequestMessage(message) {
    const { playerName, requestType } = message.payload;
    log(`IPC: Sync-Anfrage empfangen (${playerName}: ${requestType})`, "success");
  }

  static handleAcknowledgement(message) {
    const { messageId } = message.payload;
    log(`IPC: Nachricht bestätigt (${messageId})`, "success");

    // Entferne aus Warteschlange
    ipcMessageQueue.delete(messageId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PLAYER SYNC STATE MACHINE
// Verfolgt den Status jedes Spielers während des Sync-Prozesses
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class PlayerSyncStateMachine {
  static getState(playerName) {
    const state = playerSyncState.get(playerName);
    const dbState = playerSyncDb.get(`player_${playerName}`);

    return {
      local: state || { status: "idle" },
      persisted: dbState || { status: "idle" }
    };
  }

  static setState(playerName, status, data = {}) {
    try {
      const timestamp = Date.now();

      // Update in-memory state
      playerSyncState.set(playerName, {
        playerName,
        status,
        timestamp,
        ...data
      });

      // Persist in database
      const persistedState = playerSyncDb.get(`player_${playerName}`) || {};
      persistedState.currentStatus = status;
      persistedState.lastStateChange = timestamp;
      persistedState.stateData = data;

      playerSyncDb.set(`player_${playerName}`, persistedState);

      log(`Sync-Status aktualisiert: ${playerName} → ${status}`, "success");
    } catch (e) {
      log(`State Machine Error: ${e}`, "error");
    }
  }

  // Sync-States: idle → syncing → restoring → complete → idle
  static transitionSync(playerName, fromState, toState) {
    const validTransitions = {
      "idle": ["syncing"],
      "syncing": ["restoring", "error"],
      "restoring": ["complete", "error"],
      "error": ["idle", "syncing"],
      "complete": ["idle"]
    };

    if (!validTransitions[fromState]?.includes(toState)) {
      log(`Invalid transition: ${fromState} → ${toState}`, "warn");
      return false;
    }

    this.setState(playerName, toState);
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WORLD COMMUNICATION LAYER
// Verwaltet Kommunikation zwischen Welten (World-to-World)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class WorldCommunicationLayer {
  static initializeWorldHeartbeat() {
    try {
      const heartbeat = {
        worldId: "local",
        pluginVersion: PLUGIN_VERSION,
        timestamp: Date.now(),
        isAlive: true,
        playersOnline: world.getAllPlayers().length,
        status: "operational"
      };

      ipcHeartbeatDb.set(`heartbeat_local_${Date.now()}`, heartbeat);
      worldHeartbeat.set("local", Date.now());

      log(`Welt-Heartbeat gesendet`, "success");
    } catch (e) {
      log(`Heartbeat Error: ${e}`, "error");
    }
  }

  static checkRemoteWorldStatus() {
    try {
      const allHeartbeats = ipcHeartbeatDb.getAllValuesWithKeys?.() || [];
      const aliveWorlds = new Map();

      if (Array.isArray(allHeartbeats)) {
        allHeartbeats.forEach(({ value }) => {
          if (value && value.timestamp) {
            const age = Date.now() - value.timestamp;
            const isAlive = age < 30000; // Heartbeat älter als 30s = offline

            if (!aliveWorlds.has(value.worldId) || value.timestamp > aliveWorlds.get(value.worldId).timestamp) {
              aliveWorlds.set(value.worldId, {
                ...value,
                isAlive,
                age
              });
            }
          }
        });
      }

      return aliveWorlds;
    } catch (e) {
      log(`World Status Check Error: ${e}`, "error");
      return new Map();
    }
  }

  static notifyWorldStatus(worldId, status, details = {}) {
    try {
      InterPluginCommunicationProtocol.sendMessage("world_update", {
        worldId,
        status,
        data: details
      }, "high");

      log(`Welt-Status gesendet (${worldId}: ${status})`, "success");
    } catch (e) {
      log(`World Status Notification Error: ${e}`, "error");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION & DATA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class ConflictResolution {
  static detectConflict(playerName, incomingData, localData) {
    try {
      // Konflikt: Daten auf zwei Welten unterschiedlich
      if (JSON.stringify(incomingData) !== JSON.stringify(localData)) {
        return {
          playerName,
          hasConflict: true,
          incomingTimestamp: incomingData.timestamp,
          localTimestamp: localData.timestamp,
          incomingSource: incomingData.source,
          localSource: localData.source
        };
      }
      return { hasConflict: false };
    } catch (e) {
      log(`Conflict Detection Error: ${e}`, "error");
      return { hasConflict: false, error: e.message };
    }
  }

  static resolveConflict(conflict) {
    try {
      // Strategie: Neuere Daten gewinnen (Last-Write-Wins)
      const resolution = {
        conflictId: `conflict_${Date.now()}`,
        playerName: conflict.playerName,
        resolvedAt: Date.now(),
        strategy: "last-write-wins",
        winnerTimestamp: Math.max(conflict.incomingTimestamp, conflict.localTimestamp),
        winner: conflict.incomingTimestamp > conflict.localTimestamp ? "incoming" : "local"
      };

      syncConflictDb.set(resolution.conflictId, resolution);
      log(`Konflikt aufgelöst (${conflict.playerName}): ${resolution.winner} Daten gewinnen`, "success");

      return resolution;
    } catch (e) {
      log(`Conflict Resolution Error: ${e}`, "error");
      return null;
    }
  }

  static validateInventoryData(inventory) {
    try {
      if (!inventory || !Array.isArray(inventory.items)) {
        return { valid: false, error: "Invalid inventory structure" };
      }

      // Validiere jeden Item
      const validItems = inventory.items.every(item =>
        item.typeId && typeof item.amount === 'number' && item.amount > 0
      );

      return {
        valid: validItems,
        itemCount: inventory.items.length,
        error: validItems ? null : "Invalid item data"
      };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  static validateXPData(xpData) {
    try {
      if (!xpData || typeof xpData.level !== 'number') {
        return { valid: false, error: "Invalid XP data structure" };
      }

      if (xpData.level < 0 || xpData.level > 32767) {
        return { valid: false, error: "Level out of range" };
      }

      return {
        valid: true,
        level: xpData.level,
        xpPercentage: xpData.xpPercentage || 0
      };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WORLD CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class WorldConnectionManager {
  static initializeWorlds() {
    try {
      // Lade alle Welt-Verbindungen
      Object.values(config.worldConnections).forEach(world => {
        worldConnections.set(world.id, world);
        connectionDb.set(`world_${world.id}`, world);
      });
      log(`${worldConnections.size} Welten initialisiert`, "success");
      return true;
    } catch (e) {
      log(`World init error: ${e}`, "error");
      return false;
    }
  }

  static getConnectedWorlds(fromWorldId) {
    try {
      const world = worldConnections.get(fromWorldId);
      if (!world) return [];
      return world.connected_to || [];
    } catch (e) {
      log(`Get connected error: ${e}`, "warn");
      return [];
    }
  }

  static connectWorlds(world1Id, world2Id) {
    try {
      const w1 = worldConnections.get(world1Id);
      const w2 = worldConnections.get(world2Id);

      if (!w1 || !w2) {
        log(`Welten nicht gefunden: ${world1Id} oder ${world2Id}`, "warn");
        return false;
      }

      // Bidirektionale Verbindung
      if (!w1.connected_to.includes(world2Id)) {
        w1.connected_to.push(world2Id);
      }
      if (!w2.connected_to.includes(world1Id)) {
        w2.connected_to.push(world1Id);
      }

      worldConnections.set(world1Id, w1);
      worldConnections.set(world2Id, w2);
      connectionDb.set(`world_${world1Id}`, w1);
      connectionDb.set(`world_${world2Id}`, w2);

      log(`Welten verbunden: ${world1Id} ↔ ${world2Id}`, "success");
      return true;
    } catch (e) {
      log(`Connection error: ${e}`, "error");
      return false;
    }
  }

  static disconnectWorlds(world1Id, world2Id) {
    try {
      const w1 = worldConnections.get(world1Id);
      const w2 = worldConnections.get(world2Id);

      if (w1 && w1.connected_to) {
        w1.connected_to = w1.connected_to.filter(id => id !== world2Id);
        worldConnections.set(world1Id, w1);
        connectionDb.set(`world_${world1Id}`, w1);
      }

      if (w2 && w2.connected_to) {
        w2.connected_to = w2.connected_to.filter(id => id !== world1Id);
        worldConnections.set(world2Id, w2);
        connectionDb.set(`world_${world2Id}`, w2);
      }

      log(`Welten getrennt: ${world1Id} ↔ ${world2Id}`, "success");
      return true;
    } catch (e) {
      log(`Disconnect error: ${e}`, "error");
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT - VERHINDERT DOPPELTES LADEN/SPEICHERN
// Überwacht aktive Spieler-Sessions um Datenverlust zu verhindern
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class SessionManager {
  // Speichere aktive Sessions pro Spieler
  static activeSessions = new Map(); // playerName -> { sessionId, startTime, worldId, status }

  // Erstelle neue Session
  static createSession(playerName, worldId) {
    try {
      const sessionId = `session_${playerName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = {
        sessionId,
        playerName,
        worldId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        status: "active",
        locked: false // Wird gesetzt, wenn eine andere World die Daten lädt
      };

      // Speichere in Memory UND in DB
      this.activeSessions.set(playerName, session);
      if (playerSessionDb) {
        playerSessionDb.set(sessionId, session);
      }

      log(`✅ Session erstellt: ${playerName} (${sessionId.substring(0, 12)}...)`, "success");
      return sessionId;
    } catch (e) {
      log(`❌ Session creation error: ${e}`, "error");
      return null;
    }
  }

  // Prüfe ob Spieler bereits in anderer Session aktiv ist
  static hasActiveSession(playerName) {
    try {
      const existingSession = this.activeSessions.get(playerName);
      if (existingSession && existingSession.status === "active") {
        log(`⚠️ Aktive Session gefunden: ${playerName} in Welt ${existingSession.worldId}`, "warn");
        return existingSession;
      }
      return null;
    } catch (e) {
      log(`Session check error: ${e}`, "error");
      return null;
    }
  }

  // Beende Session
  static endSession(sessionId, playerName) {
    try {
      const session = this.activeSessions.get(playerName);
      if (session && session.sessionId === sessionId) {
        session.status = "inactive";
        this.activeSessions.delete(playerName);

        // Update in DB
        if (playerSessionDb) {
          session.endTime = Date.now();
          playerSessionDb.set(sessionId, session);
        }

        log(`✅ Session beendet: ${playerName}`, "success");
        return true;
      }
      return false;
    } catch (e) {
      log(`Session end error: ${e}`, "error");
      return false;
    }
  }

  // Aktualisiere Session-Activity (heartbeat)
  static updateActivity(playerName) {
    try {
      const session = this.activeSessions.get(playerName);
      if (session) {
        session.lastActivity = Date.now();
        if (playerSessionDb) {
          playerSessionDb.set(session.sessionId, session);
        }
      }
    } catch (e) {
      // Ignore - nicht kritisch
    }
  }

  // Stelle sicher, dass Spieler nicht geladen wird wenn bereits in Session
  static lockSessionForLoad(playerName, worldId) {
    try {
      const existingSession = this.activeSessions.get(playerName);
      if (existingSession && existingSession.status === "active") {
        if (existingSession.worldId !== worldId) {
          log(`🔒 Spieler ${playerName} ist bereits in ${existingSession.worldId} aktiv - SPERRUNG aktiviert`, "warn");
          return false; // Blockiere das Laden
        }
      }
      return true; // OK zum Laden
    } catch (e) {
      return true;
    }
  }

  // Bereinige alte Sessions (älter als 30 Minuten)
  static cleanupOldSessions() {
    try {
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;

      this.activeSessions.forEach((session, playerName) => {
        if (now - session.lastActivity > thirtyMinutes) {
          log(`🧹 Alte Session gelöscht: ${playerName}`, "warn");
          this.activeSessions.delete(playerName);
        }
      });
    } catch (e) {
      log(`Cleanup error: ${e}`, "error");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// EXTERNE DATENBANK FÜR INVENTARE
// Persistente Speicherung aller Item-Details mit Slot, ID, Lore, etc.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class ExternalInventoryDatabase {
  // Speichere vollständiges Inventar in DB
  static saveCompleteInventory(playerName, inventoryData, worldId) {
    try {
      if (!inventoryDb) {
        log(`❌ Inventory DB nicht verfügbar`, "error");
        return false;
      }

      // Struktur für externe DB:
      const externalRecord = {
        playerName,
        worldId,
        savedAt: new Date().toISOString(),
        timestamp: Date.now(),
        items: [], // Detailliertes Item-Array
        metadata: {
          selectedSlot: inventoryData.selectedSlot || 0,
          totalSlots: 36,
          itemCount: 0
        },
        checksumHash: generateChecksum(inventoryData.items)
      };

      // Speichere jeden Item mit ALLEN Details
      if (Array.isArray(inventoryData.items)) {
        inventoryData.items.forEach(itemData => {
          externalRecord.items.push({
            slot: itemData.slot,
            typeId: itemData.typeId,
            amount: itemData.amount,
            data: itemData.data || 0,
            nameTag: itemData.nameTag || null,
            lore: itemData.lore || [],
            enchantments: itemData.enchantments || [],
            // Zusätzliche Metadaten
            uuid: `${playerName}_${itemData.slot}_${Date.now()}`,
            savedTimestamp: Date.now()
          });
        });
        externalRecord.metadata.itemCount = inventoryData.items.length;
      }

      // Speichere im Externe DB (aktuelle Fassung)
      const currentKey = `ext_inv_${playerName}_current`;
      inventoryDb.set(currentKey, externalRecord);

      // Speichere auch mit Timestamp für Backups
      const backupKey = `ext_inv_${playerName}_backup_${Date.now()}`;
      inventoryDb.set(backupKey, externalRecord);

      // Speichere in historischem Index
      const indexKey = `ext_inv_history_${playerName}`;
      let history = inventoryDb.get(indexKey) || { entries: [] };
      if (!Array.isArray(history.entries)) {
        history.entries = [];
      }
      history.entries.push({
        timestamp: Date.now(),
        key: currentKey,
        itemCount: externalRecord.metadata.itemCount,
        checksum: externalRecord.checksumHash
      });
      // Behalte nur letzte 20 Einträge
      if (history.entries.length > 20) {
        history.entries = history.entries.slice(-20);
      }
      inventoryDb.set(indexKey, history);

      log(`✅ Externe DB gespeichert: ${playerName} (${externalRecord.metadata.itemCount} Items)`, "success");
      return true;
    } catch (e) {
      log(`❌ External DB save error: ${e}`, "error");
      return false;
    }
  }

  // Lade Inventar aus externe DB
  static loadCompleteInventory(playerName) {
    try {
      if (!inventoryDb) {
        log(`❌ Inventory DB nicht verfügbar`, "error");
        return null;
      }

      // Versuche aktuellen Eintrag zu laden
      const currentKey = `ext_inv_${playerName}_current`;
      const data = inventoryDb.get(currentKey);

      if (!data) {
        log(`⚠️ Kein Inventar in externe DB gefunden: ${playerName}`, "warn");
        return null;
      }

      // Validiere Checksumme
      const calculatedChecksum = generateChecksum(data.items);
      if (calculatedChecksum !== data.checksumHash) {
        log(`⚠️ Checksummen-Fehler bei ${playerName} - möglicherweise beschädigte Daten`, "warn");
      }

      log(`✅ Externe DB geladen: ${playerName} (${data.metadata?.itemCount || 0} Items)`, "success");
      return data;
    } catch (e) {
      log(`❌ External DB load error: ${e}`, "error");
      return null;
    }
  }

  // Lösche Inventar aus externe DB (nach erfolgreichem Laden)
  static deleteLoadedInventory(playerName) {
    try {
      if (!inventoryDb) return false;

      const currentKey = `ext_inv_${playerName}_current`;
      // Nicht wirklich löschen - nur als "loaded" markieren
      const data = inventoryDb.get(currentKey);
      if (data) {
        data.loadedAt = new Date().toISOString();
        data.status = "loaded";
        inventoryDb.set(currentKey, data);
        log(`✅ Inventar als geladen markiert: ${playerName}`, "success");
        return true;
      }
      return false;
    } catch (e) {
      log(`Delete inventory error: ${e}`, "error");
      return false;
    }
  }

  // Prüfe ob Inventar bereits in anderer Welt geladen wurde
  static isInventoryAlreadyLoaded(playerName) {
    try {
      if (!inventoryDb) return false;

      const currentKey = `ext_inv_${playerName}_current`;
      const data = inventoryDb.get(currentKey);

      if (data && data.status === "loaded" && data.loadedAt) {
        const loadedTime = new Date(data.loadedAt).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // Wenn innerhalb der letzten 5 Minuten geladen
        if (now - loadedTime < fiveMinutes) {
          log(`🔒 Inventar bereits geladen in ${data.worldId} (vor ${Math.round((now - loadedTime) / 1000)}s)`, "warn");
          return true;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  // Hole alle Backup-Versionen eines Spielers
  static getAllBackups(playerName) {
    try {
      if (!inventoryDb) return [];

      const indexKey = `ext_inv_history_${playerName}`;
      const history = inventoryDb.get(indexKey);

      if (history && Array.isArray(history.entries)) {
        return history.entries.map(entry => ({
          timestamp: entry.timestamp,
          itemCount: entry.itemCount,
          checksum: entry.checksum,
          date: new Date(entry.timestamp).toISOString()
        }));
      }

      return [];
    } catch (e) {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INVENTORY SYNCHRONIZATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class InventorySyncManager {
  static saveInventory(playerName, worldId) {
    try {
      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) return null;

      const container = player.getComponent("minecraft:inventory")?.container;
      if (!container) return null;

      const inventoryData = {
        playerName,
        timestamp: new Date().toISOString(),
        lastWorld: worldId,  // Speichere welche Welt zuletzt verwendet wurde
        items: [],
        selectedSlot: 0
      };

      // Speichere alle 36 Slots
      for (let i = 0; i < Math.min(36, container.size); i++) {
        const item = container.getItem(i);
        if (item) {
          inventoryData.items.push({
            slot: i,
            typeId: item.typeId,
            amount: item.amount,
            data: item.data || 0,
            nameTag: item.nameTag || null,
            lore: item.getLore?.() || [],
            enchantments: this.getEnchantments(item)
          });
        }
      }

      // WICHTIG: Globales Inventar (NICHT pro Welt!)
      // Alle Welten teilen sich EIN Inventar
      const key = `inv_${playerName}_global`;
      inventoryDb.set(key, inventoryData);

      // Speichere auch Backup mit Timestamp
      const backupKey = `inv_${playerName}_backup_${Date.now()}`;
      inventoryDb.set(backupKey, inventoryData);

      // ✨ NEUE FUNKTION: Speichere in externe DB mit allen Details
      const externalSaved = ExternalInventoryDatabase.saveCompleteInventory(playerName, inventoryData, worldId);
      if (!externalSaved) {
        log(`⚠️ Externe DB-Speicherung fehlgeschlagen, aber lokale Sicherung vorhanden`, "warn");
      }

      // VALIDIERUNG: Überprüfe Inventar-Daten
      const validation = ConflictResolution.validateInventoryData(inventoryData);
      if (!validation.valid) {
        log(`⚠️ Inventar-Validierung fehlgeschlagen: ${validation.error}`, "warn");
      }

      // IPC: Sende Nachricht zu anderen Plugin-Instanzen auf anderen Welten
      InterPluginCommunicationProtocol.sendMessage("inventory_changed", {
        playerName,
        worldId,
        itemsCount: inventoryData.items.length,
        timestamp: Date.now(),
        source: PLUGIN_NAME,
        checksum: generateChecksum(inventoryData.items)
      }, "high");

      // Update Sync-Status
      PlayerSyncStateMachine.setState(playerName, "inventory_saved", {
        worldId,
        itemCount: inventoryData.items.length
      });

      log(`✅ Globales Inventar gespeichert: ${playerName} (${inventoryData.items.length} Items) - Externe DB + IPC`, "success");
      return inventoryData;
    } catch (e) {
      log(`Inventory save error: ${e}`, "error");
      return null;
    }
  }

  static restoreInventory(playerName, worldId) {
    try {
      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) return false;

      // ✨ NEUE PRÜFUNG: Ist Spieler bereits in anderer Session aktiv?
      const existingSession = SessionManager.hasActiveSession(playerName);
      if (existingSession && existingSession.worldId !== worldId) {
        log(`🔒 WARNUNG: ${playerName} ist bereits in ${existingSession.worldId} aktiv!`, "warn");
        log(`🚫 Inventar-Laden BLOCKIERT um Datenverlust zu verhindern!`, "warn");
        player.sendMessage("§c⚠️ Du bist bereits in einer anderen Welt aktiv!");
        player.sendMessage("§c⚠️ Dein Inventar wird NICHT geladen um Datenverlust zu verhindern!");
        PlayerSyncStateMachine.setState(playerName, "error", { reason: "duplicate_session", duplicateWorldId: existingSession.worldId });
        return false;
      }

      // Update Sync-Status
      PlayerSyncStateMachine.setState(playerName, "restoring", { worldId });

      // ✨ NEUE FUNKTION: Prüfe ob Inventar bereits in anderer Welt geladen wurde
      const alreadyLoaded = ExternalInventoryDatabase.isInventoryAlreadyLoaded(playerName);
      if (alreadyLoaded) {
        log(`🔒 Inventar wurde bereits kürzlich geladen - BLOCKIERT`, "warn");
        player.sendMessage("§c⚠️ Dein Inventar wurde soeben in einer anderen Welt geladen!");
        player.sendMessage("§c⚠️ Warte bitte einen Moment und versuch es erneut!");
        PlayerSyncStateMachine.setState(playerName, "error", { reason: "recently_loaded" });
        return false;
      }

      // ✨ NEUE FUNKTION: Versuche aus externe DB zu laden
      let inventoryData = ExternalInventoryDatabase.loadCompleteInventory(playerName);

      // Fallback: Wenn nicht in externe DB, nutze alte Methode
      if (!inventoryData) {
        log(`⚠️ Externe DB hat kein Inventar - nutze Fallback...`, "warn");
        inventoryData = this.getLatestInventory(playerName);
      }

      if (!inventoryData) {
        log(`❌ Kein Inventar zum Wiederherstellen: ${playerName}`, "warn");
        player.sendMessage("§c⚠️ Es wurden keine gespeicherten Inventar-Daten gefunden!");
        PlayerSyncStateMachine.setState(playerName, "error", { reason: "no_backup" });
        return false;
      }

      // VALIDIERUNG: Überprüfe Inventar-Daten vor Wiederherstellung
      const validation = ConflictResolution.validateInventoryData(inventoryData);
      if (!validation.valid) {
        log(`⚠️ Inventar-Daten ungültig (${playerName}): ${validation.error}`, "warn");
        // Versuche trotzdem, beste Items wiederherzustellen
      }

      const container = player.getComponent("minecraft:inventory")?.container;
      if (!container) {
        PlayerSyncStateMachine.setState(playerName, "error", { reason: "no_container" });
        return false;
      }

      // Leere Inventar
      for (let i = 0; i < Math.min(36, container.size); i++) {
        container.setItem(i, undefined);
      }

      let successfulItems = 0;

      // Stelle Items wieder her - nutze externe DB Items wenn verfügbar
      const itemsToRestore = inventoryData.items || [];
      itemsToRestore.forEach(itemData => {
        try {
          const newItem = new ItemStack(itemData.typeId, itemData.amount);

          // Verzauberungen
          if (itemData.enchantments && itemData.enchantments.length > 0) {
            const enchantable = newItem.getComponent("minecraft:enchantable");
            if (enchantable) {
              itemData.enchantments.forEach(ench => {
                try {
                  enchantable.addEnchantment({ type: { id: ench.type }, level: ench.level });
                } catch (e) {
                  // Enchant könnte nicht kompatibel sein
                  log(`⚠️ Enchantment nicht kompatibel: ${ench.type}`, "warn");
                }
              });
            }
          }

          if (itemData.nameTag) newItem.nameTag = itemData.nameTag;

          container.setItem(itemData.slot, newItem);
          successfulItems++;
        } catch (e) {
          log(`⚠️ Item-Wiederherstellung fehlgeschlagen: ${e}`, "warn");
        }
      });

      // ✨ NEUE FUNKTION: Markiere Inventar als geladen
      ExternalInventoryDatabase.deleteLoadedInventory(playerName);

      // IPC: Sende Bestätigung der Wiederherstellung
      InterPluginCommunicationProtocol.sendMessage("inventory_restored", {
        playerName,
        worldId,
        itemsRestored: successfulItems,
        totalItems: itemsToRestore.length,
        timestamp: Date.now(),
        source: PLUGIN_NAME,
        fromExternalDB: !!ExternalInventoryDatabase.loadCompleteInventory(playerName)
      }, "high");

      // Update Sync-Status
      PlayerSyncStateMachine.setState(playerName, "restore_complete", {
        worldId,
        itemsRestored: successfulItems
      });

      log(`✅ Inventar wiederhergestellt: ${playerName} (${successfulItems}/${itemsToRestore.length} Items) - Externe DB geladen`, "success");
      return true;
    } catch (e) {
      log(`❌ Inventory restore error: ${e}`, "error");
      PlayerSyncStateMachine.setState(playerName, "error", { reason: "restore_exception", error: e.message });
      return false;
    }
  }

  static getLatestInventory(playerName) {
    try {
      // Suche das GLOBALE Inventar für diesen Spieler
      // (nicht per Welt, sondern EIN Inventar für alle Welten)

      // Versuche erst das Haupt-Inventar zu laden
      const globalKey = `inv_${playerName}_global`;
      const globalInventory = inventoryDb.get(globalKey);

      if (globalInventory) {
        log(`Globales Inventar geladen: ${playerName}`, "success");
        return globalInventory;
      }

      // Falls kein globales Inventar, suche nach neuesten Backup
      let latest = null;
      let latestTime = 0;

      const backupKeyPrefix = `inv_${playerName}_backup`;
      const allEntries = inventoryDb.getAllValuesWithKeys?.() || [];

      if (Array.isArray(allEntries)) {
        allEntries.forEach(({ key, value }) => {
          if (key.startsWith(backupKeyPrefix) && value && value.timestamp) {
            const timestamp = new Date(value.timestamp).getTime();
            if (timestamp > latestTime) {
              latest = value;
              latestTime = timestamp;
            }
          }
        });
      }

      if (latest) {
        log(`Neuestes Backup-Inventar gefunden: ${playerName}`, "success");
        return latest;
      }

      log(`Kein globales Inventar für ${playerName} gefunden`, "warn");
      return null;
    } catch (e) {
      log(`Get inventory error: ${e}`, "warn");
      return null;
    }
  }

  static getEnchantments(item) {
    try {
      const enchantable = item.getComponent("minecraft:enchantable");
      if (!enchantable || !enchantable.enchantments) return [];

      return enchantable.enchantments.map(e => ({
        type: e.type?.id || "",
        level: e.level
      }));
    } catch (e) {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// XP SYNCHRONIZATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class XPSyncManager {
  static saveXP(playerName, worldId) {
    try {
      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) return null;

      const xpData = {
        playerName,
        timestamp: new Date().toISOString(),
        level: player.level || 0,
        xpPercentage: (player.xpEarnedAtCurrentLevel || 0) /
                      (player.totalXpNeededForNextLevel || 1),
        totalXP: player.totalXpNeededForNextLevel * (player.level || 0) +
                 (player.xpEarnedAtCurrentLevel || 0),
        source: PLUGIN_NAME
      };

      // Globales XP (nicht pro Welt!)
      const key = `xp_${playerName}_global`;
      xpDb.set(key, xpData);

      // Backup mit Timestamp
      const backupKey = `xp_${playerName}_backup_${Date.now()}`;
      xpDb.set(backupKey, xpData);

      // VALIDIERUNG: Überprüfe XP-Daten
      const validation = ConflictResolution.validateXPData(xpData);
      if (!validation.valid) {
        log(`⚠️ XP-Validierung fehlgeschlagen: ${validation.error}`, "warn");
      }

      // IPC: Sende XP-Änderung zu anderen Welten
      InterPluginCommunicationProtocol.sendMessage("xp_changed", {
        playerName,
        worldId,
        level: xpData.level,
        xpPercentage: xpData.xpPercentage,
        totalXP: xpData.totalXP,
        timestamp: Date.now(),
        source: PLUGIN_NAME,
        checksum: generateChecksum(xpData)
      }, "high");

      // Update Sync-Status
      PlayerSyncStateMachine.setState(playerName, "xp_saved", {
        worldId,
        level: xpData.level
      });

      log(`Globales XP gespeichert: ${playerName} Level ${xpData.level} - IPC gesendet`, "success");
      return xpData;
    } catch (e) {
      log(`XP save error: ${e}`, "error");
      return null;
    }
  }

  static restoreXP(playerName, worldId) {
    try {
      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) return false;

      // Update Sync-Status
      PlayerSyncStateMachine.setState(playerName, "xp_restoring", { worldId });

      const xpData = this.getLatestXP(playerName);
      if (!xpData) {
        log(`Keine XP zum Wiederherstellen: ${playerName}`, "warn");
        PlayerSyncStateMachine.setState(playerName, "error", { reason: "no_xp_backup" });
        return false;
      }

      // VALIDIERUNG: Überprüfe XP-Daten
      const validation = ConflictResolution.validateXPData(xpData);
      if (!validation.valid) {
        log(`⚠️ XP-Daten ungültig (${playerName}): ${validation.error}`, "warn");
        PlayerSyncStateMachine.setState(playerName, "error", { reason: "invalid_xp_data" });
        return false;
      }

      // Setze Level und XP
      player.level = xpData.level || 0;

      // IPC: Sende Bestätigung der XP-Wiederherstellung
      InterPluginCommunicationProtocol.sendMessage("xp_restored", {
        playerName,
        worldId,
        level: xpData.level,
        xpPercentage: xpData.xpPercentage,
        timestamp: Date.now(),
        source: PLUGIN_NAME
      }, "high");

      // Update Sync-Status
      PlayerSyncStateMachine.setState(playerName, "xp_restore_complete", {
        worldId,
        level: xpData.level
      });

      log(`Globales XP wiederhergestellt: ${playerName} Level ${xpData.level} - IPC gesendet`, "success");
      return true;
    } catch (e) {
      log(`XP restore error: ${e}`, "error");
      PlayerSyncStateMachine.setState(playerName, "error", { reason: "xp_restore_exception", error: e.message });
      return false;
    }
  }

  static getLatestXP(playerName) {
    try {
      // Suche die neueste XP-Daten für diesen Spieler
      let latest = null;
      let latestTime = 0;

      const keyPrefix = `xp_${playerName}`;

      // Durchsuche xpDb nach passenden Einträgen
      const allEntries = xpDb.getAllValuesWithKeys?.() || [];

      if (Array.isArray(allEntries)) {
        allEntries.forEach(({ key, value }) => {
          if (key.startsWith(keyPrefix) && value && value.timestamp) {
            const timestamp = new Date(value.timestamp).getTime();
            if (timestamp > latestTime) {
              latest = value;
              latestTime = timestamp;
            }
          }
        });
      }

      if (latest) {
        log(`Letztes XP gefunden: ${playerName} Level ${latest.level}`, "success");
      } else {
        log(`Keine XP-Backups für ${playerName} gefunden`, "warn");
      }

      return latest;
    } catch (e) {
      log(`Get XP error: ${e}`, "warn");
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INTER-PLUGIN COMMUNICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class PluginCommunicationManager {
  static broadcastSyncEvent(playerName, eventType, data) {
    try {
      const message = {
        from: PLUGIN_NAME,
        timestamp: Date.now(),
        playerName,
        eventType, // "sync_inventory", "sync_xp", "player_join", etc.
        data,
        channel: SYNC_CHANNEL
      };

      // Speichere in Datenbank für andere Server-Instanzen zu lesen
      const msgId = `msg_${playerName}_${eventType}_${Date.now()}`;
      worldSyncDb.set(msgId, message);

      log(`Sync-Event gesendet: ${playerName} - ${eventType}`, "success");
      return true;
    } catch (e) {
      log(`Broadcast error: ${e}`, "error");
      return false;
    }
  }

  static receiveAndProcessSyncEvents(playerName) {
    try {
      // Lese ausstehende Sync-Events für diesen Spieler aus der Datenbank
      const keyPrefix = `msg_${playerName}`;
      let processedCount = 0;

      // Durchsuche worldSyncDb nach passenden Nachrichten
      const allEntries = worldSyncDb.getAllValuesWithKeys?.() || [];

      if (Array.isArray(allEntries)) {
        allEntries.forEach(({ key, value }) => {
          if (key.startsWith(keyPrefix) && value && value.channel === SYNC_CHANNEL) {
            try {
              // Verarbeite das Sync-Event basierend auf eventType
              if (value.eventType === "sync_inventory" && value.data?.inventorySynced) {
                log(`Processing sync_inventory event für ${playerName}`, "success");
                const player = world.getAllPlayers().find(p => p.name === playerName);
                if (player) {
                  InventorySyncManager.restoreInventory(playerName, value.data.toWorld);
                }
                processedCount++;
              } else if (value.eventType === "sync_xp" && value.data?.xpSynced) {
                log(`Processing sync_xp event für ${playerName}`, "success");
                const player = world.getAllPlayers().find(p => p.name === playerName);
                if (player) {
                  XPSyncManager.restoreXP(playerName, value.data.toWorld);
                }
                processedCount++;
              } else if (value.eventType === "sync_player_data") {
                log(`Processing sync_player_data event für ${playerName}`, "success");
                // Komplettes Sync von Inventar und XP
                const player = world.getAllPlayers().find(p => p.name === playerName);
                if (player && value.data) {
                  if (value.data.inventorySynced) {
                    InventorySyncManager.restoreInventory(playerName, value.data.toWorld);
                  }
                  if (value.data.xpSynced) {
                    XPSyncManager.restoreXP(playerName, value.data.toWorld);
                  }
                }
                processedCount++;
              }

              // Lösche verarbeitete Nachricht
              worldSyncDb.delete(key);
            } catch (e) {
              log(`Event processing error for ${key}: ${e}`, "warn");
            }
          }
        });
      }

      if (processedCount > 0) {
        log(`${processedCount} Sync-Event(s) verarbeitet für: ${playerName}`, "success");
      }

      return true;
    } catch (e) {
      log(`Receive events error: ${e}`, "error");
      return false;
    }
  }

  static notifyWorldConnection(fromWorldId, toWorldId, status) {
    try {
      const notification = {
        from: PLUGIN_NAME,
        timestamp: Date.now(),
        fromWorld: fromWorldId,
        toWorld: toWorldId,
        status, // "connected", "disconnected", "syncing"
        channel: SYNC_CHANNEL
      };

      const notifId = `notif_${fromWorldId}_${toWorldId}_${Date.now()}`;
      worldSyncDb.set(notifId, notification);

      log(`Welt-Benachrichtigung: ${fromWorldId} → ${toWorldId} (${status})`, "success");
      return true;
    } catch (e) {
      log(`Notify error: ${e}`, "error");
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AUTOMATIC SYNC ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class AutoSyncOrchestrator {
  static async syncPlayer(playerName, fromWorldId, toWorldId) {
    try {
      log(`Auto-Sync starten: ${playerName} (${fromWorldId} → ${toWorldId})`, "success");

      // 1. Speichere Inventar & XP von aktuellem Server
      if (config.syncInventory) {
        InventorySyncManager.saveInventory(playerName, fromWorldId);
      }

      if (config.syncXP) {
        XPSyncManager.saveXP(playerName, fromWorldId);
      }

      // 2. Sende Sync-Event zu anderen Servern
      PluginCommunicationManager.broadcastSyncEvent(playerName, "sync_player_data", {
        fromWorld: fromWorldId,
        toWorld: toWorldId,
        inventorySynced: config.syncInventory,
        xpSynced: config.syncXP
      });

      // 3. Markiere als ausstehend
      pendingSyncQueue.set(playerName, {
        fromWorld: fromWorldId,
        toWorld: toWorldId,
        timestamp: Date.now()
      });

      // 4. Benachrichtige Discord
      sendDiscordEmbed(
        "Auto-Sync Initiated",
        `${playerName} wird automatisch synchronisiert\n**Von:** ${fromWorldId}\n**Zu:** ${toWorldId}`,
        0x00ff00
      );

      log(`Auto-Sync eingeleitet: ${playerName}`, "success");
      return true;
    } catch (e) {
      log(`AutoSync error: ${e}`, "error");
      return false;
    }
  }

  static async completeSync(playerName, toWorldId) {
    try {
      log(`Auto-Sync abgeschlossen: ${playerName}`, "success");

      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) return false;

      // 1. Restore Inventar
      if (config.syncInventory) {
        InventorySyncManager.restoreInventory(playerName, toWorldId);
      }

      // 2. Restore XP
      if (config.syncXP) {
        XPSyncManager.restoreXP(playerName, toWorldId);
      }

      // 3. Update player record
      const playerKey = `player_${playerName}`;
      const playerData = playerSyncDb.get(playerKey) || {
        playerName,
        lastSyncTime: null,
        lastSyncFromWorld: null,
        lastSyncToWorld: null,
        syncCount: 0
      };

      playerData.lastSyncTime = new Date().toISOString();
      playerData.lastSyncFromWorld = null;
      playerData.lastSyncToWorld = toWorldId;
      playerData.syncCount = (playerData.syncCount || 0) + 1;

      playerSyncDb.set(playerKey, playerData);

      // 4. Entferne aus ausstehenden Queue
      pendingSyncQueue.delete(playerName);

      // 5. Benachrichtigung
      player.sendMessage(`§a✓ Dein Inventar & XP wurden synchronisiert!`);

      sendDiscordEmbed(
        "Sync Complete",
        `${playerName}'s Daten wurden erfolgreich synchronisiert`,
        0x00aa00
      );

      log(`Sync abgeschlossen: ${playerName}`, "success");
      return true;
    } catch (e) {
      log(`Sync complete error: ${e}`, "error");
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL - WORLD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function showWorldManagementPanel(player) {
  const worlds = Array.from(worldConnections.values());

  new ActionFormData()
    .title("🌐 Welt-Verbindungsverwaltung")
    .body("Verwalte Server-Welt-Verbindungen:")
    .button("➕ Neue Welt hinzufügen", "")
    .button("🔗 Welten verbinden", "")
    .button("❌ Welten trennen", "")
    .button("📊 Verbindungsstatus", "")
    .button("⚙️ Auto-Sync Einstellungen", "")
    .button("🔙 Zurück", "")
    .show(player)
    .then(response => {
      if (response.canceled || response.selection === 5) {
        return;
      }

      switch (response.selection) {
        case 0:
          showAddWorldForm(player);
          break;
        case 1:
          showConnectWorldsForm(player);
          break;
        case 2:
          showDisconnectWorldsForm(player);
          break;
        case 3:
          showConnectionStatus(player);
          break;
        case 4:
          showAutoSyncSettings(player);
          break;
      }
    });
}

function showAddWorldForm(player) {
  new ModalFormData()
    .title("➕ Neue Welt hinzufügen")
    .textField("Welt-ID (z.B. world1):", "")
    .textField("Welt-Name:", "")
    .toggle("Auto-Sync aktivieren?", true)
    .show(player)
    .then(response => {
      if (response.canceled) return;

      const [worldId, worldName, autoSync] = response.formValues;

      if (!worldId || !worldName) {
        player.sendMessage("§c✗ Bitte alle Felder ausfüllen");
        return;
      }

      const newWorld = {
        id: worldId,
        name: worldName,
        icon: "🌍",
        enabled: true,
        autoSync: autoSync,
        connected_to: []
      };

      worldConnections.set(worldId, newWorld);
      connectionDb.set(`world_${worldId}`, newWorld);

      player.sendMessage(`§a✓ Welt "${worldName}" hinzugefügt!`);
      log(`Neue Welt hinzugefügt: ${worldId}`, "success");

      system.runTimeout(() => showWorldManagementPanel(player), 5);
    });
}

function showConnectWorldsForm(player) {
  const worlds = Array.from(worldConnections.values());
  const worldNames = worlds.map(w => w.name);

  new ModalFormData()
    .title("🔗 Welten verbinden")
    .dropdown("Von-Welt:", worldNames, 0)
    .dropdown("Zu-Welt:", worldNames, 1)
    .show(player)
    .then(response => {
      if (response.canceled) return;

      const [fromIdx, toIdx] = response.formValues;
      const fromWorld = worlds[fromIdx].id;
      const toWorld = worlds[toIdx].id;

      if (fromWorld === toWorld) {
        player.sendMessage("§c✗ Wähle zwei verschiedene Welten");
        return;
      }

      WorldConnectionManager.connectWorlds(fromWorld, toWorld);
      player.sendMessage(`§a✓ Welten verbunden: ${worlds[fromIdx].name} ↔ ${worlds[toIdx].name}`);

      PluginCommunicationManager.notifyWorldConnection(fromWorld, toWorld, "connected");

      system.runTimeout(() => showWorldManagementPanel(player), 5);
    });
}

function showDisconnectWorldsForm(player) {
  const worlds = Array.from(worldConnections.values());
  const worldNames = worlds.map(w => w.name);

  new ModalFormData()
    .title("❌ Welten trennen")
    .dropdown("Von-Welt:", worldNames, 0)
    .dropdown("Zu-Welt:", worldNames, 1)
    .show(player)
    .then(response => {
      if (response.canceled) return;

      const [fromIdx, toIdx] = response.formValues;
      const fromWorld = worlds[fromIdx].id;
      const toWorld = worlds[toIdx].id;

      if (fromWorld === toWorld) {
        player.sendMessage("§c✗ Wähle zwei verschiedene Welten");
        return;
      }

      WorldConnectionManager.disconnectWorlds(fromWorld, toWorld);
      player.sendMessage(`§a✓ Welten getrennt: ${worlds[fromIdx].name} ↔ ${worlds[toIdx].name}`);

      PluginCommunicationManager.notifyWorldConnection(fromWorld, toWorld, "disconnected");

      system.runTimeout(() => showWorldManagementPanel(player), 5);
    });
}

function showConnectionStatus(player) {
  const worlds = Array.from(worldConnections.values());

  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e🌐 WELT-VERBINDUNGSSTATUS:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

  worlds.forEach(world => {
    msg += `§e${world.icon} ${world.name} (${world.id})\n`;
    msg += `§7  Status: ${world.enabled ? "§aAktiv" : "§cInaktiv"}\n`;
    msg += `§7  Auto-Sync: ${world.autoSync ? "§aAktiv" : "§cAus"}\n`;

    if (world.connected_to && world.connected_to.length > 0) {
      msg += `§7  Verbunden mit: `;
      world.connected_to.forEach(connId => {
        const connWorld = worldConnections.get(connId);
        if (connWorld) {
          msg += `${connWorld.icon} ${connWorld.name}, `;
        }
      });
      msg += "\n";
    } else {
      msg += `§7  Verbunden mit: §cKeine\n`;
    }
    msg += "\n";
  });

  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  player.sendMessage(msg);
  system.runTimeout(() => showWorldManagementPanel(player), 10);
}

function showAutoSyncSettings(player) {
  new ActionFormData()
    .title("⚙️ Auto-Sync Einstellungen")
    .body("Konfiguriere automatische Synchronisation:")
    .button(`Inventar: ${config.syncInventory ? "§aAn" : "§cAus"}`, "")
    .button(`XP: ${config.syncXP ? "§aAn" : "§cAus"}`, "")
    .button(`Beim Login synchen: ${config.syncOnLogin ? "§aAn" : "§cAus"}`, "")
    .button(`Beim Logout synchen: ${config.syncOnLogout ? "§aAn" : "§cAus"}`, "")
    .button("🔙 Zurück", "")
    .show(player)
    .then(response => {
      if (response.canceled || response.selection === 4) {
        system.runTimeout(() => showWorldManagementPanel(player), 5);
        return;
      }

      switch (response.selection) {
        case 0:
          config.syncInventory = !config.syncInventory;
          player.sendMessage(`§a✓ Inventar-Sync: ${config.syncInventory ? "Aktiviert" : "Deaktiviert"}`);
          break;
        case 1:
          config.syncXP = !config.syncXP;
          player.sendMessage(`§a✓ XP-Sync: ${config.syncXP ? "Aktiviert" : "Deaktiviert"}`);
          break;
        case 2:
          config.syncOnLogin = !config.syncOnLogin;
          player.sendMessage(`§a✓ Login-Sync: ${config.syncOnLogin ? "Aktiviert" : "Deaktiviert"}`);
          break;
        case 3:
          config.syncOnLogout = !config.syncOnLogout;
          player.sendMessage(`§a✓ Logout-Sync: ${config.syncOnLogout ? "Aktiviert" : "Deaktiviert"}`);
          break;
      }

      system.runTimeout(() => showAutoSyncSettings(player), 5);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// BEFEHLS-REGISTRIERUNG MIT BEDROCKBRIDGE PREFIX
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerCommands() {
  try {
    if (!bridge || !bridge.bedrockCommands) {
      console.warn("[CrossServerSyncV2] ⚠️ BedrockBridge Commands nicht verfügbar");
      return false;
    }

    // HAUPT-COMMAND FÜR SPIELER: Zeigt Sync-Info
    bridge.bedrockCommands.registerCommand("sync", (player, ...args) => {
  try {
    const subcommand = args[0]?.toString().toLowerCase();

    switch (subcommand) {
      case "menu":
      case undefined:
        // Öffne Info-Panel
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🌐 CROSS-SERVER SYNC v2.0");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§aℹ️ Globales Inventar System:");
        player.sendMessage("§7  Du hast EIN Inventar auf allen Welten!");
        player.sendMessage("§7  • Automatisch synchronisiert");
        player.sendMessage("§7  • Alle Items überall verfügbar");
        player.sendMessage("§7  • XP/Level werden mitgenommen");
        player.sendMessage("§7");
        player.sendMessage("§a📊 Verfügbare Befehle:");
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync help       - Diese Hilfe`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync stats      - Deine Statistiken`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync restore    - Inventar manuell laden`);
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      case "help":
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🌐 CROSS-SERVER SYNC - HILFE");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§aWas ist das System?");
        player.sendMessage("§7  Dein Inventar wird automatisch");
        player.sendMessage("§7  zwischen allen Welten synchronisiert!");
        player.sendMessage("§7");
        player.sendMessage("§aWie funktioniert es?");
        player.sendMessage("§7  1. Du sammelst Items auf Welt A");
        player.sendMessage("§7  2. Du loggt aus");
        player.sendMessage("§7  3. Du joinet Welt B");
        player.sendMessage("§7  4. Deine Items sind da! ✓");
        player.sendMessage("§7");
        player.sendMessage("§aAutomatisch:");
        player.sendMessage("§7  ✓ Inventar wird beim Ausloggen gespeichert");
        player.sendMessage("§7  ✓ Inventar wird beim Eintritt wiederhergestellt");
        player.sendMessage("§7  ✓ XP/Level werden ebenfalls synchronisiert");
        player.sendMessage("§7  ✓ Alles läuft im Hintergrund ab");
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      case "stats": {
        const playerRecord = playerSyncDb.get(`player_${player.name}`);
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e📊 DEINE SYNC-STATISTIKEN");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage(`§aSpieler: §7${player.name}`);
        player.sendMessage(`§aLevel: §7${player.level}`);
        if (playerRecord) {
          player.sendMessage(`§aAnzahl Syncs: §7${playerRecord.syncCount || 0}`);
          player.sendMessage(`§aLetzte Sync: §7${playerRecord.lastSyncTime || "Keine"}`);
        } else {
          player.sendMessage("§aAnzahl Syncs: §70 (Neu auf dem Server)");
        }
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;
      }

      case "restore":
        player.sendMessage("§a⏳ Inventar wird wiederhergestellt...");
        system.runTimeout(() => {
          const restored = InventorySyncManager.restoreInventory(player.name, "global");
          if (restored) {
            player.sendMessage("§a✓ Inventar wurde wiederhergestellt!");
          } else {
            player.sendMessage("§c✗ Kein Inventar-Backup gefunden.");
            player.sendMessage("§cDu musst erst auf einer anderen Welt Items haben.");
          }
        }, 5);
        break;

      case "inventory":
      case "inv": {
        // Zeige Inventar-Info
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e📦 DEIN GLOBALES INVENTAR");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§a📍 Dein Inventar ist GLOBAL:");
        player.sendMessage("§7  • Überall verfügbar");
        player.sendMessage("§7  • Automatisch synchronisiert");
        player.sendMessage("§7  • Verloren geht nichts!");
        player.sendMessage("§7");
        const invData = inventoryDb.get(`inv_${player.name}_global`);
        if (invData) {
          const itemCount = invData.items?.length || 0;
          player.sendMessage(`§aAktuelle Items: §7${itemCount}`);
          player.sendMessage(`§aLetzte Sync: §7${new Date(invData.timestamp).toLocaleString()}`);
        } else {
          player.sendMessage("§7Noch keine Items synchronisiert");
        }
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;
      }

      case "xp":
      case "level": {
        // Zeige XP-Info
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e⭐ DEIN GLOBALES LEVEL & XP");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§a📍 Dein Level ist GLOBAL:");
        player.sendMessage("§7  • Überall das gleiche Level");
        player.sendMessage("§7  • Automatisch synchronisiert");
        player.sendMessage("§7  • Keine Wiederholung nötig!");
        player.sendMessage("§7");
        const xpData = xpDb.get(`xp_${player.name}_global`);
        if (xpData) {
          player.sendMessage(`§aAktuelles Level: §7${xpData.level || player.level}`);
          player.sendMessage(`§aXP-Prozent: §7${xpData.xpPercentage || 0}%`);
          player.sendMessage(`§aLetzte Sync: §7${new Date(xpData.timestamp).toLocaleString()}`);
        } else {
          player.sendMessage(`§aAktuelles Level: §7${player.level}`);
          player.sendMessage("§7Noch nicht synchronisiert");
        }
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;
      }

      case "info":
      case "status": {
        // Zeige Status-Information
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🌐 DEIN SYNC-STATUS");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");

        const playerState = playerSyncState.get(player.name);
        const stateIcon = playerState?.status === "idle" ? "✓" : playerState?.status === "syncing" ? "⟳" : "?";
        player.sendMessage(`§aSync-Status: §7${stateIcon} ${playerState?.status || "unknown"}`);

        const playerRecord = playerSyncDb.get(`player_${player.name}`);
        if (playerRecord) {
          player.sendMessage(`§aAnzahl Syncs: §7${playerRecord.syncCount || 0}`);
          player.sendMessage(`§aLetzte Sync: §7${playerRecord.lastSyncTime || "Keine"}`);
        }

        player.sendMessage(`§aAktueller Level: §7${player.level}`);
        player.sendMessage("§7");
        player.sendMessage("§aVerfügbare Befehle:");
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync inventory - Inventar-Info`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync xp        - XP-Info`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync stats     - Statistiken`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync restore   - Manuell laden`);
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;
      }

      case "worlds":
      case "welten": {
        // Zeige verbundene Welten
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🌍 VERFÜGBARE WELTEN");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");

        if (worldConnections.size === 0) {
          player.sendMessage("§7Keine Welten konfiguriert. Kontaktiere einen Admin.");
        } else {
          let wIndex = 1;
          worldConnections.forEach((world, worldId) => {
            const heartbeatAge = Math.round((Date.now() - (worldHeartbeat.get(worldId) || 0)) / 1000);
            const status = heartbeatAge > 30 ? "§c✗ OFFLINE" : "§2✓ ONLINE";
            player.sendMessage(`§a${wIndex}. ${world.name || worldId} ${status}`);
            player.sendMessage(`§7   ID: ${worldId} | Verbunden mit: ${world.connected_to?.join(", ") || "keine"}`);
            wIndex++;
          });
        }

        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;
      }

      default:
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§c✗ UNBEKANNTER BEFEHL");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§aVerfügbare Befehle:");
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync              - Zeige Info-Menü`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync help         - Detaillierte Hilfe`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync stats        - Deine Statistiken`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync restore      - Inventar laden`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync inventory    - Inventar-Info`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync xp           - Level-Info`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync info         - Status-Info`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}sync worlds       - Welten-Liste`);
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
  } catch (e) {
    log(`Befehlsfehler (/sync): ${e}`, "error");
    player.sendMessage("§c✗ Ein Fehler ist aufgetreten. Versuche es später erneut.");
  }
}, "🌐 Automatische Welt-Synchronisation - Dein globales Inventar");

// ADMIN-COMMAND: Welt-Verwaltung
bridge.bedrockCommands.registerAdminCommand("syncworld", (player) => {
  system.runTimeout(() => showWorldManagementPanel(player), 5);
}, "🌐 Welt-Verbindungen verwalten - Automatische Synchronisation");

// ADMIN-COMMAND: Schnelle Admin-Tools MIT SUBCOMMANDS
bridge.bedrockCommands.registerAdminCommand("syncadmin", (player, ...args) => {
  try {
    const subcommand = args[0]?.toString().toLowerCase();

    switch (subcommand) {
      case "menu":
      case undefined:
        // Öffne Haupt-Admin-Menü
        new ActionFormData()
          .title("🔧 ADMIN-TOOLS")
          .body("Wähle eine Option:")
          .button("🌍 Welt-Verwaltung", "")
          .button("📊 System-Status", "")
          .button("💾 Manual Backup", "")
          .button("👥 Spieler-Verwaltung", "")
          .button("📜 System-Logs", "")
          .button("⚙️ Einstellungen", "")
          .button("🔙 Zurück", "")
          .show(player)
          .then(response => {
            if (response.canceled || response.selection === 6) return;

            switch (response.selection) {
              case 0:
                system.runTimeout(() => showWorldManagementPanel(player), 5);
                break;
              case 1:
                // System-Status anzeigen
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§e📊 SYSTEM-STATUS");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§aStatus: §2✓ AKTIV");
                player.sendMessage(`§aVersion: §72.0.0 (Complete IPC)`);
                player.sendMessage(`§aAuto-Sync: §${config.autoSyncEnabled ? '2✓' : 'c✗'} ${config.autoSyncEnabled ? 'Aktiv' : 'Aus'}`);
                player.sendMessage(`§aInventar-Sync: §${config.syncInventory ? '2✓' : 'c✗'}`);
                player.sendMessage(`§aXP-Sync: §${config.syncXP ? '2✓' : 'c✗'}`);
                player.sendMessage(`§aOnline Spieler: §7${world.getAllPlayers().length}`);
                player.sendMessage(`§aAuto-Sync Interval: §7${config.autoSyncInterval}s`);
                player.sendMessage(`§aWelten verbunden: §7${worldConnections.size}`);
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                break;
              case 2: {
                // Manual Backup
                player.sendMessage("§a⏳ Manuelle Sicherung wird erstellt...");
                let backupCount = 0;
                world.getAllPlayers().forEach(p => {
                  InventorySyncManager.saveInventory(p.name, "global");
                  XPSyncManager.saveXP(p.name, "global");
                  backupCount++;
                });
                player.sendMessage(`§a✓ Backup erstellt für ${backupCount} Spieler!`);
                break;
              }
              case 3: {
                // Spieler-Verwaltung
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§e👥 ONLINE SPIELER");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§7");
                const players = world.getAllPlayers();
                if (players.length === 0) {
                  player.sendMessage("§7Keine Spieler online");
                } else {
                  players.forEach(p => {
                    const syncState = playerSyncState.get(p.name);
                    const icon = syncState?.status === "idle" ? "✓" : "⟳";
                    player.sendMessage(`§a• ${p.name} §7(Level ${p.level}) [${icon} ${syncState?.status || "unknown"}]`);
                  });
                }
                player.sendMessage("§7");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                break;
              }
              case 4:
                // Logs anzeigen
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§e📜 SYSTEM-LOGS");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§7Detaillierte Logs sind in der Server-Console verfügbar.");
                player.sendMessage("§7");
                player.sendMessage("§aAktuelle Statistiken:");
                player.sendMessage(`§7  • IPC-Nachrichten: ${ipcMessageQueue.size}`);
                player.sendMessage(`§7  • Spieler im Sync: ${playerSyncState.size}`);
                player.sendMessage(`§7  • Welt-Heartbeats: ${worldHeartbeat.size}`);
                player.sendMessage("§7");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                break;
              case 5:
                // Einstellungen anzeigen
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§e⚙️ SYSTEM-EINSTELLUNGEN");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                player.sendMessage("§7");
                player.sendMessage("§aAktive Einstellungen:");
                player.sendMessage(`§7  • Auto-Sync: ${config.autoSyncEnabled ? "An" : "Aus"}`);
                player.sendMessage(`§7  • Inventar-Sync: ${config.syncInventory ? "An" : "Aus"}`);
                player.sendMessage(`§7  • XP-Sync: ${config.syncXP ? "An" : "Aus"}`);
                player.sendMessage(`§7  • Login-Sync: ${config.syncOnLogin ? "An" : "Aus"}`);
                player.sendMessage(`§7  • Logout-Sync: ${config.syncOnLogout ? "An" : "Aus"}`);
                player.sendMessage(`§7  • Interval: ${config.autoSyncInterval}s`);
                player.sendMessage(`§7  • Discord-Logging: ${config.discordLogging ? "An" : "Aus"}`);
                player.sendMessage("§7");
                player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                break;
            }
          });
        break;

      case "status":
        // Schnelle Status-Info
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e📊 SYSTEM-STATUS");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§aStatus: §2✓ AKTIV");
        player.sendMessage(`§aVersion: §72.0.0`);
        player.sendMessage(`§aOnline Spieler: §7${world.getAllPlayers().length}`);
        player.sendMessage(`§aWelten: §7${worldConnections.size}`);
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      case "backup": {
        // Manual Backup
        player.sendMessage("§a⏳ Manuelle Sicherung wird erstellt...");
        let backupCount = 0;
        world.getAllPlayers().forEach(p => {
          InventorySyncManager.saveInventory(p.name, "global");
          XPSyncManager.saveXP(p.name, "global");
          backupCount++;
        });
        player.sendMessage(`§a✓ Backup erstellt für ${backupCount} Spieler!`);
        player.sendMessage(`§aZeitstempel: §7${new Date().toISOString()}`);
        break;
      }

      case "players": {
        // Zeige alle Spieler
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e👥 ONLINE SPIELER");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        const onlinePlayers = world.getAllPlayers();
        if (onlinePlayers.length === 0) {
          player.sendMessage("§7Keine Spieler online");
        } else {
          onlinePlayers.forEach((p, idx) => {
            const syncState = playerSyncState.get(p.name);
            const icon = syncState?.status === "idle" ? "✓" : "⟳";
            player.sendMessage(`§a${idx + 1}. ${p.name} §7(Level ${p.level}) [${icon}]`);
          });
        }
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;
      }

      case "config":
        // Zeige Konfiguration
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e⚙️ KONFIGURATION");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§aSync-Einstellungen:");
        player.sendMessage(`§7  • Auto-Sync: ${config.autoSyncEnabled}`);
        player.sendMessage(`§7  • Inventar: ${config.syncInventory}`);
        player.sendMessage(`§7  • XP: ${config.syncXP}`);
        player.sendMessage(`§7  • Health: ${config.syncHealth}`);
        player.sendMessage("§7");
        player.sendMessage("§aLogin/Logout:");
        player.sendMessage(`§7  • On Login: ${config.syncOnLogin}`);
        player.sendMessage(`§7  • On Logout: ${config.syncOnLogout}`);
        player.sendMessage("§7");
        player.sendMessage("§aTiming:");
        player.sendMessage(`§7  • Interval: ${config.autoSyncInterval}s`);
        player.sendMessage("§7");
        player.sendMessage("§aLogging:");
        player.sendMessage(`§7  • Discord: ${config.discordLogging}`);
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      default:
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§c✗ UNBEKANNTER BEFEHL");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");
        player.sendMessage("§aVerfügbare Admin-Befehle:");
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncadmin              - Öffne Admin-Menü`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncadmin status       - Status anzeigen`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncadmin backup       - Manual Backup`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncadmin players      - Spieler anzeigen`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncadmin config       - Config anzeigen`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncworld              - Welten verwalten`);
        player.sendMessage(`§7  ${bridge.bedrockCommands.prefix}syncdebug              - Debug-Tools`);
        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
  } catch (e) {
    player.sendMessage(`§c✗ Fehler: ${e}`);
    log(`Admin command error: ${e}`, "error");
  }
}, "🔧 Admin-Tools für Cross-Server Sync");

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DEBUG COMMAND: IPC Monitoring & Diagnostics
// ═══════════════════════════════════════════════════════════════════════════════════════════════

bridge.bedrockCommands.registerAdminCommand("syncdebug", (player, ...args) => {
  try {
    const subcommand = args[0]?.toString().toLowerCase();

    switch (subcommand) {
      case "ipc":
      case undefined:
        // Zeige IPC Queue Status
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🔧 IPC DEBUG - NACHRICHTENQUEUE");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");

        // Count pending messages
        let pendingCount = 0;
        let processingCount = processingMessages.size;
        try {
          const keys = ipcMessagesDb.keys?.() || [];
          pendingCount = keys.filter(k => {
            const msg = ipcMessagesDb.get(k);
            return msg && !msg.processed;
          }).length;
        } catch (e) {
          pendingCount = ipcMessageQueue.size;
        }

        player.sendMessage(`§aAusstehende Nachrichten: §7${pendingCount}`);
        player.sendMessage(`§aVerarbeitete Nachrichten: §7${processingCount}`);
        player.sendMessage(`§aQueue-Größe (RAM): §7${ipcMessageQueue.size}`);

        // Show world heartbeats
        player.sendMessage("§7");
        player.sendMessage("§aWelt-Heartbeats:");
        worldHeartbeat.forEach((time, worldId) => {
          const ageSeconds = Math.round((Date.now() - time) / 1000);
          const status = ageSeconds > 30 ? "§c✗ OFFLINE" : "§2✓ ONLINE";
          player.sendMessage(`§7  ${worldId}: ${status} (${ageSeconds}s)`);
        });

        // Show player sync states
        player.sendMessage("§7");
        player.sendMessage("§aAktuelle Spieler-Sync-States:");
        let stateCount = 0;
        playerSyncState.forEach((state, playerName) => {
          if (stateCount < 5) {
            const status = state.status || "unknown";
            const icon = status === "idle" ? "✓" : status === "syncing" ? "⟳" : "?";
            player.sendMessage(`§7  ${playerName}: §b${icon} ${status}`);
            stateCount++;
          }
        });
        if (playerSyncState.size > 5) {
          player.sendMessage(`§7  ... und ${playerSyncState.size - 5} weitere`);
        }

        player.sendMessage("§7");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      case "conflicts":
        // Zeige Konflikt-History
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🔧 KONFLIKT-AUFLÖSUNGS-HISTORY");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");

        let conflictCount = 0;
        try {
          const keys = syncConflictDb.keys?.() || [];
          conflictCount = keys.length;

          // Show last 5 conflicts
          const recentConflicts = keys.slice(-5);
          recentConflicts.forEach(key => {
            const conflict = syncConflictDb.get(key);
            if (conflict) {
              player.sendMessage(`§aPlayer: §7${conflict.playerName}`);
              player.sendMessage(`§aArt: §7${conflict.type}`);
              player.sendMessage(`§aResolution: §7${conflict.resolution}`);
              player.sendMessage(`§aZeit: §7${new Date(conflict.timestamp).toLocaleString()}`);
              player.sendMessage("§7");
            }
          });
        } catch (e) {
          player.sendMessage("§cKeine Konflikt-Daten verfügbar");
        }

        player.sendMessage(`§aTotale Konflikte: §7${conflictCount}`);
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      case "sessions":
        // Zeige aktive Sessions
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§e🔧 AKTIVE SPIELER-SESSIONS");
        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        player.sendMessage("§7");

        try {
          const sessionKeys = playerSessionDb.keys?.() || [];
          const activeSessions = sessionKeys.filter(k => {
            const session = playerSessionDb.get(k);
            return session && session.status === "active";
          });

          if (activeSessions.length === 0) {
            player.sendMessage("§7Keine aktiven Sessions");
          } else {
            activeSessions.slice(-5).forEach(key => {
              const session = playerSessionDb.get(key);
              if (session) {
                const loginTime = new Date(session.loginTime);
                const uptime = Math.round((Date.now() - loginTime.getTime()) / 1000);
                player.sendMessage(`§aSpieler: §7${session.playerName}`);
                player.sendMessage(`§aWelt: §7${session.worldId}`);
                player.sendMessage(`§aUptime: §7${uptime}s`);
                player.sendMessage("§7");
              }
            });
          }
        } catch (e) {
          player.sendMessage("§cKeine Session-Daten verfügbar");
        }

        player.sendMessage("§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        break;

      case "clear":
        // Cleane alte IPC-Nachrichten
        player.sendMessage("§a⏳ Clearing old IPC messages...");
        try {
          let cleared = 0;
          const keys = ipcMessagesDb.keys?.() || [];
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

          keys.forEach(key => {
            const msg = ipcMessagesDb.get(key);
            if (msg && msg.timestamp < fiveMinutesAgo && msg.processed) {
              try {
                ipcMessagesDb.delete(key);
                cleared++;
              } catch (e) {
                // Ignore delete errors
              }
            }
          });

          player.sendMessage(`§a✓ ${cleared} alte Nachrichten gelöscht!`);
        } catch (e) {
          player.sendMessage(`§c✗ Fehler beim Cleanen: ${e}`);
        }
        break;

      default:
        player.sendMessage("§c╔════════════════════════════════╗");
        player.sendMessage("§c║  SYNCDEBUG - HILFE             ║");
        player.sendMessage("§c╠════════════════════════════════╣");
        player.sendMessage(`§c║  ${bridge.bedrockCommands.prefix}syncdebug ipc        - IPC Queue Status║`);
        player.sendMessage(`§c║  ${bridge.bedrockCommands.prefix}syncdebug conflicts  - Konflikt-History   ║`);
        player.sendMessage(`§c║  ${bridge.bedrockCommands.prefix}syncdebug sessions   - Aktive Sessions    ║`);
        player.sendMessage(`§c║  ${bridge.bedrockCommands.prefix}syncdebug clear      - Cleanup alte Msgs  ║`);
        player.sendMessage("§c╚════════════════════════════════╝");
    }
  } catch (e) {
    player.sendMessage(`§c✗ Debug-Fehler: ${e}`);
    log(`Debug command error: ${e}`, "error");
  }
}, "🔧 IPC Debugging & Monitoring Tools");

// ALIAS-COMMAND: Schnelle Infos
bridge.bedrockCommands.registerCommand("transfer", (player, ...args) => {
  player.sendMessage("§a💡 Tipp:");
  player.sendMessage(`§7In v2.0 transferierst du automatisch!`);
  player.sendMessage(`§7Einfach auf einen anderen Server joinen.`);
  player.sendMessage("§7");
  player.sendMessage(`§7Für mehr Infos: ${bridge.bedrockCommands.prefix}sync help`);
}, "🚀 Schnelle Übersicht zum Transferieren");

    console.log("[CrossServerSyncV2] ✅ Alle BedrockBridge Commands registriert");
    return true;
  } catch (e) {
    console.error(`[CrossServerSyncV2] ❌ Fehler beim Registrieren der Commands: ${e}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS - AUTOMATIC SYNC TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

world.afterEvents.playerSpawn.subscribe(event => {
  try {
    const player = event.player;

    if (config.syncOnLogin) {
      // Automatisch Daten vom letzten Server laden - GLOBALES INVENTAR
      log(`Player Spawn (Auto-Sync Trigger): ${player.name}`, "success");

      system.runTimeout(async () => {
        // 1. Verarbeite ausstehende IPC-Nachrichten BEVOR Daten wiederhergestellt werden
        // (um sicherzustellen, dass wir die neuesten Daten von anderen Welten haben)
        InterPluginCommunicationProtocol.receiveAndProcessMessages();

        // ✨ NEUE FUNKTION: Erstelle neue Session und prüfe auf Duplikate
        const worldId = world.getDimension("overworld").name || "unknown";
        const sessionId = SessionManager.createSession(player.name, worldId);

        if (!sessionId) {
          log(`❌ Session-Erstellung fehlgeschlagen für ${player.name}`, "error");
          player.sendMessage("§c⚠️ Fehler bei der Session-Initialisierung!");
          return;
        }

        // 2. Prüfe ob Spieler bereits in anderer Session aktiv ist
        const existingSession = SessionManager.hasActiveSession(player.name);
        if (existingSession && existingSession.sessionId !== sessionId) {
          log(`🔒 DOPPEL-SESSION ERKANNT: ${player.name} ist bereits in ${existingSession.worldId} aktiv!`, "warn");
          player.sendMessage("§c⚠️ ❌ DU BIST BEREITS IN EINER ANDEREN WELT AKTIV!");
          player.sendMessage("§c⚠️ Die Daten werden nicht geladen um Verlust zu verhindern.");
          player.sendMessage("§c⚠️ Bitte verlasse die andere Welt zuerst.");
          SessionManager.endSession(sessionId, player.name);
          return;
        }

        // 3. Stelle GLOBALES Inventar & XP wieder her
        if (config.syncInventory) {
          // Update sync state: entering restore phase
          PlayerSyncStateMachine.setState(player.name, "restoring", {
            phase: "inventory",
            loginTime: new Date().toISOString()
          });

          const restored = InventorySyncManager.restoreInventory(player.name, "global");
          if (restored) {
            player.sendMessage("§a✓ Dein Inventar wurde wiederhergestellt!");
            log(`Inventar restored for ${player.name}`, "success");
          }
        }

        if (config.syncXP) {
          // Update sync state: xp phase
          PlayerSyncStateMachine.setState(player.name, "restoring", {
            phase: "xp",
            loginTime: new Date().toISOString()
          });

          const xpRestored = XPSyncManager.restoreXP(player.name, "global");
          if (xpRestored) {
            player.sendMessage("§a✓ Dein Level & XP wurden wiederhergestellt!");
            log(`XP restored for ${player.name}`, "success");
          }
        }

        // 4. Sync completed - send notification to other worlds
        InterPluginCommunicationProtocol.sendMessage("player_sync", {
          playerName: player.name,
          action: "login",
          timestamp: new Date().toISOString(),
          syncType: "inventory_xp",
          status: "completed"
        }, "high");

        // 5. Update final state to idle (ready for next sync)
        PlayerSyncStateMachine.setState(player.name, "idle", {
          lastLoginTime: new Date().toISOString(),
          lastSyncedInventory: new Date().toISOString(),
          lastSyncedXP: new Date().toISOString()
        });

        // 6. Bestätigungs-Nachricht
        player.sendMessage("§a✓ Willkommen! Deine Daten wurden automatisch synchronisiert!");
      }, 100);
    }
  } catch (e) {
    log(`Spawn event error: ${e}`, "error");
  }
});

world.beforeEvents.playerLeave.subscribe(event => {
  try {
    const player = event.player;

    if (config.syncOnLogout) {
      // Automatisch Daten speichern - GLOBALES INVENTAR
      log(`Player Leave (Auto-Sync Trigger): ${player.name}`, "success");

      // 1. Update sync state to syncing
      PlayerSyncStateMachine.setState(player.name, "syncing", {
        phase: "logout_sync",
        logoutTime: new Date().toISOString()
      });

      // 2. Speichere globales Inventar (nicht pro Welt!)
      // ✨ NEUE FUNKTION: Speichert AUCH in externe DB mit allen Details
      InventorySyncManager.saveInventory(player.name, "global");

      // 3. Speichere globales XP
      XPSyncManager.saveXP(player.name, "global");

      // 4. ✨ NEUE FUNKTION: Beende Session ordnungsgemäß
      const activeSessions = SessionManager.activeSessions;
      let endedSessionId = null;
      activeSessions.forEach((session, playerName) => {
        if (playerName === player.name) {
          endedSessionId = session.sessionId;
          SessionManager.endSession(session.sessionId, player.name);
        }
      });

      if (endedSessionId) {
        log(`✅ Session beendet beim Logout: ${player.name}`, "success");
      }

      // 5. Sende Logout-Notification zu anderen Welten
      InterPluginCommunicationProtocol.sendMessage("player_sync", {
        playerName: player.name,
        action: "logout",
        timestamp: new Date().toISOString(),
        syncType: "inventory_xp",
        status: "saved",
        lastInventoryHash: InventorySyncManager.getInventoryHash?.(player.name) || "unknown",
        lastXPLevel: player.level || 0,
        sessionId: endedSessionId
      }, "high");

      // 6. Update session to offline (als Fallback)
      const dbActiveSessions = playerSessionDb.keys?.() || [];
      dbActiveSessions.forEach(sessionKey => {
        try {
          const session = playerSessionDb.get(sessionKey);
          if (session && session.playerName === player.name) {
            playerSessionDb.set(sessionKey, {
              ...session,
              status: "offline",
              logoutTime: new Date().toISOString()
            });
          }
        } catch (e) {
          // Ignore session update errors
        }
      });

      // 6. Final state: idle
      PlayerSyncStateMachine.setState(player.name, "idle", {
        lastLogoutTime: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        status: "offline"
      });

      player.sendMessage("§a✓ Dein Inventar wurde gespeichert!");
    }
  } catch (e) {
    log(`Leave event error: ${e}`, "error");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PERIODIC AUTO-SYNC
// ═══════════════════════════════════════════════════════════════════════════════════════════════

if (config.autoSyncEnabled) {
  system.runInterval(() => {
    try {
      // 1. Verarbeite ausstehende IPC-Nachrichten von anderen Welten
      InterPluginCommunicationProtocol.receiveAndProcessMessages();

      // ✨ NEUE FUNKTION: Bereinige alte Sessions alle 30 Sekunden
      SessionManager.cleanupOldSessions();

      // ✨ NEUE FUNKTION: Aktualisiere Activity für alle aktiven Spieler-Sessions
      world.getAllPlayers().forEach(player => {
        SessionManager.updateActivity(player.name);
      });

      // 2. Periodic player sync
      world.getAllPlayers().forEach(player => {
        const lastSync = playerLastSync.get(player.name);
        const now = Date.now();

        // Synche wenn genug Zeit vergangen ist - GLOBALES INVENTAR
        if (!lastSync || (now - lastSync) > (config.autoSyncInterval * 1000)) {
          if (config.syncInventory) {
            // Speichere globales Inventar (wird überall gleich sein)
            // ✨ Speichert AUCH in externe DB
            InventorySyncManager.saveInventory(player.name, "global");
          }
          if (config.syncXP) {
            // Speichere globales XP
            XPSyncManager.saveXP(player.name, "global");
          }

          // Send sync notification to other worlds
          InterPluginCommunicationProtocol.sendMessage("player_sync", {
            playerName: player.name,
            action: "periodic_sync",
            timestamp: new Date().toISOString(),
            syncType: config.syncInventory && config.syncXP ? "inventory_xp" : (config.syncInventory ? "inventory" : "xp")
          }, "normal");

          playerLastSync.set(player.name, now);
          log(`Periodic Auto-Sync (Globales Inventar): ${player.name}`, "success");
        }
      });
    } catch (e) {
      log(`Periodic sync error: ${e}`, "error");
    }
  }, config.autoSyncInterval * 20); // Konvertiere zu Ticks
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WORLD HEARTBEAT SYSTEM - Sends heartbeat every 30 seconds to announce this world is online
// ═══════════════════════════════════════════════════════════════════════════════════════════════

if (config.autoSyncEnabled) {
  system.runInterval(() => {
    try {
      // Initialize world heartbeat (nur beim Start)
      WorldCommunicationLayer.initializeWorldHeartbeat();

      // Check remote world status
      WorldCommunicationLayer.checkRemoteWorldStatus();

      // Notify world status
      const onlinePlayers = world.getAllPlayers().length;
      WorldCommunicationLayer.notifyWorldStatus(
        world.getDimension("overworld").name || "unknown",
        "online",
        {
          onlinePlayers: onlinePlayers,
          timestamp: new Date().toISOString(),
          version: PLUGIN_VERSION,
          features: {
            inventorySync: config.syncInventory,
            xpSync: config.syncXP,
            ipcEnabled: true
          }
        }
      );

      log(`World heartbeat sent - ${onlinePlayers} players online`, "success");
    } catch (e) {
      log(`World heartbeat error: ${e}`, "error");
    }
  }, 30 * 20); // Send heartbeat every 30 seconds (600 ticks)
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INITIALISIERUNGSFUNKTION MIT VOLLSTÄNDIGER FEHLERBEHANDLUNG
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function initializePlugin() {
  try {
    console.log("[CrossServerSyncV2] 🚀 Plugin-Initialisierung wird gestartet...");

    // 1. Überprüfe ob alle kritischen Komponenten verfügbar sind
    if (!system) throw new Error("system ist nicht verfügbar");
    if (!world) throw new Error("world ist nicht verfügbar");
    if (!database) throw new Error("database ist nicht verfügbar");

    // Optional: Überprüfe bridge (ist nice-to-have, nicht kritisch)
    if (!bridge) {
      console.warn("[CrossServerSyncV2] ⚠️ bridge ist nicht verfügbar - Commands werden nicht registriert");
    }

    // 2. Initialisiere alle Datenbanken
    console.log("[CrossServerSyncV2] 📦 Initialisiere Datenbanken...");
    const dbInitialized = initializeDatabases();
    if (!dbInitialized) {
      throw new Error("Datenbankinitialisierung fehlgeschlagen");
    }

    // 3. Registriere BedrockBridge Commands
    console.log("[CrossServerSyncV2] 🎮 Registriere BedrockBridge Commands...");
    try {
      const commandsRegistered = registerCommands();
      if (!commandsRegistered) {
        console.warn("[CrossServerSyncV2] ⚠️ Commands konnten nicht vollständig registriert werden");
      }
    } catch (e) {
      console.warn(`[CrossServerSyncV2] ⚠️ Fehler beim Registrieren der Commands: ${e}`);
    }

    // 4. Initialisiere Welt-Verbindungen
    console.log("[CrossServerSyncV2] 🌍 Initialisiere Welt-Verbindungen...");
    try {
      WorldConnectionManager.initializeWorlds();
    } catch (e) {
      console.warn(`[CrossServerSyncV2] ⚠️ WorldConnectionManager konnte nicht vollständig initialisiert werden: ${e}`);
    }

    // 5. Starte periodische Sync-Jobs
    console.log("[CrossServerSyncV2] ⏱️ Starte periodische Sync-Jobs...");
    if (config.autoSyncEnabled) {
      system.runInterval(() => {
        try {
          const onlinePlayers = world.getAllPlayers();
          if (onlinePlayers.length > 0) {
            InterPluginCommunicationProtocol.receiveAndProcessMessages();
            log(`IPC: ${ipcMessageQueue.size} ausstehende Nachrichten`, "info");
          }
        } catch (e) {
          console.error(`[CrossServerSyncV2] ❌ IPC Error: ${e}`);
        }
      }, 5 * 20); // Alle 5 Sekunden prüfen
    }

    // 6. Sende Discord-Benachrichtigung
    console.log("[CrossServerSyncV2] 📨 Sende Discord-Benachrichtigung...");
    try {
      sendDiscordEmbed(
        "Cross-Server Sync v2.0 Gestartet",
        `**🌐 Automatisches Welt-Synchronisations-System aktiv**\n\n` +
        `✅ Inventar-Sync: ${config.syncInventory ? "Aktiv" : "Aus"}\n` +
        `✅ XP-Sync: ${config.syncXP ? "Aktiv" : "Aus"}\n` +
        `✅ Auto-Sync Interval: ${config.autoSyncInterval}s\n` +
        `✅ Welten verbunden: ${worldConnections.size}`,
        0x00ff00
      );
    } catch (e) {
      console.warn(`[CrossServerSyncV2] ⚠️ Discord-Benachrichtigung fehlgeschlagen: ${e}`);
    }

    // 7. Ausgabe auf der Konsole
    console.log("\n╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║              🌐 CROSS-SERVER SYNC v2.0 - PRODUCTION READY                ║");
    console.log("╠════════════════════════════════════════════════════════════════════════════╣");
    console.log("║  ✅ Automatische Inventar-Synchronisation                                 ║");
    console.log("║  ✅ Automatische XP/Level-Synchronisation                                 ║");
    console.log("║  ✅ Inter-Plugin Communication System                                      ║");
    console.log("║  ✅ Welt-Verbindungs-Management                                           ║");
    console.log("║  ✅ Automatische Trigger (Login/Logout)                                   ║");
    console.log("║  ✅ Periodische Hintergrund-Synchronisation                               ║");
    console.log("║  ✅ Admin-Panel zur Verwaltung                                            ║");
    console.log("║                                                                            ║");
    if (bridge?.bedrockCommands) {
      const prefix = bridge.bedrockCommands.prefix || "!";
      console.log(`║  Befehle: ${prefix}sync / ${prefix}syncadmin / ${prefix}syncdebug                          ║`);
    }
    console.log("║                                                                            ║");
    console.log("║  ✅ PLUGIN VOLLSTÄNDIG INITIALISIERT                                      ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

    console.log("[CrossServerSyncV2] ✅ Plugin erfolgreich initialisiert!");
    return true;

  } catch (e) {
    console.error(`[CrossServerSyncV2] ❌ KRITISCHER FEHLER WÄHREND INITIALISIERUNG: ${e}`);
    if (e.stack) console.error(`[CrossServerSyncV2] Stack: ${e.stack}`);
    return false;
  }
}

// Starte die Initialisierung sofort mit Fehlerbehandlung
try {
  system.runTimeout(() => {
    try {
      initializePlugin();
    } catch (e) {
      console.error(`[CrossServerSyncV2] ❌ UNERWARTETER FEHLER IN INITIALIZATION: ${e}`);
    }
  }, 5);
} catch (e) {
  console.error(`[CrossServerSyncV2] ❌ KRITISCHER FEHLER: system.runTimeout nicht verfügbar: ${e}`);
}

export { AutoSyncOrchestrator, WorldConnectionManager, InventorySyncManager, XPSyncManager, PluginCommunicationManager };
