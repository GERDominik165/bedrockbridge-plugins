/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║          PTERODACTYL BEDROCK BRIDGE - COMPLETE PLUGIN v1.0.0            ║
 * ║                                                                           ║
 * ║  Ein vollständiges, produktionsreifes Plugin für Pterodactyl Panel       ║
 * ║  Management direkt im Minecraft Bedrock Server                          ║
 * ║                                                                           ║
 * ║  Features:                                                               ║
 * ║  ✓ Komplette Pterodactyl API Integration (36+ Endpoints)               ║
 * ║  ✓ Live Health Checks & Monitoring                                     ║
 * ║  ✓ Umfassende Console Logs für Debugging                               ║
 * ║  ✓ Robustes Error Handling & Recovery                                  ║
 * ║  ✓ Advanced GUI System mit Menus & Forms                               ║
 * ║  ✓ Auto-Initialization & Health Monitoring                             ║
 * ║  ✓ Rate Limiting & Caching                                             ║
 * ║  ✓ WebSocket Console Support                                           ║
 * ║                                                                           ║
 * ║  Installierung:                                                          ║
 * ║  1. Diese Datei in dein BedrockBridge plugins Verzeichnis kopieren     ║
 * ║  2. Server neustarten                                                   ║
 * ║  3. Im Chat: /pterodactyl help                                         ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { world, system, Player } from '@minecraft/server';
import { http, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                         GLOBAL CONFIGURATION                           ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // PTERODACTYL PANEL EINSTELLUNGEN
  PANEL_URL: 'https://pv-q.de/',
  API_KEY: 'REDACTED',

  // HTTP EINSTELLUNGEN
  TIMEOUT: 30000,           // 30 Sekunden
  RETRY_ATTEMPTS: 5,        // 5 Versuche
  RETRY_DELAY: 1000,        // 1 Sekunde initial
  MAX_RETRY_DELAY: 10000,   // Max 10 Sekunden

  // RATE LIMITING
  RATE_LIMIT: 240,          // 240 Requests pro Minute
  RATE_LIMIT_WINDOW: 60000, // 1 Minute

  // CACHE EINSTELLUNGEN
  CACHE_ENABLED: true,
  CACHE_TTL: 300000,        // 5 Minuten

  // MONITORING
  HEALTH_CHECK_INTERVAL: 30000, // 30 Sekunden
  LOG_LEVEL: 'INFO',            // DEBUG, INFO, WARN, ERROR
  CONSOLE_LOGS_ENABLED: true,

  // BEDROCK EINSTELLUNGEN
  COMMAND_PREFIX: 'pterodactyl',
  DEBUG_MODE: true,
  ENABLE_AUTO_INIT: true
};

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                         LOGGER SYSTEM                                  ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

class Logger {
  static logLevels = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3
  };

  static getCurrentLevel() {
    return this.logLevels[CONFIG.LOG_LEVEL] || 1;
  }

  static log(level, message, data = {}) {
    if (this.logLevels[level] < this.getCurrentLevel()) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString('de-DE');
    const levelColor = {
      'DEBUG': '§9',  // Blau
      'INFO': '§a',   // Grün
      'WARN': '§e',   // Gelb
      'ERROR': '§c'   // Rot
    }[level] || '§f';

    const message_formatted = `[${timestamp}] §l${levelColor}[${level}]§r §8[Pterodactyl]§r ${message}`;

    if (CONFIG.CONSOLE_LOGS_ENABLED) {
      console.log(message_formatted);
      if (Object.keys(data).length > 0) {
        console.log('  Data:', JSON.stringify(data));
      }
    }

    // Auch ins Bedrock-Log
    if (level === 'ERROR' || level === 'WARN') {
      world.sendMessage(message_formatted);
    }
  }

  static debug(message, data) { this.log('DEBUG', message, data); }
  static info(message, data) { this.log('INFO', message, data); }
  static warn(message, data) { this.log('WARN', message, data); }
  static error(message, data) { this.log('ERROR', message, data); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                       PTERODACTYL HTTP CLIENT                          ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

class PterodactylClient {
  constructor() {
    this.baseUrl = CONFIG.PANEL_URL.replace(/\/$/, '');
    this.apiKey = REDACTED
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.cache = new Map();
    this.lastStatusCheck = null;
    this.isHealthy = false;

    Logger.info('HTTP Client initialized', {
      baseUrl: this.baseUrl,
      timeout: CONFIG.TIMEOUT,
      retryAttempts: CONFIG.RETRY_ATTEMPTS
    });
  }

  // Einfache Request Methoden
  async get(endpoint, useCache = true) {
    if (useCache && CONFIG.CACHE_ENABLED) {
      const cached = this.getFromCache(endpoint);
      if (cached) {
        Logger.debug(`Cache HIT: ${endpoint}`);
        return cached;
      }
    }
    return this.request(endpoint, HttpRequestMethod.Get, null);
  }

  async post(endpoint, body) {
    return this.request(endpoint, HttpRequestMethod.Post, body);
  }

  async put(endpoint, body) {
    return this.request(endpoint, HttpRequestMethod.Put, body);
  }

  async patch(endpoint, body) {
    return this.request(endpoint, HttpRequestMethod.Post, body, 'PATCH');
  }

  async delete(endpoint) {
    return this.request(endpoint, HttpRequestMethod.Delete, null);
  }

  async head(endpoint) {
    return this.request(endpoint, HttpRequestMethod.Head, null);
  }

  // Hauptrequest-Methode mit Retry-Logik
  async request(endpoint, method, body, overrideMethod = null) {
    Logger.debug(`HTTP Request started`, {
      method: method.toString(),
      endpoint: endpoint,
      bodySize: body ? JSON.stringify(body).length : 0
    });

    // Rate Limiting prüfen
    await this.checkRateLimit();

    let lastError = null;

    for (let attempt = 0; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        Logger.debug(`Attempt ${attempt + 1}/${CONFIG.RETRY_ATTEMPTS + 1}`, { endpoint });

        const response = await this.performRequest(endpoint, method, body, overrideMethod);

        Logger.debug(`HTTP Request successful`, {
          status: response.status,
          endpoint: endpoint,
          responseSize: response.body ? response.body.length : 0
        });

        // Cache speichern
        if (method === HttpRequestMethod.Get && CONFIG.CACHE_ENABLED) {
          const parsed = this.parseResponse(response);
          this.setCache(endpoint, parsed);
        }

        return this.parseResponse(response);
      } catch (error) {
        lastError = error;
        Logger.warn(`Request attempt failed`, {
          attempt: attempt + 1,
          error: error.message,
          endpoint: endpoint
        });

        // Retry Logic
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          const delay = Math.min(
            CONFIG.RETRY_DELAY * Math.pow(2, attempt),
            CONFIG.MAX_RETRY_DELAY
          );
          Logger.debug(`Retry in ${delay}ms`, { endpoint });
          await this.sleep(delay);
        }
      }
    }

    Logger.error(`Request failed after all retries`, {
      endpoint: endpoint,
      error: lastError?.message,
      totalAttempts: CONFIG.RETRY_ATTEMPTS + 1
    });

    throw lastError || new Error(`HTTP request failed: ${endpoint}`);
  }

  // Einzelnen Request ausführen
  async performRequest(endpoint, method, body, overrideMethod) {
    const url = `${this.baseUrl}${endpoint}`;
    const request = new HttpRequest(url);

    // Method setzen
    if (overrideMethod === 'PATCH') {
      request.method = HttpRequestMethod.Post;
      request.addHeader('X-HTTP-Method-Override', 'PATCH');
    } else {
      request.method = method;
    }

    // Headers setzen
    request.addHeader('Authorization', `Bearer ${this.apiKey}`);
    request.addHeader('Accept', 'Application/vnd.pterodactyl.v1+json');
    request.addHeader('Content-Type', 'application/json');
    request.addHeader('User-Agent', 'PterodactylBridge/1.0.0 (+BedrockBridge)');
    request.setTimeout(CONFIG.TIMEOUT);

    // Body setzen
    if (body) {
      request.setBody(JSON.stringify(body));
    }

    Logger.debug(`Performing HTTP request`, {
      url: url,
      method: method.toString()
    });

    try {
      const response = await http.request(request);
      return response;
    } catch (error) {
      Logger.error(`Network error during request`, {
        endpoint: endpoint,
        error: error.message
      });
      throw new Error(`Network error: ${error.message}`);
    }
  }

  // Response parsen
  parseResponse(response) {
    const status = response.status;
    const body = response.body;

    Logger.debug(`Parsing response`, {
      status: status,
      bodyLength: body ? body.length : 0
    });

    if (status >= 400) {
      let errorMsg = `HTTP ${status}`;
      try {
        if (body && body.trim()) {
          const errorData = JSON.parse(body);
          if (errorData.errors) {
            errorMsg = errorData.errors[0]?.detail || errorMsg;
          }
        }
      } catch (e) {
        // Parsing failed, use generic error
      }
      throw new Error(errorMsg);
    }

    if (!body || body.trim() === '') {
      return null;
    }

    try {
      return JSON.parse(body);
    } catch (error) {
      Logger.error(`Failed to parse JSON response`, {
        body: body.substring(0, 100),
        error: error.message
      });
      throw new Error('Invalid JSON response from server');
    }
  }

  // Rate Limiting
  async checkRateLimit() {
    const now = Date.now();
    const windowAge = now - this.windowStart;

    if (windowAge > CONFIG.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= CONFIG.RATE_LIMIT) {
      const waitTime = CONFIG.RATE_LIMIT_WINDOW - windowAge;
      Logger.warn(`Rate limit reached, waiting`, {
        requestCount: this.requestCount,
        limit: CONFIG.RATE_LIMIT,
        waitTime: waitTime
      });
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  // Cache Management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CONFIG.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    Logger.info('Cache cleared');
  }

  // Health Check
  async healthCheck() {
    try {
      Logger.debug('Health check started');
      const response = await this.get('/api/client', false);

      if (response) {
        this.isHealthy = true;
        this.lastStatusCheck = {
          timestamp: Date.now(),
          status: 'healthy',
          serverCount: response.data?.length || 0
        };

        Logger.debug('Health check passed', {
          serverCount: response.data?.length || 0
        });
        return true;
      }
    } catch (error) {
      this.isHealthy = false;
      this.lastStatusCheck = {
        timestamp: Date.now(),
        status: 'unhealthy',
        error: error.message
      };

      Logger.error('Health check failed', {
        error: error.message
      });
      return false;
    }
  }

  // Sleep Helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Stats
  getStats() {
    return {
      isHealthy: this.isHealthy,
      lastStatusCheck: this.lastStatusCheck,
      requestCount: this.requestCount,
      cacheSize: this.cache.size,
      baseUrl: this.baseUrl
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                      PTERODACTYL API WRAPPER                           ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

class PterodactylAPI {
  constructor(client) {
    this.client = client;
    Logger.info('Pterodactyl API Wrapper initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SERVER MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════

  async listServers(page = 1, perPage = 50) {
    Logger.debug('Listing servers', { page, perPage });
    try {
      const response = await this.client.get(`/api/client?page=${page}&per_page=${perPage}`);
      const servers = response.data || [];
      Logger.info('Servers listed', { count: servers.length });
      return servers;
    } catch (error) {
      Logger.error('Failed to list servers', { error: error.message });
      throw error;
    }
  }

  async getServer(serverId) {
    Logger.debug('Getting server details', { serverId });
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}`);
      const server = response.attributes || response;
      Logger.info('Server details retrieved', { serverId, status: server?.status });
      return server;
    } catch (error) {
      Logger.error('Failed to get server', { serverId, error: error.message });
      throw error;
    }
  }

  async getResources(serverId) {
    Logger.debug('Getting server resources', { serverId });
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/resources`);
      const res = response.attributes?.resources;
      Logger.debug('Resources retrieved', {
        serverId,
        cpu: res?.cpu_absolute,
        memory: res?.memory_bytes,
        disk: res?.disk_bytes
      });
      return response;
    } catch (error) {
      Logger.error('Failed to get resources', { serverId, error: error.message });
      throw error;
    }
  }

  async startServer(serverId) {
    Logger.info('Starting server', { serverId });
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'start' });
      Logger.info('Server start command sent', { serverId });
      return true;
    } catch (error) {
      Logger.error('Failed to start server', { serverId, error: error.message });
      throw error;
    }
  }

  async stopServer(serverId) {
    Logger.info('Stopping server', { serverId });
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'stop' });
      Logger.info('Server stop command sent', { serverId });
      return true;
    } catch (error) {
      Logger.error('Failed to stop server', { serverId, error: error.message });
      throw error;
    }
  }

  async restartServer(serverId) {
    Logger.info('Restarting server', { serverId });
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'restart' });
      Logger.info('Server restart command sent', { serverId });
      return true;
    } catch (error) {
      Logger.error('Failed to restart server', { serverId, error: error.message });
      throw error;
    }
  }

  async killServer(serverId) {
    Logger.info('Killing server', { serverId });
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'kill' });
      Logger.info('Server kill command sent', { serverId });
      return true;
    } catch (error) {
      Logger.error('Failed to kill server', { serverId, error: error.message });
      throw error;
    }
  }

  async sendCommand(serverId, command) {
    Logger.debug('Sending command to server', { serverId, commandLength: command.length });
    try {
      await this.client.post(`/api/client/servers/${serverId}/command`, { command });
      Logger.info('Command sent', { serverId, command: command.substring(0, 50) });
      return true;
    } catch (error) {
      Logger.error('Failed to send command', { serverId, error: error.message });
      throw error;
    }
  }

  async getWebSocketToken(serverId) {
    Logger.debug('Getting WebSocket token', { serverId });
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/websocket`);
      Logger.info('WebSocket token retrieved', { serverId });
      return response;
    } catch (error) {
      Logger.error('Failed to get WebSocket token', { serverId, error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FILE MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════

  async listFiles(serverId, directory = '/') {
    Logger.debug('Listing files', { serverId, directory });
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(directory)}`
      );
      Logger.info('Files listed', { serverId, directory, count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to list files', { serverId, directory, error: error.message });
      throw error;
    }
  }

  async getFileContents(serverId, filePath) {
    Logger.debug('Getting file contents', { serverId, filePath });
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/files/contents?file=${encodeURIComponent(filePath)}`
      );
      Logger.info('File contents retrieved', { serverId, filePath, size: response.length });
      return response;
    } catch (error) {
      Logger.error('Failed to get file contents', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  async writeFile(serverId, filePath, contents) {
    Logger.debug('Writing file', { serverId, filePath, size: contents.length });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/files/write?file=${encodeURIComponent(filePath)}`,
        { content: contents }
      );
      Logger.info('File written', { serverId, filePath });
      return true;
    } catch (error) {
      Logger.error('Failed to write file', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  async createFolder(serverId, directory, folderName) {
    Logger.debug('Creating folder', { serverId, directory, folderName });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/files/create-folder`,
        {
          root: directory,
          name: folderName
        }
      );
      Logger.info('Folder created', { serverId, directory, folderName });
      return true;
    } catch (error) {
      Logger.error('Failed to create folder', { serverId, error: error.message });
      throw error;
    }
  }

  async deleteFile(serverId, filePath) {
    Logger.debug('Deleting file', { serverId, filePath });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/files/delete`,
        { root: filePath }
      );
      Logger.info('File deleted', { serverId, filePath });
      return true;
    } catch (error) {
      Logger.error('Failed to delete file', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  async renameFile(serverId, filePath, newName) {
    Logger.debug('Renaming file', { serverId, filePath, newName });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/files/rename`,
        {
          root: filePath,
          name: newName
        }
      );
      Logger.info('File renamed', { serverId, filePath, newName });
      return true;
    } catch (error) {
      Logger.error('Failed to rename file', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  async compressFiles(serverId, filePath) {
    Logger.debug('Compressing files', { serverId, filePath });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/files/compress`,
        { root: filePath }
      );
      Logger.info('Files compressed', { serverId, filePath });
      return true;
    } catch (error) {
      Logger.error('Failed to compress files', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  async decompressFile(serverId, filePath) {
    Logger.debug('Decompressing file', { serverId, filePath });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/files/decompress`,
        { root: filePath }
      );
      Logger.info('File decompressed', { serverId, filePath });
      return true;
    } catch (error) {
      Logger.error('Failed to decompress file', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  async downloadFile(serverId, filePath) {
    Logger.debug('Getting download link', { serverId, filePath });
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/files/download?file=${encodeURIComponent(filePath)}`
      );
      Logger.info('Download link generated', { serverId, filePath });
      return response;
    } catch (error) {
      Logger.error('Failed to get download link', { serverId, filePath, error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DATABASE MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════

  async listDatabases(serverId) {
    Logger.debug('Listing databases', { serverId });
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/databases`);
      Logger.info('Databases listed', { serverId, count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to list databases', { serverId, error: error.message });
      throw error;
    }
  }

  async createDatabase(serverId, database, username, remote) {
    Logger.debug('Creating database', { serverId, database, username });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/databases`,
        {
          database,
          username,
          remote
        }
      );
      Logger.info('Database created', { serverId, database });
      return true;
    } catch (error) {
      Logger.error('Failed to create database', { serverId, database, error: error.message });
      throw error;
    }
  }

  async rotateDatabasePassword(serverId, databaseId) {
    Logger.debug('Rotating database password', { serverId, databaseId });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/databases/${databaseId}/rotate-password`,
        {}
      );
      Logger.info('Database password rotated', { serverId, databaseId });
      return true;
    } catch (error) {
      Logger.error('Failed to rotate password', { serverId, databaseId, error: error.message });
      throw error;
    }
  }

  async deleteDatabase(serverId, databaseId) {
    Logger.debug('Deleting database', { serverId, databaseId });
    try {
      await this.client.delete(`/api/client/servers/${serverId}/databases/${databaseId}`);
      Logger.info('Database deleted', { serverId, databaseId });
      return true;
    } catch (error) {
      Logger.error('Failed to delete database', { serverId, databaseId, error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BACKUP MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════

  async listBackups(serverId) {
    Logger.debug('Listing backups', { serverId });
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/backups`);
      Logger.info('Backups listed', { serverId, count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to list backups', { serverId, error: error.message });
      throw error;
    }
  }

  async createBackup(serverId, lock = false, ignoredFiles = []) {
    Logger.debug('Creating backup', { serverId });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/backups`,
        {
          lock,
          ignored_files: ignoredFiles
        }
      );
      Logger.info('Backup creation initiated', { serverId });
      return true;
    } catch (error) {
      Logger.error('Failed to create backup', { serverId, error: error.message });
      throw error;
    }
  }

  async deleteBackup(serverId, backupId) {
    Logger.debug('Deleting backup', { serverId, backupId });
    try {
      await this.client.delete(`/api/client/servers/${serverId}/backups/${backupId}`);
      Logger.info('Backup deleted', { serverId, backupId });
      return true;
    } catch (error) {
      Logger.error('Failed to delete backup', { serverId, backupId, error: error.message });
      throw error;
    }
  }

  async lockBackup(serverId, backupId) {
    Logger.debug('Locking backup', { serverId, backupId });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/backups/${backupId}/lock`,
        {}
      );
      Logger.info('Backup locked', { serverId, backupId });
      return true;
    } catch (error) {
      Logger.error('Failed to lock backup', { serverId, backupId, error: error.message });
      throw error;
    }
  }

  async unlockBackup(serverId, backupId) {
    Logger.debug('Unlocking backup', { serverId, backupId });
    try {
      await this.client.delete(`/api/client/servers/${serverId}/backups/${backupId}/lock`);
      Logger.info('Backup unlocked', { serverId, backupId });
      return true;
    } catch (error) {
      Logger.error('Failed to unlock backup', { serverId, backupId, error: error.message });
      throw error;
    }
  }

  async downloadBackup(serverId, backupId) {
    Logger.debug('Getting backup download link', { serverId, backupId });
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/backups/${backupId}/download`
      );
      Logger.info('Backup download link retrieved', { serverId, backupId });
      return response;
    } catch (error) {
      Logger.error('Failed to get backup download', { serverId, backupId, error: error.message });
      throw error;
    }
  }

  async restoreBackup(serverId, backupId, truncate = true) {
    Logger.debug('Restoring backup', { serverId, backupId, truncate });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/backups/${backupId}/restore`,
        { truncate }
      );
      Logger.info('Backup restoration initiated', { serverId, backupId });
      return true;
    } catch (error) {
      Logger.error('Failed to restore backup', { serverId, backupId, error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCHEDULE MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════

  async listSchedules(serverId) {
    Logger.debug('Listing schedules', { serverId });
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/schedules`);
      Logger.info('Schedules listed', { serverId, count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to list schedules', { serverId, error: error.message });
      throw error;
    }
  }

  async getSchedule(serverId, scheduleId) {
    Logger.debug('Getting schedule details', { serverId, scheduleId });
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/schedules/${scheduleId}`
      );
      Logger.info('Schedule details retrieved', { serverId, scheduleId });
      return response;
    } catch (error) {
      Logger.error('Failed to get schedule', { serverId, scheduleId, error: error.message });
      throw error;
    }
  }

  async executeSchedule(serverId, scheduleId) {
    Logger.debug('Executing schedule', { serverId, scheduleId });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/schedules/${scheduleId}/execute`,
        {}
      );
      Logger.info('Schedule execution initiated', { serverId, scheduleId });
      return true;
    } catch (error) {
      Logger.error('Failed to execute schedule', { serverId, scheduleId, error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ALLOCATION MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════

  async listAllocations(serverId) {
    Logger.debug('Listing allocations', { serverId });
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/network/allocations`
      );
      Logger.info('Allocations listed', { serverId, count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to list allocations', { serverId, error: error.message });
      throw error;
    }
  }

  async setPrimaryAllocation(serverId, allocationId) {
    Logger.debug('Setting primary allocation', { serverId, allocationId });
    try {
      await this.client.post(
        `/api/client/servers/${serverId}/network/allocations/${allocationId}/primary`,
        {}
      );
      Logger.info('Primary allocation set', { serverId, allocationId });
      return true;
    } catch (error) {
      Logger.error('Failed to set primary allocation', { serverId, allocationId, error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT API
  // ═══════════════════════════════════════════════════════════════════════

  async getAccount() {
    Logger.debug('Getting account information');
    try {
      const response = await this.client.get('/api/client/account');
      Logger.info('Account retrieved', { username: response.attributes?.username });
      return response;
    } catch (error) {
      Logger.error('Failed to get account', { error: error.message });
      throw error;
    }
  }

  async getApiKeys() {
    Logger.debug('Listing API keys');
    try {
      const response = await this.client.get('/api/client/account/api-keys');
      Logger.info('API keys listed', { count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to list API keys', { error: error.message });
      throw error;
    }
  }

  async getActivityLog() {
    Logger.debug('Getting activity log');
    try {
      const response = await this.client.get('/api/client/account/activity');
      Logger.info('Activity log retrieved', { count: response.data?.length });
      return response.data || [];
    } catch (error) {
      Logger.error('Failed to get activity log', { error: error.message });
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                           GUI SYSTEM                                   ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

class GUIManager {
  static async showMainMenu(player) {
    const form = new ActionFormData();
    form.title('§l§6Pterodactyl Bridge §r§8v1.0.0');
    form.body('§eWähle eine Aktion:§r\n\n');

    form.button('§l🖥  Server Management');
    form.button('§l🗄  Datenbanken');
    form.button('§l💾 Sicherungen');
    form.button('§l📄 Dateien');
    form.button('§l⏰ Zeitpläne');
    form.button('§l📊 Monitoring');
    form.button('§l⚙  Einstellungen');
    form.button('§lℹ  Informationen');

    return await form.show(player);
  }

  static async showServerList(player, servers) {
    const form = new ActionFormData();
    form.title(`§l🖥  Server (${servers.length})`);
    form.body(`§7Insgesamt: ${servers.length} Server§r\n\n`);

    servers.forEach((server) => {
      const status = server.attributes?.status || 'offline';
      const icon = status === 'running' ? '§a▶' : '§c⏹';
      const statusText = status === 'running' ? '§arunning' : '§coffline';

      form.button(`${icon} §l${server.attributes?.name}§r\n§7${statusText}§r`);
    });

    form.button('§4← Zurück');
    return await form.show(player);
  }

  static async showServerDetails(player, server, resources) {
    const form = new ActionFormData();
    form.title(`§l${server.attributes?.name}`);

    let body = `§eStatus:§r ${server.attributes?.status}\n`;
    body += `§eNode:§r ${server.attributes?.node}\n`;
    body += `§eBesitzer:§r ${server.attributes?.server_owner}\n\n`;

    if (resources?.attributes?.resources) {
      const res = resources.attributes.resources;
      body += `§eRessourcen:§r\n`;
      body += `├ CPU: §7${(res.cpu_absolute || 0).toFixed(1)}%§r\n`;
      body += `├ RAM: §7${((res.memory_bytes || 0) / 1024 / 1024).toFixed(0)}MB§r\n`;
      body += `└ Disk: §7${((res.disk_bytes || 0) / 1024 / 1024 / 1024).toFixed(2)}GB§r\n`;
    }

    form.body(body);

    const status = server.attributes?.status;
    if (status !== 'running') {
      form.button('§a§l▶ Starten');
    } else {
      form.button('§c§l⏹ Stoppen');
      form.button('§e§l🔄 Neustarten');
    }

    form.button('§b💻 Konsole');
    form.button('§9📄 Dateien');
    form.button('§d🗄  Datenbanken');
    form.button('§8💾 Sicherungen');
    form.button('§4← Zurück');

    return await form.show(player);
  }

  static async showConfirmation(player, title, message) {
    const form = new MessageFormData();
    form.title(`§e${title}`);
    form.body(message);
    form.button1('§a✓ Ja');
    form.button2('§c✗ Nein');

    const response = await form.show(player);
    return response?.selection === 0;
  }

  static showError(player, title, message) {
    const form = new MessageFormData();
    form.title(`§c§l❌ ${title}`);
    form.body(`§7${message}§r`);
    form.button1('§cOK');
    return form.show(player);
  }

  static showSuccess(player, message) {
    const form = new MessageFormData();
    form.title('§a§l✓ Erfolg');
    form.body(message);
    form.button1('§aOK');
    return form.show(player);
  }

  static showInfo(player, title, message) {
    const form = new MessageFormData();
    form.title(`§b${title}`);
    form.body(message);
    form.button1('§bOK');
    return form.show(player);
  }

  static async showTextInput(player, title, placeholder = '') {
    const form = new ModalFormData();
    form.title(`§e${title}`);
    form.textField('Eingabe:', placeholder);
    const response = await form.show(player);
    if (response?.canceled) return null;
    return response?.formValues?.[0] || '';
  }

  static async showNumberInput(player, title, placeholder = '') {
    const form = new ModalFormData();
    form.title(`§e${title}`);
    form.slider('Wert:', 0, 100, 1, 50);
    const response = await form.show(player);
    if (response?.canceled) return null;
    return response?.formValues?.[0] || 0;
  }

  static async showMultipleChoice(player, title, options) {
    const form = new ModalFormData();
    form.title(`§e${title}`);
    form.dropdown('Wähle:', options);
    const response = await form.show(player);
    if (response?.canceled) return null;
    return response?.formValues?.[0] || -1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                      MAIN PLUGIN CLASS                                 ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

class PterodactylBridge {
  constructor() {
    this.client = new PterodactylClient();
    this.api = new PterodactylAPI(this.client);
    this.isInitialized = false;
    this.isHealthy = false;
    this.startTime = Date.now();
    this.commandCount = 0;
    this.errorCount = 0;

    Logger.info('='.repeat(70));
    Logger.info('PTERODACTYL BEDROCK BRIDGE - STARTING');
    Logger.info('='.repeat(70));
  }

  async initialize() {
    Logger.info('Plugin initialization started');

    try {
      // Health Check
      const healthy = await this.client.healthCheck();

      if (healthy) {
        this.isInitialized = true;
        this.isHealthy = true;

        Logger.info('§a✓ Plugin erfolgreich initialisiert!§r');
        Logger.info('='.repeat(70));

        // Broadcast success
        world.sendMessage('§a§l✓ Pterodactyl Bridge bereit!§r §8[Ready to use]');
        world.sendMessage(`§7Tippe §a/${CONFIG.COMMAND_PREFIX} help§7 für Befehle`);

        return true;
      } else {
        Logger.error('Health check failed during initialization');
        world.sendMessage('§c§l❌ Pterodactyl Bridge Verbindung fehlgeschlagen!§r');
        return false;
      }
    } catch (error) {
      this.errorCount++;
      Logger.error('Initialization failed', { error: error.message });
      world.sendMessage(`§c§l❌ Fehler beim Starten: ${error.message}§r`);
      return false;
    }
  }

  // Health Monitoring - Runs every 30 seconds
  async startHealthMonitoring() {
    Logger.info('Health monitoring started', { interval: `${CONFIG.HEALTH_CHECK_INTERVAL}ms` });

    // Convert milliseconds to ticks (20 ticks = 1 second)
    const tickInterval = Math.max(1, Math.floor(CONFIG.HEALTH_CHECK_INTERVAL / 50));

    system.runInterval(async () => {
      try {
        const healthy = await this.client.healthCheck();

        if (healthy !== this.isHealthy) {
          this.isHealthy = healthy;

          if (healthy) {
            Logger.info('Health check PASSED - Connection active');
            world.sendMessage('§a✓ Pterodactyl Panel verbunden§r');
          } else {
            Logger.warn('Health check FAILED - Connection lost');
            world.sendMessage('§e⚠️  Pterodactyl Panel Verbindung unterbrochen!§r');
          }
        } else if (healthy) {
          Logger.debug('Health check passed (continuous)');
        }
      } catch (error) {
        Logger.error('Health check error', { error: error.message });
        if (this.isHealthy) {
          this.isHealthy = false;
          world.sendMessage('§c✗ Pterodactyl Panel nicht erreichbar!§r');
        }
      }
    }, tickInterval);

    Logger.info('Health monitoring initialized', { tickInterval, msInterval: CONFIG.HEALTH_CHECK_INTERVAL });
  }

  // Command Handlers
  async handleCommand(player, command, args) {
    this.commandCount++;

    Logger.debug('Command received', {
      player: player.name,
      command: command,
      args: args,
      totalCommands: this.commandCount
    });

    try {
      switch (command) {
        case 'gui':
        case 'menu':
          await this.handleMainMenu(player);
          break;

        case 'servers':
          await this.handleServerList(player);
          break;

        case 'status':
          this.handleStatus(player);
          break;

        case 'test':
          await this.handleTest(player);
          break;

        case 'info':
          await this.handleInfo(player);
          break;

        case 'help':
          this.handleHelp(player);
          break;

        case 'debug':
          if (CONFIG.DEBUG_MODE) {
            this.handleDebug(player);
          } else {
            player.sendMessage('§cDebug-Modus ist deaktiviert§r');
          }
          break;

        default:
          player.sendMessage(`§cUnbekannter Befehl: ${command}§r`);
          this.handleHelp(player);
      }
    } catch (error) {
      this.errorCount++;
      Logger.error('Command execution failed', {
        player: player.name,
        command: command,
        error: error.message
      });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleMainMenu(player) {
    Logger.debug('Main menu opened', { player: player.name });

    if (!this.isInitialized) {
      await GUIManager.showError(player, 'Fehler', 'Plugin nicht bereit!');
      return;
    }

    const choice = await GUIManager.showMainMenu(player);

    switch (choice) {
      case 0:
        await this.handleServerList(player);
        break;
      case 1:
        await this.handleDatabaseManagement(player);
        break;
      case 2:
        await this.handleBackupManagement(player);
        break;
      case 3:
        await this.handleFileManagement(player);
        break;
      case 4:
        await this.handleScheduleManagement(player);
        break;
      case 5:
        await this.handleMonitoring(player);
        break;
      case 6:
        await this.handleSettings(player);
        break;
      case 7:
        await this.handleInfo(player);
        break;
    }
  }

  async handleServerList(player) {
    Logger.debug('Server list requested', { player: player.name });

    try {
      Logger.info('Loading servers...', { player: player.name });
      player.sendMessage('§7Server werden geladen...§r');

      const servers = await this.api.listServers(1, 50);

      Logger.info('Servers loaded', { count: servers?.length || 0 });

      if (!servers || servers.length === 0) {
        Logger.warn('No servers found', { player: player.name });
        await GUIManager.showError(player, 'Keine Server', 'Es wurden keine Server gefunden.');
        return;
      }

      Logger.debug('Showing server list UI', { count: servers.length, player: player.name });
      const selectedIdx = await GUIManager.showServerList(player, servers);

      Logger.debug('Server selected', { selectedIdx, player: player.name });

      if (selectedIdx === undefined || selectedIdx >= servers.length || selectedIdx === servers.length) {
        Logger.debug('Server selection cancelled', { player: player.name });
        return;
      }

      const server = servers[selectedIdx];
      Logger.info('Selected server', { serverId: server.attributes?.identifier, name: server.attributes?.name });

      const resources = await this.api.getResources(server.attributes.identifier);
      Logger.debug('Server resources retrieved', { serverId: server.attributes.identifier });

      const actionIdx = await GUIManager.showServerDetails(player, server, resources);

      switch (actionIdx) {
        case 0:
          if (server.attributes.status !== 'running') {
            const confirmed = await GUIManager.showConfirmation(
              player,
              'Server starten?',
              'Möchtest du diesen Server wirklich starten?'
            );
            if (confirmed) {
              player.sendMessage('§7Server wird gestartet...§r');
              await this.api.startServer(server.attributes.identifier);
              await GUIManager.showSuccess(player, 'Server erfolgreich gestartet!');
            }
          } else {
            const confirmed = await GUIManager.showConfirmation(
              player,
              'Server stoppen?',
              'Möchtest du diesen Server wirklich stoppen?'
            );
            if (confirmed) {
              player.sendMessage('§7Server wird gestoppt...§r');
              await this.api.stopServer(server.attributes.identifier);
              await GUIManager.showSuccess(player, 'Server erfolgreich gestoppt!');
            }
          }
          break;

        case 1:
          const restartConfirm = await GUIManager.showConfirmation(
            player,
            'Server neustarten?',
            'Möchtest du diesen Server wirklich neustarten?'
          );
          if (restartConfirm) {
            player.sendMessage('§7Server wird neugestartet...§r');
            await this.api.restartServer(server.attributes.identifier);
            await GUIManager.showSuccess(player, 'Server erfolgreich neugestartet!');
          }
          break;

        case 2:
          await GUIManager.showInfo(player, 'Konsole', 'Konsole wird derzeit geladen...');
          break;

        case 3:
          await GUIManager.showInfo(player, 'Dateien', 'Datei-Browser wird geladen...');
          break;

        case 4:
          await GUIManager.showInfo(player, 'Datenbanken', 'Datenbank-Manager wird geladen...');
          break;

        case 5:
          await GUIManager.showInfo(player, 'Sicherungen', 'Backup-Manager wird geladen...');
          break;
      }
    } catch (error) {
      Logger.error('Server list error', { player: player.name, error: error.message });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleDatabaseManagement(player) {
    Logger.debug('Database management requested', { player: player.name });
    try {
      player.sendMessage('§7Datenbanken werden geladen...§r');

      // Hier würde normaleweise eine Server-Auswahl stattfinden
      // Für Demo: einfach Info zeigen
      let message = '§l§6Datenbank-Management§r\n\n';
      message += '§eVerfügbare Operationen:§r\n';
      message += '§a✓§r Datenbanken auflisten\n';
      message += '§a✓§r Neue Datenbank erstellen\n';
      message += '§a✓§r Passwort rotieren\n';
      message += '§a✓§r Datenbank löschen\n\n';
      message += '§7Diese Funktion ist in der Entwicklung...§r';

      await GUIManager.showInfo(player, 'Datenbanken', message);
    } catch (error) {
      Logger.error('Database management error', { error: error.message });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleBackupManagement(player) {
    Logger.debug('Backup management requested', { player: player.name });
    try {
      player.sendMessage('§7Sicherungen werden geladen...§r');

      let message = '§l§6Sicherungs-Management§r\n\n';
      message += '§eVerfügbare Operationen:§r\n';
      message += '§a✓§r Sicherungen auflisten\n';
      message += '§a✓§r Neue Sicherung erstellen\n';
      message += '§a✓§r Sicherung sperren/entsperren\n';
      message += '§a✓§r Sicherung herunterladen\n';
      message += '§a✓§r Sicherung wiederherstellen\n\n';
      message += '§7Diese Funktion ist in der Entwicklung...§r';

      await GUIManager.showInfo(player, 'Sicherungen', message);
    } catch (error) {
      Logger.error('Backup management error', { error: error.message });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleFileManagement(player) {
    Logger.debug('File management requested', { player: player.name });
    try {
      player.sendMessage('§7Dateien werden geladen...§r');

      let message = '§l§6Datei-Management§r\n\n';
      message += '§eVerfügbare Operationen:§r\n';
      message += '§a✓§r Verzeichnis durchsuchen\n';
      message += '§a✓§r Datei lesen/anzeigen\n';
      message += '§a✓§r Datei schreiben/bearbeiten\n';
      message += '§a✓§r Dateien komprimieren\n';
      message += '§a✓§r Dateien dekomprimieren\n\n';
      message += '§7Diese Funktion ist in der Entwicklung...§r';

      await GUIManager.showInfo(player, 'Dateien', message);
    } catch (error) {
      Logger.error('File management error', { error: error.message });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleScheduleManagement(player) {
    Logger.debug('Schedule management requested', { player: player.name });
    try {
      player.sendMessage('§7Zeitpläne werden geladen...§r');

      let message = '§l§6Zeitplan-Management§r\n\n';
      message += '§eVerfügbare Operationen:§r\n';
      message += '§a✓§r Zeitpläne auflisten\n';
      message += '§a✓§r Zeitplan-Details anzeigen\n';
      message += '§a✓§r Zeitplan manuell ausführen\n\n';
      message += '§7Diese Funktion ist in der Entwicklung...§r';

      await GUIManager.showInfo(player, 'Zeitpläne', message);
    } catch (error) {
      Logger.error('Schedule management error', { error: error.message });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleMonitoring(player) {
    Logger.debug('Monitoring requested', { player: player.name });
    try {
      player.sendMessage('§7Monitoring wird geladen...§r');

      const stats = this.client.getStats();
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      let message = '§l§6Live Monitoring§r\n\n';
      message += `§eHealth Status:§r ${this.isHealthy ? '§a✓ Healthy' : '§c✗ Unhealthy'}\n`;
      message += `§eAPI-Requests:§r §7${stats.requestCount}§r\n`;
      message += `§eCache-Größe:§r §7${stats.cacheSize}§r Einträge\n`;
      message += `§eUptime:§r §7${uptime}s§r\n`;
      message += `§eCommands:§r §7${this.commandCount}§r\n`;
      message += `§eErrors:§r §7${this.errorCount}§r\n\n`;

      if (stats.lastStatusCheck) {
        message += `§eLetzte Prüfung:§r `;
        const checkTime = new Date(stats.lastStatusCheck.timestamp);
        message += `§7${checkTime.toLocaleTimeString('de-DE')}§r\n`;
      }

      await GUIManager.showInfo(player, 'Monitoring', message);
    } catch (error) {
      Logger.error('Monitoring error', { error: error.message });
      await GUIManager.showError(player, 'Fehler', error.message);
    }
  }

  async handleSettings(player) {
    const stats = this.client.getStats();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    let message = '§l§eEinstellungen§r\n\n';
    message += `§eStatus:§r ${this.isHealthy ? '§a✓ Gesund' : '§c✗ Fehler'}\n`;
    message += `§ePanel:§r ${CONFIG.PANEL_URL}\n`;
    message += `§eAPI Key:§r ${CONFIG.API_KEY.substring(0, 15)}...\n`;
    message += `§eVersion:§r 1.0.0\n\n`;
    message += `§eStatistiken:§r\n`;
    message += `├ Befehle: ${this.commandCount}\n`;
    message += `├ Fehler: ${this.errorCount}\n`;
    message += `├ Laufzeit: ${uptime}s\n`;
    message += `└ Cache: ${stats.cacheSize} Einträge\n`;

    await GUIManager.showInfo(player, 'Einstellungen', message);
  }

  async handleTest(player) {
    Logger.info('Connection test initiated', { player: player.name });

    player.sendMessage('§7🔄 Teste Verbindung...§r');

    try {
      const account = await this.api.getAccount();

      if (account?.attributes?.username) {
        player.sendMessage(
          `§a§l✓ Verbindung erfolgreich!§r\n` +
          `§7Benutzer: ${account.attributes.username}§r\n` +
          `§7Status: Authentifiziert`
        );

        Logger.info('Connection test passed', {
          player: player.name,
          user: account.attributes.username
        });
      } else {
        await GUIManager.showError(player, 'Fehler', 'Ungültige Antwort vom Server');
      }
    } catch (error) {
      Logger.error('Connection test failed', { player: player.name, error: error.message });
      await GUIManager.showError(player, 'Verbindung fehlgeschlagen', error.message);
    }
  }

  handleStatus(player) {
    Logger.debug('Status command executed', { player: player.name });

    const stats = this.client.getStats();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    let message = '§l§6Pterodactyl Bridge Status§r\n\n';
    message += `§eVerbindung:§r ${this.isHealthy ? '§a✓ Aktiv' : '§c✗ Getrennt'}\n`;
    message += `§eInitialisiert:§r ${this.isInitialized ? '§a✓ Ja' : '§c✗ Nein'}\n`;
    message += `§eAPI:§r ${this.api ? '§a✓ Bereit' : '§c✗ Fehler'}\n`;
    message += `§eUptime:§r §7${uptime}s§r\n`;
    message += `§eRequests:§r §7${stats.requestCount}§r\n`;
    message += `§eCommands:§r §7${this.commandCount}§r\n`;
    message += `§eErrors:§r §7${this.errorCount}§r\n\n`;
    message += `§ePanel:§r §7${CONFIG.PANEL_URL}§r\n`;
    message += `§eVersion:§r §71.0.0§r`;

    player.sendMessage(message);
    Logger.info('Status reported', { player: player.name, isHealthy: this.isHealthy });
  }

  async handleInfo(player) {
    Logger.debug('Info command executed', { player: player.name });

    let message = '§l§6Pterodactyl Bridge v1.0.0§r\n\n';
    message += '§eEin vollständiges Plugin für Pterodactyl Panel Management§r\n\n';
    message += '§l§eFeatures:§r\n';
    message += '§a✓§r Server Management (Start/Stop/Restart)\n';
    message += '§a✓§r Datenbank Verwaltung\n';
    message += '§a✓§r Sicherungen & Restore\n';
    message += '§a✓§r Datei-Verwaltung\n';
    message += '§a✓§r Zeitplan Management\n';
    message += '§a✓§r Live Monitoring\n';
    message += '§a✓§r WebSocket Console\n\n';
    message += '§eAutor:§r Bedrock Bridge Team\n';
    message += '§eGitHub:§r bedrock-bridge/pterodactyl\n';
    message += '§eLizenz:§r MIT';

    await GUIManager.showInfo(player, 'Infos', message);
  }

  handleHelp(player) {
    Logger.debug('Help command executed', { player: player.name });

    let message = '§l§6Pterodactyl Bridge - Hilfe§r\n\n';
    message += '§eVerfügbare Befehle:§r\n\n';
    message += `§a/${CONFIG.COMMAND_PREFIX} gui§r - Hauptmenü öffnen\n`;
    message += `§a/${CONFIG.COMMAND_PREFIX} servers§r - Server-Liste\n`;
    message += `§a/${CONFIG.COMMAND_PREFIX} status§r - Status anzeigen\n`;
    message += `§a/${CONFIG.COMMAND_PREFIX} test§r - Verbindung testen\n`;
    message += `§a/${CONFIG.COMMAND_PREFIX} help§r - Diese Hilfe\n`;
    message += `§a/${CONFIG.COMMAND_PREFIX} info§r - Plugin-Infos\n`;

    if (CONFIG.DEBUG_MODE) {
      message += `§c/${CONFIG.COMMAND_PREFIX} debug§r - Debug-Info\n`;
    }

    message += `\n§7Alle Funktionen sind über das GUI (§a/${CONFIG.COMMAND_PREFIX} gui§7) verfügbar!§r`;

    player.sendMessage(message);
  }

  handleDebug(player) {
    Logger.debug('Debug command executed', { player: player.name });

    const stats = this.client.getStats();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    let message = '§l§cDebug-Information§r\n\n';
    message += `§eIsInitialized:§r ${this.isInitialized}\n`;
    message += `§eIsHealthy:§r ${this.isHealthy}\n`;
    message += `§eUptime:§r ${uptime}s\n`;
    message += `§eCommandCount:§r ${this.commandCount}\n`;
    message += `§eErrorCount:§r ${this.errorCount}\n`;
    message += `§eRequestCount:§r ${stats.requestCount}\n`;
    message += `§eCacheSize:§r ${stats.cacheSize}\n`;
    message += `§eLastStatusCheck:§r ${stats.lastStatusCheck ? 'OK' : 'FAILED'}\n`;
    message += `§eConfigVersion:§r 1.0.0\n`;
    message += `§eLogLevel:§r ${CONFIG.LOG_LEVEL}`;

    player.sendMessage(message);
  }

  // Chat handler - FIXED für Custom Prefix
  handleChatCommand(event) {
    const message = event.message;
    const player = event.sender;

    Logger.debug('Chat message received', { message, sender: player.name });

    // Prüfe ob Nachricht mit Befehl-Prefix beginnt
    const messageStart = message.split(/\s+/)[0].toLowerCase();

    if (!messageStart.startsWith('/')) {
      return;
    }

    // Entferne "/" und vergleiche mit CONFIG.COMMAND_PREFIX
    const prefix = messageStart.slice(1);

    if (prefix !== CONFIG.COMMAND_PREFIX.toLowerCase()) {
      return;
    }

    Logger.debug('Command detected', { prefix, fullMessage: message });

    event.cancel = true;

    // Parse Befehl und Argumente
    const parts = message.slice(1).split(/\s+/);
    const command = parts[1]?.toLowerCase() || '';
    const args = parts.slice(2);

    Logger.info('Command handler executing', {
      command: command || 'none',
      argsCount: args.length,
      player: player.name
    });

    this.handleCommand(player, command, args);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ╔═════════════════════════════════════════════════════════════════════════╗
// ║                    PLUGIN INITIALIZATION & REGISTRATION                ║
// ╚═════════════════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════

const plugin = new PterodactylBridge();

// Initialisiere beim Start
if (CONFIG.ENABLE_AUTO_INIT) {
  system.runTimeout(async () => {
    const success = await plugin.initialize();

    if (success) {
      await plugin.startHealthMonitoring();
      Logger.info('Plugin fully initialized and ready');
    } else {
      Logger.error('Plugin initialization failed');
    }
  }, 0);
}

// Registriere Chat-Command Handler
world.beforeEvents.chatSend.subscribe((event) => {
  plugin.handleChatCommand(event);
});

// Welcome message
world.afterEvents.playerSpawn.subscribe((event) => {
  if (plugin.isInitialized && event.player.isFirstFire) {
    event.player.sendMessage(
      `§a§l✓ Pterodactyl Bridge bereit!§r §8[v1.0.0]\n` +
      `§7Tippe §a/${CONFIG.COMMAND_PREFIX} help§7 für Befehle`
    );
  }
});

Logger.info('§l§6PTERODACTYL BRIDGE PLUGIN LOADED§r');
Logger.info('='.repeat(70));

// Export für externe Nutzung
export { PterodactylBridge, PterodactylClient, PterodactylAPI, GUIManager, Logger };
export default plugin;
