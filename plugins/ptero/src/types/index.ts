/**
 * Pterodactyl Bedrock Bridge - Type Definitions
 * Vollständige Typdefinitionen für alle API Objekte
 */

// ==================== HTTP TYPES ====================

export enum HttpMethod {
  GET = 'Get',
  POST = 'Post',
  PATCH = 'PATCH',
  PUT = 'Put',
  DELETE = 'Delete',
  HEAD = 'Head'
}

export interface IHttpResponse {
  status: number;
  headers: Array<{ key: string; value: string }>;
  body: string;
}

export interface IHttpConfig {
  panelUrl: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// ==================== SERVER TYPES ====================

export interface IServerAttributes {
  server_owner: boolean;
  identifier: string;
  internal_id: number;
  uuid: string;
  name: string;
  description: string;
  status: 'running' | 'starting' | 'stopping' | 'offline' | null;
  is_suspended: boolean;
  is_installing: boolean;
  is_transferring: boolean;
  node: string;
  sftp_details: {
    ip: string;
    port: number;
  };
  invocation: string;
  docker_image: string;
  egg_features: string[];
  feature_limits: {
    databases: number;
    allocations: number;
    backups: number;
  };
  user_permissions: string[];
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: number | null;
    oom_disabled: boolean;
  };
  relationships?: {
    allocations?: {
      object: string;
      data: IAllocation[];
    };
    variables?: {
      object: string;
      data: IVariable[];
    };
  };
}

export interface IServer {
  object: string;
  attributes: IServerAttributes;
}

export interface IServerListResponse {
  object: string;
  data: IServer[];
  meta: {
    pagination: IPagination;
  };
}

// ==================== RESOURCE STATS ====================

export interface IResourceStats {
  object: string;
  attributes: {
    current_state: string;
    is_suspended: boolean;
    resources: {
      memory_bytes: number;
      memory_limit_bytes: number;
      cpu_absolute: number;
      disk_bytes: number;
      network_rx_bytes: number;
      network_tx_bytes: number;
      uptime: number;
    };
  };
}

// ==================== FILE TYPES ====================

export interface IFileAttributes {
  name: string;
  mode: string;
  mode_bits: string;
  size: number;
  is_file: boolean;
  is_symlink: boolean;
  mimetype: string;
  created_at: string;
  modified_at: string;
}

export interface IFile {
  object: string;
  attributes: IFileAttributes;
}

export interface IFileListResponse {
  object: string;
  data: IFile[];
}

export interface IUploadUrl {
  object: string;
  attributes: {
    url: string;
  };
}

// ==================== DATABASE TYPES ====================

export interface IDatabaseAttributes {
  id: string;
  host: {
    address: string;
    port: number;
  };
  name: string;
  username: string;
  connections_from: string;
  max_connections: number;
  created_at?: string;
  updated_at?: string;
}

export interface IDatabase {
  object: string;
  attributes: IDatabaseAttributes;
  relationships?: {
    password?: {
      object: string;
      attributes: {
        password: string;
      };
    };
  };
}

export interface IDatabaseListResponse {
  object: string;
  data: IDatabase[];
  meta: {
    pagination: IPagination;
  };
}

// ==================== BACKUP TYPES ====================

export interface IBackupAttributes {
  uuid: string;
  name: string;
  ignored_files: string[];
  sha256_hash: string | null;
  bytes: number;
  created_at: string;
  completed_at: string | null;
  is_successful: boolean;
  is_locked: boolean;
}

export interface IBackup {
  object: string;
  attributes: IBackupAttributes;
}

export interface IBackupListResponse {
  object: string;
  data: IBackup[];
  meta: {
    pagination: IPagination;
  };
}

// ==================== SCHEDULE TYPES ====================

export interface IScheduleAttributes {
  id: number;
  name: string;
  cron: {
    day_of_week: string;
    day_of_month: string;
    hour: string;
    minute: string;
    month: string;
  };
  is_active: boolean;
  is_processing: boolean;
  only_when_online: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
  relationships?: {
    tasks?: {
      object: string;
      data: IScheduleTask[];
    };
  };
}

export interface ISchedule {
  object: string;
  attributes: IScheduleAttributes;
}

export interface IScheduleTask {
  object: string;
  attributes: {
    id: number;
    sequence_id: number;
    action: 'command' | 'power' | 'backup';
    payload: string;
    time_offset: number;
    continue_on_failure: boolean;
    created_at: string;
    updated_at: string;
  };
}

// ==================== ALLOCATION TYPES ====================

export interface IAllocationAttributes {
  id: number;
  ip: string;
  ip_alias: string | null;
  port: number;
  notes: string | null;
  is_default: boolean;
  assigned?: boolean;
}

export interface IAllocation {
  object: string;
  attributes: IAllocationAttributes;
}

export interface IAllocationListResponse {
  object: string;
  data: IAllocation[];
}

// ==================== USER TYPES ====================

export interface IUserAttributes {
  uuid: string;
  username: string;
  email: string;
  image: string;
  '2fa_enabled': boolean;
  created_at: string;
  permissions: string[];
}

export interface ISubuser {
  object: string;
  attributes: IUserAttributes;
}

export interface ISubuserListResponse {
  object: string;
  data: ISubuser[];
  meta: {
    pagination: IPagination;
  };
}

// ==================== VARIABLE TYPES ====================

export interface IVariable {
  object: string;
  attributes: {
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    server_value: string;
    is_editable: boolean;
    rules: string;
  };
}

// ==================== WEBSOCKET TYPES ====================

export interface IWebSocketToken {
  object: string;
  data: {
    token: string;
    socket: string;
  };
}

export interface IWebSocketMessage {
  event: string;
  args: any[];
}

export enum WebSocketEvent {
  AUTH = 'auth',
  SEND_COMMAND = 'send command',
  SET_STATE = 'set state',
  CONSOLE_OUTPUT = 'console output',
  STATUS = 'status',
  STATS = 'stats',
  JWT_ERROR = 'jwt error',
  DAEMON_MESSAGE = 'daemon message'
}

export enum ServerPowerState {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
  KILL = 'kill'
}

// ==================== PAGINATION ====================

export interface IPagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  links: Record<string, string>;
}

// ==================== RESPONSE WRAPPERS ====================

export interface IApiResponse<T> {
  object: string;
  data?: T | T[];
  attributes?: T;
  meta?: {
    pagination?: IPagination;
  };
}

export interface ISignedUrl {
  object: string;
  attributes: {
    url: string;
  };
}

// ==================== ERROR TYPES ====================

export interface IApiError {
  code: string;
  status: string;
  detail: string;
  source?: {
    field?: string;
  };
}

export interface IApiErrorResponse {
  errors: IApiError[];
}

// ==================== CACHE TYPES ====================

export interface ICacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ==================== GUI TYPES ====================

export enum FormAction {
  NONE = -1,
  SERVERS_LIST = 0,
  SERVER_DETAILS = 1,
  CONSOLE = 2,
  FILES = 3,
  DATABASES = 4,
  BACKUPS = 5,
  SCHEDULES = 6,
  USERS = 7,
  POWER_CONTROL = 8,
  SETTINGS = 9
}

export enum PowerAction {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
  KILL = 'kill'
}

// ==================== PLUGIN CONFIG ====================

export interface IPluginConfig {
  panelUrl: string;
  apiKey: string;
  apiKeyType: 'client' | 'application';
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  monitoringEnabled?: boolean;
  monitoringInterval?: number;
  loggingEnabled?: boolean;
  debugMode?: boolean;
}

// ==================== MONITORING TYPES ====================

export interface IServerMonitorData {
  serverId: string;
  timestamp: number;
  state: string;
  cpu: number;
  memory: number;
  disk: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
}

export interface IMonitoringSnapshot {
  timestamp: number;
  servers: Map<string, IServerMonitorData>;
}
