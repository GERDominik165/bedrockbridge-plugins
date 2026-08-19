/**
 * Pterodactyl Bedrock Bridge - Backup Endpoint
 * Komplette Backup-Management API
 */
import { PterodactylClient } from '../PterodactylClient';
import { IBackup, IBackupListResponse } from '../../types';
export declare class BackupEndpoint {
    private client;
    constructor(client: PterodactylClient);
    /**
     * List all backups for a server
     */
    listBackups(serverId: string, page?: number, perPage?: number, useCache?: boolean): Promise<IBackupListResponse>;
    /**
     * Get backup details
     */
    getBackup(serverId: string, backupId: string, useCache?: boolean): Promise<IBackup>;
    /**
     * Create new backup
     */
    createBackup(serverId: string, name?: string, ignoredFiles?: string[], isLocked?: boolean): Promise<IBackup>;
    /**
     * Get backup download URL
     */
    getBackupDownloadUrl(serverId: string, backupId: string): Promise<string>;
    /**
     * Download backup
     */
    downloadBackup(serverId: string, backupId: string): Promise<any>;
    /**
     * Restore backup
     */
    restoreBackup(serverId: string, backupId: string, truncate?: boolean): Promise<void>;
    /**
     * Toggle backup lock status
     */
    toggleBackupLock(serverId: string, backupId: string): Promise<IBackup>;
    /**
     * Lock backup
     */
    lockBackup(serverId: string, backupId: string): Promise<IBackup>;
    /**
     * Unlock backup
     */
    unlockBackup(serverId: string, backupId: string): Promise<IBackup>;
    /**
     * Delete backup
     */
    deleteBackup(serverId: string, backupId: string): Promise<void>;
    /**
     * Get backup status
     */
    getBackupStatus(backup: IBackup): string;
    /**
     * Format backup size
     */
    formatBackupSize(bytes: number): string;
    /**
     * Invalidate backup cache
     */
    invalidateCache(serverId: string, backupId?: string): void;
}
//# sourceMappingURL=BackupEndpoint.d.ts.map