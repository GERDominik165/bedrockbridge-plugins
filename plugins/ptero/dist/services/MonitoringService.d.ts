/**
 * Pterodactyl Bedrock Bridge - Monitoring Service
 * Real-time Server Monitoring und Statistics Collection
 */
import { ServerEndpoint } from '../api/endpoints/ServerEndpoint';
import { IServerMonitorData, IMonitoringSnapshot } from '../types';
export declare class MonitoringService {
    private static instance;
    private isRunning;
    private monitoring;
    private history;
    private maxHistorySize;
    private interval;
    private updateInterval;
    private serverEndpoint;
    private onUpdateHandlers;
    private onAlertHandlers;
    private constructor();
    static getInstance(): MonitoringService;
    /**
     * Initialize monitoring
     */
    initialize(serverEndpoint: ServerEndpoint): void;
    /**
     * Start monitoring servers
     */
    start(): Promise<void>;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Collect metrics for all monitored servers
     */
    private collectMetrics;
    /**
     * Check for alerts and thresholds
     */
    private checkAlerts;
    /**
     * Add server to monitoring
     */
    addServer(serverId: string): void;
    /**
     * Remove server from monitoring
     */
    removeServer(serverId: string): void;
    /**
     * Get current monitoring data for server
     */
    getServerData(serverId: string): IServerMonitorData | null;
    /**
     * Get all monitoring data
     */
    getAllData(): Map<string, IServerMonitorData>;
    /**
     * Get history for server
     */
    getHistory(serverId?: string): IMonitoringSnapshot[];
    /**
     * Get average CPU usage
     */
    getAverageCpu(serverId: string): number;
    /**
     * Get peak CPU usage
     */
    getPeakCpu(serverId: string): number;
    /**
     * Get average memory usage
     */
    getAverageMemory(serverId: string): number;
    /**
     * Get peak memory usage
     */
    getPeakMemory(serverId: string): number;
    /**
     * Event handlers
     */
    onUpdate(handler: (snapshot: IMonitoringSnapshot) => void): void;
    onAlert(handler: (serverId: string, alert: string) => void): void;
    private emitUpdate;
    private emitAlert;
    /**
     * Format bytes to human readable
     */
    static formatBytes(bytes: number): string;
    /**
     * Is monitoring running
     */
    isMonitoring(): boolean;
    /**
     * Get monitoring stats
     */
    getStats(): {
        isRunning: boolean;
        monitoredServers: number;
        historySize: number;
        maxHistorySize: number;
    };
}
export declare const monitoringService: MonitoringService;
//# sourceMappingURL=MonitoringService.d.ts.map