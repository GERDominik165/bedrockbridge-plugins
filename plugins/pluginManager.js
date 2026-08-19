/**
 * BedrockBridge Plugin Manager
 * @version 4.0.0
 * 
 * A comprehensive, robust plugin management system for BedrockBridge
 * with advanced performance metrics, dependency management, and UI.
 * 
 * Features:
 * - Advanced performance monitoring and analysis
 * - Plugin dependency management and prioritized loading
 * - Comprehensive UI with detailed statistics
 * - Plugin tagging and filtering
 * - Memory usage tracking
 * - Auto-disable for problematic plugins
 * - Detailed error handling and reporting
 */

import { bridge, database } from "../addons";
import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

// ==================== CONFIGURATION ====================
const CONFIG = {
    // Version information
    version: "4.0.0",
    compatibilityVersion: "1.0.0",
    
    // Minecraft items that can trigger the plugin manager UI
    triggerItems: ["minecraft:ender_eye", "minecraft:compass", "minecraft:clock"],
    
    // Admin tag required to use the plugin manager
    adminTag: "admin",
    
    // Time in ticks for UI transitions
    uiTransitionDelay: 5,
    
    // Database table names
    dbTables: {
        plugins: "pluginManager",
        stats: "pluginStats",
        performance: "pluginPerformance",
        events: "pluginEvents",
        config: "pluginManagerConfig"
    },
    
    // Priority plugins that should be loaded first
    priorityPlugins: ["./TPS", "./basicCustomCommands"],
    
    // Plugins that should be loaded last (typically plugins with dependencies)
    lateLoadPlugins: ["./chatRank/main"],
    
    // Maximum number of events to keep in history per plugin
    maxEventsPerPlugin: 50,
    
    // Performance monitoring interval in ticks (20 ticks = 1 second)
    performanceMonitorInterval: 1200, // 1 minute
    
    // Performance history length (number of samples to keep)
    performanceHistoryLength: 60, // 60 minutes of history
    
    // Debug mode (verbose logging)
    debugMode: true,
    
    // Default plugin description
    defaultDescription: "No description provided",
    
    // Default plugin tags
    defaultTags: ["plugin"],
    
    // Default plugin priority (1-10, higher is more important)
    defaultPriority: 5,
    
    // Category definitions for plugin organization
    categories: [
        { id: "system", name: "System Utilities", icon: "textures/ui/dev_glyph_color" },
        { id: "chat", name: "Chat & Communication", icon: "textures/ui/message" },
        { id: "gameplay", name: "Gameplay", icon: "textures/ui/gamepad" },
        { id: "player", name: "Player Features", icon: "textures/ui/icon_steve" },
        { id: "world", name: "World Management", icon: "textures/ui/world_glyph_color" },
        { id: "moderation", name: "Moderation", icon: "textures/ui/permissions_op_crown" },
        { id: "utility", name: "Utilities", icon: "textures/ui/tool_shears" }
    ]
};

// ==================== DATABASE INITIALIZATION ====================

// Create database tables
const pluginsDB = database.makeTable(CONFIG.dbTables.plugins);     // Plugin settings and metadata
const statsDB = database.makeTable(CONFIG.dbTables.stats);         // Plugin usage statistics
const perfDB = database.makeTable(CONFIG.dbTables.performance);    // Performance metrics
const eventsDB = database.makeTable(CONFIG.dbTables.events);       // Plugin events history
const configDB = database.makeTable(CONFIG.dbTables.config);       // Plugin manager configuration

// Initialize plugin list if not exists
if (!pluginsDB.has("plugins")) {
    // Default plugins from index.js
    pluginsDB.set("plugins", [
        { path: "./TPS",                          enabled: true,  description: "Server TPS monitoring", priority: 10, tags: ["system", "monitoring"], category: "system" },
        { path: "./afk",                          enabled: false, description: "AFK player handling", priority: 5, tags: ["player"], category: "player" },
        { path: "./basicCustomCommands",          enabled: true,  description: "Basic custom commands", priority: 8, tags: ["commands"], category: "utility" },
        { path: "./basicNicerChat",               enabled: true,  description: "Improves chat appearance", priority: 6, tags: ["chat"], category: "chat" },
        { path: "./basicNoPings",                 enabled: false, description: "Disables @ notifications", priority: 3, tags: ["chat"], category: "chat" },
        { path: "./basicWarps/main",              enabled: false, description: "Teleport system", priority: 5, tags: ["teleport"], category: "world" },
        { path: "./bedrockForever",               enabled: false, description: "Server uptime improvements", priority: 9, tags: ["system"], category: "system" },
        { path: "./chatRank/main",                enabled: false, description: "Chat ranking system", priority: 6, tags: ["chat", "rank"], category: "chat" },
        { path: "./customCommandCompatibility",   enabled: false, description: "Command compatibility", priority: 7, tags: ["commands"], category: "utility" },
        { path: "./deathCounter",                 enabled: true,  description: "Counts player deaths", priority: 4, tags: ["player", "stats"], category: "player" },
        { path: "./deviceBan",                    enabled: false, description: "Device banning system", priority: 7, tags: ["moderation"], category: "moderation" },
        { path: "./discordChatColors",            enabled: false, description: "Discord chat coloring", priority: 5, tags: ["discord", "chat"], category: "chat" },
        { path: "./gameModes",                    enabled: true,  description: "Gamemode management", priority: 6, tags: ["gameplay"], category: "gameplay" },
        { path: "./getAwayWithMurder",            enabled: false, description: "PvP modifications", priority: 4, tags: ["gameplay", "pvp"], category: "gameplay" },
        { path: "./idcAbtAnimals",                enabled: false, description: "Disables animal AI", priority: 3, tags: ["mobs", "performance"], category: "gameplay" },
        { path: "./justJoins",                    enabled: false, description: "Join notifications", priority: 4, tags: ["player", "notification"], category: "player" },
        { path: "./playtime",                     enabled: true,  description: "Tracks player playtime", priority: 5, tags: ["player", "stats"], category: "player" },
        { path: "./simpleCommandLog",             enabled: false, description: "Logs command usage", priority: 6, tags: ["logging"], category: "utility" },
        { path: "./stepCounter",                  enabled: true,  description: "Counts player steps", priority: 4, tags: ["player", "stats"], category: "player" },
        { path: "./deathCoordinates",             enabled: true,  description: "Shows death coordinates", priority: 5, tags: ["player", "utility"], category: "player" }
    ]);
}

// Initialize plugin metadata if not exists
if (!pluginsDB.has("metadata")) {
    pluginsDB.set("metadata", {
        lastUpdate: Date.now(),
        totalPlugins: 20,
        enabledCount: 10,
        version: CONFIG.version,
        instanceId: generateInstanceId(),
        startTime: Date.now()
    });
}

// Initialize manager configuration
if (!configDB.has("settings")) {
    configDB.set("settings", {
        autoReloadPlugins: false,
        notifyPluginChanges: true,
        debugMode: CONFIG.debugMode,
        maxPlugins: 50,
        adminOnly: true,
        performanceMonitoring: true,
        autoDisableProblematicPlugins: false,
        problematicThresholdMs: 500, // ms threshold to consider a plugin problematic
        showAdvancedMetrics: true,
        memoryTracking: true,
        uiTheme: "default", // future support for UI themes
        errorThreshold: 5, // number of consecutive errors before warning
        backupEnabled: true, // automatic backup of plugin configuration
        backupInterval: 24 * 60 * 60 * 20, // ticks (24 hours)
        enableExperimental: false,
        categorySorting: true, // sort plugins by category
        minimumTpsThreshold: 10 // minimum TPS before warnings
    });
}

// Initialize performance baseline if not exists
if (!perfDB.has("baseline")) {
    perfDB.set("baseline", {
        averageTickTime: 0,
        medianTickTime: 0,
        peakTickTime: 0,
        totalSamples: 0,
        lastUpdated: Date.now()
    });
}

// ==================== SYSTEM VARIABLES ====================

// Map to track loaded plugins
const loadedPlugins = new Map();
// Map to track plugin load times
const pluginLoadTimes = new Map();
// Map to track plugin errors
const pluginErrors = new Map();
// Map to track plugin performance
const pluginPerformance = new Map();
// Map to track function execution times
const functionTimes = new Map();
// Map to track recurring tasks per plugin
const pluginTasks = new Map();
// Map to track dependencies between plugins
const pluginDependencies = new Map();
// Map for real-time performance monitoring
const activePerformanceMonitoring = new Map();
// Last known plugin stats summary
let lastPerformanceSummary = null;
// Performance monitoring interval ID
let performanceMonitorId = null;

// ==================== UTILITY FUNCTIONS ====================

// Generate a unique instance ID
function generateInstanceId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

// Get the current plugin list from database
function getPlugins() {
    return pluginsDB.has("plugins") ? pluginsDB.get("plugins") : [];
}

// Get plugin manager configuration
function getConfig() {
    return configDB.has("settings") ? configDB.get("settings") : {
        autoReloadPlugins: false,
        notifyPluginChanges: true,
        debugMode: CONFIG.debugMode,
        maxPlugins: 50,
        adminOnly: true,
        performanceMonitoring: true,
        autoDisableProblematicPlugins: false,
        problematicThresholdMs: 500,
        showAdvancedMetrics: true,
        memoryTracking: true,
        uiTheme: "default",
        errorThreshold: 5,
        backupEnabled: true,
        backupInterval: 24 * 60 * 60 * 20,
        enableExperimental: false,
        categorySorting: true,
        minimumTpsThreshold: 10
    };
}

// Update plugin metadata
function updateMetadata() {
    const plugins = getPlugins();
    const enabledCount = plugins.filter(p => p.enabled).length;
    const metadata = pluginsDB.get("metadata") || {};
    
    pluginsDB.set("metadata", {
        ...metadata,
        lastUpdate: Date.now(),
        totalPlugins: plugins.length,
        enabledCount: enabledCount,
        version: CONFIG.version
    });
}

// Extract plugin name from path
function getPluginName(path) {
    // Remove leading "./" if present
    const cleanPath = path.startsWith("./") ? path.substring(2) : path;
    
    // Handle paths with directories
    if (cleanPath.includes("/")) {
        const parts = cleanPath.split("/");
        // If ends with "main", use the directory name
        return parts[parts.length - 1] === "main" ? parts[parts.length - 2] : parts[parts.length - 1];
    }
    
    return cleanPath;
}

// Get a formatted timestamp
function getFormattedTime(timestamp = Date.now()) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

// Record plugin event
function recordPluginEvent(pluginPath, event, data = {}) {
    // Get existing events for this plugin
    if (!eventsDB.has(pluginPath)) {
        eventsDB.set(pluginPath, []);
    }
    
    const events = eventsDB.get(pluginPath);
    events.push({
        timestamp: Date.now(),
        event: event,
        data: data
    });
    
    // Keep only latest events (limited by CONFIG.maxEventsPerPlugin)
    if (events.length > CONFIG.maxEventsPerPlugin) {
        events.splice(0, events.length - CONFIG.maxEventsPerPlugin);
    }
    
    eventsDB.set(pluginPath, events);
    
    // Also update stats
    if (!statsDB.has(pluginPath)) {
        statsDB.set(pluginPath, {
            loadCount: 0,
            errorCount: 0,
            lastLoaded: null,
            totalExecutionTime: 0,
            peakExecutionTime: 0,
            lastExecutionTime: 0
        });
    }
    
    const stats = statsDB.get(pluginPath);
    
    // Update relevant stats based on event
    switch (event) {
        case "loaded":
            stats.loadCount++;
            stats.lastLoaded = Date.now();
            break;
        case "error":
            stats.errorCount++;
            break;
        case "execution_completed":
            if (data.executionTime) {
                stats.totalExecutionTime += data.executionTime;
                stats.lastExecutionTime = data.executionTime;
                if (data.executionTime > stats.peakExecutionTime) {
                    stats.peakExecutionTime = data.executionTime;
                }
            }
            break;
    }
    
    statsDB.set(pluginPath, stats);
    
    // Debug logging if enabled
    if (getConfig().debugMode) {
        console.log(`[PluginManager] Event for ${getPluginName(pluginPath)}: ${event}`, data);
    }
}

// Record performance metric for a plugin
function recordPerformanceMetric(pluginPath, metric, value) {
    // Initialize performance tracking for this plugin if needed
    if (!perfDB.has(pluginPath)) {
        perfDB.set(pluginPath, {
            history: [],
            averageExecutionTime: 0,
            medianExecutionTime: 0,
            peakExecutionTime: 0,
            totalExecutions: 0,
            memoryUsage: 0,
            lastUpdated: Date.now()
        });
    }
    
    const perfData = perfDB.get(pluginPath);
    
    // Add to history
    perfData.history.push({
        timestamp: Date.now(),
        metric: metric,
        value: value
    });
    
    // Limit history length
    if (perfData.history.length > CONFIG.performanceHistoryLength) {
        perfData.history.shift();
    }
    
    // Update summary statistics
    if (metric === "executionTime") {
        perfData.totalExecutions++;
        
        // Update average execution time
        const totalTime = perfData.averageExecutionTime * (perfData.totalExecutions - 1) + value;
        perfData.averageExecutionTime = totalTime / perfData.totalExecutions;
        
        // Update peak execution time
        if (value > perfData.peakExecutionTime) {
            perfData.peakExecutionTime = value;
        }
        
        // Calculate median execution time
        const executionTimes = perfData.history
            .filter(item => item.metric === "executionTime")
            .map(item => item.value)
            .sort((a, b) => a - b);
            
        const middle = Math.floor(executionTimes.length / 2);
        
        if (executionTimes.length % 2 === 0) {
            perfData.medianExecutionTime = (executionTimes[middle - 1] + executionTimes[middle]) / 2;
        } else {
            perfData.medianExecutionTime = executionTimes[middle];
        }
    } else if (metric === "memoryUsage" && getConfig().memoryTracking) {
        perfData.memoryUsage = value;
    }
    
    perfData.lastUpdated = Date.now();
    perfDB.set(pluginPath, perfData);
    
    // Update in-memory tracking
    pluginPerformance.set(pluginPath, {
        ...perfData,
        lastValue: value
    });
    
    // Check if this plugin is problematic
    const config = getConfig();
    if (config.autoDisableProblematicPlugins && 
        metric === "executionTime" && 
        value > config.problematicThresholdMs && 
        perfData.averageExecutionTime > config.problematicThresholdMs / 2) {
        
        // Log warning
        console.warn(`[PluginManager] Performance Warning: Plugin ${getPluginName(pluginPath)} took ${value}ms to execute, which exceeds the threshold of ${config.problematicThresholdMs}ms.`);
        
        // Record warning event
        recordPluginEvent(pluginPath, "performance_warning", {
            executionTime: value,
            threshold: config.problematicThresholdMs,
            averageTime: perfData.averageExecutionTime
        });
        
        // Consider auto-disabling if multiple consecutive high execution times
        const recentExecutions = perfData.history
            .filter(item => item.metric === "executionTime" && Date.now() - item.timestamp < 300000) // last 5 minutes
            .map(item => item.value);
            
        const highPerformanceImpactCount = recentExecutions.filter(time => time > config.problematicThresholdMs).length;
        
        if (highPerformanceImpactCount >= 5) {
            // This plugin consistently causes performance issues
            // Notify admins and consider auto-disabling
            broadcastToAdmins(`§c[Plugin Manager] Warning: Plugin ${getPluginName(pluginPath)} is causing consistent performance issues (${highPerformanceImpactCount} occurrences). Consider disabling it.`);
            
            // If auto-disable is enabled, disable the plugin
            if (config.autoDisableProblematicPlugins) {
                const plugins = getPlugins();
                const pluginIndex = plugins.findIndex(p => p.path === pluginPath);
                
                if (pluginIndex !== -1 && plugins[pluginIndex].enabled) {
                    plugins[pluginIndex].enabled = false;
                    pluginsDB.set("plugins", plugins);
                    updateMetadata();
                    
                    recordPluginEvent(pluginPath, "auto_disabled", {
                        reason: "performance",
                        executionTime: value,
                        averageTime: perfData.averageExecutionTime,
                        highImpactCount: highPerformanceImpactCount
                    });
                    
                    broadcastToAdmins(`§c[Plugin Manager] Plugin ${getPluginName(pluginPath)} has been automatically disabled due to consistent performance issues.`);
                }
            }
        }
    }
}

// Calculate system-wide performance metrics
function calculatePerformanceMetrics() {
    // Get all enabled plugins
    const enabledPlugins = getPlugins().filter(p => p.enabled);
    
    if (enabledPlugins.length === 0) {
        return {
            timestamp: Date.now(),
            tps: 20, // Assume perfect TPS if no plugins
            totalPlugins: 0,
            averageExecutionTime: 0,
            highestExecutionTime: 0,
            highestPlugin: null,
            lowestExecutionTime: 0,
            lowestPlugin: null,
            totalExecutionTime: 0,
            memoryUsage: 0
        };
    }
    
    // Calculate metrics
    let totalExecTime = 0;
    let highestExecTime = 0;
    let highestPlugin = null;
    let lowestExecTime = Infinity;
    let lowestPlugin = null;
    let totalMemory = 0;
    
    enabledPlugins.forEach(plugin => {
        const perf = pluginPerformance.get(plugin.path);
        
        if (perf) {
            totalExecTime += perf.averageExecutionTime || 0;
            
            if (perf.averageExecutionTime > highestExecTime) {
                highestExecTime = perf.averageExecutionTime;
                highestPlugin = plugin.path;
            }
            
            if (perf.averageExecutionTime < lowestExecTime && perf.averageExecutionTime > 0) {
                lowestExecTime = perf.averageExecutionTime;
                lowestPlugin = plugin.path;
            }
            
            totalMemory += perf.memoryUsage || 0;
        }
    });
    
    // If we didn't find a lowest plugin (all were 0), reset to 0
    if (lowestExecTime === Infinity) {
        lowestExecTime = 0;
        lowestPlugin = null;
    }
    
    // Estimate TPS impact (very rough approximation)
    // Assume each 50ms of total plugin execution time reduces TPS by 1
    const tpsEstimate = Math.max(1, 20 - (totalExecTime / 50));
    
    const metrics = {
        timestamp: Date.now(),
        tps: tpsEstimate,
        totalPlugins: enabledPlugins.length,
        averageExecutionTime: totalExecTime / enabledPlugins.length,
        highestExecutionTime: highestExecTime,
        highestPlugin: highestPlugin ? getPluginName(highestPlugin) : null,
        lowestExecutionTime: lowestExecTime,
        lowestPlugin: lowestPlugin ? getPluginName(lowestPlugin) : null,
        totalExecutionTime: totalExecTime,
        memoryUsage: totalMemory
    };
    
    // Save the summary
    lastPerformanceSummary = metrics;
    
    // Store in database for historical tracking
    const history = perfDB.has("summary_history") ? perfDB.get("summary_history") : [];
    history.push(metrics);
    
    // Limit history length
    if (history.length > CONFIG.performanceHistoryLength) {
        history.shift();
    }
    
    perfDB.set("summary_history", history);
    
    // Check if TPS is too low
    const config = getConfig();
    if (metrics.tps < config.minimumTpsThreshold) {
        broadcastToAdmins(`§c[Plugin Manager] Warning: Estimated TPS is ${metrics.tps.toFixed(1)}, which is below the minimum threshold of ${config.minimumTpsThreshold}. Consider disabling some plugins.`);
        
        // Record server performance warning
        if (!eventsDB.has("server")) {
            eventsDB.set("server", []);
        }
        
        const serverEvents = eventsDB.get("server");
        serverEvents.push({
            timestamp: Date.now(),
            event: "low_tps_warning",
            data: {
                tps: metrics.tps,
                threshold: config.minimumTpsThreshold,
                totalExecutionTime: totalExecTime,
                highestPlugin: highestPlugin ? getPluginName(highestPlugin) : null,
                highestExecutionTime: highestExecTime
            }
        });
        
        // Limit server events history
        if (serverEvents.length > CONFIG.maxEventsPerPlugin) {
            serverEvents.splice(0, serverEvents.length - CONFIG.maxEventsPerPlugin);
        }
        
        eventsDB.set("server", serverEvents);
    }
    
    return metrics;
}

// Broadcast message to admin players
function broadcastToAdmins(message) {
    const players = world.getAllPlayers();
    for (const player of players) {
        if (player.hasTag(CONFIG.adminTag)) {
            player.sendMessage(message);
        }
    }
}

// Log with debug mode check
function debugLog(message) {
    const config = getConfig();
    if (config.debugMode) {
        console.log(`[PluginManager Debug] ${message}`);
    }
}

// Get a plugin's details by path
function getPluginByPath(path) {
    const plugins = getPlugins();
    return plugins.find(p => p.path === path);
}

// Check if a plugin has dependencies
function hasDependencies(pluginPath) {
    return pluginDependencies.has(pluginPath) && pluginDependencies.get(pluginPath).length > 0;
}

// Get a plugin's dependencies
function getPluginDependencies(pluginPath) {
    return pluginDependencies.has(pluginPath) ? pluginDependencies.get(pluginPath) : [];
}

// Infer plugin dependencies based on import statements
async function analyzePluginDependencies(pluginPath) {
    try {
        const dependencies = [];
        
        // Try to check for dependencies by examining plugin code
        // This is a very basic implementation and might not work for all plugins
        // A better approach would be to have plugins explicitly declare dependencies
        
        // For now, we'll use a simple heuristic approach - plugins in the same category
        // may depend on each other, and chatRank might depend on basicNicerChat
        
        const plugin = getPluginByPath(pluginPath);
        
        if (plugin) {
            // Check for known dependency patterns
            if (pluginPath === "./chatRank/main") {
                dependencies.push("./basicNicerChat");
            }
            
            if (pluginPath.includes("/")) {
                // Plugins in subdirectories might depend on their parent module
                const pathParts = pluginPath.split("/");
                if (pathParts.length > 2 && pathParts[pathParts.length - 1] === "main") {
                    // Check if there's a base module
                    const baseModule = `./${pathParts[pathParts.length - 2]}`;
                    const plugins = getPlugins();
                    if (plugins.some(p => p.path === baseModule)) {
                        dependencies.push(baseModule);
                    }
                }
            }
        }
        
        // Record that we've analyzed this plugin
        pluginDependencies.set(pluginPath, dependencies);
        return dependencies;
    } catch (error) {
        console.error(`Failed to analyze dependencies for ${pluginPath}: ${error.message}`);
        return [];
    }
}

// Sort plugins by priority and dependencies
function prioritizePlugins(plugins) {
    // First, sort by explicit priority
    const sortedPlugins = [...plugins].sort((a, b) => {
        // Priority plugins come first
        const aIsPriority = CONFIG.priorityPlugins.includes(a.path);
        const bIsPriority = CONFIG.priorityPlugins.includes(b.path);
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        
        // Then sort by numerical priority if available
        if (a.priority !== undefined && b.priority !== undefined) {
            return b.priority - a.priority;
        }
        
        // Late load plugins come last
        const aIsLate = CONFIG.lateLoadPlugins.includes(a.path);
        const bIsLate = CONFIG.lateLoadPlugins.includes(b.path);
        
        if (aIsLate && !bIsLate) return 1;
        if (!aIsLate && bIsLate) return -1;
        
        return 0;
    });
    
    // Then consider dependencies
    // This is a simplified approach - a real topological sort would be better
    const result = [];
    const added = new Set();
    
    // Helper function to add a plugin and its dependencies
    const addPlugin = (plugin) => {
        if (added.has(plugin.path)) return;
        
        // Add dependencies first
        const dependencies = getPluginDependencies(plugin.path);
        for (const depPath of dependencies) {
            const depPlugin = sortedPlugins.find(p => p.path === depPath);
            if (depPlugin && !added.has(depPath)) {
                addPlugin(depPlugin);
            }
        }
        
        result.push(plugin);
        added.add(plugin.path);
    };
    
    // Add all plugins in order
    for (const plugin of sortedPlugins) {
        addPlugin(plugin);
    }
    
    return result;
}

// Time function execution
async function timeExecution(fn, pluginPath, functionName) {
    const startTime = Date.now();
    try {
        return await fn();
    } finally {
        const executionTime = Date.now() - startTime;
        
        // Record execution time
        const key = `${pluginPath}:${functionName}`;
        functionTimes.set(key, executionTime);
        
        // Log for performance tracking
        recordPerformanceMetric(pluginPath, "executionTime", executionTime);
        
        // Record event
        recordPluginEvent(pluginPath, "execution_completed", {
            function: functionName,
            executionTime: executionTime
        });
    }
}

// Create a backup of the plugin configuration
function createBackup() {
    try {
        const plugins = getPlugins();
        const metadata = pluginsDB.get("metadata") || {};
        const config = getConfig();
        
        const backupData = {
            plugins,
            metadata,
            config,
            timestamp: Date.now(),
            version: CONFIG.version
        };
        
        // Create backup in database
        const backups = pluginsDB.has("backups") ? pluginsDB.get("backups") : [];
        backups.push(backupData);
        
        // Keep only the last 5 backups
        if (backups.length > 5) {
            backups.shift();
        }
        
        pluginsDB.set("backups", backups);
        
        debugLog(`Created backup at ${getFormattedTime()}`);
        return true;
    } catch (error) {
        console.error(`Failed to create backup: ${error.message}`);
        return false;
    }
}

// Restore from a backup
function restoreFromBackup(backupIndex) {
    try {
        if (!pluginsDB.has("backups")) {
            return { success: false, error: "No backups available" };
        }
        
        const backups = pluginsDB.get("backups");
        
        if (backupIndex < 0 || backupIndex >= backups.length) {
            return { success: false, error: "Invalid backup index" };
        }
        
        const backup = backups[backupIndex];
        
        // Restore plugins
        pluginsDB.set("plugins", backup.plugins);
        
        // Restore metadata
        pluginsDB.set("metadata", {
            ...backup.metadata,
            lastUpdate: Date.now(),
            restoreTime: Date.now(),
            restoredFrom: backup.timestamp
        });
        
        // Restore configuration
        configDB.set("settings", backup.config);
        
        return { success: true, timestamp: backup.timestamp };
    } catch (error) {
        console.error(`Failed to restore backup: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ==================== PLUGIN MANAGEMENT FUNCTIONS ====================

// Import a plugin with error handling and performance tracking
async function importPlugin(pluginPath) {
    return await timeExecution(async () => {
        try {
            // Ensure path is relative to the script location
            const normPath = pluginPath.startsWith("./") ? pluginPath : "./" + pluginPath;
            
            // Clear any previous errors for this plugin
            if (pluginErrors.has(pluginPath)) {
                pluginErrors.delete(pluginPath);
            }
            
            // Analyze dependencies before loading
            await analyzePluginDependencies(pluginPath);
            
            debugLog(`Importing plugin: ${pluginPath}`);
            
            // Import the plugin
            const plugin = await import(normPath);
            
            // Update the loaded plugins map
            loadedPlugins.set(pluginPath, plugin);
            
            // Record successful load event
            recordPluginEvent(pluginPath, "loaded", {});
            
            console.log(`Successfully loaded plugin: ${pluginPath}`);
            return { success: true };
        } catch (error) {
            console.error(`Failed to load plugin ${pluginPath}: ${error.message}`);
            
            // Record the error
            pluginErrors.set(pluginPath, {
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });
            
            // Record error event
            recordPluginEvent(pluginPath, "error", {
                error: error.message,
                stack: error.stack
            });
            
            return { success: false, error: error.message, stack: error.stack };
        }
    }, pluginPath, "import");
}

// Load plugins in prioritized order
async function loadPrioritizedPlugins() {
    const allPlugins = getPlugins();
    const enabledPlugins = allPlugins.filter(p => p.enabled);
    
    // Prioritize plugins based on dependency and priority
    const prioritizedPlugins = prioritizePlugins(enabledPlugins);
    
    debugLog(`Loading ${prioritizedPlugins.length} plugins in prioritized order`);
    
    const results = [];
    
    // Load each plugin
    for (const plugin of prioritizedPlugins) {
        if (!loadedPlugins.has(plugin.path)) {
            debugLog(`Loading plugin: ${plugin.path}`);
            const result = await importPlugin(plugin.path);
            results.push({
                path: plugin.path,
                name: getPluginName(plugin.path),
                success: result.success,
                error: result.error,
                stack: result.stack
            });
        } else {
            debugLog(`Plugin already loaded: ${plugin.path}`);
        }
    }
    
    return results;
}

// Load enabled plugins that aren't already loaded
async function refreshPlugins() {
    const plugins = getPlugins();
    const results = [];
    
    debugLog(`Refreshing plugins: ${plugins.length} total, ${plugins.filter(p => p.enabled).length} enabled`);
    
    // First, analyze dependencies for all plugins
    for (const plugin of plugins) {
        if (plugin.enabled) {
            await analyzePluginDependencies(plugin.path);
        }
    }
    
    // Sort plugins by priority and dependencies
    const prioritizedPlugins = prioritizePlugins(plugins.filter(p => p.enabled));
    
    // Load each plugin that isn't already loaded
    for (const plugin of prioritizedPlugins) {
        if (!loadedPlugins.has(plugin.path)) {
            debugLog(`Loading plugin during refresh: ${plugin.path}`);
            const result = await importPlugin(plugin.path);
            results.push({
                path: plugin.path,
                name: getPluginName(plugin.path),
                success: result.success,
                error: result.error,
                stack: result.stack
            });
        }
    }
    
    updateMetadata();
    return results;
}

// Performance monitoring function
function monitorPerformance() {
    if (!getConfig().performanceMonitoring) {
        return;
    }
    
    // Calculate overall metrics
    const metrics = calculatePerformanceMetrics();
    
    // Log metrics if debug mode is enabled
    if (getConfig().debugMode) {
        console.log("[PluginManager] Performance Metrics:", metrics);
    }
    
    // Check for plugins with excessive execution time
    const plugins = getPlugins().filter(p => p.enabled);
    
    for (const plugin of plugins) {
        const perf = pluginPerformance.get(plugin.path);
        
        if (perf && perf.averageExecutionTime > getConfig().problematicThresholdMs) {
            console.warn(`[PluginManager] Plugin ${getPluginName(plugin.path)} has high average execution time: ${perf.averageExecutionTime.toFixed(2)}ms`);
        }
    }
    
    // Auto-disable problematic plugins if configured
    if (getConfig().autoDisableProblematicPlugins) {
        checkForProblematicPlugins();
    }
}

// Check for problematic plugins
function checkForProblematicPlugins() {
    const plugins = getPlugins().filter(p => p.enabled);
    const threshold = getConfig().problematicThresholdMs;
    
    for (const plugin of plugins) {
        const perf = pluginPerformance.get(plugin.path);
        
        if (perf && perf.averageExecutionTime > threshold && perf.totalExecutions > 10) {
            // This plugin consistently takes too long to execute
            console.warn(`[PluginManager] Problematic plugin detected: ${getPluginName(plugin.path)} (Avg: ${perf.averageExecutionTime.toFixed(2)}ms, Peak: ${perf.peakExecutionTime.toFixed(2)}ms)`);
            
            // Notify admins
            broadcastToAdmins(`§c[Plugin Manager] Warning: Plugin ${getPluginName(plugin.path)} is consistently taking too long to execute (${perf.averageExecutionTime.toFixed(2)}ms avg) and may be causing performance issues.`);
            
            // Consider auto-disabling
            if (getConfig().autoDisableProblematicPlugins) {
                broadcastToAdmins(`§c[Plugin Manager] Plugin ${getPluginName(plugin.path)} will be automatically disabled if performance does not improve.`);
                
                // Flag for potential disabling
                recordPluginEvent(plugin.path, "performance_warning", {
                    averageExecutionTime: perf.averageExecutionTime,
                    peakExecutionTime: perf.peakExecutionTime,
                    threshold: threshold
                });
            }
        }
    }
}

// ==================== UI FUNCTIONS ====================

// Show main plugin manager UI
async function showPluginManagerUI(player) {
    const plugins = getPlugins();
    const metadata = pluginsDB.get("metadata") || { totalPlugins: plugins.length, enabledCount: plugins.filter(p => p.enabled).length };
    
    // Get performance metrics
    const perfMetrics = lastPerformanceSummary || calculatePerformanceMetrics();
    
    const mainMenu = new ActionFormData()
        .title("Plugin Manager")
        .body(
            `Manage your BedrockBridge plugins\n\n` +
            `Total Plugins: ${metadata.totalPlugins}\n` +
            `Enabled: ${metadata.enabledCount}\n` +
            `Est. TPS Impact: ${perfMetrics.tps.toFixed(1)}/20\n` +
            `Version: ${CONFIG.version}`
        )
        .button("Plugin List", "textures/ui/permissions_member_star")
        .button("Add New Plugin", "textures/ui/plus")
        .button("Reload Plugins", "textures/ui/refresh_light")
        .button("Settings", "textures/ui/settings_glyph_color")
        .button("Statistics", "textures/ui/chart_icon")
        .button("Backups", "textures/ui/backup_icon");
    
    mainMenu.show(player).then(response => {
        if (response.canceled) return;
        
        switch (response.selection) {
            case 0: // Plugin List
                system.runTimeout(() => showPluginListUI(player), CONFIG.uiTransitionDelay);
                break;
            case 1: // Add New Plugin
                system.runTimeout(() => showAddPluginUI(player), CONFIG.uiTransitionDelay);
                break;
            case 2: // Reload Plugins
                reloadPlugins(player);
                break;
            case 3: // Settings
                system.runTimeout(() => showSettingsUI(player), CONFIG.uiTransitionDelay);
                break;
            case 4: // Statistics
                system.runTimeout(() => showStatisticsUI(player), CONFIG.uiTransitionDelay);
                break;
            case 5: // Backups
                system.runTimeout(() => showBackupsUI(player), CONFIG.uiTransitionDelay);
                break;
        }
    });
}

// Show list of all plugins
async function showPluginListUI(player) {
    const plugins = getPlugins();
    const config = getConfig();
    
    // Get all available categories
    const categories = new Set();
    plugins.forEach(plugin => {
        if (plugin.category) {
            categories.add(plugin.category);
        }
    });
    
    let body = `${plugins.length} plugins available. Select one to manage.`;
    
    // Show filter options if there are categories and categorySorting is enabled
    const categoryFilterForm = new ActionFormData()
        .title("Plugin List");
    
    if (categories.size > 0 && config.categorySorting) {
        body += "\n\nFilter by category:";
        categoryFilterForm.body(body);
        categoryFilterForm.button("All Plugins", "textures/ui/filter");
        
        // Add category buttons
        CONFIG.categories.forEach(category => {
            if ([...categories].includes(category.id)) {
                categoryFilterForm.button(category.name, category.icon);
            }
        });
        
        // Add uncategorized button if there are uncategorized plugins
        if (plugins.some(p => !p.category)) {
            categoryFilterForm.button("Uncategorized", "textures/ui/unknown_server");
        }
    } else {
        // Skip category selection if disabled or no categories
        system.runTimeout(() => showPluginListByCategory(player, "all"), CONFIG.uiTransitionDelay);
        return;
    }
    
    categoryFilterForm.button("Back", "textures/ui/arrow_left");
    
    categoryFilterForm.show(player).then(response => {
        if (response.canceled) return;
        
        // Back button is the last one
        if (response.selection === categoryFilterForm.buttons.length - 1) {
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === 0) {
            // All plugins
            system.runTimeout(() => showPluginListByCategory(player, "all"), CONFIG.uiTransitionDelay);
        } else if (response.selection === categoryFilterForm.buttons.length - 2) {
            // Uncategorized
            system.runTimeout(() => showPluginListByCategory(player, "uncategorized"), CONFIG.uiTransitionDelay);
        } else {
            // Specific category
            const categoryIndex = response.selection - 1;
            const categoryId = [...CONFIG.categories].filter(c => 
                [...categories].includes(c.id)
            )[categoryIndex].id;
            system.runTimeout(() => showPluginListByCategory(player, categoryId), CONFIG.uiTransitionDelay);
        }
    });
}

// Show plugins filtered by category
async function showPluginListByCategory(player, category) {
    const plugins = getPlugins();
    
    // Filter plugins by category
    let filteredPlugins = plugins;
    let categoryTitle = "All Plugins";
    
    if (category !== "all") {
        if (category === "uncategorized") {
            filteredPlugins = plugins.filter(p => !p.category);
            categoryTitle = "Uncategorized Plugins";
        } else {
            filteredPlugins = plugins.filter(p => p.category === category);
            const categoryConfig = CONFIG.categories.find(c => c.id === category);
            categoryTitle = categoryConfig ? categoryConfig.name : category;
        }
    }
    
    const pluginListForm = new ActionFormData()
        .title(categoryTitle)
        .body(`${filteredPlugins.length} plugins available. Select one to manage.`);
    
    // Sort plugins: enabled first, then by name
    filteredPlugins.sort((a, b) => {
        if (a.enabled !== b.enabled) {
            return a.enabled ? -1 : 1;
        }
        return getPluginName(a.path).localeCompare(getPluginName(b.path));
    });
    
    filteredPlugins.forEach(plugin => {
        const pluginName = getPluginName(plugin.path);
        const status = plugin.enabled ? "§a[ENABLED]" : "§c[DISABLED]";
        let icon = plugin.enabled ? "textures/ui/toggle_on" : "textures/ui/toggle_off";
        
        // Use category icon if available
        if (plugin.category) {
            const categoryConfig = CONFIG.categories.find(c => c.id === plugin.category);
            if (categoryConfig && categoryConfig.icon) {
                icon = categoryConfig.icon;
            }
        }
        
        pluginListForm.button(`${pluginName}\n${status}`, icon);
    });
    
    pluginListForm.button("Back", "textures/ui/arrow_left");
    
    pluginListForm.show(player).then(response => {
        if (response.canceled) return;
        
        if (response.selection === filteredPlugins.length) {
            // Back button
            system.runTimeout(() => showPluginListUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        // Show plugin details
        const selectedPlugin = filteredPlugins[response.selection];
        system.runTimeout(() => showPluginDetailsUI(player, selectedPlugin), CONFIG.uiTransitionDelay);
    });
}

// Show details and management options for a specific plugin
async function showPluginDetailsUI(player, plugin) {
    const pluginName = getPluginName(plugin.path);
    const hasError = pluginErrors.has(plugin.path);
    
    // Get plugin load time if available
    let loadTimeInfo = "";
    if (pluginLoadTimes.has(plugin.path)) {
        loadTimeInfo = `\nLoad time: ${pluginLoadTimes.get(plugin.path)}ms`;
    }
    
    // Get error info if available
    let errorInfo = "";
    if (hasError) {
        const error = pluginErrors.get(plugin.path);
        errorInfo = `\n§cError: ${error.message}`;
    }
    
    // Get plugin description if available
    const description = plugin.description || CONFIG.defaultDescription;
    
    // Get plugin tags
    const tags = plugin.tags ? plugin.tags.join(", ") : "";
    
    // Get category info
    let categoryInfo = "";
    if (plugin.category) {
        const categoryConfig = CONFIG.categories.find(c => c.id === plugin.category);
        categoryInfo = `\nCategory: ${categoryConfig ? categoryConfig.name : plugin.category}`;
    }
    
    // Get performance info if available
    let perfInfo = "";
    if (pluginPerformance.has(plugin.path)) {
        const perf = pluginPerformance.get(plugin.path);
        perfInfo = `\nAvg Execution: ${perf.averageExecutionTime.toFixed(2)}ms\nPeak Execution: ${perf.peakExecutionTime.toFixed(2)}ms`;
    }
    
    // Get dependency info
    let dependencyInfo = "";
    if (hasDependencies(plugin.path)) {
        const deps = getPluginDependencies(plugin.path);
        dependencyInfo = `\nDependencies: ${deps.map(d => getPluginName(d)).join(", ")}`;
    }
    
    const pluginDetailForm = new ActionFormData()
        .title(`Plugin: ${pluginName}`)
        .body(
            `Path: ${plugin.path}\n` +
            `Status: ${plugin.enabled ? "§aEnabled" : "§cDisabled"}\n` +
            `Description: ${description}` +
            (tags ? `\nTags: ${tags}` : "") +
            categoryInfo +
            loadTimeInfo +
            errorInfo +
            perfInfo +
            dependencyInfo
        )
        .button(plugin.enabled ? "Disable" : "Enable", 
            plugin.enabled ? "textures/ui/toggle_off" : "textures/ui/toggle_on")
        .button("Edit", "textures/ui/pencil")
        .button("Remove", "textures/ui/trash")
        .button("View Stats", "textures/ui/dressing_room_animation");
    
    // Add reload button or error details button
    if (hasError) {
        pluginDetailForm.button("Error Details", "textures/ui/ErrorGlyph");
    } else if (plugin.enabled) {
        pluginDetailForm.button("Reload Plugin", "textures/ui/refresh");
    }
    
    pluginDetailForm.button("Back to List", "textures/ui/arrow_left");
    
    pluginDetailForm.show(player).then(response => {
        if (response.canceled) return;
        
        const plugins = getPlugins();
        const pluginIndex = plugins.findIndex(p => p.path === plugin.path);
        
        switch (response.selection) {
            case 0: // Toggle Enable/Disable
                system.runTimeout(() => togglePluginState(player, plugins, pluginIndex, plugin), CONFIG.uiTransitionDelay);
                break;
            
            case 1: // Edit Plugin Path
                system.runTimeout(() => showEditPluginUI(player, plugin), CONFIG.uiTransitionDelay);
                break;
                
            case 2: // Remove Plugin
                system.runTimeout(() => confirmPluginRemoval(player, plugins, pluginIndex, plugin), CONFIG.uiTransitionDelay);
                break;
                
            case 3: // View Stats
                system.runTimeout(() => showPluginStatsUI(player, plugin), CONFIG.uiTransitionDelay);
                break;
                
            case 4: // Error Details or Reload Plugin
                if (hasError) {
                    system.runTimeout(() => showErrorDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
                } else if (plugin.enabled) {
                    reloadSinglePlugin(player, plugin);
                }
                break;
                
            case 5: // Back to List
                system.runTimeout(() => showPluginListUI(player), CONFIG.uiTransitionDelay);
                break;
        }
    });
}

// Show plugin stats UI
async function showPluginStatsUI(player, plugin) {
    const pluginName = getPluginName(plugin.path);
    let stats = { loadCount: 0, errorCount: 0, lastLoaded: null, totalExecutionTime: 0, peakExecutionTime: 0 };
    
    if (statsDB.has(plugin.path)) {
        stats = statsDB.get(plugin.path);
    }
    
    // Format last loaded time
    let lastLoadedText = "Never";
    if (stats.lastLoaded) {
        lastLoadedText = getFormattedTime(stats.lastLoaded);
    }
    
    // Get performance metrics
    let perfMetrics = {
        averageExecutionTime: 0,
        medianExecutionTime: 0,
        peakExecutionTime: 0,
        totalExecutions: 0,
        memoryUsage: 0
    };
    
    if (perfDB.has(plugin.path)) {
        perfMetrics = perfDB.get(plugin.path);
    }
    
    // Get recent events
    let eventsText = "";
    if (eventsDB.has(plugin.path)) {
        const events = eventsDB.get(plugin.path);
        if (events && events.length > 0) {
            eventsText = "\n\n§lRecent Events:§r\n";
            events.slice(-5).forEach(event => {
                const timeStr = getFormattedTime(event.timestamp);
                eventsText += `- ${timeStr}: ${event.event}`;
                
                if (event.data) {
                    if (event.data.executionTime) {
                        eventsText += ` (${event.data.executionTime}ms)`;
                    }
                    if (event.data.error) {
                        eventsText += ` - Error: ${event.data.error}`;
                    }
                }
                
                eventsText += "\n";
            });
        }
    }
    
    // Build the stats form
    const statsForm = new ActionFormData()
        .title(`Stats: ${pluginName}`)
        .body(
            `§lStatistics for ${pluginName}§r\n\n` +
            `Times Loaded: ${stats.loadCount}\n` +
            `Error Count: ${stats.errorCount}\n` +
            `Last Loaded: ${lastLoadedText}\n\n` +
            
            `§lPerformance Metrics:§r\n` +
            `Average Execution Time: ${perfMetrics.averageExecutionTime.toFixed(2)}ms\n` +
            `Median Execution Time: ${perfMetrics.medianExecutionTime.toFixed(2)}ms\n` +
            `Peak Execution Time: ${perfMetrics.peakExecutionTime.toFixed(2)}ms\n` +
            `Total Executions: ${perfMetrics.totalExecutions}\n` +
            (getConfig().memoryTracking ? `Memory Usage: ${perfMetrics.memoryUsage.toFixed(2)}KB\n` : "") +
            
            `${eventsText}`
        )
        .button("View Performance Graph", "textures/ui/graph_icon")
        .button("Back to Plugin", "textures/ui/arrow_left");
    
    statsForm.show(player).then(response => {
        if (response.canceled || response.selection === 1) {
            system.runTimeout(() => showPluginDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === 0) {
            // View performance graph (placeholder - would require more advanced UI capabilities)
            player.sendMessage("§eSorry, performance graphs are not available in the current version.");
            system.runTimeout(() => showPluginStatsUI(player, plugin), CONFIG.uiTransitionDelay);
        }
    });
}

// Show error details UI
async function showErrorDetailsUI(player, plugin) {
    const pluginName = getPluginName(plugin.path);
    
    if (!pluginErrors.has(plugin.path)) {
        player.sendMessage("§cNo error details available for this plugin.");
        system.runTimeout(() => showPluginDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
        return;
    }
    
    const error = pluginErrors.get(plugin.path);
    const timestamp = getFormattedTime(error.timestamp);
    
    // Get stack trace if available
    let stackTrace = "";
    if (error.stack) {
        stackTrace = "\n\n§lStack Trace:§r\n" + error.stack;
        // Truncate if too long
        if (stackTrace.length > 500) {
            stackTrace = stackTrace.substring(0, 500) + "...";
        }
    }
    
    const errorForm = new ActionFormData()
        .title(`Error: ${pluginName}`)
        .body(
            `§lError Details for ${pluginName}§r\n\n` +
            `Time: ${timestamp}\n\n` +
            `Error Message:\n§c${error.message}§r` +
            stackTrace + 
            `\n\nThis error occurred when trying to load the plugin. Fix the issue in the plugin code and try reloading.`
        )
        .button("Try Reload", "textures/ui/refresh")
        .button("Back to Plugin", "textures/ui/arrow_left");
    
    errorForm.show(player).then(response => {
        if (response.canceled || response.selection === 1) {
            system.runTimeout(() => showPluginDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === 0) {
            reloadSinglePlugin(player, plugin);
        }
    });
}

// Show settings UI
async function showSettingsUI(player) {
    const config = getConfig();
    
    const settingsForm = new ModalFormData()
        .title("Plugin Manager Settings")
        .toggle("Auto-reload plugins on changes", config.autoReloadPlugins)
        .toggle("Notify admins of plugin changes", config.notifyPluginChanges)
        .toggle("Debug Mode", config.debugMode)
        .toggle("Admin Only", config.adminOnly)
        .toggle("Performance Monitoring", config.performanceMonitoring)
        .toggle("Auto-disable problematic plugins", config.autoDisableProblematicPlugins)
        .toggle("Memory Usage Tracking", config.memoryTracking)
        .toggle("Category Sorting", config.categorySorting)
        .toggle("Automatic Backups", config.backupEnabled)
        .slider("Problem Threshold (ms)", 100, 2000, 100, config.problematicThresholdMs)
        .slider("Max Plugins", 20, 100, 10, config.maxPlugins)
        .slider("Minimum TPS Threshold", 5, 20, 1, config.minimumTpsThreshold);
    
    settingsForm.show(player).then(response => {
        if (response.canceled) {
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        // Update settings
        config.autoReloadPlugins = response.formValues[0];
        config.notifyPluginChanges = response.formValues[1];
        config.debugMode = response.formValues[2];
        config.adminOnly = response.formValues[3];
        config.performanceMonitoring = response.formValues[4];
        config.autoDisableProblematicPlugins = response.formValues[5];
        config.memoryTracking = response.formValues[6];
        config.categorySorting = response.formValues[7];
        config.backupEnabled = response.formValues[8];
        config.problematicThresholdMs = response.formValues[9];
        config.maxPlugins = response.formValues[10];
        config.minimumTpsThreshold = response.formValues[11];
        
        configDB.set("settings", config);
        
        // Create a backup after settings change
        if (config.backupEnabled) {
            createBackup();
        }
        
        player.sendMessage("§aPlugin Manager settings updated!");
        system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
    });
}

// Show backups UI
async function showBackupsUI(player) {
    if (!pluginsDB.has("backups")) {
        pluginsDB.set("backups", []);
    }
    
    const backups = pluginsDB.get("backups");
    
    if (backups.length === 0) {
        const noBackupsForm = new ActionFormData()
            .title("Backups")
            .body("No backups available. Create a backup to protect your plugin configuration.")
            .button("Create Backup", "textures/ui/backup_icon")
            .button("Back to Menu", "textures/ui/arrow_left");
        
        noBackupsForm.show(player).then(response => {
            if (response.canceled || response.selection === 1) {
                system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
                return;
            }
            
            if (response.selection === 0) {
                const success = createBackup();
                if (success) {
                    player.sendMessage("§aBackup created successfully!");
                } else {
                    player.sendMessage("§cFailed to create backup.");
                }
                system.runTimeout(() => showBackupsUI(player), CONFIG.uiTransitionDelay);
            }
        });
        
        return;
    }
    
    const backupsForm = new ActionFormData()
        .title("Backups")
        .body(`${backups.length} backups available. Select one to restore or manage.`);
    
    // Add backup entries
    backups.forEach((backup, index) => {
        const date = getFormattedTime(backup.timestamp);
        const pluginCount = backup.plugins.length;
        const enabledCount = backup.plugins.filter(p => p.enabled).length;
        
        backupsForm.button(`Backup #${index + 1}: ${date}\n${enabledCount}/${pluginCount} plugins enabled`);
    });
    
    backupsForm.button("Create New Backup", "textures/ui/backup_icon");
    backupsForm.button("Back to Menu", "textures/ui/arrow_left");
    
    backupsForm.show(player).then(response => {
        if (response.canceled) {
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === backups.length) {
            // Create new backup
            const success = createBackup();
            if (success) {
                player.sendMessage("§aBackup created successfully!");
            } else {
                player.sendMessage("§cFailed to create backup.");
            }
            system.runTimeout(() => showBackupsUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === backups.length + 1) {
            // Back to menu
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        // Show backup details and restore options
        const selectedBackup = backups[response.selection];
        system.runTimeout(() => showBackupDetailsUI(player, selectedBackup, response.selection), CONFIG.uiTransitionDelay);
    });
}

// Show backup details UI
async function showBackupDetailsUI(player, backup, backupIndex) {
    const date = getFormattedTime(backup.timestamp);
    const pluginCount = backup.plugins.length;
    const enabledCount = backup.plugins.filter(p => p.enabled).length;
    
    // Compare with current configuration
    const currentPlugins = getPlugins();
    const currentEnabled = currentPlugins.filter(p => p.enabled).length;
    
    let comparisonText = "";
    
    if (pluginCount !== currentPlugins.length) {
        comparisonText += `\nPlugin count: ${currentPlugins.length} now vs ${pluginCount} in backup`;
    }
    
    if (enabledCount !== currentEnabled) {
        comparisonText += `\nEnabled plugins: ${currentEnabled} now vs ${enabledCount} in backup`;
    }
    
    // Check for plugins that are in backup but not in current config and vice versa
    const currentPaths = new Set(currentPlugins.map(p => p.path));
    const backupPaths = new Set(backup.plugins.map(p => p.path));
    
    const missingNow = [...backupPaths].filter(path => !currentPaths.has(path));
    const addedSinceBackup = [...currentPaths].filter(path => !backupPaths.has(path));
    
    if (missingNow.length > 0) {
        comparisonText += `\n\nPlugins in backup but not current config (${missingNow.length}):\n`;
        missingNow.slice(0, 5).forEach(path => {
            comparisonText += `- ${getPluginName(path)}\n`;
        });
        if (missingNow.length > 5) {
            comparisonText += `  ...and ${missingNow.length - 5} more\n`;
        }
    }
    
    if (addedSinceBackup.length > 0) {
        comparisonText += `\n\nPlugins added since backup (${addedSinceBackup.length}):\n`;
        addedSinceBackup.slice(0, 5).forEach(path => {
            comparisonText += `- ${getPluginName(path)}\n`;
        });
        if (addedSinceBackup.length > 5) {
            comparisonText += `  ...and ${addedSinceBackup.length - 5} more\n`;
        }
    }
    
    const backupDetailsForm = new ActionFormData()
        .title(`Backup Details`)
        .body(
            `Backup created: ${date}\n` +
            `Plugin count: ${pluginCount}\n` +
            `Enabled plugins: ${enabledCount}/${pluginCount}\n` +
            `Version: ${backup.version || "Unknown"}` +
            comparisonText
        )
        .button("Restore This Backup", "textures/ui/arrow_down")
        .button("Delete This Backup", "textures/ui/trash")
        .button("Back to Backups", "textures/ui/arrow_left");
    
    backupDetailsForm.show(player).then(response => {
        if (response.canceled) {
            system.runTimeout(() => showBackupsUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        switch (response.selection) {
            case 0: // Restore backup
                system.runTimeout(() => confirmBackupRestore(player, backupIndex), CONFIG.uiTransitionDelay);
                break;
                
            case 1: // Delete backup
                system.runTimeout(() => confirmBackupDeletion(player, backupIndex), CONFIG.uiTransitionDelay);
                break;
                
            case 2: // Back to backups
                system.runTimeout(() => showBackupsUI(player), CONFIG.uiTransitionDelay);
                break;
        }
    });
}

// Confirm backup restore
async function confirmBackupRestore(player, backupIndex) {
    const backups = pluginsDB.get("backups");
    const backup = backups[backupIndex];
    const date = getFormattedTime(backup.timestamp);
    
    const confirmForm = new MessageFormData()
        .title("Confirm Restore")
        .body(
            `Are you sure you want to restore the backup from ${date}?\n\n` +
            `This will replace your current plugin configuration with the backup. ` +
            `A backup of your current configuration will be created first.`
        )
        .button1("Yes, Restore")
        .button2("Cancel");
    
    confirmForm.show(player).then(response => {
        if (response.canceled || response.selection === 1) {
            system.runTimeout(() => showBackupDetailsUI(player, backup, backupIndex), CONFIG.uiTransitionDelay);
            return;
        }
        
        // Create backup of current configuration first
        createBackup();
        
        // Restore from backup
        const result = restoreFromBackup(backupIndex);
        
        if (result.success) {
            player.sendMessage(`§aBackup restored successfully! Configuration from ${date} has been applied.`);
            
            // Reload plugins to apply changes
            reloadPluginsCommand(player);
            
            // Return to main menu
            system.runTimeout(() => showPluginManagerUI(player), 60);
        } else {
            player.sendMessage(`§cFailed to restore backup: ${result.error}`);
            system.runTimeout(() => showBackupDetailsUI(player, backup, backupIndex), CONFIG.uiTransitionDelay);
        }
    });
}

// Confirm backup deletion
async function confirmBackupDeletion(player, backupIndex) {
    const backups = pluginsDB.get("backups");
    const backup = backups[backupIndex];
    const date = getFormattedTime(backup.timestamp);
    
    const confirmForm = new MessageFormData()
        .title("Confirm Deletion")
        .body(`Are you sure you want to delete the backup from ${date}? This cannot be undone.`)
        .button1("Yes, Delete")
        .button2("Cancel");
    
    confirmForm.show(player).then(response => {
        if (response.canceled || response.selection === 1) {
            system.runTimeout(() => showBackupDetailsUI(player, backup, backupIndex), CONFIG.uiTransitionDelay);
            return;
        }
        
        // Delete the backup
        backups.splice(backupIndex, 1);
        pluginsDB.set("backups", backups);
        
        player.sendMessage(`§aBackup from ${date} deleted successfully.`);
        system.runTimeout(() => showBackupsUI(player), CONFIG.uiTransitionDelay);
    });
}

// Show statistics UI
async function showStatisticsUI(player) {
    const plugins = getPlugins();
    const metadata = pluginsDB.get("metadata") || { totalPlugins: plugins.length, enabledCount: plugins.filter(p => p.enabled).length };
    
    // Calculate performance metrics
    const perfMetrics = lastPerformanceSummary || calculatePerformanceMetrics();
    
    // Get top 5 plugins by execution time
    const topPlugins = [...pluginPerformance.entries()]
        .filter(([path, perf]) => plugins.some(p => p.path === path && p.enabled))
        .sort((a, b) => b[1].averageExecutionTime - a[1].averageExecutionTime)
        .slice(0, 5);
    
    let topPluginsText = "";
    if (topPlugins.length > 0) {
        topPluginsText = "\n\n§lHighest Impact Plugins:§r\n";
        topPlugins.forEach(([path, perf], index) => {
            topPluginsText += `${index + 1}. ${getPluginName(path)}: ${perf.averageExecutionTime.toFixed(2)}ms avg\n`;
        });
    }
    
    // Get plugins with errors
    const pluginsWithErrors = [...pluginErrors.entries()];
    let errorText = "";
    if (pluginsWithErrors.length > 0) {
        errorText = "\n\n§lPlugins with Errors:§r\n";
        pluginsWithErrors.forEach(([path, error]) => {
            errorText += `- ${getPluginName(path)}: ${error.message.substring(0, 40)}${error.message.length > 40 ? "..." : ""}\n`;
        });
    }
    
    // Build history summary if available
    let historyText = "";
    if (perfDB.has("summary_history")) {
        const history = perfDB.get("summary_history");
        if (history && history.length > 0) {
            const firstSample = history[0];
            const lastSample = history[history.length - 1];
            const duration = Math.round((lastSample.timestamp - firstSample.timestamp) / 60000); // minutes
            
            historyText = `\n\n§lPerformance History (${duration} minutes):§r\n`;
            historyText += `Starting TPS: ${firstSample.tps.toFixed(1)}\n`;
            historyText += `Current TPS: ${lastSample.tps.toFixed(1)}\n`;
            
            // Calculate trend
            const tpsChange = lastSample.tps - firstSample.tps;
            historyText += `Trend: ${tpsChange > 0 ? "§a↑" : tpsChange < 0 ? "§c↓" : "§e→"} ${Math.abs(tpsChange).toFixed(1)} TPS\n`;
        }
    }
    
    const statsForm = new ActionFormData()
        .title("Plugin Manager Statistics")
        .body(
            `§lSystem Statistics§r\n\n` +
            `Total Plugins: ${metadata.totalPlugins}\n` +
            `Enabled Plugins: ${metadata.enabledCount}\n` +
            `Loaded Plugins: ${loadedPlugins.size}\n` +
            `Plugins with Errors: ${pluginErrors.size}\n\n` +
            
            `§lPerformance Metrics§r\n` +
            `Estimated TPS: ${perfMetrics.tps.toFixed(1)}/20\n` +
            `Average Plugin Time: ${perfMetrics.averageExecutionTime.toFixed(2)}ms\n` +
            `Total Execution Time: ${perfMetrics.totalExecutionTime.toFixed(2)}ms\n` +
            (getConfig().memoryTracking ? `Memory Usage: ${perfMetrics.memoryUsage.toFixed(2)}KB\n` : "") +
            
            `${topPluginsText}${errorText}${historyText}`
        )
        .button("Plugin Performance Details", "textures/ui/timer")
        .button("Error Log", "textures/ui/ErrorGlyph")
        .button("Plugin Dependencies", "textures/ui/icon_map")
        .button("Back to Menu", "textures/ui/arrow_left");
    
    statsForm.show(player).then(response => {
        if (response.canceled || response.selection === 3) {
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        switch (response.selection) {
            case 0: // Plugin Performance Details
                system.runTimeout(() => showPerformanceDetailsUI(player), CONFIG.uiTransitionDelay);
                break;
                
            case 1: // Error Log
                system.runTimeout(() => showErrorLogUI(player), CONFIG.uiTransitionDelay);
                break;
                
            case 2: // Plugin Dependencies
                system.runTimeout(() => showDependenciesUI(player), CONFIG.uiTransitionDelay);
                break;
        }
    });
}

// Show performance details UI
async function showPerformanceDetailsUI(player) {
    // Get all enabled plugins with performance data
    const plugins = getPlugins().filter(p => p.enabled);
    const pluginsWithPerf = plugins.filter(p => pluginPerformance.has(p.path));
    
    // Sort by execution time (highest first)
    pluginsWithPerf.sort((a, b) => {
        const aPerf = pluginPerformance.get(a.path);
        const bPerf = pluginPerformance.get(b.path);
        return bPerf.averageExecutionTime - aPerf.averageExecutionTime;
    });
    
    let body = "§lPlugin Performance Details§r\n\n";
    
    if (pluginsWithPerf.length === 0) {
        body += "No performance data available yet. Enable performance monitoring in settings and use plugins for a while to collect data.";
    } else {
        pluginsWithPerf.forEach((plugin, index) => {
            const perf = pluginPerformance.get(plugin.path);
            const name = getPluginName(plugin.path);
            
            body += `${index + 1}. ${name}\n`;
            body += `   Avg: ${perf.averageExecutionTime.toFixed(2)}ms\n`;
            body += `   Med: ${perf.medianExecutionTime.toFixed(2)}ms\n`;
            body += `   Peak: ${perf.peakExecutionTime.toFixed(2)}ms\n`;
            
            // Add warning for problematic plugins
            if (perf.averageExecutionTime > getConfig().problematicThresholdMs) {
                body += `   §c⚠ High Impact Plugin §r\n`;
            }
            
            body += "\n";
        });
    }
    
    const perfDetailsForm = new ActionFormData()
        .title("Performance Details")
        .body(body)
        .button("Back to Statistics", "textures/ui/arrow_left");
    
    perfDetailsForm.show(player).then(response => {
        system.runTimeout(() => showStatisticsUI(player), CONFIG.uiTransitionDelay);
    });
}

// Show error log UI
async function showErrorLogUI(player) {
    // Get all errors
    const errors = [...pluginErrors.entries()];
    
    let body = "§lPlugin Error Log§r\n\n";
    if (errors.length === 0) {
        body += "No plugin errors have been recorded.";
    } else {
        errors.forEach(([path, error], index) => {
            const timestamp = getFormattedTime(error.timestamp);
            body += `§l${getPluginName(path)}§r\n`;
            body += `Time: ${timestamp}\n`;
            body += `Error: §c${error.message}§r\n\n`;
        });
    }
    
    const errorLogForm = new ActionFormData()
        .title("Error Log")
        .body(body)
        .button("Clear Error Log", "textures/ui/trash")
        .button("Back to Statistics", "textures/ui/arrow_left");
    
    errorLogForm.show(player).then(response => {
        if (response.canceled || response.selection === 1) {
            system.runTimeout(() => showStatisticsUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === 0) {
            // Clear error log
            pluginErrors.clear();
            player.sendMessage("§aError log cleared successfully.");
            system.runTimeout(() => showStatisticsUI(player), CONFIG.uiTransitionDelay);
        }
    });
}

// Show dependencies UI
async function showDependenciesUI(player) {
    const plugins = getPlugins();
    
    // Get plugins with dependencies
    const pluginsWithDeps = plugins.filter(p => hasDependencies(p.path));
    
    let body = "§lPlugin Dependencies§r\n\n";
    
    if (pluginsWithDeps.length === 0) {
        body += "No plugin dependencies have been detected.";
    } else {
        body += "The following plugins have dependencies:\n\n";
        
        pluginsWithDeps.forEach(plugin => {
            const name = getPluginName(plugin.path);
            const deps = getPluginDependencies(plugin.path);
            
            body += `§l${name}§r depends on:\n`;
            deps.forEach(depPath => {
                const depPlugin = plugins.find(p => p.path === depPath);
                const depName = getPluginName(depPath);
                const status = depPlugin && depPlugin.enabled ? "§aEnabled" : "§cDisabled";
                
                body += `- ${depName} (${status}§r)\n`;
            });
            
            body += "\n";
        });
    }
    
    const depsForm = new ActionFormData()
        .title("Plugin Dependencies")
        .body(body)
        .button("Analyze All Dependencies", "textures/ui/refresh")
        .button("Back to Statistics", "textures/ui/arrow_left");
    
    depsForm.show(player).then(async response => {
        if (response.canceled || response.selection === 1) {
            system.runTimeout(() => showStatisticsUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === 0) {
            // Analyze all dependencies
            player.sendMessage("§aAnalyzing plugin dependencies...");
            
            for (const plugin of plugins) {
                await analyzePluginDependencies(plugin.path);
            }
            
            player.sendMessage("§aDependency analysis completed.");
            system.runTimeout(() => showDependenciesUI(player), CONFIG.uiTransitionDelay);
        }
    });
}

// Show edit plugin UI
async function showEditPluginUI(player, plugin) {
    // Get available categories
    const categoryOptions = ["none", ...CONFIG.categories.map(c => c.id)];
    const categoryLabels = ["None", ...CONFIG.categories.map(c => c.name)];
    
    // Find current category index
    const categoryIndex = plugin.category ? 
        categoryOptions.findIndex(c => c === plugin.category) : 
        0;
    
    const editPluginForm = new ModalFormData()
        .title(`Edit Plugin: ${getPluginName(plugin.path)}`);
    
    // Add form fields
    editPluginForm.textField("Plugin Path", "e.g. ./myPlugin", plugin.path);
    editPluginForm.textField("Description", "Enter plugin description", plugin.description || "");
    editPluginForm.textField("Tags (comma separated)", "e.g. system,chat", plugin.tags ? plugin.tags.join(",") : "");
    editPluginForm.dropdown("Category", categoryLabels, categoryIndex);
    editPluginForm.slider("Priority", 1, 10, 1, plugin.priority || CONFIG.defaultPriority);
    
    editPluginForm.show(player).then(response => {
        if (response.canceled) {
            system.runTimeout(() => showPluginDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
            return;
        }
        
        const newPath = response.formValues[0];
        const newDescription = response.formValues[1];
        const newTagsString = response.formValues[2];
        const newCategoryIndex = response.formValues[3];
        const newPriority = response.formValues[4];
        
        if (!newPath) {
            player.sendMessage("§cPlugin path cannot be empty!");
            system.runTimeout(() => showEditPluginUI(player, plugin), 20);
            return;
        }
        
        const plugins = getPlugins();
        
        // Check if new path already exists (but not the current plugin)
        if (plugins.some(p => p.path === newPath && p.path !== plugin.path)) {
            player.sendMessage(`§cPlugin '${newPath}' already exists!`);
            system.runTimeout(() => showEditPluginUI(player, plugin), 20);
            return;
        }
        
        // Update plugin path
        const pluginIndex = plugins.findIndex(p => p.path === plugin.path);
        const wasEnabled = plugins[pluginIndex].enabled;
        
        // If the plugin was loaded, remove it from loaded plugins
        if (loadedPlugins.has(plugin.path)) {
            loadedPlugins.delete(plugin.path);
        }
        
        // Copy any statistics to the new path if the path is changing
        if (plugin.path !== newPath && statsDB.has(plugin.path)) {
            statsDB.set(newPath, statsDB.get(plugin.path));
        }
        
        // Parse tags
        const newTags = newTagsString
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        // Get new category
        const newCategory = newCategoryIndex === 0 ? null : categoryOptions[newCategoryIndex];
        
        // Update plugin data
        plugins[pluginIndex] = {
            ...plugins[pluginIndex],
            path: newPath,
            description: newDescription,
            tags: newTags.length > 0 ? newTags : CONFIG.defaultTags,
            category: newCategory,
            priority: newPriority,
            enabled: wasEnabled
        };
        
        pluginsDB.set("plugins", plugins);
        updateMetadata();
        
        recordPluginEvent(newPath, "edited", { 
            previousPath: plugin.path, 
            newPath: newPath,
            editor: player.name 
        });
        
        player.sendMessage(`§aPlugin updated: '${newPath}'`);
        
        // Reload the plugin if it was enabled
        if (wasEnabled) {
            importPlugin(newPath).then(result => {
                if (result.success) {
                    player.sendMessage(`§aPlugin '${newPath}' reloaded successfully!`);
                } else {
                    player.sendMessage(`§ePlugin '${newPath}' failed to load: ${result.error}`);
                }
                
                system.runTimeout(() => showPluginDetailsUI(player, plugins[pluginIndex]), CONFIG.uiTransitionDelay);
            });
        } else {
            system.runTimeout(() => showPluginDetailsUI(player, plugins[pluginIndex]), CONFIG.uiTransitionDelay);
        }
    });
}

// Show UI to add a new plugin
async function showAddPluginUI(player) {
    // Get available categories
    const categoryOptions = ["none", ...CONFIG.categories.map(c => c.id)];
    const categoryLabels = ["None", ...CONFIG.categories.map(c => c.name)];
    
    const addPluginForm = new ModalFormData()
        .title("Add New Plugin");
    
    // Add form fields
    addPluginForm.textField("Plugin Path", "e.g. ./myPlugin", "./");
    addPluginForm.textField("Description", "Enter plugin description", "");
    addPluginForm.textField("Tags (comma separated)", "e.g. system,chat", CONFIG.defaultTags.join(","));
    addPluginForm.dropdown("Category", categoryLabels, 0);
    addPluginForm.slider("Priority", 1, 10, 1, CONFIG.defaultPriority);
    addPluginForm.toggle("Enable immediately", false);
    
    addPluginForm.show(player).then(response => {
        if (response.canceled) {
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        const pluginPath = response.formValues[0];
        const description = response.formValues[1];
        const tagsString = response.formValues[2];
        const categoryIndex = response.formValues[3];
        const priority = response.formValues[4];
        const enableNow = response.formValues[5];
        
        if (!pluginPath) {
            player.sendMessage("§cPlugin path cannot be empty!");
            system.runTimeout(() => showAddPluginUI(player), 20);
            return;
        }
        
        const plugins = getPlugins();
        
        // Check if plugin already exists
        if (plugins.some(p => p.path === pluginPath)) {
            player.sendMessage(`§cPlugin '${pluginPath}' already exists!`);
            system.runTimeout(() => showAddPluginUI(player), 20);
            return;
        }
        
        // Check if we've reached the max plugins limit
        const config = getConfig();
        if (plugins.length >= config.maxPlugins) {
            player.sendMessage(`§cMaximum number of plugins (${config.maxPlugins}) reached! Please remove some plugins first.`);
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            return;
        }
        
        // Parse tags
        const tags = tagsString
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        // Get category
        const category = categoryIndex === 0 ? null : categoryOptions[categoryIndex];
        
        // Add new plugin
        const newPlugin = { 
            path: pluginPath, 
            enabled: enableNow,
            description: description,
            tags: tags.length > 0 ? tags : CONFIG.defaultTags,
            category: category,
            priority: priority
        };
        
        plugins.push(newPlugin);
        pluginsDB.set("plugins", plugins);
        updateMetadata();
        
        recordPluginEvent(pluginPath, "added", { addedBy: player.name });
        
        player.sendMessage(`§aPlugin '${getPluginName(pluginPath)}' added to plugin manager.`);
        
        // If enable immediately is selected, try to load the plugin
        if (enableNow) {
            importPlugin(pluginPath).then(result => {
                if (result.success) {
                    player.sendMessage(`§aPlugin '${getPluginName(pluginPath)}' enabled successfully!`);
                } else {
                    player.sendMessage(`§ePlugin '${getPluginName(pluginPath)}' failed to load: ${result.error}`);
                }
                
                system.runTimeout(() => showPluginDetailsUI(player, newPlugin), CONFIG.uiTransitionDelay);
            });
        } else {
            system.runTimeout(() => showPluginDetailsUI(player, newPlugin), CONFIG.uiTransitionDelay);
        }
    });
}

// Toggle plugin enabled state
async function togglePluginState(player, plugins, pluginIndex, plugin) {
    const newState = !plugin.enabled;
    plugins[pluginIndex].enabled = newState;
    pluginsDB.set("plugins", plugins);
    updateMetadata();
    
    if (newState) {
        // Try to enable the plugin
        const result = await importPlugin(plugin.path);
        recordPluginEvent(plugin.path, "enabled", { enabledBy: player.name });
        
        if (result.success) {
            player.sendMessage(`§aPlugin '${getPluginName(plugin.path)}' enabled successfully!`);
        } else {
            player.sendMessage(`§ePlugin '${getPluginName(plugin.path)}' marked as enabled but failed to load: ${result.error}`);
        }
    } else {
        recordPluginEvent(plugin.path, "disabled", { disabledBy: player.name });
        player.sendMessage(`§aPlugin '${getPluginName(plugin.path)}' disabled. Note: Already loaded code will remain in memory until server restart.`);
    }
    
    // Return to plugin details with updated info
    system.runTimeout(() => showPluginDetailsUI(player, plugins[pluginIndex]), CONFIG.uiTransitionDelay);
}

// Show confirmation before removing a plugin
async function confirmPluginRemoval(player, plugins, pluginIndex, plugin) {
    const confirmForm = new MessageFormData()
        .title("Confirm Removal")
        .body(`Are you sure you want to remove the plugin '${getPluginName(plugin.path)}'?\n\nThis will not delete the actual plugin file, just remove it from the plugin manager.`)
        .button1("Yes, Remove")
        .button2("Cancel");
    
    confirmForm.show(player).then(response => {
        if (response.canceled) {
            system.runTimeout(() => showPluginDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
            return;
        }
        
        if (response.selection === 0) { // Yes, Remove
            plugins.splice(pluginIndex, 1);
            pluginsDB.set("plugins", plugins);
            updateMetadata();
            
            recordPluginEvent(plugin.path, "removed", { removedBy: player.name });
            
            player.sendMessage(`§aPlugin '${getPluginName(plugin.path)}' removed from plugin manager.`);
            system.runTimeout(() => showPluginListUI(player), CONFIG.uiTransitionDelay);
        } else {
            system.runTimeout(() => showPluginDetailsUI(player, plugin), CONFIG.uiTransitionDelay);
        }
    });
}

// Reload a single plugin
async function reloadSinglePlugin(player, plugin) {
    player.sendMessage(`§6Reloading plugin '${getPluginName(plugin.path)}'...`);
    
    // Remove from loaded plugins map
    if (loadedPlugins.has(plugin.path)) {
        loadedPlugins.delete(plugin.path);
    }
    
    // Reload the plugin
    const result = await importPlugin(plugin.path);
    
    if (result.success) {
        player.sendMessage(`§aPlugin '${getPluginName(plugin.path)}' reloaded successfully!`);
    } else {
        player.sendMessage(`§cPlugin '${getPluginName(plugin.path)}' failed to reload: ${result.error}`);
    }
    
    // Return to plugin details
    system.runTimeout(() => showPluginDetailsUI(player, plugin), 30);
}

// Reload all enabled plugins
async function reloadPlugins(player) {
    player.sendMessage("§6Reloading all plugins...");
    
    // Clear loaded plugins to force reload
    loadedPlugins.clear();
    
    const results = await loadPrioritizedPlugins();
    
    let successCount = 0;
    let failCount = 0;
    let totalTime = 0;
    
    results.forEach(result => {
        if (result.success) {
            successCount++;
            const loadTime = pluginLoadTimes.get(result.path) || 0;
            totalTime += loadTime;
        } else {
            failCount++;
            player.sendMessage(`§c${result.path}: ${result.error}`);
        }
    });
    
    const avgTime = successCount > 0 ? Math.round(totalTime / successCount) : 0;
    
    player.sendMessage(`§aReloaded ${successCount} plugins (avg ${avgTime}ms). §c${failCount} failed.`);
    
    // Broadcast to other admins if notifications are enabled
    const config = getConfig();
    if (config.notifyPluginChanges) {
        broadcastToAdmins(`§7[Plugin Manager] §fAll plugins reloaded by ${player.name}. Success: §a${successCount}§f, Failed: §c${failCount}§f`);
    }
    
    // Return to main menu after reload
    system.runTimeout(() => showPluginManagerUI(player), 60);
}

// ==================== COMMAND REGISTRATION ====================

// Register the plugin command for admin usage
bridge.bedrockCommands.registerCommand("plugin", (player, arg1, arg2) => {
    // Use proper CommandArgument handling
    const action = arg1 ? arg1.toString().toLowerCase() : null;
    const pluginPath = arg2 ? arg2.toString() : null;
    
    // Check if player is an admin
    if (getConfig().adminOnly && !player.hasTag(CONFIG.adminTag)) {
        player.sendMessage("§cYou don't have permission to use this command.");
        return;
    }
    
    // If no arguments, show UI
    if (!action) {
        system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
        return;
    }
    
    // Process the command
    switch(action) {
        case "list":
            listPlugins(player);
            break;
            
        case "enable":
            enablePlugin(player, pluginPath);
            break;
            
        case "disable":
            disablePlugin(player, pluginPath);
            break;
            
        case "add":
            addPlugin(player, pluginPath);
            break;
            
        case "remove":
            removePlugin(player, pluginPath);
            break;
            
        case "ui":
            system.runTimeout(() => showPluginManagerUI(player), CONFIG.uiTransitionDelay);
            break;
            
        case "reload":
            reloadPluginsCommand(player);
            break;
            
        case "info":
            pluginInfo(player, pluginPath);
            break;
            
        case "stats":
            pluginStats(player);
            break;
            
        case "backup":
            handleBackupCommand(player, pluginPath);
            break;
            
        case "settings":
            system.runTimeout(() => showSettingsUI(player), CONFIG.uiTransitionDelay);
            break;
            
        default:
            player.sendMessage("§cInvalid command! Available commands:\n!plugin ui|list|enable|disable|add|remove|reload|info|stats|backup|settings");
    }
}, "Manage BedrockBridge plugins");

// Register a public plugin list command (available to all players if adminOnly is disabled)
bridge.bedrockCommands.registerCommand("plugins", (player) => {
    const config = getConfig();
    
    // If adminOnly is enabled, check if player has admin tag
    if (config.adminOnly && !player.hasTag(CONFIG.adminTag)) {
        player.sendMessage("§cYou don't have permission to use this command.");
        return;
    }
    
    listPlugins(player);
}, "List all plugins");

// List all available plugins
function listPlugins(player) {
    const plugins = getPlugins();
    const enabledCount = plugins.filter(p => p.enabled).length;
    
    player.sendMessage(`§2=== Available Plugins (${enabledCount}/${plugins.length}) ===`);
    
    // Group plugins by enabled/disabled for better organization
    const enabledPlugins = plugins.filter(p => p.enabled);
    const disabledPlugins = plugins.filter(p => !p.enabled);
    
    // If category sorting is enabled, group by category
    const config = getConfig();
    if (config.categorySorting) {
        // Get all used categories
        const categories = new Set();
        plugins.forEach(p => {
            if (p.category) categories.add(p.category);
        });
        
        player.sendMessage("§a§lEnabled Plugins:§r");
        if (enabledPlugins.length === 0) {
            player.sendMessage("§7  None");
        } else {
            // First show enabled plugins with categories
            for (const category of CONFIG.categories) {
                if (categories.has(category.id)) {
                    const categoryPlugins = enabledPlugins.filter(p => p.category === category.id);
                    if (categoryPlugins.length > 0) {
                        player.sendMessage(`\n§6${category.name}:§r`);
                        categoryPlugins.forEach(plugin => {
                            const hasError = pluginErrors.has(plugin.path);
                            const status = hasError ? "§e[ERROR]" : "§a[ENABLED]";
                            player.sendMessage(`${status} §f${getPluginName(plugin.path)}`);
                        });
                    }
                }
            }
            
            // Then show enabled plugins without categories
            const uncategorizedPlugins = enabledPlugins.filter(p => !p.category);
            if (uncategorizedPlugins.length > 0) {
                player.sendMessage("\n§6Uncategorized:§r");
                uncategorizedPlugins.forEach(plugin => {
                    const hasError = pluginErrors.has(plugin.path);
                    const status = hasError ? "§e[ERROR]" : "§a[ENABLED]";
                    player.sendMessage(`${status} §f${getPluginName(plugin.path)}`);
                });
            }
        }
        
        player.sendMessage("\n§c§lDisabled Plugins:§r");
        if (disabledPlugins.length === 0) {
            player.sendMessage("§7  None");
        } else {
            // First show disabled plugins with categories
            for (const category of CONFIG.categories) {
                if (categories.has(category.id)) {
                    const categoryPlugins = disabledPlugins.filter(p => p.category === category.id);
                    if (categoryPlugins.length > 0) {
                        player.sendMessage(`\n§6${category.name}:§r`);
                        categoryPlugins.forEach(plugin => {
                            player.sendMessage(`§c[DISABLED] §f${getPluginName(plugin.path)}`);
                        });
                    }
                }
            }
            
            // Then show disabled plugins without categories
            const uncategorizedPlugins = disabledPlugins.filter(p => !p.category);
            if (uncategorizedPlugins.length > 0) {
                player.sendMessage("\n§6Uncategorized:§r");
                uncategorizedPlugins.forEach(plugin => {
                    player.sendMessage(`§c[DISABLED] §f${getPluginName(plugin.path)}`);
                });
            }
        }
    } else {
        // Simple list without categories
        player.sendMessage("§a§lEnabled Plugins:§r");
        if (enabledPlugins.length === 0) {
            player.sendMessage("§7  None");
        } else {
            enabledPlugins.forEach(plugin => {
                const hasError = pluginErrors.has(plugin.path);
                const status = hasError ? "§e[ERROR]" : "§a[ENABLED]";
                player.sendMessage(`${status} §f${getPluginName(plugin.path)} (${plugin.path})`);
            });
        }
        
        player.sendMessage("\n§c§lDisabled Plugins:§r");
        if (disabledPlugins.length === 0) {
            player.sendMessage("§7  None");
        } else {
            disabledPlugins.forEach(plugin => {
                player.sendMessage(`§c[DISABLED] §f${getPluginName(plugin.path)} (${plugin.path})`);
            });
        }
    }
    
    player.sendMessage("\nUse §6!plugin ui§f for graphical management");
}

// Show plugin info
function pluginInfo(player, pluginPath) {
    if (!pluginPath) {
        player.sendMessage("§cSpecify a plugin path to get info!");
        return;
    }
    
    const plugins = getPlugins();
    const plugin = plugins.find(p => p.path === pluginPath);
    
    if (!plugin) {
        player.sendMessage(`§cPlugin '${pluginPath}' not found!`);
        return;
    }
    
    const pluginName = getPluginName(plugin.path);
    const hasError = pluginErrors.has(plugin.path);
    const loadTime = pluginLoadTimes.has(plugin.path) ? `${pluginLoadTimes.get(plugin.path)}ms` : "Not loaded";
    
    player.sendMessage(`§2=== Plugin Info: ${pluginName} ===`);
    player.sendMessage(`§fPath: §7${plugin.path}`);
    player.sendMessage(`§fStatus: ${plugin.enabled ? "§aEnabled" : "§cDisabled"}`);
    player.sendMessage(`§fDescription: §7${plugin.description || CONFIG.defaultDescription}`);
    
    if (plugin.tags && plugin.tags.length > 0) {
        player.sendMessage(`§fTags: §7${plugin.tags.join(", ")}`);
    }
    
    if (plugin.category) {
        const category = CONFIG.categories.find(c => c.id === plugin.category);
        player.sendMessage(`§fCategory: §7${category ? category.name : plugin.category}`);
    }
    
    if (plugin.priority) {
        player.sendMessage(`§fPriority: §7${plugin.priority}`);
    }
    
    player.sendMessage(`§fLoad Time: §7${loadTime}`);
    
    if (hasError) {
        const error = pluginErrors.get(plugin.path);
        player.sendMessage(`§fError: §c${error.message}`);
    }
    
    // Show stats if available
    if (statsDB.has(plugin.path)) {
        const stats = statsDB.get(plugin.path);
        player.sendMessage(`§fLoad Count: §7${stats.loadCount}`);
        player.sendMessage(`§fError Count: §7${stats.errorCount}`);
        
        if (stats.lastLoaded) {
            player.sendMessage(`§fLast Loaded: §7${getFormattedTime(stats.lastLoaded)}`);
        }
    }
    
    // Show performance if available
    if (pluginPerformance.has(plugin.path)) {
        const perf = pluginPerformance.get(plugin.path);
        player.sendMessage(`\n§2=== Performance Metrics ===`);
        player.sendMessage(`§fAverage Execution Time: §7${perf.averageExecutionTime.toFixed(2)}ms`);
        player.sendMessage(`§fMedian Execution Time: §7${perf.medianExecutionTime.toFixed(2)}ms`);
        player.sendMessage(`§fPeak Execution Time: §7${perf.peakExecutionTime.toFixed(2)}ms`);
        player.sendMessage(`§fTotal Executions: §7${perf.totalExecutions}`);
        
        if (getConfig().memoryTracking) {
            player.sendMessage(`§fMemory Usage: §7${perf.memoryUsage.toFixed(2)}KB`);
        }
    }
    
    // Show dependencies if available
    if (hasDependencies(plugin.path)) {
        const deps = getPluginDependencies(plugin.path);
        player.sendMessage(`\n§2=== Dependencies ===`);
        deps.forEach(depPath => {
            const depPlugin = plugins.find(p => p.path === depPath);
            const depName = getPluginName(depPath);
            const status = depPlugin && depPlugin.enabled ? "§aEnabled" : "§cDisabled";
            player.sendMessage(`§f- ${depName}: ${status}`);
        });
    }
}

// Show plugin stats
function pluginStats(player) {
    const plugins = getPlugins();
    const enabledCount = plugins.filter(p => p.enabled).length;
    const errorCount = pluginErrors.size;
    
    // Calculate average load time
    let totalLoadTime = 0;
    let loadedCount = 0;
    pluginLoadTimes.forEach(time => {
        totalLoadTime += time;
        loadedCount++;
    });
    
    const avgLoadTime = loadedCount > 0 ? Math.round(totalLoadTime / loadedCount) : 0;
    
    // Get performance metrics
    const perfMetrics = lastPerformanceSummary || calculatePerformanceMetrics();
    
    player.sendMessage(`§2=== Plugin Manager Statistics ===`);
    player.sendMessage(`§fTotal Plugins: §7${plugins.length}`);
    player.sendMessage(`§fEnabled Plugins: §7${enabledCount}`);
    player.sendMessage(`§fCurrently Loaded: §7${loadedPlugins.size}`);
    player.sendMessage(`§fPlugins with Errors: §7${errorCount}`);
    player.sendMessage(`§fAverage Load Time: §7${avgLoadTime}ms`);
    player.sendMessage(`§fEstimated TPS Impact: §7${perfMetrics.tps.toFixed(1)}/20`);
    
    // Most recently modified
    const metadata = pluginsDB.get("metadata") || {};
    if (metadata.lastUpdate) {
        player.sendMessage(`§fLast Update: §7${getFormattedTime(metadata.lastUpdate)}`);
    }
    
    player.sendMessage("\n§2=== Top 3 Performance Impact Plugins ===");
    
    // Get top 3 plugins by execution time
    const topPlugins = [...pluginPerformance.entries()]
        .filter(([path, perf]) => plugins.some(p => p.path === path && p.enabled))
        .sort((a, b) => b[1].averageExecutionTime - a[1].averageExecutionTime)
        .slice(0, 3);
    
    if (topPlugins.length === 0) {
        player.sendMessage("§7No performance data available yet.");
    } else {
        topPlugins.forEach(([path, perf], index) => {
            player.sendMessage(`§f${index + 1}. ${getPluginName(path)}: §7${perf.averageExecutionTime.toFixed(2)}ms avg, ${perf.peakExecutionTime.toFixed(2)}ms peak`);
        });
    }
    
    player.sendMessage("\nUse §6!plugin ui stats§f for detailed statistics");
}

// Enable a specific plugin
async function enablePlugin(player, pluginPath) {
    if (!pluginPath) {
        player.sendMessage("§cSpecify a plugin path to enable!");
        return;
    }
    
    const plugins = getPlugins();
    const plugin = plugins.find(p => p.path === pluginPath);
    
    if (!plugin) {
        player.sendMessage(`§cPlugin '${pluginPath}' not found!`);
        return;
    }
    
    if (plugin.enabled) {
        player.sendMessage(`§ePlugin '${getPluginName(pluginPath)}' is already enabled.`);
        return;
    }
    
    plugin.enabled = true;
    pluginsDB.set("plugins", plugins);
    updateMetadata();
    
    recordPluginEvent(pluginPath, "enabled", { enabledBy: player.name });
    
    const result = await importPlugin(pluginPath);
    if (result.success) {
        player.sendMessage(`§aPlugin '${getPluginName(pluginPath)}' enabled successfully!`);
        
        // Notify other admins if configured
        const config = getConfig();
        if (config.notifyPluginChanges) {
            broadcastToAdmins(`§7[Plugin Manager] §f${getPluginName(pluginPath)} enabled by ${player.name}`);
        }
    } else {
        player.sendMessage(`§ePlugin '${getPluginName(pluginPath)}' marked as enabled but failed to load: ${result.error}`);
    }
}

// Disable a specific plugin
function disablePlugin(player, pluginPath) {
    if (!pluginPath) {
        player.sendMessage("§cSpecify a plugin path to disable!");
        return;
    }
    
    const plugins = getPlugins();
    const plugin = plugins.find(p => p.path === pluginPath);
    
    if (!plugin) {
        player.sendMessage(`§cPlugin '${pluginPath}' not found!`);
        return;
    }
    
    if (!plugin.enabled) {
        player.sendMessage(`§ePlugin '${getPluginName(pluginPath)}' is already disabled.`);
        return;
    }
    
    plugin.enabled = false;
    pluginsDB.set("plugins", plugins);
    updateMetadata();
    
    recordPluginEvent(pluginPath, "disabled", { disabledBy: player.name });
    
    player.sendMessage(`§aPlugin '${getPluginName(pluginPath)}' disabled. Note: Already loaded code will remain in memory until server restart.`);
    
    // Notify other admins if configured
    const config = getConfig();
    if (config.notifyPluginChanges) {
        broadcastToAdmins(`§7[Plugin Manager] §f${getPluginName(pluginPath)} disabled by ${player.name}`);
    }
}

// Add a new plugin
function addPlugin(player, pluginPath) {
    if (!pluginPath) {
        player.sendMessage("§cSpecify a plugin path to add!");
        return;
    }
    
    const plugins = getPlugins();
    
    if (plugins.some(p => p.path === pluginPath)) {
        player.sendMessage(`§cPlugin '${pluginPath}' already exists!`);
        return;
    }
    
    // Check if we've reached the max plugins limit
    const config = getConfig();
    if (plugins.length >= config.maxPlugins) {
        player.sendMessage(`§cMaximum number of plugins (${config.maxPlugins}) reached! Please remove some plugins first.`);
        return;
    }
    
    plugins.push({ 
        path: pluginPath, 
        enabled: false, 
        description: CONFIG.defaultDescription,
        tags: CONFIG.defaultTags,
        priority: CONFIG.defaultPriority
    });
    
    pluginsDB.set("plugins", plugins);
    updateMetadata();
    
    recordPluginEvent(pluginPath, "added", { addedBy: player.name });
    
    player.sendMessage(`§aPlugin '${getPluginName(pluginPath)}' added to plugin manager. Use '!plugin enable ${pluginPath}' to enable it.`);
}

// Remove a plugin
function removePlugin(player, pluginPath) {
    if (!pluginPath) {
        player.sendMessage("§cSpecify a plugin path to remove!");
        return;
    }
    
    const plugins = getPlugins();
    const pluginIndex = plugins.findIndex(p => p.path === pluginPath);
    
    if (pluginIndex === -1) {
        player.sendMessage(`§cPlugin '${pluginPath}' not found!`);
        return;
    }
    
    const pluginName = getPluginName(pluginPath);
    
    plugins.splice(pluginIndex, 1);
    pluginsDB.set("plugins", plugins);
    updateMetadata();
    
    recordPluginEvent(pluginPath, "removed", { removedBy: player.name });
    
    player.sendMessage(`§aPlugin '${pluginName}' removed from plugin manager.`);
    
    // Notify other admins if configured
    const config = getConfig();
    if (config.notifyPluginChanges) {
        broadcastToAdmins(`§7[Plugin Manager] §f${pluginName} removed by ${player.name}`);
    }
}

// Handle backup command
function handleBackupCommand(player, arg) {
    if (!arg) {
        // Create backup
        const success = createBackup();
        if (success) {
            player.sendMessage("§aBackup created successfully!");
        } else {
            player.sendMessage("§cFailed to create backup.");
        }
        return;
    }
    
    if (arg === "list") {
        // List backups
        if (!pluginsDB.has("backups")) {
            player.sendMessage("§eNo backups available.");
            return;
        }
        
        const backups = pluginsDB.get("backups");
        player.sendMessage(`§2=== Available Backups (${backups.length}) ===`);
        
        backups.forEach((backup, index) => {
            const date = getFormattedTime(backup.timestamp);
            const pluginCount = backup.plugins.length;
            const enabledCount = backup.plugins.filter(p => p.enabled).length;
            
            player.sendMessage(`§f${index}. ${date}: §7${enabledCount}/${pluginCount} plugins enabled`);
        });
        
        player.sendMessage("\nUse §6!plugin backup restore <index>§f to restore a backup");
        return;
    }
    
    if (arg.startsWith("restore ")) {
        // Restore backup
        const indexStr = arg.substring(8);
        const index = parseInt(indexStr);
        
        if (isNaN(index)) {
            player.sendMessage("§cInvalid backup index! Use !plugin backup list to see available backups.");
            return;
        }
        
        if (!pluginsDB.has("backups")) {
            player.sendMessage("§eNo backups available.");
            return;
        }
        
        const backups = pluginsDB.get("backups");
        
        if (index < 0 || index >= backups.length) {
            player.sendMessage(`§cInvalid backup index! Available indexes: 0-${backups.length - 1}`);
            return;
        }
        
        // Create backup of current configuration first
        createBackup();
        
        // Restore from backup
        const result = restoreFromBackup(index);
        
        if (result.success) {
            const date = getFormattedTime(result.timestamp);
            player.sendMessage(`§aBackup restored successfully! Configuration from ${date} has been applied.`);
            
            // Reload plugins to apply changes
            reloadPluginsCommand(player);
        } else {
            player.sendMessage(`§cFailed to restore backup: ${result.error}`);
        }
        
        return;
    }
    
    player.sendMessage("§cInvalid backup command! Use !plugin backup, !plugin backup list, or !plugin backup restore <index>");
}

// Reload all enabled plugins (command version)
async function reloadPluginsCommand(player) {
    player.sendMessage("§6Reloading plugins...");
    
    // Clear loaded plugins to force reload
    loadedPlugins.clear();
    
    const results = await loadPrioritizedPlugins();
    
    let successCount = 0;
    let failCount = 0;
    
    results.forEach(result => {
        if (result.success) {
            successCount++;
        } else {
            failCount++;
            player.sendMessage(`§c${result.path}: ${result.error}`);
        }
    });
    
    player.sendMessage(`§aReloaded ${successCount} plugins. §c${failCount} failed.`);
    
    // Notify other admins if configured
    const config = getConfig();
    if (config.notifyPluginChanges) {
        broadcastToAdmins(`§7[Plugin Manager] §fAll plugins reloaded by ${player.name}. Success: §a${successCount}§f, Failed: §c${failCount}§f`);
    }
}

// ==================== ITEM TRIGGER SUPPORT ====================

// Open plugin manager UI when using a special item
world.afterEvents.itemUse.subscribe(ev => {
    // Check if the item is in the configured trigger items list
    if (CONFIG.triggerItems.includes(ev.itemStack.typeId) && ev.source.hasTag(CONFIG.adminTag)) {
        system.runTimeout(() => showPluginManagerUI(ev.source), CONFIG.uiTransitionDelay);
    }
});

// ==================== DISCORD COMMAND SUPPORT ====================

// Allow Discord to use the plugin command (with restrictions)
bridge.discordCommands.allow("plugin");
bridge.discordCommands.allow("plugins");

// Register with Bridge events for advanced functionality
bridge.events.chatDownStream.subscribe(event => {
    // If message contains plugin names, provide helpful info
    const plugins = getPlugins();
    
    for (const plugin of plugins) {
        const pluginName = getPluginName(plugin.path);
        if (event.message.toLowerCase().includes(pluginName.toLowerCase())) {
            // Augment the message with plugin info
            if (plugin.enabled) {
                event.message += ` (Note: ${pluginName} plugin is enabled)`;
            }
            break; // Only add info for one plugin per message
        }
    }
});

// ==================== INITIALIZATION ====================

// Set up performance monitoring interval
function setupPerformanceMonitoring() {
    if (performanceMonitorId) {
        system.clearRun(performanceMonitorId);
    }
    
    if (getConfig().performanceMonitoring) {
        performanceMonitorId = system.runInterval(() => {
            monitorPerformance();
        }, CONFIG.performanceMonitorInterval);
        
        debugLog("Performance monitoring enabled");
    } else {
        debugLog("Performance monitoring disabled");
    }
}

// Setup automatic backups
function setupAutomaticBackups() {
    const config = getConfig();
    
    if (config.backupEnabled) {
        system.runInterval(() => {
            if (getConfig().backupEnabled) {
                createBackup();
                debugLog("Created automatic backup");
            }
        }, config.backupInterval);
        
        debugLog("Automatic backups enabled");
    }
}

// Initial plugin loading on server start
system.runTimeout(async () => {
    console.log(`BedrockBridge Plugin Manager v${CONFIG.version}: Loading enabled plugins...`);
    const startTime = Date.now();
    
    const results = await loadPrioritizedPlugins();
    
    let successCount = 0;
    let failCount = 0;
    let totalLoadTime = 0;
    
    results.forEach(result => {
        if (result.success) {
            successCount++;
            const loadTime = pluginLoadTimes.get(result.path) || 0;
            totalLoadTime += loadTime;
        } else {
            failCount++;
            console.warn(`Failed to load plugin ${result.path}: ${result.error}`);
        }
    });
    
    const avgLoadTime = successCount > 0 ? Math.round(totalLoadTime / successCount) : 0;
    const totalTime = Date.now() - startTime;
    
    console.log(`BedrockBridge Plugin Manager: Loaded ${successCount} plugins in ${totalTime}ms (avg ${avgLoadTime}ms per plugin). Failed: ${failCount}`);
    
    // Add death coordinates plugin if it doesn't exist
    const plugins = getPlugins();
    if (!plugins.some(p => p.path === "./deathCoordinates")) {
        plugins.push({ 
            path: "./deathCoordinates", 
            enabled: true, 
            description: "Shows death coordinates to players when they die",
            tags: ["player", "utility"],
            category: "player",
            priority: 5
        });
        pluginsDB.set("plugins", plugins);
        importPlugin("./deathCoordinates");
        console.log("Added Death Coordinates plugin to plugin manager");
    }
    
    updateMetadata();
    
    // Set up performance monitoring
    setupPerformanceMonitoring();
    
    // Set up automatic backups
    setupAutomaticBackups();
}, 20);

console.log(`📦 BedrockBridge Plugin Manager v${CONFIG.version} initialized successfully.`);