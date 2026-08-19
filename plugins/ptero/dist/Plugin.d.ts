/**
 * Pterodactyl Bedrock Bridge - Main Plugin
 * Zentrale Plugin-Klasse mit vollständiger Integration
 */
import { IPluginConfig } from './types';
export declare class PterodactylPlugin {
    private config;
    private client;
    private serverEndpoint;
    private databaseEndpoint;
    private backupEndpoint;
    private scheduleEndpoint;
    private allocationEndpoint;
    private userEndpoint;
    private consoleSessions;
    private isInitialized;
    constructor(config: IPluginConfig);
    /**
     * Initialize plugin
     */
    initialize(): Promise<void>;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Handle chat commands
     */
    private handleChatCommand;
    /**
     * Execute command
     */
    private executeCommand;
    /**
     * Show main menu
     */
    private showMainMenu;
    /**
     * Show server list
     */
    private showServerList;
    /**
     * Show server details
     */
    private showServerDetails;
    /**
     * Start server
     */
    private startServer;
    /**
     * Stop server
     */
    private stopServer;
    /**
     * Restart server
     */
    private restartServer;
    /**
     * Open console
     */
    private openConsole;
    /**
     * Show databases
     */
    private showDatabases;
    /**
     * Show backups
     */
    private showBackups;
    /**
     * Show files
     */
    private showFiles;
    /**
     * Show server status
     */
    private showServerStatus;
    /**
     * Show all server status
     */
    private showAllStatus;
    /**
     * Show monitoring dashboard
     */
    private showMonitoringDashboard;
    /**
     * Show settings
     */
    private showSettings;
    /**
     * Show help
     */
    private showHelp;
    /**
     * Show info
     */
    private showInfo;
    /**
     * Helper methods
     */
    private showServerListForDatabases;
    private showServerListForBackups;
    private showServerListForFiles;
    private rotateDatabasePassword;
    private deleteDatabase;
    private createBackup;
    /**
     * Test connection
     */
    private testConnection;
    /**
     * Shutdown plugin
     */
    shutdown(): Promise<void>;
    /**
     * Get plugin stats
     */
    getStats(): {
        initialized: boolean;
        clientStats: {
            baseUrl: string;
            timeout: number;
            requestCount: number;
            queueSize: number;
            cacheSize: {
                size: number;
                entries: number;
            };
        };
        monitoring: {
            isRunning: boolean;
            monitoredServers: number;
            historySize: number;
            maxHistorySize: number;
        };
        consoleSessions: number;
        cacheSize: {
            size: number;
            entries: number;
        };
    };
}
export declare let pterodactylPlugin: PterodactylPlugin;
export declare function initializePlugin(config: IPluginConfig): Promise<void>;
//# sourceMappingURL=Plugin.d.ts.map