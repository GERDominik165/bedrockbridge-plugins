/**
 * Gemini Mob Plugin - Interaction System Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Comprehensive system for mob interactions (feeding, petting, hitting, etc.)
 * INCLUDES: Item-based interactions, weapon detection, healing items, food preferences
 */

import { world, EntityDamageCause } from "@minecraft/server";
import { getMobPersonality, updateMood, getPersonalityReaction, isCompatibleWithPersonality } from "./mobPersonality.js";
import { getMobMemory, updateRelationship, recordInteraction } from "./mobMemory.js";
import { getMobType } from "./config.js";

// ==================== ITEM SYSTEM - WEAPONS ====================

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

// ==================== ITEM SYSTEM - HEALING ====================

const HEALING_ITEMS = {
    "minecraft:golden_apple": { trust: 50, effect: "instant_heal" },
    "minecraft:enchanted_golden_apple": { trust: 100, effect: "instant_heal_strong" },
    "minecraft:milk_bucket": { trust: 30, effect: "cure" },
    "minecraft:honey_bottle": { trust: 25, effect: "heal_slow" }
};

// ==================== ITEM SYSTEM - FOOD PREFERENCES ====================

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

// ==================== ITEM DETECTION FUNCTIONS ====================

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

// ==================== WEAPON THREAT HANDLING ====================

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

// ==================== HEALING ITEM HANDLING ====================

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

// ==================== COMBAT ALLIANCE ====================

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

// ==================== LOYALTY STATUS ====================

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

/**
 * Handle feeding interaction
 */
export function handleFeedingInteraction(mobId, playerId, playerName, itemId) {
    try {
        const personality = getMobPersonality(mobId);
        if (!personality) {
            return { success: false, message: "Mob personality not found." };
        }

        const memory = getMobMemory(mobId, playerId);
        const mobType = getMobType(personality.typeId);

        // Check if item is valid food
        if (!mobType || !mobType.interactions || !mobType.interactions.feed) {
            return { success: false, message: "This mob doesn't eat that." };
        }

        const validFood = mobType.interactions.feed;
        const isFoodValid = validFood.some(f => itemId.includes(f.toLowerCase()));

        if (!isFoodValid) {
            return { success: false, message: `${personality.typeName} doesn't want that food.` };
        }

        // Calculate trust gain
        let trustGain = 5;
        const isFavoriteFood = personality.preferences?.favoriteFood?.some(f => itemId.includes(f.toLowerCase()));

        if (isFavoriteFood) {
            trustGain = 15;
        } else if (personality.preferences?.dislikedFood?.some(f => itemId.includes(f.toLowerCase()))) {
            trustGain = -5;
        }

        // Apply personality modifiers
        if (personality.traits?.trustGain) {
            trustGain *= personality.traits.trustGain;
        }

        // Record interaction
        recordInteraction(mobId, playerId, "feed", { item: itemId });
        updateRelationship(mobId, playerId, trustGain);

        // Update personality
        personality.hunger = Math.max(0, personality.hunger - 30);
        personality.happiness = Math.min(100, personality.happiness + 10);
        personality.energy = Math.min(100, personality.energy + 5);

        updateMood(mobId, personality);

        const reaction = getPersonalityReaction(personality, "feed");

        return {
            success: true,
            trustGain,
            message: `${personality.typeName} ${reaction.response}`,
            personalityReaction: reaction.response
        };
    } catch (e) {
        return { success: false, message: `Error during feeding: ${e.message}` };
    }
}

/**
 * Handle petting interaction
 */
export function handlePettingInteraction(mobId, playerId, playerName) {
    try {
        const personality = getMobPersonality(mobId);
        if (!personality) {
            return { success: false, message: "Mob personality not found." };
        }

        const memory = getMobMemory(mobId, playerId);
        const mobType = getMobType(personality.typeId);

        // Check compatibility
        if (!isCompatibleWithPersonality(personality, "pet")) {
            recordInteraction(mobId, playerId, "pet", { success: false });
            updateRelationship(mobId, playerId, -5);

            return {
                success: false,
                message: `${personality.typeName} doesn't want to be petted right now.`
            };
        }

        // Calculate trust gain based on personality
        let trustGain = 3;

        if (personality.traits?.trustGain) {
            trustGain *= personality.traits.trustGain / 2;
        }

        // Recent positive interactions boost trust gain
        const recentPositiveInteractions = getRecentPositiveInteractions(mobId, playerId, 120);
        if (recentPositiveInteractions > 0) {
            trustGain += recentPositiveInteractions * 1.5;
        }

        recordInteraction(mobId, playerId, "pet");
        updateRelationship(mobId, playerId, trustGain);

        // Update personality
        personality.happiness = Math.min(100, personality.happiness + 15);
        personality.energy = Math.max(0, personality.energy - 5);

        updateMood(mobId, personality);

        const reaction = getPersonalityReaction(personality, "pet");

        return {
            success: true,
            trustGain,
            message: `${personality.typeName} ${reaction.response}`,
            personalityReaction: reaction.response
        };
    } catch (e) {
        return { success: false, message: `Error during petting: ${e.message}` };
    }
}

/**
 * Handle attacking interaction
 */
export function handleAttackInteraction(mobId, playerId, playerName, damage = 1) {
    try {
        const personality = getMobPersonality(mobId);
        if (!personality) {
            return { success: false, message: "Mob personality not found." };
        }

        const memory = getMobMemory(mobId, playerId);
        const mobType = getMobType(personality.typeId);

        const trustLoss = damage * 10;

        recordInteraction(mobId, playerId, "hit", { damage });
        updateRelationship(mobId, playerId, -trustLoss);

        // Update personality
        personality.happiness = Math.max(0, personality.happiness - 20);
        personality.energy = Math.min(100, personality.energy + 10); // Fear boost
        personality.curiosity = Math.max(0, personality.curiosity - 15);

        // Mark player as dangerous
        if (memory.trust < -50) {
            memory.isHostile = true;
        }

        updateMood(mobId, personality);

        const reaction = getPersonalityReaction(personality, "hit");

        return {
            success: true,
            trustLoss,
            message: `${personality.typeName} ${reaction.response}`,
            personalityReaction: reaction.response,
            isHostile: memory.trust < -50
        };
    } catch (e) {
        return { success: false, message: `Error during attack: ${e.message}` };
    }
}

/**
 * Handle breeding interaction
 */
export function handleBreedingInteraction(mobId1, mobId2, playerId) {
    const personality1 = getMobPersonality(mobId1);
    const personality2 = getMobPersonality(mobId2);
    const memory1 = getMobMemory(mobId1, playerId);
    const memory2 = getMobMemory(mobId2, playerId);

    // Check if breeding is possible
    if (personality1.typeId !== personality2.typeId) {
        return { success: false, message: "These mobs can't breed together." };
    }

    const mobType = getMobType(personality1.typeId);
    if (!mobType || !mobType.traits || !mobType.traits.breed) {
        return { success: false, message: `${personality1.typeName}s can't breed.` };
    }

    // Check relationship levels
    if (memory1.trust < 30 || memory2.trust < 30) {
        return { success: false, message: "These mobs don't trust each other enough." };
    }

    // Check stats
    if (personality1.energy < 30 || personality2.energy < 30) {
        return { success: false, message: "These mobs are too tired to breed." };
    }

    if (personality1.hunger > 60 || personality2.hunger > 60) {
        return { success: false, message: "These mobs are too hungry to breed." };
    }

    // Breeding successful
    recordInteraction(mobId1, playerId, "breed", { partner: mobId2 });
    recordInteraction(mobId2, playerId, "breed", { partner: mobId1 });

    // Update both mobs
    personality1.energy = Math.max(0, personality1.energy - 40);
    personality1.happiness = Math.min(100, personality1.happiness + 20);

    personality2.energy = Math.max(0, personality2.energy - 40);
    personality2.happiness = Math.min(100, personality2.happiness + 20);

    updateMood(mobId1, personality1);
    updateMood(mobId2, personality2);

    return {
        success: true,
        message: `${personality1.typeName}s are breeding! A baby will arrive soon.`,
        babyName: generateBabyName(personality1)
    };
}

/**
 * Handle taming interaction
 */
export function handleTamingInteraction(mobId, playerId, playerName) {
    try {
        const personality = getMobPersonality(mobId);
        if (!personality) {
            return { success: false, message: "Mob personality not found." };
        }

        const memory = getMobMemory(mobId, playerId);
        const mobType = getMobType(personality.typeId);

        // Check if tameable
        if (!mobType || !mobType.traits || !mobType.traits.tame) {
            return { success: false, message: `${personality.typeName} can't be tamed.` };
        }

        // Check trust level
        if (memory.trust < 50) {
            return { success: false, message: `${personality.typeName} doesn't trust you enough.` };
        }

        // Taming attempt
        const tamingChance = Math.min(0.95, memory.trust / 100);

        if (Math.random() > tamingChance) {
            recordInteraction(mobId, playerId, "tame", { success: false });
            updateRelationship(mobId, playerId, -10);

            return {
                success: false,
                message: `${personality.typeName} refuses to be tamed.`,
                chance: tamingChance
            };
        }

        // Successful taming
        recordInteraction(mobId, playerId, "tame", { success: true });
        memory.isTamed = true;
        memory.owner = playerId;
        memory.tamedAt = Date.now();

        updateRelationship(mobId, playerId, 50);

        personality.happiness = Math.min(100, personality.happiness + 30);
        updateMood(mobId, personality);

        world.setDynamicProperty(`geniimob:memory:${mobId}:${playerId}`, JSON.stringify(memory));

        return {
            success: true,
            message: `${personality.typeName} is now tamed! It will follow ${playerName}.`,
            isTamed: true
        };
    } catch (e) {
        return { success: false, message: `Error during taming: ${e.message}` };
    }
}

/**
 * Handle talking to mob (triggers AI response)
 */
export function handleTalkingInteraction(mobId, playerId, playerName, message) {
    const personality = getMobPersonality(mobId);
    const memory = getMobMemory(mobId, playerId);

    recordInteraction(mobId, playerId, "talk", { message });

    // Build conversation context
    const context = buildConversationContext(mobId, playerId, playerName, personality, memory);

    return {
        success: true,
        context,
        personality,
        memory,
        shouldGenerateResponse: true
    };
}

/**
 * Handle observation interaction
 */
export function handleObservationInteraction(mobId, playerId) {
    const personality = getMobPersonality(mobId);
    const memory = getMobMemory(mobId, playerId);

    recordInteraction(mobId, playerId, "observe");

    return {
        success: true,
        mobDescription: {
            type: personality.typeName,
            mood: personality.mood,
            personalities: personality.personalities,
            energy: personality.energy,
            hunger: personality.hunger,
            happiness: personality.happiness,
            trust: memory.trust,
            favoriteFood: personality.preferences?.favoriteFood || [],
            likes: personality.likes || [],
            dislikes: personality.dislikes || []
        }
    };
}

/**
 * Build context for mob AI conversation
 */
function buildConversationContext(mobId, playerId, playerName, personality, memory) {
    const mobType = getMobType(personality.typeId);
    const recentInteractions = getRecentInteractions(mobId, playerId, 300); // Last 5 minutes

    return {
        mobName: personality.typeName,
        personalities: personality.personalities,
        mood: personality.mood,
        playerName,
        trustLevel: memory.trust,
        recentInteractions: formatInteractionHistory(recentInteractions),
        preferences: personality.preferences,
        likes: personality.likes,
        dislikes: personality.dislikes,
        quirks: personality.quirks,
        memories: memory.significantMemories || []
    };
}

/**
 * Get recent interactions
 */
function getRecentInteractions(mobId, playerId, timeWindow = 300) {
    const stored = world.getDynamicProperty(`geniimob:interactions:${mobId}:${playerId}`);
    if (!stored) return [];

    const interactions = JSON.parse(stored);
    const now = Date.now();

    return interactions.filter(i => (now - i.timestamp) / 1000 < timeWindow);
}

/**
 * Format interaction history for AI
 */
function formatInteractionHistory(interactions) {
    return interactions.map(i => ({
        type: i.type,
        timeAgo: formatTimeDifference(i.timestamp),
        details: i.details || {}
    }));
}

/**
 * Format time difference
 */
function formatTimeDifference(timestamp) {
    const seconds = (Date.now() - timestamp) / 1000;

    if (seconds < 60) return `${Math.round(seconds)}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    return `${Math.round(seconds / 3600)}h ago`;
}

/**
 * Get recent positive interactions
 */
function getRecentPositiveInteractions(mobId, playerId, timeWindow = 120) {
    const interactions = getRecentInteractions(mobId, playerId, timeWindow);
    return interactions.filter(i => ["feed", "pet", "talk"].includes(i.type)).length;
}

/**
 * Generate baby mob name
 */
function generateBabyName(personality) {
    const names = [
        "Little " + personality.typeName,
        "Baby " + personality.typeName,
        "Junior",
        "Tiny",
        "Pebbles",
        "Spark",
        "Whiskers",
        "Sprout",
        "Scout"
    ];

    return names[Math.floor(Math.random() * names.length)];
}

/**
 * Check if interaction is available
 */
export function isInteractionAvailable(mobId, interactionType) {
    const personality = getMobPersonality(mobId);
    const mobType = getMobType(personality.typeId);

    if (!mobType) return false;

    const availableInteractions = Object.keys(mobType.interactions || {});
    return availableInteractions.includes(interactionType);
}

/**
 * Get available interactions for a mob
 */
export function getAvailableInteractions(mobId) {
    const personality = getMobPersonality(mobId);
    const mobType = getMobType(personality.typeId);

    if (!mobType) return [];

    return Object.keys(mobType.interactions || {});
}

/**
 * Calculate interaction success rate
 */
export function calculateInteractionSuccessRate(mobId, playerId, interactionType) {
    const personality = getMobPersonality(mobId);
    const memory = getMobMemory(mobId, playerId);

    let baseRate = 0.5;

    if (interactionType === "pet") {
        baseRate = isCompatibleWithPersonality(personality, "pet") ? 0.7 : 0.2;
    } else if (interactionType === "feed") {
        baseRate = 0.8;
    } else if (interactionType === "talk") {
        baseRate = 0.9;
    }

    // Modify by trust
    const trustModifier = memory.trust / 100;
    const finalRate = Math.min(0.99, baseRate + trustModifier * 0.3);

    return finalRate;
}

export default {
    // Original handlers
    handleFeedingInteraction,
    handlePettingInteraction,
    handleAttackInteraction,
    handleBreedingInteraction,
    handleTamingInteraction,
    handleTalkingInteraction,
    handleObservationInteraction,
    isInteractionAvailable,
    getAvailableInteractions,
    calculateInteractionSuccessRate,
    // Item system functions
    getHeldItemType,
    isWeapon,
    isHealingItem,
    getWeaponThreat,
    isFoodForMob,
    getFoodPreference,
    getTrustChangeForFood,
    handleWeaponThreat,
    handleHealingInteraction,
    shouldMobDefendPlayer,
    makeMobAttackTarget,
    makeMobCalm,
    getMobLoyaltyStatus
};
