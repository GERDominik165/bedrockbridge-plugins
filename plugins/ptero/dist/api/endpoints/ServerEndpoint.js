/**
 * Pterodactyl Bedrock Bridge - Server Endpoint
 * Komplette Server-Management API
 */
import { ServerPowerState } from '../../types';
import { API_ENDPOINTS, CACHE_CONFIG } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';
export class ServerEndpoint {
    constructor(client) {
        this.client = client;
    }
    /**
     * List all servers
     */
    async listServers(page = 1, perPage = 25, useCache = true) {
        const cacheKey = `servers:list:${page}:${perPage}`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = `${API_ENDPOINTS.SERVERS}?page=${page}&per_page=${perPage}&include=allocations,variables`;
        const response = await this.client.get(endpoint);
        if (useCache) {
            cacheManager.set(cacheKey, response, CACHE_CONFIG.SERVER_LIST_TTL);
        }
        logger.info('Listed servers', { page, perPage, count: response.data?.length || 0 });
        return response;
    }
    /**
     * Get server details
     */
    async getServer(serverId, useCache = true) {
        const cacheKey = `server:${serverId}:details`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = API_ENDPOINTS.SERVER_DETAILS(serverId) + '?include=allocations,variables';
        const response = await this.client.get(endpoint);
        if (useCache) {
            cacheManager.set(cacheKey, response, CACHE_CONFIG.SERVER_DETAILS_TTL);
        }
        logger.info('Retrieved server details', { serverId, name: response.attributes?.name });
        return response;
    }
    /**
     * Get server resources and status
     */
    async getResources(serverId, useCache = true) {
        const cacheKey = `server:${serverId}:resources`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = API_ENDPOINTS.RESOURCES(serverId);
        const response = await this.client.get(endpoint);
        if (useCache) {
            cacheManager.set(cacheKey, response, CACHE_CONFIG.RESOURCES_TTL);
        }
        return response;
    }
    /**
     * Change server power state
     */
    async setPowerState(serverId, action) {
        logger.info('Setting power state', { serverId, action });
        const endpoint = API_ENDPOINTS.POWER(serverId);
        await this.client.post(endpoint, { signal: action });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:resources`);
        logger.info('Power state changed', { serverId, action });
    }
    /**
     * Start server
     */
    async start(serverId) {
        await this.setPowerState(serverId, ServerPowerState.START);
    }
    /**
     * Stop server
     */
    async stop(serverId) {
        await this.setPowerState(serverId, ServerPowerState.STOP);
    }
    /**
     * Restart server
     */
    async restart(serverId) {
        await this.setPowerState(serverId, ServerPowerState.RESTART);
    }
    /**
     * Kill server (force stop)
     */
    async kill(serverId) {
        await this.setPowerState(serverId, ServerPowerState.KILL);
    }
    /**
     * Send command to server
     */
    async sendCommand(serverId, command) {
        logger.info('Sending command', { serverId, commandLength: command.length });
        const endpoint = API_ENDPOINTS.COMMAND(serverId);
        await this.client.post(endpoint, { command });
    }
    /**
     * Get WebSocket token for console access
     */
    async getWebSocketToken(serverId) {
        logger.info('Requesting WebSocket token', { serverId });
        const endpoint = API_ENDPOINTS.WEBSOCKET(serverId);
        const response = await this.client.get(endpoint);
        return response;
    }
    /**
     * Rename server
     */
    async renameServer(serverId, name, description) {
        logger.info('Renaming server', { serverId, newName: name });
        const endpoint = API_ENDPOINTS.SERVER_DETAILS(serverId) + '/settings/rename';
        await this.client.post(endpoint, {
            name,
            ...(description && { description })
        });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:details`);
    }
    /**
     * Reinstall server
     */
    async reinstallServer(serverId) {
        logger.warn('Reinstalling server', { serverId });
        const endpoint = API_ENDPOINTS.SERVER_DETAILS(serverId) + '/settings/reinstall';
        await this.client.post(endpoint, {});
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:details`);
    }
    /**
     * Update server Docker image
     */
    async setDockerImage(serverId, dockerImage) {
        logger.info('Updating Docker image', { serverId, image: dockerImage });
        const endpoint = API_ENDPOINTS.SERVER_DETAILS(serverId) + '/settings/docker-image';
        await this.client.put(endpoint, { docker_image: dockerImage });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:details`);
    }
    /**
     * Get server startup configuration
     */
    async getStartupConfiguration(serverId, useCache = true) {
        const cacheKey = `server:${serverId}:startup`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = API_ENDPOINTS.SERVER_DETAILS(serverId) + '/startup';
        const response = await this.client.get(endpoint);
        const variables = response.data || [];
        if (useCache) {
            cacheManager.set(cacheKey, variables, CACHE_CONFIG.SERVER_DETAILS_TTL);
        }
        return variables;
    }
    /**
     * Update startup variable
     */
    async updateStartupVariable(serverId, key, value) {
        logger.info('Updating startup variable', { serverId, key });
        const endpoint = API_ENDPOINTS.SERVER_DETAILS(serverId) + '/startup/variable';
        const response = await this.client.put(endpoint, { key, value });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:startup`);
        return response;
    }
    /**
     * List files in directory
     */
    async listFiles(serverId, directory = '/', useCache = true) {
        const cacheKey = `server:${serverId}:files:${directory}`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = API_ENDPOINTS.FILES_LIST(serverId, directory);
        const response = await this.client.get(endpoint);
        const files = response.data || [];
        if (useCache) {
            cacheManager.set(cacheKey, files, CACHE_CONFIG.FILES_TTL);
        }
        return files;
    }
    /**
     * Get file contents
     */
    async getFileContents(serverId, filePath) {
        logger.info('Reading file', { serverId, file: filePath });
        const endpoint = API_ENDPOINTS.FILES_CONTENTS(serverId, filePath);
        return await this.client.get(endpoint);
    }
    /**
     * Write file contents
     */
    async writeFileContents(serverId, filePath, content) {
        logger.info('Writing file', { serverId, file: filePath, size: content.length });
        const endpoint = API_ENDPOINTS.FILES_WRITE(serverId, filePath);
        await this.client.post(endpoint, content);
        // Invalidate file cache
        cacheManager.invalidate(`server:${serverId}:files:`);
    }
    /**
     * Create directory
     */
    async createDirectory(serverId, directory, name) {
        logger.info('Creating directory', { serverId, directory, name });
        const endpoint = API_ENDPOINTS.FILES_CREATE_FOLDER(serverId);
        await this.client.post(endpoint, {
            root: directory,
            name
        });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:files:`);
    }
    /**
     * Delete files or directories
     */
    async deleteFiles(serverId, directory, files) {
        logger.info('Deleting files', { serverId, directory, count: files.length });
        const endpoint = API_ENDPOINTS.FILES_DELETE(serverId);
        await this.client.post(endpoint, {
            root: directory,
            files
        });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:files:`);
    }
    /**
     * Rename file or directory
     */
    async renameFile(serverId, directory, from, to) {
        logger.info('Renaming file', { serverId, directory, from, to });
        const endpoint = API_ENDPOINTS.FILES_RENAME(serverId);
        await this.client.put(endpoint, {
            root: directory,
            files: [{ from, to }]
        });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:files:`);
    }
    /**
     * Copy file or directory
     */
    async copyFile(serverId, location) {
        logger.info('Copying file', { serverId, location });
        const endpoint = API_ENDPOINTS.FILES_LIST(serverId) + '/copy';
        await this.client.post(endpoint, { location });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:files:`);
    }
    /**
     * Compress files
     */
    async compressFiles(serverId, directory, files) {
        logger.info('Compressing files', { serverId, directory, count: files.length });
        const endpoint = API_ENDPOINTS.FILES_COMPRESS(serverId);
        const response = await this.client.post(endpoint, {
            root: directory,
            files
        });
        return response.attributes;
    }
    /**
     * Decompress archive
     */
    async decompressArchive(serverId, directory, file) {
        logger.info('Decompressing archive', { serverId, directory, file });
        const endpoint = API_ENDPOINTS.FILES_DECOMPRESS(serverId);
        await this.client.post(endpoint, {
            root: directory,
            file
        });
        // Invalidate cache
        cacheManager.invalidate(`server:${serverId}:files:`);
    }
    /**
     * Change file permissions
     */
    async changeFilePermissions(serverId, directory, mode, files) {
        logger.info('Changing file permissions', { serverId, directory, mode, count: files.length });
        const endpoint = API_ENDPOINTS.FILES_CHMOD(serverId);
        await this.client.post(endpoint, {
            root: directory,
            files: files.map(file => ({ file, mode }))
        });
    }
    /**
     * Get upload URL
     */
    async getUploadUrl(serverId, directory = '/') {
        logger.info('Getting upload URL', { serverId, directory });
        const endpoint = API_ENDPOINTS.FILES_UPLOAD(serverId, directory);
        const response = await this.client.get(endpoint);
        return response.attributes.url;
    }
    /**
     * Invalidate server cache
     */
    invalidateCache(serverId) {
        cacheManager.invalidatePattern(`server:${serverId}:`);
        logger.debug('Server cache invalidated', { serverId });
    }
}
//# sourceMappingURL=ServerEndpoint.js.map