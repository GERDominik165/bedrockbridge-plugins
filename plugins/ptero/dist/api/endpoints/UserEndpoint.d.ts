/**
 * Pterodactyl Bedrock Bridge - User Endpoint
 * Subuser Management für Server
 */
import { PterodactylClient } from '../PterodactylClient';
import { ISubuser } from '../../types';
export declare class UserEndpoint {
    private client;
    constructor(client: PterodactylClient);
    /**
     * List all subusers for a server
     */
    listSubusers(serverId: string, useCache?: boolean): Promise<ISubuser[]>;
    /**
     * Get subuser details
     */
    getSubuser(serverId: string, userId: string, useCache?: boolean): Promise<ISubuser>;
    /**
     * Create new subuser
     */
    createSubuser(serverId: string, email: string, permissions: string[]): Promise<ISubuser>;
    /**
     * Update subuser permissions
     */
    updateSubuserPermissions(serverId: string, userId: string, permissions: string[]): Promise<ISubuser>;
    /**
     * Delete subuser
     */
    deleteSubuser(serverId: string, userId: string): Promise<void>;
    /**
     * Check if user has permission
     */
    hasPermission(user: ISubuser, permission: string): boolean;
    /**
     * Check if user has any of permissions
     */
    hasAnyPermission(user: ISubuser, permissions: string[]): boolean;
    /**
     * Check if user has all permissions
     */
    hasAllPermissions(user: ISubuser, permissions: string[]): boolean;
    /**
     * Get permission group
     */
    getPermissionGroup(permission: string): string;
    /**
     * Invalidate user cache
     */
    invalidateCache(serverId: string, userId?: string): void;
}
//# sourceMappingURL=UserEndpoint.d.ts.map