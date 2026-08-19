/**
 * Gemini Mob Plugin - Item-Based Interaction System
 * @version 1.0.0
 * Comprehensive system for mob interactions based on held items
 */

import { world } from "@minecraft/server";
import { getMobPersonality, updateMood } from "./mobPersonality.js";
import { getMobMemory, updateRelationship } from "./mobMemory.js";

// AGGRESSIVE ITEMS - Cause mobs to attack
const WEAPON_ITEMS = {
    "minecraft:diamond_sword": { damage: 7, threat: "high" },
    "minecraft:iron_sword": { damage: 6, threat: "high" },
    "minecraft:stone_sword": { damage: 5, threat: "medium" },
    "minecraft:wooden_sword": { damage: 4, threat: "medium" },
    "minecraft:netherite_sword": { damage: 8, threat: "extreme" },
    "minecraft:diamond_axe": { damage: 7, threat: "high" },
    "minecraft:iron_axe": { damage: 6, threat: "high" },
    "minecraft:trident": { damage: 8, threat: "high" },
    "minecraft:bow": { damage: 6, threat: "medium" },
    "minecraft:crossbow": { damage: 6, threat: "medium" },
    "minecraft:diamond_pickaxe": { damage: 5, threat: "medium" },
    "minecraft:iron_pickaxe": { damage: 4, threat: "medium" }
};

// HEALING ITEMS
const HEALING_ITEMS = {
    "minecraft:golden_apple": { trust: 50, effect: "instant_heal" },
    "minecraft:enchanted_golden_apple": { trust: 100, effect: "instant_heal_strong" },
    "minecraft:milk_bucket": { trust: 30, effect: "cure" },
    "minecraft:honey_bottle": { trust: 25, effect: "heal_slow" }
};

// MOB FOOD PREFERENCES
const MOB_FOOD_PREFERENCES = {
    "minecraft:cow": {
        favorite: ["minecraft:wheat", "minecraft:golden_carrot"],
        like: ["minecraft:hay_block", "minecraft:grass"],
        dislike: ["minecraft:rotten_flesh"],
        trust: { favorite: 20, like: 10, dislike: -15 }
    },
    "minecraft:sheep": {
        favorite: ["minecraft:wheat", "minecraft:golden_carrot"],
        like: ["minecraft:hay_block", "minecraft:grass"],
        dislike: ["minecraft:rotten_flesh"],
        trust: { favorite: 20, like: 10, dislike: -15 }
    },
    "minecraft:pig": {
        favorite: ["minecraft:carrot", "minecraft:potato", "minecraft:beetroot"],
        like: ["minecraft:brown_mushroom", "minecraft:red_mushroom"],
        dislike: ["minecraft:rotten_flesh"],
        trust: { favorite: 20, like: 10, dislike: -15 }
    },
    "minecraft:chicken": {
        favorite: ["minecraft:wheat_seeds", "minecraft:beetroot_seeds"],
        like: ["minecraft:wheat"],
        dislike: ["minecraft:rotten_flesh"],
        trust: { favorite: 15, like: 8, dislike: -10 }
    },
    "minecraft:rabbit": {
        favorite: ["minecraft:carrot", "minecraft:golden_carrot"],
        like: ["minecraft:dandelion"],
        dislike: ["minecraft:rotten_flesh"],
        trust: { favorite: 25, like: 12, dislike: -15 }
    },
    "minecraft:wolf": {
        favorite: ["minecraft:beef", "minecraft:cooked_beef"],
        like: ["minecraft:bone", "minecraft:rotten_flesh"],
        dislike: [],
        trust: { favorite: 30, like: 15, dislike: -10 }
    }
};

/**
 * Detect held item type
 */
export function getHeldItemType(player) {
    try {
        const inventory = player.getComponent("inventory");
        const container = inventory?.container;
        const heldItem = container?.getItem(player.selectedSlotIndex);

        return {
            itemId: heldItem?.typeId || "empty",
            itemName: heldItem?.typeId?.split(":")[1] || "empty",
            amount: heldItem?.amount || 0
        };
    } catch (e) {
        return { itemId: "empty", itemName: "empty", amount: 0 };
    }
}

/**
 * Check if item is a weapon
 */
export function isWeapon(itemId) {
    return WEAPON_ITEMS.hasOwnProperty(itemId);
}

/**
 * Check if item is healing item
 */
export function isHealingItem(itemId) {
    return HEALING_ITEMS.hasOwnProperty(itemId);
}

/**
 * Get weapon threat level
 */
export function getWeaponThreat(itemId) {
    const weapon = WEAPON_ITEMS[itemId];
    if (!weapon) return { threat: "none", damage: 0 };
    return weapon;
}

/**
 * Check if item is food for specific mob type
 */
export function isFoodForMob(mobTypeId, itemId) {
    const foodPrefs = MOB_FOOD_PREFERENCES[mobTypeId];
    if (!foodPrefs) return false;

    return foodPrefs.favorite.includes(itemId) ||
           foodPrefs.like.includes(itemId) ||
           foodPrefs.dislike.includes(itemId);
}

/**
 * Get food preference level
 */
export function getFoodPreference(mobTypeId, itemId) {
    const foodPrefs = MOB_FOOD_PREFERENCES[mobTypeId];
    if (!foodPrefs) return "neutral";

    if (foodPrefs.favorite.includes(itemId)) return "favorite";
    if (foodPrefs.like.includes(itemId)) return "like";
    if (foodPrefs.dislike.includes(itemId)) return "dislike";
    return "neutral";
}

/**
 * Get trust change based on food
 */
export function getTrustChangeForFood(mobTypeId, itemId) {
    const foodPrefs = MOB_FOOD_PREFERENCES[mobTypeId];
    if (!foodPrefs) return 5;

    const preference = getFoodPreference(mobTypeId, itemId);
    return foodPrefs.trust[preference] || 0;
}

/**
 * Handle weapon threat interaction
 */
export function handleWeaponThreat(mobId, playerId, playerName, weaponItem) {
    try {
        const personality = getMobPersonality(mobId);
        if (!personality) return { success: false };

        const memory = getMobMemory(mobId, playerId);
        const weapon = getWeaponThreat(weaponItem.itemId);

        let trustLoss = 30;
        let aggressionIncrease = weapon.threat === "extreme" ? 40 :
                                weapon.threat === "high" ? 30 : 20;

        personality.happiness = Math.max(0, personality.happiness - 40);
        personality.fear = Math.min(100, (personality.fear || 0) + aggressionIncrease);
        memory.isHostile = true;
        memory.lastThreatTime = Date.now();
        memory.lastThreatWeapon = weaponItem.itemId;

        updateRelationship(mobId, playerId, -trustLoss);
        updateMood(mobId, personality);

        return {
            success: true,
            threat: weapon.threat,
            hostileLevel: aggressionIncrease,
            message: `${personality.name} sees the ${weaponItem.itemName} and becomes aggressive!`
        };
    } catch (e) {
        return { success: false, message: `Error: ${e.message}` };
    }
}

/**
 * Handle healing/help interaction
 */
export function handleHealingInteraction(mobId, playerId, playerName, healingItem) {
    try {
        const personality = getMobPersonality(mobId);
        if (!personality) return { success: false };

        const memory = getMobMemory(mobId, playerId);
        const healing = HEALING_ITEMS[healingItem.itemId];

        personality.happiness = Math.min(100, personality.happiness + 40);
        personality.fear = Math.max(0, (personality.fear || 0) - 30);

        memory.isHostile = false;
        memory.lastHelpTime = Date.now();
        memory.helpCount = (memory.helpCount || 0) + 1;

        updateRelationship(mobId, playerId, healing.trust);
        updateMood(mobId, personality);

        return {
            success: true,
            effect: healing.effect,
            trustGain: healing.trust,
            message: `${personality.name} feels helped and thanks you!`
        };
    } catch (e) {
        return { success: false, message: `Error: ${e.message}` };
    }
}

/**
 * Check if mob should defend player
 */
export function shouldMobDefendPlayer(mobId, playerId) {
    try {
        const memory = getMobMemory(mobId, playerId);
        const personality = getMobPersonality(mobId);

        const isLoyalEnough = memory.trust > 80;
        const notBetrayedRecently = !memory.isHostile &&
                                    (!memory.lastThreatTime ||
                                     Date.now() - memory.lastThreatTime > 60000);
        const hasGoodMood = personality.mood === "happy" ||
                           personality.mood === "playful" ||
                           personality.mood === "loving";

        return isLoyalEnough && notBetrayedRecently && hasGoodMood;
    } catch (e) {
        return false;
    }
}

/**
 * Make mob attack target
 */
export function makeMobAttackTarget(mobEntity, targetEntity) {
    try {
        if (!mobEntity || !targetEntity) return false;
        mobEntity.attack(targetEntity);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Make mob stop being hostile
 */
export function makeMobCalm(mobId, playerId) {
    try {
        const memory = getMobMemory(mobId, playerId);
        const personality = getMobPersonality(mobId);

        memory.isHostile = false;
        personality.fear = Math.max(0, (personality.fear || 0) - 20);

        updateMood(mobId, personality);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get mob loyalty status
 */
export function getMobLoyaltyStatus(mobId, playerId) {
    try {
        const memory = getMobMemory(mobId, playerId);
        const personality = getMobPersonality(mobId);

        const trustLevel = memory.trust;
        const isHostile = memory.isHostile;

        if (isHostile) {
            return {
                status: "HOSTILE",
                description: "WILL ATTACK YOU",
                color: "§c",
                defendsYou: false
            };
        } else if (trustLevel < 0) {
            return {
                status: "DISTRUSTFUL",
                description: "Wary and unfriendly",
                color: "§e",
                defendsYou: false
            };
        } else if (trustLevel < 50) {
            return {
                status: "NEUTRAL",
                description: "Neither friend nor foe",
                color: "§7",
                defendsYou: false
            };
        } else if (trustLevel < 80) {
            return {
                status: "FRIENDLY",
                description: "Will not attack you",
                color: "§a",
                defendsYou: false
            };
        } else {
            return {
                status: "LOYAL",
                description: "WILL DEFEND YOU IN BATTLE",
                color: "§b",
                defendsYou: true
            };
        }
    } catch (e) {
        return { status: "UNKNOWN", description: "Error", color: "§7", defendsYou: false };
    }
}

export const WEAPON_ITEMS_EXPORT = WEAPON_ITEMS;
export const HEALING_ITEMS_EXPORT = HEALING_ITEMS;
export const MOB_FOOD_PREFERENCES_EXPORT = MOB_FOOD_PREFERENCES;
