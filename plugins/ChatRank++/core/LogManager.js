/**
 * LogManager - Comprehensive logging system
 */

class LogManager {
    constructor() {
        this.logs = [];
        this.maxLogs = 10000;
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };
        this.currentLevel = this.logLevels.INFO;
    }

    log(level, category, message, data = {}) {
        if (this.logLevels[level] < this.currentLevel) return;

        const entry = {
            timestamp: Date.now(),
            level,
            category,
            message,
            data
        };

        this.logs.push(entry);

        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output
        const prefix = `[${level}][${category}]`;
        console.log(`${prefix} ${message}`, data);
    }

    debug(category, message, data) { this.log('DEBUG', category, message, data); }
    info(category, message, data) { this.log('INFO', category, message, data); }
    warn(category, message, data) { this.log('WARN', category, message, data); }
    error(category, message, data) { this.log('ERROR', category, message, data); }
    critical(category, message, data) { this.log('CRITICAL', category, message, data); }

    getLogs(filter = {}) {
        let filtered = this.logs;

        if (filter.level) {
            filtered = filtered.filter(log => log.level === filter.level);
        }
        if (filter.category) {
            filtered = filtered.filter(log => log.category === filter.category);
        }
        if (filter.since) {
            filtered = filtered.filter(log => log.timestamp >= filter.since);
        }

        return filtered;
    }

    clearLogs() {
        this.logs = [];
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    saveToDatabase(db) {
        db.set('logManager', JSON.stringify(this.logs.slice(-1000))); // Save last 1000 logs
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('logManager') || '[]');
            this.logs = data;
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = LogManager;
