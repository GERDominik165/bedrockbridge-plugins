/**
 * Pterodactyl Bedrock Bridge - Cache Manager
 * Caching-System für API Responses mit TTL Support
 */

import { ICacheEntry } from '../types';
import { CACHE_CONFIG } from '../config/Constants';
import { logger } from './Logger';

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, ICacheEntry<any>> = new Map();
  private enabled = CACHE_CONFIG.ENABLED;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): void {
    if (!this.enabled) return;

    const entry: ICacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.cache.set(key, entry);
    logger.debug(`Cache SET: ${key}`, { ttl });
  }

  get<T>(key: string): T | null {
    if (!this.enabled) return null;

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
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache INVALIDATED: ${key}`);
  }

  invalidatePattern(pattern: string): number {
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

  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  getStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }

  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  private cleanup(): void {
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
