/**
 * Pterodactyl Bedrock Bridge - Allocation Endpoint
 * Network Allocation und IP/Port Management
 */
import { PterodactylClient } from '../PterodactylClient';
import { IAllocation } from '../../types';
export declare class AllocationEndpoint {
    private client;
    constructor(client: PterodactylClient);
    /**
     * List all allocations for a server
     */
    listAllocations(serverId: string, useCache?: boolean): Promise<IAllocation[]>;
    /**
     * Assign new allocation to server
     */
    assignAllocation(serverId: string, ip?: string, port?: number): Promise<IAllocation>;
    /**
     * Set primary allocation
     */
    setPrimaryAllocation(serverId: string, allocationId: number): Promise<IAllocation>;
    /**
     * Update allocation notes
     */
    updateAllocationNotes(serverId: string, allocationId: number, notes: string): Promise<IAllocation>;
    /**
     * Remove allocation from server
     */
    removeAllocation(serverId: string, allocationId: number): Promise<void>;
    /**
     * Get primary allocation
     */
    getPrimaryAllocation(allocations: IAllocation[]): IAllocation | null;
    /**
     * Format allocation string
     */
    formatAllocation(allocation: IAllocation): string;
    /**
     * Invalidate allocation cache
     */
    invalidateCache(serverId: string): void;
}
//# sourceMappingURL=AllocationEndpoint.d.ts.map