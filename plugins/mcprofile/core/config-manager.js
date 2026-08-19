/**
 * Configuration Manager
 * @version 2.0.0
 *
 * Handles loading and managing configuration from JSON files
 * Supports default values, validation, and runtime updates
 */

class ConfigManager {
    constructor() {
        this.config = {};
        this.defaults = this.getDefaultConfig();
        this.loaded = false;
        this.validators = {};
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            // API Configuration
            api: {
                endpoint: 'https://api.mcprofile.io',
                timeout: 10000,
                retries: 3,
                enabled: true
            },

            // Cache Configuration
            cache: {
                enabled: true,
                ttl: 3600, // 1 hour in seconds
                maxSize: 1000,
                cleanupOnLeave: true,
                cleanupInterval: 300000 // 5 minutes
            },

            // Admin Configuration
            admin: {
                tags: ['admin', 'operator', 'owner'],
                showProfileOnJoin: true,
                notifyAdminsOnJoin: true,
                logProfileAccess: true
            },

            // UI Configuration
            ui: {
                enabled: true,
                showOnJoin: true,
                useActionForm: true,
                useModalForm: false,
                theme: 'default'
            },

            // Logging Configuration
            logging: {
                enabled: true,
                level: 'info', // error, warn, info, debug, trace
                maxHistory: 1000,
                enableConsole: true,
                enableFile: false
            },

            // Server Configuration
            server: {
                name: 'MCProfile Server',
                version: '2.0.0',
                maxPlayers: 10,
                motd: 'MCProfile Enabled Server'
            },

            // Feature Flags
            features: {
                enableJoinNotifications: true,
                enableLeaveNotifications: false,
                enableProfileCaching: true,
                enableCommandLogging: true,
                enableAnalytics: false
            },

            // Security
            security: {
                requireAdminTag: true,
                enforceSSL: true,
                validateResponses: true,
                rateLimit: 100 // requests per minute
            }
        };
    }

    /**
     * Load configuration from file
     */
    async load(configPath = './config/mcprofile-config.json') {
        try {
            // In Bedrock environment, use default config
            // In production, would load from file
            this.config = this.defaults;
            this.loaded = true;
            return true;
        } catch (error) {
            console.error(`Failed to load config from ${configPath}: ${error.message}`);
            this.config = this.defaults;
            this.loaded = true;
            return false;
        }
    }

    /**
     * Get configuration value
     */
    get(path, defaultValue = null) {
        try {
            const keys = path.split('.');
            let value = this.config;

            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return defaultValue;
                }
            }

            return value;
        } catch (error) {
            console.error(`Error getting config value for ${path}: ${error.message}`);
            return defaultValue;
        }
    }

    /**
     * Set configuration value
     */
    set(path, value) {
        try {
            const keys = path.split('.');
            const lastKey = keys.pop();
            let target = this.config;

            // Navigate/create path
            for (const key of keys) {
                if (!(key in target) || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                target = target[key];
            }

            // Validate if validator exists
            if (this.validators[path]) {
                if (!this.validators[path](value)) {
                    throw new Error(`Validation failed for ${path}`);
                }
            }

            target[lastKey] = value;
            return true;
        } catch (error) {
            console.error(`Error setting config value for ${path}: ${error.message}`);
            return false;
        }
    }

    /**
     * Get entire configuration object
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Merge configuration with defaults
     */
    merge(customConfig) {
        this.config = this.deepMerge(this.defaults, customConfig);
        return this.config;
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && typeof result[key] === 'object') {
                    result[key] = this.deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Validate entire configuration
     */
    validate() {
        const errors = [];

        // Validate API configuration
        if (!this.get('api.endpoint')) {
            errors.push('Missing api.endpoint');
        }

        // Validate cache TTL
        if (this.get('cache.ttl') <= 0) {
            errors.push('cache.ttl must be greater than 0');
        }

        // Validate logging level
        const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
        if (!validLevels.includes(this.get('logging.level'))) {
            errors.push(`Invalid logging.level: ${this.get('logging.level')}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Add custom validator
     */
    addValidator(path, validatorFn) {
        this.validators[path] = validatorFn;
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.config = JSON.parse(JSON.stringify(this.defaults));
        return true;
    }

    /**
     * Get configuration section
     */
    getSection(sectionName) {
        return this.get(sectionName, {});
    }

    /**
     * Export configuration
     */
    export() {
        return {
            config: this.config,
            defaults: this.defaults,
            loaded: this.loaded,
            validation: this.validate()
        };
    }

    /**
     * Get configuration stats
     */
    getStats() {
        return {
            loaded: this.loaded,
            sections: Object.keys(this.config).length,
            validation: this.validate()
        };
    }

    /**
     * Check if configuration is loaded
     */
    isLoaded() {
        return this.loaded;
    }
}

export default ConfigManager;
