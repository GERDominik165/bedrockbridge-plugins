/**
 * Pterodactyl Bedrock Bridge - Database Endpoint
 * Komplette Datenbank-Management API
 */
import { PterodactylClient } from '../PterodactylClient';
import { IDatabase, IDatabaseListResponse } from '../../types';
export declare class DatabaseEndpoint {
    private client;
    constructor(client: PterodactylClient);
    /**
     * List all databases for a server
     */
    listDatabases(serverId: string, page?: number, perPage?: number, useCache?: boolean): Promise<IDatabaseListResponse>;
    /**
     * Get database details
     */
    getDatabase(serverId: string, databaseId: string, useCache?: boolean): Promise<IDatabase>;
    /**
     * Create new database
     */
    createDatabase(serverId: string, database: string, remote?: string): Promise<IDatabase>;
    /**
     * Rotate database password
     */
    rotateDatabasePassword(serverId: string, databaseId: string): Promise<IDatabase>;
    /**
     * Delete database
     */
    deleteDatabase(serverId: string, databaseId: string): Promise<void>;
    /**
     * Invalidate database cache
     */
    invalidateCache(serverId: string, databaseId?: string): void;
    /**
     * Get database password (from relationships)
     */
    getDatabasePassword(database: IDatabase): string | null;
}
//# sourceMappingURL=DatabaseEndpoint.d.ts.map