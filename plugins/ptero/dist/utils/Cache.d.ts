/**
 * Pterodactyl Bedrock Bridge - Cache Manager
 * Caching-System für API Responses mit TTL Support
 */
export declare class CacheManager {
    private static instance;
    private cache;
    private enabled;
    private constructor();
    static getInstance(): CacheManager;
    setEnabled(enabled: boolean): void;
    set<T>(key: string, data: T, ttl?: number): void;
    get<T>(key: string): T | null;
    has(key: string): boolean;
    invalidate(key: string): void;
    invalidatePattern(pattern: string): number;
    clear(): void;
    getStats(): {
        size: number;
        entries: number;
    };
    private startCleanupInterval;
    private cleanup;
}
export declare const cacheManager: CacheManager;
//# sourceMappingURL=Cache.d.ts.map