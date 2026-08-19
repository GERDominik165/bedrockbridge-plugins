/**
 * Validation utilities for HTTP operations
 */

export class Validators {
    /**
     * Validate URL format
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate HTTP method
     */
    static isValidHttpMethod(method) {
        const validMethods = ['Get', 'Post', 'Put', 'Delete', 'Head'];
        return validMethods.includes(method);
    }

    /**
     * Validate timeout value
     */
    static isValidTimeout(timeout) {
        return typeof timeout === 'number' && timeout > 0 && timeout <= 600000; // Max 10 minutes
    }

    /**
     * Validate headers object
     */
    static isValidHeaders(headers) {
        if (!headers) return true;
        if (typeof headers !== 'object') return false;
        if (Array.isArray(headers)) return false;

        for (const [key, value] of Object.entries(headers)) {
            if (typeof key !== 'string') return false;
            if (typeof value !== 'string' && typeof value !== 'number') return false;
        }

        return true;
    }

    /**
     * Validate body content
     */
    static isValidBody(body) {
        if (body === null || body === undefined) return true;
        if (typeof body === 'string') return true;
        if (typeof body === 'object') return true;
        return false;
    }

    /**
     * Validate request configuration
     */
    static validateRequest(uri, method, options = {}) {
        const errors = [];

        // Validate URI
        if (!uri || typeof uri !== 'string') {
            errors.push('URI must be a non-empty string');
        } else if (!this.isValidUrl(uri)) {
            errors.push('Invalid URI format');
        }

        // Validate method
        if (method && !this.isValidHttpMethod(method)) {
            errors.push(`Invalid HTTP method: ${method}`);
        }

        // Validate options
        if (options.timeout && !this.isValidTimeout(options.timeout)) {
            errors.push('Invalid timeout value');
        }

        if (!this.isValidHeaders(options.headers)) {
            errors.push('Invalid headers format');
        }

        if (!this.isValidBody(options.body)) {
            errors.push('Invalid body content');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate configuration
     */
    static validateConfig(config) {
        const errors = [];

        // Validate API config
        const timeout = config.get('api.timeout');
        if (typeof timeout !== 'number' || timeout < 100 || timeout > 600000) {
            errors.push('api.timeout must be between 100 and 600000');
        }

        const maxConcurrent = config.get('api.maxConcurrentRequests');
        if (typeof maxConcurrent !== 'number' || maxConcurrent < 1 || maxConcurrent > 100) {
            errors.push('api.maxConcurrentRequests must be between 1 and 100');
        }

        const retries = config.get('api.retries');
        if (typeof retries !== 'number' || retries < 0 || retries > 10) {
            errors.push('api.retries must be between 0 and 10');
        }

        // Validate cache config
        const cacheTTL = config.get('cache.ttl');
        if (typeof cacheTTL !== 'number' || cacheTTL < 0) {
            errors.push('cache.ttl must be a non-negative number');
        }

        const cacheSize = config.get('cache.maxSize');
        if (typeof cacheSize !== 'number' || cacheSize < 1) {
            errors.push('cache.maxSize must be at least 1');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default Validators;
