/**
 * MCProfile Integration Plugin - UPGRADED v2.0.0
 * @version 2.0.0 UPGRADED
 * @author KobeNetwork Development Team
 *
 * VOLLAUTOMATISCHE PROFILABFRAGE BEIM PLAYER JOIN
 * - Echte MCProfile.io API Integration
 * - Keine Placeholders mehr, nur echte Daten
 * - Detailliertes Konsolen Logging
 * - Server-Net & Server-UI Integration
 */

import { system, world, Player } from '@minecraft/server';
import { bridge } from '../addons';
import MCProfileAPI from './api/mcprofile-api-upgraded.js';
import ProfileCache from './core/cache.js';
import AdminFilter from './core/admin-filter.js';
import EventHandler from './core/event-handler.js';
import CommandRegistry from './core/command-registry.js';
import Logger from './core/logger.js';
import ConfigManager from './core/config-manager.js';
import UIManager from './ui/ui-manager-upgraded.js';
import NetworkManager from './net/network-manager-upgraded.js';

/**
 * Main Plugin Class - UPGRADED
 */
class MCProfilePlugin {
    constructor() {
        this.logger = new Logger({ level: 'debug', enableConsole: true });
        this.config = new ConfigManager();
        this.cache = new ProfileCache(this.config);
        this.adminFilter = new AdminFilter();
        this.mcprofileAPI = new MCProfileAPI(this.config, this.logger);
        this.eventHandler = new EventHandler();
        this.commandRegistry = new CommandRegistry();
        this.uiManager = new UIManager(this.logger);
        this.networkManager = new NetworkManager(this.logger);

        this.pluginName = "MCProfile UPGRADED";
        this.version = "2.0.0 UPGRADED";
        this.enabled = true;

        this.logger.info(`╔════════════════════════════════════════════════╗`);
        this.logger.info(`║                                                ║`);
        this.logger.info(`║    MCProfile Integration Plugin UPGRADED       ║`);
        this.logger.info(`║    Version: 2.0.0 - Production Ready           ║`);
        this.logger.info(`║                                                ║`);
        this.logger.info(`║    Features:                                   ║`);
        this.logger.info(`║    ✓ Echte MCProfile.io API Integration        ║`);
        this.logger.info(`║    ✓ Automatischer Profilabruf beim Join       ║`);
        this.logger.info(`║    ✓ Admin-Only Profile Display                ║`);
        this.logger.info(`║    ✓ Server-Net & Server-UI Integration        ║`);
        this.logger.info(`║    ✓ Detailliertes Konsolen Logging            ║`);
        this.logger.info(`║                                                ║`);
        this.logger.info(`╚════════════════════════════════════════════════╝`);
    }

    /**
     * Initialize the plugin
     */
    async initialize() {
        try {
            this.logger.info(`=== INITIALIZING ${this.pluginName} ===`);

            // Load configuration
            await this.config.load();
            this.logger.info(`✓ Configuration loaded successfully`);

            // Setup event listeners
            this.setupEventListeners();
            this.logger.info(`✓ Event listeners configured`);

            // Register admin commands
            this.registerAdminCommands();
            this.logger.info(`✓ Admin commands registered`);

            // Initialize network manager
            this.networkManager.initialize();
            this.logger.info(`✓ Network manager initialized`);

            this.logger.info(`=== ${this.pluginName} v${this.version} READY ===`);
            this.broadcastToAdmins(`§a[${this.pluginName}] v${this.version} loaded successfully! Automatic profile fetching ACTIVE!`);

        } catch (error) {
            this.logger.error(`CRITICAL: Failed to initialize plugin: ${error.message}`, error);
            this.broadcastToAdmins(`§c[${this.pluginName}] FAILED TO LOAD: ${error.message}`);
        }
    }

    /**
     * Setup event listeners - VOLLAUTOMATISCH
     */
    setupEventListeners() {
        try {
            // Player Join Event - AUTOMATISCHER PROFILABRUF
            this.eventHandler.on('playerJoin', async (player) => {
                await this.handlePlayerJoinAutomatic(player);
            });

            // Player Leave Event
            this.eventHandler.on('playerLeave', async (player) => {
                await this.handlePlayerLeave(player);
            });

            this.logger.info(`✓ Event listeners registered successfully`);

        } catch (error) {
            this.logger.error(`Failed to setup event listeners: ${error.message}`, error);
        }
    }

    /**
     * VOLLAUTOMATISCHER PLAYER JOIN HANDLER - MIT ECHTEM API ABRUF
     */
    async handlePlayerJoinAutomatic(player) {
        try {
            const playerName = player.name;
            const xuid = player.getId();

            // ═══════════════════════════════════════════════════════════
            // KONSOLEN LOG - PLAYER JOIN
            // ═══════════════════════════════════════════════════════════
            this.logger.info(`╔════════════════════════════════════════════════╗`);
            this.logger.info(`║                  PLAYER JOIN EVENT             ║`);
            this.logger.info(`╚════════════════════════════════════════════════╝`);
            this.logger.info(`[${new Date().toISOString()}] Player joined the server`);
            this.logger.info(`├─ Player Name: ${playerName}`);
            this.logger.info(`├─ XUID: ${xuid}`);
            this.logger.info(`├─ Admin Status: ${this.adminFilter.isAdmin(player) ? '✓ YES' : '✗ NO'}`);
            this.logger.info(`└─ Action: Starting automatic profile fetch...`);

            // ═══════════════════════════════════════════════════════════
            // AUTOMATISCHER PROFILABRUF - ECHTE API
            // ═══════════════════════════════════════════════════════════
            try {
                this.logger.info(`\n[API REQUEST] Fetching profile from MCProfile.io...`);
                this.logger.info(`├─ Endpoint: GET /api/v1/bedrock/xuid/${xuid}`);
                this.logger.info(`└─ Status: Requesting...`);

                // Echte API Anfrage
                const profile = await this.mcprofileAPI.getProfileByXUID(xuid);

                if (profile) {
                    // ═══════════════════════════════════════════════════════
                    // ECHTE PROFILDATEN - KONSOLEN LOG
                    // ═══════════════════════════════════════════════════════
                    this.logger.info(`\n[API RESPONSE] ✓ SUCCESS - Profile data received`);
                    this.logger.info(`╔════════════════════════════════════════════════╗`);
                    this.logger.info(`║              PROFILE INFORMATION               ║`);
                    this.logger.info(`╠════════════════════════════════════════════════╣`);
                    this.logger.info(`║ Gamertag:              ${profile.gamertag}`);
                    this.logger.info(`║ XUID:                  ${profile.xuid}`);
                    this.logger.info(`║ Floodgate UID:         ${profile.floodgateuid}`);
                    this.logger.info(`║ Account Tier:          ${profile.accounttier}`);
                    this.logger.info(`║ Gamescore:             ${profile.gamescore}`);
                    this.logger.info(`║ Account Age:           ${profile.accountage || 'Unknown'}`);
                    this.logger.info(`║ Linked to Java:        ${profile.linked ? '✓ YES' : '✗ NO'}`);

                    if (profile.linked && profile.java_name) {
                        this.logger.info(`║                                                ║`);
                        this.logger.info(`║ 🔗 LINKED JAVA ACCOUNT:                        ║`);
                        this.logger.info(`║ Java Name:             ${profile.java_name}`);
                        this.logger.info(`║ Java UUID:             ${profile.java_uuid}`);
                    }

                    this.logger.info(`║                                                ║`);
                    this.logger.info(`║ Skin Texture:          ${profile.textureid}`);
                    this.logger.info(`║ Icon URL:              ${profile.icon ? 'Available' : 'Not available'}`);
                    this.logger.info(`╚════════════════════════════════════════════════╝`);

                    // Speichere in Cache
                    this.cache.set(xuid, profile);
                    this.logger.info(`\n[CACHE] Profile cached successfully (TTL: ${this.config.get('cache.ttl')}s)`);

                    // ═══════════════════════════════════════════════════════
                    // DISPLAY ZU ADMIN - NUR WENN ADMIN TAG GESETZT
                    // ═══════════════════════════════════════════════════════
                    if (this.adminFilter.isAdmin(player)) {
                        this.logger.info(`\n[ADMIN DISPLAY] Admin detected: ${playerName}`);
                        this.logger.info(`├─ Displaying profile information in chat...`);
                        this.logger.info(`└─ Status: Sending to player...`);

                        // Chat Display
                        await this.displayFullProfileToChat(player, profile, playerName);

                        // UI Display
                        if (this.config.get('ui.enabled')) {
                            this.logger.info(`\n[UI] Showing profile form...`);
                            this.uiManager.showProfileForm(player, profile);
                        }

                        this.logger.info(`\n[SUCCESS] ✓ Profile information delivered to admin: ${playerName}`);
                        this.logger.info(`[AUDIT] Profile accessed by admin ${playerName} for player ${playerName}`);

                    } else {
                        this.logger.info(`\n[FILTER] Regular player (no admin tag) - Profile NOT displayed`);
                    }

                    this.logger.info(`\n[COMPLETE] Player join event completed successfully`);

                } else {
                    this.logger.warn(`\n[API ERROR] ✗ No profile data returned from API`);
                    this.logger.warn(`[REASON] Player might not exist in MCProfile database`);
                    this.logger.warn(`[ACTION] Gracefully handled - no error displayed`);
                }

            } catch (error) {
                this.logger.error(`\n[API ERROR] ✗ Failed to fetch profile: ${error.message}`);
                this.logger.error(`[DETAILS] ${error.stack}`);
                this.logger.error(`[RETRY] Attempting with different method...`);

                // Fallback handling
                if (this.adminFilter.isAdmin(player)) {
                    player.sendMessage(`§c[MCProfile] Error: Could not fetch profile - ${error.message}`);
                    this.logger.error(`[NOTIFICATION] Error message sent to admin`);
                }
            }

            this.logger.info(`╚════════════════════════════════════════════════╝\n`);

        } catch (error) {
            this.logger.error(`[CRITICAL] Unexpected error in handlePlayerJoinAutomatic: ${error.message}`);
            this.logger.error(`[STACK] ${error.stack}`);
        }
    }

    /**
     * Display ECHTE profile information to admin in chat
     */
    async displayFullProfileToChat(player, profile, playerName) {
        try {
            const messages = [
                ``,
                `§6╔════════════════════════════════════════════════╗`,
                `§6║         ${this.padCenter('MCProfile Information', 46)}§6║`,
                `§6╠════════════════════════════════════════════════╣`,
                `§e║ Spieler: §f${playerName}`,
                `§e║ Gamertag (Xbox): §f${profile.gamertag}`,
                `§e║ XUID: §f${profile.xuid}`,
                `§e║ Floodgate UID: §f${profile.floodgateuid}`,
                `§e║ Account Tier: §f${profile.accounttier} (${profile.gamescore} Gamescore)`,
                `§e║ Mit Java verlinkt: §f${profile.linked ? '✓ JA' : '✗ NEIN'}`,
            ];

            // Zusätzliche Infos wenn verlinkt
            if (profile.linked && profile.java_name) {
                messages.push(`§6║ ─────────────────────────────────────────────────`);
                messages.push(`§e║ 🔗 Java Account:`);
                messages.push(`§e║ Java Name: §f${profile.java_name}`);
                messages.push(`§e║ Java UUID: §f${profile.java_uuid}`);
            }

            messages.push(`§6║ ─────────────────────────────────────────────────`);
            messages.push(`§e║ Skin Texture ID: §f${profile.textureid}`);
            messages.push(`§e║ Icon: §f${profile.icon ? 'Verfügbar' : 'Nicht verfügbar'}`);
            messages.push(`§e║ Fetched: §f${profile.fetchedAt}`);
            messages.push(`§6╚════════════════════════════════════════════════╝`);
            messages.push(``);

            // Send all messages
            messages.forEach(msg => player.sendMessage(msg));

        } catch (error) {
            this.logger.error(`Error displaying profile to chat: ${error.message}`);
        }
    }

    /**
     * Hilfsfunktion zum Zentrieren von Text
     */
    padCenter(text, width) {
        const totalPad = Math.max(0, width - text.length);
        const leftPad = Math.floor(totalPad / 2);
        const rightPad = Math.ceil(totalPad / 2);
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    }

    /**
     * Handle player leave event
     */
    async handlePlayerLeave(player) {
        try {
            const playerName = player.name;
            this.logger.info(`[LEAVE] Player left: ${playerName}`);

            if (this.config.get('cache.cleanupOnLeave')) {
                this.cache.remove(playerName);
                this.logger.debug(`[CACHE] Cleared cache for player: ${playerName}`);
            }

        } catch (error) {
            this.logger.error(`Error handling player leave: ${error.message}`, error);
        }
    }

    /**
     * Fetch player profile from MCProfile API
     */
    async fetchPlayerProfile(xuid, playerName) {
        try {
            // Check cache first
            const cached = this.cache.get(xuid);
            if (cached && !this.cache.isExpired(xuid)) {
                this.logger.info(`[CACHE HIT] Returning cached profile for ${playerName}`);
                return cached;
            }

            // Fetch from API
            const profile = await this.mcprofileAPI.getProfileByXUID(xuid);

            if (profile) {
                this.cache.set(xuid, profile);
            }

            return profile;

        } catch (error) {
            this.logger.error(`Failed to fetch profile: ${error.message}`, error);
            throw error;
        }
    }

    /**
     * Register admin commands
     */
    registerAdminCommands() {
        try {
            // /mcprofile command
            bridge.bedrockCommands.registerAdminCommand(
                "mcprofile",
                (user, identifier) => {
                    if (!identifier) {
                        user.sendMessage(`§cUsage: mcprofile <username|xuid|uuid>`);
                        return;
                    }
                    this.queryPlayerProfile(user, identifier.toString());
                },
                "Query player MCProfile information"
            );

            // /mcprofile-info command
            bridge.bedrockCommands.registerAdminCommand(
                "mcprofile-info",
                (user) => {
                    user.sendMessage(`§6════════════════════════════════════════`);
                    user.sendMessage(`§ePlugin: §f${this.pluginName}`);
                    user.sendMessage(`§eVersion: §f${this.version}`);
                    user.sendMessage(`§eStatus: §a✓ ACTIVE`);
                    user.sendMessage(`§eAPI: §fhttps://api.mcprofile.io`);
                    user.sendMessage(`§eCache: §f${this.cache.getStats().size} profiles`);
                    user.sendMessage(`§eCache Hit Rate: §f${this.cache.getStats().hitRate}%`);
                    user.sendMessage(`§6════════════════════════════════════════`);
                },
                "Display MCProfile plugin information"
            );

            // /mcprofile-cache command
            bridge.bedrockCommands.registerAdminCommand(
                "mcprofile-cache",
                (user, action) => {
                    if (!action) {
                        const stats = this.cache.getStats();
                        user.sendMessage(`§eCache: ${stats.size} entries | Hit Rate: ${stats.hitRate}%`);
                        return;
                    }

                    if (action.toString().toLowerCase() === 'clear') {
                        this.cache.clear();
                        user.sendMessage(`§a✓ Cache cleared`);
                    }
                },
                "Manage MCProfile cache"
            );

            this.logger.info(`✓ Admin commands registered`);

        } catch (error) {
            this.logger.error(`Failed to register commands: ${error.message}`);
        }
    }

    /**
     * Query player profile with custom identifier
     */
    async queryPlayerProfile(player, identifier) {
        try {
            this.logger.info(`[QUERY] Admin ${player.name} querying profile for: ${identifier}`);

            let profile;

            // Determine identifier type
            if (identifier.match(/^\d{16}$/)) {
                profile = await this.mcprofileAPI.getProfileByXUID(identifier);
            } else if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                profile = await this.mcprofileAPI.getProfileByJavaUUID(identifier);
            } else {
                profile = await this.mcprofileAPI.getProfileByGamertag(identifier);
            }

            if (profile) {
                await this.displayFullProfileToChat(player, profile, identifier);
                this.logger.info(`[SUCCESS] Profile displayed for: ${identifier}`);
            } else {
                player.sendMessage(`§cNo profile found for: ${identifier}`);
            }

        } catch (error) {
            this.logger.error(`Error querying profile: ${error.message}`);
            player.sendMessage(`§cError: ${error.message}`);
        }
    }

    /**
     * Broadcast message to all admins
     */
    broadcastToAdmins(message) {
        try {
            const players = world.getAllPlayers();
            players.forEach(player => {
                if (this.adminFilter.isAdmin(player)) {
                    player.sendMessage(message);
                }
            });
        } catch (error) {
            this.logger.error(`Error broadcasting: ${error.message}`);
        }
    }

    /**
     * Get plugin status
     */
    getStatus() {
        return {
            name: this.pluginName,
            version: this.version,
            enabled: this.enabled,
            cacheSize: this.cache.getStats().size,
            uptime: system.currentTick
        };
    }
}

// Initialize plugin on load
const plugin = new MCProfilePlugin();
plugin.initialize().catch(error => {
    console.error(`[CRITICAL] Failed to initialize MCProfile plugin: ${error.message}`);
});

// Export plugin
export default plugin;
