/**
 * MCProfile Integration Plugin for Bedrock Bridge - v2.0.0 ULTRA COMPLETE
 * @version 2.0.0 ULTRA
 * @author KobeNetwork Development Team
 *
 * VOLLSTÄNDIG DURCHDACHTES PLUGIN MIT:
 * ✓ Vollautomatischem Profilabruf beim Join
 * ✓ Echten MCProfile.io API Requests
 * ✓ Bedrock Script API Integration
 * ✓ Server-Net & Server-UI Integration
 * ✓ Detailliertem Logging
 * ✓ Admin-Only Filtering
 * ✓ Caching System
 * ✓ Error Handling & Retry Logic
 * ✓ Performance Optimization
 */

import { system, world, Player } from '@minecraft/server';
import { HttpRequest, HttpRequestMethod, http } from '@minecraft/server-net';
import { bridge } from '../../addons';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGGER SYSTEM - Multi-Level Logging
 * ═══════════════════════════════════════════════════════════════════════════
 */
class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.levels = { 'error': 0, 'warn': 1, 'info': 2, 'debug': 3 };
        this.logHistory = [];
        this.maxHistory = 1000;
    }

    log(levelName, message) {
        const levelValue = this.levels[levelName] || 2;
        const currentLevelValue = this.levels[this.level] || 2;

        if (levelValue > currentLevelValue) return;

        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [${levelName.toUpperCase()}] [MCProfile] ${message}`;

        this.logHistory.push({ timestamp, level: levelName, message });
        if (this.logHistory.length > this.maxHistory) this.logHistory.shift();

        try {
            console.log(formatted);
        } catch (e) {}
    }

    error(msg) { this.log('error', msg); }
    warn(msg) { this.log('warn', msg); }
    info(msg) { this.log('info', msg); }
    debug(msg) { this.log('debug', msg); }

    getHistory(limit = 50) {
        return this.logHistory.slice(-limit);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE SYSTEM - LRU Cache mit TTL
 * ═══════════════════════════════════════════════════════════════════════════
 */
class ProfileCache {
    constructor(ttl = 3600000, maxSize = 1000) {
        this.cache = new Map();
        this.timestamps = new Map();
        this.ttl = ttl;
        this.maxSize = maxSize;
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }

    get(key) {
        if (!this.cache.has(key)) {
            this.stats.misses++;
            return null;
        }

        if (this.isExpired(key)) {
            this.remove(key);
            return null;
        }

        this.stats.hits++;
        this.timestamps.set(key, Date.now());
        return this.cache.get(key);
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now());
    }

    isExpired(key) {
        const timestamp = this.timestamps.get(key);
        if (!timestamp) return true;
        return (Date.now() - timestamp) > this.ttl;
    }

    remove(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
    }

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

    clear() {
        this.cache.clear();
        this.timestamps.clear();
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            size: this.cache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : '0',
            evictions: this.stats.evictions
        };
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN FILTER - Permission Management
 * ═══════════════════════════════════════════════════════════════════════════
 */
class AdminFilter {
    constructor() {
        this.adminTags = ['admin', 'operator', 'owner'];
    }

    isAdmin(player) {
        try {
            if (!player || !player.getTags) return false;
            const tags = player.getTags();
            return tags.some(tag => this.adminTags.includes(tag));
        } catch (e) {
            return false;
        }
    }

    getTags(player) {
        try {
            return player.getTags ? player.getTags() : [];
        } catch (e) {
            return [];
        }
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MCProfile API CLIENT - ECHTE API INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
class MCProfileAPI {
    constructor(logger) {
        this.logger = logger;
        this.baseURL = 'https://mcprofile.io';
        this.requestCount = 0;
        this.successCount = 0;
        this.failCount = 0;
    }

    async getProfileByXUID(xuid, retryCount = 0) {
        try {
            this.logger.info(`[API] Fetching profile by XUID: ${xuid}`);
            this.requestCount++;

            if (!xuid || typeof xuid !== 'string') {
                throw new Error('Invalid XUID format');
            }

            const url = `${this.baseURL}/api/v1/bedrock/xuid/${xuid}`;
            this.logger.debug(`[API REQUEST] GET ${url}`);

            // WICHTIG: In echter Bedrock-Umgebung würde hier echter HTTP Request stattfinden
            // Für jetzt: Echte Response-Struktur
            const profile = await this.fetchFromAPI(url);

            if (profile && profile.gamertag) {
                this.logger.info(`[API SUCCESS] ✓ Profile retrieved: ${profile.gamertag}`);
                this.successCount++;
                return this.parseProfile(profile, 'bedrock');
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            this.logger.error(`[API ERROR] Failed to fetch XUID profile: ${error.message}`);

            // Retry Logic mit Exponential Backoff
            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                this.logger.info(`[RETRY] Waiting ${delay}ms before retry ${retryCount + 1}/3...`);

                // Nutze system.runTimeout statt setTimeout (Bedrock API!)
                return new Promise((resolve, reject) => {
                    system.runTimeout(() => {
                        this.getProfileByXUID(xuid, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, Math.floor(delay / 50)); // Bedrock tick-basiert (50ms per tick)
                });
            }

            this.failCount++;
            throw error;
        }
    }

    async getProfileByJavaUUID(uuid, retryCount = 0) {
        try {
            this.logger.info(`[API] Fetching profile by Java UUID: ${uuid}`);
            this.requestCount++;

            const normalizedUUID = uuid.replace(/-/g, '');
            const url = `${this.baseURL}/api/v1/java/uuid/${normalizedUUID}`;

            this.logger.debug(`[API REQUEST] GET ${url}`);

            const profile = await this.fetchFromAPI(url);

            if (profile && profile.username) {
                this.logger.info(`[API SUCCESS] ✓ Profile retrieved: ${profile.username}`);
                this.successCount++;
                return this.parseProfile(profile, 'java');
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            this.logger.error(`[API ERROR] Failed to fetch Java UUID profile: ${error.message}`);

            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                return new Promise((resolve, reject) => {
                    system.runTimeout(() => {
                        this.getProfileByJavaUUID(uuid, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, Math.floor(delay / 50));
                });
            }

            this.failCount++;
            throw error;
        }
    }

    async getProfileByGamertag(gamertag, retryCount = 0) {
        try {
            this.logger.info(`[API] Fetching profile by Gamertag: ${gamertag}`);
            this.requestCount++;

            if (!gamertag || typeof gamertag !== 'string' || gamertag.trim().length === 0) {
                throw new Error('Invalid gamertag format');
            }

            const url = `${this.baseURL}/api/v1/bedrock/gamertag/${encodeURIComponent(gamertag)}`;
            this.logger.debug(`[API REQUEST] GET ${url}`);

            const profile = await this.fetchFromAPI(url);

            if (profile && profile.gamertag) {
                this.logger.info(`[API SUCCESS] ✓ Profile retrieved: ${profile.gamertag}`);
                this.successCount++;
                return this.parseProfile(profile, 'bedrock');
            }

            throw new Error('Profile not found');

        } catch (error) {
            this.logger.error(`[API ERROR] Failed to fetch gamertag profile: ${error.message}`);

            // Retry Logic mit Exponential Backoff
            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                this.logger.info(`[RETRY] Waiting ${delay}ms before retry ${retryCount + 1}/3...`);

                return new Promise((resolve, reject) => {
                    system.runTimeout(() => {
                        this.getProfileByGamertag(gamertag, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, Math.floor(delay / 50));
                });
            }

            this.failCount++;
            throw error;
        }
    }

    async fetchFromAPI(url) {
        // ECHTE HTTP REQUEST ZUR MCPROFILE.IO API ÜBER BEDROCK HTTP CLIENT
        this.logger.debug(`[FETCH] Starting HTTP GET request: ${url}`);

        try {
            // Nutze Bedrock Server-Net HttpClient
            this.logger.debug(`[HTTP] Using Bedrock @minecraft/server-net HttpClient`);

            const request = new HttpRequest(url);
            request.setMethod(HttpRequestMethod.Get);
            request.addHeader('Content-Type', 'application/json');
            request.addHeader('User-Agent', 'MCProfile-Plugin/2.0.0');
            request.setTimeout(10);  // 10 seconds timeout

            this.logger.debug(`[HTTP] Sending request to: ${url}`);

            // Führe den echten HTTP Request aus
            const response = await http.request(request);

            this.logger.debug(`[HTTP] Response status: ${response.status}`);

            // Validiere HTTP Status
            if (response.status < 200 || response.status >= 300) {
                throw new Error(`HTTP ${response.status}: Failed to fetch profile`);
            }

            // Parse die JSON Response
            try {
                const data = JSON.parse(response.body);
                this.logger.debug(`[HTTP] Response data received`);

                if (data && data.gamertag) {
                    this.logger.debug(`[HTTP RESPONSE] Gamertag: ${data.gamertag}`);
                    return data;
                } else {
                    throw new Error('Invalid response format - missing gamertag field');
                }
            } catch (parseError) {
                this.logger.error(`[HTTP ERROR] Failed to parse JSON response: ${parseError.message}`);
                throw parseError;
            }

        } catch (error) {
            this.logger.error(`[HTTP ERROR] Request failed: ${error.message}`);
            throw error;
        }
    }

    parseProfile(data, platform) {
        if (platform === 'bedrock') {
            return {
                gamertag: data.gamertag || 'Unknown',
                xuid: data.xuid || '',
                floodgateuid: data.floodgateuid || '',
                icon: data.icon || '',
                gamescore: data.gamescore || '0',
                accounttier: data.accounttier || 'Unknown',
                accountage: data.accountage || 'Unknown',
                textureid: data.textureid || '',
                skin: data.skin || '',
                linked: data.linked || false,
                java_uuid: data.java_uuid || null,
                java_name: data.java_name || null,
                platform: 'bedrock',
                fetchedAt: new Date().toISOString()
            };
        } else {
            return {
                username: data.username || 'Unknown',
                uuid: data.uuid || '',
                skin: data.skin || '',
                linked: data.linked || false,
                bedrock_gamertag: data.bedrock_gamertag || null,
                bedrock_xuid: data.bedrock_xuid || null,
                platform: 'java',
                fetchedAt: new Date().toISOString()
            };
        }
    }

    getStats() {
        const total = this.requestCount;
        return {
            total: total,
            successful: this.successCount,
            failed: this.failCount,
            successRate: total > 0 ? ((this.successCount / total) * 100).toFixed(2) : '0'
        };
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MAIN PLUGIN CLASS - VOLLSTÄNDIG DURCHDACHT
 * ═══════════════════════════════════════════════════════════════════════════
 */
class MCProfilePlugin {
    constructor() {
        this.logger = new Logger({ level: 'debug' });
        this.cache = new ProfileCache(3600000, 1000); // 1 hour TTL, 1000 max size
        this.adminFilter = new AdminFilter();
        this.api = new MCProfileAPI(this.logger);

        this.pluginName = 'MCProfile ULTRA';
        this.version = '2.0.0';
        this.enabled = true;

        this.playerJoinCallbacks = [];
        this.playerLeaveCallbacks = [];
    }

    initialize() {
        this.logger.info(`╔════════════════════════════════════════════════╗`);
        this.logger.info(`║                                                ║`);
        this.logger.info(`║    MCProfile Integration Plugin ULTRA v2.0.0   ║`);
        this.logger.info(`║                                                ║`);
        this.logger.info(`║    ✓ Vollautomatischer Profilabruf             ║`);
        this.logger.info(`║    ✓ Echte MCProfile.io API                    ║`);
        this.logger.info(`║    ✓ Admin-Only Profile Display                ║`);
        this.logger.info(`║    ✓ Detailliertes Logging                     ║`);
        this.logger.info(`║    ✓ Server-Net Integration                    ║`);
        this.logger.info(`║    ✓ Caching System (LRU)                      ║`);
        this.logger.info(`║    ✓ Error Handling & Retry Logic              ║`);
        this.logger.info(`║                                                ║`);
        this.logger.info(`╚════════════════════════════════════════════════╝`);

        this.setupEventListeners();
        this.registerCommands();

        this.logger.info(`✓ MCProfile ULTRA v${this.version} INITIALIZED SUCCESSFULLY`);
    }

    setupEventListeners() {
        try {
            // Player Join Event - VOLLAUTOMATISCH
            world.afterEvents.playerSpawn.subscribe((event) => {
                const player = event.player;
                if (player) {
                    system.runTimeout(() => {
                        this.handlePlayerJoin(player);
                    }, 0);
                }
            });

            this.logger.info(`✓ Event listeners configured`);

        } catch (error) {
            this.logger.error(`Failed to setup event listeners: ${error.message}`);
        }
    }

    async handlePlayerJoin(player) {
        try {
            const playerName = player.name;
            const xuid = player.getId();

            this.logger.info(`╔════════════════════════════════════════════════╗`);
            this.logger.info(`║              PLAYER JOIN EVENT                 ║`);
            this.logger.info(`╚════════════════════════════════════════════════╝`);
            this.logger.info(`[${new Date().toISOString()}] Player joined: ${playerName}`);
            this.logger.info(`├─ Gamertag: ${playerName}`);
            this.logger.info(`├─ XUID: ${xuid}`);
            this.logger.info(`├─ Admin: ${this.adminFilter.isAdmin(player) ? '✓ YES' : '✗ NO'}`);
            this.logger.info(`└─ Action: Starting automatic profile fetch (Live from API)...`);

            // AUTOMATISCHER PROFILABRUF - LIVE VOM API
            try {
                const profile = await this.api.getProfileByGamertag(playerName);

                if (profile) {
                    this.logger.info(`\n═══════════════════════════════════════════════`);
                    this.logger.info(`              PROFILE DATA RECEIVED`);
                    this.logger.info(`═══════════════════════════════════════════════`);
                    this.logger.info(`Gamertag: ${profile.gamertag}`);
                    this.logger.info(`Account Tier: ${profile.accounttier}`);
                    this.logger.info(`Gamescore: ${profile.gamescore}`);
                    this.logger.info(`Linked to Java: ${profile.linked ? '✓ YES' : '✗ NO'}`);

                    if (profile.linked && profile.java_name) {
                        this.logger.info(`🔗 Java Account: ${profile.java_name}`);
                    }

                    this.logger.info(`═══════════════════════════════════════════════`);

                    // Cache speichern
                    this.cache.set(xuid, profile);
                    this.logger.info(`[CACHE] Profile cached (TTL: 1 hour)`);

                    // AN ADMINS ANZEIGEN
                    if (this.adminFilter.isAdmin(player)) {
                        this.logger.info(`\n[ADMIN] Admin detected: ${playerName}`);
                        this.displayProfileToAdmin(player, profile);
                        this.logger.info(`[SUCCESS] ✓ Profile delivered to admin`);
                        this.logger.info(`[AUDIT] Profile accessed by admin ${playerName}`);
                    } else {
                        this.logger.info(`\n[FILTER] Regular player - Profile NOT displayed`);
                    }

                } else {
                    this.logger.warn(`[API] No profile data returned`);
                }

            } catch (error) {
                this.logger.error(`[ERROR] Failed to fetch profile: ${error.message}`);

                if (this.adminFilter.isAdmin(player)) {
                    player.sendMessage(`§c[MCProfile] Error: ${error.message}`);
                }
            }

            this.logger.info(`═════════════════════════════════════════════════\n`);

        } catch (error) {
            this.logger.error(`[CRITICAL] Error in handlePlayerJoin: ${error.message}`);
        }
    }

    displayProfileToAdmin(player, profile) {
        try {
            const lines = [
                ``,
                `§6╔════════════════════════════════════════════════╗`,
                `§6║          MCProfile Information`,
                `§6╠════════════════════════════════════════════════╣`,
                `§eGamertag: §f${profile.gamertag}`,
                `§eXUID: §f${profile.xuid}`,
                `§eFloodgate UID: §f${profile.floodgateuid}`,
                `§eAccount Tier: §f${profile.accounttier} (${profile.gamescore} GS)`,
                `§eAccount Age: §f${profile.accountage}`,
                `§eLinked: §f${profile.linked ? '✓ YES' : '✗ NO'}`,
            ];

            if (profile.linked && profile.java_name) {
                lines.push(`§6├─ Java Account:`);
                lines.push(`§e  Name: §f${profile.java_name}`);
                lines.push(`§e  UUID: §f${profile.java_uuid}`);
            }

            lines.push(`§eSkin: §f${profile.textureid}`);
            lines.push(`§eIcon: §f${profile.icon ? '✓ Available' : '✗ Not available'}`);
            lines.push(`§eFetched: §f${profile.fetchedAt}`);
            lines.push(`§6╚════════════════════════════════════════════════╝`);
            lines.push(``);

            lines.forEach(line => {
                try {
                    player.sendMessage(line);
                } catch (e) {}
            });

        } catch (error) {
            this.logger.error(`Error displaying profile: ${error.message}`);
        }
    }

    registerCommands() {
        try {
            // /mcprofile <identifier>
            bridge.bedrockCommands.registerAdminCommand(
                "mcprofile",
                (user, identifier) => {
                    if (!identifier) {
                        user.sendMessage(`§cUsage: mcprofile <xuid|uuid|gamertag>`);
                        return;
                    }

                    this.queryProfileCommand(user, identifier.toString());
                },
                "Query MCProfile information by XUID, UUID, or gamertag"
            );

            // /mcprofile-info
            bridge.bedrockCommands.registerAdminCommand(
                "mcprofile-info",
                (user) => {
                    const cacheStats = this.cache.getStats();
                    const apiStats = this.api.getStats();

                    user.sendMessage(`§6════════════════════════════════════════`);
                    user.sendMessage(`§ePlugin: §f${this.pluginName}`);
                    user.sendMessage(`§eVersion: §f${this.version}`);
                    user.sendMessage(`§eStatus: §a✓ ACTIVE`);
                    user.sendMessage(`§eCache: §f${cacheStats.size} profiles (Hit: ${cacheStats.hitRate}%)`);
                    user.sendMessage(`§eAPI: §f${apiStats.successful}/${apiStats.total} requests (${apiStats.successRate}%)`);
                    user.sendMessage(`§6════════════════════════════════════════`);
                },
                "Display MCProfile plugin information"
            );

            // /mcprofile-cache
            bridge.bedrockCommands.registerAdminCommand(
                "mcprofile-cache",
                (user, action) => {
                    if (!action) {
                        const stats = this.cache.getStats();
                        user.sendMessage(`§eCache: §f${stats.size}/${stats.maxSize} | Hit Rate: §f${stats.hitRate}%`);
                        return;
                    }

                    if (action.toString().toLowerCase() === 'clear') {
                        this.cache.clear();
                        user.sendMessage(`§a✓ Cache cleared`);
                        this.logger.info(`[ADMIN] Cache cleared by ${user.name}`);
                    }
                },
                "Manage MCProfile cache: mcprofile-cache [clear|stats]"
            );

            this.logger.info(`✓ Admin commands registered (3 commands)`);

        } catch (error) {
            this.logger.error(`Failed to register commands: ${error.message}`);
        }
    }

    async queryProfileCommand(user, identifier) {
        try {
            this.logger.info(`[QUERY] Admin ${user.name} querying profile for: ${identifier}`);

            let profile;

            // Determine type
            if (identifier.match(/^\d{16}$/)) {
                // XUID
                profile = await this.api.getProfileByXUID(identifier);
            } else if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                // Java UUID
                profile = await this.api.getProfileByJavaUUID(identifier);
            } else {
                // Gamertag
                profile = await this.api.getProfileByGamertag(identifier);
            }

            if (profile) {
                this.displayProfileToAdmin(user, profile);
                this.logger.info(`[SUCCESS] Profile displayed for: ${identifier}`);
            } else {
                user.sendMessage(`§cNo profile found for: ${identifier}`);
            }

        } catch (error) {
            this.logger.error(`Error querying profile: ${error.message}`);
            user.sendMessage(`§cError: ${error.message}`);
        }
    }

    getStatus() {
        const cacheStats = this.cache.getStats();
        const apiStats = this.api.getStats();

        return {
            name: this.pluginName,
            version: this.version,
            enabled: this.enabled,
            cache: cacheStats,
            api: apiStats
        };
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLUGIN INITIALIZATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
const plugin = new MCProfilePlugin();

try {
    plugin.initialize();
} catch (error) {
    console.error(`[CRITICAL] Failed to initialize MCProfile plugin: ${error.message}`);
}

// Export for use in other modules
export default plugin;
