/**
 * Pterodactyl Bedrock Bridge - Logger Utility
 * Erweiterte Logging-Funktionalität mit verschiedenen Levels
 */

import { world } from '@minecraft/server';
import { LOG_LEVELS, Colors } from '../config/Constants';

export class Logger {
  private static instance: Logger;
  private logsBuffer: string[] = [];
  private maxBufferSize = 1000;
  private debugMode = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  debug(message: string, context?: any): void {
    this.log(LOG_LEVELS.DEBUG, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LOG_LEVELS.INFO, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LOG_LEVELS.WARN, message, context);
  }

  error(message: string, context?: any): void {
    this.log(LOG_LEVELS.ERROR, message, context);
  }

  critical(message: string, context?: any): void {
    this.log(LOG_LEVELS.CRITICAL, message, context);
  }


  private log(level: string, message: string, context?: any): void {
    if (level === LOG_LEVELS.DEBUG && !this.debugMode) {
      return;
    }

    const timestamp = new Date().toISOString();
    const color = this.getColorForLevel(level);
    let logMessage = "${color}[${timestamp}] [${level}] ${message}${Colors.RESET}";

    if (context) {
      try {
        logMessage += " " + JSON.stringify(context);
      } catch (e) {
        logMessage += " [context serialization failed]";
      }
    }

    // Add to buffer
    this.logsBuffer.push(logMessage);
    if (this.logsBuffer.length > this.maxBufferSize) {
      this.logsBuffer.shift();
    }

    // Send to world chat using world.sendMessage with try-catch
    try {
      world.sendMessage(logMessage);
    } catch (error) {
      // If world.sendMessage fails, silently continue
      // This can happen if the world is not yet initialized
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case LOG_LEVELS.DEBUG:
        return Colors.GRAY;
      case LOG_LEVELS.INFO:
        return Colors.CYAN;
      case LOG_LEVELS.WARN:
        return Colors.YELLOW;
      case LOG_LEVELS.ERROR:
        return Colors.RED;
      case LOG_LEVELS.CRITICAL:
        return Colors.DARK_RED;
      default:
        return Colors.WHITE;
    }
  }

  getLogs(count: number = 100): string[] {
    return this.logsBuffer.slice(-count);
  }

  clearLogs(): void {
    this.logsBuffer = [];
  }

  getLogCount(): number {
    return this.logsBuffer.length;
  }
}

export const logger = Logger.getInstance();
