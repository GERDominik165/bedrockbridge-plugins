/**
 * Gemini Mob Plugin - Debug Logger Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Comprehensive logging system for debugging and audit trails
 * All operations are logged with timestamps and categories
 */

import { world } from "@minecraft/server";

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Current log level (can be adjusted)
let currentLogLevel = LOG_LEVELS.DEBUG;

// Log storage for in-game access
const logBuffer = [];
const MAX_LOG_ENTRIES = 1000;

// Operation tracking
const activeOperations = new Map();

/**
 * Format log message with timestamp and category
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, category, message) {
    const timestamp = new Date().toISOString();
    const levelEmoji = {
        'DEBUG': '🔍',
        'INFO': 'ℹ️',
        'WARN': '⚠️',
        'ERROR': '❌'
    }[level] || '📝';

    return `[${timestamp}] [GeminiMob/${category}] ${levelEmoji} ${message}`;
}

/**
 * Add log entry to buffer
 * @param {string} level - Log level
 * @param {string} category - Category
 * @param {string} message - Message
 */
function addToBuffer(level, category, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        category: category,
        message: message
    };

    logBuffer.push(logEntry);

    // Keep buffer size manageable
    if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer.shift();
    }
}

/**
 * Log debug message
 * @param {string} category - Log category
 * @param {string} message - Log message
 */
export function debug(category, message) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
        const formatted = formatLogMessage("DEBUG", category, message);
        console.log(formatted);
        addToBuffer("DEBUG", category, message);
    }
}

/**
 * Log info message
 * @param {string} category - Log category
 * @param {string} message - Log message
 */
export function info(category, message) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
        const formatted = formatLogMessage("INFO", category, message);
        console.log(formatted);
        addToBuffer("INFO", category, message);
    }
}

/**
 * Log warning message
 * @param {string} category - Log category
 * @param {string} message - Log message
 */
export function warn(category, message) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
        const formatted = formatLogMessage("WARN", category, message);
        console.warn(formatted);
        addToBuffer("WARN", category, message);
    }
}

/**
 * Log error message
 * @param {string} category - Log category
 * @param {string} message - Log message
 */
export function error(category, message) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
        const formatted = formatLogMessage("ERROR", category, message);
        console.error(formatted);
        addToBuffer("ERROR", category, message);
    }
}

/**
 * Log success message (uses INFO level with special formatting)
 * @param {string} category - Log category
 * @param {string} message - Log message
 */
export function success(category, message) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [GeminiMob/${category}] ✅ ${message}`;
        console.log(formatted);
        addToBuffer("INFO", category, message);
    }
}

/**
 * Start an operation log
 * @param {string} operationName - Name of the operation
 * @returns {string} Operation ID
 */
export function startOperationLog(operationName) {
    const operationID = `${operationName}_${Date.now()}`;
    activeOperations.set(operationID, {
        name: operationName,
        startTime: Date.now(),
        status: "in_progress"
    });
    debug("OPERATION", `[${operationName}] Started`);
    return operationID;
}

/**
 * End an operation log
 * @param {string} operationID - Operation ID from startOperationLog
 * @param {string} status - Final status (success, failure, timeout)
 * @param {object} details - Additional details
 */
export function endOperationLog(operationID, status = "success", details = {}) {
    const operation = activeOperations.get(operationID);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    const message = `[${operation.name}] ${status.toUpperCase()} (${duration}ms)`;

    if (status === "success") {
        success("OPERATION", message);
    } else if (status === "failure") {
        error("OPERATION", message);
    } else {
        warn("OPERATION", message);
    }

    if (Object.keys(details).length > 0) {
        debug("OPERATION", `Details: ${JSON.stringify(details)}`);
    }

    activeOperations.delete(operationID);
}

/**
 * Log a conversation operation
 * @param {string} operation - Operation type
 * @param {string} playerID - Player ID
 * @param {number} messageCount - Message count
 */
export function logConversationOp(operation, playerID, messageCount) {
    debug("CONVERSATION", `[${operation}] Player: ${playerID}, Messages: ${messageCount}`);
}

/**
 * Log a command execution
 * @param {string} playerName - Player name
 * @param {string} command - Command executed
 * @param {string} status - Execution status
 */
export function logCommand(playerName, command, status) {
    info("COMMAND", `${playerName} executed: ${command} [${status}]`);
}

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {string} unit - Time unit
 */
export function logPerformance(operation, duration, unit = "ms") {
    debug("PERFORMANCE", `${operation}: ${duration}${unit}`);
}

/**
 * Get all logs
 * @returns {array} Array of log entries
 */
export function getAllLogs() {
    return logBuffer;
}

/**
 * Get logs by category
 * @param {string} category - Category to filter by
 * @returns {array} Filtered logs
 */
export function getLogsByCategory(category) {
    return logBuffer.filter(log => log.category === category);
}

/**
 * Get logs by level
 * @param {string} level - Level to filter by
 * @returns {array} Filtered logs
 */
export function getLogsByLevel(level) {
    return logBuffer.filter(log => log.level === level);
}

/**
 * Clear all logs
 */
export function clearLogs() {
    logBuffer.length = 0;
    info("LOGGER", "Log buffer cleared");
}

/**
 * Set log level
 * @param {string} level - New log level (DEBUG, INFO, WARN, ERROR)
 */
export function setLogLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
        currentLogLevel = LOG_LEVELS[level];
        info("LOGGER", `Log level set to ${level}`);
    }
}

/**
 * Get current log level
 * @returns {string} Current log level
 */
export function getLogLevel() {
    for (let [level, value] of Object.entries(LOG_LEVELS)) {
        if (value === currentLogLevel) return level;
    }
    return "UNKNOWN";
}
