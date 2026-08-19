/**
 * Pterodactyl Bedrock Bridge - Schedule Endpoint
 * Komplette Schedule/Zeitplan-Management API
 */
import { API_ENDPOINTS, CACHE_CONFIG } from '../../config/Constants';
import { cacheManager } from '../../utils/Cache';
import { logger } from '../../utils/Logger';
export class ScheduleEndpoint {
    constructor(client) {
        this.client = client;
    }
    /**
     * List all schedules for a server
     */
    async listSchedules(serverId, useCache = true) {
        const cacheKey = `server:${serverId}:schedules`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
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
    async getSchedule(serverId, scheduleId, useCache = true) {
        const cacheKey = `server:${serverId}:schedule:${scheduleId}`;
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached)
                return cached;
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
    async createSchedule(serverId, name, minute, hour, dayOfMonth, month, dayOfWeek, isActive = true, onlyWhenOnline = false) {
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
    async updateSchedule(serverId, scheduleId, updates) {
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
    async deleteSchedule(serverId, scheduleId) {
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
    async executeSchedule(serverId, scheduleId) {
        logger.info('Executing schedule', { serverId, scheduleId });
        const endpoint = API_ENDPOINTS.SCHEDULE_EXECUTE(serverId, scheduleId);
        await this.client.post(endpoint, {});
        logger.info('Schedule executed', { serverId, scheduleId });
    }
    /**
     * Create schedule task
     */
    async createTask(serverId, scheduleId, action, payload, timeOffset = 0, continueOnFailure = false) {
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
    async updateTask(serverId, scheduleId, taskId, updates) {
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
    async deleteTask(serverId, scheduleId, taskId) {
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
    getNextExecutionTime(schedule) {
        return schedule.attributes.next_run_at || null;
    }
    /**
     * Get last execution time
     */
    getLastExecutionTime(schedule) {
        return schedule.attributes.last_run_at || null;
    }
    /**
     * Is schedule currently processing
     */
    isScheduleProcessing(schedule) {
        return schedule.attributes.is_processing;
    }
    /**
     * Invalidate schedule cache
     */
    invalidateCache(serverId, scheduleId) {
        if (scheduleId) {
            cacheManager.invalidate(`server:${serverId}:schedule:${scheduleId}`);
        }
        cacheManager.invalidatePattern(`server:${serverId}:schedules`);
        logger.debug('Schedule cache invalidated', { serverId, scheduleId });
    }
}
//# sourceMappingURL=ScheduleEndpoint.js.map