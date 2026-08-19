/**
 * LRU Cache implementation with TTL (Time-To-Live) support
 * Automatically evicts expired entries and manages memory
 * BEDROCK VERSION - No setInterval, uses manual cleanup
 */

export class Cache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.ttl || 3600; // Default 1 hour
        this.cache = new Map();
        this.timestamps = new Map();
        this.accessTimes = new Map();
        this.cleanupInterval = null;

        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            expirations: 0,
            sets: 0
        };

        // Note: setInterval doesn't exist in Bedrock
        // Cleanup is called manually on get/set operations
    }

    /**
     * Set a value in cache with optional TTL
     */
    set(key, value, ttl = this.defaultTTL) {
        const now = Date.now();

        // Auto-cleanup on set
        this.cleanup();

        // Remove oldest entry if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const oldestKey = this.getOldestKey();
            if (oldestKey) {
                this.cache.delete(oldestKey);
                this.timestamps.delete(oldestKey);
                this.accessTimes.delete(oldestKey);
                this.stats.evictions++;
            }
        }

        this.cache.set(key, value);
        this.timestamps.set(key, now + (ttl * 1000));
        this.accessTimes.set(key, now);
        this.stats.sets++;

        return this;
    }

    /**
     * Get a value from cache
     */
    get(key) {
        try {
            // Periodic cleanup every 10 gets
            if (Math.random() < 0.1) {
                this.cleanup();
            }

            // Check if key exists
            if (!this.cache.has(key)) {
                this.stats.misses++;
                return undefined;
            }

            // Check if expired
            const expiryTime = this.timestamps.get(key);
            if (expiryTime && Date.now() > expiryTime) {
                this.cache.delete(key);
                this.timestamps.delete(key);
                this.accessTimes.delete(key);
                this.stats.expirations++;
                this.stats.misses++;
                return undefined;
            }

            // Update access time and return
            this.accessTimes.set(key, Date.now());
            this.stats.hits++;
            return this.cache.get(key);
        } catch (error) {
            this.stats.misses++;
            return undefined;
        }
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        if (!this.cache.has(key)) {
            return false;
        }

        const expiryTime = this.timestamps.get(key);
        if (expiryTime && Date.now() > expiryTime) {
            this.cache.delete(key);
            this.timestamps.delete(key);
            this.accessTimes.delete(key);
            this.stats.expirations++;
            return false;
        }

        return true;
    }

    /**
     * Delete a specific key
     */
    delete(key) {
        const existed = this.cache.has(key);
        this.cache.delete(key);
        this.timestamps.delete(key);
        this.accessTimes.delete(key);
        return existed;
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.timestamps.clear();
        this.accessTimes.clear();
    }

    /**
     * Get oldest (least recently accessed) key
     */
    getOldestKey() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.accessTimes.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        return oldestKey;
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, expiryTime] of this.timestamps.entries()) {
            if (expiryTime && now > expiryTime) {
                this.cache.delete(key);
                this.timestamps.delete(key);
                this.accessTimes.delete(key);
                this.stats.expirations++;
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: `${hitRate}%`,
            total
        };
    }

    /**
     * Get all entries (useful for debugging)
     */
    getAll() {
        const result = {};
        const now = Date.now();

        for (const [key, value] of this.cache.entries()) {
            const expiryTime = this.timestamps.get(key);
            const expired = expiryTime && now > expiryTime;

            result[key] = {
                value,
                expired,
                expiresIn: expired ? 0 : Math.ceil((expiryTime - now) / 1000)
            };
        }

        return result;
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            expirations: 0,
            sets: 0
        };
    }

    /**
     * Destroy cache
     */
    destroy() {
        try {
            this.clear();
            this.cleanupInterval = null;
        } catch (error) {
            // ignore
        }
    }
}

export default Cache;
