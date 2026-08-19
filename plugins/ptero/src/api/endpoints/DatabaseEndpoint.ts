/**
 * Pterodactyl Bedrock Bridge - Database Endpoint
 * Komplette Datenbank-Management API
 */

import { PterodactylClient } from '../PterodactylClient';
import { IDatabase, IDatabaseListResponse } from '../../types';
import { API_ENDPOINTS, CACHE_CONFIG } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';

export class DatabaseEndpoint {
  constructor(private client: PterodactylClient) {}

  /**
   * List all databases for a server
   */
  async listDatabases(
    serverId: string,
    page: number = 1,
    perPage: number = 25,
    useCache: boolean = true
  ): Promise<IDatabaseListResponse> {
    const cacheKey = `server:${serverId}:databases:${page}:${perPage}`;

    if (useCache) {
      const cached = cacheManager.get<IDatabaseListResponse>(cacheKey);
      if (cached) return cached;
    }

    const endpoint = `${API_ENDPOINTS.DATABASES(serverId)}?page=${page}&per_page=${perPage}`;
    const response = await this.client.get(endpoint);

    if (useCache) {
      cacheManager.set(cacheKey, response, CACHE_CONFIG.DATABASE_TTL);
    }

    logger.info('Listed databases', { serverId, count: response.data?.length || 0 });
    return response;
  }

  /**
   * Get database details
   */
  async getDatabase(serverId: string, databaseId: string, useCache: boolean = true): Promise<IDatabase> {
    const cacheKey = `server:${serverId}:database:${databaseId}`;

    if (useCache) {
      const cached = cacheManager.get<IDatabase>(cacheKey);
      if (cached) return cached;
    }

    const endpoint = API_ENDPOINTS.DATABASE_DETAILS(serverId, databaseId);
    const response = await this.client.get(endpoint);

    if (useCache) {
      cacheManager.set(cacheKey, response, CACHE_CONFIG.DATABASE_TTL);
    }

    logger.info('Retrieved database details', { serverId, databaseId, name: response.attributes?.name });
    return response;
  }

  /**
   * Create new database
   */
  async createDatabase(serverId: string, database: string, remote: string = '%'): Promise<IDatabase> {
    logger.info('Creating database', { serverId, database, remote });

    const endpoint = API_ENDPOINTS.DATABASES(serverId);
    const response = await this.client.post(endpoint, {
      database,
      remote
    });

    // Invalidate list cache
    cacheManager.invalidatePattern(`server:${serverId}:databases:`);

    logger.info('Database created', { serverId, database });
    return response;
  }

  /**
   * Rotate database password
   */
  async rotateDatabasePassword(serverId: string, databaseId: string): Promise<IDatabase> {
    logger.info('Rotating database password', { serverId, databaseId });

    const endpoint = API_ENDPOINTS.DATABASE_ROTATE_PASSWORD(serverId, databaseId);
    const response = await this.client.post(endpoint, {});

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:database:${databaseId}`);
    cacheManager.invalidatePattern(`server:${serverId}:databases:`);

    logger.info('Database password rotated', { serverId, databaseId });
    return response;
  }

  /**
   * Delete database
   */
  async deleteDatabase(serverId: string, databaseId: string): Promise<void> {
    logger.warn('Deleting database', { serverId, databaseId });

    const endpoint = API_ENDPOINTS.DATABASE_DETAILS(serverId, databaseId);
    await this.client.delete(endpoint);

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:database:${databaseId}`);
    cacheManager.invalidatePattern(`server:${serverId}:databases:`);

    logger.info('Database deleted', { serverId, databaseId });
  }

  /**
   * Invalidate database cache
   */
  invalidateCache(serverId: string, databaseId?: string): void {
    if (databaseId) {
      cacheManager.invalidate(`server:${serverId}:database:${databaseId}`);
    }
    cacheManager.invalidatePattern(`server:${serverId}:databases:`);
    logger.debug('Database cache invalidated', { serverId, databaseId });
  }

  /**
   * Get database password (from relationships)
   */
  getDatabasePassword(database: IDatabase): string | null {
    return database.relationships?.password?.attributes.password || null;
  }
}
