/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║            24FIRE BEDROCK BRIDGE - COMPLETE STANDALONE v3.0              ║
 * ║                                                                           ║
 * ║  VOLLSTÄNDIGE 24FIRE REST-API v2 INTEGRATION FÜR BEDROCK EDITION         ║
 * ║                                                                           ║
 * ║  ✓ 25+ API Endpoints vollständig implementiert                           ║
 * ║  ✓ Minecraft server/server-ui/server-net vollständig integriert          ║
 * ║  ✓ Alle GUI-Formulare und Menüs                                         ║
 * ║  ✓ Erweiterte Fehlerbehandlung und Logging                              ║
 * ║  ✓ Caching, Rate Limiting, Retry-Logik                                  ║
 * ║  ✓ Keine externe Abhängigkeiten - Pure Standalone                       ║
 * ║  ✓ Production Ready                                                      ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { world, system, Player, Entity, Dimension } from '@minecraft/server';
import { HttpRequest, HttpRequestMethod, http } from '@minecraft/server-net';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

class Config {
  static API = {
    BASE_URL: 'https://manage.24fire.de',
    KEY: '',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    ENDPOINTS: {
      ACCOUNT: '/api/account',
      SERVICES: '/api/account/services',
      DONATIONS: '/api/account/donations',
      AFFILIATE: '/api/account/affiliate',
      DOMAIN: '/api/domain',
      KVM: '/api/kvm',
      WEBSPACE: '/api/webspace'
    }
  };

  static CACHE = {
    ENABLED: true,
    TTL: 300000,
    MAX_SIZE: 100
  };

  static RATE_LIMIT = {
    ENABLED: true,
    LIMIT: 120,
    WINDOW: 60000
  };

  static COMMANDS = {
    MENU: '24fire',
    COOLDOWN: 10000,
    MAX_LIST: 20
  };

  static COLORS = {
    PRIMARY: '§6',
    SUCCESS: '§a',
    ERROR: '§c',
    WARNING: '§e',
    INFO: '§b',
    DEBUG: '§9',
    RESET: '§r'
  };

  static ICONS = {
    ACCOUNT: '👤',
    SERVER: '🖥️',
    DOMAIN: '🌐',
    DNS: '📡',
    BACKUP: '💾',
    SERVICE: '⚙️',
    DONATION: '💝',
    AFFILIATE: '🤝',
    WEBSPACE: '📁',
    KVM: '💻',
    PLUS: '➕',
    TRASH: '🗑️',
    EDIT: '✏️',
    SETTINGS: '⚙️',
    BACK: '⬅️',
    REFRESH: '🔃',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    LOADING: '⏳',
    CHART: '📊',
    TRAFFIC: '📊',
    MONITORING: '📈',
    POWER: '⚡',
    ONLINE: '🟢',
    OFFLINE: '🔴'
  };

  static LOGGING = {
    LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
    CONSOLE: true
  };

  static loadFromFile(config) {
    if (config?.api?.baseUrl) Config.API.BASE_URL = config.api.baseUrl;
    if (config?.api?.apiKey) Config.API.KEY = config.api.apiKey;
    if (config?.commands?.menu) Config.COMMANDS.MENU = config.commands.menu;
    if (config?.logging?.level) Config.LOGGING.LEVEL = config.logging.level;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════

class Logger {
  static LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

  static log(level, message, data = null) {
    const currentLevel = this.LEVELS[Config.LOGGING.LEVEL] || 1;
    if (this.LEVELS[level] < currentLevel) return;

    const timestamp = new Date().toLocaleTimeString();
    const levelColor = {
      DEBUG: Config.COLORS.DEBUG,
      INFO: Config.COLORS.SUCCESS,
      WARN: Config.COLORS.WARNING,
      ERROR: Config.COLORS.ERROR
    };

    const logMsg = `${levelColor[level]}[${timestamp}] [${level}] ${message}${Config.COLORS.RESET}`;

    if (Config.LOGGING.CONSOLE) {
      console.log(logMsg, data || '');
    }
  }

  static debug(msg, data) { this.log('DEBUG', msg, data); }
  static info(msg, data) { this.log('INFO', msg, data); }
  static warn(msg, data) { this.log('WARN', msg, data); }
  static error(msg, data) { this.log('ERROR', msg, data); }
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl = Config.CACHE.TTL) {
    if (!Config.CACHE.ENABLED) return;
    if (this.cache.size >= Config.CACHE.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }

  get(key) {
    if (!Config.CACHE.ENABLED) return null;
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    }
  }

  has(key) {
    const item = this.cache.get(key);
    return item !== null && Date.now() <= item.expiry;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════

class RateLimiter {
  constructor() {
    this.requests = [];
  }

  async checkLimit() {
    if (!Config.RATE_LIMIT.ENABLED) return;

    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < Config.RATE_LIMIT.WINDOW);

    if (this.requests.length >= Config.RATE_LIMIT.LIMIT) {
      const oldestRequest = this.requests[0];
      const waitTime = Config.RATE_LIMIT.WINDOW - (now - oldestRequest);
      throw new Error(`Rate Limit erreicht. Bitte ${Math.ceil(waitTime / 1000)}s warten.`);
    }

    this.requests.push(now);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 24FIRE API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class TwentyfourfireAPI {
  constructor(apiKey = '') {
    this.apiKey = apiKey || Config.API.KEY;
    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter();
    this.lastError = null;
  }

  async makeRequest(method, endpoint, body = null, useCache = true) {
    if (!this.apiKey) {
      throw new Error('API-Key nicht konfiguriert. Bitte in config.json eintragen.');
    }

    const cacheKey = `${method}:${endpoint}`;

    // Cache-Check für GET
    if (useCache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        Logger.debug(`Cache hit: ${endpoint}`);
        return cached;
      }
    }

    // Rate Limit prüfen
    await this.rateLimiter.checkLimit();

    let lastError = null;

    // Retry-Logik
    for (let attempt = 1; attempt <= Config.API.RETRY_ATTEMPTS; attempt++) {
      try {
        Logger.debug(`API Request [${attempt}/${Config.API.RETRY_ATTEMPTS}]: ${method} ${endpoint}`);

        const request = new HttpRequest(`${Config.API.BASE_URL}${endpoint}`);
        request.setMethod(method);
        request.setHeader('X-Fire-Apikey', this.apiKey);
        request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.setTimeoutMS(Config.API.TIMEOUT);

        // Body setzen
        if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
          const params = new URLSearchParams(body);
          request.setBody(params.toString());
        }

        const response = await http.request(request);

        if (!response) {
          throw new Error('Keine Antwort vom Server');
        }

        const data = JSON.parse(response.body);

        if (data.status !== 'success') {
          throw new Error(data.message || 'API-Fehler unbekannt');
        }

        // Cache für GET-Anfragen
        if (useCache && method === 'GET') {
          this.cache.set(cacheKey, data.data);
        }

        Logger.info(`API Erfolg: ${endpoint}`);
        this.lastError = null;
        return data.data;

      } catch (error) {
        lastError = error;
        Logger.warn(`API Fehler [${attempt}/${Config.API.RETRY_ATTEMPTS}]: ${error.message}`);

        if (attempt < Config.API.RETRY_ATTEMPTS) {
          const delay = Config.API.RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.lastError = lastError;
    throw lastError;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ACCOUNT ENDPOINTS (4)
  // ═════════════════════════════════════════════════════════════════════════

  async getAccountDetails() {
    return await this.makeRequest('GET', '/api/account');
  }

  async getAccountServices() {
    return await this.makeRequest('GET', '/api/account/services');
  }

  async getAccountDonations() {
    return await this.makeRequest('GET', '/api/account/donations');
  }

  async getAccountAffiliate() {
    return await this.makeRequest('GET', '/api/account/affiliate');
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DOMAIN ENDPOINTS (6)
  // ═════════════════════════════════════════════════════════════════════════

  async getDomainInfo(internalId) {
    return await this.makeRequest('GET', `/api/domain/${internalId}`);
  }

  async getDomainDNS(internalId) {
    return await this.makeRequest('GET', `/api/domain/${internalId}/dns`);
  }

  async addDNSRecord(internalId, type, name, data) {
    return await this.makeRequest('PUT', `/api/domain/${internalId}/dns/add`, {
      type, name, data
    }, false);
  }

  async editDNSRecord(internalId, recordId, type = null, name = null, data = null) {
    const body = { record_id: recordId };
    if (type) body.type = type;
    if (name) body.name = name;
    if (data) body.data = data;
    return await this.makeRequest('POST', `/api/domain/${internalId}/dns/edit`, body, false);
  }

  async deleteDNSRecord(internalId, recordId) {
    return await this.makeRequest('DELETE', `/api/domain/${internalId}/dns/remove`, {
      record_id: recordId
    }, false);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // BACKUP ENDPOINTS (6)
  // ═════════════════════════════════════════════════════════════════════════

  async getKVMBackups(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/backup/list`);
  }

  async createKVMBackup(internalId, description = '') {
    return await this.makeRequest('POST', `/api/kvm/${internalId}/backup/create`, {
      description
    }, false);
  }

  async getBackupStatus(internalId, backupId) {
    return await this.makeRequest('POST', `/api/kvm/${internalId}/backup/create/status`, {
      backup_id: backupId
    }, false);
  }

  async restoreBackup(internalId, backupId) {
    return await this.makeRequest('POST', `/api/kvm/${internalId}/backup/restore`, {
      backup_id: backupId
    }, false);
  }

  async getRestoreStatus(internalId, backupId) {
    return await this.makeRequest('POST', `/api/kvm/${internalId}/backup/restore/status`, {
      backup_id: backupId
    }, false);
  }

  async deleteBackup(internalId, backupId) {
    return await this.makeRequest('DELETE', `/api/kvm/${internalId}/backup/delete`, {
      backup_id: backupId
    }, false);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TRAFFIC ENDPOINTS (3)
  // ═════════════════════════════════════════════════════════════════════════

  async getKVMTraffic(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/traffic/current`);
  }

  async getKVMTrafficLog(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/traffic/log`);
  }

  async getKVMTrafficChart(internalId, type, summary, output, options = {}) {
    const body = {
      type, summary, output,
      dataset_in_label: options.inLabel || 'Eingehend',
      dataset_out_label: options.outLabel || 'Ausgehend',
      dataset_in_color: options.inColor || '#0077FF',
      dataset_out_color: options.outColor || '#FF6347',
      axes_y_label: options.yLabel || 'Traffic in {unit}',
      datapoints: options.datapoints || 30,
      size: options.size || '900x300'
    };
    return await this.makeRequest('POST', `/api/kvm/${internalId}/traffic/chart`, body, false);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MONITORING ENDPOINTS (2)
  // ═════════════════════════════════════════════════════════════════════════

  async getKVMMonitoring(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/monitoring/timings`);
  }

  async getKVMIncidents(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/monitoring/incidences`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DDOS ENDPOINTS (2)
  // ═════════════════════════════════════════════════════════════════════════

  async getKVMDDoSSettings(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/ddos`);
  }

  async setKVMDDoSSettings(internalId, layer4, layer7, ipAddress = null) {
    const body = { layer4, layer7 };
    if (ipAddress) body.ip_address = ipAddress;
    return await this.makeRequest('POST', `/api/kvm/${internalId}/ddos/change`, body, false);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // KVM CONFIG & STATUS ENDPOINTS (2)
  // ═════════════════════════════════════════════════════════════════════════

  async getKVMConfig(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/config`);
  }

  async getKVMStatus(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/status`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // KVM POWER ENDPOINT (1)
  // ═════════════════════════════════════════════════════════════════════════

  async setKVMPower(internalId, mode) {
    return await this.makeRequest('POST', `/api/kvm/${internalId}/power`, {
      mode
    }, false);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // WEBSPACE ENDPOINT (1)
  // ═════════════════════════════════════════════════════════════════════════

  async getWebspaceInfo(internalId) {
    return await this.makeRequest('GET', `/api/webspace/${internalId}`);
  }

  // Cache-Verwaltung
  clearCache(pattern = null) {
    this.cache.clear(pattern);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GUI MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class GUIManager {
  constructor(api) {
    this.api = api;
    this.playerMenuCooldowns = new Map();
  }

  isOnCooldown(playerId) {
    const cooldown = this.playerMenuCooldowns.get(playerId);
    if (!cooldown) return false;
    if (Date.now() - cooldown < Config.COMMANDS.COOLDOWN) return true;
    this.playerMenuCooldowns.delete(playerId);
    return false;
  }

  setCooldown(playerId) {
    this.playerMenuCooldowns.set(playerId, Date.now());
  }

  async showErrorForm(player, title, error) {
    const form = new MessageFormData();
    form.setTitle(`${Config.ICONS.ERROR} ${title}`);
    form.setBody(`${Config.COLORS.ERROR}❌ ${error}${Config.COLORS.RESET}`);
    form.button1('OK');
    form.button2('Menü');
    const response = await form.show(player);
    return response.selection === 1;
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  formatBalance(balance) {
    return `${parseFloat(balance).toFixed(2)}€`;
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MAIN MENU
  // ═════════════════════════════════════════════════════════════════════════

  async showMainMenu(player) {
    try {
      const form = new ActionFormData();
      form.title(`${Config.ICONS.ACCOUNT} 24FIRE MANAGEMENT`);
      form.button(`${Config.ICONS.ACCOUNT}\nKonto`);
      form.button(`${Config.ICONS.SERVICE}\nDienste`);
      form.button(`${Config.ICONS.DOMAIN}\nDomains`);
      form.button(`${Config.ICONS.KVM}\nKVM-Server`);
      form.button(`${Config.ICONS.WEBSPACE}\nWebspace`);
      form.button(`${Config.ICONS.DONATION}\nSpenden`);
      form.button(`${Config.ICONS.AFFILIATE}\nAffiliate`);
      form.button(`${Config.ICONS.REFRESH}\nAktualisieren`);

      const response = await form.show(player);
      if (response.canceled) return;

      switch (response.selection) {
        case 0: await this.showAccount(player); break;
        case 1: await this.showServices(player); break;
        case 2: await this.showDomains(player); break;
        case 3: await this.showKVMServers(player); break;
        case 4: await this.showWebspaces(player); break;
        case 5: await this.showDonations(player); break;
        case 6: await this.showAffiliate(player); break;
        case 7:
          this.api.clearCache();
          player.sendMessage(`${Config.COLORS.SUCCESS}✓ Cache aktualisiert!${Config.COLORS.RESET}`);
          await this.showMainMenu(player);
          break;
      }
    } catch (error) {
      Logger.error('Main Menu Error', error);
      if (await this.showErrorForm(player, 'Hauptmenü-Fehler', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═════════════════════════════════════════════════════════════════════════

  async showAccount(player) {
    try {
      const account = await this.api.getAccountDetails();
      const premium = account.is_plus_user ? `${Config.COLORS.SUCCESS}✓ 24fire+` : `${Config.COLORS.ERROR}✗ Standard`;

      const body = `${Config.COLORS.INFO}═══════════════════════════════════
KONTO-INFORMATION
═══════════════════════════════════${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Name:${Config.COLORS.RESET} ${account.firstname} ${account.lastname}
${Config.COLORS.PRIMARY}E-Mail:${Config.COLORS.RESET} ${account.email}
${Config.COLORS.PRIMARY}Guthaben:${Config.COLORS.RESET} ${Config.COLORS.SUCCESS}${this.formatBalance(account.balance)}${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Status:${Config.COLORS.RESET} ${premium}${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Registriert:${Config.COLORS.RESET} ${this.formatDate(account.registry_date)}

${Config.COLORS.INFO}─ Rechnungsadresse ─${Config.COLORS.RESET}
${account.invoice_address.name}
${account.invoice_address.street} ${account.invoice_address.number}
${account.invoice_address.zip} ${account.invoice_address.city}
${account.invoice_address.country}`;

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.ACCOUNT} Konto-Details`);
      form.setBody(body);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showMainMenu(player);
      }
    } catch (error) {
      Logger.error('Account Error', error);
      if (await this.showErrorForm(player, 'Konto-Info', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SERVICES
  // ═════════════════════════════════════════════════════════════════════════

  async showServices(player) {
    try {
      const data = await this.api.getAccountServices();
      const services = data.services || {};

      const form = new ActionFormData();
      form.title(`${Config.ICONS.SERVICE} Dienste`);

      let count = 0;
      const serviceList = [];

      for (const [type, items] of Object.entries(services)) {
        for (const service of items) {
          if (count >= Config.COMMANDS.MAX_LIST) break;
          const icon = type === 'WEBSPACE' ? Config.ICONS.WEBSPACE :
                      type === 'KVM' ? Config.ICONS.KVM : Config.ICONS.DOMAIN;
          form.button(`${icon}\n${service.name}\n${type}`);
          serviceList.push({ type, ...service });
          count++;
        }
      }

      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === serviceList.length) {
        await this.showMainMenu(player);
        return;
      }

      const service = serviceList[response.selection];
      await this.showServiceDetails(player, service);

    } catch (error) {
      Logger.error('Services Error', error);
      if (await this.showErrorForm(player, 'Dienste', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showServiceDetails(player, service) {
    const body = `${Config.COLORS.INFO}${service.name}${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Typ:${Config.COLORS.RESET} ${service.type}
${Config.COLORS.PRIMARY}Gekauft:${Config.COLORS.RESET} ${this.formatDate(service.accounting.buy_date)}
${Config.COLORS.PRIMARY}Kaufpreis:${Config.COLORS.RESET} ${this.formatBalance(service.accounting.buy_price)}
${Config.COLORS.PRIMARY}Verlängerung:${Config.COLORS.RESET} ${this.formatDate(service.accounting.renew_date)}
${Config.COLORS.PRIMARY}Verlängerungspreis:${Config.COLORS.RESET} ${this.formatBalance(service.accounting.renew_price)}
${Config.COLORS.PRIMARY}Auto-Renew:${Config.COLORS.RESET} ${service.accounting.auto_renew ? 'Ja' : 'Nein'}`;

    const form = new MessageFormData();
    form.setTitle(`${Config.ICONS.SERVICE} Details`);
    form.setBody(body);
    form.button1(`${Config.ICONS.BACK} Zurück`);

    const response = await form.show(player);
    if (!response.canceled) {
      await this.showServices(player);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DOMAINS
  // ═════════════════════════════════════════════════════════════════════════

  async showDomains(player) {
    try {
      const data = await this.api.getAccountServices();
      const domains = data.services?.DOMAIN || [];

      if (domains.length === 0) {
        await this.showErrorForm(player, 'Domains', 'Keine Domains vorhanden.');
        await this.showMainMenu(player);
        return;
      }

      const form = new ActionFormData();
      form.title(`${Config.ICONS.DOMAIN} Domains (${domains.length})`);

      for (let i = 0; i < Math.min(domains.length, Config.COMMANDS.MAX_LIST); i++) {
        form.button(`${Config.ICONS.DOMAIN}\n${domains[i].name}`);
      }

      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === domains.length) {
        await this.showMainMenu(player);
        return;
      }

      await this.showDomainDetails(player, domains[response.selection]);

    } catch (error) {
      Logger.error('Domains Error', error);
      if (await this.showErrorForm(player, 'Domains', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showDomainDetails(player, domain) {
    try {
      const info = await this.api.getDomainInfo(domain.internal_id);
      const dns = await this.api.getDomainDNS(domain.internal_id);

      const body = `${Config.COLORS.INFO}${info.domain.name}${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Status:${Config.COLORS.RESET} ${info.domain.status}
${Config.COLORS.PRIMARY}Authcode:${Config.COLORS.RESET} ${info.domain.authcode.substring(0, 10)}...
${Config.COLORS.PRIMARY}Erstellt:${Config.COLORS.RESET} ${info.domain.timings.create}
${Config.COLORS.PRIMARY}Expires:${Config.COLORS.RESET} ${info.domain.timings.expire}

${Config.COLORS.INFO}─ Nameserver ─${Config.COLORS.RESET}
${info.nameserver.ns1}
${info.nameserver.ns2}

${Config.COLORS.INFO}─ DNS Records (${dns.length}) ─${Config.COLORS.RESET}`;

      const form = new ActionFormData();
      form.title(`${Config.ICONS.DOMAIN} ${info.domain.name}`);
      form.body(body);
      form.button(`${Config.ICONS.DNS}\nDNS-Einträge`);
      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === 0) {
        await this.showDNSRecords(player, domain.internal_id, dns);
      } else {
        await this.showDomains(player);
      }

    } catch (error) {
      Logger.error('Domain Details Error', error);
      if (await this.showErrorForm(player, 'Domain-Details', error.message)) {
        await this.showDomains(player);
      }
    }
  }

  async showDNSRecords(player, domainId, records) {
    const form = new ActionFormData();
    form.title(`${Config.ICONS.DNS} DNS-Einträge (${records.length})`);

    for (let i = 0; i < Math.min(records.length, Config.COMMANDS.MAX_LIST); i++) {
      const rec = records[i];
      form.button(`${Config.ICONS.DNS}\n${rec.name} (${rec.type})\n${rec.data}`);
    }

    form.button(`${Config.ICONS.BACK}\nZurück`);

    const response = await form.show(player);
    if (response.canceled) return;

    if (response.selection === records.length) {
      await this.showDomains(player);
      return;
    }

    const record = records[response.selection];
    const body = `${Config.COLORS.INFO}DNS-Eintrag${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}ID:${Config.COLORS.RESET} ${record.record_id}
${Config.COLORS.PRIMARY}Typ:${Config.COLORS.RESET} ${record.type}
${Config.COLORS.PRIMARY}Name:${Config.COLORS.RESET} ${record.name}
${Config.COLORS.PRIMARY}Wert:${Config.COLORS.RESET} ${record.data}
${Config.COLORS.PRIMARY}TTL:${Config.COLORS.RESET} ${record.ttl}`;

    const form2 = new MessageFormData();
    form2.setTitle(`${Config.ICONS.DNS} ${record.name}`);
    form2.setBody(body);
    form2.button1(`${Config.ICONS.BACK} Zurück`);

    const response2 = await form2.show(player);
    if (!response2.canceled) {
      await this.showDNSRecords(player, domainId, records);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // KVM SERVERS
  // ═════════════════════════════════════════════════════════════════════════

  async showKVMServers(player) {
    try {
      const data = await this.api.getAccountServices();
      const servers = data.services?.KVM || [];

      if (servers.length === 0) {
        await this.showErrorForm(player, 'KVM-Server', 'Keine KVM-Server vorhanden.');
        await this.showMainMenu(player);
        return;
      }

      const form = new ActionFormData();
      form.title(`${Config.ICONS.KVM} KVM-Server (${servers.length})`);

      for (let i = 0; i < Math.min(servers.length, Config.COMMANDS.MAX_LIST); i++) {
        form.button(`${Config.ICONS.KVM}\n${servers[i].name}`);
      }

      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === servers.length) {
        await this.showMainMenu(player);
        return;
      }

      await this.showKVMDetails(player, servers[response.selection]);

    } catch (error) {
      Logger.error('KVM Servers Error', error);
      if (await this.showErrorForm(player, 'KVM-Server', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showKVMDetails(player, server) {
    try {
      const status = await this.api.getKVMStatus(server.internal_id);
      const config = await this.api.getKVMConfig(server.internal_id);

      const statusIcon = status.status === 'running' ? Config.ICONS.ONLINE : Config.ICONS.OFFLINE;
      const statusText = status.status === 'running' ?
        `${Config.COLORS.SUCCESS}✓ Online` :
        `${Config.COLORS.ERROR}✗ Offline`;

      const body = `${Config.COLORS.INFO}${server.name}${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Status:${Config.COLORS.RESET} ${statusText}${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Uptime:${Config.COLORS.RESET} ${status.uptime} Min
${Config.COLORS.PRIMARY}Task:${Config.COLORS.RESET} ${status.task || 'Keine'}

${Config.COLORS.INFO}─ Konfiguration ─${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}CPU:${Config.COLORS.RESET} ${config.config.cores} Cores
${Config.COLORS.PRIMARY}RAM:${Config.COLORS.RESET} ${config.config.mem} MB
${Config.COLORS.PRIMARY}Storage:${Config.COLORS.RESET} ${config.config.disk} GB
${Config.COLORS.PRIMARY}OS:${Config.COLORS.RESET} ${config.config.os.displayname}
${Config.COLORS.PRIMARY}Network:${Config.COLORS.RESET} ${config.config.network_speed} Mbps

${Config.COLORS.INFO}─ Nutzung ─${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}CPU:${Config.COLORS.RESET} ${status.usage.cpu.data}${status.usage.cpu.unit}
${Config.COLORS.PRIMARY}RAM:${Config.COLORS.RESET} ${status.usage.mem.data}${status.usage.mem.unit}
${Config.COLORS.PRIMARY}Storage:${Config.COLORS.RESET} ${status.usage.nvme_storage.data}${status.usage.nvme_storage.unit}`;

      const form = new ActionFormData();
      form.title(`${statusIcon} ${server.name}`);
      form.body(body);
      form.button(`${Config.ICONS.BACKUP}\nBackups`);
      form.button(`${Config.ICONS.TRAFFIC}\nTraffic`);
      form.button(`${Config.ICONS.MONITORING}\nÜberwachung`);
      form.button(`${Config.ICONS.POWER}\nPower`);
      form.button(`${Config.ICONS.WARNING}\nDDoS`);
      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      switch (response.selection) {
        case 0: await this.showKVMBackups(player, server); break;
        case 1: await this.showKVMTraffic(player, server); break;
        case 2: await this.showKVMMonitoring(player, server); break;
        case 3: await this.showKVMPower(player, server); break;
        case 4: await this.showKVMDDoS(player, server); break;
        case 5: await this.showKVMServers(player); break;
      }

    } catch (error) {
      Logger.error('KVM Details Error', error);
      if (await this.showErrorForm(player, 'KVM-Details', error.message)) {
        await this.showKVMServers(player);
      }
    }
  }

  async showKVMBackups(player, server) {
    try {
      const backups = await this.api.getKVMBackups(server.internal_id);

      if (backups.length === 0) {
        await this.showErrorForm(player, 'Backups', 'Keine Backups vorhanden.');
        await this.showKVMDetails(player, server);
        return;
      }

      const form = new ActionFormData();
      form.title(`${Config.ICONS.BACKUP} Backups (${backups.length})`);

      for (let i = 0; i < Math.min(backups.length, Config.COMMANDS.MAX_LIST); i++) {
        const b = backups[i];
        form.button(`${Config.ICONS.BACKUP}\n${b.backup_os}\n${b.size.toFixed(2)} GB`);
      }

      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === backups.length) {
        await this.showKVMDetails(player, server);
        return;
      }

      const backup = backups[response.selection];
      const body = `${Config.COLORS.INFO}${backup.backup_os}${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Größe:${Config.COLORS.RESET} ${backup.size.toFixed(2)} GB
${Config.COLORS.PRIMARY}Erstellt:${Config.COLORS.RESET} ${this.formatDate(backup.created)}
${Config.COLORS.PRIMARY}Status:${Config.COLORS.RESET} ${backup.status}
${Config.COLORS.PRIMARY}ID:${Config.COLORS.RESET} ${backup.backup_id.substring(0, 8)}...`;

      const form2 = new MessageFormData();
      form2.setTitle(`${Config.ICONS.BACKUP} Backup-Details`);
      form2.setBody(body);
      form2.button1(`${Config.ICONS.BACK} Zurück`);

      const response2 = await form2.show(player);
      if (!response2.canceled) {
        await this.showKVMBackups(player, server);
      }

    } catch (error) {
      Logger.error('Backups Error', error);
      if (await this.showErrorForm(player, 'Backups', error.message)) {
        await this.showKVMDetails(player, server);
      }
    }
  }

  async showKVMTraffic(player, server) {
    try {
      const traffic = await this.api.getKVMTraffic(server.internal_id);

      const body = `${Config.COLORS.INFO}${traffic.month}${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Eingehend:${Config.COLORS.RESET} ${traffic.usage.in.toFixed(2)} GB
${Config.COLORS.PRIMARY}Ausgehend:${Config.COLORS.RESET} ${traffic.usage.out.toFixed(2)} GB
${Config.COLORS.PRIMARY}Gesamt:${Config.COLORS.RESET} ${Config.COLORS.SUCCESS}${traffic.usage.total.toFixed(2)} GB${Config.COLORS.RESET}

${Config.COLORS.INFO}─ Limit ─${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Monatlich:${Config.COLORS.RESET} ${traffic.limit.monthly.toFixed(2)} GB
${Config.COLORS.PRIMARY}Verbleibend:${Config.COLORS.RESET} ${traffic.limit.remaining.toFixed(2)} GB
${Config.COLORS.PRIMARY}VM-Status:${Config.COLORS.RESET} ${traffic.limit.vm_status}`;

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.TRAFFIC} Traffic`);
      form.setBody(body);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showKVMDetails(player, server);
      }

    } catch (error) {
      Logger.error('Traffic Error', error);
      if (await this.showErrorForm(player, 'Traffic', error.message)) {
        await this.showKVMDetails(player, server);
      }
    }
  }

  async showKVMMonitoring(player, server) {
    try {
      const incidents = await this.api.getKVMIncidents(server.internal_id);
      const stat = incidents.statistic.LAST_24_HOURS;

      const body = `${Config.COLORS.INFO}Verfügbarkeit (24h)${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Verfügbarkeit:${Config.COLORS.RESET} ${Config.COLORS.SUCCESS}${stat.availability.toFixed(2)}%${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Ausfallzeit:${Config.COLORS.RESET} ${stat.downtime} Min
${Config.COLORS.PRIMARY}Vorfälle:${Config.COLORS.RESET} ${stat.incidences}
${Config.COLORS.PRIMARY}Längster Ausfall:${Config.COLORS.RESET} ${stat.longest_incidence} Min
${Config.COLORS.PRIMARY}Ø Ausfallzeit:${Config.COLORS.RESET} ${stat.average_incidence.toFixed(2)} Min`;

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.MONITORING} Überwachung`);
      form.setBody(body);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showKVMDetails(player, server);
      }

    } catch (error) {
      Logger.error('Monitoring Error', error);
      if (await this.showErrorForm(player, 'Monitoring', error.message)) {
        await this.showKVMDetails(player, server);
      }
    }
  }

  async showKVMPower(player, server) {
    try {
      const form = new ActionFormData();
      form.title(`${Config.ICONS.POWER} Power-Verwaltung`);
      form.button(`${Config.ICONS.POWER}\nStarten`);
      form.button(`⏹️\nStoppen`);
      form.button(`🔄\nNeustarten`);
      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === 3) {
        await this.showKVMDetails(player, server);
        return;
      }

      const modes = ['start', 'stop', 'restart'];
      await this.api.setKVMPower(server.internal_id, modes[response.selection]);

      player.sendMessage(`${Config.COLORS.SUCCESS}✓ Server ${modes[response.selection]} eingeleitet!${Config.COLORS.RESET}`);

      setTimeout(() => {
        this.showKVMDetails(player, server);
      }, 2000);

    } catch (error) {
      Logger.error('Power Error', error);
      if (await this.showErrorForm(player, 'Power-Verwaltung', error.message)) {
        await this.showKVMDetails(player, server);
      }
    }
  }

  async showKVMDDoS(player, server) {
    try {
      const ddos = await this.api.getKVMDDoSSettings(server.internal_id);

      let body = `${Config.COLORS.INFO}DDoS-Schutz${Config.COLORS.RESET}\n\n`;

      for (const [ip, settings] of Object.entries(ddos)) {
        body += `${Config.COLORS.PRIMARY}${ip}${Config.COLORS.RESET}\n`;
        body += `  L4: ${settings.layer4}\n`;
        body += `  L7: ${settings.layer7}\n`;
      }

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.WARNING} DDoS-Schutz`);
      form.setBody(body);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showKVMDetails(player, server);
      }

    } catch (error) {
      Logger.error('DDoS Error', error);
      if (await this.showErrorForm(player, 'DDoS-Einstellungen', error.message)) {
        await this.showKVMDetails(player, server);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // WEBSPACE
  // ═════════════════════════════════════════════════════════════════════════

  async showWebspaces(player) {
    try {
      const data = await this.api.getAccountServices();
      const webspaces = data.services?.WEBSPACE || [];

      if (webspaces.length === 0) {
        await this.showErrorForm(player, 'Webspace', 'Keine Webspaces vorhanden.');
        await this.showMainMenu(player);
        return;
      }

      const form = new ActionFormData();
      form.title(`${Config.ICONS.WEBSPACE} Webspace (${webspaces.length})`);

      for (let i = 0; i < Math.min(webspaces.length, Config.COMMANDS.MAX_LIST); i++) {
        form.button(`${Config.ICONS.WEBSPACE}\n${webspaces[i].name}`);
      }

      form.button(`${Config.ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === webspaces.length) {
        await this.showMainMenu(player);
        return;
      }

      await this.showWebspaceDetails(player, webspaces[response.selection]);

    } catch (error) {
      Logger.error('Webspace Error', error);
      if (await this.showErrorForm(player, 'Webspace', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showWebspaceDetails(player, webspace) {
    try {
      const info = await this.api.getWebspaceInfo(webspace.internal_id);

      const body = `${Config.COLORS.INFO}${info.access.username}${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Host:${Config.COLORS.RESET} ${info.access.host}
${Config.COLORS.PRIMARY}E-Mail:${Config.COLORS.RESET} ${info.access.email}

${Config.COLORS.INFO}─ Ressourcen ─${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Domains:${Config.COLORS.RESET} ${info.resources.domains}
${Config.COLORS.PRIMARY}Subdomains:${Config.COLORS.RESET} ${info.resources.subdomains}
${Config.COLORS.PRIMARY}E-Mail Accounts:${Config.COLORS.RESET} ${info.resources.emails}
${Config.COLORS.PRIMARY}Datenbanken:${Config.COLORS.RESET} ${info.resources.databases}
${Config.COLORS.PRIMARY}SSD Speicher:${Config.COLORS.RESET} ${info.resources.ssd_storage} GB
${Config.COLORS.PRIMARY}Traffic:${Config.COLORS.RESET} ${info.resources.traffic} GB
${Config.COLORS.PRIMARY}Memory:${Config.COLORS.RESET} ${info.resources.memory_limit} MB
${Config.COLORS.PRIMARY}IP:${Config.COLORS.RESET} ${info.resources.ip_address}`;

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.WEBSPACE} ${webspace.name}`);
      form.setBody(body);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showWebspaces(player);
      }

    } catch (error) {
      Logger.error('Webspace Details Error', error);
      if (await this.showErrorForm(player, 'Webspace-Details', error.message)) {
        await this.showWebspaces(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DONATIONS
  // ═════════════════════════════════════════════════════════════════════════

  async showDonations(player) {
    try {
      const data = await this.api.getAccountDonations();
      const info = data.information;

      const body = `${Config.COLORS.INFO}Spendenseite${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Status:${Config.COLORS.RESET} ${info.enabled ? '✓ Aktiviert' : '✗ Deaktiviert'}
${Config.COLORS.PRIMARY}Link:${Config.COLORS.RESET} ${info.link}
${Config.COLORS.PRIMARY}Beschreibung:${Config.COLORS.RESET} ${info.description}

${Config.COLORS.INFO}─ Spendenpakete (${data.bundles.length}) ─${Config.COLORS.RESET}`;

      let bundleText = '';
      for (const bundle of data.bundles.slice(0, 5)) {
        bundleText += `\n${Config.COLORS.PRIMARY}${bundle.name}:${Config.COLORS.RESET} ${bundle.price}€`;
      }

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.DONATION} Spendenseite`);
      form.setBody(body + bundleText);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showMainMenu(player);
      }

    } catch (error) {
      Logger.error('Donations Error', error);
      if (await this.showErrorForm(player, 'Spendenseite', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // AFFILIATE
  // ═════════════════════════════════════════════════════════════════════════

  async showAffiliate(player) {
    try {
      const data = await this.api.getAccountAffiliate();
      const info = data.information;
      const summary = data.summary;

      const body = `${Config.COLORS.INFO}Affiliate-System${Config.COLORS.RESET}

${Config.COLORS.PRIMARY}Referral-Link:${Config.COLORS.RESET} ${info.link}

${Config.COLORS.INFO}─ Statistik ─${Config.COLORS.RESET}
${Config.COLORS.PRIMARY}Bestätigte Leads:${Config.COLORS.RESET} ${summary.confirmed_leads}
${Config.COLORS.PRIMARY}URL-Klicks:${Config.COLORS.RESET} ${summary.url_clicks}
${Config.COLORS.PRIMARY}Verdienst (bezahlt):${Config.COLORS.RESET} ${this.formatBalance(summary.balance_paid)}
${Config.COLORS.PRIMARY}Verdienst (ausstehend):${Config.COLORS.RESET} ${this.formatBalance(summary.balance_pending)}`;

      const form = new MessageFormData();
      form.setTitle(`${Config.ICONS.AFFILIATE} Affiliate`);
      form.setBody(body);
      form.button1(`${Config.ICONS.BACK} Zurück`);

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showMainMenu(player);
      }

    } catch (error) {
      Logger.error('Affiliate Error', error);
      if (await this.showErrorForm(player, 'Affiliate-System', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

class CommandHandler {
  constructor(gui) {
    this.gui = gui;
  }

  register() {
    system.beforeChat.subscribe((event) => {
      const message = event.message.trim();

      if (message.startsWith(`/${Config.COMMANDS.MENU}`)) {
        event.cancel = true;
        this.handleMenuCommand(event.sender);
      }
    });

    Logger.info(`Befehl /${Config.COMMANDS.MENU} registriert`);
  }

  async handleMenuCommand(player) {
    if (this.gui.isOnCooldown(player.id)) {
      player.sendMessage(`${Config.COLORS.WARNING}⏳ Bitte warte einen Moment...${Config.COLORS.RESET}`);
      return;
    }

    this.gui.setCooldown(player.id);

    try {
      await this.gui.showMainMenu(player);
    } catch (error) {
      Logger.error('Command Error', error);
      player.sendMessage(`${Config.COLORS.ERROR}❌ Fehler: ${error.message}${Config.COLORS.RESET}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BEDROCK BRIDGE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

class TwentyFireBridgePlugin {
  constructor(configData = {}) {
    try {
      Config.loadFromFile(configData);

      if (!Config.API.KEY) {
        throw new Error('API-Key nicht in config.json gesetzt!');
      }

      this.api = new TwentyfourfireAPI(Config.API.KEY);
      this.gui = new GUIManager(this.api);
      this.commands = new CommandHandler(this.gui);

      Logger.info('24FIRE Plugin initialisiert');
    } catch (error) {
      Logger.error('Plugin Initialization Error', error);
      throw error;
    }
  }

  start() {
    try {
      this.commands.register();
      Logger.info(`24FIRE Plugin gestartet - Befehl: /${Config.COMMANDS.MENU}`);
      Logger.info(`API: ${Config.API.BASE_URL}`);
      Logger.info(`Caching: ${Config.CACHE.ENABLED ? 'Aktiviert' : 'Deaktiviert'}`);
      Logger.info(`Rate Limiting: ${Config.RATE_LIMIT.ENABLED ? 'Aktiviert' : 'Deaktiviert'}`);
    } catch (error) {
      Logger.error('Plugin Start Error', error);
      throw error;
    }
  }

  stop() {
    try {
      this.api.clearCache();
      Logger.info('24FIRE Plugin gestoppt');
    } catch (error) {
      Logger.error('Plugin Stop Error', error);
    }
  }

  setAPIKey(key) {
    Config.API.KEY = key;
    this.api = new TwentyfourfireAPI(key);
    Logger.info('API-Key aktualisiert');
  }

  getStatus() {
    return {
      name: '24FIRE Bedrock Bridge',
      version: '3.0.0',
      running: true,
      command: `/${Config.COMMANDS.MENU}`,
      api: Config.API.BASE_URL,
      configured: Config.API.KEY ? true : false,
      cache: Config.CACHE.ENABLED,
      rateLimit: Config.RATE_LIMIT.ENABLED
    };
  }

  getAPIClient() {
    return this.api;
  }

  getGUIManager() {
    return this.gui;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export {
  TwentyFireBridgePlugin,
  TwentyfourfireAPI,
  GUIManager,
  CommandHandler,
  Config,
  Logger,
  CacheManager,
  RateLimiter
};

export default TwentyFireBridgePlugin;
