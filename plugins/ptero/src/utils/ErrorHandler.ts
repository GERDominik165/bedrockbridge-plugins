/**
 * Pterodactyl Bedrock Bridge - Error Handler
 * Zentrale Fehlerbehandlung mit erweiterten Informationen
 */

import { IApiErrorResponse, IApiError } from '../types';
import { logger } from './Logger';
import { ERROR_MESSAGES } from '../config/Constants';

export class PterodactylError extends Error {
  public readonly statusCode?: number;
  public readonly originalError?: any;
  public readonly context?: any;

  constructor(message: string, statusCode?: number, originalError?: any, context?: any) {
    super(message);
    this.name = 'PterodactylError';
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;
  }
}

export class ApiError extends PterodactylError {
  public readonly apiErrors: IApiError[];

  constructor(response: IApiErrorResponse, statusCode: number) {
    const message = ApiError.formatMessage(response);
    super(message, statusCode, response);
    this.name = 'ApiError';
    this.apiErrors = response.errors || [];
  }

  private static formatMessage(response: IApiErrorResponse): string {
    if (!response.errors || response.errors.length === 0) {
      return 'API Error';
    }

    return response.errors
      .map(err => err.detail || err.code)
      .join('; ');
  }

  getFirstError(): IApiError | null {
    return this.apiErrors[0] || null;
  }

  getErrorByField(field: string): IApiError | null {
    return this.apiErrors.find(err => err.source?.field === field) || null;
  }
}

export class NetworkError extends PterodactylError {
  constructor(message: string, originalError?: any) {
    super(message, undefined, originalError);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends PterodactylError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends PterodactylError {
  public readonly violations: Map<string, string>;

  constructor(message: string, violations?: Map<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.violations = violations || new Map();
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: any): PterodactylError {
    // Already a PterodactylError
    if (error instanceof PterodactylError) {
      return error;
    }

    // API Error Response
    if (error.response) {
      try {
        const body = JSON.parse(error.response);
        if (body.errors) {
          return new ApiError(body, error.status || 400);
        }
      } catch (e) {
        // Not JSON
      }
    }

    // HTTP Status Code
    if (error.status) {
      return this.handleHttpError(error.status, error.message, error);
    }

    // Generic Error
    logger.error('Unhandled error', { error: error.message || String(error) });
    return new PterodactylError(error.message || 'Unknown error', undefined, error);
  }

  private handleHttpError(status: number, message?: string, originalError?: any): PterodactylError {
    let errorMsg = message || 'HTTP Error';

    switch (status) {
      case 400:
        errorMsg = ERROR_MESSAGES.INVALID_REQUEST;
        break;
      case 401:
        errorMsg = ERROR_MESSAGES.INVALID_CREDENTIALS;
        break;
      case 403:
        errorMsg = ERROR_MESSAGES.FORBIDDEN;
        break;
      case 404:
        errorMsg = ERROR_MESSAGES.SERVER_NOT_FOUND;
        break;
      case 429:
        errorMsg = ERROR_MESSAGES.RATE_LIMIT;
        break;
      case 500:
        errorMsg = ERROR_MESSAGES.SERVER_ERROR;
        break;
      case 502:
      case 503:
      case 504:
        errorMsg = ERROR_MESSAGES.NETWORK_ERROR;
        break;
    }

    logger.error(`HTTP Error ${status}`, { message: errorMsg });
    return new PterodactylError(errorMsg, status, originalError);
  }

  logError(error: Error | PterodactylError, context?: string): void {
    const entry: Record<string, any> = {
      name: error.name,
      message: error.message,
      context: context,
      timestamp: new Date().toISOString()
    };

    if (error instanceof PterodactylError && error.statusCode) {
      entry['statusCode'] = error.statusCode;
    }

    logger.error(`Error: ${error.message}`, entry);
  }

  getUserFriendlyMessage(error: any): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    if (error instanceof TimeoutError) {
      return ERROR_MESSAGES.TIMEOUT;
    }

    if (error instanceof ValidationError) {
      const violations = Array.from(error.violations.entries())
        .map(([field, msg]) => `${field}: ${msg}`)
        .join('\n');
      return violations || ERROR_MESSAGES.INVALID_REQUEST;
    }

    if (error instanceof PterodactylError) {
      return error.message;
    }

    return ERROR_MESSAGES.API_ERROR;
  }
}

export const errorHandler = ErrorHandler.getInstance();
