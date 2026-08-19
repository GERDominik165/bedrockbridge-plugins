/**
 * HTTP Client wrapper for @minecraft/server-net
 * Provides simplified interface for HTTP requests with error handling
 */

import { http, HttpRequest, HttpHeader } from '@minecraft/server-net';

// Define HTTP methods (Bedrock uses string enum)
const HttpMethods = {
    Get: 'Get',
    Post: 'Post',
    Put: 'Put',
    Delete: 'Delete',
    Head: 'Head'
};

export class HttpClient {
    constructor(logger) {
        this.logger = logger;
        this.defaultTimeout = 10000;
        this.defaultHeaders = new Map();
        this.setupDefaultHeaders();
    }

    /**
     * Setup default headers
     */
    setupDefaultHeaders() {
        this.defaultHeaders.set('User-Agent', 'BedrocServerNet/1.0');
        this.defaultHeaders.set('Content-Type', 'application/json');
    }

    /**
     * Create HttpRequest with configuration
     */
    createRequest(uri, method = 'Get', options = {}) {
        try {
            const request = new HttpRequest(uri);

            // Set method - ensure it's a valid string
            const validMethod = HttpMethods[method] || method;
            request.setMethod(validMethod);

            // Set timeout
            const timeout = options.timeout || this.defaultTimeout;
            if (typeof timeout === 'number' && timeout > 0) {
                request.setTimeout(timeout);
            }

            // Add default headers
            for (const [key, value] of this.defaultHeaders.entries()) {
                try {
                    request.addHeader(key, String(value));
                } catch (e) {
                    this.logger.warn(`Failed to add header ${key}`, e.message);
                }
            }

            // Add custom headers
            if (options.headers && typeof options.headers === 'object') {
                for (const [key, value] of Object.entries(options.headers)) {
                    try {
                        request.addHeader(key, String(value));
                    } catch (e) {
                        this.logger.warn(`Failed to add custom header ${key}`, e.message);
                    }
                }
            }

            // Set body if provided
            if (options.body) {
                const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                request.setBody(body);
            }

            return request;
        } catch (error) {
            this.logger.error('Failed to create HTTP request', error);
            throw error;
        }
    }

    /**
     * Perform HTTP request with error handling
     */
    async request(uri, method = 'Get', options = {}) {
        try {
            this.logger.debug(`HTTP ${method} request`, { uri });

            const request = this.createRequest(uri, method, options);
            const response = await http.request(request);

            this.logger.debug(`HTTP ${method} response received`, {
                uri,
                status: response.status
            });

            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                body: response.body || '',
                headers: this.parseHeaders(response.headers),
                request: response.request
            };
        } catch (error) {
            this.logger.error(`HTTP ${method} request failed`, {
                uri,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * Parse response headers
     */
    parseHeaders(headerArray) {
        const headers = {};
        if (Array.isArray(headerArray)) {
            for (const header of headerArray) {
                if (header && header.key && header.value) {
                    headers[header.key.toLowerCase()] = header.value;
                }
            }
        }
        return headers;
    }

    /**
     * GET request
     */
    async get(uri, options = {}) {
        return this.request(uri, HttpMethods.Get, options);
    }

    /**
     * POST request
     */
    async post(uri, body = null, options = {}) {
        return this.request(uri, HttpMethods.Post, { ...options, body });
    }

    /**
     * PUT request
     */
    async put(uri, body = null, options = {}) {
        return this.request(uri, HttpMethods.Put, { ...options, body });
    }

    /**
     * DELETE request
     */
    async delete(uri, options = {}) {
        return this.request(uri, HttpMethods.Delete, options);
    }

    /**
     * HEAD request
     */
    async head(uri, options = {}) {
        return this.request(uri, HttpMethods.Head, options);
    }

    /**
     * PATCH request (using POST as fallback)
     */
    async patch(uri, body = null, options = {}) {
        // Note: Bedrock doesn't have PATCH, use POST as fallback
        return this.request(uri, HttpMethods.Post, { ...options, body });
    }

    /**
     * Set default header
     */
    setDefaultHeader(key, value) {
        this.defaultHeaders.set(key, value);
    }

    /**
     * Get default header
     */
    getDefaultHeader(key) {
        return this.defaultHeaders.get(key);
    }

    /**
     * Remove default header
     */
    removeDefaultHeader(key) {
        return this.defaultHeaders.delete(key);
    }

    /**
     * Clear all default headers
     */
    clearDefaultHeaders() {
        this.defaultHeaders.clear();
        this.setupDefaultHeaders();
    }

    /**
     * Get all default headers
     */
    getDefaultHeaders() {
        return Object.fromEntries(this.defaultHeaders);
    }
}

export default HttpClient;
