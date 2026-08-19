/**
 * Universal Bedrock Server-Net Bridge Plugin
 * Professional HTTP management system with UI dashboard
 * Version: 1.2.1 - Bedrock Bridge API Integration
 */

import { world, system } from '@minecraft/server';
import { Logger } from './core/logger.js';
import { ConfigManager } from './core/config-manager.js';
import { Cache } from './core/cache.js';
import { RequestManager } from './net/request-manager.js';
import { Dashboard } from './ui/dashboard.js';
import { Validators } from './utils/validators.js';
import { CommandRegistry } from './bridge/command-registry.js';

/**
 * Main Plugin Class - Completely rewritten for bulletproof initialization
 */
class ServerNetPlugin {
    constructor() {
        this.name = 'ServerNet';
        this.version = '1.2.1';
        this.logger = null;
        this.config = null;
        this.cache = null;
        this.requestManager = null;
        this.dashboard = null;
        this.commandRegistry = null;
        this.initialized = false;
        this.adminTag = 'admin';
        this.chatEventSubscription = null;
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 5;
    }

    /**
     * Safe initialization with multiple fallbacks
     */
    async initialize() {
        if (this.initialized) return true;
        if (this.initializationAttempts >= this.maxInitializationAttempts) {
            console.error(`\n§c[${this.name}] Max initialization attempts exceeded!§r\n`);
            return false;
        }

        this.initializationAttempts++;

        try {
            console.log(`\n§6[${this.name}] Initializing v${this.version}...§r\n`);

            // Step 1: Initialize logger
            if (!this.logger) {
                this.logger = new Logger({
                    name: this.name,
                    level: 'info',
                    logToConsole: true,
                    maxHistory: 1000
                });
            }

            this.logger.info('Step 1: Logger initialized');

            // Step 2: Load configuration
            if (!this.config) {
                this.config = new ConfigManager();
                this.config.load({
                    api: {
                        timeout: 10000,
                        retries: 3,
                        retryDelay: 1000,
                        maxConcurrentRequests: 5,
                        enabled: true
                    },
                    cache: {
                        enabled: true,
                        ttl: 3600,
                        maxSize: 1000,
                        cleanupInterval: 300
                    },
                    logging: {
                        enabled: true,
                        level: 'info',
                        maxHistory: 1000
                    },
                    ui: {
                        enabled: true,
                        theme: 'default'
                    },
                    security: {
                        requireAdminTag: false,
                        enableSSL: true
                    },
                    features: {
                        enableRequestHistory: true,
                        enableStatistics: true,
                        enableHealthCheck: true
                    }
                });
            }

            this.logger.info('Step 2: Configuration loaded');

            // Step 3: Initialize cache
            if (!this.cache && this.config.get('cache.enabled')) {
                this.cache = new Cache({
                    ttl: this.config.get('cache.ttl'),
                    maxSize: this.config.get('cache.maxSize'),
                    cleanupInterval: this.config.get('cache.cleanupInterval')
                });
                this.logger.info('Step 3: Cache initialized');
            }

            // Step 4: Initialize request manager
            if (!this.requestManager) {
                this.requestManager = new RequestManager(this.config, this.logger);
                const initResult = await this.requestManager.initialize();
                if (!initResult) {
                    throw new Error('RequestManager initialization failed');
                }
                this.logger.info('Step 4: Request manager initialized');
            }

            // Step 5: Initialize dashboard
            if (!this.dashboard && this.config.get('ui.enabled')) {
                this.dashboard = new Dashboard(this.requestManager, this.logger);
                this.logger.info('Step 5: Dashboard initialized');
            }

            // Step 6: Initialize command registry (Bridge API)
            if (!this.commandRegistry) {
                this.commandRegistry = new CommandRegistry(this.logger);
                const bridgeConnected = await this.commandRegistry.initializeBridge();
                this.logger.info(`Step 6: Command registry initialized (Bridge: ${bridgeConnected ? 'connected' : 'not available'})`);
            }

            // Step 7: Register command handlers
            if (!this.chatEventSubscription) {
                this.registerCommands();
                this.logger.info('Step 7: Command handlers registered');
            }

            // Step 8: Register event handlers
            this.registerEventHandlers();
            this.logger.info('Step 8: Event handlers registered');

            this.initialized = true;

            console.log(`§a[${this.name}] ✓ Plugin loaded successfully! v${this.version}§r`);
            console.log(`§6Available Commands:§r`);
            console.log(`  §b!dashboard§r          Open main dashboard`);
            console.log(`  §b!http get <url>§r    Send GET request`);
            console.log(`  §b!http post <url>§r   Send POST request`);
            console.log(`  §b!http put <url>§r    Send PUT request`);
            console.log(`  §b!http delete <url>§r Send DELETE request`);
            console.log(`  §b!http stats§r        Show statistics`);
            console.log(`  §b!http status§r       Show system status`);
            console.log(`  §b!http queue§r        Show queue status`);
            console.log(`  §b!netstatus§r         Quick status check`);
            console.log(`  §b!nethelp§r           Show help menu\n`);

            return true;

        } catch (error) {
            console.error(`\n§c[${this.name}] INITIALIZATION ERROR (Attempt ${this.initializationAttempts}/${this.maxInitializationAttempts}):§r\n`, error);
            if (this.logger) {
                this.logger.error('Plugin initialization failed', error);
            }
            return false;
        }
    }

    /**
     * Register command handlers - Bulletproof version with Bridge API support
     */
    registerCommands() {
        try {
            // Safety check
            if (!world) {
                this.logger.error('world object not available');
                return;
            }

            if (!world.beforeEvents) {
                this.logger.error('beforeEvents not available');
                return;
            }

            if (!world.beforeEvents.chatSend) {
                this.logger.error('chatSend event not available');
                return;
            }

            // Register commands with CommandRegistry (for Bridge API)
            if (this.commandRegistry) {
                this.commandRegistry.registerCommands([
                    {
                        name: 'dashboard',
                        handler: (args, context) => this.handleDashboard(context.player),
                        metadata: {
                            description: 'Open the main dashboard UI',
                            usage: '!dashboard',
                            aliases: ['!dash'],
                            requiresAdmin: false
                        }
                    },
                    {
                        name: 'http',
                        handler: (args, context) => this.handleHttpCommand(context.player, args),
                        metadata: {
                            description: 'Execute HTTP requests',
                            usage: '!http [get|post|put|delete] <url>',
                            aliases: [],
                            requiresAdmin: false
                        }
                    },
                    {
                        name: 'netstatus',
                        handler: (args, context) => this.showNetStatus(context.player),
                        metadata: {
                            description: 'Show network plugin status',
                            usage: '!netstatus',
                            aliases: [],
                            requiresAdmin: false
                        }
                    },
                    {
                        name: 'nethelp',
                        handler: (args, context) => this.showHelp(context.player),
                        metadata: {
                            description: 'Show command help',
                            usage: '!nethelp',
                            aliases: ['!network-help'],
                            requiresAdmin: false
                        }
                    }
                ]);
                this.logger.info('Commands registered with Bridge API');
            }

            // Subscribe to chat event
            this.chatEventSubscription = world.beforeEvents.chatSend.subscribe((event) => {
                try {
                    if (!event) return;

                    const player = event.sender;
                    const message = event.message;

                    if (!player || !message) return;

                    const args = message.trim().split(/\s+/).filter(a => a.length > 0);
                    const command = args[0]?.toLowerCase();

                    if (!command || !command.startsWith('!')) return;

                    // Remove ! from command name
                    const commandName = command.substring(1);

                    // Check if command exists in registry
                    if (!this.commandRegistry || !this.commandRegistry.hasCommand(commandName)) {
                        return;  // Unknown command
                    }

                    // Check admin permission if required
                    const cmd = this.commandRegistry.getCommand(commandName);
                    if (cmd && cmd.metadata.requiresAdmin && this.config && this.config.get('security.requireAdminTag')) {
                        try {
                            const tags = player.getTags ? player.getTags() : [];
                            if (!tags.includes(this.adminTag)) {
                                player.sendMessage('§cThis command requires admin permission');
                                return;
                            }
                        } catch (e) {
                            this.logger.warn('Failed to check admin tags', e.message);
                            return;
                        }
                    }

                    event.cancel = true;

                    // Execute command through registry
                    this.commandRegistry.executeCommand(commandName, args.slice(1), { player })
                        .catch(err => {
                            if (this.logger) {
                                this.logger.error(`Command execution error: ${commandName}`, err);
                            }
                        });
                } catch (err) {
                    if (this.logger) {
                        this.logger.error('Chat handler error', err);
                    }
                }
            });

            this.logger.info('Chat command handlers registered successfully');
        } catch (error) {
            this.logger.error('Failed to register commands', error);
        }
    }

    /**
     * Handle dashboard command
     */
    handleDashboard(player) {
        try {
            if (!this.dashboard) {
                player.sendMessage('§cDashboard not available');
                return;
            }

            this.dashboard.showMainMenu(player).catch(error => {
                if (this.logger) {
                    this.logger.error('Dashboard error', error);
                }
                try {
                    player.sendMessage('§cError opening dashboard');
                } catch (e) {
                    // ignore
                }
            });
        } catch (error) {
            if (this.logger) {
                this.logger.error('Dashboard handler error', error);
            }
            try {
                player.sendMessage('§cError: ' + error.message);
            } catch (e) {
                // ignore
            }
        }
    }

    /**
     * Handle HTTP commands
     */
    handleHttpCommand(player, args) {
        try {
            if (!args || args.length === 0) {
                player.sendMessage('§cUsage: !http <get|post|put|delete|stats|status|queue>');
                return;
            }

            const subcommand = args[0].toLowerCase();

            switch (subcommand) {
                case 'get':
                    this.handleGetRequest(player, args.slice(1));
                    break;
                case 'post':
                    this.handlePostRequest(player, args.slice(1));
                    break;
                case 'put':
                    this.handlePutRequest(player, args.slice(1));
                    break;
                case 'delete':
                    this.handleDeleteRequest(player, args.slice(1));
                    break;
                case 'stats':
                    this.showStats(player);
                    break;
                case 'status':
                    this.showNetStatus(player);
                    break;
                case 'queue':
                    this.showQueue(player);
                    break;
                default:
                    player.sendMessage(`§cUnknown command: ${subcommand}. Use !nethelp for help`);
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('HTTP command error', error);
            }
            try {
                player.sendMessage('§cError: ' + error.message);
            } catch (e) {
                // ignore
            }
        }
    }

    /**
     * Handle GET request
     */
    handleGetRequest(player, args) {
        if (!args || args.length === 0) {
            player.sendMessage('§cUsage: !http get <url>');
            return;
        }

        const url = args[0];
        if (!Validators.isValidUrl(url)) {
            player.sendMessage('§cInvalid URL format');
            return;
        }

        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const requestId = this.requestManager.get(url);
            player.sendMessage(`§aGET request queued: §b${requestId}`);
            if (this.logger) {
                this.logger.info('GET request queued', { url, requestId });
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('GET request error', error);
            }
            player.sendMessage('§cRequest error: ' + error.message);
        }
    }

    /**
     * Handle POST request
     */
    handlePostRequest(player, args) {
        if (!args || args.length === 0) {
            player.sendMessage('§cUsage: !http post <url> [data]');
            return;
        }

        const url = args[0];
        const data = args.slice(1).join(' ') || null;

        if (!Validators.isValidUrl(url)) {
            player.sendMessage('§cInvalid URL format');
            return;
        }

        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const requestId = this.requestManager.post(url, data);
            player.sendMessage(`§aPOST request queued: §b${requestId}`);
            if (this.logger) {
                this.logger.info('POST request queued', { url, requestId });
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('POST request error', error);
            }
            player.sendMessage('§cRequest error: ' + error.message);
        }
    }

    /**
     * Handle PUT request
     */
    handlePutRequest(player, args) {
        if (!args || args.length === 0) {
            player.sendMessage('§cUsage: !http put <url> [data]');
            return;
        }

        const url = args[0];
        const data = args.slice(1).join(' ') || null;

        if (!Validators.isValidUrl(url)) {
            player.sendMessage('§cInvalid URL format');
            return;
        }

        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const requestId = this.requestManager.put(url, data);
            player.sendMessage(`§aPUT request queued: §b${requestId}`);
            if (this.logger) {
                this.logger.info('PUT request queued', { url, requestId });
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('PUT request error', error);
            }
            player.sendMessage('§cRequest error: ' + error.message);
        }
    }

    /**
     * Handle DELETE request
     */
    handleDeleteRequest(player, args) {
        if (!args || args.length === 0) {
            player.sendMessage('§cUsage: !http delete <url>');
            return;
        }

        const url = args[0];
        if (!Validators.isValidUrl(url)) {
            player.sendMessage('§cInvalid URL format');
            return;
        }

        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const requestId = this.requestManager.delete(url);
            player.sendMessage(`§aDELETE request queued: §b${requestId}`);
            if (this.logger) {
                this.logger.info('DELETE request queued', { url, requestId });
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('DELETE request error', error);
            }
            player.sendMessage('§cRequest error: ' + error.message);
        }
    }

    /**
     * Show statistics
     */
    showStats(player) {
        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const stats = this.requestManager.getStats();
            const successRate = stats.totalRequests > 0
                ? (stats.successCount / stats.totalRequests * 100).toFixed(2)
                : 0;

            player.sendMessage(
                `\n§6╔═══ HTTP Statistics ═══╗§r\n` +
                `§6║§r Total Requests: §b${stats.totalRequests || 0}\n` +
                `§6║§r Success: §a${stats.successCount || 0}\n` +
                `§6║§r Failed: §c${stats.failureCount || 0}\n` +
                `§6║§r Success Rate: §e${successRate}%\n` +
                `§6║§r Avg Response: §b${((stats.avgResponseTime || 0).toFixed(0))}ms\n` +
                `§6║§r Active: §b${stats.active || 0}\n` +
                `§6║§r Queued: §e${stats.queued || 0}\n` +
                `§6╚═══════════════════════╝§r\n`
            );
        } catch (error) {
            if (this.logger) {
                this.logger.error('Stats display error', error);
            }
            player.sendMessage('§cError displaying stats');
        }
    }

    /**
     * Show queue status
     */
    showQueue(player) {
        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const queueStatus = this.requestManager.getQueueStatus();
            player.sendMessage(
                `\n§6╔═══ Queue Status ══╗§r\n` +
                `§6║§r Queued: §e${queueStatus.queued || 0}\n` +
                `§6║§r Active: §b${queueStatus.active || 0}/${queueStatus.maxConcurrent || 5}\n` +
                `§6║§r Can Process: §${(queueStatus.canProcess) ? 'a' : 'c'}${(queueStatus.canProcess) ? 'Yes' : 'No'}§r\n` +
                `§6╚═══════════════════╝§r\n`
            );
        } catch (error) {
            if (this.logger) {
                this.logger.error('Queue display error', error);
            }
            player.sendMessage('§cError displaying queue');
        }
    }

    /**
     * Show network status
     */
    showNetStatus(player) {
        try {
            if (!this.requestManager) {
                player.sendMessage('§cRequest manager not initialized');
                return;
            }

            const health = this.requestManager.getHealthStatus();
            const stats = this.requestManager.getStats();

            const healthColor = health.health === 'excellent' ? '§a' : health.health === 'good' ? '§e' : '§c';

            player.sendMessage(
                `\n§6╔════ Network Status ════╗§r\n` +
                `§6║§r Health: ${healthColor}${health.health || 'unknown'}§r\n` +
                `§6║§r Success Rate: §${(health.successRate && health.successRate.includes('100')) ? 'a' : 'e'}${health.successRate || '0%'}§r\n` +
                `§6║§r Running: §${(health.running) ? 'a✓' : 'c✗'}§r\n` +
                `§6║§r Active: §b${stats.active || 0} / ${stats.maxConcurrent || 5}§r\n` +
                `§6║§r Queued: §e${stats.queued || 0}§r\n` +
                `§6╚═════════════════════╝§r\n`
            );
        } catch (error) {
            if (this.logger) {
                this.logger.error('Status display error', error);
            }
            player.sendMessage('§cError displaying status');
        }
    }

    /**
     * Show help menu
     */
    showHelp(player) {
        try {
            player.sendMessage(
                `\n§6╔════ Server-Net Help ════╗§r\n` +
                `§bCommands:§r\n` +
                `  §b!dashboard§r         - Open control panel\n` +
                `  §b!http get <url>§r   - Send GET request\n` +
                `  §b!http post <url>§r  - Send POST request\n` +
                `  §b!http put <url>§r   - Send PUT request\n` +
                `  §b!http delete <url>§r- Send DELETE request\n` +
                `  §b!http stats§r       - Show statistics\n` +
                `  §b!http status§r      - Show system status\n` +
                `  §b!http queue§r       - Show queue info\n` +
                `  §b!netstatus§r        - Quick status\n` +
                `  §b!nethelp§r          - Show this help\n` +
                `§eExamples:§r\n` +
                `  §b!http get https://api.github.com/users/github§r\n` +
                `  §b!http post https://api.example.com/data§r\n` +
                `§6╚═══════════════════════╝§r\n`
            );
        } catch (error) {
            if (this.logger) {
                this.logger.error('Help display error', error);
            }
        }
    }

    /**
     * Register event handlers
     */
    registerEventHandlers() {
        try {
            if (!world || !world.afterEvents || !world.afterEvents.playerSpawn) {
                this.logger.warn('playerSpawn event not available');
                return;
            }

            world.afterEvents.playerSpawn.subscribe((event) => {
                try {
                    const player = event.player;
                    if (player && player.sendMessage) {
                        player.sendMessage(`§a[${this.name}] Plugin ready. Use §b!nethelp§a for commands.`);
                    }
                } catch (err) {
                    // ignore - player might be disconnected
                }
            });

            this.logger.info('Player spawn handler registered');
        } catch (error) {
            this.logger.warn('Event handler registration warning', error.message);
        }
    }

    /**
     * Shutdown plugin
     */
    async shutdown() {
        try {
            if (this.logger) {
                this.logger.info('Plugin shutting down...');
            }

            if (this.requestManager) {
                await this.requestManager.shutdown();
            }

            if (this.cache && this.cache.destroy) {
                this.cache.destroy();
            }

            this.initialized = false;
            if (this.logger) {
                this.logger.info('Plugin shutdown complete');
            }
        } catch (error) {
            console.error(`[${this.name}] Shutdown error:`, error);
        }
    }
}

// Create global plugin instance
let globalPlugin = null;
let initializationStarted = false;

/**
 * Initialize plugin safely
 */
function initializePlugin() {
    if (globalPlugin && globalPlugin.initialized) return true;
    if (initializationStarted) return false;

    initializationStarted = true;

    try {
        if (!globalPlugin) {
            globalPlugin = new ServerNetPlugin();
        }

        globalPlugin.initialize().catch(error => {
            console.error('[ServerNet] Initialization error:', error);
        });

        return true;
    } catch (error) {
        console.error('[ServerNet] Failed to initialize plugin:', error);
        initializationStarted = false;
        return false;
    }
}

// Try multiple initialization points for bulletproof loading
try {
    // Method 1: World Initialize (if available)
    if (world && world.afterEvents && world.afterEvents.worldInitialize) {
        world.afterEvents.worldInitialize.subscribe(() => {
            initializePlugin();
        });
    }
} catch (e) {
    // Method 1 failed, will try others
}

try {
    // Method 2: Chat Send (fallback)
    if (world && world.beforeEvents && world.beforeEvents.chatSend) {
        const chatHandler = world.beforeEvents.chatSend.subscribe(() => {
            if (initializePlugin()) {
                try {
                    world.beforeEvents.chatSend.unsubscribe(chatHandler);
                } catch (e) {
                    // ignore
                }
            }
        });
    }
} catch (e) {
    // Method 2 failed, will try Method 3
}

try {
    // Method 3: System tick (guaranteed to work)
    if (system && system.runTimeout) {
        system.runTimeout(() => {
            initializePlugin();
        }, 5);
    }
} catch (e) {
    // ignore
}

// Export for external use
export { ServerNetPlugin, globalPlugin };
export default globalPlugin || new ServerNetPlugin();
