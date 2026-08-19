/**
 * Pterodactyl Bedrock Bridge - Logger Utility
 * Erweiterte Logging-Funktionalität mit verschiedenen Levels
 */
import { world } from '@minecraft/server';
import { LOG_LEVELS, Colors } from '../config/Constants';
export class Logger {
    constructor() {
        this.logsBuffer = [];
        this.maxBufferSize = 1000;
        this.debugMode = false;
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    debug(message, context) {
        this.log(LOG_LEVELS.DEBUG, message, context);
    }
    info(message, context) {
        this.log(LOG_LEVELS.INFO, message, context);
    }
    warn(message, context) {
        this.log(LOG_LEVELS.WARN, message, context);
    }
    error(message, context) {
        this.log(LOG_LEVELS.ERROR, message, context);
    }
    critical(message, context) {
        this.log(LOG_LEVELS.CRITICAL, message, context);
    }
    log(level, message, context) {
        if (level === LOG_LEVELS.DEBUG && !this.debugMode) {
            return;
        }
        const timestamp = new Date().toISOString();
        const color = this.getColorForLevel(level);
        let logMessage = "${color}[${timestamp}] [${level}] ${message}${Colors.RESET}";
        if (context) {
            try {
                logMessage += " " + JSON.stringify(context);
            }
            catch (e) {
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
        }
        catch (error) {
            // If world.sendMessage fails, silently continue
            // This can happen if the world is not yet initialized
        }
    }
    getColorForLevel(level) {
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
    getLogs(count = 100) {
        return this.logsBuffer.slice(-count);
    }
    clearLogs() {
        this.logsBuffer = [];
    }
    getLogCount() {
        return this.logsBuffer.length;
    }
}
export const logger = Logger.getInstance();
//# sourceMappingURL=Logger.js.map