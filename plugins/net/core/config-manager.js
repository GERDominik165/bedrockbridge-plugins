/**
 * Configuration management system with nested property access
 * Supports loading from and saving to JSON files
 */

export class ConfigManager {
    constructor(filePath = './config/settings.json') {
        this.filePath = filePath;
        this.data = {};
        this.defaults = {
            api: {
                timeout: 10000,
                retries: 3,
                retryDelay: 1000,
                maxConcurrentRequests: 5,
                enabled: true
            },
            cache: {
                enabled: true,
                ttl: 3600,
                maxSize: 1000,
                cleanupInterval: 300
            },
            logging: {
                enabled: true,
                level: 'info',
                maxHistory: 1000
            },
            ui: {
                enabled: true,
                theme: 'default'
            },
            security: {
                requireAdminTag: true,
                enableSSL: true
            },
            features: {
                enableRequestHistory: true,
                enableStatistics: true,
                enableHealthCheck: true
            }
        };
    }

    /**
     * Load configuration (default or custom)
     */
    load(config = null) {
        if (config && typeof config === 'object') {
            this.data = this.deepMerge(this.defaults, config);
        } else {
            this.data = JSON.parse(JSON.stringify(this.defaults));
        }
        return this.data;
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        const result = JSON.parse(JSON.stringify(target));

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Get value by path (e.g., "api.timeout")
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = this.data;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Set value by path (e.g., "api.timeout", 15000)
     */
    set(path, value) {
        const keys = path.split('.');
        let current = this.data;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return true;
    }

    /**
     * Check if value exists
     */
    has(path) {
        const keys = path.split('.');
        let value = this.data;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return false;
            }
        }

        return true;
    }

    /**
     * Get entire section
     */
    getSection(section) {
        return this.get(section, {});
    }

    /**
     * Get all configuration
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.data));
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.data = JSON.parse(JSON.stringify(this.defaults));
        return this.data;
    }

    /**
     * Reset specific section
     */
    resetSection(section) {
        if (section in this.defaults) {
            this.set(section, JSON.parse(JSON.stringify(this.defaults[section])));
        }
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];

        // Validate API config
        if (typeof this.get('api.timeout') !== 'number' || this.get('api.timeout') < 100) {
            errors.push('api.timeout must be a number >= 100');
        }

        if (typeof this.get('api.maxConcurrentRequests') !== 'number' || this.get('api.maxConcurrentRequests') < 1) {
            errors.push('api.maxConcurrentRequests must be a number >= 1');
        }

        // Validate cache config
        if (typeof this.get('cache.ttl') !== 'number' || this.get('cache.ttl') < 0) {
            errors.push('cache.ttl must be a non-negative number');
        }

        if (typeof this.get('cache.maxSize') !== 'number' || this.get('cache.maxSize') < 1) {
            errors.push('cache.maxSize must be a number >= 1');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get validation errors if any
     */
    getValidationResult() {
        return this.validate();
    }
}

export default ConfigManager;
