/**
 * Pterodactyl Bedrock Bridge - HTTP Client
 * Vollständiger HTTP Wrapper mit server-net Integration
 */

import { http, HttpRequest, HttpHeader, HttpRequestMethod } from '@minecraft/server-net';
import { IHttpConfig, IApiErrorResponse } from '../types';
import { HTTP_DEFAULTS, RATE_LIMITS } from '../config/Constants';
import { logger } from '../utils/Logger';
import { ApiError, NetworkError, TimeoutError, errorHandler, PterodactylError } from '../utils/ErrorHandler';
import { cacheManager } from '../utils/Cache';

export class PterodactylClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private maxRetryDelay: number;
  private requestCount = 0;
  private windowStart = Date.now();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: IHttpConfig) {
    this.baseUrl = config.panelUrl.replace(/\/$/, '');
    this.apiKey = REDACTED
    this.timeout = config.timeout ?? HTTP_DEFAULTS.TIMEOUT;
    this.retryAttempts = config.retryAttempts ?? HTTP_DEFAULTS.RETRY_ATTEMPTS;
    this.retryDelay = config.retryDelay ?? HTTP_DEFAULTS.RETRY_DELAY;
    this.maxRetryDelay = HTTP_DEFAULTS.MAX_RETRY_DELAY;

    logger.info('PterodactylClient initialized', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts
    });

    // Rate limit reset every minute
    setInterval(() => {
      this.windowStart = Date.now();
      this.requestCount = 0;
    }, 60000);
  }

  /**
   * HTTP GET Request
   */
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, HttpRequestMethod.Get, null);
  }

  /**
   * HTTP POST Request
   */
  async post(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, HttpRequestMethod.Post, body);
  }

  /**
   * HTTP PATCH Request
   */
  async patch(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, HttpRequestMethod.Patch, body, 'PATCH');
  }

  /**
   * HTTP PUT Request
   */
  async put(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, HttpRequestMethod.Put, body);
  }

  /**
   * HTTP DELETE Request
   */
  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, HttpRequestMethod.Delete, null);
  }

  /**
   * HTTP HEAD Request
   */
  async head(endpoint: string): Promise<any> {
    return this.request(endpoint, HttpRequestMethod.Head, null);
  }

  /**
   * Core request method with retry logic and rate limiting
   */
  private async request(
    endpoint: string,
    method: HttpRequestMethod,
    body: any | null,
    overrideMethod?: string
  ): Promise<any> {
    // Check rate limits
    await this.checkRateLimit();

    // Queue the request
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await this.executeRequest(endpoint, method, body, overrideMethod);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest(
    endpoint: string,
    method: HttpRequestMethod,
    body: any | null,
    overrideMethod?: string
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.performRequest(endpoint, method, body, overrideMethod);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (except 408, 429)
        if (error instanceof ApiError) {
          const status = error.statusCode;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            throw error;
          }
        }

        if (attempt < this.retryAttempts) {
          const delay = Math.min(
            this.retryDelay * Math.pow(2, attempt),
            this.maxRetryDelay
          );

          logger.warn(`Request failed, retrying in ${delay}ms`, {
            endpoint,
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : String(error)
          });

          await this.sleep(delay);
        }
      }
    }

    throw lastError || new PterodactylError('Request failed after all retries');
  }

  /**
   * Perform single HTTP request
   */
  private async performRequest(
    endpoint: string,
    method: HttpRequestMethod,
    body: any | null,
    overrideMethod?: string
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const request = new HttpRequest(url);

    // Set method
    if (overrideMethod === 'PATCH') {
      // Note: server-net might not support PATCH natively, so we use POST with header
      request.method = HttpRequestMethod.Post;
      request.addHeader('X-HTTP-Method-Override', 'PATCH');
    } else {
      request.method = method;
    }

    // Set headers
    request.addHeader('Authorization', `Bearer ${this.apiKey}`);
    request.addHeader('Accept', 'Application/vnd.pterodactyl.v1+json');
    request.addHeader('Content-Type', 'application/json');
    request.addHeader('User-Agent', 'BedrockBridge/1.0.0 (+https://github.com/bedrock-bridge)');

    // Set timeout
    request.setTimeout(this.timeout);

    // Set body
    if (body) {
      request.setBody(JSON.stringify(body));
    }

    logger.debug(`HTTP ${method} ${endpoint}`);

    // Execute request
    try {
      const response = await http.request(request);
      return this.handleResponse(response, endpoint);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new TimeoutError(this.timeout * 1000);
      }
      throw new NetworkError(`Network error: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }

  /**
   * Handle HTTP response
   */
  private handleResponse(response: any, endpoint: string): any {
    const status = response.status;
    const body = response.body;

    logger.debug(`HTTP Response ${status}`, { endpoint, size: body?.length || 0 });

    // Check status code
    if (status >= 400) {
      try {
        const errorData = JSON.parse(body);
        if (errorData.errors) {
          throw new ApiError(errorData, status);
        }
      } catch (parseError) {
        // Not JSON
      }

      throw new PterodactylError(`HTTP ${status}: ${body || 'Unknown error'}`, status);
    }

    // Parse response body
    if (!body || body.trim() === '') {
      return null;
    }

    try {
      return JSON.parse(body);
    } catch (parseError) {
      logger.error('Failed to parse response', { endpoint, error: String(parseError) });
      throw new PterodactylError('Invalid response format', 500);
    }
  }

  /**
   * Rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowAge = now - this.windowStart;

    // Reset window if 60 seconds passed
    if (windowAge > 60000) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - windowAge;
      logger.warn(`Rate limit reached, waiting ${waitTime}ms`, {
        requests: this.requestCount,
        limit: RATE_LIMITS.REQUESTS_PER_MINUTE
      });

      await this.sleep(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          logger.error('Queue processing error', { error: String(error) });
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get client stats
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      requestCount: this.requestCount,
      queueSize: this.requestQueue.length,
      cacheSize: cacheManager.getStats()
    };
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(reason: string = 'Client shutdown'): void {
    // Clear the request queue since http.cancelAll() is not available in server-net
    this.requestQueue = [];
    logger.info('All pending requests cleared', { reason, queueSize: this.requestQueue.length });
  }
}
