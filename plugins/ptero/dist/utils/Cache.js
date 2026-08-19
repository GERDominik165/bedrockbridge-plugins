/**
 * Pterodactyl Bedrock Bridge - Cache Manager
 * Caching-System für API Responses mit TTL Support
 */
import { CACHE_CONFIG } from '../config/Constants';
import { logger } from './Logger';
export class CacheManager {
    constructor() {
        this.cache = new Map();
        this.enabled = CACHE_CONFIG.ENABLED;
        this.startCleanupInterval();
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
        if (!this.enabled)
            return;
        const entry = {
            data,
            timestamp: Date.now(),
            ttl
        };
        this.cache.set(key, entry);
        logger.debug(`Cache SET: ${key}`, { ttl });
    }
    get(key) {
        if (!this.enabled)
            return null;
        const entry = this.cache.get(key);
        if (!entry) {
            logger.debug(`Cache MISS: ${key}`);
            return null;
        }
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
            this.cache.delete(key);
            logger.debug(`Cache EXPIRED: ${key}`);
            return null;
        }
        logger.debug(`Cache HIT: ${key}`, { age: `${age}ms` });
        return entry.data;
    }
    has(key) {
        return this.get(key) !== null;
    }
    invalidate(key) {
        this.cache.delete(key);
        logger.debug(`Cache INVALIDATED: ${key}`);
    }
    invalidatePattern(pattern) {
        let count = 0;
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        logger.debug(`Cache INVALIDATED PATTERN: ${pattern}`, { count });
        return count;
    }
    clear() {
        this.cache.clear();
        logger.info('Cache cleared');
    }
    getStats() {
        return {
            size: this.cache.size,
            entries: this.cache.size
        };
    }
    startCleanupInterval() {
        // Run cleanup every 5 minutes
        setInterval(() => {
            this.cleanup();
        }, 300000);
    }
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.debug(`Cache cleanup`, { cleaned });
        }
    }
}
export const cacheManager = CacheManager.getInstance();
//# sourceMappingURL=Cache.js.map