/**
 * Request Manager - Orchestrates HTTP requests with pooling, queuing, and retry logic
 * Provides unified interface for all HTTP operations
 */

import { system } from '@minecraft/server';
import HttpClient from './http-client.js';
import RequestQueue from './request-queue.js';

export class RequestManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        this.httpClient = new HttpClient(logger);
        this.queue = new RequestQueue({
            maxConcurrent: config.get('api.maxConcurrentRequests', 5),
            maxHistory: config.get('logging.maxHistory', 100)
        });

        this.stats = {
            totalRequests: 0,
            successCount: 0,
            failureCount: 0,
            totalTime: 0,
            avgResponseTime: 0,
            lastRequest: null,
            lastSuccess: null,
            lastError: null
        };

        this.requestHistory = [];
        this.maxHistorySize = config.get('logging.maxHistory', 100);

        this.isRunning = false;
    }

    /**
     * Initialize request manager
     */
    async initialize() {
        try {
            this.isRunning = true;
            this.logger.info('RequestManager initialized', {
                maxConcurrent: this.queue.maxConcurrent,
                timeout: this.config.get('api.timeout'),
                retries: this.config.get('api.retries')
            });

            // Start processor loop in background
            this.processQueue().catch(error => {
                this.logger.error('Queue processor error', error);
            });

            return true;
        } catch (error) {
            this.logger.error('RequestManager initialization failed', error);
            return false;
        }
    }

    /**
     * Process queue continuously
     */
    async processQueue() {
        try {
            while (this.isRunning) {
                try {
                    // Dequeue next request if space available
                    const queuedRequest = this.queue.dequeue();

                    if (queuedRequest) {
                        this.executeRequest(queuedRequest).catch(error => {
                            this.logger.error('Request execution error', error);
                        });
                    }

                    // Small delay to prevent CPU spinning (1 tick = ~50ms in Bedrock)
                    await new Promise(resolve => system.runTimeout(resolve, 1));
                } catch (loopError) {
                    this.logger.error('Queue processing loop error', loopError);
                    // Continue processing despite error (delay 2 ticks = ~100ms)
                    await new Promise(resolve => system.runTimeout(resolve, 2));
                }
            }
        } catch (error) {
            this.logger.error('Queue processor fatal error', error);
        }
    }

    /**
     * Execute single request with retries
     */
    async executeRequest(queuedRequest) {
        try {
            if (!queuedRequest || !queuedRequest.id || !queuedRequest.request) {
                this.logger.error('Invalid queued request');
                return;
            }

            const { id, request } = queuedRequest;
            const maxRetries = this.config.get('api.retries', 3);
            const retryDelay = this.config.get('api.retryDelay', 1000);

            if (!id || !request || !request.uri) {
                this.logger.error('Request missing required fields', { id });
                return;
            }

            let lastError = null;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    this.logger.debug(`Executing request ${id}`, { attempt: attempt + 1, maxRetries: maxRetries + 1 });

                    const result = await this.httpClient.request(
                        String(request.uri),
                        String(request.method || 'Get'),
                        {
                            timeout: request.timeout || this.config.get('api.timeout', 10000),
                            headers: this.parseHeaders(request.headers),
                            body: request.body
                        }
                    );

                    // Track successful request
                    this.recordSuccess(queuedRequest, result);
                    this.queue.complete(id, result);

                    return;
                } catch (error) {
                    lastError = error;
                    this.logger.warn(`Request ${id} attempt ${attempt + 1} failed`, {
                        error: error ? error.message : 'unknown error'
                    });

                    // Don't retry on last attempt
                    if (attempt < maxRetries) {
                        const delay = retryDelay * (attempt + 1); // Exponential backoff
                        // Convert milliseconds to ticks (1 tick ≈ 50ms)
                        const ticks = Math.max(1, Math.ceil(delay / 50));
                        await new Promise(resolve => system.runTimeout(resolve, ticks));
                    } else {
                        // Final attempt failed
                        this.recordFailure(queuedRequest, lastError);
                        this.queue.fail(id, lastError);
                    }
                }
            }
        } catch (outerError) {
            this.logger.error('Request execution outer error', outerError);
        }
    }

    /**
     * Parse request headers - Safe version
     */
    parseHeaders(headerArray) {
        try {
            const headers = {};
            if (Array.isArray(headerArray)) {
                for (const header of headerArray) {
                    if (header && header.key && header.value) {
                        headers[String(header.key)] = String(header.value);
                    }
                }
            }
            return headers;
        } catch (error) {
            this.logger.warn('Header parsing error', error);
            return {};
        }
    }

    /**
     * Record successful request - Safe version
     */
    recordSuccess(queuedRequest, result) {
        try {
            if (!queuedRequest || !result) return;

            const duration = (queuedRequest.completedAt && queuedRequest.startedAt)
                ? (queuedRequest.completedAt - queuedRequest.startedAt)
                : 0;

            this.stats.successCount++;
            this.stats.totalTime += duration;
            this.stats.avgResponseTime = this.stats.successCount > 0
                ? this.stats.totalTime / this.stats.successCount
                : 0;
            this.stats.lastSuccess = Date.now();

            this.addToHistory({
                id: queuedRequest.id || 'unknown',
                status: 'success',
                uri: (queuedRequest.request && queuedRequest.request.uri) || 'unknown',
                method: (queuedRequest.request && queuedRequest.request.method) || 'Get',
                statusCode: result.status || 0,
                duration,
                timestamp: Date.now()
            });

            this.logger.info(`Request completed successfully`, {
                id: queuedRequest.id,
                uri: (queuedRequest.request && queuedRequest.request.uri) || 'unknown',
                status: result.status || 0,
                duration
            });
        } catch (error) {
            this.logger.error('recordSuccess error', error);
        }
    }

    /**
     * Record failed request - Safe version
     */
    recordFailure(queuedRequest, error) {
        try {
            if (!queuedRequest) return;

            this.stats.failureCount++;
            this.stats.lastError = Date.now();

            this.addToHistory({
                id: queuedRequest.id || 'unknown',
                status: 'failed',
                uri: (queuedRequest.request && queuedRequest.request.uri) || 'unknown',
                method: (queuedRequest.request && queuedRequest.request.method) || 'Get',
                error: (error && error.message) || 'unknown error',
                timestamp: Date.now()
            });

            this.logger.error(`Request failed`, {
                id: queuedRequest.id || 'unknown',
                uri: (queuedRequest.request && queuedRequest.request.uri) || 'unknown',
                error: (error && error.message) || 'unknown error'
            });
        } catch (outerError) {
            this.logger.error('recordFailure error', outerError);
        }
    }

    /**
     * Add to request history - Safe version
     */
    addToHistory(entry) {
        try {
            if (!entry) return;
            this.requestHistory.push(entry);
            if (this.requestHistory.length > this.maxHistorySize) {
                this.requestHistory.shift();
            }
        } catch (error) {
            this.logger.warn('History add error', error);
        }
    }

    /**
     * Queue a request
     */
    queueRequest(uri, method = 'Get', options = {}) {
        try {
            const request = {
                uri,
                method: String(method),
                timeout: options.timeout || this.config.get('api.timeout', 10000),
                headers: this.createHeaders(options.headers),
                body: options.body || null,
                priority: options.priority || 0
            };

            const id = this.queue.enqueue(request);
            this.stats.totalRequests++;
            this.stats.lastRequest = Date.now();

            this.logger.debug(`Request queued`, { id, uri, method });

            return id;
        } catch (error) {
            this.logger.error('Failed to queue request', error);
            throw error;
        }
    }

    /**
     * Create header array
     */
    createHeaders(customHeaders = {}) {
        const headers = [];

        try {
            // Add default headers
            const defaultHeaders = this.httpClient.getDefaultHeaders();
            if (defaultHeaders) {
                for (const [key, value] of Object.entries(defaultHeaders)) {
                    headers.push({ key: String(key), value: String(value) });
                }
            }

            // Add custom headers
            if (typeof customHeaders === 'object' && customHeaders) {
                for (const [key, value] of Object.entries(customHeaders)) {
                    headers.push({ key: String(key), value: String(value) });
                }
            }
        } catch (error) {
            this.logger.error('Failed to create headers', error);
        }

        return headers;
    }

    /**
     * GET request
     */
    get(uri, options = {}) {
        return this.queueRequest(uri, 'Get', options);
    }

    /**
     * POST request
     */
    post(uri, body = null, options = {}) {
        return this.queueRequest(uri, 'Post', { ...options, body });
    }

    /**
     * PUT request
     */
    put(uri, body = null, options = {}) {
        return this.queueRequest(uri, 'Put', { ...options, body });
    }

    /**
     * DELETE request
     */
    delete(uri, options = {}) {
        return this.queueRequest(uri, 'Delete', options);
    }

    /**
     * HEAD request
     */
    head(uri, options = {}) {
        return this.queueRequest(uri, 'Head', options);
    }

    /**
     * Get request status
     */
    getRequestStatus(id) {
        return this.queue.getStatus(id);
    }

    /**
     * Cancel request
     */
    cancelRequest(id, reason = 'Cancelled by user') {
        return this.queue.cancel(id, reason);
    }

    /**
     * Cancel all pending requests
     */
    cancelAll(reason = 'All requests cancelled') {
        return this.queue.cancelAll(reason);
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return this.queue.getQueueStatus();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            ...this.queue.getStats()
        };
    }

    /**
     * Get request history
     */
    getHistory(count = 50, type = 'all') {
        if (type === 'all') {
            return this.requestHistory.slice(-count);
        }

        return this.requestHistory
            .filter(r => r.status === type)
            .slice(-count);
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.requestHistory = [];
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successCount: 0,
            failureCount: 0,
            totalTime: 0,
            avgResponseTime: 0,
            lastRequest: null,
            lastSuccess: null,
            lastError: null
        };
    }

    /**
     * Get health status - Safe version
     */
    getHealthStatus() {
        try {
            const stats = this.getStats() || {};
            const totalRequests = stats.totalRequests || 0;
            const successCount = stats.successCount || 0;
            const successRate = totalRequests > 0
                ? parseFloat((successCount / totalRequests * 100).toFixed(2))
                : 0;

            let health = 'poor';
            if (successRate > 90) health = 'excellent';
            else if (successRate > 70) health = 'good';

            return {
                running: this.isRunning === true,
                health: health,
                successRate: `${successRate}%`,
                stats: stats
            };
        } catch (error) {
            this.logger.error('getHealthStatus error', error);
            return {
                running: false,
                health: 'unknown',
                successRate: '0%',
                stats: this.stats || {}
            };
        }
    }

    /**
     * Shutdown request manager - Safe version
     */
    async shutdown() {
        try {
            if (this.logger) {
                this.logger.info('Shutting down RequestManager');
            }

            this.isRunning = false;

            // Cancel all pending requests
            if (this.queue && this.queue.cancelAll) {
                this.queue.cancelAll('Manager shutting down');
            }

            if (this.logger) {
                this.logger.info('RequestManager shutdown complete', {
                    stats: this.getStats()
                });
            }
        } catch (error) {
            console.error('[RequestManager] Shutdown error:', error);
        }
    }
}

export default RequestManager;
