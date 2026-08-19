/**
 * ╔═════════════════════════════════════════════════════════════════════════╗
 * ║                                                                         ║
 * ║  24FIRE BEDROCK BRIDGE v2.0 - COMPLETE INTEGRATION                    ║
 * ║                                                                         ║
 * ║  100% BEDROCK COMPATIBLE • FULL 24FIRE REST API v2 INTEGRATION        ║
 * ║  ACCOUNT & SERVICES MANAGEMENT • KVM SERVER CONTROL                   ║
 * ║  DOMAIN & DNS MANAGEMENT • REAL-TIME MONITORING                       ║
 * ║  AFFILIATE & DONATION SYSTEM • COMPLETE GUI • 25+ ENDPOINTS           ║
 * ║                                                                         ║
 * ╚═════════════════════════════════════════════════════════════════════════╝
 */

import { world, system, Player } from '@minecraft/server';
import { http, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { bridge } from '../../Bedrock-Bridge/scripts/addons.js';

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // 24fire API Configuration
  API_BASE_URL: 'https://manage.24fire.de',
  API_KEY: '', // Muss in config.json konfiguriert werden
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Caching & Performance
  CACHE_TTL: 300000, // 5 minutes
  RATE_LIMIT: 120,
  RATE_LIMIT_WINDOW: 60000,

  // Logging
  LOG_LEVEL: 'INFO',
  CONSOLE_LOGS_ENABLED: true,

  // Menu Settings
  MENU_COMMAND: '24fire',
  MENU_COOLDOWN: 10000,
  MAX_LIST_ITEMS: 20,

  // Colors for Minecraft Chat
  COLORS: {
    PRIMARY: '§6',
    SUCCESS: '§a',
    ERROR: '§c',
    WARNING: '§e',
    INFO: '§b',
    DEBUG: '§9',
    RESET: '§r'
  }
};

const ICONS = {
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
  MONITORING: '📈'
};

// ═════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ═════════════════════════════════════════════════════════════════════════

class Logger {
  static logLevels = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3 };

  static getCurrentLevel() {
    return this.logLevels[CONFIG.LOG_LEVEL] || 1;
  }

  static log(level, message, data = {}) {
    if (this.logLevels[level] < this.getCurrentLevel()) return;

    const timestamp = new Date().toLocaleTimeString('de-DE');
    const levelColor = {
      'DEBUG': '§9',
      'INFO': '§a',
      'WARN': '§e',
      'ERROR': '§c'
    };

    if (CONFIG.CONSOLE_LOGS_ENABLED) {
      console.log(`${levelColor[level]}[${timestamp}] [${level}] ${message}${CONFIG.COLORS.RESET}`, data);
    }
  }

  static debug(msg, data) { this.log('DEBUG', msg, data); }
  static info(msg, data) { this.log('INFO', msg, data); }
  static warn(msg, data) { this.log('WARN', msg, data); }
  static error(msg, data) { this.log('ERROR', msg, data); }
}

// ═════════════════════════════════════════════════════════════════════════
// CACHE SYSTEM
// ═════════════════════════════════════════════════════════════════════════

class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl = CONFIG.CACHE_TTL) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  get(key) {
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
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  has(key) {
    const item = this.cache.get(key);
    return item !== null;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 24FIRE API CLIENT
// ═════════════════════════════════════════════════════════════════════════

class TwentyfourfireAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = CONFIG.API_BASE_URL;
    this.cache = new CacheManager();
    this.rateLimitTracker = [];
  }

  /**
   * Macht eine API-Anfrage mit Fehlerbehandlung und Retry-Logik
   */
  async makeRequest(method, endpoint, body = null, useCache = true) {
    const cacheKey = `${method}:${endpoint}`;

    // Cache-Prüfung
    if (useCache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        Logger.debug(`Cache hit für ${endpoint}`);
        return cached;
      }
    }

    // Rate Limiting prüfen
    this.checkRateLimit();

    let lastError;
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        Logger.debug(`API Request: ${method} ${endpoint} (Versuch ${attempt})`);

        const request = new HttpRequest(`${this.baseUrl}${endpoint}`);
        request.setMethod(method);
        request.setHeader('X-Fire-Apikey', this.apiKey);
        request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.setTimeoutMS(CONFIG.API_TIMEOUT);

        if (body && (method === 'POST' || method === 'PUT')) {
          const params = new URLSearchParams(body);
          request.setBody(params.toString());
        }

        const response = await http.request(request);

        if (!response) {
          throw new Error('Keine Antwort vom Server');
        }

        const data = JSON.parse(response.body);

        if (data.status !== 'success') {
          throw new Error(data.message || 'API-Fehler');
        }

        // Cachen falls GET-Anfrage
        if (useCache && method === 'GET') {
          this.cache.set(cacheKey, data.data);
        }

        Logger.info(`API Erfolg: ${endpoint}`, { status: data.status });
        return data.data;

      } catch (error) {
        lastError = error;
        Logger.warn(`API Fehler bei Versuch ${attempt}: ${error.message}`);

        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
        }
      }
    }

    throw lastError;
  }

  checkRateLimit() {
    const now = Date.now();
    this.rateLimitTracker = this.rateLimitTracker.filter(time => now - time < CONFIG.RATE_LIMIT_WINDOW);

    if (this.rateLimitTracker.length >= CONFIG.RATE_LIMIT) {
      throw new Error('Rate Limit erreicht - zu viele Anfragen');
    }

    this.rateLimitTracker.push(now);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════
  // DOMAIN ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════
  // KVM SERVER ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

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

  async getKVMTraffic(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/traffic/current`);
  }

  async getKVMTrafficLog(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/traffic/log`);
  }

  async getKVMMonitoring(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/monitoring/timings`);
  }

  async getKVMIncidents(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/monitoring/incidences`);
  }

  async getKVMDDoSSettings(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/ddos`);
  }

  async setKVMDDoSSettings(internalId, layer4, layer7, ipAddress = null) {
    const body = { layer4, layer7 };
    if (ipAddress) body.ip_address = ipAddress;

    return await this.makeRequest('POST', `/api/kvm/${internalId}/ddos/change`, body, false);
  }

  async getKVMConfig(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/config`);
  }

  async getKVMStatus(internalId) {
    return await this.makeRequest('GET', `/api/kvm/${internalId}/status`);
  }

  async setKVMPower(internalId, mode) {
    return await this.makeRequest('POST', `/api/kvm/${internalId}/power`, {
      mode
    }, false);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WEBSPACE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

  async getWebspaceInfo(internalId) {
    return await this.makeRequest('GET', `/api/webspace/${internalId}`);
  }

  clearCache(pattern = null) {
    this.cache.clear(pattern);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// UI MANAGER
// ═════════════════════════════════════════════════════════════════════════

class UIManager {
  constructor(api) {
    this.api = api;
    this.playerMenuCooldowns = new Map();
  }

  isOnCooldown(playerId) {
    const cooldown = this.playerMenuCooldowns.get(playerId);
    if (!cooldown) return false;
    if (Date.now() - cooldown < CONFIG.MENU_COOLDOWN) return true;
    this.playerMenuCooldowns.delete(playerId);
    return false;
  }

  setCooldown(playerId) {
    this.playerMenuCooldowns.set(playerId, Date.now());
  }

  async showErrorForm(player, title, error) {
    const form = new MessageFormData();
    form.setTitle(`${ICONS.ERROR} ${title}`);
    form.setBody(`${CONFIG.COLORS.ERROR}${error}${CONFIG.COLORS.RESET}`);
    form.button1('OK');
    await form.show(player);
  }

  async showLoadingForm(player, message) {
    const form = new MessageFormData();
    form.setTitle(`${ICONS.LOADING} Laden...`);
    form.setBody(`${ICONS.LOADING} ${message}`);
    form.button1('...');
    return await form.show(player);
  }

  formatBalance(balance) {
    return `${balance.toFixed(2)}€`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTraffic(gb) {
    if (gb > 1000) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  }

  async showMainMenu(player) {
    const form = new ActionFormData();
    form.title(`${ICONS.ACCOUNT} 24FIRE Verwaltung`);
    form.button(`${ICONS.ACCOUNT}\nKonto-Info`);
    form.button(`${ICONS.SERVICE}\nDienste`);
    form.button(`${ICONS.DOMAIN}\nDomains`);
    form.button(`${ICONS.KVM}\nKVM-Server`);
    form.button(`${ICONS.DONATION}\nSpenden`);
    form.button(`${ICONS.AFFILIATE}\nAffiliate`);
    form.button(`${ICONS.REFRESH}\nAktualisieren`);

    const response = await form.show(player);

    if (response.canceled) return;

    switch (response.selection) {
      case 0: await this.showAccountInfo(player); break;
      case 1: await this.showServices(player); break;
      case 2: await this.showDomains(player); break;
      case 3: await this.showKVMServers(player); break;
      case 4: await this.showDonations(player); break;
      case 5: await this.showAffiliate(player); break;
      case 6:
        this.api.clearCache();
        player.sendMessage(`${CONFIG.COLORS.SUCCESS}${ICONS.SUCCESS} Cache aktualisiert!${CONFIG.COLORS.RESET}`);
        await this.showMainMenu(player);
        break;
    }
  }

  async showAccountInfo(player) {
    try {
      const account = await this.api.getAccountDetails();

      const body = `
${CONFIG.COLORS.INFO}═══════════════════════════════════
${CONFIG.COLORS.PRIMARY}Konto-Informationen
${CONFIG.COLORS.INFO}═══════════════════════════════════${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Name:${CONFIG.COLORS.RESET} ${account.firstname} ${account.lastname}
${CONFIG.COLORS.PRIMARY}E-Mail:${CONFIG.COLORS.RESET} ${account.email}
${CONFIG.COLORS.PRIMARY}Guthaben:${CONFIG.COLORS.RESET} ${CONFIG.COLORS.SUCCESS}${this.formatBalance(account.balance)}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}Premium:${CONFIG.COLORS.RESET} ${account.is_plus_user ? CONFIG.COLORS.SUCCESS + '✓ 24fire+' : CONFIG.COLORS.ERROR + '✗ Standard'}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}Registriert:${CONFIG.COLORS.RESET} ${this.formatDate(account.registry_date)}

${CONFIG.COLORS.INFO}─ Rechnungsadresse ─${CONFIG.COLORS.RESET}
${account.invoice_address.name}
${account.invoice_address.street} ${account.invoice_address.number}
${account.invoice_address.zip} ${account.invoice_address.city}
${account.invoice_address.country}`;

      const form = new MessageFormData();
      form.setTitle(`${ICONS.ACCOUNT} Konto-Info`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showMainMenu(player);
      }
    } catch (error) {
      await this.showErrorForm(player, 'Konto-Info', error.message);
    }
  }

  async showServices(player) {
    try {
      const services = await this.api.getAccountServices();
      const allServices = [];

      // Alle Services sammeln
      for (const [type, items] of Object.entries(services.services || {})) {
        for (const service of items) {
          allServices.push({
            type,
            name: service.name,
            internal_id: service.internal_id,
            renew_date: service.accounting?.renew_date,
            renew_price: service.accounting?.renew_price
          });
        }
      }

      const form = new ActionFormData();
      form.title(`${ICONS.SERVICE} Dienste (${allServices.length})`);

      for (const service of allServices.slice(0, CONFIG.MAX_LIST_ITEMS)) {
        form.button(`${this.getServiceIcon(service.type)}\n${service.name}\n${service.type}`);
      }
      form.button(`${ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === allServices.length) {
        await this.showMainMenu(player);
        return;
      }

      const selected = allServices[response.selection];
      await this.showServiceDetails(player, selected);

    } catch (error) {
      await this.showErrorForm(player, 'Dienste', error.message);
    }
  }

  getServiceIcon(type) {
    const icons = {
      'WEBSPACE': ICONS.WEBSPACE,
      'KVM': ICONS.KVM,
      'DOMAIN': ICONS.DOMAIN
    };
    return icons[type] || ICONS.SERVICE;
  }

  async showServiceDetails(player, service) {
    const form = new MessageFormData();
    form.setTitle(`${ICONS.SERVICE} ${service.name}`);
    form.setBody(`
${CONFIG.COLORS.PRIMARY}Typ:${CONFIG.COLORS.RESET} ${service.type}
${CONFIG.COLORS.PRIMARY}Verlängerung:${CONFIG.COLORS.RESET} ${this.formatDate(service.renew_date)}
${CONFIG.COLORS.PRIMARY}Verlängerungspreis:${CONFIG.COLORS.RESET} ${this.formatBalance(service.renew_price)}`);
    form.button1('Zurück');

    const response = await form.show(player);
    if (!response.canceled) {
      await this.showServices(player);
    }
  }

  async showDomains(player) {
    try {
      const services = await this.api.getAccountServices();
      const domains = services.services?.DOMAIN || [];

      const form = new ActionFormData();
      form.title(`${ICONS.DOMAIN} Domains (${domains.length})`);

      for (const domain of domains.slice(0, CONFIG.MAX_LIST_ITEMS)) {
        form.button(`${ICONS.DOMAIN}\n${domain.name}`);
      }
      form.button(`${ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === domains.length) {
        await this.showMainMenu(player);
        return;
      }

      const selected = domains[response.selection];
      await this.showDomainDetails(player, selected);

    } catch (error) {
      await this.showErrorForm(player, 'Domains', error.message);
    }
  }

  async showDomainDetails(player, domain) {
    try {
      const info = await this.api.getDomainInfo(domain.internal_id);
      const dns = await this.api.getDomainDNS(domain.internal_id);

      const body = `
${CONFIG.COLORS.INFO}Domain: ${info.domain.name}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}Status:${CONFIG.COLORS.RESET} ${info.domain.status}
${CONFIG.COLORS.PRIMARY}Erstellt:${CONFIG.COLORS.RESET} ${info.domain.timings.create}
${CONFIG.COLORS.PRIMARY}Expires:${CONFIG.COLORS.RESET} ${info.domain.timings.expire}

${CONFIG.COLORS.INFO}─ DNS Einträge (${dns.length}) ─${CONFIG.COLORS.RESET}`;

      const form = new MessageFormData();
      form.setTitle(`${ICONS.DOMAIN} ${info.domain.name}`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showDomains(player);
      }
    } catch (error) {
      await this.showErrorForm(player, 'Domain-Details', error.message);
    }
  }

  async showKVMServers(player) {
    try {
      const services = await this.api.getAccountServices();
      const kvmServers = services.services?.KVM || [];

      const form = new ActionFormData();
      form.title(`${ICONS.KVM} KVM-Server (${kvmServers.length})`);

      for (const server of kvmServers.slice(0, CONFIG.MAX_LIST_ITEMS)) {
        form.button(`${ICONS.KVM}\n${server.name}`);
      }
      form.button(`${ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === kvmServers.length) {
        await this.showMainMenu(player);
        return;
      }

      const selected = kvmServers[response.selection];
      await this.showKVMDetails(player, selected);

    } catch (error) {
      await this.showErrorForm(player, 'KVM-Server', error.message);
    }
  }

  async showKVMDetails(player, server) {
    try {
      const status = await this.api.getKVMStatus(server.internal_id);
      const config = await this.api.getKVMConfig(server.internal_id);

      const body = `
${CONFIG.COLORS.INFO}${server.name}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}Status:${CONFIG.COLORS.RESET} ${status.status === 'running' ? CONFIG.COLORS.SUCCESS + '✓ Online' : CONFIG.COLORS.ERROR + '✗ Offline'}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}CPU:${CONFIG.COLORS.RESET} ${config.config.cores} Cores
${CONFIG.COLORS.PRIMARY}RAM:${CONFIG.COLORS.RESET} ${config.config.mem} MB
${CONFIG.COLORS.PRIMARY}Speicher:${CONFIG.COLORS.RESET} ${config.config.disk} GB
${CONFIG.COLORS.PRIMARY}OS:${CONFIG.COLORS.RESET} ${config.config.os.displayname}
${CONFIG.COLORS.PRIMARY}Uptime:${CONFIG.COLORS.RESET} ${status.uptime} Minuten`;

      const form = new ActionFormData();
      form.title(`${ICONS.KVM} ${server.name}`);
      form.body(body);
      form.button(`${ICONS.BACKUP}\nBackups`);
      form.button(`${ICONS.TRAFFIC}\nTraffic`);
      form.button(`${ICONS.MONITORING}\nÜberwachung`);
      form.button(`${ICONS.SETTINGS}\nEinstellungen`);
      form.button(`${ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      switch (response.selection) {
        case 0: await this.showKVMBackups(player, server); break;
        case 1: await this.showKVMTraffic(player, server); break;
        case 2: await this.showKVMMonitoring(player, server); break;
        case 3: await this.showKVMSettings(player, server); break;
        case 4: await this.showKVMServers(player); break;
      }
    } catch (error) {
      await this.showErrorForm(player, 'KVM-Details', error.message);
    }
  }

  async showKVMBackups(player, server) {
    try {
      const backups = await this.api.getKVMBackups(server.internal_id);

      const form = new ActionFormData();
      form.title(`${ICONS.BACKUP} Backups (${backups.length})`);

      for (const backup of backups.slice(0, CONFIG.MAX_LIST_ITEMS)) {
        form.button(`${ICONS.BACKUP}\n${backup.backup_os}\n${backup.size.toFixed(2)} GB`);
      }
      form.button(`${ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      if (response.selection === backups.length) {
        await this.showKVMDetails(player, server);
        return;
      }

      const selected = backups[response.selection];
      await this.showBackupDetails(player, server, selected);

    } catch (error) {
      await this.showErrorForm(player, 'Backups', error.message);
    }
  }

  async showBackupDetails(player, server, backup) {
    const form = new MessageFormData();
    form.setTitle(`${ICONS.BACKUP} Backup-Details`);
    form.setBody(`
${CONFIG.COLORS.PRIMARY}OS:${CONFIG.COLORS.RESET} ${backup.backup_os}
${CONFIG.COLORS.PRIMARY}Größe:${CONFIG.COLORS.RESET} ${backup.size.toFixed(2)} GB
${CONFIG.COLORS.PRIMARY}Erstellt:${CONFIG.COLORS.RESET} ${this.formatDate(backup.created)}
${CONFIG.COLORS.PRIMARY}Status:${CONFIG.COLORS.RESET} ${backup.status}
${CONFIG.COLORS.PRIMARY}ID:${CONFIG.COLORS.RESET} ${backup.backup_id.substring(0, 12)}...`);
    form.button1('Zurück');

    const response = await form.show(player);
    if (!response.canceled) {
      await this.showKVMBackups(player, server);
    }
  }

  async showKVMTraffic(player, server) {
    try {
      const traffic = await this.api.getKVMTraffic(server.internal_id);

      const body = `
${CONFIG.COLORS.INFO}${traffic.month}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Eingehend:${CONFIG.COLORS.RESET} ${this.formatTraffic(traffic.usage.in)}
${CONFIG.COLORS.PRIMARY}Ausgehend:${CONFIG.COLORS.RESET} ${this.formatTraffic(traffic.usage.out)}
${CONFIG.COLORS.PRIMARY}Gesamt:${CONFIG.COLORS.RESET} ${CONFIG.COLORS.SUCCESS}${this.formatTraffic(traffic.usage.total)}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Limit:${CONFIG.COLORS.RESET} ${this.formatTraffic(traffic.limit.monthly)}
${CONFIG.COLORS.PRIMARY}Verbleibend:${CONFIG.COLORS.RESET} ${this.formatTraffic(traffic.limit.remaining)}
${CONFIG.COLORS.PRIMARY}VM-Status:${CONFIG.COLORS.RESET} ${traffic.limit.vm_status}`;

      const form = new MessageFormData();
      form.setTitle(`${ICONS.TRAFFIC} Traffic`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showKVMDetails(player, server);
      }
    } catch (error) {
      await this.showErrorForm(player, 'Traffic', error.message);
    }
  }

  async showKVMMonitoring(player, server) {
    try {
      const incidents = await this.api.getKVMIncidents(server.internal_id);

      const last24 = incidents.statistic.LAST_24_HOURS;
      const body = `
${CONFIG.COLORS.INFO}Verfügbarkeit (24h)${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Verfügbarkeit:${CONFIG.COLORS.RESET} ${CONFIG.COLORS.SUCCESS}${last24.availability.toFixed(2)}%${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}Ausfallzeit:${CONFIG.COLORS.RESET} ${last24.downtime} Minuten
${CONFIG.COLORS.PRIMARY}Vorfälle:${CONFIG.COLORS.RESET} ${last24.incidences}
${CONFIG.COLORS.PRIMARY}Längster Ausfall:${CONFIG.COLORS.RESET} ${last24.longest_incidence} Min`;

      const form = new MessageFormData();
      form.setTitle(`${ICONS.MONITORING} Überwachung`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showKVMDetails(player, server);
      }
    } catch (error) {
      await this.showErrorForm(player, 'Monitoring', error.message);
    }
  }

  async showKVMSettings(player, server) {
    const form = new ActionFormData();
    form.title(`${ICONS.SETTINGS} Server-Einstellungen`);
    form.button(`${ICONS.KVM}\nStatus`);
    form.button(`${ICONS.WARNING}\nDDoS-Schutz`);
    form.button(`${ICONS.BACK}\nZurück`);

    const response = await form.show(player);
    if (response.canceled) return;

    switch (response.selection) {
      case 0: await this.showKVMPower(player, server); break;
      case 1: await this.showKVMDDoS(player, server); break;
      case 2: await this.showKVMDetails(player, server); break;
    }
  }

  async showKVMPower(player, server) {
    try {
      const status = await this.api.getKVMStatus(server.internal_id);

      const form = new ActionFormData();
      form.title(`${ICONS.KVM} Power-Verwaltung`);
      form.button(`${ICONS.KVM}\nStarten`);
      form.button(`⏹️\nStoppen`);
      form.button(`🔄\nNeustarten`);
      form.button(`${ICONS.BACK}\nZurück`);

      const response = await form.show(player);
      if (response.canceled) return;

      let mode;
      switch (response.selection) {
        case 0: mode = 'start'; break;
        case 1: mode = 'stop'; break;
        case 2: mode = 'restart'; break;
        case 3: await this.showKVMSettings(player, server); return;
      }

      await this.api.setKVMPower(server.internal_id, mode);
      player.sendMessage(`${CONFIG.COLORS.SUCCESS}${ICONS.SUCCESS} Server ${mode} eingeleitet!${CONFIG.COLORS.RESET}`);
      await this.showKVMSettings(player, server);

    } catch (error) {
      await this.showErrorForm(player, 'Power-Verwaltung', error.message);
    }
  }

  async showKVMDDoS(player, server) {
    try {
      const ddos = await this.api.getKVMDDoSSettings(server.internal_id);

      let body = `${CONFIG.COLORS.INFO}DDoS-Schutzeinstellungen${CONFIG.COLORS.RESET}\n\n`;

      for (const [ip, settings] of Object.entries(ddos)) {
        body += `${CONFIG.COLORS.PRIMARY}${ip}${CONFIG.COLORS.RESET}\n`;
        body += `  Layer 4: ${settings.layer4}\n`;
        body += `  Layer 7: ${settings.layer7}\n`;
      }

      const form = new MessageFormData();
      form.setTitle(`${ICONS.WARNING} DDoS-Schutz`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showKVMSettings(player, server);
      }
    } catch (error) {
      await this.showErrorForm(player, 'DDoS-Schutz', error.message);
    }
  }

  async showDonations(player) {
    try {
      const donations = await this.api.getAccountDonations();
      const info = donations.information;

      const body = `
${CONFIG.COLORS.INFO}${ICONS.DONATION} Spendenseite${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Status:${CONFIG.COLORS.RESET} ${info.enabled ? CONFIG.COLORS.SUCCESS + '✓ Aktiviert' : CONFIG.COLORS.ERROR + '✗ Deaktiviert'}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.PRIMARY}Link:${CONFIG.COLORS.RESET} ${info.link}
${CONFIG.COLORS.PRIMARY}Beschreibung:${CONFIG.COLORS.RESET} ${info.description}

${CONFIG.COLORS.INFO}─ Spendenpakete (${donations.bundles.length}) ─${CONFIG.COLORS.RESET}`;

      const form = new MessageFormData();
      form.setTitle(`${ICONS.DONATION} Spendenseite`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showMainMenu(player);
      }
    } catch (error) {
      await this.showErrorForm(player, 'Spendenseite', error.message);
    }
  }

  async showAffiliate(player) {
    try {
      const affiliate = await this.api.getAccountAffiliate();
      const info = affiliate.information;
      const summary = affiliate.summary;

      const body = `
${CONFIG.COLORS.INFO}${ICONS.AFFILIATE} Affiliate-System${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Link:${CONFIG.COLORS.RESET} ${info.link}

${CONFIG.COLORS.PRIMARY}Bestätigte Leads:${CONFIG.COLORS.RESET} ${summary.confirmed_leads}
${CONFIG.COLORS.PRIMARY}URL-Klicks:${CONFIG.COLORS.RESET} ${summary.url_clicks}
${CONFIG.COLORS.PRIMARY}Verdienst (bezahlt):${CONFIG.COLORS.RESET} ${this.formatBalance(summary.balance_paid)}
${CONFIG.COLORS.PRIMARY}Verdienst (ausstehend):${CONFIG.COLORS.RESET} ${this.formatBalance(summary.balance_pending)}`;

      const form = new MessageFormData();
      form.setTitle(`${ICONS.AFFILIATE} Affiliate`);
      form.setBody(body);
      form.button1('Zurück');

      const response = await form.show(player);
      if (!response.canceled) {
        await this.showMainMenu(player);
      }
    } catch (error) {
      await this.showErrorForm(player, 'Affiliate', error.message);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// COMMAND HANDLER
// ═════════════════════════════════════════════════════════════════════════

class CommandHandler {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
  }

  register() {
    system.beforeChat.subscribe((event) => {
      if (event.message.startsWith(CONFIG.MENU_COMMAND)) {
        event.cancel = true;
        this.handleMenuCommand(event.sender);
      }
    });
  }

  async handleMenuCommand(player) {
    if (this.ui.isOnCooldown(player.id)) {
      player.sendMessage(`${CONFIG.COLORS.WARNING}${ICONS.WARNING} Bitte warte ein Moment...${CONFIG.COLORS.RESET}`);
      return;
    }

    this.ui.setCooldown(player.id);

    try {
      await this.ui.showMainMenu(player);
    } catch (error) {
      Logger.error('Command Handler Error', error);
      player.sendMessage(`${CONFIG.COLORS.ERROR}${ICONS.ERROR} Fehler: ${error.message}${CONFIG.COLORS.RESET}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// PLUGIN INITIALISIERUNG
// ═════════════════════════════════════════════════════════════════════════

class TwentyfourfirePlugin {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };

    if (!this.config.API_KEY) {
      throw new Error('API_KEY muss in der Konfiguration gesetzt werden!');
    }

    this.api = new TwentyfourfireAPI(this.config.API_KEY);
    this.ui = new UIManager(this.api);
    this.commands = new CommandHandler(this.api, this.ui);

    Logger.info('24fire Plugin initialisiert');
  }

  start() {
    this.commands.register();
    Logger.info('24fire Plugin gestartet');
    Logger.info(`Verfügbare Befehle: /${this.config.MENU_COMMAND}`);
  }

  stop() {
    this.api.clearCache();
    Logger.info('24fire Plugin gestoppt');
  }

  setAPIKey(key) {
    this.config.API_KEY = key;
    this.api = new TwentyfourfireAPI(key);
    Logger.info('API-Key aktualisiert');
  }

  getStatus() {
    return {
      running: true,
      version: '2.0.0',
      api: '24fire REST API v2',
      command: `/${this.config.MENU_COMMAND}`,
      apiKey: this.config.API_KEY ? '✓ Konfiguriert' : '✗ Nicht konfiguriert'
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════

export { TwentyfourfirePlugin, TwentyfourfireAPI, UIManager, Logger, CacheManager };

// Automatische Initialisierung wenn als Modul geladen
const plugin = new TwentyfourfirePlugin(CONFIG);
plugin.start();

export default plugin;
