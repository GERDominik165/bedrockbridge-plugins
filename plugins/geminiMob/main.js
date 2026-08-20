/**
 * Gemini Mob Plugin - Main Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Complete integration of Gemini AI personalities with mobs in BedrockBridge
 * Provides interactive AI-driven mob personalities with memory and relationships
 */

import { world, system } from "@minecraft/server";
import { bridge, database } from "../../addons";

// Import all plugin modules - STATIC IMPORTS LIKE GEMINICHAT
import {
    getConfig,
    setConfig,
    initializeConfig,
    isApiKeyConfigured,
    getMobType,
    getMobTypes
} from "./config.js";

import {
    getMobPersonality,
    generatePersonality,
    updateMood,
    updatePersonalityStats
} from "./mobPersonality.js";

import {
    getMobMemory,
    updateRelationship,
    recordInteraction,
    getRelationshipStatus
} from "./mobMemory.js";

import {
    handleFeedingInteraction,
    handlePettingInteraction,
    handleAttackInteraction,
    handleTamingInteraction,
    getHeldItemType,
    isWeapon,
    isHealingItem,
    getWeaponThreat,
    handleWeaponThreat,
    handleHealingInteraction,
    shouldMobDefendPlayer,
    makeMobAttackTarget,
    getMobLoyaltyStatus,
    getFoodPreference,
    getTrustChangeForFood
} from "./mobInteractions.js";

import {
    executeMobAction,
    createDamageEffect
} from "./mobActions.js";

import {
    generateMobResponse,
    getConversation,
    addUserMessage,
    addMobResponse
} from "./conversationManager.js";

import {
    initializeDatabase,
    saveMobData,
    getAllMobs,
    getDatabaseStatistics
} from "./mobDatabase.js";

import * as formatter from "./messageFormatter.js";
import * as logger from "./debugLogger.js";

// ==================== INITIALIZATION ====================

// Initialize configuration on server load
world.afterEvents.worldLoad.subscribe(() => {
    logger.info("INIT", "Initializing Gemini Mob Plugin v1.0.0");
    logger.debug("INIT", "Loading configuration...");

    // Initialize core systems
    initializeConfig();
    initializeDatabase();

    console.log("════════════════════════════════════════════════════════════════════════════════");
    console.log("[GeminiMob] 🚀 Gemini Mob Plugin v1.0.0 Initialized");
    console.log("════════════════════════════════════════════════════════════════════════════════");
    console.log("[GeminiMob] ✓ Configuration loaded");
    console.log("[GeminiMob] ✓ Database initialized");
    console.log("[GeminiMob] ✓ All modules ready");
    console.log("[GeminiMob] ✓ Commands: /mob help, /mob pet, /mob feed, /mob talk, etc.");
    console.log("════════════════════════════════════════════════════════════════════════════════");

    logger.info("INIT", "Plugin initialization complete");
    logger.info("INIT", "All systems ready");

    // Check API key
    if (!isApiKeyConfigured()) {
        logger.warn("CONFIG", "API key not configured!");
        world.sendMessage(formatter.formatConfigurationWarning());
    } else {
        logger.info("CONFIG", "API key is configured and ready");
        world.sendMessage(`§a[GeminiMob] §eReady! Use §f/mob help §efor commands`);
    }

    // Register event handlers
    registerEventHandlers();
});

// ==================== EVENT HANDLERS ====================

/**
 * Register all event handlers for mobs and interactions
 */
function registerEventHandlers() {
    logger.info("HANDLERS", "Registering event handlers...");

    // Handle entity damage
    world.afterEvents.entityHurt.subscribe((event) => {
        try {
            console.log(`[GeminiMob/DAMAGE] ========== DAMAGE EVENT ==========`);

            const damagee = event.damageSource.damagingEntity;
            const victim = event.entity;

            console.log(`[GeminiMob/DAMAGE] Attacker: ${damagee?.typeId}`);
            console.log(`[GeminiMob/DAMAGE] Victim: ${victim?.typeId}`);

            if (!damagee || damagee.typeId !== "minecraft:player") {
                console.log(`[GeminiMob/DAMAGE] Not a player attack, skipping`);
                return;
            }

            const player = damagee;
            const playerId = player.id;
            const playerName = player.name;
            const mobId = victim.id || victim.nameTag;
            const mobTypeId = victim.typeId;

            console.log(`[GeminiMob/DAMAGE] ✓ Player ${playerName} hit ${mobTypeId}`);
            console.log(`[GeminiMob/DAMAGE] Damage amount: ${event.damage}`);

            logger.debug("DAMAGE", `${playerName} damaged ${mobTypeId} for ${event.damage} damage`);

            // Check what item player is holding
            const heldItem = getHeldItemType(player);
            console.log(`[GeminiMob/DAMAGE] Held item: ${heldItem.itemId}`);

            // If holding weapon, trigger weapon threat
            if (isWeapon(heldItem.itemId)) {
                console.log(`[GeminiMob/DAMAGE] ⚔️ WEAPON DETECTED: ${heldItem.itemName}`);
                const threatResult = handleWeaponThreat(mobId, playerId, playerName, heldItem);
                console.log(`[GeminiMob/DAMAGE] Weapon threat result:`, threatResult);
                logger.warn("THREAT", `${playerName} threatened ${mobTypeId} with ${heldItem.itemName}`);
                if (threatResult.success) {
                    console.log(`[GeminiMob/DAMAGE] Triggering hostile event...`);
                    victim.triggerEvent("geniimob:become_hostile");
                }
            } else {
                console.log(`[GeminiMob/DAMAGE] Normal attack (no weapon)`);
                // Normal attack interaction
                const interaction = handleAttackInteraction(mobId, playerId, playerName, event.damage);
                console.log(`[GeminiMob/DAMAGE] Attack interaction result:`, interaction);
                recordInteraction(mobId, playerId, "attack", interaction);
            }

            console.log(`[GeminiMob/DAMAGE] ========== DAMAGE EVENT END ==========\n`);
            logger.debug("DAMAGE", `Attack recorded`);

        } catch (e) {
            console.log(`[GeminiMob/DAMAGE] ❌ ERROR: ${e.message}`);
            logger.error("DAMAGE", `Error handling damage event: ${e.message}`);
        }
    });

    // Handle entity spawn
    world.afterEvents.entitySpawn.subscribe((event) => {
        try {
            const entity = event.entity;
            const mobTypeId = entity.typeId;

            console.log(`[GeminiMob/SPAWN] Entity spawned: ${mobTypeId}`);

            const mobType = getMobType(mobTypeId);

            if (!mobType) {
                console.log(`[GeminiMob/SPAWN] Type not configured, skipping`);
                return;
            }

            console.log(`[GeminiMob/SPAWN] ✓ Mob type configured`);

            logger.debug("SPAWN", `Mob spawned: ${mobTypeId}`);

            // Generate personality for new mob
            const personality = generatePersonality(entity.id || entity.nameTag, mobTypeId);
            console.log(`[GeminiMob/SPAWN] Generated personality:`, personality);

            // Set nametag with personality
            if (personality.name) {
                entity.nameTag = personality.name;
                console.log(`[GeminiMob/SPAWN] Set nametag to: ${personality.name}`);
            }

            console.log(`[GeminiMob/SPAWN] ✓ Personality ready for ${personality.name}\n`);
            logger.success("SPAWN", `Generated personality for ${personality.name} (${mobTypeId})`);

        } catch (e) {
            console.log(`[GeminiMob/SPAWN] ❌ Error: ${e.message}`);
            logger.error("SPAWN", `Error handling spawn event: ${e.message}`);
        }
    });

    // Handle entity death
    world.afterEvents.entityDie.subscribe((event) => {
        try {
            const entity = event.deadEntity;
            const mobTypeId = entity.typeId;
            const mobType = getMobType(mobTypeId);

            if (!mobType) {
                return;
            }

            logger.debug("DEATH", `Mob died: ${mobTypeId}`);

        } catch (e) {
            logger.error("DEATH", `Error handling death event: ${e.message}`);
        }
    });

    logger.success("HANDLERS", "✓ All event handlers registered");
}

// ==================== BEDROCK COMMAND REGISTRATION ====================

/**
 * Register the /mob command with BedrockBridge
 */
bridge.bedrockCommands.registerCommand("mob", (player, action = "help", ...args) => {
    const actionStr = (action ? action.toString() : "help").toLowerCase();

    logger.logCommand(player.name, `/mob ${actionStr}`, "executed");
    logger.debug("COMMAND", `Player ${player.name} executed: /mob ${actionStr}`);

    try {
        handleMobCommand(player, actionStr, args);
    } catch (e) {
        logger.error("COMMAND", `Error in mob command handler: ${e.message}`);
        player.sendMessage(`§c[GeminiMob] Error: ${e.message}`);
    }
});

logger.success("BRIDGE", "✓ Mob command registered via bridge.bedrockCommands");

// ==================== COMMAND HANDLERS ====================

/**
 * Handle mob commands from bedrock
 */
async function handleMobCommand(player, action, args) {
    const playerID = player.id;
    const playerName = player.name;

    logger.debug("CMD", `Command handler for ${playerName}: ${action}`);

    switch (action) {
        case "help":
            handleHelpCommand(player);
            break;

        case "pet":
            await handlePetCommand(player, args);
            break;

        case "feed":
            await handleFeedCommand(player, args);
            break;

        case "talk":
            await handleTalkCommand(player, args);
            break;

        case "status":
            handleStatusCommand(player, args);
            break;

        case "info":
            handleInfoCommand(player, args);
            break;

        case "list":
            handleListCommand(player);
            break;

        case "config":
            handleConfigCommand(player, args);
            break;

        case "stats":
            handleStatsCommand(player);
            break;

        case "tame":
            await handleTameCommand(player, args);
            break;

        case "items":
            handleItemsCommand(player);
            break;

        case "loyalty":
            handleLoyaltyCommand(player, args);
            break;

        default:
            player.sendMessage("§c[GeminiMob] Unknown command. Use /mob help for available commands.");
            logger.warn("CMD", `Unknown command: ${action}`);
    }
}

/**
 * Handle help command
 */
function handleHelpCommand(player) {
    logger.debug("CMD_HELP", `Help requested by ${player.name}`);
    player.sendMessage(formatter.formatHelpMessage());
    logger.success("CMD_HELP", `Help displayed to ${player.name}`);
}

/**
 * Handle pet command - DETAILED CONSOLE LOGGING
 */
async function handlePetCommand(player, args) {
    console.log(`\n[GeminiMob/PET] ========== PET COMMAND START ==========`);
    console.log(`[GeminiMob/PET] Player: ${player.name}`);
    console.log(`[GeminiMob/PET] Location: X=${player.location.x.toFixed(1)}, Y=${player.location.y.toFixed(1)}, Z=${player.location.z.toFixed(1)}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    console.log(`[GeminiMob/PET] Search distance: ${distance} blocks`);

    logger.debug("CMD_PET", `Pet command from ${player.name}, distance: ${distance}`);

    const nearbyEntities = getNearbyMobs(player.location, distance);
    console.log(`[GeminiMob/PET] getNearbyMobs returned: ${nearbyEntities.length} mobs`);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        console.log(`[GeminiMob/PET] ❌ NO MOBS FOUND!`);
        logger.warn("PET", "No mobs found nearby");
        console.log(`[GeminiMob/PET] ========== PET COMMAND END (NO MOBS) ==========\n`);
        return;
    }

    console.log(`[GeminiMob/PET] ✓ Found ${nearbyEntities.length} mobs nearby`);

    let pettedCount = 0;
    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            console.log(`[GeminiMob/PET]   → Processing mob: ${mob.typeId} (ID: ${mobId})`);

            const interaction = handlePettingInteraction(mobId, player.id, player.name);
            console.log(`[GeminiMob/PET]   ✓ Petting result:`, interaction);

            pettedCount++;
        } catch (e) {
            console.log(`[GeminiMob/PET]   ❌ Error petting mob: ${e.message}`);
            logger.error("PET", `Error petting mob: ${e.message}`);
        }
    }

    player.sendMessage(`§a[GeminiMob] Petted §f${pettedCount} §amob(s)!`);
    console.log(`[GeminiMob/PET] ========== PET COMMAND COMPLETE: ${pettedCount} mobs petted ==========\n`);
    logger.success("PET", `${player.name} petted ${pettedCount} mobs`);
}

/**
 * Handle feed command - DETAILED CONSOLE LOGGING
 */
async function handleFeedCommand(player, args) {
    console.log(`\n[GeminiMob/FEED] ========== FEED COMMAND START ==========`);
    console.log(`[GeminiMob/FEED] Player: ${player.name}`);
    console.log(`[GeminiMob/FEED] Location: X=${player.location.x.toFixed(1)}, Y=${player.location.y.toFixed(1)}, Z=${player.location.z.toFixed(1)}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    console.log(`[GeminiMob/FEED] Search distance: ${distance} blocks`);

    // Get held item FIRST
    let heldItemName = "empty";
    try {
        const inventory = player.getComponent("inventory");
        const container = inventory?.container;
        const heldItem = container?.getItem(player.selectedSlotIndex);
        heldItemName = heldItem?.typeId || "empty";
        console.log(`[GeminiMob/FEED] Held item: ${heldItemName}`);
    } catch (e) {
        console.log(`[GeminiMob/FEED] Could not get held item: ${e.message}`);
    }

    logger.debug("CMD_FEED", `Feed command from ${player.name}, held item: ${heldItemName}`);

    const nearbyEntities = getNearbyMobs(player.location, distance);
    console.log(`[GeminiMob/FEED] getNearbyMobs returned: ${nearbyEntities.length} mobs`);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        console.log(`[GeminiMob/FEED] ❌ NO MOBS FOUND!`);
        logger.warn("FEED", "No mobs found nearby");
        console.log(`[GeminiMob/FEED] ========== FEED COMMAND END (NO MOBS) ==========\n`);
        return;
    }

    console.log(`[GeminiMob/FEED] ✓ Found ${nearbyEntities.length} mobs nearby`);

    let fedCount = 0;
    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            console.log(`[GeminiMob/FEED]   → Feeding ${mob.typeId} (ID: ${mobId}) with ${heldItemName}`);

            const interaction = handleFeedingInteraction(mobId, player.id, player.name, heldItemName);
            console.log(`[GeminiMob/FEED]   ✓ Feeding result:`, interaction);

            fedCount++;
        } catch (e) {
            console.log(`[GeminiMob/FEED]   ❌ Error feeding mob: ${e.message}`);
            logger.error("FEED", `Error feeding mob: ${e.message}`);
        }
    }

    player.sendMessage(`§a[GeminiMob] Fed §f${fedCount} §amob(s) with ${heldItemName}!`);
    console.log(`[GeminiMob/FEED] ========== FEED COMMAND COMPLETE: ${fedCount} mobs fed ==========\n`);
    logger.success("FEED", `${player.name} fed ${fedCount} mobs with ${heldItemName}`);
}

/**
 * Handle talk command
 */
async function handleTalkCommand(player, args) {
    logger.debug("CMD_TALK", `Talk command from ${player.name}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    const message = args.length > 1 ? args.slice(1).join(" ") : "hello";

    const nearbyEntities = getNearbyMobs(player.location, distance);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        logger.debug("TALK", "No mobs found nearby");
        return;
    }

    player.sendMessage(`§9[GeminiMob] §7Asking mobs for response...`);

    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            const personality = getMobPersonality(mobId);
            const memory = getMobMemory(mobId, player.id);

            logger.debug("TALK", `${player.name} talking to ${personality.name}`);

            const responseData = await generateMobResponse(mob, player.id, player.name, message);
            const response = responseData.success ? responseData.response : "...";

            player.sendMessage(`§b${personality.name}§7: ${response}`);

            logger.success("TALK", `${personality.name} responded to ${player.name}`);
        } catch (e) {
            logger.error("TALK", `Error generating response: ${e.message}`);
            player.sendMessage(`§c[GeminiMob] Error getting response from mob`);
        }
    }
}

/**
 * Handle status command
 */
function handleStatusCommand(player, args) {
    logger.debug("CMD_STATUS", `Status command from ${player.name}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    const nearbyEntities = getNearbyMobs(player.location, distance);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        return;
    }

    player.sendMessage(`§a[GeminiMob] Nearby Mobs:`);

    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            const personality = getMobPersonality(mobId);
            const memory = getMobMemory(mobId, player.id);
            const loyalty = getMobLoyaltyStatus(mobId, player.id);

            const statusMsg = `§b${personality.name} §7| Mood: ${personality.mood} | Energy: ${personality.energy}/100 | Trust: ${memory.trust}/200`;
            player.sendMessage(statusMsg);
            player.sendMessage(`${loyalty.color}  Status: ${loyalty.status} - ${loyalty.description}`);

            if (loyalty.defendsYou) {
                player.sendMessage(`§6  ⚔️ Will help you in battle!`);
            }
        } catch (e) {
            logger.warn("STATUS", `Error getting status: ${e.message}`);
        }
    }

    logger.success("STATUS", `Status shown for ${nearbyEntities.length} mobs`);
}

/**
 * Handle info command
 */
function handleInfoCommand(player, args) {
    logger.debug("CMD_INFO", `Info command from ${player.name}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    const nearbyEntities = getNearbyMobs(player.location, distance);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        return;
    }

    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            const personality = getMobPersonality(mobId);
            const memory = getMobMemory(mobId, player.id);

            player.sendMessage(`§a═══════════════════════════════════`);
            player.sendMessage(`§b${personality.name}`);
            player.sendMessage(`§7Type: ${mob.typeId}`);
            player.sendMessage(`§7Mood: ${personality.mood}`);
            const traitNames = Object.keys(personality.traits || {}).slice(0, 3).join(", ");
            player.sendMessage(`§7Traits: ${traitNames || "Unknown"}`);
            player.sendMessage(`§7Trust Level: ${memory.trust > 100 ? "§aHigh" : memory.trust > 0 ? "§eNeutral" : "§cLow"}`);
            player.sendMessage(`§a═══════════════════════════════════`);
        } catch (e) {
            logger.warn("INFO", `Error getting info: ${e.message}`);
        }
    }
}

/**
 * Handle list command
 */
function handleListCommand(player) {
    logger.debug("CMD_LIST", `List command from ${player.name}`);

    const allMobs = getAllMobs();
    const mobCount = Object.keys(allMobs).length;

    if (mobCount === 0) {
        player.sendMessage("§c[GeminiMob] No mobs in database!");
        logger.debug("LIST", "Database is empty");
        return;
    }

    player.sendMessage(`§a[GeminiMob] Database contains §f${mobCount} §amobs:`);

    let count = 0;
    for (const [mobId, mobData] of Object.entries(allMobs)) {
        if (count >= 10) {
            player.sendMessage(`§7... and §f${mobCount - 10} §7more`);
            break;
        }
        player.sendMessage(`  §b${mobData.personality?.name || "Unknown"} §7(${mobData.typeId})`);
        count++;
    }

    logger.success("LIST", `Listed ${Math.min(mobCount, 10)} of ${mobCount} mobs`);
}

/**
 * Handle config command
 */
function handleConfigCommand(player, args) {
    logger.debug("CMD_CONFIG", `Config command from ${player.name}`);

    const option = args[0]?.toLowerCase();
    const value = args.slice(1).join(" ");

    if (!option) {
        player.sendMessage("§e[GeminiMob] Configuration Options:");
        player.sendMessage("§7  /mob config apikey <key> - Set Gemini API key");
        player.sendMessage("§7  /mob config prefix <prefix> - Set command prefix");
        return;
    }

    if (option === "apikey") {
        if (!value) {
            player.sendMessage("§c[GeminiMob] Usage: /mob config apikey <your-key>");
            return;
        }
        setConfig("apiKey", value);
        player.sendMessage("§a[GeminiMob] API key configured!");
        logger.info("CONFIG", `API key configured by ${player.name}`);
    } else if (option === "prefix") {
        if (!value) {
            player.sendMessage("§c[GeminiMob] Usage: /mob config prefix <prefix>");
            return;
        }
        setConfig("commandPrefix", value);
        player.sendMessage(`§a[GeminiMob] Prefix set to: ${value}`);
        logger.info("CONFIG", `Command prefix set to ${value} by ${player.name}`);
    } else {
        player.sendMessage("§c[GeminiMob] Unknown config option!");
        logger.warn("CONFIG", `Unknown config option: ${option}`);
    }
}

/**
 * Handle stats command
 */
function handleStatsCommand(player) {
    logger.debug("CMD_STATS", `Stats command from ${player.name}`);

    const stats = getDatabaseStatistics();
    player.sendMessage(`§a[GeminiMob] Statistics:`);
    player.sendMessage(`§7  Total Mobs: §f${stats.totalMobs}`);
    player.sendMessage(`§7  Personalities: §f${stats.totalMobs}`);
    player.sendMessage(`§7  Interactions: §f${stats.totalInteractions}`);

    logger.success("STATS", `Stats shown to ${player.name}`);
}

/**
 * Handle tame command
 */
async function handleTameCommand(player, args) {
    logger.debug("CMD_TAME", `Tame command from ${player.name}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    const nearbyEntities = getNearbyMobs(player.location, distance);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        logger.debug("TAME", "No mobs found nearby");
        return;
    }

    let tamedCount = 0;
    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            const interaction = handleTamingInteraction(mobId, player.id, player.name);

            logger.debug("TAME", `${player.name} taming ${mob.typeId}`);
            tamedCount++;
        } catch (e) {
            logger.warn("TAME", `Error taming mob: ${e.message}`);
        }
    }

    player.sendMessage(`§a[GeminiMob] Tamed §f${tamedCount} §amob(s)!`);
    logger.success("TAME", `${player.name} tamed ${tamedCount} mobs`);
}

/**
 * Handle items command - show weapons and healing items
 */
function handleItemsCommand(player) {
    logger.debug("CMD_ITEMS", `Items command from ${player.name}`);

    player.sendMessage(`§a════════════════════════════════════`);
    player.sendMessage(`§b🗡️  WEAPONS (Mobs will attack you!)`);
    player.sendMessage(`§a════════════════════════════════════`);
    player.sendMessage(`§cDiamond Sword, Iron Sword, Netherite Sword`);
    player.sendMessage(`§cDiamond/Iron Axe, Trident, Bow, Crossbow`);

    player.sendMessage(`§a════════════════════════════════════`);
    player.sendMessage(`§b❤️  HEALING ITEMS (Mobs will love you!)`);
    player.sendMessage(`§a════════════════════════════════════`);
    player.sendMessage(`§aGolden Apple, Enchanted Golden Apple`);
    player.sendMessage(`§aMilk Bucket, Honey Bottle`);

    player.sendMessage(`§a════════════════════════════════════`);
    player.sendMessage(`§b🌾 FOOD (Different for each mob type)`);
    player.sendMessage(`§a════════════════════════════════════`);
    player.sendMessage(`§aCows/Sheep: Wheat, Hay Block`);
    player.sendMessage(`§aPigs: Carrot, Potato, Beetroot`);
    player.sendMessage(`§aChickens: Seeds, Wheat`);
    player.sendMessage(`§aRabbits: Carrot, Dandelion`);
    player.sendMessage(`§aWolves: Beef, Bone, Rotten Flesh`);

    logger.success("ITEMS", `Items guide shown to ${player.name}`);
}

/**
 * Handle loyalty command - show mob loyalty relationships
 */
function handleLoyaltyCommand(player, args) {
    logger.debug("CMD_LOYALTY", `Loyalty command from ${player.name}`);

    const distance = args.length > 0 ? parseInt(args[0]) : 10;
    const nearbyEntities = getNearbyMobs(player.location, distance);

    if (nearbyEntities.length === 0) {
        player.sendMessage("§c[GeminiMob] No mobs nearby!");
        return;
    }

    player.sendMessage(`§a═══════════════════════════════════════════════`);
    player.sendMessage(`§bYour Mob Relationships:`);
    player.sendMessage(`§a═══════════════════════════════════════════════`);

    for (const mob of nearbyEntities) {
        try {
            const mobId = mob.id || mob.nameTag;
            const personality = getMobPersonality(mobId);
            const loyalty = getMobLoyaltyStatus(mobId, player.id);

            player.sendMessage(`§a`);
            player.sendMessage(`${loyalty.color}${personality.name}`);
            player.sendMessage(`${loyalty.color}Status: ${loyalty.status} - ${loyalty.description}`);

            if (loyalty.defendsYou) {
                player.sendMessage(`§6  ⚔️ WILL FIGHT FOR YOU`);
            }

            const memory = getMobMemory(mobId, player.id);
            if (memory.isHostile) {
                player.sendMessage(`§c  ❌ HOSTILE - BE CAREFUL!`);
            }
        } catch (e) {
            logger.warn("LOYALTY", `Error getting loyalty: ${e.message}`);
        }
    }

    logger.success("LOYALTY", `Loyalty shown for ${nearbyEntities.length} mobs`);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get nearby mobs within a certain distance - ENHANCED WITH DETAILED LOGGING
 */
function getNearbyMobs(location, distance) {
    try {
        logger.debug("UTILITY", `=== getNearbyMobs START ===`);
        logger.debug("UTILITY", `Looking for mobs at location: ${location.x.toFixed(1)}, ${location.y.toFixed(1)}, ${location.z.toFixed(1)}`);
        logger.debug("UTILITY", `Search distance: ${distance} blocks`);

        const allMobs = [];
        const dimensions = ["overworld", "nether", "the_end"];

        // Track entities found
        let totalEntitiesChecked = 0;
        let playersSkipped = 0;
        let mocsWithoutPersonality = 0;

        for (const dimName of dimensions) {
            try {
                logger.debug("UTILITY", `Scanning dimension: ${dimName}`);

                const dim = world.getDimension(dimName);
                if (!dim) {
                    logger.warn("UTILITY", `Dimension ${dimName} not available`);
                    continue;
                }

                const entities = dim.getEntities();
                logger.debug("UTILITY", `Found ${entities.length} total entities in ${dimName}`);

                if (!entities || entities.length === 0) {
                    logger.debug("UTILITY", `No entities in ${dimName}`);
                    continue;
                }

                // Filter for nearby mobs (NOT just configured types)
                for (const entity of entities) {
                    totalEntitiesChecked++;

                    // Skip players
                    if (entity.typeId === "minecraft:player") {
                        playersSkipped++;
                        continue;
                    }

                    // Calculate distance
                    const dx = entity.location.x - location.x;
                    const dy = entity.location.y - location.y;
                    const dz = entity.location.z - location.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    logger.debug("UTILITY", `Entity: ${entity.typeId} @ distance ${dist.toFixed(1)}`);

                    // Include if in range (regardless of configuration)
                    if (dist <= distance) {
                        logger.success("UTILITY", `✓ Found nearby mob: ${entity.typeId} at ${dist.toFixed(1)} blocks`);
                        allMobs.push(entity);
                    }
                }
            } catch (dimError) {
                logger.error("UTILITY", `Error scanning dimension ${dimName}: ${dimError.message}`);
            }
        }

        logger.debug("UTILITY", `=== getNearbyMobs RESULTS ===`);
        logger.debug("UTILITY", `Total entities checked: ${totalEntitiesChecked}`);
        logger.debug("UTILITY", `Players skipped: ${playersSkipped}`);
        logger.debug("UTILITY", `Mobs found in range: ${allMobs.length}`);

        for (let i = 0; i < allMobs.length; i++) {
            logger.debug("UTILITY", `  [${i+1}] ${allMobs[i].typeId}`);
        }

        return allMobs;
    } catch (e) {
        logger.error("UTILITY", `CRITICAL: Error in getNearbyMobs: ${e.message}`);
        logger.error("UTILITY", `Stack: ${e.stack}`);
        return [];
    }
}

// ==================== PLUGIN READY ====================

logger.info("BOOT", "Gemini Mob Plugin module loaded successfully");
console.log("[GeminiMob] ✓ Plugin fully loaded and ready to use!");
