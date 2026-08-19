/**
 * ⚙️ LANDCLAIM MEGA v4 - Advanced Configuration Manager
 * Complete configuration system with validation and defaults
 * @version 4.0.0
 */

export class ConfigManager {
    constructor(database) {
        this.db = database;

        // === GAME CONFIGURATION ===
        this.GAME = {
            // Claim Settings
            claims: {
                minRadius: 3,
                maxRadius: 50,
                maxPerPlayer: 5,
                minDistance: 2,
                costPerChunk: 50,
                autoExpire: false,
                expireDays: 30
            },

            // Member Settings
            members: {
                maxPerClaim: 20,
                costToAdd: 200,
                roles: ["owner", "member", "builder", "visitor"]
            },

            // Protection Settings
            protection: {
                blockBreakProtection: true,
                blockPlaceProtection: true,
                pvpEnabled: false,
                explosionProtection: true,
                fireSpreadProtection: true,
                fluidFlowProtection: true
            },

            // Economy Settings
            economy: {
                startBalance: 1000,
                dailyIncome: 100,
                taxRate: 5,
                interestRate: 1
            },

            // World Settings
            world: {
                enableOverworld: true,
                enableNether: true,
                enableEnd: true
            }
        };

        // === PERFORMANCE CONFIGURATION ===
        this.PERFORMANCE = {
            // Database
            database: {
                autoSaveInterval: 300000,
                chunkSize: 32000,
                backupInterval: 300000
            },

            // Spatial Grid
            spatialGrid: {
                cellSize: 32,
                rebuildInterval: 600000
            },

            // Caching
            cache: {
                territoryCache: 5000,
                searchCache: 60000,
                maxCacheSize: 10000
            },

            // Events
            events: {
                cooldownTime: 500,
                maxViolations: 1000
            }
        };

        // === ADMIN CONFIGURATION ===
        this.ADMIN = {
            // Admin Settings
            admin: {
                maxAdmins: 50,
                logActions: true,
                auditTrailSize: 50000
            },

            // Moderation
            moderation: {
                banDuration: 3600000,
                tempBanDuration: 600000,
                autobanViolations: 10,
                autobanWindow: 600000
            },

            // Server Management
            server: {
                allowClaimCreation: true,
                maintenanceMode: false,
                maintenanceMessage: "Server under maintenance"
            }
        };

        // === UI CONFIGURATION ===
        this.UI = {
            // Colors
            colors: {
                primary: "§6",
                secondary: "§b",
                success: "§a",
                error: "§c",
                info: "§f",
                warning: "§e"
            },

            // Messages
            messages: {
                claimCreated: "Claim created successfully!",
                claimDeleted: "Claim deleted successfully",
                accessDenied: "You don't have permission",
                notEnoughMoney: "Not enough money",
                claimNotFound: "Claim not found"
            }
        };

        // === FEATURE FLAGS ===
        this.FEATURES = {
            visualizer: true,
            friendsSystem: true,
            teleportation: true,
            advancedAdmin: true,
            auditTrail: true,
            autoBackup: true,
            spatialGrid: true,
            persistentStorage: true
        };

        this.loadConfig();
    }

    /**
     * Load configuration from database
     */
    loadConfig() {
        try {
            const saved = this.db.get("config:main");
            if (saved) {
                this.GAME = { ...this.GAME, ...saved.GAME };
                this.PERFORMANCE = { ...this.PERFORMANCE, ...saved.PERFORMANCE };
                this.ADMIN = { ...this.ADMIN, ...saved.ADMIN };
                this.UI = { ...this.UI, ...saved.UI };
                this.FEATURES = { ...this.FEATURES, ...saved.FEATURES };
                console.log("[ConfigManager] ✅ Loaded saved configuration");
            } else {
                this.saveConfig();
            }
        } catch (error) {
            console.error(`[ConfigManager] Error loading config: ${error}`);
        }
    }

    /**
     * Save configuration to database
     */
    saveConfig() {
        try {
            this.db.set("config:main", {
                GAME: this.GAME,
                PERFORMANCE: this.PERFORMANCE,
                ADMIN: this.ADMIN,
                UI: this.UI,
                FEATURES: this.FEATURES,
                savedAt: Date.now()
            });
            console.log("[ConfigManager] ✅ Configuration saved");
            return true;
        } catch (error) {
            console.error(`[ConfigManager] Error saving config: ${error}`);
            return false;
        }
    }

    /**
     * Get complete configuration
     */
    getAll() {
        return {
            GAME: this.GAME,
            PERFORMANCE: this.PERFORMANCE,
            ADMIN: this.ADMIN,
            UI: this.UI,
            FEATURES: this.FEATURES
        };
    }

    /**
     * Update game configuration
     */
    updateGameConfig(path, value) {
        try {
            const keys = path.split(".");
            let obj = this.GAME;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            this.saveConfig();
            return true;
        } catch (error) {
            console.error(`[ConfigManager] Error updating config: ${error}`);
            return false;
        }
    }

    /**
     * Update performance configuration
     */
    updatePerformanceConfig(path, value) {
        try {
            const keys = path.split(".");
            let obj = this.PERFORMANCE;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            this.saveConfig();
            return true;
        } catch (error) {
            console.error(`[ConfigManager] Error updating performance config: ${error}`);
            return false;
        }
    }

    /**
     * Toggle feature flag
     */
    toggleFeature(featureName) {
        try {
            if (this.FEATURES.hasOwnProperty(featureName)) {
                this.FEATURES[featureName] = !this.FEATURES[featureName];
                this.saveConfig();
                return this.FEATURES[featureName];
            }
            return false;
        } catch (error) {
            console.error(`[ConfigManager] Error toggling feature: ${error}`);
            return false;
        }
    }

    /**
     * Validate configuration
     */
    validate() {
        const issues = [];

        // Validate game config
        if (this.GAME.claims.minRadius < 1) {
            issues.push("Minimum claim radius must be at least 1");
        }
        if (this.GAME.claims.maxRadius > 100) {
            issues.push("Maximum claim radius should not exceed 100");
        }
        if (this.GAME.claims.maxPerPlayer < 1) {
            issues.push("Max claims per player must be at least 1");
        }

        // Validate economy
        if (this.GAME.economy.startBalance < 0) {
            issues.push("Start balance cannot be negative");
        }
        if (this.GAME.economy.costPerChunk < 0) {
            issues.push("Cost per chunk cannot be negative");
        }

        // Validate performance
        if (this.PERFORMANCE.database.autoSaveInterval < 30000) {
            issues.push("Auto-save interval too short (minimum 30 seconds)");
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.GAME = this.getDefaultGameConfig();
        this.PERFORMANCE = this.getDefaultPerformanceConfig();
        this.ADMIN = this.getDefaultAdminConfig();
        this.UI = this.getDefaultUIConfig();
        this.FEATURES = this.getDefaultFeatures();
        this.saveConfig();
        return true;
    }

    /**
     * Get default game configuration
     */
    getDefaultGameConfig() {
        return {
            claims: {
                minRadius: 3,
                maxRadius: 50,
                maxPerPlayer: 5,
                minDistance: 2,
                costPerChunk: 50,
                autoExpire: false,
                expireDays: 30
            },
            members: {
                maxPerClaim: 20,
                costToAdd: 200,
                roles: ["owner", "member", "builder", "visitor"]
            },
            protection: {
                blockBreakProtection: true,
                blockPlaceProtection: true,
                pvpEnabled: false,
                explosionProtection: true,
                fireSpreadProtection: true,
                fluidFlowProtection: true
            },
            economy: {
                startBalance: 1000,
                dailyIncome: 100,
                taxRate: 5,
                interestRate: 1
            },
            world: {
                enableOverworld: true,
                enableNether: true,
                enableEnd: true
            }
        };
    }

    /**
     * Get default performance configuration
     */
    getDefaultPerformanceConfig() {
        return {
            database: {
                autoSaveInterval: 300000,
                chunkSize: 32000,
                backupInterval: 300000
            },
            spatialGrid: {
                cellSize: 32,
                rebuildInterval: 600000
            },
            cache: {
                territoryCache: 5000,
                searchCache: 60000,
                maxCacheSize: 10000
            },
            events: {
                cooldownTime: 500,
                maxViolations: 1000
            }
        };
    }

    /**
     * Get default admin configuration
     */
    getDefaultAdminConfig() {
        return {
            admin: {
                maxAdmins: 50,
                logActions: true,
                auditTrailSize: 50000
            },
            moderation: {
                banDuration: 3600000,
                tempBanDuration: 600000,
                autobanViolations: 10,
                autobanWindow: 600000
            },
            server: {
                allowClaimCreation: true,
                maintenanceMode: false,
                maintenanceMessage: "Server under maintenance"
            }
        };
    }

    /**
     * Get default UI configuration
     */
    getDefaultUIConfig() {
        return {
            colors: {
                primary: "§6",
                secondary: "§b",
                success: "§a",
                error: "§c",
                info: "§f",
                warning: "§e"
            },
            messages: {
                claimCreated: "Claim created successfully!",
                claimDeleted: "Claim deleted successfully",
                accessDenied: "You don't have permission",
                notEnoughMoney: "Not enough money",
                claimNotFound: "Claim not found"
            }
        };
    }

    /**
     * Get default features
     */
    getDefaultFeatures() {
        return {
            visualizer: true,
            friendsSystem: true,
            teleportation: true,
            advancedAdmin: true,
            auditTrail: true,
            autoBackup: true,
            spatialGrid: true,
            persistentStorage: true
        };
    }

    /**
     * Export configuration as JSON
     */
    exportConfig() {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * Import configuration from JSON
     */
    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (imported.GAME) this.GAME = imported.GAME;
            if (imported.PERFORMANCE) this.PERFORMANCE = imported.PERFORMANCE;
            if (imported.ADMIN) this.ADMIN = imported.ADMIN;
            if (imported.UI) this.UI = imported.UI;
            if (imported.FEATURES) this.FEATURES = imported.FEATURES;
            this.saveConfig();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get configuration statistics
     */
    getStats() {
        return {
            gameRules: Object.keys(this.GAME).length,
            performanceSettings: Object.keys(this.PERFORMANCE).length,
            adminRules: Object.keys(this.ADMIN).length,
            uiSettings: Object.keys(this.UI).length,
            enabledFeatures: Object.values(this.FEATURES).filter(f => f).length,
            totalFeatures: Object.keys(this.FEATURES).length
        };
    }
}
