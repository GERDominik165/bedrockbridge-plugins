/**
 * Pterodactyl Bedrock Bridge - User Endpoint
 * Subuser Management für Server
 */

import { PterodactylClient } from '../PterodactylClient';
import { ISubuser, ISubuserListResponse } from '../../types';
import { API_ENDPOINTS, CACHE_CONFIG } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';

export class UserEndpoint {
  constructor(private client: PterodactylClient) {}

  /**
   * List all subusers for a server
   */
  async listSubusers(serverId: string, useCache: boolean = true): Promise<ISubuser[]> {
    const cacheKey = `server:${serverId}:users`;

    if (useCache) {
      const cached = cacheManager.get<ISubuser[]>(cacheKey);
      if (cached) return cached;
    }

    const endpoint = API_ENDPOINTS.USERS(serverId);
    const response = await this.client.get(endpoint);

    const users = response.data || [];

    if (useCache) {
      cacheManager.set(cacheKey, users, CACHE_CONFIG.SERVER_DETAILS_TTL);
    }

    logger.info('Listed subusers', { serverId, count: users.length });
    return users;
  }

  /**
   * Get subuser details
   */
  async getSubuser(serverId: string, userId: string, useCache: boolean = true): Promise<ISubuser> {
    const cacheKey = `server:${serverId}:user:${userId}`;

    if (useCache) {
      const cached = cacheManager.get<ISubuser>(cacheKey);
      if (cached) return cached;
    }

    const endpoint = API_ENDPOINTS.USER_DETAILS(serverId, userId);
    const response = await this.client.get(endpoint);

    if (useCache) {
      cacheManager.set(cacheKey, response, CACHE_CONFIG.SERVER_DETAILS_TTL);
    }

    logger.info('Retrieved subuser details', { serverId, userId, username: response.attributes?.username });
    return response;
  }

  /**
   * Create new subuser
   */
  async createSubuser(serverId: string, email: string, permissions: string[]): Promise<ISubuser> {
    logger.info('Creating subuser', { serverId, email, permissions: permissions.length });

    const endpoint = API_ENDPOINTS.USERS(serverId);
    const response = await this.client.post(endpoint, {
      email,
      permissions
    });

    // Invalidate cache
    cacheManager.invalidatePattern(`server:${serverId}:users`);

    logger.info('Subuser created', { serverId, email, userId: response.attributes?.uuid });
    return response;
  }

  /**
   * Update subuser permissions
   */
  async updateSubuserPermissions(serverId: string, userId: string, permissions: string[]): Promise<ISubuser> {
    logger.info('Updating subuser permissions', { serverId, userId, permissions: permissions.length });

    const endpoint = API_ENDPOINTS.USER_DETAILS(serverId, userId);
    const response = await this.client.post(endpoint, { permissions });

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:user:${userId}`);
    cacheManager.invalidatePattern(`server:${serverId}:users`);

    logger.info('Subuser permissions updated', { serverId, userId });
    return response;
  }

  /**
   * Delete subuser
   */
  async deleteSubuser(serverId: string, userId: string): Promise<void> {
    logger.warn('Deleting subuser', { serverId, userId });

    const endpoint = API_ENDPOINTS.USER_DETAILS(serverId, userId);
    await this.client.delete(endpoint);

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:user:${userId}`);
    cacheManager.invalidatePattern(`server:${serverId}:users`);

    logger.info('Subuser deleted', { serverId, userId });
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: ISubuser, permission: string): boolean {
    return user.attributes.permissions.includes(permission);
  }

  /**
   * Check if user has any of permissions
   */
  hasAnyPermission(user: ISubuser, permissions: string[]): boolean {
    return permissions.some(p => user.attributes.permissions.includes(p));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(user: ISubuser, permissions: string[]): boolean {
    return permissions.every(p => user.attributes.permissions.includes(p));
  }

  /**
   * Get permission group
   */
  getPermissionGroup(permission: string): string {
    const [group] = permission.split('.');
    return group;
  }

  /**
   * Invalidate user cache
   */
  invalidateCache(serverId: string, userId?: string): void {
    if (userId) {
      cacheManager.invalidate(`server:${serverId}:user:${userId}`);
    }
    cacheManager.invalidatePattern(`server:${serverId}:users`);
    logger.debug('User cache invalidated', { serverId, userId });
  }
}
