/**
 * UI Manager
 * @version 2.0.0
 *
 * Handles all user interface elements and forms
 * Uses Bedrock Bridge UI components (ActionForm, ModalForm, etc.)
 */

class UIManager {
    constructor() {
        this.formCache = new Map();
        this.activeFormsByPlayer = new Map();
        this.uiTheme = 'default';
    }

    /**
     * Show player profile form
     */
    async showProfileForm(player, profile) {
        try {
            if (!player || !profile) return;

            const formData = this.buildProfileForm(profile);
            // In real environment, would use Bedrock UI API
            this.displayNotification(player, formData);

        } catch (error) {
            console.error(`Error showing profile form: ${error.message}`);
        }
    }

    /**
     * Build profile information form
     */
    buildProfileForm(profile) {
        return {
            title: '§6MCProfile Information',
            content: [
                `§eGamertag: §f${profile.gamertag}`,
                `§eXUID: §f${profile.xuid}`,
                `§eFloodgate UID: §f${profile.floodgateuid}`,
                `§eAccount Tier: §f${profile.accounttier}`,
                `§eGamescore: §f${profile.gamescore}`,
                `§eLinked: §f${profile.linked ? '✓ Yes' : '✗ No'}`,
                ...(profile.linked ? [
                    `§eJava Name: §f${profile.java_name}`,
                    `§eJava UUID: §f${profile.java_uuid}`
                ] : [])
            ].join('\n'),
            buttons: [
                { text: '§cClose', value: 'close' },
                { text: '§eCopy XUID', value: 'copy_xuid' },
                { text: '§aMore Info', value: 'more_info' }
            ]
        };
    }

    /**
     * Display notification to player
     */
    displayNotification(player, data) {
        try {
            if (!player || !player.sendMessage) return;

            // Send messages to player
            if (data.content) {
                const lines = data.content.split('\n');
                lines.forEach(line => {
                    player.sendMessage(line);
                });
            }

        } catch (error) {
            console.error(`Error displaying notification: ${error.message}`);
        }
    }

    /**
     * Show admin dashboard
     */
    async showAdminDashboard(player, stats) {
        try {
            const dashboard = this.buildAdminDashboard(stats);
            this.displayNotification(player, dashboard);

        } catch (error) {
            console.error(`Error showing admin dashboard: ${error.message}`);
        }
    }

    /**
     * Build admin dashboard
     */
    buildAdminDashboard(stats) {
        return {
            title: '§6MCProfile Admin Dashboard',
            content: [
                `§6===== Plugin Status =====`,
                `§eVersion: §f${stats.version}`,
                `§eStatus: §a${stats.enabled ? 'Running' : 'Stopped'}`,
                `§eCache Size: §f${stats.cacheSize}`,
                `§eUptime: §f${this.formatUptime(stats.uptime)}`,
                `§6===== Statistics =====`,
                `§eTotal Players: §f${stats.totalPlayers}`,
                `§eAdmins Online: §f${stats.adminsOnline}`,
                `§eProfiles Cached: §f${stats.cacheSize}`,
                `§eAPI Status: §${stats.apiHealth ? 'a✓' : 'c✗'} Online`
            ].join('\n'),
            buttons: []
        };
    }

    /**
     * Show settings form
     */
    async showSettingsForm(player, currentSettings) {
        try {
            const form = this.buildSettingsForm(currentSettings);
            this.displayNotification(player, form);

        } catch (error) {
            console.error(`Error showing settings form: ${error.message}`);
        }
    }

    /**
     * Build settings form
     */
    buildSettingsForm(settings) {
        return {
            title: '§6MCProfile Settings',
            content: [
                `§6===== Cache Settings =====`,
                `§eEnabled: §f${settings.cache.enabled}`,
                `§eTTL: §f${settings.cache.ttl}s`,
                `§eMax Size: §f${settings.cache.maxSize}`,
                `§6===== API Settings =====`,
                `§eEndpoint: §f${settings.api.endpoint}`,
                `§eTimeout: §f${settings.api.timeout}ms`,
                `§eRetries: §f${settings.api.retries}`,
                `§6===== UI Settings =====`,
                `§eEnabled: §f${settings.ui.enabled}`,
                `§eTheme: §f${settings.ui.theme}`
            ].join('\n'),
            buttons: []
        };
    }

    /**
     * Show error dialog
     */
    async showErrorDialog(player, title, message) {
        try {
            const form = {
                title: `§c${title}`,
                content: `§c${message}`,
                buttons: [{ text: '§cOK', value: 'close' }]
            };

            this.displayNotification(player, form);

        } catch (error) {
            console.error(`Error showing error dialog: ${error.message}`);
        }
    }

    /**
     * Show success dialog
     */
    async showSuccessDialog(player, title, message) {
        try {
            const form = {
                title: `§a${title}`,
                content: `§a${message}`,
                buttons: [{ text: '§aOK', value: 'close' }]
            };

            this.displayNotification(player, form);

        } catch (error) {
            console.error(`Error showing success dialog: ${error.message}`);
        }
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmDialog(player, title, message, onConfirm, onCancel) {
        try {
            const form = {
                title: `§e${title}`,
                content: `§e${message}`,
                buttons: [
                    { text: '§aYes', value: 'confirm' },
                    { text: '§cNo', value: 'cancel' }
                ]
            };

            this.displayNotification(player, form);
            // In real implementation, would handle button clicks

        } catch (error) {
            console.error(`Error showing confirm dialog: ${error.message}`);
        }
    }

    /**
     * Format uptime
     */
    formatUptime(ticks) {
        const seconds = Math.floor(ticks / 20);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Create custom form
     */
    createForm(title, content, buttons = []) {
        return {
            title,
            content,
            buttons: buttons.map((btn, index) => ({
                text: btn.text || `Button ${index}`,
                value: btn.value || index
            }))
        };
    }

    /**
     * Cache form
     */
    cacheForm(name, form) {
        this.formCache.set(name, form);
    }

    /**
     * Get cached form
     */
    getForm(name) {
        return this.formCache.get(name);
    }

    /**
     * Clear form cache
     */
    clearFormCache() {
        this.formCache.clear();
    }

    /**
     * Set UI theme
     */
    setTheme(theme) {
        this.uiTheme = theme;
    }

    /**
     * Get UI theme
     */
    getTheme() {
        return this.uiTheme;
    }

    /**
     * Format color code
     */
    formatColor(color) {
        const colors = {
            red: '§c',
            green: '§a',
            yellow: '§e',
            blue: '§b',
            gold: '§6',
            gray: '§7',
            white: '§f'
        };
        return colors[color] || '§f';
    }

    /**
     * Create colored text
     */
    coloredText(text, color) {
        return `${this.formatColor(color)}${text}`;
    }

    /**
     * Get UI stats
     */
    getStats() {
        return {
            cachedForms: this.formCache.size,
            activePlayersWithForms: this.activeFormsByPlayer.size,
            theme: this.uiTheme
        };
    }
}

export default UIManager;
