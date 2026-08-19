/**
 * ChatRank++ BedrockBridge Plugin
 * Version: 2.0.0
 * Main Entry Point
 */

// Import all core managers
import RankManager from './core/RankManager.js';
import { system } from "@minecraft/server";
const setInterval = (cb, ms) => system.runInterval(cb, Math.max(1, Math.round((ms || 0) / 50)));
import ChatFormatter from './core/ChatFormatter.js';
import PlayerInfoManager from './core/PlayerInfoManager.js';
import MuteManager from './core/MuteManager.js';
import ClanTagManager from './core/ClanTagManager.js';
import CustomNameManager from './core/CustomNameManager.js';
import HideVisibilityManager from './core/HideVisibilityManager.js';
import HealthDisplayManager from './core/HealthDisplayManager.js';
import ColorGradientManager from './core/ColorGradientManager.js';
import AdvancedCooldownManager from './core/AdvancedCooldownManager.js';
import NotificationManager from './core/NotificationManager.js';
import DatabaseManager from './core/DatabaseManager.js';
import StatsManager from './core/StatsManager.js';
import FilterManager from './core/FilterManager.js';
import PermissionManager from './core/PermissionManager.js';
import LogManager from './core/LogManager.js';
import ConfigManager from './core/ConfigManager.js';

// Import command handlers
import RankCommands from './commands/RankCommands.js';
import MuteCommands from './commands/MuteCommands.js';
import ClanCommands from './commands/ClanCommands.js';
import NameCommands from './commands/NameCommands.js';
import AdminCommands from './commands/AdminCommands.js';
import StatsCommands from './commands/StatsCommands.js';
import ConfigCommands from './commands/ConfigCommands.js';
import FilterCommands from './commands/FilterCommands.js';

class ChatRankPlusPlus {
    constructor() {
        this.version = '2.0.0';
        this.managers = {};
        this.commands = {};
        this.initialized = false;
    }

    /**
     * Initialize plugin
     */
    async initialize(bridge) {
        try {
            console.log('§6[ChatRank++] Initializing plugin v' + this.version);

            // Initialize database first
            this.managers.database = new DatabaseManager();
            await this.managers.database.load();

            // Initialize all managers
            this.managers.log = new LogManager();
            this.managers.config = new ConfigManager();
            this.managers.rank = new RankManager();
            this.managers.playerInfo = new PlayerInfoManager();
            this.managers.mute = new MuteManager();
            this.managers.clanTag = new ClanTagManager();
            this.managers.customName = new CustomNameManager();
            this.managers.hideVisibility = new HideVisibilityManager();
            this.managers.healthDisplay = new HealthDisplayManager();
            this.managers.colorGradient = new ColorGradientManager();
            this.managers.cooldown = new AdvancedCooldownManager();
            this.managers.notification = new NotificationManager();
            this.managers.stats = new StatsManager();
            this.managers.filter = new FilterManager();

            // Initialize permission manager with rank manager
            this.managers.permission = new PermissionManager(this.managers.rank);

            // Initialize chat formatter with dependencies
            this.managers.chatFormatter = new ChatFormatter(
                this.managers.rank,
                this.managers.playerInfo
            );

            // Load all data from database
            this.loadAllData();

            // Initialize command handlers
            this.initializeCommands(bridge);

            // Register event listeners
            this.registerEvents(bridge);

            // Setup auto-save
            this.setupAutoSave();

            this.initialized = true;
            this.managers.log.info('SYSTEM', 'ChatRank++ initialized successfully');
            console.log('§a[ChatRank++] Plugin loaded successfully!');

            return true;
        } catch (error) {
            console.error('§c[ChatRank++] Failed to initialize:', error);
            this.managers.log?.error('SYSTEM', 'Failed to initialize', { error: error.message });
            return false;
        }
    }

    /**
     * Load all manager data from database
     */
    loadAllData() {
        Object.values(this.managers).forEach(manager => {
            if (manager.loadFromDatabase) {
                manager.loadFromDatabase(this.managers.database);
            }
        });
    }

    /**
     * Save all manager data to database
     */
    saveAllData() {
        Object.values(this.managers).forEach(manager => {
            if (manager.saveToDatabase) {
                manager.saveToDatabase(this.managers.database);
            }
        });
        this.managers.database.save();
    }

    /**
     * Initialize command handlers
     */
    initializeCommands(bridge) {
        this.commands.rank = new RankCommands(this.managers);
        this.commands.mute = new MuteCommands(this.managers);
        this.commands.clan = new ClanCommands(this.managers);
        this.commands.name = new NameCommands(this.managers);
        this.commands.admin = new AdminCommands(this.managers);
        this.commands.stats = new StatsCommands(this.managers);
        this.commands.config = new ConfigCommands(this.managers);
        this.commands.filter = new FilterCommands(this.managers);

        // Register all commands
        Object.values(this.commands).forEach(cmd => {
            if (cmd.register) {
                cmd.register(bridge);
            }
        });

        this.managers.log.info('COMMANDS', 'All commands registered');
    }

    /**
     * Register event listeners
     */
    registerEvents(bridge) {
        // Player join event
        bridge.on('playerJoin', (player) => {
            this.handlePlayerJoin(player);
        });

        // Player leave event
        bridge.on('playerLeave', (player) => {
            this.handlePlayerLeave(player);
        });

        // Chat message event
        bridge.on('chatMessage', (player, message) => {
            return this.handleChatMessage(player, message);
        });

        // Player death event
        bridge.on('playerDeath', (player) => {
            this.handlePlayerDeath(player);
        });

        this.managers.log.info('EVENTS', 'Event listeners registered');
    }

    /**
     * Handle player join
     */
    handlePlayerJoin(player) {
        // Update player info
        this.managers.playerInfo.updatePlayer(player);

        // Send welcome message
        const rank = this.managers.rank.getPlayerRank(player.name);
        player.sendMessage(`§aWelcome back, ${rank.color}${player.name}§a!`);

        // Notify admins
        if (this.managers.config.get('discord.eventNotifications')) {
            this.managers.notification.sendDiscordNotification(
                'Player Joined',
                `${player.name} joined the server`,
                0x00ff00
            );
        }

        this.managers.log.info('PLAYER', `${player.name} joined the server`);
    }

    /**
     * Handle player leave
     */
    handlePlayerLeave(player) {
        // Save session data
        this.managers.playerInfo.clearSession(player.name);

        // Save all data
        this.saveAllData();

        this.managers.log.info('PLAYER', `${player.name} left the server`);
    }

    /**
     * Handle chat message
     */
    handleChatMessage(player, message) {
        try {
            // Check if player is muted
            if (this.managers.mute.isMuted(player.name)) {
                const muteData = this.managers.mute.getMuteData(player.name);
                const remaining = this.managers.mute.formatTimeRemaining(player.name);
                player.sendMessage(`§cYou are muted! Reason: ${muteData.reason}`);
                player.sendMessage(`§cTime remaining: ${remaining}`);
                return { cancel: true };
            }

            // Check cooldown
            if (this.managers.cooldown.isOnCooldown(player.name, 'chat')) {
                const remaining = this.managers.cooldown.getTimeRemaining(player.name, 'chat');
                player.sendMessage(`§cPlease wait ${Math.ceil(remaining / 1000)}s before chatting again`);
                return { cancel: true };
            }

            // Apply word filter
            if (!this.managers.filter.isPlayerWhitelisted(player.name)) {
                const filtered = this.managers.filter.filterMessage(message);
                if (filtered.blocked) {
                    this.managers.log.warn('FILTER', `Blocked message from ${player.name}`, { message });
                    player.sendMessage('§cYour message contained inappropriate content');
                    return { cancel: true };
                }
                message = filtered.filtered;
            }

            // Update player info
            this.managers.playerInfo.updatePlayer(player);
            this.managers.playerInfo.incrementMessages(player.name);
            this.managers.stats.trackEvent(player.name, 'messagesSent');

            // Format message
            const formattedMessage = this.managers.chatFormatter.formatMessage(player, message);

            // Set cooldown
            const cooldownDuration = this.managers.config.get('chat.cooldown');
            this.managers.cooldown.setCooldown(player.name, 'chat', cooldownDuration);

            // Send to Discord if enabled
            if (this.managers.config.get('discord.chatRelay')) {
                const plainMessage = this.managers.chatFormatter.stripColors(formattedMessage);
                this.managers.notification.sendDiscordNotification(
                    'Chat Message',
                    plainMessage,
                    0x3498db
                );
            }

            return {
                cancel: true,
                customMessage: formattedMessage
            };

        } catch (error) {
            this.managers.log.error('CHAT', 'Error processing chat message', { error: error.message });
            return { cancel: false };
        }
    }

    /**
     * Handle player death
     */
    handlePlayerDeath(player) {
        this.managers.stats.trackEvent(player.name, 'deaths');
        this.managers.log.info('PLAYER', `${player.name} died`);
    }

    /**
     * Setup auto-save
     */
    setupAutoSave() {
        const interval = this.managers.config.get('database.autoSaveInterval');

        setInterval(() => {
            if (this.managers.config.get('database.autoSave')) {
                this.saveAllData();
                this.managers.log.debug('DATABASE', 'Auto-saved all data');
            }
        }, interval);
    }

    /**
     * Shutdown plugin
     */
    shutdown() {
        console.log('§e[ChatRank++] Shutting down...');

        // Save all data
        this.saveAllData();

        this.managers.log.info('SYSTEM', 'ChatRank++ shut down');
        console.log('§a[ChatRank++] Shutdown complete');
    }
}

// Export plugin instance
export default new ChatRankPlusPlus();
