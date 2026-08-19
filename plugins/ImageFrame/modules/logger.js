/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ImageFrame - LOGGER MODULE                                 ║
 * ║           Comprehensive Logging with Levels, Filtering & Export              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Professionelles Logging-System mit:
 * - 6 Log-Level (DEBUG, INFO, WARN, ERROR, CRITICAL, TRACE)
 * - Kontextuelle Informationen (Player, Operation, Timestamp)
 * - Performance-Metriken
 * - Filtering & Searching
 * - Export (JSON, CSV)
 * - Rotation & Cleanup
 *
 * @module logger
 * @version 1.0.0
 */

/**
 * Log-Level Definitionen
 */
const LogLevel = {
  TRACE: { level: 0, name: 'TRACE', icon: '🔍', color: '\x1b[90m' },    // Gray
  DEBUG: { level: 1, name: 'DEBUG', icon: '🐛', color: '\x1b[36m' },   // Cyan
  INFO:  { level: 2, name: 'INFO',  icon: '✓',  color: '\x1b[32m' },   // Green
  WARN:  { level: 3, name: 'WARN',  icon: '⚠',  color: '\x1b[33m' },   // Yellow
  ERROR: { level: 4, name: 'ERROR', icon: '✗',  color: '\x1b[31m' },   // Red
  CRITICAL: { level: 5, name: 'CRITICAL', icon: '🔴', color: '\x1b[35m' } // Magenta
};

/**
 * Logger Class
 */
class Logger {
  constructor(options = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      maxLogSize: 10000,
      enableMetrics: true,
      enableColors: true,
      format: 'json', // 'json' oder 'text'
      ...options
    };

    this._logs = [];
    this._metrics = new Map();
    this._timers = new Map();
    this._operationStack = [];
  }

  /**
   * Log-Funktionen
   */
  trace(message, context = {}) {
    return this._log(LogLevel.TRACE, message, context);
  }

  debug(message, context = {}) {
    return this._log(LogLevel.DEBUG, message, context);
  }

  info(message, context = {}) {
    return this._log(LogLevel.INFO, message, context);
  }

  warn(message, context = {}) {
    return this._log(LogLevel.WARN, message, context);
  }

  error(message, context = {}) {
    return this._log(LogLevel.ERROR, message, context);
  }

  critical(message, context = {}) {
    return this._log(LogLevel.CRITICAL, message, context);
  }

  /**
   * INTERNAL: Haupt-Logging-Funktion
   */
  _log(level, message, context = {}) {
    // Prüfe Log-Level
    if (level.level < this.config.level.level) {
      return;
    }

    // Baue Log-Eintrag
    const logEntry = {
      timestamp: Date.now(),
      level: level.name,
      message,
      context: {
        player: context.player || null,
        operation: this._operationStack[this._operationStack.length - 1] || null,
        ...context
      },
      id: this._generateId()
    };

    // Speichere
    this._logs.push(logEntry);

    // Limit
    if (this._logs.length > this.config.maxLogSize) {
      this._logs = this._logs.slice(-this.config.maxLogSize);
    }

    // Console-Output
    if (this.config.enableConsole) {
      this._printToConsole(logEntry, level);
    }

    return logEntry;
  }

  /**
   * Print zu Console
   */
  _printToConsole(entry, level) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const reset = '\x1b[0m';
    const color = this.config.enableColors ? level.color : '';

    const parts = [
      `[${timestamp}]`,
      `${level.icon}`,
      `[${level.name}]`,
      entry.message
    ];

    if (Object.keys(entry.context).length > 0) {
      const ctx = Object.entries(entry.context)
        .filter(([k, v]) => v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');

      if (ctx) parts.push(`| ${ctx}`);
    }

    console.log(`${color}${parts.join(' ')}${reset}`);
  }

  /**
   * OPERATION TRACKING
   */
  startOperation(operationName) {
    this._operationStack.push(operationName);
    const timer = `op_${operationName}_${Date.now()}`;

    this._timers.set(timer, Date.now());

    this.debug(`Operation started: ${operationName}`, {
      operation: operationName
    });

    return timer;
  }

  endOperation(timerKey, success = true) {
    const startTime = this._timers.get(timerKey);

    if (!startTime) {
      this.warn(`Timer not found: ${timerKey}`);
      return null;
    }

    const duration = Date.now() - startTime;
    this._timers.delete(timerKey);

    const operationName = this._operationStack.pop();

    this.debug(`Operation ended: ${operationName} (${duration}ms, success=${success})`, {
      operation: operationName,
      duration,
      success
    });

    // Track Metric
    if (this.config.enableMetrics) {
      this._recordMetric(operationName, duration);
    }

    return { duration, success };
  }

  /**
   * METRICS TRACKING
   */
  _recordMetric(name, value) {
    if (!this._metrics.has(name)) {
      this._metrics.set(name, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: []
      });
    }

    const metric = this._metrics.get(name);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.values.push(value);

    // Keep only last 1000 values
    if (metric.values.length > 1000) {
      metric.values = metric.values.slice(-1000);
    }
  }

  /**
   * Hole Metriken
   */
  getMetrics(operationName = null) {
    if (operationName) {
      const metric = this._metrics.get(operationName);

      if (!metric) return null;

      return {
        operation: operationName,
        count: metric.count,
        average: (metric.sum / metric.count).toFixed(2),
        min: metric.min,
        max: metric.max,
        p95: this._percentile(metric.values, 0.95),
        p99: this._percentile(metric.values, 0.99)
      };
    }

    // Alle Metriken
    const result = {};

    for (const [name, metric] of this._metrics) {
      result[name] = {
        count: metric.count,
        average: (metric.sum / metric.count).toFixed(2),
        min: metric.min,
        max: metric.max
      };
    }

    return result;
  }

  /**
   * Calculate Percentile
   */
  _percentile(values, p) {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * SEARCHING & FILTERING
   */
  search(query, options = {}) {
    const {
      level = null,
      player = null,
      operation = null,
      startTime = null,
      endTime = null,
      limit = 100
    } = options;

    let results = this._logs;

    // Filter by level
    if (level) {
      results = results.filter(log => log.level === level);
    }

    // Filter by player
    if (player) {
      results = results.filter(log => log.context.player === player);
    }

    // Filter by operation
    if (operation) {
      results = results.filter(log => log.context.operation === operation);
    }

    // Filter by time range
    if (startTime) {
      results = results.filter(log => log.timestamp >= startTime);
    }

    if (endTime) {
      results = results.filter(log => log.timestamp <= endTime);
    }

    // Text search
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(log =>
        log.message.toLowerCase().includes(q)
      );
    }

    // Limit
    return results.slice(-limit);
  }

  /**
   * EXPORT
   */
  exportAsJson(options = {}) {
    const logs = this._filterLogs(options);

    return {
      format: 'json',
      exported: new Date().toISOString(),
      count: logs.length,
      logs
    };
  }

  exportAsCsv(options = {}) {
    const logs = this._filterLogs(options);

    const header = ['Timestamp', 'Level', 'Message', 'Player', 'Operation'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.message,
      log.context.player || '',
      log.context.operation || ''
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Helper: Filter Logs
   */
  _filterLogs(options = {}) {
    const { limit = -1, level = null, player = null } = options;

    let logs = this._logs;

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (player) {
      logs = logs.filter(log => log.context.player === player);
    }

    if (limit > 0) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * STATISTICS
   */
  getStatistics() {
    const stats = {
      totalLogs: this._logs.length,
      byLevel: {},
      byPlayer: {},
      oldestLog: this._logs[0]?.timestamp,
      newestLog: this._logs[this._logs.length - 1]?.timestamp
    };

    for (const log of this._logs) {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      if (log.context.player) {
        stats.byPlayer[log.context.player] = (stats.byPlayer[log.context.player] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * UTILITIES
   */
  _generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Clear Logs
   */
  clear() {
    this._logs = [];
    this._metrics.clear();
    this._timers.clear();
  }

  /**
   * Get Recent Logs
   */
  getRecent(count = 50) {
    return this._logs.slice(-count);
  }
}

// Default Logger Instance
const defaultLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableMetrics: true
});

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Logger,
    LogLevel,
    defaultLogger
  };
}
