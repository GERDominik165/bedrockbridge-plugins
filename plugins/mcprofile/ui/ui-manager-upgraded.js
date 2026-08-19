/**
 * UI Manager - UPGRADED
 * @version 2.0.0 UPGRADED
 *
 * SERVER-UI INTEGRATION MIT ECHTEN PROFILDATEN
 * - Admin Notifications
 * - Profile Forms
 * - Echtzeit-Updates
 */

class UIManager {
    constructor(logger = null) {
        this.logger = logger;
        this.formCache = new Map();
        this.activeFormsByPlayer = new Map();
        this.uiTheme = 'default';

        if (logger) {
            this.logger.info(`[UI] UIManager initialized`);
        }
    }

    /**
     * Show player profile form - MIT ECHTEN DATEN
     */
    async showProfileForm(player, profile) {
        try {
            if (!player || !profile) return;

            if (this.logger) {
                this.logger.info(`[UI FORM] Showing profile form for admin: ${player.name}`);
                this.logger.info(`[UI FORM] Profile: ${profile.gamertag}`);
            }

            // Build and display form
            const formContent = this.buildDetailedProfileForm(profile);
            this.displayFormToPlayer(player, formContent);

            if (this.logger) {
                this.logger.info(`[UI FORM] ✓ Profile form displayed`);
            }

        } catch (error) {
            if (this.logger) {
                this.logger.error(`[UI ERROR] Error showing profile form: ${error.message}`);
            }
        }
    }

    /**
     * Build detailed profile form - ECHTE DATEN
     */
    buildDetailedProfileForm(profile) {
        const form = {
            title: `§6MCProfile Information`,
            lines: [
                ``,
                `§6═════════════════════════════════════════`,
                `§eGamertag (Xbox): §f${profile.gamertag}`,
                `§eXUID: §f${profile.xuid}`,
                `§eFloodgate UID: §f${profile.floodgateuid}`,
                ``,
                `§eAccount Information:`,
                `§e├─ Tier: §f${profile.accounttier}`,
                `§e├─ Gamescore: §f${profile.gamescore}`,
                `§e└─ Age: §f${profile.accountage || 'Unknown'}`,
                ``,
                `§eSkin Information:`,
                `§e├─ Texture ID: §f${profile.textureid}`,
                `§e└─ Skin URL: §f${profile.skin ? '✓ Available' : '✗ Not available'}`,
                ``,
                `§eLinked to Java: §f${profile.linked ? '✓ YES' : '✗ NO'}`,
            ]
        };

        // Add Java account info if linked
        if (profile.linked && profile.java_name) {
            form.lines.push(``,`§6═════════════════════════════════════════`,`§e🔗 Linked Java Account:`);
            form.lines.push(`§e├─ Name: §f${profile.java_name}`);
            form.lines.push(`§e└─ UUID: §f${profile.java_uuid}`);
        }

        form.lines.push(``,`§6═════════════════════════════════════════`,`§eFetched: §f${profile.fetchedAt}`,``);

        return form;
    }

    /**
     * Display form to player
     */
    displayFormToPlayer(player, form) {
        try {
            if (!player || !player.sendMessage) return;

            // Send form lines
            if (form.lines && Array.isArray(form.lines)) {
                form.lines.forEach(line => {
                    player.sendMessage(line);
                });
            }

            if (this.logger) {
                this.logger.debug(`[UI] Form displayed to: ${player.name}`);
            }

        } catch (error) {
            if (this.logger) {
                this.logger.error(`[UI ERROR] Error displaying form: ${error.message}`);
            }
        }
    }

    /**
     * Show admin dashboard
     */
    async showAdminDashboard(player, stats) {
        try {
            if (this.logger) {
                this.logger.info(`[UI DASHBOARD] Showing admin dashboard for: ${player.name}`);
            }

            const dashboard = this.buildAdminDashboard(stats);
            this.displayFormToPlayer(player, dashboard);

        } catch (error) {
            if (this.logger) {
                this.logger.error(`[UI ERROR] Error showing dashboard: ${error.message}`);
            }
        }
    }

    /**
     * Build admin dashboard
     */
    buildAdminDashboard(stats) {
        return {
            title: `§6MCProfile Admin Dashboard`,
            lines: [
                ``,
                `§6═════════════════════════════════════════`,
                `§e📊 Plugin Status:`,
                `§e├─ Version: §f${stats.version}`,
                `§e├─ Status: §a✓ Running`,
                `§e├─ Uptime: §f${this.formatUptime(stats.uptime)}`,
                `§e└─ Cache: §f${stats.cacheSize} profiles`,
                ``,
                `§e👥 Server Information:`,
                `§e├─ Total Players: §f${stats.totalPlayers}`,
                `§e├─ Admins Online: §f${stats.adminsOnline}`,
                `§e└─ Cached: §f${stats.cacheSize}`,
                ``,
                `§e🔌 API Status:`,
                `§e└─ Health: §${stats.apiHealth ? 'a' : 'c'}${stats.apiHealth ? '✓ Online' : '✗ Offline'}`,
                ``,
                `§6═════════════════════════════════════════`,
                ``
            ]
        };
    }

    /**
     * Show error dialog
     */
    async showErrorDialog(player, title, message) {
        try {
            if (this.logger) {
                this.logger.warn(`[UI ERROR DIALOG] ${title}: ${message}`);
            }

            const lines = [
                ``,
                `§c╔════════════════════════════════════════╗`,
                `§c║ ${this.padCenter('ERROR', 38)}§c║`,
                `§c╠════════════════════════════════════════╣`,
                `§c║ ${this.padCenter(title, 38)}§c║`,
                `§c║ ${this.padCenter(message, 38)}§c║`,
                `§c╚════════════════════════════════════════╝`,
                ``
            ];

            lines.forEach(line => player.sendMessage(line));

        } catch (error) {
            if (this.logger) {
                this.logger.error(`[UI ERROR] Error showing error dialog: ${error.message}`);
            }
        }
    }

    /**
     * Show success dialog
     */
    async showSuccessDialog(player, title, message) {
        try {
            if (this.logger) {
                this.logger.info(`[UI SUCCESS] ${title}`);
            }

            const lines = [
                ``,
                `§a╔════════════════════════════════════════╗`,
                `§a║ ${this.padCenter('SUCCESS', 38)}§a║`,
                `§a╠════════════════════════════════════════╣`,
                `§a║ ${this.padCenter(title, 38)}§a║`,
                `§a║ ${this.padCenter(message, 38)}§a║`,
                `§a╚════════════════════════════════════════╝`,
                ``
            ];

            lines.forEach(line => player.sendMessage(line));

        } catch (error) {
            if (this.logger) {
                this.logger.error(`[UI ERROR] Error showing success dialog: ${error.message}`);
            }
        }
    }

    /**
     * Show notification
     */
    async showNotification(player, title, message, type = 'info') {
        try {
            const color = type === 'error' ? '§c' : type === 'success' ? '§a' : '§e';

            const lines = [
                ``,
                `${color}[${title}] ${message}`,
                ``
            ];

            lines.forEach(line => player.sendMessage(line));

            if (this.logger) {
                this.logger.debug(`[UI NOTIFICATION] ${title}: ${message}`);
            }

        } catch (error) {
            if (this.logger) {
                this.logger.error(`[UI ERROR] Error showing notification: ${error.message}`);
            }
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
     * Pad center text
     */
    padCenter(text, width) {
        const totalPad = Math.max(0, width - text.length);
        const leftPad = Math.floor(totalPad / 2);
        const rightPad = Math.ceil(totalPad / 2);
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
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
        if (this.logger) {
            this.logger.debug(`[UI CACHE] Form cached: ${name}`);
        }
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
        if (this.logger) {
            this.logger.debug(`[UI CACHE] Form cache cleared`);
        }
    }

    /**
     * Set UI theme
     */
    setTheme(theme) {
        this.uiTheme = theme;
        if (this.logger) {
            this.logger.debug(`[UI THEME] Theme set to: ${theme}`);
        }
    }

    /**
     * Get UI theme
     */
    getTheme() {
        return this.uiTheme;
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
