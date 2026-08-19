/**
 * Pterodactyl Bedrock Bridge - Constants
 * Zentrale Konstanten für das gesamte Plugin
 */

// ==================== COMMAND PREFIX ====================
export const COMMAND_PREFIX = 'bedrockbridge';
export const LEGACY_PREFIX = '!';

// ==================== COLORS ====================
export const Colors = {
  // Minecraft Formatting Codes
  BLACK: '§0',
  DARK_BLUE: '§1',
  DARK_GREEN: '§2',
  DARK_CYAN: '§3',
  DARK_RED: '§4',
  PURPLE: '§5',
  GOLD: '§6',
  GRAY: '§7',
  DARK_GRAY: '§8',
  BLUE: '§9',
  GREEN: '§a',
  CYAN: '§b',
  RED: '§c',
  LIGHT_PURPLE: '§d',
  YELLOW: '§e',
  WHITE: '§f',
  OBFUSCATED: '§k',
  BOLD: '§l',
  STRIKETHROUGH: '§m',
  UNDERLINE: '§n',
  ITALIC: '§o',
  RESET: '§r'
};

// ==================== ICONS ====================
export const Icons = {
  SERVER: '🖥',
  DATABASE: '🗄',
  FILE: '📄',
  FOLDER: '📁',
  BACKUP: '💾',
  SCHEDULE: '⏰',
  SETTINGS: '⚙',
  USER: '👤',
  PLAY: '▶',
  STOP: '⏹',
  RESTART: '🔄',
  WARNING: '⚠',
  ERROR: '❌',
  SUCCESS: '✅',
  INFO: 'ℹ',
  ARROW_RIGHT: '→',
  ARROW_LEFT: '←',
  CLOCK: '🕐',
  CHART: '📊',
  UPLOAD: '⬆',
  DOWNLOAD: '⬇',
  TRASH: '🗑',
  LOCK: '🔒',
  UNLOCK: '🔓',
  CONSOLE: '💻'
};

// ==================== DEFAULT TIMEOUTS & RETRIES ====================
export const HTTP_DEFAULTS = {
  TIMEOUT: 30,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 10000
};

// ==================== CACHE SETTINGS ====================
export const CACHE_CONFIG = {
  ENABLED: true,
  DEFAULT_TTL: 300000, // 5 minutes
  SERVER_LIST_TTL: 120000, // 2 minutes
  SERVER_DETAILS_TTL: 60000, // 1 minute
  RESOURCES_TTL: 30000, // 30 seconds
  FILES_TTL: 120000, // 2 minutes
  DATABASE_TTL: 120000, // 2 minutes
  BACKUP_TTL: 180000, // 3 minutes
  SCHEDULE_TTL: 120000 // 2 minutes
};

// ==================== MONITORING SETTINGS ====================
export const MONITORING_CONFIG = {
  ENABLED: true,
  INTERVAL: 5000, // 5 seconds
  MAX_HISTORY_SIZE: 100,
  STATS_UPDATE_INTERVAL: 3000 // 3 seconds
};

// ==================== WEBSOCKET SETTINGS ====================
export const WEBSOCKET_CONFIG = {
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  MESSAGE_QUEUE_SIZE: 100,
  PING_INTERVAL: 30000 // 30 seconds
};

// ==================== UI SETTINGS ====================
export const UI_CONFIG = {
  ITEMS_PER_PAGE: 8,
  MAX_CONSOLE_LINES: 100,
  FORM_TIMEOUT: 300, // 5 minutes
  AUTO_REFRESH_ENABLED: true,
  AUTO_REFRESH_INTERVAL: 5000
};

// ==================== PERMISSIONS ====================
export const PERMISSIONS = {
  ADMIN: 'pterodactyl.admin',
  USER: 'pterodactyl.user',
  VIEWER: 'pterodactyl.viewer',
  CONSOLE: 'pterodactyl.console',
  FILES: 'pterodactyl.files',
  DATABASE: 'pterodactyl.database',
  BACKUP: 'pterodactyl.backup',
  SCHEDULE: 'pterodactyl.schedule',
  POWER: 'pterodactyl.power'
};

// ==================== SERVER STATES ====================
export const SERVER_STATES = {
  RUNNING: 'running',
  STARTING: 'starting',
  STOPPING: 'stopping',
  OFFLINE: 'offline',
  INSTALLING: 'installing',
  TRANSFERRING: 'transferring',
  SUSPENDED: 'suspended',
  UNKNOWN: 'unknown'
};

// ==================== POWER ACTIONS ====================
export const POWER_ACTIONS = {
  START: 'start',
  STOP: 'stop',
  RESTART: 'restart',
  KILL: 'kill'
};

// ==================== FILE OPERATIONS ====================
export const FILE_OPERATIONS = {
  LIST: 'list',
  READ: 'read',
  WRITE: 'write',
  CREATE: 'create',
  DELETE: 'delete',
  RENAME: 'rename',
  COPY: 'copy',
  COMPRESS: 'compress',
  DECOMPRESS: 'decompress',
  UPLOAD: 'upload',
  DOWNLOAD: 'download'
};

// ==================== SCHEDULE ACTIONS ====================
export const SCHEDULE_ACTIONS = {
  COMMAND: 'command',
  POWER: 'power',
  BACKUP: 'backup'
};

// ==================== API ENDPOINTS ====================
export const API_ENDPOINTS = {
  // Client API
  CLIENT_BASE: '/api/client',
  SERVERS: '/api/client',
  SERVER_DETAILS: (id: string) => `/api/client/servers/${id}`,
  RESOURCES: (id: string) => `/api/client/servers/${id}/resources`,
  POWER: (id: string) => `/api/client/servers/${id}/power`,
  COMMAND: (id: string) => `/api/client/servers/${id}/command`,
  WEBSOCKET: (id: string) => `/api/client/servers/${id}/websocket`,

  // Files
  FILES_LIST: (id: string, dir: string = '/') => `/api/client/servers/${id}/files/list?directory=${encodeURIComponent(dir)}`,
  FILES_CONTENTS: (id: string, file: string) => `/api/client/servers/${id}/files/contents?file=${encodeURIComponent(file)}`,
  FILES_WRITE: (id: string, file: string) => `/api/client/servers/${id}/files/write?file=${encodeURIComponent(file)}`,
  FILES_UPLOAD: (id: string, dir: string = '/') => `/api/client/servers/${id}/files/upload?directory=${encodeURIComponent(dir)}`,
  FILES_DELETE: (id: string) => `/api/client/servers/${id}/files/delete`,
  FILES_CREATE_FOLDER: (id: string) => `/api/client/servers/${id}/files/create-folder`,
  FILES_RENAME: (id: string) => `/api/client/servers/${id}/files/rename`,
  FILES_COMPRESS: (id: string) => `/api/client/servers/${id}/files/compress`,
  FILES_DECOMPRESS: (id: string) => `/api/client/servers/${id}/files/decompress`,
  FILES_CHMOD: (id: string) => `/api/client/servers/${id}/files/chmod`,

  // Database
  DATABASES: (id: string) => `/api/client/servers/${id}/databases`,
  DATABASE_DETAILS: (id: string, dbId: string) => `/api/client/servers/${id}/databases/${dbId}`,
  DATABASE_ROTATE_PASSWORD: (id: string, dbId: string) => `/api/client/servers/${id}/databases/${dbId}/rotate-password`,

  // Backups
  BACKUPS: (id: string) => `/api/client/servers/${id}/backups`,
  BACKUP_DETAILS: (id: string, backupId: string) => `/api/client/servers/${id}/backups/${backupId}`,
  BACKUP_DOWNLOAD: (id: string, backupId: string) => `/api/client/servers/${id}/backups/${backupId}/download`,
  BACKUP_RESTORE: (id: string, backupId: string) => `/api/client/servers/${id}/backups/${backupId}/restore`,
  BACKUP_LOCK: (id: string, backupId: string) => `/api/client/servers/${id}/backups/${backupId}/lock`,

  // Schedules
  SCHEDULES: (id: string) => `/api/client/servers/${id}/schedules`,
  SCHEDULE_DETAILS: (id: string, schedId: number) => `/api/client/servers/${id}/schedules/${schedId}`,
  SCHEDULE_EXECUTE: (id: string, schedId: number) => `/api/client/servers/${id}/schedules/${schedId}/execute`,
  SCHEDULE_TASKS: (id: string, schedId: number) => `/api/client/servers/${id}/schedules/${schedId}/tasks`,

  // Allocations
  ALLOCATIONS: (id: string) => `/api/client/servers/${id}/network/allocations`,
  ALLOCATION_PRIMARY: (id: string, allocId: number) => `/api/client/servers/${id}/network/allocations/${allocId}/primary`,

  // Users
  USERS: (id: string) => `/api/client/servers/${id}/users`,
  USER_DETAILS: (id: string, userId: string) => `/api/client/servers/${id}/users/${userId}`,

  // Account
  ACCOUNT: '/api/client/account',
  ACCOUNT_ACTIVITY: '/api/client/account/activity',
  ACCOUNT_API_KEYS: '/api/client/account/api-keys'
};

// ==================== ERROR MESSAGES ====================
export const ERROR_MESSAGES = {
  INVALID_SERVER_ID: 'Ungültige Server ID',
  SERVER_NOT_FOUND: 'Server nicht gefunden',
  UNAUTHORIZED: 'Nicht autorisiert',
  FORBIDDEN: 'Zugriff verweigert',
  NETWORK_ERROR: 'Netzwerkfehler',
  TIMEOUT: 'Anfrage abgelaufen',
  INVALID_REQUEST: 'Ungültige Anfrage',
  SERVER_ERROR: 'Serverfehler',
  WEBSOCKET_ERROR: 'WebSocket-Fehler',
  INVALID_CREDENTIALS: 'Ungültige Anmeldedaten',
  API_ERROR: 'API-Fehler',
  RATE_LIMIT: 'Rate Limit überschritten',
  FILE_NOT_FOUND: 'Datei nicht gefunden',
  DISK_FULL: 'Speicher voll',
  PERMISSION_DENIED: 'Berechtigung verweigert'
};

// ==================== SUCCESS MESSAGES ====================
export const SUCCESS_MESSAGES = {
  SERVER_STARTED: 'Server gestartet',
  SERVER_STOPPED: 'Server gestoppt',
  SERVER_RESTARTED: 'Server neugestartet',
  COMMAND_SENT: 'Befehl gesendet',
  DATABASE_CREATED: 'Datenbank erstellt',
  DATABASE_DELETED: 'Datenbank gelöscht',
  PASSWORD_ROTATED: 'Passwort geändert',
  BACKUP_CREATED: 'Sicherung erstellt',
  BACKUP_RESTORED: 'Sicherung wiederhergestellt',
  FILE_UPLOADED: 'Datei hochgeladen',
  FILE_DELETED: 'Datei gelöscht',
  SETTINGS_SAVED: 'Einstellungen gespeichert'
};

// ==================== LOGGING ====================
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// ==================== GUI STRINGS ====================
export const GUI_STRINGS = {
  TITLE_MAIN: 'Pterodactyl Bridge',
  TITLE_SERVERS: 'Server Management',
  TITLE_CONSOLE: 'Server Konsole',
  TITLE_FILES: 'Dateiverwaltung',
  TITLE_DATABASE: 'Datenbankverwaltung',
  TITLE_BACKUPS: 'Sicherungen',
  TITLE_SCHEDULES: 'Zeitpläne',
  TITLE_SETTINGS: 'Einstellungen',

  BUTTON_START: 'Start',
  BUTTON_STOP: 'Stop',
  BUTTON_RESTART: 'Neustart',
  BUTTON_KILL: 'Beenden',
  BUTTON_REFRESH: 'Aktualisieren',
  BUTTON_BACK: 'Zurück',
  BUTTON_CREATE: 'Erstellen',
  BUTTON_DELETE: 'Löschen',
  BUTTON_EDIT: 'Bearbeiten',
  BUTTON_SAVE: 'Speichern',
  BUTTON_CANCEL: 'Abbrechen'
};

// ==================== VALIDATION ====================
export const VALIDATION = {
  MIN_SERVER_NAME_LENGTH: 1,
  MAX_SERVER_NAME_LENGTH: 255,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_DATABASE_NAME_LENGTH: 1,
  MAX_DATABASE_NAME_LENGTH: 48,
  ALLOWED_FILE_EXTENSIONS: ['txt', 'json', 'yml', 'yaml', 'conf', 'cfg', 'properties', 'xml'],
  MAX_FILE_SIZE: 104857600 // 100 MB
};

// ==================== RATE LIMITING ====================
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 240,
  BURST_REQUESTS: 10,
  BURST_WINDOW: 1000 // 1 second
};
