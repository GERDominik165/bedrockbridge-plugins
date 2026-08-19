/**
 * Pterodactyl Bedrock Bridge - WebSocket Console
 * Real-time Server Console mit WebSocket Integration
 */
import { WebSocketEvent } from '../types';
import { WEBSOCKET_CONFIG } from '../config/Constants';
import { logger } from '../utils/Logger';
import { errorHandler } from '../utils/ErrorHandler';
export class WebSocketConsole {
    constructor(serverId, token) {
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS;
        this.messageQueue = [];
        this.consoleBuffer = [];
        this.maxBufferSize = 200;
        this.statsHistory = [];
        this.maxStatsHistory = 50;
        // Event handlers
        this.onMessageHandlers = [];
        this.onStatusHandlers = [];
        this.onStatsHandlers = [];
        this.onErrorHandlers = [];
        this.onDisconnectHandlers = [];
        this.serverId = serverId;
        this.token = token;
    }
    /**
     * Connect to WebSocket
     */
    async connect(socketUrl) {
        try {
            logger.info('Connecting to WebSocket', { serverId: this.serverId });
            // Note: In Bedrock, WebSocket connection might need to be handled differently
            // This is a placeholder for actual implementation
            this.isConnected = true;
            this.reconnectAttempts = 0;
            // Send auth message
            await this.sendMessage({
                event: WebSocketEvent.AUTH,
                args: [this.token]
            });
            // Start ping interval
            this.startPingInterval();
            logger.info('WebSocket connected', { serverId: this.serverId });
            this.emitMessage({
                timestamp: Date.now(),
                content: 'Connected to server console',
                type: 'system'
            });
        }
        catch (error) {
            this.handleError(error);
            this.reconnect(socketUrl);
        }
    }
    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        logger.info('Disconnecting WebSocket', { serverId: this.serverId });
        this.isConnected = false;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        // Close socket if exists
        if (this.socket && typeof this.socket.close === 'function') {
            this.socket.close(1000, 'Manual disconnect');
        }
        this.emitDisconnect();
    }
    /**
     * Send message to WebSocket
     */
    async sendMessage(message) {
        if (!this.isConnected) {
            this.messageQueue.push(message);
            logger.warn('WebSocket not connected, queueing message', { serverId: this.serverId });
            return;
        }
        try {
            const json = JSON.stringify(message);
            // In real implementation, send via socket
            logger.debug('Sent WebSocket message', { event: message.event });
        }
        catch (error) {
            this.handleError(error);
        }
    }
    /**
     * Send command to server console
     */
    async sendCommand(command) {
        logger.info('Sending console command', { serverId: this.serverId, commandLength: command.length });
        await this.sendMessage({
            event: WebSocketEvent.SEND_COMMAND,
            args: [command]
        });
    }
    /**
     * Change server power state
     */
    async setPowerState(state) {
        logger.info('Setting server power state via WebSocket', { serverId: this.serverId, state });
        await this.sendMessage({
            event: WebSocketEvent.SET_STATE,
            args: [state]
        });
    }
    /**
     * Handle incoming WebSocket message
     */
    handleMessage(message) {
        try {
            switch (message.event) {
                case WebSocketEvent.CONSOLE_OUTPUT:
                    this.handleConsoleOutput(message.args[0]);
                    break;
                case WebSocketEvent.STATUS:
                    this.handleStatus(message.args[0]);
                    break;
                case WebSocketEvent.STATS:
                    this.handleStats(message.args[0]);
                    break;
                case WebSocketEvent.JWT_ERROR:
                    this.handleJwtError(message.args[0]);
                    break;
                case WebSocketEvent.DAEMON_MESSAGE:
                    this.handleDaemonMessage(message.args[0]);
                    break;
                default:
                    logger.debug('Unknown WebSocket event', { event: message.event });
            }
        }
        catch (error) {
            this.handleError(error);
        }
    }
    /**
     * Handle console output
     */
    handleConsoleOutput(output) {
        const message = {
            timestamp: Date.now(),
            content: output,
            type: 'output'
        };
        this.consoleBuffer.push(message);
        if (this.consoleBuffer.length > this.maxBufferSize) {
            this.consoleBuffer.shift();
        }
        this.emitMessage(message);
    }
    /**
     * Handle server status change
     */
    handleStatus(status) {
        logger.info('Server status changed', { serverId: this.serverId, status });
        this.emitStatus(status);
        const message = {
            timestamp: Date.now(),
            content: `Server status: ${status}`,
            type: 'system'
        };
        this.consoleBuffer.push(message);
        if (this.consoleBuffer.length > this.maxBufferSize) {
            this.consoleBuffer.shift();
        }
        this.emitMessage(message);
    }
    /**
     * Handle server statistics
     */
    handleStats(statsJson) {
        try {
            const stats = JSON.parse(statsJson);
            const statsData = {
                timestamp: Date.now(),
                state: stats.state,
                cpu: stats.cpu_absolute || 0,
                memory: stats.memory_bytes || 0,
                memoryLimit: stats.memory_limit_bytes || 0,
                disk: stats.disk_bytes || 0,
                networkRx: stats.network?.rx_bytes || 0,
                networkTx: stats.network?.tx_bytes || 0,
                uptime: stats.uptime || 0
            };
            this.statsHistory.push(statsData);
            if (this.statsHistory.length > this.maxStatsHistory) {
                this.statsHistory.shift();
            }
            this.emitStats(statsData);
        }
        catch (error) {
            logger.error('Failed to parse stats', { error: String(error) });
        }
    }
    /**
     * Handle JWT error
     */
    handleJwtError(error) {
        logger.error('JWT error from server', { error });
        const message = {
            timestamp: Date.now(),
            content: `JWT Error: ${error}`,
            type: 'error'
        };
        this.emitMessage(message);
        this.emitError(new Error(error));
        // Attempt to reconnect
        this.isConnected = false;
        this.reconnect();
    }
    /**
     * Handle daemon message
     */
    handleDaemonMessage(message) {
        logger.debug('Daemon message', { message });
        const consoleMsg = {
            timestamp: Date.now(),
            content: message,
            type: 'system'
        };
        this.emitMessage(consoleMsg);
    }
    /**
     * Reconnect to WebSocket
     */
    async reconnect(socketUrl) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached', { serverId: this.serverId });
            this.emitError(new Error('Max reconnection attempts reached'));
            return;
        }
        this.reconnectAttempts++;
        const delay = WEBSOCKET_CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
        logger.warn('Reconnecting WebSocket', {
            serverId: this.serverId,
            attempt: this.reconnectAttempts,
            delay
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        if (socketUrl) {
            await this.connect(socketUrl);
        }
    }
    /**
     * Start ping interval
     */
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({
                    event: 'ping',
                    args: []
                }).catch(error => {
                    logger.error('Ping failed', { error: String(error) });
                });
            }
        }, WEBSOCKET_CONFIG.PING_INTERVAL);
    }
    /**
     * Handle error
     */
    handleError(error) {
        const err = errorHandler.handleError(error);
        logger.error('WebSocket error', { error: err.message });
        this.emitError(err);
    }
    /**
     * Get console buffer
     */
    getConsoleBuffer() {
        return [...this.consoleBuffer];
    }
    /**
     * Get stats history
     */
    getStatsHistory() {
        return [...this.statsHistory];
    }
    /**
     * Get last stats
     */
    getLastStats() {
        return this.statsHistory[this.statsHistory.length - 1] || null;
    }
    /**
     * Clear console buffer
     */
    clearConsoleBuffer() {
        this.consoleBuffer = [];
    }
    /**
     * Event listeners
     */
    onMessage(handler) {
        this.onMessageHandlers.push(handler);
    }
    onStatus(handler) {
        this.onStatusHandlers.push(handler);
    }
    onStats(handler) {
        this.onStatsHandlers.push(handler);
    }
    onError(handler) {
        this.onErrorHandlers.push(handler);
    }
    onDisconnect(handler) {
        this.onDisconnectHandlers.push(handler);
    }
    emitMessage(message) {
        this.onMessageHandlers.forEach(handler => {
            try {
                handler(message);
            }
            catch (error) {
                logger.error('Error in message handler', { error: String(error) });
            }
        });
    }
    emitStatus(status) {
        this.onStatusHandlers.forEach(handler => {
            try {
                handler(status);
            }
            catch (error) {
                logger.error('Error in status handler', { error: String(error) });
            }
        });
    }
    emitStats(stats) {
        this.onStatsHandlers.forEach(handler => {
            try {
                handler(stats);
            }
            catch (error) {
                logger.error('Error in stats handler', { error: String(error) });
            }
        });
    }
    emitError(error) {
        this.onErrorHandlers.forEach(handler => {
            try {
                handler(error);
            }
            catch (err) {
                logger.error('Error in error handler', { error: String(err) });
            }
        });
    }
    emitDisconnect() {
        this.onDisconnectHandlers.forEach(handler => {
            try {
                handler();
            }
            catch (error) {
                logger.error('Error in disconnect handler', { error: String(error) });
            }
        });
    }
    /**
     * Check if connected
     */
    isConnectedToSocket() {
        return this.isConnected;
    }
    /**
     * Get server ID
     */
    getServerId() {
        return this.serverId;
    }
}
//# sourceMappingURL=WebSocketConsole.js.map