/**
 * 🏰 LANDCLAIM MEGA - ULTIMATE COMPLETE SYSTEM
 * All-in-one territory management with economy, protection, and social features
 * @version 3.0.0
 * @author Claude Code
 */

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Territory } from "./core/Territory.js";
import { ClaimManager } from "./core/ClaimManager.js";
import { MoneyManager } from "./economy/MoneyManager.js";
import { ProtectionManager } from "./protection/ProtectionManager.js";
import { CommandManager } from "./commands/CommandManager.js";
import { UIManager } from "./ui/UIManager.js";
import { FriendsSystem } from "./social/FriendsSystem.js";
import { AdminManager } from "./admin/AdminManager.js";
import { ParticleVisualizer } from "./features/ParticleVisualizer.js";
import { PlayerTeleportation } from "./features/PlayerTeleportation.js";

// Database Adapter
class SimpleDatabase {
    constructor() {
        this.data = new Map();
    }
    get(key) { return this.data.get(key); }
    set(key, value) { this.data.set(key, value); }
    has(key) { return this.data.has(key); }
    delete(key) { this.data.delete(key); }
    clear() { this.data.clear(); }
    size() { return this.data.size; }
}

// Global State
let pluginInitialized = false;
let FORMS_AVAILABLE = false;
let database;
let claimManager;
let moneyManager;
let protectionManager;
let commandManager;
let uiManager;
let friendsSystem;
let adminManager;
let particleVisualizer;
let playerTeleportation;

/**
 * Initialize all plugin systems
 */
function initializePlugin() {
    if (pluginInitialized) return;

    console.log("§6========== 🏰 LandClaim MEGA v3.0.0 ==========");

    try {
        database = new SimpleDatabase();
        moneyManager = new MoneyManager(database);
        claimManager = new ClaimManager(moneyManager, null, database);
        protectionManager = new ProtectionManager(claimManager);
        claimManager.protectionManager = protectionManager;

        commandManager = new CommandManager(claimManager, moneyManager, protectionManager, null);
        uiManager = new UIManager(claimManager, moneyManager);
        friendsSystem = new FriendsSystem(database);
        adminManager = new AdminManager(claimManager, moneyManager, protectionManager, database);
        particleVisualizer = new ParticleVisualizer();
        playerTeleportation = new PlayerTeleportation();

        commandManager.uiManager = uiManager;

        detectFormAvailability();
        setupChatCommands();
        setupEventListeners();
        startAutoSave();

        pluginInitialized = true;

        console.log("§a========== 🎉 LandClaim MEGA Fully Initialized ==========");
        console.log("§fUse §6/lc§f to get started!");

        return true;
    } catch (error) {
        console.error(`§c❌ Plugin initialization failed: ${error}`);
        return false;
    }
}

/**
 * Detect form availability at runtime
 */
function detectFormAvailability() {
    try {
        if (typeof ActionFormData !== 'undefined' && typeof ModalFormData !== 'undefined') {
            FORMS_AVAILABLE = true;
            console.log("§a✅ ActionFormData/ModalFormData available - GUI mode enabled");
        } else {
            FORMS_AVAILABLE = false;
            console.log("§eℹ️ Forms unavailable - Chat menu fallback mode");
        }
    } catch (error) {
        FORMS_AVAILABLE = false;
    }
}

/**
 * Setup chat command handler for /lc
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

    console.log("§a✅ Chat command handler registered");
}

/**
 * Setup world event listeners
 */
function setupEventListeners() {
    world.afterEvents.playerSpawn.subscribe((event) => {
        const player = event.player;
        system.run(() => {
            moneyManager.initializePlayerAccount(player.name);
            sendMessage(player, "§6========== 🏰 Welcome to LandClaim MEGA ==========");
            sendMessage(player, "§fUse §6/lc§f to open menu or §6/lc help§f for commands");
        });
    });

    console.log("§a✅ Event listeners registered");
}

/**
 * Start auto-save interval
 */
function startAutoSave() {
    system.runInterval(() => {
        try {
            claimManager.saveAllTerritories();
            friendsSystem.saveFriends();
            adminManager.saveAdminData();
        } catch (error) {
            console.error(`Auto-save error: ${error}`);
        }
    }, 6000);

    console.log("§a✅ Auto-save system started (5 min interval)");
}

/**
 * Safe message sending with error handling
 */
function sendMessage(player, message) {
    try {
        if (!player || !player.isValid()) return;
        player.sendMessage(message);
    } catch (error) {
        console.warn(`[LandClaim] Could not send message to ${player?.name}`);
    }
}

/**
 * Initialize on first system tick
 */
system.run(() => {
    initializePlugin();
});

// Public API
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
        admin: adminManager.getGlobalStatistics()
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

export const PLUGIN_INFO = {
    name: "LandClaim MEGA",
    version: "3.0.0",
    author: "Claude Code",
    description: "Complete territory management system with economy, protection, and social features",
    status: "INITIALIZED",
    features: [
        "Territory Management",
        "Economy System",
        "Protection System",
        "16+ Commands",
        "GUI with Fallback",
        "Friends System",
        "Admin Panel",
        "Particle Effects",
        "Teleportation"
    ]
};

console.log("§a[LandClaim] ✅ Main module loaded - ready to initialize on first tick");
