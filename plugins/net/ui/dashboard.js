/**
 * Professional UI Dashboard for Server-Net Plugin
 * Uses @minecraft/server-ui for forms and displays statistics
 */

import { system } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

export class Dashboard {
    constructor(requestManager, logger) {
        this.requestManager = requestManager;
        this.logger = logger;
        this.colors = {
            primary: '§6',     // Gold
            success: '§a',     // Green
            danger: '§c',      // Red
            info: '§b',        // Cyan
            warning: '§e',     // Yellow
            reset: '§r'
        };
    }

    /**
     * Format number with thousand separators
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Format duration in milliseconds
     */
    formatDuration(ms) {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        return `${(ms / 60000).toFixed(2)}m`;
    }

    /**
     * Format timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    /**
     * Show main dashboard menu
     */
    async showMainMenu(player) {
        const form = new ActionFormData()
            .title(`${this.colors.primary}Server-Net Dashboard§r`)
            .body(`${this.colors.info}Professional HTTP Management System§r\n\nSelect an option below:`);

        const stats = this.requestManager.getStats();
        const healthStatus = this.requestManager.getHealthStatus();

        form.body(
            `${this.colors.primary}=== Server-Net Dashboard ===${this.colors.reset}\n` +
            `\n${this.colors.info}Health: ${healthStatus.health}${this.colors.reset}\n` +
            `Success Rate: ${healthStatus.successRate}\n` +
            `Active Requests: ${stats.active}\n` +
            `Queued: ${stats.queued}\n` +
            `\n${this.colors.primary}Select an option:${this.colors.reset}`
        );

        form.button(`${this.colors.info}📊 Statistics§r`);
        form.button(`${this.colors.success}📋 Queue Status§r`);
        form.button(`${this.colors.warning}📝 Request History§r`);
        form.button(`${this.colors.primary}⚙️  HTTP Test§r`);
        form.button(`${this.colors.danger}🔴 Settings§r`);

        try {
            const response = await form.show(player);

            if (response.canceled) return;

            switch (response.selection) {
                case 0: await this.showStatistics(player); break;
                case 1: await this.showQueueStatus(player); break;
                case 2: await this.showRequestHistory(player); break;
                case 3: await this.showHttpTest(player); break;
                case 4: await this.showSettings(player); break;
            }
        } catch (error) {
            this.logger.error('Error showing main menu', error);
            player.sendMessage(`${this.colors.danger}Error opening dashboard${this.colors.reset}`);
        }
    }

    /**
     * Show statistics
     */
    async showStatistics(player) {
        const stats = this.requestManager.getStats();
        const health = this.requestManager.getHealthStatus();

        const form = new ActionFormData()
            .title(`${this.colors.primary}Statistics§r`)
            .body(
                `${this.colors.info}=== Overall Statistics ===${this.colors.reset}\n` +
                `Total Requests: ${this.formatNumber(stats.totalRequests)}\n` +
                `Successful: ${this.colors.success}${this.formatNumber(stats.successCount)}${this.colors.reset}\n` +
                `Failed: ${this.colors.danger}${this.formatNumber(stats.failureCount)}${this.colors.reset}\n` +
                `Success Rate: ${health.successRate}\n` +
                `Avg Response Time: ${this.formatDuration(stats.avgResponseTime)}\n` +
                `Total Time: ${this.formatDuration(stats.totalTime)}\n` +
                `\n${this.colors.info}=== Current Status ===${this.colors.reset}\n` +
                `Active Requests: ${stats.active}\n` +
                `Queued: ${stats.queued}\n` +
                `Last Request: ${this.formatTimestamp(stats.lastRequest)}\n` +
                `Last Success: ${this.formatTimestamp(stats.lastSuccess)}\n` +
                `Last Error: ${this.formatTimestamp(stats.lastError)}`
            );

        form.button('Back to Menu');
        form.button(`${this.colors.danger}Reset Stats§r`);

        try {
            const response = await form.show(player);

            if (!response.canceled && response.selection === 1) {
                this.requestManager.resetStats();
                player.sendMessage(`${this.colors.success}Statistics reset${this.colors.reset}`);
            }

            await this.showMainMenu(player);
        } catch (error) {
            this.logger.error('Error showing statistics', error);
        }
    }

    /**
     * Show queue status
     */
    async showQueueStatus(player) {
        const queueStatus = this.requestManager.getQueueStatus();
        const active = this.requestManager.queue.getActive();

        let activeInfo = `${this.colors.info}=== Active Requests ===${this.colors.reset}\n`;
        if (active.length === 0) {
            activeInfo += 'None\n';
        } else {
            for (let i = 0; i < Math.min(3, active.length); i++) {
                const req = active[i];
                activeInfo += `${i + 1}. [${req.request.method}] ${req.request.uri.substring(0, 40)}\n`;
            }
            if (active.length > 3) {
                activeInfo += `...and ${active.length - 3} more\n`;
            }
        }

        const form = new ActionFormData()
            .title(`${this.colors.primary}Queue Status§r`)
            .body(
                `${this.colors.info}=== Queue Information ===${this.colors.reset}\n` +
                `Queued: ${queueStatus.queued}\n` +
                `Active: ${queueStatus.active}/${queueStatus.maxConcurrent}\n` +
                `Can Process: ${queueStatus.canProcess ? `${this.colors.success}Yes${this.colors.reset}` : `${this.colors.danger}No${this.colors.reset}`}\n` +
                `\n${activeInfo}`
            );

        form.button('Back to Menu');
        if (queueStatus.active > 0) {
            form.button(`${this.colors.danger}Cancel All§r`);
        }

        try {
            const response = await form.show(player);

            if (!response.canceled && response.selection === 1) {
                this.requestManager.cancelAll('Cancelled from dashboard');
                player.sendMessage(`${this.colors.success}All requests cancelled${this.colors.reset}`);
            }

            await this.showMainMenu(player);
        } catch (error) {
            this.logger.error('Error showing queue status', error);
        }
    }

    /**
     * Show request history
     */
    async showRequestHistory(player) {
        const history = this.requestManager.getHistory(20);

        let historyText = `${this.colors.info}=== Last 20 Requests ===${this.colors.reset}\n\n`;

        if (history.length === 0) {
            historyText += 'No request history';
        } else {
            for (const req of history) {
                const status = req.status === 'success' ? `${this.colors.success}✓${this.colors.reset}` : `${this.colors.danger}✗${this.colors.reset}`;
                const timeInfo = req.duration ? ` (${this.formatDuration(req.duration)})` : '';
                historyText += `${status} [${req.method}] ${req.uri.substring(0, 35)}${timeInfo}\n`;
            }
        }

        const form = new ActionFormData()
            .title(`${this.colors.primary}Request History§r`)
            .body(historyText);

        form.button('Back to Menu');
        form.button(`${this.colors.danger}Clear History§r`);

        try {
            const response = await form.show(player);

            if (!response.canceled && response.selection === 1) {
                this.requestManager.clearHistory();
                player.sendMessage(`${this.colors.success}History cleared${this.colors.reset}`);
            }

            await this.showMainMenu(player);
        } catch (error) {
            this.logger.error('Error showing history', error);
        }
    }

    /**
     * Show HTTP test form
     */
    async showHttpTest(player) {
        const form = new ModalFormData()
            .title(`${this.colors.primary}HTTP Test§r`)
            .dropdown('Method', ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'], 0)
            .textField('URL', 'https://api.example.com', 'https://api.example.com')
            .submitButton('Send Request');

        try {
            const response = await form.show(player);

            if (response.canceled || !response.formValues) return;

            const methodIndex = response.formValues[0];
            const url = response.formValues[1];
            const methods = ['Get', 'Post', 'Put', 'Delete', 'Head'];

            player.sendMessage(`${this.colors.info}Sending ${methods[methodIndex]} request...${this.colors.reset}`);

            const requestId = this.requestManager.queueRequest(url, methods[methodIndex]);
            player.sendMessage(`${this.colors.success}Request queued (ID: ${requestId})${this.colors.reset}`);

            // Show result after delay (2000ms ≈ 40 ticks at 20 ticks/sec)
            system.runTimeout(() => {
                try {
                    const status = this.requestManager.getRequestStatus(requestId);
                    if (status) {
                        if (status.status === 'completed') {
                            player.sendMessage(`${this.colors.success}✓ Success: Status ${status.result.status}${this.colors.reset}`);
                        } else if (status.status === 'failed') {
                            player.sendMessage(`${this.colors.danger}✗ Failed: ${status.error}${this.colors.reset}`);
                        }
                    }
                } catch (error) {
                    this.logger.error('Error checking request status', error);
                }
            }, 40);

            await this.showMainMenu(player);
        } catch (error) {
            this.logger.error('Error in HTTP test', error);
        }
    }

    /**
     * Show settings
     */
    async showSettings(player) {
        const form = new ActionFormData()
            .title(`${this.colors.primary}Settings§r`)
            .body(`${this.colors.info}Configure Server-Net settings:${this.colors.reset}`);

        form.button(`${this.colors.primary}⚙️  General Settings§r`);
        form.button(`${this.colors.info}📡 API Settings§r`);
        form.button(`${this.colors.warning}📦 Cache Settings§r`);
        form.button('Back to Menu');

        try {
            const response = await form.show(player);

            if (response.canceled) return;

            switch (response.selection) {
                case 0: await this.showGeneralSettings(player); break;
                case 1: await this.showAPISettings(player); break;
                case 2: await this.showCacheSettings(player); break;
                case 3: await this.showMainMenu(player); break;
            }
        } catch (error) {
            this.logger.error('Error showing settings', error);
        }
    }

    /**
     * Show general settings
     */
    async showGeneralSettings(player) {
        const form = new ActionFormData()
            .title(`${this.colors.primary}General Settings§r`)
            .body(`${this.colors.info}General Configuration:${this.colors.reset}\n\nLogging and behavior settings`);

        form.button(`${this.colors.info}📝 View Logs§r`);
        form.button(`${this.colors.warning}🔄 Health Check§r`);
        form.button('Back to Settings');

        try {
            const response = await form.show(player);

            if (response.canceled) return;

            switch (response.selection) {
                case 0: await this.showLogs(player); break;
                case 1: await this.performHealthCheck(player); break;
                case 2: await this.showSettings(player); break;
            }
        } catch (error) {
            this.logger.error('Error showing general settings', error);
        }
    }

    /**
     * Show API settings
     */
    async showAPISettings(player) {
        const config = this.requestManager.config;

        const form = new ActionFormData()
            .title(`${this.colors.primary}API Settings§r`)
            .body(
                `${this.colors.info}Current API Configuration:${this.colors.reset}\n\n` +
                `Timeout: ${config.get('api.timeout')}ms\n` +
                `Max Concurrent: ${config.get('api.maxConcurrentRequests')}\n` +
                `Retries: ${config.get('api.retries')}\n` +
                `Retry Delay: ${config.get('api.retryDelay')}ms`
            );

        form.button('Back to Settings');

        try {
            const response = await form.show(player);
            if (!response.canceled) await this.showSettings(player);
        } catch (error) {
            this.logger.error('Error showing API settings', error);
        }
    }

    /**
     * Show cache settings
     */
    async showCacheSettings(player) {
        const config = this.requestManager.config;

        const form = new ActionFormData()
            .title(`${this.colors.primary}Cache Settings§r`)
            .body(
                `${this.colors.info}Current Cache Configuration:${this.colors.reset}\n\n` +
                `Enabled: ${config.get('cache.enabled') ? '✓' : '✗'}\n` +
                `TTL: ${config.get('cache.ttl')}s\n` +
                `Max Size: ${config.get('cache.maxSize')} entries`
            );

        form.button('Back to Settings');

        try {
            const response = await form.show(player);
            if (!response.canceled) await this.showSettings(player);
        } catch (error) {
            this.logger.error('Error showing cache settings', error);
        }
    }

    /**
     * Show logs
     */
    async showLogs(player) {
        const logs = this.logger.getHistory(15);

        let logsText = `${this.colors.info}=== Recent Logs (Last 15) ===${this.colors.reset}\n\n`;

        if (logs.length === 0) {
            logsText += 'No logs available';
        } else {
            for (const log of logs) {
                const levelColor = log.level === 'error' ? this.colors.danger :
                                   log.level === 'warn' ? this.colors.warning : this.colors.info;
                logsText += `${levelColor}[${log.level.toUpperCase()}]${this.colors.reset} ${log.message}\n`;
            }
        }

        const form = new ActionFormData()
            .title(`${this.colors.primary}Logs§r`)
            .body(logsText);

        form.button('Back');

        try {
            const response = await form.show(player);
            if (!response.canceled) await this.showGeneralSettings(player);
        } catch (error) {
            this.logger.error('Error showing logs', error);
        }
    }

    /**
     * Perform health check
     */
    async performHealthCheck(player) {
        player.sendMessage(`${this.colors.info}Running health check...${this.colors.reset}`);

        const health = this.requestManager.getHealthStatus();

        const form = new ActionFormData()
            .title(`${this.colors.primary}Health Check§r`)
            .body(
                `${this.colors.info}=== System Health ===${this.colors.reset}\n\n` +
                `Status: ${health.health === 'excellent' ? this.colors.success : this.colors.warning}${health.health}${this.colors.reset}\n` +
                `Success Rate: ${health.successRate}\n` +
                `Running: ${health.running ? '✓ Yes' : '✗ No'}\n` +
                `\n${this.colors.info}Stats:${this.colors.reset}\n` +
                `Total Requests: ${health.stats.totalRequests}\n` +
                `Success: ${health.stats.successCount}\n` +
                `Failed: ${health.stats.failureCount}`
            );

        form.button('Back');

        try {
            const response = await form.show(player);
            if (!response.canceled) await this.showGeneralSettings(player);
        } catch (error) {
            this.logger.error('Error showing health check', error);
        }
    }
}

export default Dashboard;
