/**
 * Pterodactyl Bedrock Bridge - Allocation Endpoint
 * Network Allocation und IP/Port Management
 */
import { API_ENDPOINTS, CACHE_CONFIG } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';
export class AllocationEndpoint {
    constructor(client) {
        this.client = client;
    }
    /**
     * List all allocations for a server
     */
    async listAllocations(serverId, useCache = true) {
        const cacheKey = `server:${serverId}:allocations`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
        }
        const endpoint = API_ENDPOINTS.ALLOCATIONS(serverId);
        const response = await this.client.get(endpoint);
        const allocations = response.data || [];
        if (useCache) {
            cacheManager.set(cacheKey, allocations, CACHE_CONFIG.SERVER_DETAILS_TTL);
        }
        logger.info('Listed allocations', { serverId, count: allocations.length });
        return allocations;
    }
    /**
     * Assign new allocation to server
     */
    async assignAllocation(serverId, ip, port) {
        logger.info('Assigning allocation', { serverId, ip, port });
        const endpoint = API_ENDPOINTS.ALLOCATIONS(serverId);
        const body = {};
        if (ip)
            body.ip = ip;
        if (port)
            body.port = port;
        const response = await this.client.post(endpoint, body);
        // Invalidate cache
        cacheManager.invalidatePattern(`server:${serverId}:allocations`);
        logger.info('Allocation assigned', { serverId, ip: response.attributes?.ip, port: response.attributes?.port });
        return response;
    }
    /**
     * Set primary allocation
     */
    async setPrimaryAllocation(serverId, allocationId) {
        logger.info('Setting primary allocation', { serverId, allocationId });
        const endpoint = API_ENDPOINTS.ALLOCATION_PRIMARY(serverId, allocationId);
        const response = await this.client.post(endpoint, {});
        // Invalidate cache
        cacheManager.invalidatePattern(`server:${serverId}:allocations`);
        logger.info('Primary allocation set', { serverId, allocationId });
        return response;
    }
    /**
     * Update allocation notes
     */
    async updateAllocationNotes(serverId, allocationId, notes) {
        logger.info('Updating allocation notes', { serverId, allocationId });
        const endpoint = `${API_ENDPOINTS.ALLOCATIONS(serverId)}/${allocationId}`;
        const response = await this.client.post(endpoint, { notes });
        // Invalidate cache
        cacheManager.invalidatePattern(`server:${serverId}:allocations`);
        logger.info('Allocation notes updated', { serverId, allocationId });
        return response;
    }
    /**
     * Remove allocation from server
     */
    async removeAllocation(serverId, allocationId) {
        logger.warn('Removing allocation', { serverId, allocationId });
        const endpoint = `${API_ENDPOINTS.ALLOCATIONS(serverId)}/${allocationId}`;
        await this.client.delete(endpoint);
        // Invalidate cache
        cacheManager.invalidatePattern(`server:${serverId}:allocations`);
        logger.info('Allocation removed', { serverId, allocationId });
    }
    /**
     * Get primary allocation
     */
    getPrimaryAllocation(allocations) {
        return allocations.find(a => a.attributes.is_default) || null;
    }
    /**
     * Format allocation string
     */
    formatAllocation(allocation) {
        const ip = allocation.attributes.ip;
        const alias = allocation.attributes.ip_alias;
        const port = allocation.attributes.port;
        const displayIp = alias || ip;
        return `${displayIp}:${port}`;
    }
    /**
     * Invalidate allocation cache
     */
    invalidateCache(serverId) {
        cacheManager.invalidatePattern(`server:${serverId}:allocations`);
        logger.debug('Allocation cache invalidated', { serverId });
    }
}
//# sourceMappingURL=AllocationEndpoint.js.map