/**
 * 📝 LANDCLAIM MEGA v4 - Advanced Logger System
 * Complete logging, debugging, and error tracking
 * @version 4.0.0
 */

export class LoggerSystem {
    constructor(database) {
        this.db = database;

        // === LOG LEVELS ===
        this.LEVELS = {
            DEBUG: 0,
            INFO: 1,
            WARNING: 2,
            ERROR: 3,
            CRITICAL: 4
        };

        // === LOG STORAGE ===
        this.logs = [];
        this.errorLogs = [];
        this.commandLogs = [];
        this.eventLogs = [];

        // === CONFIGURATION ===
        this.config = {
            maxLogs: 10000,
            maxErrorLogs: 5000,
            maxCommandLogs: 10000,
            maxEventLogs: 5000,
            minLevel: 0, // DEBUG
            enableConsole: true,
            enableDatabase: true,
            enableFileOutput: false
        };

        // === STATISTICS ===
        this.stats = {
            totalLogs: 0,
            debugCount: 0,
            infoCount: 0,
            warningCount: 0,
            errorCount: 0,
            criticalCount: 0,
            lastLogTime: Date.now()
        };

        this.loadLoggerConfig();
    }

    /**
     * Load logger configuration
     */
    loadLoggerConfig() {
        try {
            const saved = this.db.get("logger:config");
            if (saved) {
                this.config = { ...this.config, ...saved };
            }
        } catch (error) {
            console.warn(`[Logger] Could not load config: ${error}`);
        }
    }

    /**
     * Log message
     */
    log(level, category, message, details = null) {
        try {
            const logEntry = {
                timestamp: Date.now(),
                level: this.getLevelName(level),
                category: category,
                message: message,
                details: details
            };

            // Add to appropriate logs
            this.logs.push(logEntry);
            if (level >= this.LEVELS.ERROR) {
                this.errorLogs.push(logEntry);
            }

            // Update statistics
            this.updateStats(level);

            // Output based on configuration
            if (this.config.enableConsole) {
                this.outputToConsole(logEntry);
            }

            if (this.config.enableDatabase) {
                this.saveToDB(logEntry);
            }

            // Keep size under control
            this.trimLogs();

            return logEntry;
        } catch (error) {
            console.error(`[Logger] Error logging: ${error}`);
        }
    }

    /**
     * Log debug message
     */
    debug(category, message, details = null) {
        return this.log(this.LEVELS.DEBUG, category, message, details);
    }

    /**
     * Log info message
     */
    info(category, message, details = null) {
        return this.log(this.LEVELS.INFO, category, message, details);
    }

    /**
     * Log warning message
     */
    warning(category, message, details = null) {
        return this.log(this.LEVELS.WARNING, category, message, details);
    }

    /**
     * Log error message
     */
    error(category, message, details = null) {
        return this.log(this.LEVELS.ERROR, category, message, details);
    }

    /**
     * Log critical message
     */
    critical(category, message, details = null) {
        return this.log(this.LEVELS.CRITICAL, category, message, details);
    }

    /**
     * Log command execution
     */
    logCommand(player, command, args, result) {
        try {
            const entry = {
                timestamp: Date.now(),
                player: player,
                command: command,
                args: args,
                result: result
            };

            this.commandLogs.push(entry);

            if (this.config.enableDatabase) {
                const logs = this.db.get("logs:commands") || [];
                logs.push(entry);
                if (logs.length > this.config.maxCommandLogs) {
                    logs.shift();
                }
                this.db.set("logs:commands", logs);
            }

            return entry;
        } catch (error) {
            console.error(`[Logger] Error logging command: ${error}`);
        }
    }

    /**
     * Log event
     */
    logEvent(eventName, data) {
        try {
            const entry = {
                timestamp: Date.now(),
                event: eventName,
                data: data
            };

            this.eventLogs.push(entry);

            if (this.config.enableDatabase) {
                const logs = this.db.get("logs:events") || [];
                logs.push(entry);
                if (logs.length > this.config.maxEventLogs) {
                    logs.shift();
                }
                this.db.set("logs:events", logs);
            }

            return entry;
        } catch (error) {
            console.error(`[Logger] Error logging event: ${error}`);
        }
    }

    /**
     * Output to console
     */
    outputToConsole(logEntry) {
        const levelColor = this.getLevelColor(logEntry.level);
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const output = `${levelColor}[${timestamp}] [${logEntry.category}] ${logEntry.message}`;

        if (logEntry.level === "ERROR" || logEntry.level === "CRITICAL") {
            console.error(output);
        } else if (logEntry.level === "WARNING") {
            console.warn(output);
        } else {
            console.log(output);
        }
    }

    /**
     * Save log to database
     */
    saveToDB(logEntry) {
        try {
            let logs = this.db.get("logs:all") || [];
            logs.push(logEntry);

            if (logs.length > this.config.maxLogs) {
                logs.shift();
            }

            this.db.set("logs:all", logs);
        } catch (error) {
            console.warn(`[Logger] Could not save to database: ${error}`);
        }
    }

    /**
     * Get level name
     */
    getLevelName(level) {
        for (const [name, value] of Object.entries(this.LEVELS)) {
            if (value === level) return name;
        }
        return "UNKNOWN";
    }

    /**
     * Get level color
     */
    getLevelColor(level) {
        switch (level) {
            case "DEBUG": return "§7";
            case "INFO": return "§f";
            case "WARNING": return "§e";
            case "ERROR": return "§c";
            case "CRITICAL": return "§4";
            default: return "§f";
        }
    }

    /**
     * Update statistics
     */
    updateStats(level) {
        this.stats.totalLogs++;
        this.stats.lastLogTime = Date.now();

        const levelName = this.getLevelName(level);
        const key = levelName.toLowerCase() + "Count";
        if (this.stats.hasOwnProperty(key)) {
            this.stats[key]++;
        }
    }

    /**
     * Trim logs to configured size
     */
    trimLogs() {
        if (this.logs.length > this.config.maxLogs) {
            this.logs.splice(0, this.logs.length - this.config.maxLogs);
        }
        if (this.errorLogs.length > this.config.maxErrorLogs) {
            this.errorLogs.splice(0, this.errorLogs.length - this.config.maxErrorLogs);
        }
        if (this.commandLogs.length > this.config.maxCommandLogs) {
            this.commandLogs.splice(0, this.commandLogs.length - this.config.maxCommandLogs);
        }
        if (this.eventLogs.length > this.config.maxEventLogs) {
            this.eventLogs.splice(0, this.eventLogs.length - this.config.maxEventLogs);
        }
    }

    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level, limit = 100) {
        return this.logs
            .filter(log => this.LEVELS[log.level] >= level)
            .slice(-limit)
            .reverse();
    }

    /**
     * Get logs by category
     */
    getLogsByCategory(category, limit = 100) {
        return this.logs
            .filter(log => log.category === category)
            .slice(-limit)
            .reverse();
    }

    /**
     * Get error logs
     */
    getErrorLogs(limit = 100) {
        return this.errorLogs.slice(-limit).reverse();
    }

    /**
     * Get command logs
     */
    getCommandLogs(player = null, limit = 100) {
        let logs = this.commandLogs;
        if (player) {
            logs = logs.filter(log => log.player === player);
        }
        return logs.slice(-limit).reverse();
    }

    /**
     * Get event logs
     */
    getEventLogs(eventName = null, limit = 100) {
        let logs = this.eventLogs;
        if (eventName) {
            logs = logs.filter(log => log.event === eventName);
        }
        return logs.slice(-limit).reverse();
    }

    /**
     * Clear all logs
     */
    clearAllLogs() {
        this.logs = [];
        this.errorLogs = [];
        this.commandLogs = [];
        this.eventLogs = [];
        this.db.delete("logs:all");
        this.db.delete("logs:errors");
        this.db.delete("logs:commands");
        this.db.delete("logs:events");
        return true;
    }

    /**
     * Clear old logs
     */
    clearOldLogs(hoursOld = 24) {
        const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);

        this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
        this.errorLogs = this.errorLogs.filter(log => log.timestamp > cutoffTime);
        this.commandLogs = this.commandLogs.filter(log => log.timestamp > cutoffTime);
        this.eventLogs = this.eventLogs.filter(log => log.timestamp > cutoffTime);

        return {
            success: true,
            cleared: true,
            hoursOld: hoursOld
        };
    }

    /**
     * Export logs as JSON
     */
    exportLogs(type = "all") {
        let data = {};

        if (type === "all" || type === "general") {
            data.generalLogs = this.logs;
        }
        if (type === "all" || type === "errors") {
            data.errorLogs = this.errorLogs;
        }
        if (type === "all" || type === "commands") {
            data.commandLogs = this.commandLogs;
        }
        if (type === "all" || type === "events") {
            data.eventLogs = this.eventLogs;
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentLogSize: this.logs.length,
            currentErrorSize: this.errorLogs.length,
            currentCommandSize: this.commandLogs.length,
            currentEventSize: this.eventLogs.length
        };
    }

    /**
     * Generate report
     */
    generateReport() {
        const errors = this.errorLogs.slice(-10).reverse();
        const topCommands = this.getTopCommands();

        return {
            timestamp: Date.now(),
            statistics: this.getStats(),
            recentErrors: errors,
            topCommands: topCommands,
            systemHealth: this.checkSystemHealth()
        };
    }

    /**
     * Get top commands
     */
    getTopCommands(limit = 10) {
        const commandCounts = {};

        for (const log of this.commandLogs) {
            commandCounts[log.command] = (commandCounts[log.command] || 0) + 1;
        }

        return Object.entries(commandCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([command, count]) => ({ command, count }));
    }

    /**
     * Check system health
     */
    checkSystemHealth() {
        const issues = [];

        if (this.stats.errorCount > 100) {
            issues.push("High error rate detected");
        }

        if (this.stats.criticalCount > 0) {
            issues.push("Critical errors detected");
        }

        const recentErrors = this.errorLogs.slice(-100);
        const errorRate = (recentErrors.length / 100) * 100;
        if (errorRate > 50) {
            issues.push(`Error rate: ${errorRate.toFixed(1)}%`);
        }

        return {
            healthy: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Set log level
     */
    setLogLevel(level) {
        if (this.LEVELS.hasOwnProperty(level)) {
            this.config.minLevel = this.LEVELS[level];
            return true;
        }
        return false;
    }

    /**
     * Enable/disable console output
     */
    setConsoleOutput(enabled) {
        this.config.enableConsole = enabled;
        return true;
    }

    /**
     * Enable/disable database logging
     */
    setDatabaseLogging(enabled) {
        this.config.enableDatabase = enabled;
        return true;
    }
}
