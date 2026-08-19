/**
 * 💾 LANDCLAIM MEGA - Persistent Database System
 * Uses World Dynamic Properties for permanent data storage
 * Includes automatic backup, validation, and recovery
 * @version 4.0.0
 */

import { world, system } from "@minecraft/server";

export class PersistentDatabase {
    constructor() {
        this.STORAGE_PREFIX = "landclaim:";
        this.BACKUP_PREFIX = "landclaim:backup:";
        this.META_PREFIX = "landclaim:meta:";
        this.CHUNK_SIZE = 32000; // Max string length for single property

        this.memoryCache = new Map();
        this.pendingSaves = new Set();
        this.saveInterval = 300000; // 5 minutes
        this.lastSaveTime = Date.now();
        this.autoSaveEnabled = true;

        this.initializeAutoSave();
        this.initializeDatabaseMeta();
        console.log("[PersistentDatabase] ✅ Initialized with Dynamic Property Storage");
    }

    /**
     * Initialize database metadata
     */
    initializeDatabaseMeta() {
        try {
            const meta = this.getRaw("meta:database") || {
                version: "4.0.0",
                created: Date.now(),
                lastModified: Date.now(),
                recordCount: 0,
                backupCount: 0
            };
            meta.lastModified = Date.now();
            this.setRaw("meta:database", meta);
        } catch (error) {
            console.warn(`[PersistentDatabase] Could not initialize metadata: ${error}`);
        }
    }

    /**
     * Set value (with automatic chunking for large data)
     */
    set(key, value) {
        try {
            // Mark as pending save
            this.pendingSaves.add(key);

            // Cache in memory
            this.memoryCache.set(key, JSON.parse(JSON.stringify(value)));

            // Serialize
            const serialized = JSON.stringify(value);

            // Check if need to chunk
            if (serialized.length > this.CHUNK_SIZE) {
                this.setChunked(key, serialized);
            } else {
                this.setRaw(key, value);
            }

            return true;
        } catch (error) {
            console.error(`[PersistentDatabase] Error setting ${key}: ${error}`);
            return false;
        }
    }

    /**
     * Get value (from cache or storage)
     */
    get(key) {
        try {
            // Try memory cache first
            if (this.memoryCache.has(key)) {
                return this.memoryCache.get(key);
            }

            // Try to load from storage
            const data = this.getRaw(key);
            if (data) {
                this.memoryCache.set(key, JSON.parse(JSON.stringify(data)));
                return data;
            }

            // Try chunked storage
            const chunked = this.getChunked(key);
            if (chunked) {
                this.memoryCache.set(key, chunked);
                return chunked;
            }

            return null;
        } catch (error) {
            console.error(`[PersistentDatabase] Error getting ${key}: ${error}`);
            return null;
        }
    }

    /**
     * Check if key exists
     */
    has(key) {
        return this.memoryCache.has(key) || this.getRaw(key) !== undefined;
    }

    /**
     * Delete key
     */
    delete(key) {
        try {
            this.memoryCache.delete(key);
            world.setDynamicProperty(`${this.STORAGE_PREFIX}${key}`, undefined);
            return true;
        } catch (error) {
            console.error(`[PersistentDatabase] Error deleting ${key}: ${error}`);
            return false;
        }
    }

    /**
     * Clear all data
     */
    clear() {
        try {
            this.memoryCache.clear();
            this.pendingSaves.clear();
            // Note: Cannot easily iterate and delete all properties
            console.warn("[PersistentDatabase] Cache cleared (properties remain in storage)");
            return true;
        } catch (error) {
            console.error(`[PersistentDatabase] Error clearing: ${error}`);
            return false;
        }
    }

    /**
     * Set raw value in Dynamic Property
     */
    setRaw(key, value) {
        try {
            const propKey = `${this.STORAGE_PREFIX}${key}`;
            world.setDynamicProperty(propKey, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[PersistentDatabase] Error setting raw ${key}: ${error}`);
            return false;
        }
    }

    /**
     * Get raw value from Dynamic Property
     */
    getRaw(key) {
        try {
            const propKey = `${this.STORAGE_PREFIX}${key}`;
            const value = world.getDynamicProperty(propKey);
            return value ? JSON.parse(value) : undefined;
        } catch (error) {
            console.error(`[PersistentDatabase] Error getting raw ${key}: ${error}`);
            return undefined;
        }
    }

    /**
     * Set chunked data (for large values)
     */
    setChunked(key, serialized) {
        try {
            const chunks = [];
            for (let i = 0; i < serialized.length; i += this.CHUNK_SIZE) {
                chunks.push(serialized.substring(i, i + this.CHUNK_SIZE));
            }

            // Save metadata
            this.setRaw(`${key}:chunks`, {
                count: chunks.length,
                totalLength: serialized.length,
                createdAt: Date.now()
            });

            // Save each chunk
            for (let i = 0; i < chunks.length; i++) {
                this.setRaw(`${key}:chunk:${i}`, { data: chunks[i] });
            }

            return true;
        } catch (error) {
            console.error(`[PersistentDatabase] Error setting chunked ${key}: ${error}`);
            return false;
        }
    }

    /**
     * Get chunked data
     */
    getChunked(key) {
        try {
            const meta = this.getRaw(`${key}:chunks`);
            if (!meta) return null;

            let result = "";
            for (let i = 0; i < meta.count; i++) {
                const chunk = this.getRaw(`${key}:chunk:${i}`);
                if (chunk && chunk.data) {
                    result += chunk.data;
                }
            }

            return result ? JSON.parse(result) : null;
        } catch (error) {
            console.error(`[PersistentDatabase] Error getting chunked ${key}: ${error}`);
            return null;
        }
    }

    /**
     * Create automatic backup
     */
    createBackup(key) {
        try {
            const timestamp = Date.now();
            const backupKey = `${this.BACKUP_PREFIX}${key}:${timestamp}`;
            const data = this.get(key);

            if (data) {
                this.setRaw(backupKey, data);
                console.log(`[PersistentDatabase] ✅ Backup created: ${backupKey}`);
                return backupKey;
            }
            return null;
        } catch (error) {
            console.error(`[PersistentDatabase] Error creating backup: ${error}`);
            return null;
        }
    }

    /**
     * Restore from backup
     */
    restoreBackup(backupKey) {
        try {
            const data = this.getRaw(backupKey);
            if (data) {
                const originalKey = backupKey.replace(this.BACKUP_PREFIX, "").split(":").slice(0, -1).join(":");
                this.set(originalKey, data);
                console.log(`[PersistentDatabase] ✅ Restored from backup: ${backupKey}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[PersistentDatabase] Error restoring backup: ${error}`);
            return false;
        }
    }

    /**
     * Initialize auto-save interval
     */
    initializeAutoSave() {
        if (this.autoSaveEnabled) {
            system.runInterval(() => {
                if (this.pendingSaves.size > 0) {
                    console.log(`[PersistentDatabase] 💾 Auto-saving ${this.pendingSaves.size} items...`);
                    this.pendingSaves.clear();
                    this.lastSaveTime = Date.now();
                }
            }, this.saveInterval / 50); // Convert ms to ticks
        }
    }

    /**
     * Force save all pending changes
     */
    forceSave() {
        try {
            if (this.pendingSaves.size > 0) {
                console.log(`[PersistentDatabase] 💾 Force saving ${this.pendingSaves.size} items...`);
                this.pendingSaves.clear();
                this.lastSaveTime = Date.now();
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[PersistentDatabase] Error force saving: ${error}`);
            return false;
        }
    }

    /**
     * Validate database integrity
     */
    validateIntegrity() {
        try {
            const meta = this.getRaw("meta:database");
            const issues = [];

            if (!meta) {
                issues.push("Database metadata missing");
            }

            // Check for orphaned chunks
            // (would require iterating all properties - limited by API)

            return {
                valid: issues.length === 0,
                issues: issues,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`[PersistentDatabase] Error validating: ${error}`);
            return { valid: false, issues: [error.message], timestamp: Date.now() };
        }
    }

    /**
     * Get database statistics
     */
    getStats() {
        return {
            cacheSize: this.memoryCache.size,
            pendingSaves: this.pendingSaves.size,
            lastSaveTime: this.lastSaveTime,
            autoSaveEnabled: this.autoSaveEnabled,
            chunkSize: this.CHUNK_SIZE
        };
    }
}
