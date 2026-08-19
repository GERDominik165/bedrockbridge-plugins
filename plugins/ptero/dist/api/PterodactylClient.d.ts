/**
 * Pterodactyl Bedrock Bridge - HTTP Client
 * Vollständiger HTTP Wrapper mit server-net Integration
 */
import { IHttpConfig } from '../types';
export declare class PterodactylClient {
    private baseUrl;
    private apiKey;
    private timeout;
    private retryAttempts;
    private retryDelay;
    private maxRetryDelay;
    private requestCount;
    private windowStart;
    private requestQueue;
    private isProcessingQueue;
    constructor(config: IHttpConfig);
    /**
     * HTTP GET Request
     */
    get(endpoint: string): Promise<any>;
    /**
     * HTTP POST Request
     */
    post(endpoint: string, body: any): Promise<any>;
    /**
     * HTTP PATCH Request
     */
    patch(endpoint: string, body: any): Promise<any>;
    /**
     * HTTP PUT Request
     */
    put(endpoint: string, body: any): Promise<any>;
    /**
     * HTTP DELETE Request
     */
    delete(endpoint: string): Promise<any>;
    /**
     * HTTP HEAD Request
     */
    head(endpoint: string): Promise<any>;
    /**
     * Core request method with retry logic and rate limiting
     */
    private request;
    /**
     * Execute HTTP request with retry logic
     */
    private executeRequest;
    /**
     * Perform single HTTP request
     */
    private performRequest;
    /**
     * Handle HTTP response
     */
    private handleResponse;
    /**
     * Rate limiting
     */
    private checkRateLimit;
    /**
     * Process request queue
     */
    private processQueue;
    /**
     * Sleep helper
     */
    private sleep;
    /**
     * Get client stats
     */
    getStats(): {
        baseUrl: string;
        timeout: number;
        requestCount: number;
        queueSize: number;
        cacheSize: {
            size: number;
            entries: number;
        };
    };
    /**
     * Cancel all pending requests
     */
    cancelAllRequests(reason?: string): void;
}
//# sourceMappingURL=PterodactylClient.d.ts.map