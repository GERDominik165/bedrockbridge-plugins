/**
 * Pterodactyl Bedrock Bridge - Monitoring Service
 * Real-time Server Monitoring und Statistics Collection
 */
import { MONITORING_CONFIG } from '../config/Constants';
import { logger } from '../utils/Logger';
export class MonitoringService {
    constructor() {
        this.isRunning = false;
        this.monitoring = new Map();
        this.history = [];
        this.maxHistorySize = MONITORING_CONFIG.MAX_HISTORY_SIZE;
        this.serverEndpoint = null;
        // Event handlers
        this.onUpdateHandlers = [];
        this.onAlertHandlers = [];
    }
    static getInstance() {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }
    /**
     * Initialize monitoring
     */
    initialize(serverEndpoint) {
        this.serverEndpoint = serverEndpoint;
        logger.info('Monitoring Service initialized');
    }
    /**
     * Start monitoring servers
     */
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        logger.info('Starting server monitoring', { interval: MONITORING_CONFIG.INTERVAL });
        // Start update interval
        this.interval = setInterval(async () => {
            await this.collectMetrics();
        }, MONITORING_CONFIG.INTERVAL);
    }
    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
        }
        logger.info('Server monitoring stopped');
    }
    /**
     * Collect metrics for all monitored servers
     */
    async collectMetrics() {
        if (!this.serverEndpoint || this.monitoring.size === 0)
            return;
        const snapshot = {
            timestamp: Date.now(),
            servers: new Map()
        };
        for (const [serverId, _] of this.monitoring) {
            try {
                const resources = await this.serverEndpoint.getResources(serverId, false);
                const attrs = resources.attributes;
                const res = attrs.resources;
                const monitorData = {
                    serverId,
                    timestamp: Date.now(),
                    state: attrs.current_state || 'unknown',
                    cpu: res.cpu_absolute || 0,
                    memory: res.memory_bytes || 0,
                    disk: res.disk_bytes || 0,
                    networkRx: res.network_rx_bytes || 0,
                    networkTx: res.network_tx_bytes || 0,
                    uptime: res.uptime || 0
                };
                snapshot.servers.set(serverId, monitorData);
                this.monitoring.set(serverId, monitorData);
                // Check for alerts
                this.checkAlerts(serverId, monitorData);
            }
            catch (error) {
                logger.error(`Failed to collect metrics for server ${serverId}`, { error: String(error) });
            }
        }
        // Add to history
        this.history.push(snapshot);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
        // Emit update event
        this.emitUpdate(snapshot);
    }
    /**
     * Check for alerts and thresholds
     */
    checkAlerts(serverId, data) {
        // CPU threshold: 95%
        if (data.cpu > 95) {
            this.emitAlert(serverId, `High CPU usage: ${data.cpu.toFixed(2)}%`);
        }
        // Memory threshold: 90%
        const memUsage = this.monitoring.get(serverId);
        if (memUsage) {
            const memPercent = (data.memory / 1073741824) * 100; // Assuming 1GB limit
            if (memPercent > 90) {
                this.emitAlert(serverId, `High memory usage: ${memPercent.toFixed(2)}%`);
            }
        }
        // Offline check
        if (data.state === 'offline') {
            // Only alert once
            const prev = this.monitoring.get(serverId);
            if (prev && prev.state !== 'offline') {
                this.emitAlert(serverId, 'Server went offline');
            }
        }
    }
    /**
     * Add server to monitoring
     */
    addServer(serverId) {
        if (!this.monitoring.has(serverId)) {
            this.monitoring.set(serverId, {
                serverId,
                timestamp: Date.now(),
                state: 'unknown',
                cpu: 0,
                memory: 0,
                disk: 0,
                networkRx: 0,
                networkTx: 0,
                uptime: 0
            });
            logger.debug('Server added to monitoring', { serverId });
        }
    }
    /**
     * Remove server from monitoring
     */
    removeServer(serverId) {
        this.monitoring.delete(serverId);
        logger.debug('Server removed from monitoring', { serverId });
    }
    /**
     * Get current monitoring data for server
     */
    getServerData(serverId) {
        return this.monitoring.get(serverId) || null;
    }
    /**
     * Get all monitoring data
     */
    getAllData() {
        return new Map(this.monitoring);
    }
    /**
     * Get history for server
     */
    getHistory(serverId) {
        if (!serverId) {
            return [...this.history];
        }
        return this.history
            .filter(snapshot => snapshot.servers.has(serverId))
            .map(snapshot => ({
            timestamp: snapshot.timestamp,
            servers: new Map([[serverId, snapshot.servers.get(serverId)]])
        }));
    }
    /**
     * Get average CPU usage
     */
    getAverageCpu(serverId) {
        const history = this.getHistory(serverId);
        if (history.length === 0)
            return 0;
        const sum = history.reduce((acc, snap) => {
            const data = snap.servers.get(serverId);
            return acc + (data?.cpu || 0);
        }, 0);
        return sum / history.length;
    }
    /**
     * Get peak CPU usage
     */
    getPeakCpu(serverId) {
        const history = this.getHistory(serverId);
        if (history.length === 0)
            return 0;
        return Math.max(...history.map(snap => snap.servers.get(serverId)?.cpu || 0));
    }
    /**
     * Get average memory usage
     */
    getAverageMemory(serverId) {
        const history = this.getHistory(serverId);
        if (history.length === 0)
            return 0;
        const sum = history.reduce((acc, snap) => {
            const data = snap.servers.get(serverId);
            return acc + (data?.memory || 0);
        }, 0);
        return sum / history.length;
    }
    /**
     * Get peak memory usage
     */
    getPeakMemory(serverId) {
        const history = this.getHistory(serverId);
        if (history.length === 0)
            return 0;
        return Math.max(...history.map(snap => snap.servers.get(serverId)?.memory || 0));
    }
    /**
     * Event handlers
     */
    onUpdate(handler) {
        this.onUpdateHandlers.push(handler);
    }
    onAlert(handler) {
        this.onAlertHandlers.push(handler);
    }
    emitUpdate(snapshot) {
        this.onUpdateHandlers.forEach(handler => {
            try {
                handler(snapshot);
            }
            catch (error) {
                logger.error('Error in monitoring update handler', { error: String(error) });
            }
        });
    }
    emitAlert(serverId, alert) {
        logger.warn('Monitoring alert', { serverId, alert });
        this.onAlertHandlers.forEach(handler => {
            try {
                handler(serverId, alert);
            }
            catch (error) {
                logger.error('Error in monitoring alert handler', { error: String(error) });
            }
        });
    }
    /**
     * Format bytes to human readable
     */
    static formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    /**
     * Is monitoring running
     */
    isMonitoring() {
        return this.isRunning;
    }
    /**
     * Get monitoring stats
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            monitoredServers: this.monitoring.size,
            historySize: this.history.length,
            maxHistorySize: this.maxHistorySize
        };
    }
}
export const monitoringService = MonitoringService.getInstance();
//# sourceMappingURL=MonitoringService.js.map