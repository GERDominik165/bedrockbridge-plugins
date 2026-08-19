/**
 * Pterodactyl Bedrock Bridge - Error Handler
 * Zentrale Fehlerbehandlung mit erweiterten Informationen
 */
import { logger } from './Logger';
import { ERROR_MESSAGES } from '../config/Constants';
export class PterodactylError extends Error {
    constructor(message, statusCode, originalError, context) {
        super(message);
        this.name = 'PterodactylError';
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.context = context;
    }
}
export class ApiError extends PterodactylError {
    constructor(response, statusCode) {
        const message = ApiError.formatMessage(response);
        super(message, statusCode, response);
        this.name = 'ApiError';
        this.apiErrors = response.errors || [];
    }
    static formatMessage(response) {
        if (!response.errors || response.errors.length === 0) {
            return 'API Error';
        }
        return response.errors
            .map(err => err.detail || err.code)
            .join('; ');
    }
    getFirstError() {
        return this.apiErrors[0] || null;
    }
    getErrorByField(field) {
        return this.apiErrors.find(err => err.source?.field === field) || null;
    }
}
export class NetworkError extends PterodactylError {
    constructor(message, originalError) {
        super(message, undefined, originalError);
        this.name = 'NetworkError';
    }
}
export class TimeoutError extends PterodactylError {
    constructor(timeout) {
        super(`Request timeout after ${timeout}ms`);
        this.name = 'TimeoutError';
    }
}
export class ValidationError extends PterodactylError {
    constructor(message, violations) {
        super(message);
        this.name = 'ValidationError';
        this.violations = violations || new Map();
    }
}
export class ErrorHandler {
    constructor() { }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    handleError(error) {
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
            }
            catch (e) {
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
    handleHttpError(status, message, originalError) {
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
    logError(error, context) {
        const entry = {
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
    getUserFriendlyMessage(error) {
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
//# sourceMappingURL=ErrorHandler.js.map