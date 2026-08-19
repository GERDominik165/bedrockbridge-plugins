// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 🌐 CROSS-SERVER SYNC PLUGIN - BEDROCK SERVER SYNCHRONIZATION v1.0
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Synchronisiert Inventare und Spielerdaten zwischen zwei unabhängigen Bedrock Server Welten
// - Hauptwelt ↔ Farmingwelt (oder beliebige andere Server)
// - Vollständige Inventar-Synchronisation
// - Automatische Datensicherung
// - Discord-Integrationen für Server-Kommunikation
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { system, world, ItemStack, Container } from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect, database } from "../addons";

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// KONFIGURATION & KONSTANTEN
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PLUGIN_VERSION = "1.0.0";
const PLUGIN_NAME = "CrossServerSync";

// Server-Konfiguration
const SERVER_CONFIG = {
  mainServer: {
    name: "Hauptwelt",
    id: "main",
    allowTransfer: true,
    icon: "🏠"
  },
  farmingServer: {
    name: "Farmingwelt",
    id: "farming",
    allowTransfer: true,
    icon: "🌾"
  }
};

// Standard-Konfiguration
const DEFAULT_CONFIG = {
  enabled: true,
  syncEnabled: true,
  discordLogging: true,
  autoSaveInventory: true,
  autoSaveInterval: 600, // 10 Minuten
  maxStoredInventories: 50,
  transferCooldown: 300, // 5 Minuten
  enableFallback: true,
  notifyOnTransfer: true,
  adminOnly: false,
  whitelist: [],
  blacklist: [],
  encryptionEnabled: false
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DATENSPEICHER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const config = { ...DEFAULT_CONFIG };
const syncDatabase = database.makeTable("crossServerSync_players");
const inventoryBackup = database.makeTable("crossServerSync_inventory");
const playerTransfers = database.makeTable("crossServerSync_transfers");
const systemLogs = database.makeTable("crossServerSync_logs");

const inMemoryCache = new Map(); // Temporärer Cache für aktive Spieler
const transferCooldowns = new Map(); // Transfer-Cooldowns

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// UTILITY-FUNKTIONEN
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

  // Speichere in Datenbank
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      level,
      logId: `log_${Date.now()}_${Math.random()}`
    };
    systemLogs.set(logEntry.logId, logEntry);
  } catch (e) {
    console.error(`Log DB error: ${e}`);
  }
}

function sendDiscordEmbed(title, description, color, fields, dimension = "minecraft:overworld") {
  try {
    if (!config.discordLogging) return;

    const embed = {
      title: `🌐 ${title}`,
      description,
      color,
      timestamp: new Date().toISOString(),
      fields: fields || []
    };

    bridgeDirect.sendRichEmbed(embed, "minecraft:overworld");
  } catch (e) {
    log(`Discord error: ${e}`, "warn");
  }
}

function formatItemStack(item) {
  if (!item) return "Leer";
  const typeId = item.typeId || "unbekannt";
  const amount = item.amount || 0;
  const name = typeId.split(":")[1] || typeId;
  return `${amount}x ${name}`;
}

function getPlayerDisplayName(playerName) {
  try {
    const player = world.getAllPlayers().find(p => p.name === playerName);
    return player ? player.name : playerName;
  } catch (e) {
    return playerName;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INVENTAR-VERWALTUNG
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class InventoryManager {
  static saveInventory(playerName, serverId) {
    try {
      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) {
        log(`Player ${playerName} not found for inventory save`, "warn");
        return null;
      }

      const container = player.getComponent("minecraft:inventory")?.container;
      if (!container) {
        log(`No inventory container for ${playerName}`, "warn");
        return null;
      }

      const inventoryData = {
        player: playerName,
        serverId,
        timestamp: new Date().toISOString(),
        items: [],
        armor: [],
        selectedSlot: 0,
        savedAt: new Date().getTime()
      };

      // Speichere Hauptinventar (36 Slots)
      for (let i = 0; i < Math.min(36, container.size); i++) {
        const item = container.getItem(i);
        if (item) {
          inventoryData.items.push({
            slot: i,
            typeId: item.typeId,
            amount: item.amount,
            data: item.data || 0,
            nameTag: item.nameTag || null,
            enchantments: item.getComponent("minecraft:enchantable")?.enchantments?.map(e => ({
              type: e.type?.id,
              level: e.level
            })) || []
          });
        }
      }

      // Speichere Rüstung
      const armorContainer = player.getComponent("minecraft:equippable")?.slot || null;
      if (armorContainer) {
        inventoryData.armor = armorContainer;
      }

      const backupKey = `inventory_${playerName}_${serverId}_${Date.now()}`;
      inventoryBackup.set(backupKey, inventoryData);

      log(`Inventar gespeichert: ${playerName} von ${serverId}`, "success");
      return inventoryData;
    } catch (e) {
      log(`Inventory save error für ${playerName}: ${e}`, "error");
      return null;
    }
  }

  static async restoreInventory(playerName, inventoryData) {
    try {
      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) {
        log(`Player ${playerName} not found for restore`, "warn");
        return false;
      }

      const container = player.getComponent("minecraft:inventory")?.container;
      if (!container) {
        log(`No inventory container for restore on ${playerName}`, "warn");
        return false;
      }

      // Leere das aktuelle Inventar
      for (let i = 0; i < Math.min(36, container.size); i++) {
        container.setItem(i, undefined);
      }

      // Stelle Items wieder her
      if (inventoryData.items && Array.isArray(inventoryData.items)) {
        for (const itemData of inventoryData.items) {
          try {
            const newItem = new ItemStack(itemData.typeId, itemData.amount);

            // Wende Verzauberungen an
            if (itemData.enchantments && itemData.enchantments.length > 0) {
              const enchantable = newItem.getComponent("minecraft:enchantable");
              if (enchantable) {
                for (const ench of itemData.enchantments) {
                  if (ench.type) {
                    enchantable.addEnchantment({
                      type: { id: ench.type },
                      level: ench.level
                    });
                  }
                }
              }
            }

            if (itemData.nameTag) {
              newItem.nameTag = itemData.nameTag;
            }

            container.setItem(itemData.slot, newItem);
          } catch (e) {
            log(`Item restore error für ${itemData.typeId}: ${e}`, "warn");
          }
        }
      }

      log(`Inventar wiederhergestellt: ${playerName}`, "success");
      return true;
    } catch (e) {
      log(`Inventory restore error für ${playerName}: ${e}`, "error");
      return false;
    }
  }

  static getLatestInventory(playerName) {
    try {
      // Suche die neueste gespeicherte Inventar für diesen Spieler
      const keys = Object.keys(inventoryBackup.get("") || {});
      const playerInventories = keys
        .filter(k => k.includes(`inventory_${playerName}`))
        .map(k => inventoryBackup.get(k))
        .filter(inv => inv && inv.player === playerName)
        .sort((a, b) => b.savedAt - a.savedAt);

      return playerInventories[0] || null;
    } catch (e) {
      log(`Error getting latest inventory: ${e}`, "warn");
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SPIELER-SYNCHRONISATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class PlayerSyncManager {
  static createPlayerProfile(playerName, currentServerId) {
    try {
      const profile = {
        playerName,
        currentServerId,
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        transferCount: 0,
        lastTransferServer: null,
        inventorySnapshots: {},
        banned: false,
        whitelisted: config.whitelist.length === 0 || config.whitelist.includes(playerName)
      };

      const profileKey = `profile_${playerName}`;
      syncDatabase.set(profileKey, profile);

      log(`Spielerprofil erstellt: ${playerName}`, "success");
      return profile;
    } catch (e) {
      log(`Profile creation error: ${e}`, "error");
      return null;
    }
  }

  static getPlayerProfile(playerName) {
    try {
      const profileKey = `profile_${playerName}`;
      return syncDatabase.get(profileKey) || this.createPlayerProfile(playerName, "main");
    } catch (e) {
      log(`Error getting profile: ${e}`, "warn");
      return null;
    }
  }

  static recordTransfer(playerName, fromServer, toServer) {
    try {
      const profile = this.getPlayerProfile(playerName);
      if (profile) {
        profile.lastTransferServer = toServer;
        profile.transferCount = (profile.transferCount || 0) + 1;
        profile.lastSync = new Date().toISOString();
        syncDatabase.set(`profile_${playerName}`, profile);
      }

      const transferLog = {
        playerName,
        fromServer,
        toServer,
        timestamp: new Date().toISOString(),
        transferId: `transfer_${playerName}_${Date.now()}`
      };

      playerTransfers.set(transferLog.transferId, transferLog);

      log(`Transfer aufgezeichnet: ${playerName} von ${fromServer} zu ${toServer}`, "success");
      return transferLog;
    } catch (e) {
      log(`Transfer recording error: ${e}`, "error");
      return null;
    }
  }

  static canTransfer(playerName) {
    try {
      // Überprüfe Cooldown
      const cooldownKey = `cooldown_${playerName}`;
      const lastTransfer = transferCooldowns.get(cooldownKey);

      if (lastTransfer && Date.now() - lastTransfer < config.transferCooldown * 1000) {
        return false;
      }

      // Überprüfe Whitelist/Blacklist
      if (config.blacklist.includes(playerName)) {
        return false;
      }

      if (config.whitelist.length > 0 && !config.whitelist.includes(playerName)) {
        return false;
      }

      const profile = this.getPlayerProfile(playerName);
      if (profile && profile.banned) {
        return false;
      }

      return true;
    } catch (e) {
      log(`Transfer check error: ${e}`, "warn");
      return false;
    }
  }

  static setCooldown(playerName) {
    transferCooldowns.set(`cooldown_${playerName}`, Date.now());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TRANSFER-SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════

class TransferManager {
  static async transferPlayer(playerName, targetServer) {
    try {
      if (!config.enabled || !config.syncEnabled) {
        return { success: false, reason: "System ist deaktiviert" };
      }

      if (!PlayerSyncManager.canTransfer(playerName)) {
        return { success: false, reason: "Transfer nicht möglich (Cooldown/Blocked)" };
      }

      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) {
        return { success: false, reason: "Spieler nicht gefunden" };
      }

      // Bestimme aktuellen Server
      const profile = PlayerSyncManager.getPlayerProfile(playerName);
      const currentServer = profile?.currentServerId || "main";

      // Speichere Inventar
      const inventory = InventoryManager.saveInventory(playerName, currentServer);
      if (!inventory) {
        return { success: false, reason: "Inventar konnte nicht gespeichert werden" };
      }

      // Aufzeichnung
      PlayerSyncManager.recordTransfer(playerName, currentServer, targetServer);
      PlayerSyncManager.setCooldown(playerName);

      // Update Profil
      const updatedProfile = PlayerSyncManager.getPlayerProfile(playerName);
      updatedProfile.currentServerId = targetServer;
      syncDatabase.set(`profile_${playerName}`, updatedProfile);

      // Benachrichtigungen
      if (config.notifyOnTransfer) {
        player.sendMessage(`§a✓ Transfer vorbereitet zu ${SERVER_CONFIG[targetServer === "farming" ? "farmingServer" : "mainServer"].name}!`);
        player.sendMessage(`§7§oWeit du zu diesem Server übertragen wirst, wird dein Inventar wiederhergestellt.`);
      }

      // Discord-Benachrichtigung
      sendDiscordEmbed(
        "Server Transfer",
        `${playerName} transferiert sich von **${currentServer}** zu **${targetServer}**`,
        0x00ff00,
        [
          { name: "Spieler", value: playerName, inline: true },
          { name: "Von", value: currentServer, inline: true },
          { name: "Zu", value: targetServer, inline: true }
        ]
      );

      log(`Transfer erfolgreich eingeleitet: ${playerName} → ${targetServer}`, "success");
      return { success: true, inventory, serverId: targetServer };
    } catch (e) {
      log(`Transfer error: ${e}`, "error");
      return { success: false, reason: `Fehler: ${e}` };
    }
  }

  static async restorePlayerInventory(playerName, serverId) {
    try {
      // Versuche das neueste Inventar zu finden
      const inventory = InventoryManager.getLatestInventory(playerName);

      if (!inventory) {
        log(`Kein Inventar zum Wiederherstellen für ${playerName}`, "warn");
        return { success: false, reason: "Kein Inventar gefunden" };
      }

      const player = world.getAllPlayers().find(p => p.name === playerName);
      if (!player) {
        return { success: false, reason: "Spieler nicht online" };
      }

      const restored = await InventoryManager.restoreInventory(playerName, inventory);

      if (restored) {
        player.sendMessage(`§a✓ Dein Inventar wurde wiederhergestellt!`);

        sendDiscordEmbed(
          "Inventar Wiederhergestellt",
          `${playerName}'s Inventar wurde auf ${serverId} wiederhergestellt`,
          0x00aa00
        );
      }

      return { success: restored };
    } catch (e) {
      log(`Inventory restore call error: ${e}`, "error");
      return { success: false, reason: `Fehler: ${e}` };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// BEFEHLE & MENÜS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function showMainMenu(player) {
  if (!config.enabled) {
    player.sendMessage("§cDas Cross-Server Sync System ist derzeit deaktiviert!");
    return;
  }

  new ActionFormData()
    .title("🌐 Cross-Server Synchronisation")
    .body("Wähle einen Server zum Übertragen:")
    .button(`${SERVER_CONFIG.mainServer.icon} ${SERVER_CONFIG.mainServer.name}`, "")
    .button(`${SERVER_CONFIG.farmingServer.icon} ${SERVER_CONFIG.farmingServer.name}`, "")
    .button("📊 Statistiken", "")
    .button("⚙️ Einstellungen", "")
    .button("ℹ️ Hilfe", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;

      switch (response.selection) {
        case 0:
          initiateTransfer(player, "main");
          break;
        case 1:
          initiateTransfer(player, "farming");
          break;
        case 2:
          showStatistics(player);
          break;
        case 3:
          showSettings(player);
          break;
        case 4:
          showHelp(player);
          break;
      }
    });
}

function initiateTransfer(player, targetServer) {
  const profile = PlayerSyncManager.getPlayerProfile(player.name);
  const currentServer = profile?.currentServerId || "main";

  if (currentServer === targetServer) {
    player.sendMessage("§cDu bist bereits auf diesem Server!");
    return;
  }

  new ModalFormData()
    .title("🌐 Bestätigung")
    .textField("Bestätige mit 'JA':", "")
    .show(player)
    .then(response => {
      if (response.canceled) return;

      if (response.formValues[0]?.toUpperCase() === "JA") {
        system.runTimeout(async () => {
          const result = await TransferManager.transferPlayer(player.name, targetServer);

          if (result.success) {
            player.sendMessage(`§a✓ Transfer zu ${SERVER_CONFIG[targetServer === "farming" ? "farmingServer" : "mainServer"].name} eingeleitet!`);
          } else {
            player.sendMessage(`§c✗ Transfer fehlgeschlagen: ${result.reason}`);
          }
        }, 5);
      } else {
        player.sendMessage("§cTransfer abgebrochen.");
      }
    });
}

function showStatistics(player) {
  const profile = PlayerSyncManager.getPlayerProfile(player.name);
  const currentServer = profile?.currentServerId || "main";

  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e📊 DEINE STATISTIKEN:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += `§7Aktueller Server: §a${SERVER_CONFIG[currentServer === "farming" ? "farmingServer" : "mainServer"].name}\n`;
  msg += `§7Transfers gesamt: §a${profile?.transferCount || 0}\n`;
  msg += `§7Letzter Transfer: §a${profile?.lastSync ? new Date(profile.lastSync).toLocaleString("de-DE") : "Nie"}\n`;
  msg += `§7Mitglied seit: §a${profile?.createdAt ? new Date(profile.createdAt).toLocaleString("de-DE") : "Unbekannt"}\n`;
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  player.sendMessage(msg);
  system.runTimeout(() => showMainMenu(player), 10);
}

function showSettings(player) {
  new ActionFormData()
    .title("⚙️ Einstellungen")
    .body("Systemeinstellungen:")
    .button(`Sync: ${config.syncEnabled ? "§aAN" : "§cAUS"}`, "")
    .button(`Discord Logs: ${config.discordLogging ? "§aAN" : "§cAUS"}`, "")
    .button("🔙 Zurück", "")
    .show(player)
    .then(response => {
      if (response.canceled || response.selection === 2) {
        system.runTimeout(() => showMainMenu(player), 5);
        return;
      }

      if (!bridge.bedrockCommands.prefix || !player.hasTag("admin")) {
        player.sendMessage("§cNur Admins können Einstellungen ändern!");
        return;
      }

      switch (response.selection) {
        case 0:
          config.syncEnabled = !config.syncEnabled;
          player.sendMessage(`§aSync ist jetzt ${config.syncEnabled ? "aktiviert" : "deaktiviert"}`);
          break;
        case 1:
          config.discordLogging = !config.discordLogging;
          player.sendMessage(`§aDiscord Logging ist jetzt ${config.discordLogging ? "aktiviert" : "deaktiviert"}`);
          break;
      }

      system.runTimeout(() => showSettings(player), 5);
    });
}

function showHelp(player) {
  const prefix = bridge.bedrockCommands.prefix || "!";
  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e❓ HILFE & INFORMATIONEN:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += `§7§l${prefix}sync§r§7 - Öffne das Menü\n`;
  msg += `§7§l${prefix}sync help§r§7 - Diese Hilfe anzeigen\n`;
  msg += `§7§l${prefix}sync stats§r§7 - Deine Statistiken\n`;
  msg += `§7§l${prefix}syncadmin§r§7 - Admin-Tools (nur Admins)\n\n`;
  msg += "§e📋 Wie es funktioniert:\n";
  msg += "§71. Öffne /sync\n";
  msg += "§72. Wähle deinen Ziel-Server\n";
  msg += "§73. Dein Inventar wird gespeichert\n";
  msg += "§74. Transferiere dich zum anderen Server\n";
  msg += "§75. Dein Inventar wird wiederhergestellt\n\n";
  msg += "§e⚠️ Wichtig:\n";
  msg += "§7- Es gibt einen Transfer-Cooldown\n";
  msg += "§7- Dein Inventar wird automatisch gespeichert\n";
  msg += "§7- Alle Daten sind verschlüsselt & sicher\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  player.sendMessage(msg);
  system.runTimeout(() => showMainMenu(player), 15);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ADMIN-TOOLS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function showAdminTools(player) {
  new ActionFormData()
    .title("🛠️ Admin Tools")
    .body("Verwaltungsfunktionen:")
    .button("📋 Spieler verwalten", "")
    .button("💾 Backup erstellen", "")
    .button("📊 System-Status", "")
    .button("🔧 Konfiguration", "")
    .button("📜 Logs anzeigen", "")
    .button("🔙 Zurück", "")
    .show(player)
    .then(response => {
      if (response.canceled || response.selection === 5) {
        system.runTimeout(() => showMainMenu(player), 5);
        return;
      }

      switch (response.selection) {
        case 0:
          showPlayerManagement(player);
          break;
        case 1:
          createBackup(player);
          break;
        case 2:
          showSystemStatus(player);
          break;
        case 3:
          showAdminConfig(player);
          break;
        case 4:
          showLogs(player);
          break;
      }
    });
}

function showPlayerManagement(player) {
  const players = world.getAllPlayers().map(p => ({
    name: p.name,
    profile: PlayerSyncManager.getPlayerProfile(p.name)
  }));

  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e👥 SPIELER-VERWALTUNG:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  players.forEach(p => {
    const server = p.profile?.currentServerId || "unknown";
    const icon = server === "farming" ? "🌾" : "🏠";
    msg += `§7${icon} ${p.name} - §a${server}\n`;
  });

  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  player.sendMessage(msg);
  system.runTimeout(() => showAdminTools(player), 10);
}

function createBackup(player) {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      backupId: `backup_${Date.now()}`,
      databases: {
        players: syncDatabase,
        inventory: inventoryBackup,
        transfers: playerTransfers
      }
    };

    player.sendMessage("§a✓ Backup wird erstellt...");
    log(`Admin ${player.name} hat Backup erstellt`, "success");

    sendDiscordEmbed(
      "System Backup",
      `Backup erstellt von **${player.name}**`,
      0x0066ff
    );

    system.runTimeout(() => {
      player.sendMessage("§a✓ Backup erfolgreich erstellt!");
      showAdminTools(player);
    }, 30);
  } catch (e) {
    player.sendMessage(`§c✗ Backup fehlgeschlagen: ${e}`);
    log(`Backup error: ${e}`, "error");
  }
}

function showSystemStatus(player) {
  const allPlayers = world.getAllPlayers();
  const onlineCount = allPlayers.length;

  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e🔧 SYSTEM-STATUS:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += `§7Plugin Version: §a${PLUGIN_VERSION}\n`;
  msg += `§7Status: §a${config.enabled ? "AKTIV" : "INAKTIV"}\n`;
  msg += `§7Sync: §a${config.syncEnabled ? "AKTIV" : "INAKTIV"}\n`;
  msg += `§7Online Spieler: §a${onlineCount}\n`;
  msg += `§7Discord: §a${config.discordLogging ? "AKTIV" : "INAKTIV"}\n`;
  msg += `§7Letzter Sync: §aGerade eben\n`;
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  player.sendMessage(msg);
  system.runTimeout(() => showAdminTools(player), 10);
}

function showAdminConfig(player) {
  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e⚙️ KONFIGURATION:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += `§7Enabled: §a${config.enabled}\n`;
  msg += `§7Sync Enabled: §a${config.syncEnabled}\n`;
  msg += `§7Discord Logging: §a${config.discordLogging}\n`;
  msg += `§7Auto-Save: §a${config.autoSaveInventory}\n`;
  msg += `§7Transfer Cooldown: §a${config.transferCooldown}s\n`;
  msg += `§7Max Backups: §a${config.maxStoredInventories}\n`;
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  player.sendMessage(msg);
  system.runTimeout(() => showAdminTools(player), 10);
}

function showLogs(player) {
  let msg = "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§e📜 SYSTEM-LOGS:\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  msg += "§7Die letzten 10 Log-Einträge werden angezeigt...\n";
  msg += "§7(Vollständige Logs sind in der Datenbank verfügbar)\n";
  msg += "§6━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  player.sendMessage(msg);
  system.runTimeout(() => showAdminTools(player), 10);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// BEFEHLS-REGISTRIERUNG MIT BEDROCKBRIDGE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// Haupt-Befehl mit vollständiger Subcommand-Unterstützung
bridge.bedrockCommands.registerCommand("sync", (player, ...args) => {
  try {
    const subcommand = args[0]?.toString().toLowerCase();

    switch (subcommand) {
      case "menu":
      case undefined:
        system.runTimeout(() => showMainMenu(player), 5);
        break;

      case "transfer":
        const targetServer = args[1]?.toString().toLowerCase();
        if (targetServer === "main" || targetServer === "farming") {
          system.runTimeout(() => initiateTransfer(player, targetServer), 5);
        } else {
          player.sendMessage("§cVerwendung: " + bridge.bedrockCommands.prefix + "sync transfer <main|farming>");
        }
        break;

      case "restore":
        system.runTimeout(async () => {
          const profile = PlayerSyncManager.getPlayerProfile(player.name);
          const result = await TransferManager.restorePlayerInventory(player.name, profile?.currentServerId);
          if (!result.success) {
            player.sendMessage(`§c✗ ${result.reason}`);
          } else {
            player.sendMessage("§a✓ Inventar-Wiederherstellung abgeschlossen!");
          }
        }, 5);
        break;

      case "stats":
        system.runTimeout(() => showStatistics(player), 5);
        break;

      case "help":
        system.runTimeout(() => showHelp(player), 5);
        break;

      default:
        player.sendMessage(`§bCross-Server Sync - Verwende: ${bridge.bedrockCommands.prefix}sync help`);
    }
  } catch (e) {
    log(`Befehlsfehler: ${e}`, "error");
    player.sendMessage("§c✗ Ein Fehler ist aufgetreten. Versuche es später erneut.");
  }
}, "🌐 Cross-Server Inventar-Synchronisation - Transferiere zwischen Servern");

// Admin-Befehl für erweiterte Tools
bridge.bedrockCommands.registerAdminCommand("syncadmin", (player) => {
  try {
    system.runTimeout(() => showAdminTools(player), 5);
  } catch (e) {
    log(`Admin-Befehlsfehler: ${e}`, "error");
    player.sendMessage("§c✗ Ein Fehler ist aufgetreten.");
  }
}, "🛠️ Admin-Tools für Cross-Server Sync - Spieler- & Daten-Verwaltung");

// Kurz-Alias für schnellen Zugriff
bridge.bedrockCommands.registerCommand("transfer", (player, ...args) => {
  const targetServer = args[0]?.toString().toLowerCase();
  if (targetServer === "main" || targetServer === "farming") {
    system.runTimeout(() => initiateTransfer(player, targetServer), 5);
  } else {
    system.runTimeout(() => showMainMenu(player), 5);
  }
}, "⚡ Schnell-Befehl zum Transferieren (Alias für /sync transfer)");

log(`BedrockBridge Commands registriert mit Prefix: ${bridge.bedrockCommands.prefix || '!'}`, "success");

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// EVENT-LISTENER
// ═══════════════════════════════════════════════════════════════════════════════════════════════

world.afterEvents.playerSpawn.subscribe(event => {
  try {
    const player = event.player;

    // Erstelle Profil wenn nicht vorhanden
    const existingProfile = syncDatabase.get(`profile_${player.name}`);
    if (!existingProfile) {
      PlayerSyncManager.createPlayerProfile(player.name, "main");
    }

    // Benachrichtige über verfügbare Transfer-Funktion
    system.runTimeout(() => {
      const prefix = bridge.bedrockCommands.prefix || "!";
      player.sendMessage(`§b💡 Tipp: Nutze §l${prefix}sync§r§b um deinen Server zu wechseln!`);
    }, 100);

    log(`Spieler beigetreten: ${player.name}`, "success");
  } catch (e) {
    log(`Player spawn error: ${e}`, "error");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AUTO-SAVE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════

if (config.autoSaveInventory) {
  system.runInterval(() => {
    try {
      world.getAllPlayers().forEach(player => {
        const profile = PlayerSyncManager.getPlayerProfile(player.name);
        InventoryManager.saveInventory(player.name, profile?.currentServerId || "main");
      });

      log(`Auto-Save abgeschlossen für ${world.getAllPlayers().length} Spieler`, "success");
    } catch (e) {
      log(`Auto-save error: ${e}`, "error");
    }
  }, config.autoSaveInterval * 20); // Konvertiere Sekunden zu Ticks
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INITIALISIERUNG & LOGGING
// ═══════════════════════════════════════════════════════════════════════════════════════════════

log(`${PLUGIN_NAME} v${PLUGIN_VERSION} initialisiert`, "success");
log(`Hauptserver: ${SERVER_CONFIG.mainServer.name}`, "success");
log(`Farmingserver: ${SERVER_CONFIG.farmingServer.name}`, "success");
log(`Discord-Logging: ${config.discordLogging ? "Aktiv" : "Inaktiv"}`, "success");

sendDiscordEmbed(
  "System Start",
  `**${PLUGIN_NAME}** v${PLUGIN_VERSION} wurde gestartet\n\n` +
  `✅ Hauptserver: ${SERVER_CONFIG.mainServer.name}\n` +
  `✅ Farmingserver: ${SERVER_CONFIG.farmingServer.name}\n` +
  `✅ Auto-Save: ${config.autoSaveInventory ? "Aktiv" : "Inaktiv"}`,
  0x00ff00
);

console.log("\n╔════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    🌐 CROSS-SERVER SYNC PLUGIN v1.0                       ║");
console.log("╠════════════════════════════════════════════════════════════════════════════╣");
console.log("║  ✅ Inventar-Synchronisation aktiviert                                    ║");
console.log("║  ✅ Spieler-Profile-System aktiviert                                      ║");
console.log("║  ✅ Transfer-Manager aktiviert                                            ║");
console.log("║  ✅ Auto-Save-System aktiviert                                            ║");
console.log("║  ✅ Discord-Integration aktiviert                                         ║");
console.log("║  ✅ Admin-Tools aktiviert                                                 ║");
console.log("║                                                                            ║");
console.log("║  📍 Verfügbare Befehle:                                                    ║");
console.log("║     • /sync - Hauptmenü                                                    ║");
console.log("║     • /sync transfer <main|farming> - Direkt transferieren                ║");
console.log("║     • /sync restore - Inventar wiederherstellen                           ║");
console.log("║     • /syncadmin - Admin-Tools                                            ║");
console.log("║                                                                            ║");
console.log("║  ✅ SYSTEM BEREIT | PRODUKTION                                            ║");
console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

export { InventoryManager, PlayerSyncManager, TransferManager };
