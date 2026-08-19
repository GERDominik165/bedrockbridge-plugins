/**
 * Profile Cache Manager
 * @version 2.0.0
 *
 * Implements caching for MCProfile API responses to reduce API calls
 * Supports TTL (Time To Live), LRU eviction, and statistics tracking
 */

class ProfileCache {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.timestamps = new Map();
        this.ttl = config.get('cache.ttl') * 1000 || 3600000; // 1 hour default
        this.maxSize = config.get('cache.maxSize') || 1000;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Get value from cache
     */
    get(key) {
        if (!this.cache.has(key)) {
            this.stats.misses++;
            return null;
        }

        const entry = this.cache.get(key);
        this.stats.hits++;

        // Update access time for LRU
        this.timestamps.set(key, Date.now());

        return entry;
    }

    /**
     * Set value in cache
     */
    set(key, value) {
        // Check if we need to evict
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        this.cache.set(key, value);
        this.timestamps.set(key, Date.now());
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        if (!this.cache.has(key)) {
            return false;
        }

        if (this.isExpired(key)) {
            this.remove(key);
            return false;
        }

        return true;
    }

    /**
     * Check if entry is expired
     */
    isExpired(key) {
        const timestamp = this.timestamps.get(key);
        if (!timestamp) return true;

        const age = Date.now() - timestamp;
        return age > this.ttl;
    }

    /**
     * Remove entry from cache
     */
    remove(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.timestamps.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Evict least recently used entry
     */
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, timestamp] of this.timestamps) {
            if (timestamp < oldestTime) {
                oldestTime = timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.remove(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Clean expired entries
     */
    cleanup() {
        const keysToDelete = [];

        for (const key of this.cache.keys()) {
            if (this.isExpired(key)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.remove(key));
        return keysToDelete.length;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl / 1000, // Convert to seconds
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: this.getHitRate(),
            evictions: this.stats.evictions
        };
    }

    /**
     * Calculate hit rate
     */
    getHitRate() {
        const total = this.stats.hits + this.stats.misses;
        if (total === 0) return 0;
        return ((this.stats.hits / total) * 100).toFixed(2);
    }

    /**
     * Get all cached keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache entry with metadata
     */
    getWithMetadata(key) {
        if (!this.has(key)) {
            return null;
        }

        return {
            value: this.cache.get(key),
            timestamp: this.timestamps.get(key),
            age: Date.now() - this.timestamps.get(key),
            expireIn: this.ttl - (Date.now() - this.timestamps.get(key))
        };
    }

    /**
     * Set custom TTL for specific key
     */
    setWithTTL(key, value, ttl) {
        this.set(key, value);
        // Store custom TTL (implement if needed)
    }

    /**
     * Get cache memory usage estimation
     */
    getMemoryUsage() {
        let size = 0;
        for (const [key, value] of this.cache) {
            size += key.length;
            size += JSON.stringify(value).length;
        }
        return size;
    }
}

export default ProfileCache;
