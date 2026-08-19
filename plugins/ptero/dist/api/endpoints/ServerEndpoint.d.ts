/**
 * Pterodactyl Bedrock Bridge - Server Endpoint
 * Komplette Server-Management API
 */
import { PterodactylClient } from '../PterodactylClient';
import { IServer, IServerListResponse, IResourceStats, ServerPowerState, IWebSocketToken, IFile, IVariable } from '../../types';
export declare class ServerEndpoint {
    private client;
    constructor(client: PterodactylClient);
    /**
     * List all servers
     */
    listServers(page?: number, perPage?: number, useCache?: boolean): Promise<IServerListResponse>;
    /**
     * Get server details
     */
    getServer(serverId: string, useCache?: boolean): Promise<IServer>;
    /**
     * Get server resources and status
     */
    getResources(serverId: string, useCache?: boolean): Promise<IResourceStats>;
    /**
     * Change server power state
     */
    setPowerState(serverId: string, action: ServerPowerState): Promise<void>;
    /**
     * Start server
     */
    start(serverId: string): Promise<void>;
    /**
     * Stop server
     */
    stop(serverId: string): Promise<void>;
    /**
     * Restart server
     */
    restart(serverId: string): Promise<void>;
    /**
     * Kill server (force stop)
     */
    kill(serverId: string): Promise<void>;
    /**
     * Send command to server
     */
    sendCommand(serverId: string, command: string): Promise<void>;
    /**
     * Get WebSocket token for console access
     */
    getWebSocketToken(serverId: string): Promise<IWebSocketToken>;
    /**
     * Rename server
     */
    renameServer(serverId: string, name: string, description?: string): Promise<void>;
    /**
     * Reinstall server
     */
    reinstallServer(serverId: string): Promise<void>;
    /**
     * Update server Docker image
     */
    setDockerImage(serverId: string, dockerImage: string): Promise<void>;
    /**
     * Get server startup configuration
     */
    getStartupConfiguration(serverId: string, useCache?: boolean): Promise<IVariable[]>;
    /**
     * Update startup variable
     */
    updateStartupVariable(serverId: string, key: string, value: string): Promise<IVariable>;
    /**
     * List files in directory
     */
    listFiles(serverId: string, directory?: string, useCache?: boolean): Promise<IFile[]>;
    /**
     * Get file contents
     */
    getFileContents(serverId: string, filePath: string): Promise<string>;
    /**
     * Write file contents
     */
    writeFileContents(serverId: string, filePath: string, content: string): Promise<void>;
    /**
     * Create directory
     */
    createDirectory(serverId: string, directory: string, name: string): Promise<void>;
    /**
     * Delete files or directories
     */
    deleteFiles(serverId: string, directory: string, files: string[]): Promise<void>;
    /**
     * Rename file or directory
     */
    renameFile(serverId: string, directory: string, from: string, to: string): Promise<void>;
    /**
     * Copy file or directory
     */
    copyFile(serverId: string, location: string): Promise<void>;
    /**
     * Compress files
     */
    compressFiles(serverId: string, directory: string, files: string[]): Promise<IFile>;
    /**
     * Decompress archive
     */
    decompressArchive(serverId: string, directory: string, file: string): Promise<void>;
    /**
     * Change file permissions
     */
    changeFilePermissions(serverId: string, directory: string, mode: string, files: string[]): Promise<void>;
    /**
     * Get upload URL
     */
    getUploadUrl(serverId: string, directory?: string): Promise<string>;
    /**
     * Invalidate server cache
     */
    invalidateCache(serverId: string): void;
}
//# sourceMappingURL=ServerEndpoint.d.ts.map