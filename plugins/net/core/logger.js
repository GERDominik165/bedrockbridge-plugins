/**
 * Multi-level logging system with history tracking
 * Supports error, warn, info, debug, and trace levels
 */

export class Logger {
    constructor(options = {}) {
        this.name = options.name || 'ServerNet';
        this.level = options.level || 'info';
        this.logToConsole = options.logToConsole !== false;
        this.maxHistory = options.maxHistory || 1000;

        // Log level hierarchy
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };

        this.history = [];
        this.stats = {
            error: 0,
            warn: 0,
            info: 0,
            debug: 0,
            trace: 0
        };
    }

    /**
     * Format timestamp as ISO string with milliseconds
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format log message with colors for console
     */
    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        const prefix = `[${timestamp}] [${this.name}:${level.toUpperCase()}]`;
        const msg = data ? `${message} ${JSON.stringify(data)}` : message;
        return `${prefix} ${msg}`;
    }

    /**
     * Add message to history
     */
    addToHistory(level, message, data) {
        const entry = {
            timestamp: this.getTimestamp(),
            level,
            message,
            data: data || null
        };

        this.history.push(entry);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Core logging method
     */
    log(level, message, data = null) {
        if (!this.isLevelEnabled(level)) return;

        this.stats[level]++;
        const formatted = this.formatMessage(level, message, data);

        if (this.logToConsole) {
            console.log(formatted);
        }

        this.addToHistory(level, message, data);
    }

    /**
     * Check if log level is enabled
     */
    isLevelEnabled(level) {
        return this.levels[level] !== undefined &&
               this.levels[level] <= this.levels[this.level];
    }

    /**
     * Log error level
     */
    error(message, error = null) {
        this.log('error', message, error ? { message: error.message, stack: error.stack } : null);
    }

    /**
     * Log warning level
     */
    warn(message, data = null) {
        this.log('warn', message, data);
    }

    /**
     * Log info level
     */
    info(message, data = null) {
        this.log('info', message, data);
    }

    /**
     * Log debug level
     */
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    /**
     * Log trace level (most verbose)
     */
    trace(message, data = null) {
        this.log('trace', message, data);
    }

    /**
     * Get log statistics
     */
    getStats() {
        return {
            ...this.stats,
            totalLogs: Object.values(this.stats).reduce((a, b) => a + b, 0),
            historySize: this.history.length
        };
    }

    /**
     * Get recent logs
     */
    getHistory(count = 50, level = null) {
        let logs = this.history;
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        return logs.slice(-count);
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Reset statistics
     */
    resetStats() {
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.level = level;
            this.info(`Log level changed to ${level}`);
        }
    }
}

export default Logger;
