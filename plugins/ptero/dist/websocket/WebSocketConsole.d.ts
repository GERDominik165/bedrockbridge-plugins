/**
 * Pterodactyl Bedrock Bridge - WebSocket Console
 * Real-time Server Console mit WebSocket Integration
 */
import { IWebSocketMessage, ServerPowerState } from '../types';
export interface IConsoleMessage {
    timestamp: number;
    content: string;
    type: 'output' | 'system' | 'error';
}
export interface IServerStats {
    timestamp: number;
    state: string;
    cpu: number;
    memory: number;
    memoryLimit: number;
    disk: number;
    networkRx: number;
    networkTx: number;
    uptime: number;
}
export declare class WebSocketConsole {
    private serverId;
    private token;
    private socket;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private messageQueue;
    private consoleBuffer;
    private maxBufferSize;
    private statsHistory;
    private maxStatsHistory;
    private pingInterval;
    private onMessageHandlers;
    private onStatusHandlers;
    private onStatsHandlers;
    private onErrorHandlers;
    private onDisconnectHandlers;
    constructor(serverId: string, token: string);
    /**
     * Connect to WebSocket
     */
    connect(socketUrl: string): Promise<void>;
    /**
     * Disconnect from WebSocket
     */
    disconnect(): void;
    /**
     * Send message to WebSocket
     */
    sendMessage(message: IWebSocketMessage): Promise<void>;
    /**
     * Send command to server console
     */
    sendCommand(command: string): Promise<void>;
    /**
     * Change server power state
     */
    setPowerState(state: ServerPowerState): Promise<void>;
    /**
     * Handle incoming WebSocket message
     */
    private handleMessage;
    /**
     * Handle console output
     */
    private handleConsoleOutput;
    /**
     * Handle server status change
     */
    private handleStatus;
    /**
     * Handle server statistics
     */
    private handleStats;
    /**
     * Handle JWT error
     */
    private handleJwtError;
    /**
     * Handle daemon message
     */
    private handleDaemonMessage;
    /**
     * Reconnect to WebSocket
     */
    private reconnect;
    /**
     * Start ping interval
     */
    private startPingInterval;
    /**
     * Handle error
     */
    private handleError;
    /**
     * Get console buffer
     */
    getConsoleBuffer(): IConsoleMessage[];
    /**
     * Get stats history
     */
    getStatsHistory(): IServerStats[];
    /**
     * Get last stats
     */
    getLastStats(): IServerStats | null;
    /**
     * Clear console buffer
     */
    clearConsoleBuffer(): void;
    /**
     * Event listeners
     */
    onMessage(handler: (msg: IConsoleMessage) => void): void;
    onStatus(handler: (status: string) => void): void;
    onStats(handler: (stats: IServerStats) => void): void;
    onError(handler: (error: Error) => void): void;
    onDisconnect(handler: () => void): void;
    private emitMessage;
    private emitStatus;
    private emitStats;
    private emitError;
    private emitDisconnect;
    /**
     * Check if connected
     */
    isConnectedToSocket(): boolean;
    /**
     * Get server ID
     */
    getServerId(): string;
}
//# sourceMappingURL=WebSocketConsole.d.ts.map