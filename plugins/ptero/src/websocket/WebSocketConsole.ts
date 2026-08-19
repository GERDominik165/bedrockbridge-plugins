/**
 * Pterodactyl Bedrock Bridge - WebSocket Console
 * Real-time Server Console mit WebSocket Integration
 */

import { beforeEvents } from '@minecraft/server-net';
import { IWebSocketMessage, WebSocketEvent, ServerPowerState } from '../types';
import { WEBSOCKET_CONFIG } from '../config/Constants';
import { logger } from '../utils/Logger';
import { errorHandler } from '../utils/ErrorHandler';

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

export class WebSocketConsole {
  private serverId: string;
  private token: string;
  private socket: any; // WebSocket instance
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS;
  private messageQueue: IWebSocketMessage[] = [];
  private consoleBuffer: IConsoleMessage[] = [];
  private maxBufferSize = 200;
  private statsHistory: IServerStats[] = [];
  private maxStatsHistory = 50;
  private pingInterval: any;

  // Event handlers
  private onMessageHandlers: Array<(msg: IConsoleMessage) => void> = [];
  private onStatusHandlers: Array<(status: string) => void> = [];
  private onStatsHandlers: Array<(stats: IServerStats) => void> = [];
  private onErrorHandlers: Array<(error: Error) => void> = [];
  private onDisconnectHandlers: Array<() => void> = [];

  constructor(serverId: string, token: string) {
    this.serverId = serverId;
    this.token = token;
  }

  /**
   * Connect to WebSocket
   */
  async connect(socketUrl: string): Promise<void> {
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
    } catch (error) {
      this.handleError(error);
      this.reconnect(socketUrl);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
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
  async sendMessage(message: IWebSocketMessage): Promise<void> {
    if (!this.isConnected) {
      this.messageQueue.push(message);
      logger.warn('WebSocket not connected, queueing message', { serverId: this.serverId });
      return;
    }

    try {
      const json = JSON.stringify(message);
      // In real implementation, send via socket
      logger.debug('Sent WebSocket message', { event: message.event });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Send command to server console
   */
  async sendCommand(command: string): Promise<void> {
    logger.info('Sending console command', { serverId: this.serverId, commandLength: command.length });

    await this.sendMessage({
      event: WebSocketEvent.SEND_COMMAND,
      args: [command]
    });
  }

  /**
   * Change server power state
   */
  async setPowerState(state: ServerPowerState): Promise<void> {
    logger.info('Setting server power state via WebSocket', { serverId: this.serverId, state });

    await this.sendMessage({
      event: WebSocketEvent.SET_STATE,
      args: [state]
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: IWebSocketMessage): void {
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
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle console output
   */
  private handleConsoleOutput(output: string): void {
    const message: IConsoleMessage = {
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
  private handleStatus(status: string): void {
    logger.info('Server status changed', { serverId: this.serverId, status });

    this.emitStatus(status);

    const message: IConsoleMessage = {
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
  private handleStats(statsJson: string): void {
    try {
      const stats = JSON.parse(statsJson);

      const statsData: IServerStats = {
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
    } catch (error) {
      logger.error('Failed to parse stats', { error: String(error) });
    }
  }

  /**
   * Handle JWT error
   */
  private handleJwtError(error: string): void {
    logger.error('JWT error from server', { error });

    const message: IConsoleMessage = {
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
  private handleDaemonMessage(message: string): void {
    logger.debug('Daemon message', { message });

    const consoleMsg: IConsoleMessage = {
      timestamp: Date.now(),
      content: message,
      type: 'system'
    };

    this.emitMessage(consoleMsg);
  }

  /**
   * Reconnect to WebSocket
   */
  private async reconnect(socketUrl?: string): Promise<void> {
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
  private startPingInterval(): void {
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
  private handleError(error: any): void {
    const err = errorHandler.handleError(error);
    logger.error('WebSocket error', { error: err.message });
    this.emitError(err);
  }

  /**
   * Get console buffer
   */
  getConsoleBuffer(): IConsoleMessage[] {
    return [...this.consoleBuffer];
  }

  /**
   * Get stats history
   */
  getStatsHistory(): IServerStats[] {
    return [...this.statsHistory];
  }

  /**
   * Get last stats
   */
  getLastStats(): IServerStats | null {
    return this.statsHistory[this.statsHistory.length - 1] || null;
  }

  /**
   * Clear console buffer
   */
  clearConsoleBuffer(): void {
    this.consoleBuffer = [];
  }

  /**
   * Event listeners
   */

  onMessage(handler: (msg: IConsoleMessage) => void): void {
    this.onMessageHandlers.push(handler);
  }

  onStatus(handler: (status: string) => void): void {
    this.onStatusHandlers.push(handler);
  }

  onStats(handler: (stats: IServerStats) => void): void {
    this.onStatsHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.onErrorHandlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.onDisconnectHandlers.push(handler);
  }

  private emitMessage(message: IConsoleMessage): void {
    this.onMessageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('Error in message handler', { error: String(error) });
      }
    });
  }

  private emitStatus(status: string): void {
    this.onStatusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        logger.error('Error in status handler', { error: String(error) });
      }
    });
  }

  private emitStats(stats: IServerStats): void {
    this.onStatsHandlers.forEach(handler => {
      try {
        handler(stats);
      } catch (error) {
        logger.error('Error in stats handler', { error: String(error) });
      }
    });
  }

  private emitError(error: Error): void {
    this.onErrorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        logger.error('Error in error handler', { error: String(err) });
      }
    });
  }

  private emitDisconnect(): void {
    this.onDisconnectHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        logger.error('Error in disconnect handler', { error: String(error) });
      }
    });
  }

  /**
   * Check if connected
   */
  isConnectedToSocket(): boolean {
    return this.isConnected;
  }

  /**
   * Get server ID
   */
  getServerId(): string {
    return this.serverId;
  }
}
