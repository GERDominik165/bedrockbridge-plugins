/**
 * 🏰 LANDCLAIM MEGA v4 - ULTIMATE UPGRADE
 * Complete territory management system with all v2.4.0 features
 * Persistent storage, spatial grid, advanced protection, and more
 * @version 4.0.0
 * @author Claude Code
 */

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

// === CORE SYSTEMS ===
import { Territory } from "./core/Territory.js";
import { ClaimManager } from "./core/ClaimManager.js";
import { MoneyManager } from "./economy/MoneyManager.js";
import { ProtectionManagerV4 } from "./protection/ProtectionManagerV4.js";
import { CommandManager } from "./commands/CommandManager.js";
import { UIManager } from "./ui/UIManager.js";
import { FriendsSystem } from "./social/FriendsSystem.js";
import { AdvancedAdminManager } from "./admin/AdvancedAdminManager.js";

// === NEW v4 SYSTEMS ===
import { PersistentDatabase } from "./database/PersistentDatabase.js";
import { MultiDimensionSpatialGrid } from "./utils/SpatialGrid.js";
import { VisualizerV4 } from "./features/VisualizerV4.js";
import { PlayerTeleportation } from "./features/PlayerTeleportation.js";

// ============================================================
// GLOBAL STATE
// ============================================================

let pluginInitialized = false;
let FORMS_AVAILABLE = false;

// === v4 UPGRADED SYSTEMS ===
let database; // NEW: Persistent Database
let spatialGrid; // NEW: Multi-Dimension Spatial Grid
let claimManager;
let moneyManager;
let protectionManager; // NEW: ProtectionManagerV4
let commandManager;
let uiManager;
let friendsSystem;
let adminManager; // NEW: AdvancedAdminManager
let visualizer; // NEW: VisualizerV4
let playerTeleportation;

// === PLUGIN INFO ===
const PLUGIN_INFO = {
    name: "LandClaim MEGA v4",
    version: "4.0.0",
    description: "Ultimate territory management with persistent storage, spatial indexing, and advanced protection",
    author: "Claude Code",
    features: [
        "✨ Persistent Dynamic Property Storage",
        "⚡ O(1) Spatial Grid Lookup",
        "🛡️ Advanced Protection Manager v4",
        "👑 Admin Suite with Audit Trail",
        "🎨 Territory Visualizer with BlockVolume",
        "📊 Complete Statistics & Logging",
        "🌍 Multi-Dimension Support",
        "💰 Economy System",
        "👥 Friends & Members",
        "🔧 16+ Commands with Aliases",
        "🎮 GUI with Fallback"
    ]
};

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize all plugin systems with v4 features
 */
function initializePlugin() {
    if (pluginInitialized) return;

    console.log("§6╔════════════════════════════════════════════╗");
    console.log("§6║  🏰 LANDCLAIM MEGA v4 - ULTIMATE EDITION  ║");
    console.log("§6╚════════════════════════════════════════════╝");

    try {
        // === 1. INITIALIZE PERSISTENT DATABASE ===
        console.log("§e[1/8] Initializing Persistent Database...");
        database = new PersistentDatabase();
        console.log("§a✅ Persistent database loaded");

        // === 2. INITIALIZE SPATIAL GRID ===
        console.log("§e[2/8] Initializing Spatial Grid...");
        spatialGrid = new MultiDimensionSpatialGrid(32);
        console.log("§a✅ Spatial grid initialized");

        // === 3. INITIALIZE MANAGERS ===
        console.log("§e[3/8] Initializing managers...");
        moneyManager = new MoneyManager(database);
        claimManager = new ClaimManager(moneyManager, null, database);
        protectionManager = new ProtectionManagerV4(claimManager);
        claimManager.protectionManager = protectionManager;
        console.log("§a✅ Core managers initialized");

        // === 4. INITIALIZE ADMIN SYSTEM ===
        console.log("§e[4/8] Initializing admin system...");
        adminManager = new AdvancedAdminManager(claimManager, moneyManager, protectionManager, database);
        console.log("§a✅ Admin system initialized");

        // === 5. INITIALIZE COMMAND SYSTEM ===
        console.log("§e[5/8] Initializing command system...");
        commandManager = new CommandManager(claimManager, moneyManager, protectionManager, null);
        commandManager.adminManager = adminManager;
        console.log("§a✅ Command system initialized");

        // === 6. INITIALIZE UI SYSTEM ===
        console.log("§e[6/8] Initializing UI system...");
        uiManager = new UIManager(claimManager, moneyManager);
        commandManager.uiManager = uiManager;
        console.log("§a✅ UI system initialized");

        // === 7. INITIALIZE FEATURES ===
        console.log("§e[7/8] Initializing features...");
        friendsSystem = new FriendsSystem(database);
        visualizer = new VisualizerV4(claimManager);
        playerTeleportation = new PlayerTeleportation();
        console.log("§a✅ Features initialized");

        // === 8. SETUP EVENT LISTENERS ===
        console.log("§e[8/8] Setting up event listeners...");
        detectFormAvailability();
        setupChatCommands();
        setupWorldEventListeners();
        setupPeriodicTasks();
        console.log("§a✅ Event listeners ready");

        // === BUILD SPATIAL INDEX ===
        console.log("§e[9/8] Building spatial index...");
        rebuildSpatialIndex();
        console.log("§a✅ Spatial index built");

        pluginInitialized = true;

        console.log("§6╔════════════════════════════════════════════╗");
        console.log("§6║  🎉 PLUGIN FULLY INITIALIZED AND READY!   ║");
        console.log("§6╚════════════════════════════════════════════╝");
        console.log("§fUse §6/lc§f to get started!");

        return true;
    } catch (error) {
        console.error(`§c❌ INITIALIZATION FAILED: ${error}`);
        console.error(`§c${error.stack}`);
        return false;
    }
}

/**
 * Rebuild spatial index from claims
 */
function rebuildSpatialIndex() {
    try {
        const allClaims = claimManager.claims.values();
        for (const territory of allClaims) {
            spatialGrid.insertClaim(
                territory.id,
                territory.centerX,
                territory.centerZ,
                territory.radius,
                territory.dimension
            );
        }
        console.log(`[SpatialIndex] Built with ${claimManager.claims.size} claims`);
    } catch (error) {
        console.error(`[SpatialIndex] Build error: ${error}`);
    }
}

/**
 * Detect form availability at runtime
 */
function detectFormAvailability() {
    try {
        if (typeof ActionFormData !== 'undefined' && typeof ModalFormData !== 'undefined') {
            FORMS_AVAILABLE = true;
            console.log("§a✅ ActionFormData available - GUI enabled");
        } else {
            FORMS_AVAILABLE = false;
            console.log("§eℹ️ Forms unavailable - chat mode");
        }
    } catch (error) {
        FORMS_AVAILABLE = false;
        console.log("§eℹ️ Form detection error - chat mode");
    }
}

/**
 * Setup chat command handler
 */
function setupChatCommands() {
    world.beforeEvents.chatSend.subscribe((event) => {
        const player = event.sender;
        const message = event.message.trim();

        if (!message.startsWith("/lc")) return;

        event.cancel = true;

        const parts = message.substring(4).trim().split(/\s+/).filter(p => p.length > 0);

        if (parts.length === 0) {
            system.run(() => {
                uiManager.showMainMenu(player).catch(err => {
                    sendMessage(player, `§c❌ ${err.message}`);
                });
            });
            return;
        }

        system.run(() => {
            commandManager.executeCommand(player, parts).catch(err => {
                sendMessage(player, `§c❌ ${err.message}`);
            });
        });
    });

    console.log("[ChatCommands] Handler registered");
}

/**
 * Setup world event listeners
 */
function setupWorldEventListeners() {
    // Player spawn
    world.afterEvents.playerSpawn.subscribe((event) => {
        const player = event.player;
        system.run(() => {
            moneyManager.initializePlayerAccount(player.name);
            sendMessage(player, "§6🏰 Welcome to LandClaim MEGA v4!");
            sendMessage(player, "§fUse §6/lc§f for menu • §6/lc help§f for commands");
        });
    });

    // Player leave - backup admin data
    world.afterEvents.playerLeave.subscribe((event) => {
        if (adminManager) {
            adminManager.saveAdminData();
        }
    });

    console.log("[WorldEvents] Listeners registered");
}

/**
 * Setup periodic tasks
 */
function setupPeriodicTasks() {
    // Auto-save every 5 minutes
    system.runInterval(() => {
        try {
            claimManager.saveAllTerritories();
            friendsSystem.saveFriends();
            adminManager.saveAdminData();
            database.forceSave();
            console.log("§a✅ Auto-save complete");
        } catch (error) {
            console.error(`Auto-save error: ${error}`);
        }
    }, 6000); // 5 minutes

    // Cleanup tasks every 10 minutes
    system.runInterval(() => {
        try {
            protectionManager.cleanupCache();
            visualizer.cleanupExpiredVisualizations();
        } catch (error) {
            console.error(`Cleanup error: ${error}`);
        }
    }, 12000); // 10 minutes

    console.log("[PeriodicTasks] Initialized");
}

/**
 * Safe message sending
 */
function sendMessage(player, message) {
    try {
        if (!player || !player.isValid()) return;
        player.sendMessage(message);
    } catch (error) {
        console.warn(`[LandClaim] Could not send message to ${player?.name}`);
    }
}

// ============================================================
// INITIALIZE ON FIRST TICK
// ============================================================

system.run(() => {
    initializePlugin();
});

// ============================================================
// PUBLIC API FOR OTHER PLUGINS
// ============================================================

export function getTerritoryAt(x, z, dimension) {
    if (!pluginInitialized) return null;
    return claimManager.getTerritoryAt(x, z, dimension);
}

export function getPlayerClaims(playerName) {
    if (!pluginInitialized) return [];
    return claimManager.getPlayerClaims(playerName);
}

export function getClaim(claimId) {
    if (!pluginInitialized) return null;
    return claimManager.getClaim(claimId);
}

export function getPlayerBalance(playerName) {
    if (!pluginInitialized) return 0;
    const account = moneyManager.getPlayerAccount(playerName);
    return account.balance;
}

export function createClaim(ownerName, centerX, centerZ, dimension, radius = 5) {
    if (!pluginInitialized) return { success: false, error: "Plugin not initialized" };
    return claimManager.createClaim(ownerName, centerX, centerZ, dimension, radius);
}

export function getGlobalStatistics() {
    if (!pluginInitialized) return null;
    return {
        claims: claimManager.getStatistics(),
        economy: moneyManager.getEconomyStats(),
        protection: protectionManager.getStats(),
        admin: adminManager.getGlobalStatistics(),
        database: database.getStats(),
        visualizer: visualizer.getStats()
    };
}

export function isAdmin(playerName) {
    if (!pluginInitialized) return false;
    return adminManager.isAdmin(playerName);
}

export function transferMoney(fromPlayer, toPlayer, amount) {
    if (!pluginInitialized) return false;
    return moneyManager.transferMoney(fromPlayer, toPlayer, amount);
}

export function visualizeTerritory(territoryId, player) {
    if (!pluginInitialized) return false;
    const territory = claimManager.getClaim(territoryId);
    if (territory) {
        visualizer.visualizeTerritory(territory, player);
        return true;
    }
    return false;
}

export function getSpatialGrid() {
    if (!pluginInitialized) return null;
    return spatialGrid;
}

export const PLUGIN_VERSION = PLUGIN_INFO;

console.log("§a[LandClaim] ✅ Main v4 module loaded - ready to initialize on first tick");
