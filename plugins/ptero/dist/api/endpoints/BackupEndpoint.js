/**
 * Pterodactyl Bedrock Bridge - Backup Endpoint
 * Komplette Backup-Management API
 */
import { API_ENDPOINTS, CACHE_CONFIG } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';
export class BackupEndpoint {
    constructor(client) {
        this.client = client;
    }
    /**
     * List all backups for a server
     */
    async listBackups(serverId, page = 1, perPage = 25, useCache = true) {
        const cacheKey = `server:${serverId}:backups:${page}:${perPage}`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = `${API_ENDPOINTS.BACKUPS(serverId)}?page=${page}&per_page=${perPage}`;
        const response = await this.client.get(endpoint);
        if (useCache) {
            cacheManager.set(cacheKey, response, CACHE_CONFIG.BACKUP_TTL);
        }
        logger.info('Listed backups', { serverId, count: response.data?.length || 0 });
        return response;
    }
    /**
     * Get backup details
     */
    async getBackup(serverId, backupId, useCache = true) {
        const cacheKey = `server:${serverId}:backup:${backupId}`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = API_ENDPOINTS.BACKUP_DETAILS(serverId, backupId);
        const response = await this.client.get(endpoint);
        if (useCache) {
            cacheManager.set(cacheKey, response, CACHE_CONFIG.BACKUP_TTL);
        }
        logger.info('Retrieved backup details', { serverId, backupId, size: response.attributes?.bytes });
        return response;
    }
    /**
     * Create new backup
     */
    async createBackup(serverId, name, ignoredFiles, isLocked = false) {
        logger.info('Creating backup', { serverId, name, ignoredCount: ignoredFiles?.length || 0 });
        const endpoint = API_ENDPOINTS.BACKUPS(serverId);
        const response = await this.client.post(endpoint, {
            ...(name && { name }),
            ...(ignoredFiles && { ignored: ignoredFiles.join('\n') }),
            is_locked: isLocked
        });
        // Invalidate list cache
        cacheManager.invalidatePattern(`server:${serverId}:backups:`);
        logger.info('Backup creation initiated', { serverId, backupId: response.attributes?.uuid });
        return response;
    }
    /**
     * Get backup download URL
     */
    async getBackupDownloadUrl(serverId, backupId) {
        logger.info('Getting backup download URL', { serverId, backupId });
        const endpoint = API_ENDPOINTS.BACKUP_DOWNLOAD(serverId, backupId);
        const response = await this.client.get(endpoint);
        return response.attributes.url;
    }
    /**
     * Download backup
     */
    async downloadBackup(serverId, backupId) {
        const url = await this.getBackupDownloadUrl(serverId, backupId);
        logger.info('Backup download URL obtained', { serverId, backupId });
        return { url, backupId, serverId };
    }
    /**
     * Restore backup
     */
    async restoreBackup(serverId, backupId, truncate = true) {
        logger.warn('Restoring backup', { serverId, backupId, truncate });
        const endpoint = API_ENDPOINTS.BACKUP_RESTORE(serverId, backupId);
        await this.client.post(endpoint, { truncate });
        // Invalidate server cache
        cacheManager.invalidatePattern(`server:${serverId}:`);
        logger.info('Backup restore initiated', { serverId, backupId });
    }
    /**
     * Toggle backup lock status
     */
    async toggleBackupLock(serverId, backupId) {
        logger.info('Toggling backup lock', { serverId, backupId });
        const endpoint = API_ENDPOINTS.BACKUP_LOCK(serverId, backupId);
        const response = await this.client.post(endpoint, {});
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:backup:${backupId}`);
        cacheManager.invalidatePattern(`server:${serverId}:backups:`);
        logger.info('Backup lock toggled', { serverId, backupId, isLocked: response.attributes?.is_locked });
        return response;
    }
    /**
     * Lock backup
     */
    async lockBackup(serverId, backupId) {
        const backup = await this.getBackup(serverId, backupId, false);
        if (!backup.attributes.is_locked) {
            return await this.toggleBackupLock(serverId, backupId);
        }
        return backup;
    }
    /**
     * Unlock backup
     */
    async unlockBackup(serverId, backupId) {
        const backup = await this.getBackup(serverId, backupId, false);
        if (backup.attributes.is_locked) {
            return await this.toggleBackupLock(serverId, backupId);
        }
        return backup;
    }
    /**
     * Delete backup
     */
    async deleteBackup(serverId, backupId) {
        logger.warn('Deleting backup', { serverId, backupId });
        const endpoint = API_ENDPOINTS.BACKUP_DETAILS(serverId, backupId);
        await this.client.delete(endpoint);
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:backup:${backupId}`);
        cacheManager.invalidatePattern(`server:${serverId}:backups:`);
        logger.info('Backup deleted', { serverId, backupId });
    }
    /**
     * Get backup status
     */
    getBackupStatus(backup) {
        if (!backup.attributes.is_successful) {
            return 'failed';
        }
        if (backup.attributes.is_locked) {
            return 'locked';
        }
        return 'completed';
    }
    /**
     * Format backup size
     */
    formatBackupSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    /**
     * Invalidate backup cache
     */
    invalidateCache(serverId, backupId) {
        if (backupId) {
            cacheManager.invalidate(`server:${serverId}:backup:${backupId}`);
        }
        cacheManager.invalidatePattern(`server:${serverId}:backups:`);
        logger.debug('Backup cache invalidated', { serverId, backupId });
    }
}
//# sourceMappingURL=BackupEndpoint.js.map