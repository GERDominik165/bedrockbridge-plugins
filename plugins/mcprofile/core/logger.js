/**
 * Logger System
 * @version 2.0.0
 *
 * Comprehensive logging system with multiple levels and output methods
 */

class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.levels = {
            'error': 0,
            'warn': 1,
            'info': 2,
            'debug': 3,
            'trace': 4
        };
        this.logHistory = [];
        this.maxHistory = options.maxHistory || 1000;
        this.prefix = options.prefix || '[MCProfile]';
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile || false;
        this.fileWriter = options.fileWriter || null;
    }

    /**
     * Log error message
     */
    error(message, error = null) {
        this.log('error', message, error);
    }

    /**
     * Log warning message
     */
    warn(message) {
        this.log('warn', message);
    }

    /**
     * Log info message
     */
    info(message) {
        this.log('info', message);
    }

    /**
     * Log debug message
     */
    debug(message) {
        this.log('debug', message);
    }

    /**
     * Log trace message
     */
    trace(message) {
        this.log('trace', message);
    }

    /**
     * Main logging method
     */
    log(levelName, message, error = null) {
        const levelValue = this.levels[levelName] || this.levels.info;
        const currentLevelValue = this.levels[this.level] || this.levels.info;

        if (levelValue > currentLevelValue) {
            return; // Log level filtering
        }

        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            level: levelName,
            message,
            error: error ? error.stack || error.message : null
        };

        // Add to history
        this.addToHistory(logEntry);

        // Format message
        const formattedMessage = this.formatMessage(logEntry);

        // Output to console
        if (this.enableConsole) {
            this.outputToConsole(levelName, formattedMessage);
        }

        // Output to file
        if (this.enableFile && this.fileWriter) {
            this.fileWriter(formattedMessage);
        }
    }

    /**
     * Format log message
     */
    formatMessage(logEntry) {
        const { timestamp, level, message, error } = logEntry;
        let formatted = `${timestamp} [${level.toUpperCase()}] ${this.prefix} ${message}`;

        if (error) {
            formatted += `\n${error}`;
        }

        return formatted;
    }

    /**
     * Get current timestamp
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString();
    }

    /**
     * Output to console
     */
    outputToConsole(level, message) {
        try {
            switch (level) {
                case 'error':
                    console.error(message);
                    break;
                case 'warn':
                    console.warn(message);
                    break;
                case 'debug':
                case 'trace':
                    console.log(`[DEBUG] ${message}`);
                    break;
                default:
                    console.log(message);
            }
        } catch (error) {
            // Fallback if console fails
        }
    }

    /**
     * Add entry to history
     */
    addToHistory(logEntry) {
        this.logHistory.push(logEntry);

        // Limit history size
        if (this.logHistory.length > this.maxHistory) {
            this.logHistory.shift();
        }
    }

    /**
     * Get log history
     */
    getHistory(filter = {}) {
        let history = this.logHistory;

        if (filter.level) {
            history = history.filter(e => e.level === filter.level);
        }

        if (filter.limit) {
            history = history.slice(-filter.limit);
        }

        return history;
    }

    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
    }

    /**
     * Get log stats
     */
    getStats() {
        const stats = {
            total: this.logHistory.length,
            byLevel: {}
        };

        for (const level of Object.keys(this.levels)) {
            stats.byLevel[level] = this.logHistory.filter(e => e.level === level).length;
        }

        return stats;
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (level in this.levels) {
            this.level = level;
        }
    }

    /**
     * Get current log level
     */
    getLevel() {
        return this.level;
    }

    /**
     * Format history as string
     */
    formatHistory(limit = 50) {
        const recent = this.logHistory.slice(-limit);
        return recent.map(entry => this.formatMessage(entry)).join('\n');
    }

    /**
     * Export logs
     */
    exportLogs() {
        return {
            timestamp: this.getTimestamp(),
            level: this.level,
            stats: this.getStats(),
            logs: this.logHistory
        };
    }
}

export default Logger;
