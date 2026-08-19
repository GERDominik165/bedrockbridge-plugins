/**
 * Gemini Mob Plugin - Database Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Persistence layer for mob data using world dynamic properties and file storage
 */

import { world } from "@minecraft/server";
import { getConfig } from "./config.js";

/**
 * Initialize database
 */
export function initializeDatabase() {
    const enablePersistence = getConfig("enablePersistence", true);

    if (!enablePersistence) {
        console.log("Mob persistence disabled");
        return;
    }

    // Create index of all mobs
    ensureIndexExists();

    console.log("Mob database initialized");
}

/**
 * Ensure index exists
 */
function ensureIndexExists() {
    const indexStored = world.getDynamicProperty("geniimob:index");

    if (!indexStored) {
        world.setDynamicProperty("geniimob:index", JSON.stringify({
            mobs: [],
            lastUpdated: Date.now()
        }));
    }
}

/**
 * Save mob to database
 */
export function saveMobData(mobId, mobData) {
    try {
        world.setDynamicProperty(`geniimob:mob:${mobId}`, JSON.stringify(mobData));
        addToIndex(mobId);
        return true;
    } catch (e) {
        console.error(`Failed to save mob ${mobId}:`, e);
        return false;
    }
}

/**
 * Load mob from database
 */
export function loadMobData(mobId) {
    try {
        const stored = world.getDynamicProperty(`geniimob:mob:${mobId}`);

        if (!stored) {
            return null;
        }

        return JSON.parse(stored);
    } catch (e) {
        console.error(`Failed to load mob ${mobId}:`, e);
        return null;
    }
}

/**
 * Delete mob from database
 */
export function deleteMobData(mobId) {
    try {
        world.clearDynamicProperty(`geniimob:mob:${mobId}`);
        removeFromIndex(mobId);
        return true;
    } catch (e) {
        console.error(`Failed to delete mob ${mobId}:`, e);
        return false;
    }
}

/**
 * Add mob to index
 */
function addToIndex(mobId) {
    try {
        const indexStored = world.getDynamicProperty("geniimob:index");

        if (!indexStored) {
            ensureIndexExists();
            return;
        }

        const index = JSON.parse(indexStored);

        if (!index.mobs.includes(mobId)) {
            index.mobs.push(mobId);
            index.lastUpdated = Date.now();
            world.setDynamicProperty("geniimob:index", JSON.stringify(index));
        }
    } catch (e) {
        console.error("Failed to update index:", e);
    }
}

/**
 * Remove mob from index
 */
function removeFromIndex(mobId) {
    try {
        const indexStored = world.getDynamicProperty("geniimob:index");

        if (!indexStored) return;

        const index = JSON.parse(indexStored);
        index.mobs = index.mobs.filter(id => id !== mobId);
        index.lastUpdated = Date.now();

        world.setDynamicProperty("geniimob:index", JSON.stringify(index));
    } catch (e) {
        console.error("Failed to update index:", e);
    }
}

/**
 * Get all mobs
 */
export function getAllMobs() {
    try {
        const indexStored = world.getDynamicProperty("geniimob:index");

        if (!indexStored) {
            return [];
        }

        const index = JSON.parse(indexStored);
        const mobs = [];

        for (const mobId of index.mobs) {
            const mobData = loadMobData(mobId);
            if (mobData) {
                mobs.push(mobData);
            }
        }

        return mobs;
    } catch (e) {
        console.error("Failed to get all mobs:", e);
        return [];
    }
}

/**
 * Get mobs by type
 */
export function getMobsByType(typeId) {
    const allMobs = getAllMobs();
    return allMobs.filter(mob => mob.typeId === typeId);
}

/**
 * Get mobs by personality trait
 */
export function getMobsByPersonality(trait) {
    const allMobs = getAllMobs();
    return allMobs.filter(mob => mob.personalities && mob.personalities.includes(trait));
}

/**
 * Save player memory
 */
export function savePlayerMemory(mobId, playerId, memoryData) {
    try {
        world.setDynamicProperty(
            `geniimob:memory:${mobId}:${playerId}`,
            JSON.stringify(memoryData)
        );
        return true;
    } catch (e) {
        console.error(`Failed to save memory for ${mobId}:${playerId}:`, e);
        return false;
    }
}

/**
 * Load player memory
 */
export function loadPlayerMemory(mobId, playerId) {
    try {
        const stored = world.getDynamicProperty(`geniimob:memory:${mobId}:${playerId}`);

        if (!stored) {
            return null;
        }

        return JSON.parse(stored);
    } catch (e) {
        console.error(`Failed to load memory for ${mobId}:${playerId}:`, e);
        return null;
    }
}

/**
 * Save interaction record
 */
export function saveInteractionRecord(mobId, playerId, interaction) {
    try {
        const key = `geniimob:interactions:${mobId}:${playerId}`;
        const stored = world.getDynamicProperty(key);

        let interactions = [];

        if (stored) {
            interactions = JSON.parse(stored);
        }

        interactions.push(interaction);

        // Keep last 100 interactions
        if (interactions.length > 100) {
            interactions = interactions.slice(-100);
        }

        world.setDynamicProperty(key, JSON.stringify(interactions));
        return true;
    } catch (e) {
        console.error(`Failed to save interaction for ${mobId}:${playerId}:`, e);
        return false;
    }
}

/**
 * Load interaction records
 */
export function loadInteractionRecords(mobId, playerId) {
    try {
        const stored = world.getDynamicProperty(`geniimob:interactions:${mobId}:${playerId}`);

        if (!stored) {
            return [];
        }

        return JSON.parse(stored);
    } catch (e) {
        console.error(`Failed to load interactions for ${mobId}:${playerId}:`, e);
        return [];
    }
}

/**
 * Clear old interactions
 */
export function clearOldInteractions(mobId, playerId, maxAge = 604800000) { // 7 days default
    try {
        const interactions = loadInteractionRecords(mobId, playerId);
        const now = Date.now();

        const filtered = interactions.filter(i => (now - i.timestamp) < maxAge);

        world.setDynamicProperty(
            `geniimob:interactions:${mobId}:${playerId}`,
            JSON.stringify(filtered)
        );

        return filtered.length;
    } catch (e) {
        console.error(`Failed to clear old interactions for ${mobId}:${playerId}:`, e);
        return 0;
    }
}

/**
 * Get database statistics
 */
export function getDatabaseStatistics() {
    try {
        const allMobs = getAllMobs();
        const totalInteractions = allMobs.reduce((sum, mob) => {
            const stored = world.getDynamicProperty(`geniimob:all-memories:${mob.mobId}`);
            return sum + (stored ? JSON.parse(stored).length : 0);
        }, 0);

        return {
            totalMobs: allMobs.length,
            totalMemories: totalInteractions,
            lastUpdated: new Date().toISOString(),
            mobileTypes: [...new Set(allMobs.map(m => m.typeId))].length
        };
    } catch (e) {
        console.error("Failed to get database statistics:", e);
        return { totalMobs: 0, totalMemories: 0 };
    }
}

/**
 * Export mob data
 */
export function exportMobData(mobId) {
    try {
        const mobData = loadMobData(mobId);

        if (!mobData) {
            return null;
        }

        const memoryIndex = world.getDynamicProperty(`geniimob:all-memories:${mobId}`);
        let memories = [];

        if (memoryIndex) {
            memories = JSON.parse(memoryIndex);
        }

        return {
            mob: mobData,
            memories,
            exportDate: new Date().toISOString()
        };
    } catch (e) {
        console.error(`Failed to export mob ${mobId}:`, e);
        return null;
    }
}

/**
 * Import mob data
 */
export function importMobData(mobId, exportedData) {
    try {
        if (!exportedData || !exportedData.mob) {
            return false;
        }

        saveMobData(mobId, exportedData.mob);

        if (exportedData.memories && exportedData.memories.length > 0) {
            world.setDynamicProperty(
                `geniimob:all-memories:${mobId}`,
                JSON.stringify(exportedData.memories)
            );
        }

        return true;
    } catch (e) {
        console.error(`Failed to import mob ${mobId}:`, e);
        return false;
    }
}

/**
 * Backup all mob data
 */
export function backupAllMobData() {
    try {
        const allMobs = getAllMobs();
        const backup = {
            timestamp: Date.now(),
            mobs: allMobs,
            count: allMobs.length
        };

        world.setDynamicProperty("geniimob:backup:latest", JSON.stringify(backup));
        return backup;
    } catch (e) {
        console.error("Failed to backup mob data:", e);
        return null;
    }
}

/**
 * Restore from backup
 */
export function restoreFromBackup() {
    try {
        const backupStored = world.getDynamicProperty("geniimob:backup:latest");

        if (!backupStored) {
            return null;
        }

        const backup = JSON.parse(backupStored);

        for (const mob of backup.mobs) {
            saveMobData(mob.mobId, mob);
        }

        return backup;
    } catch (e) {
        console.error("Failed to restore from backup:", e);
        return null;
    }
}

/**
 * Clean up database
 */
export function cleanupDatabase(ageThreshold = 2592000000) { // 30 days default
    try {
        const allMobs = getAllMobs();
        const now = Date.now();
        let deleted = 0;

        for (const mob of allMobs) {
            if ((now - mob.createdAt) > ageThreshold && !mob.memories || mob.memories.length === 0) {
                deleteMobData(mob.mobId);
                deleted++;
            }
        }

        return deleted;
    } catch (e) {
        console.error("Failed to cleanup database:", e);
        return 0;
    }
}

/**
 * Get database size estimate
 */
export function getDatabaseSizeEstimate() {
    try {
        const allMobs = getAllMobs();
        let estimatedSize = 0;

        for (const mob of allMobs) {
            estimatedSize += JSON.stringify(mob).length;

            const memoryIndex = world.getDynamicProperty(`geniimob:all-memories:${mob.mobId}`);
            if (memoryIndex) {
                estimatedSize += memoryIndex.length;
            }
        }

        return {
            bytes: estimatedSize,
            kilobytes: Math.round(estimatedSize / 1024),
            megabytes: Math.round(estimatedSize / 1024 / 1024)
        };
    } catch (e) {
        console.error("Failed to estimate database size:", e);
        return { bytes: 0, kilobytes: 0, megabytes: 0 };
    }
}

export default {
    initializeDatabase,
    saveMobData,
    loadMobData,
    deleteMobData,
    getAllMobs,
    getMobsByType,
    getMobsByPersonality,
    savePlayerMemory,
    loadPlayerMemory,
    saveInteractionRecord,
    loadInteractionRecords,
    getDatabaseStatistics,
    exportMobData,
    importMobData,
    backupAllMobData,
    restoreFromBackup,
    cleanupDatabase,
    getDatabaseSizeEstimate
};
