/**
 * Pterodactyl Bedrock Bridge - Schedule Endpoint
 * Komplette Schedule/Zeitplan-Management API
 */

import { PterodactylClient } from '../PterodactylClient';
import { ISchedule, IScheduleTask, IApiResponse } from '../../types';
import { API_ENDPOINTS, CACHE_CONFIG, SCHEDULE_ACTIONS } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';

export class ScheduleEndpoint {
  constructor(private client: PterodactylClient) {}

  /**
   * List all schedules for a server
   */
  async listSchedules(serverId: string, useCache: boolean = true): Promise<ISchedule[]> {
    const cacheKey = `server:${serverId}:schedules`;

    if (useCache) {
      const cached = cacheManager.get<ISchedule[]>(cacheKey);
      if (cached) return cached;
    }

    const endpoint = API_ENDPOINTS.SCHEDULES(serverId);
    const response = await this.client.get(endpoint);

    const schedules = response.data || [];

    if (useCache) {
      cacheManager.set(cacheKey, schedules, CACHE_CONFIG.SCHEDULE_TTL);
    }

    logger.info('Listed schedules', { serverId, count: schedules.length });
    return schedules;
  }

  /**
   * Get schedule details with tasks
   */
  async getSchedule(serverId: string, scheduleId: number, useCache: boolean = true): Promise<ISchedule> {
    const cacheKey = `server:${serverId}:schedule:${scheduleId}`;

    if (useCache) {
      const cached = cacheManager.get<ISchedule>(cacheKey);
      if (cached) return cached;
    }

    const endpoint = API_ENDPOINTS.SCHEDULE_DETAILS(serverId, scheduleId) + '?include=tasks';
    const response = await this.client.get(endpoint);

    if (useCache) {
      cacheManager.set(cacheKey, response, CACHE_CONFIG.SCHEDULE_TTL);
    }

    logger.info('Retrieved schedule details', { serverId, scheduleId, name: response.attributes?.name });
    return response;
  }

  /**
   * Create new schedule
   */
  async createSchedule(
    serverId: string,
    name: string,
    minute: string,
    hour: string,
    dayOfMonth: string,
    month: string,
    dayOfWeek: string,
    isActive: boolean = true,
    onlyWhenOnline: boolean = false
  ): Promise<ISchedule> {
    logger.info('Creating schedule', { serverId, name });

    const endpoint = API_ENDPOINTS.SCHEDULES(serverId);
    const response = await this.client.post(endpoint, {
      name,
      minute,
      hour,
      day_of_month: dayOfMonth,
      month,
      day_of_week: dayOfWeek,
      is_active: isActive,
      only_when_online: onlyWhenOnline
    });

    // Invalidate cache
    cacheManager.invalidatePattern(`server:${serverId}:schedules`);

    logger.info('Schedule created', { serverId, scheduleId: response.attributes?.id });
    return response;
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    serverId: string,
    scheduleId: number,
    updates: {
      name?: string;
      minute?: string;
      hour?: string;
      day_of_month?: string;
      month?: string;
      day_of_week?: string;
      is_active?: boolean;
      only_when_online?: boolean;
    }
  ): Promise<ISchedule> {
    logger.info('Updating schedule', { serverId, scheduleId });

    const endpoint = API_ENDPOINTS.SCHEDULE_DETAILS(serverId, scheduleId);
    const response = await this.client.post(endpoint, updates);

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);
    cacheManager.invalidatePattern(`server:${serverId}:schedules`);

    logger.info('Schedule updated', { serverId, scheduleId });
    return response;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(serverId: string, scheduleId: number): Promise<void> {
    logger.warn('Deleting schedule', { serverId, scheduleId });

    const endpoint = API_ENDPOINTS.SCHEDULE_DETAILS(serverId, scheduleId);
    await this.client.delete(endpoint);

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);
    cacheManager.invalidatePattern(`server:${serverId}:schedules`);

    logger.info('Schedule deleted', { serverId, scheduleId });
  }

  /**
   * Execute schedule immediately
   */
  async executeSchedule(serverId: string, scheduleId: number): Promise<void> {
    logger.info('Executing schedule', { serverId, scheduleId });

    const endpoint = API_ENDPOINTS.SCHEDULE_EXECUTE(serverId, scheduleId);
    await this.client.post(endpoint, {});

    logger.info('Schedule executed', { serverId, scheduleId });
  }

  /**
   * Create schedule task
   */
  async createTask(
    serverId: string,
    scheduleId: number,
    action: 'command' | 'power' | 'backup',
    payload: string,
    timeOffset: number = 0,
    continueOnFailure: boolean = false
  ): Promise<IScheduleTask> {
    logger.info('Creating schedule task', { serverId, scheduleId, action });

    const endpoint = API_ENDPOINTS.SCHEDULE_TASKS(serverId, scheduleId);
    const response = await this.client.post(endpoint, {
      action,
      payload,
      time_offset: timeOffset,
      continue_on_failure: continueOnFailure
    });

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);

    logger.info('Task created', { serverId, scheduleId, taskId: response.attributes?.id });
    return response;
  }

  /**
   * Update schedule task
   */
  async updateTask(
    serverId: string,
    scheduleId: number,
    taskId: number,
    updates: {
      action?: string;
      payload?: string;
      time_offset?: number;
      continue_on_failure?: boolean;
    }
  ): Promise<IScheduleTask> {
    logger.info('Updating schedule task', { serverId, scheduleId, taskId });

    const endpoint = `${API_ENDPOINTS.SCHEDULE_TASKS(serverId, scheduleId)}/${taskId}`;
    const response = await this.client.patch(endpoint, updates);

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);

    logger.info('Task updated', { serverId, scheduleId, taskId });
    return response;
  }

  /**
   * Delete schedule task
   */
  async deleteTask(serverId: string, scheduleId: number, taskId: number): Promise<void> {
    logger.warn('Deleting schedule task', { serverId, scheduleId, taskId });

    const endpoint = `${API_ENDPOINTS.SCHEDULE_TASKS(serverId, scheduleId)}/${taskId}`;
    await this.client.delete(endpoint);

    // Invalidate cache
    cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);

    logger.info('Task deleted', { serverId, scheduleId, taskId });
  }

  /**
   * Get next execution time
   */
  getNextExecutionTime(schedule: ISchedule): string | null {
    return schedule.attributes.next_run_at || null;
  }

  /**
   * Get last execution time
   */
  getLastExecutionTime(schedule: ISchedule): string | null {
    return schedule.attributes.last_run_at || null;
  }

  /**
   * Is schedule currently processing
   */
  isScheduleProcessing(schedule: ISchedule): boolean {
    return schedule.attributes.is_processing;
  }

  /**
   * Invalidate schedule cache
   */
  invalidateCache(serverId: string, scheduleId?: number): void {
    if (scheduleId) {
      cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);
    }
    cacheManager.invalidatePattern(`server:${serverId}:schedules`);
    logger.debug('Schedule cache invalidated', { serverId, scheduleId });
  }
}
