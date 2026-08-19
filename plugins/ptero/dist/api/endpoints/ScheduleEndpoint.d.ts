/**
 * Pterodactyl Bedrock Bridge - Schedule Endpoint
 * Komplette Schedule/Zeitplan-Management API
 */
import { PterodactylClient } from '../PterodactylClient';
import { ISchedule, IScheduleTask } from '../../types';
export declare class ScheduleEndpoint {
    private client;
    constructor(client: PterodactylClient);
    /**
     * List all schedules for a server
     */
    listSchedules(serverId: string, useCache?: boolean): Promise<ISchedule[]>;
    /**
     * Get schedule details with tasks
     */
    getSchedule(serverId: string, scheduleId: number, useCache?: boolean): Promise<ISchedule>;
    /**
     * Create new schedule
     */
    createSchedule(serverId: string, name: string, minute: string, hour: string, dayOfMonth: string, month: string, dayOfWeek: string, isActive?: boolean, onlyWhenOnline?: boolean): Promise<ISchedule>;
    /**
     * Update schedule
     */
    updateSchedule(serverId: string, scheduleId: number, updates: {
        name?: string;
        minute?: string;
        hour?: string;
        day_of_month?: string;
        month?: string;
        day_of_week?: string;
        is_active?: boolean;
        only_when_online?: boolean;
    }): Promise<ISchedule>;
    /**
     * Delete schedule
     */
    deleteSchedule(serverId: string, scheduleId: number): Promise<void>;
    /**
     * Execute schedule immediately
     */
    executeSchedule(serverId: string, scheduleId: number): Promise<void>;
    /**
     * Create schedule task
     */
    createTask(serverId: string, scheduleId: number, action: 'command' | 'power' | 'backup', payload: string, timeOffset?: number, continueOnFailure?: boolean): Promise<IScheduleTask>;
    /**
     * Update schedule task
     */
    updateTask(serverId: string, scheduleId: number, taskId: number, updates: {
        action?: string;
        payload?: string;
        time_offset?: number;
        continue_on_failure?: boolean;
    }): Promise<IScheduleTask>;
    /**
     * Delete schedule task
     */
    deleteTask(serverId: string, scheduleId: number, taskId: number): Promise<void>;
    /**
     * Get next execution time
     */
    getNextExecutionTime(schedule: ISchedule): string | null;
    /**
     * Get last execution time
     */
    getLastExecutionTime(schedule: ISchedule): string | null;
    /**
     * Is schedule currently processing
     */
    isScheduleProcessing(schedule: ISchedule): boolean;
    /**
     * Invalidate schedule cache
     */
    invalidateCache(serverId: string, scheduleId?: number): void;
}
//# sourceMappingURL=ScheduleEndpoint.d.ts.map