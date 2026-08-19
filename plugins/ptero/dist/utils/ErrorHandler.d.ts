/**
 * Pterodactyl Bedrock Bridge - Error Handler
 * Zentrale Fehlerbehandlung mit erweiterten Informationen
 */
import { IApiErrorResponse, IApiError } from '../types';
export declare class PterodactylError extends Error {
    readonly statusCode?: number;
    readonly originalError?: any;
    readonly context?: any;
    constructor(message: string, statusCode?: number, originalError?: any, context?: any);
}
export declare class ApiError extends PterodactylError {
    readonly apiErrors: IApiError[];
    constructor(response: IApiErrorResponse, statusCode: number);
    private static formatMessage;
    getFirstError(): IApiError | null;
    getErrorByField(field: string): IApiError | null;
}
export declare class NetworkError extends PterodactylError {
    constructor(message: string, originalError?: any);
}
export declare class TimeoutError extends PterodactylError {
    constructor(timeout: number);
}
export declare class ValidationError extends PterodactylError {
    readonly violations: Map<string, string>;
    constructor(message: string, violations?: Map<string, string>);
}
export declare class ErrorHandler {
    private static instance;
    private constructor();
    static getInstance(): ErrorHandler;
    handleError(error: any): PterodactylError;
    private handleHttpError;
    logError(error: Error | PterodactylError, context?: string): void;
    getUserFriendlyMessage(error: any): string;
}
export declare const errorHandler: ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map