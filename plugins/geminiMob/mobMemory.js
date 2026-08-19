/**
 * Gemini Mob Plugin - Memory System Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Comprehensive memory and relationship system for mobs
 */

import { world } from "@minecraft/server";
import { getConfig, getRelationshipLevel } from "./config.js";

/**
 * Get or create mob memory for a player
 */
export function getMobMemory(mobId, playerId) {
    const stored = world.getDynamicProperty(`geniimob:memory:${mobId}:${playerId}`);

    if (stored) {
        return JSON.parse(stored);
    }

    return createDefaultMemory(mobId, playerId);
}

/**
 * Create default memory entry
 */
function createDefaultMemory(mobId, playerId) {
    return {
        mobId,
        playerId,
        trust: 0,
        interactions: [],
        significantMemories: [],
        isTamed: false,
        owner: null,
        firstMet: Date.now(),
        lastInteraction: null,
        isFriendly: false,
        isHostile: false,
        friendshipLevel: 0,
        favoriteItem: null,
        favoriteFood: null,
        associatedWithDanger: false,
        memories: []
    };
}

/**
 * Update relationship (trust level)
 */
export function updateRelationship(mobId, playerId, trustChange) {
    const memory = getMobMemory(mobId, playerId);

    const oldTrust = memory.trust;
    const newTrust = memory.trust + trustChange;

    // Clamp trust value
    memory.trust = Math.max(-100, Math.min(200, newTrust));

    // Update relationship flags
    if (memory.trust > 30) {
        memory.isFriendly = true;
        memory.isHostile = false;
    } else if (memory.trust < -30) {
        memory.isHostile = true;
        memory.isFriendly = false;
    } else {
        memory.isFriendly = false;
        memory.isHostile = false;
    }

    // Update friendship level
    memory.friendshipLevel = calculateFriendshipLevel(memory.trust);

    // Save memory
    saveMemory(mobId, playerId, memory);

    return {
        oldTrust,
        newTrust,
        trustChange,
        relationship: getRelationshipLevel(newTrust)
    };
}

/**
 * Record interaction with mob
 */
export function recordInteraction(mobId, playerId, interactionType, details = {}) {
    const memory = getMobMemory(mobId, playerId);

    const interaction = {
        type: interactionType,
        timestamp: Date.now(),
        details
    };

    // Keep last 50 interactions
    if (!memory.interactions) {
        memory.interactions = [];
    }

    memory.interactions.push(interaction);
    if (memory.interactions.length > 50) {
        memory.interactions.shift();
    }

    memory.lastInteraction = interaction;

    // Check if this is a significant memory
    if (shouldBecomeSignificantMemory(interactionType, details)) {
        addSignificantMemory(memory, interaction);
    }

    saveMemory(mobId, playerId, memory);

    return interaction;
}

/**
 * Check if interaction should be significant memory
 */
function shouldBecomeSignificantMemory(interactionType, details) {
    const significantTypes = ["tame", "breed", "dangerous_hit", "great_feast"];
    return significantTypes.includes(interactionType) || (details && details.significant);
}

/**
 * Add significant memory
 */
function addSignificantMemory(memory, interaction) {
    if (!memory.significantMemories) {
        memory.significantMemories = [];
    }

    const significantMemory = {
        ...interaction,
        description: generateMemoryDescription(interaction),
        importance: calculateMemoryImportance(interaction)
    };

    memory.significantMemories.push(significantMemory);

    // Keep last 20 significant memories
    if (memory.significantMemories.length > 20) {
        memory.significantMemories.shift();
    }
}

/**
 * Generate memory description
 */
function generateMemoryDescription(interaction) {
    const descriptions = {
        tame: "I was tamed by this person",
        breed: "I had babies with another creature",
        dangerous_hit: "This person attacked me badly",
        great_feast: "This person gave me a great meal",
        feed: "This person fed me",
        pet: "This person petted me",
        talk: "This person talked to me",
        hit: "This person attacked me",
        observe: "This person watched me"
    };

    return descriptions[interaction.type] || "Something happened";
}

/**
 * Calculate memory importance
 */
function calculateMemoryImportance(interaction) {
    const importance = {
        tame: 10,
        breed: 9,
        dangerous_hit: 8,
        great_feast: 7,
        feed: 3,
        pet: 4,
        talk: 2,
        hit: 6,
        observe: 1
    };

    return importance[interaction.type] || 1;
}

/**
 * Save memory to world
 */
function saveMemory(mobId, playerId, memory) {
    world.setDynamicProperty(`geniimob:memory:${mobId}:${playerId}`, JSON.stringify(memory));
}

/**
 * Get friendship level from trust
 */
function calculateFriendshipLevel(trust) {
    if (trust >= 150) return 5; // Best friends
    if (trust >= 100) return 4; // Great friends
    if (trust >= 50) return 3; // Friends
    if (trust >= 20) return 2; // Acquaintances
    if (trust >= 0) return 1; // Neutral
    if (trust >= -30) return 0; // Unfriendly
    return -1; // Hostile
}

/**
 * Get all memories for a mob
 */
export function getAllMobMemories(mobId) {
    const stored = world.getDynamicProperty(`geniimob:all-memories:${mobId}`);

    if (stored) {
        return JSON.parse(stored);
    }

    return [];
}

/**
 * Get relationship status for display
 */
export function getRelationshipStatus(mobId, playerId) {
    const memory = getMobMemory(mobId, playerId);
    const relationshipLevel = getRelationshipLevel(memory.trust);

    return {
        emoji: relationshipLevel.emoji,
        color: relationshipLevel.color,
        level: relationshipLevel.level,
        trust: memory.trust,
        friendshipLevel: memory.friendshipLevel,
        isTamed: memory.isTamed,
        isFriendly: memory.isFriendly,
        isHostile: memory.isHostile,
        daysSinceMet: Math.floor((Date.now() - memory.firstMet) / (1000 * 60 * 60 * 24)),
        interactionCount: memory.interactions?.length || 0,
        significantMemories: memory.significantMemories?.length || 0
    };
}

/**
 * Get memories for AI context
 */
export function getMemoriesForContext(mobId, playerId) {
    const memory = getMobMemory(mobId, playerId);

    if (!memory.significantMemories || memory.significantMemories.length === 0) {
        return [];
    }

    // Return formatted memories for AI
    return memory.significantMemories.map(m => ({
        description: m.description,
        timeAgo: formatTimeAgo(m.timestamp),
        importance: m.importance
    }));
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
    const ms = Date.now() - timestamp;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
}

/**
 * Decay memories over time
 */
export function decayMemories(mobId) {
    const allMemories = getAllMobMemories(mobId);
    const decayRate = getConfig("memoryDecayTime", 3600); // Default 1 hour

    for (const memory of allMemories) {
        // Decay trust slightly over time if no recent interactions
        const timeSinceLastInteraction = Date.now() - (memory.lastInteraction?.timestamp || memory.firstMet);
        const decayFactor = timeSinceLastInteraction / (decayRate * 1000);

        if (decayFactor > 1) {
            memory.trust = Math.max(memory.trust - 1, memory.trust * 0.99);
        }

        // Remove old interactions
        if (memory.interactions) {
            memory.interactions = memory.interactions.filter(i => (Date.now() - i.timestamp) / 1000 < decayRate * 10);
        }

        saveMemory(mobId, memory.playerId, memory);
    }
}

/**
 * Predict mob behavior based on memories
 */
export function predictMobBehavior(mobId, playerId) {
    const memory = getMobMemory(mobId, playerId);
    const relationships = getRelationshipStatus(mobId, playerId);

    let behavior = "neutral";
    let confidence = 0.5;

    if (relationships.isHostile) {
        behavior = "aggressive";
        confidence = 0.9;
    } else if (relationships.isFriendly) {
        behavior = "friendly";
        confidence = 0.8;
    } else if (relationships.trust > 50) {
        behavior = "curious";
        confidence = 0.7;
    }

    // Recent interactions might change prediction
    const recentInteractions = memory.interactions?.slice(-5) || [];
    for (const interaction of recentInteractions) {
        if (interaction.type === "hit") {
            behavior = "defensive";
            confidence = 0.85;
            break;
        }
    }

    return {
        behavior,
        confidence,
        likelihood: Math.round(confidence * 100) + "%"
    };
}

/**
 * Check if mob remembers player
 */
export function doesMobRemember(mobId, playerId) {
    const memory = getMobMemory(mobId, playerId);
    return memory.interactions && memory.interactions.length > 0;
}

/**
 * Get trust percentage
 */
export function getTrustPercentage(mobId, playerId) {
    const memory = getMobMemory(mobId, playerId);
    return Math.max(0, Math.min(100, memory.trust));
}

/**
 * Reset memory (dangerous!)
 */
export function resetMemory(mobId, playerId) {
    const newMemory = createDefaultMemory(mobId, playerId);
    saveMemory(mobId, playerId, newMemory);
    return newMemory;
}

/**
 * Merge memories if mob has multiple instances
 */
export function mergeMemories(mobId, newMobId) {
    const stored = world.getDynamicProperty(`geniimob:all-memories:${mobId}`);

    if (stored) {
        const memories = JSON.parse(stored);

        for (const memory of memories) {
            // Copy memory to new mob ID
            const newMemory = { ...memory, mobId: newMobId };
            saveMemory(newMobId, memory.playerId, newMemory);
        }

        // Clear old memories
        world.clearDynamicProperty(`geniimob:all-memories:${mobId}`);
    }
}

/**
 * Get mob's best friend
 */
export function getMobsBestFriend(mobId) {
    const stored = world.getDynamicProperty(`geniimob:all-memories:${mobId}`);

    if (!stored) return null;

    const memories = JSON.parse(stored);
    let bestFriend = null;
    let highestTrust = -Infinity;

    for (const memory of memories) {
        if (memory.trust > highestTrust) {
            highestTrust = memory.trust;
            bestFriend = memory;
        }
    }

    return bestFriend;
}

/**
 * Get mob's enemies
 */
export function getMobsEnemies(mobId) {
    const stored = world.getDynamicProperty(`geniimob:all-memories:${mobId}`);

    if (!stored) return [];

    const memories = JSON.parse(stored);
    return memories.filter(m => m.trust < -30);
}

export default {
    getMobMemory,
    updateRelationship,
    recordInteraction,
    getRelationshipStatus,
    getMemoriesForContext,
    decayMemories,
    predictMobBehavior,
    doesMobRemember,
    getTrustPercentage,
    resetMemory,
    mergeMemories,
    getMobsBestFriend,
    getMobsEnemies
};
