/**
 * Pterodactyl Bedrock Bridge - Logger Utility
 * Erweiterte Logging-Funktionalität mit verschiedenen Levels
 */
export declare class Logger {
    private static instance;
    private logsBuffer;
    private maxBufferSize;
    private debugMode;
    private constructor();
    static getInstance(): Logger;
    setDebugMode(enabled: boolean): void;
    debug(message: string, context?: any): void;
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, context?: any): void;
    critical(message: string, context?: any): void;
    private log;
    private getColorForLevel;
    getLogs(count?: number): string[];
    clearLogs(): void;
    getLogCount(): number;
}
export declare const logger: Logger;
//# sourceMappingURL=Logger.d.ts.map