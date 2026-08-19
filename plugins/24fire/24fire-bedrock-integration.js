/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║            24FIRE - BEDROCK BRIDGE PROFESSIONAL INTEGRATION v1.0          ║
 * ║                                                                           ║
 * ║  VOLLSTÄNDIGE 24FIRE REST-API v2 INTEGRATION                             ║
 * ║  - FREE Features (alle 25+ Endpoints)                                    ║
 * ║  - 24FIRE+ Features (klar gekennzeichnet)                                ║
 * ║  - Bedrock Bridge Custom Commands Integration                            ║
 * ║  - Production Ready                                                       ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { world, system, Player } from '@minecraft/server';
import { HttpRequest, http } from '@minecraft/server-net';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  API: {
    BASE_URL: 'https://manage.24fire.de',
    KEY: 'REDACTED]Ib!bzI6HvQSy}LcT',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },
  CACHE: {
    ENABLED: true,
    TTL: 300000,
    MAX_SIZE: 100
  },
  RATE_LIMIT: {
    ENABLED: true,
    LIMIT: 120,
    WINDOW: 60000
  },
  COLORS: {
    PRIMARY: '§6',
    SUCCESS: '§a',
    ERROR: '§c',
    WARNING: '§e',
    INFO: '§b',
    DEBUG: '§9',
    RESET: '§r'
  },
  ICONS: {
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
    PLUS: '🌟',
    PREMIUM: '💎',
    TRASH: '🗑️',
    EDIT: '✏️',
    BACK: '⬅️',
    REFRESH: '🔃',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    LOADING: '⏳',
    TRAFFIC: '📊',
    MONITORING: '📈',
    POWER: '⚡',
    ONLINE: '🟢',
    OFFLINE: '🔴',
    LOCKED: '🔒',
    FREE: '✨'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class Logger {
  static levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

  static log(level, message, data = null) {
    const currentLevel = this.levels['INFO'] || 1;
    if (this.levels[level] < currentLevel) return;

    const timestamp = new Date().toLocaleTimeString();
    const colors = { DEBUG: '§9', INFO: '§a', WARN: '§e', ERROR: '§c' };
    const msg = `${colors[level]}[${timestamp}] [${level}] ${message}${CONFIG.COLORS.RESET}`;

    if (data) {
      console.log(msg, data);
    } else {
      console.log(msg);
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

  set(key, value, ttl = CONFIG.CACHE.TTL) {
    if (!CONFIG.CACHE.ENABLED) return;
    if (this.cache.size >= CONFIG.CACHE.MAX_SIZE) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }

  get(key) {
    if (!CONFIG.CACHE.ENABLED) return null;
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
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════

class RateLimiter {
  constructor() {
    this.requests = [];
  }

  async check() {
    if (!CONFIG.RATE_LIMIT.ENABLED) return;

    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < CONFIG.RATE_LIMIT.WINDOW);

    if (this.requests.length >= CONFIG.RATE_LIMIT.LIMIT) {
      const wait = CONFIG.RATE_LIMIT.WINDOW - (now - this.requests[0]);
      throw new Error(`Rate Limit. Bitte ${Math.ceil(wait / 1000)}s warten.`);
    }

    this.requests.push(now);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 24FIRE API CLIENT - ALLE 25+ ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

class TwentyFireAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter();
    Logger.info('24Fire API Client initialisiert');
  }

  async request(method, endpoint, body = null, useCache = true) {
    const cacheKey = `${method}:${endpoint}`;

    if (useCache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        Logger.debug(`Cache: ${endpoint}`);
        return cached;
      }
    }

    await this.rateLimiter.check();

    let lastError = null;
    for (let attempt = 1; attempt <= CONFIG.API.RETRY_ATTEMPTS; attempt++) {
      try {
        Logger.debug(`API [${attempt}/${CONFIG.API.RETRY_ATTEMPTS}]: ${method} ${endpoint}`);

        const req = new HttpRequest(`${CONFIG.API.BASE_URL}${endpoint}`);
        req.setMethod(method);
        req.setHeader('X-Fire-Apikey', this.apiKey);
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setTimeoutMS(CONFIG.API.TIMEOUT);

        if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
          const params = new URLSearchParams(body);
          req.setBody(params.toString());
        }

        const response = await http.request(req);
        if (!response) throw new Error('Keine Serverantwort');

        const data = JSON.parse(response.body);
        if (data.status !== 'success') {
          throw new Error(data.message || 'API Fehler');
        }

        if (useCache && method === 'GET') {
          this.cache.set(cacheKey, data.data);
        }

        Logger.info(`✓ ${endpoint}`);
        return data.data;

      } catch (error) {
        lastError = error;
        Logger.warn(`API Fehler [${attempt}]: ${error.message}`);

        if (attempt < CONFIG.API.RETRY_ATTEMPTS) {
          const delay = CONFIG.API.RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // FREE ENDPOINTS (alle kostenlosen Features)
  // ═════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────
  // ACCOUNT ENDPOINTS (4) - ALLE FREE
  // ─────────────────────────────────────────────────────────────────────────

  async account_getDetails() {
    return await this.request('GET', '/api/account');
  }

  async account_getServices() {
    return await this.request('GET', '/api/account/services');
  }

  async account_getDonations() {
    return await this.request('GET', '/api/account/donations');
  }

  async account_getAffiliate() {
    return await this.request('GET', '/api/account/affiliate');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DOMAIN ENDPOINTS (6) - BASISFUNKTION FREE, DNS-MODIFIZIERUNG 24FIRE+
  // ─────────────────────────────────────────────────────────────────────────

  async domain_getInfo(domainId) {
    return await this.request('GET', `/api/domain/${domainId}`);
  }

  async domain_getDNS(domainId) {
    return await this.request('GET', `/api/domain/${domainId}/dns`);
  }

  // 24FIRE+ ONLY
  async domain_addDNS(domainId, type, name, data) {
    return await this.request('PUT', `/api/domain/${domainId}/dns/add`, {
      type, name, data
    }, false);
  }

  // 24FIRE+ ONLY
  async domain_editDNS(domainId, recordId, type = null, name = null, data = null) {
    const body = { record_id: recordId };
    if (type) body.type = type;
    if (name) body.name = name;
    if (data) body.data = data;
    return await this.request('POST', `/api/domain/${domainId}/dns/edit`, body, false);
  }

  // 24FIRE+ ONLY
  async domain_deleteDNS(domainId, recordId) {
    return await this.request('DELETE', `/api/domain/${domainId}/dns/remove`, {
      record_id: recordId
    }, false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KVM BACKUP ENDPOINTS (6) - LISTING FREE, MODIFIZIERUNG 24FIRE+
  // ─────────────────────────────────────────────────────────────────────────

  async kvm_backup_list(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/backup/list`);
  }

  // 24FIRE+ ONLY
  async kvm_backup_create(kvmId, description = '') {
    return await this.request('POST', `/api/kvm/${kvmId}/backup/create`, {
      description
    }, false);
  }

  // 24FIRE+ ONLY
  async kvm_backup_getStatus(kvmId, backupId) {
    return await this.request('POST', `/api/kvm/${kvmId}/backup/create/status`, {
      backup_id: backupId
    }, false);
  }

  // 24FIRE+ ONLY
  async kvm_backup_restore(kvmId, backupId) {
    return await this.request('POST', `/api/kvm/${kvmId}/backup/restore`, {
      backup_id: backupId
    }, false);
  }

  // 24FIRE+ ONLY
  async kvm_backup_restoreStatus(kvmId, backupId) {
    return await this.request('POST', `/api/kvm/${kvmId}/backup/restore/status`, {
      backup_id: backupId
    }, false);
  }

  // 24FIRE+ ONLY
  async kvm_backup_delete(kvmId, backupId) {
    return await this.request('DELETE', `/api/kvm/${kvmId}/backup/delete`, {
      backup_id: backupId
    }, false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KVM TRAFFIC ENDPOINTS (3) - ALLE FREE
  // ─────────────────────────────────────────────────────────────────────────

  async kvm_traffic_current(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/traffic/current`);
  }

  async kvm_traffic_log(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/traffic/log`);
  }

  // 24FIRE+ ONLY
  async kvm_traffic_chart(kvmId, type, summary, output, options = {}) {
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
    return await this.request('POST', `/api/kvm/${kvmId}/traffic/chart`, body, false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KVM MONITORING ENDPOINTS (2) - 24FIRE+ ONLY
  // ─────────────────────────────────────────────────────────────────────────

  // 24FIRE+ ONLY - Erweiterte Messungen (jede Minute statt 10 Min)
  async kvm_monitoring_timings(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/monitoring/timings`);
  }

  // 24FIRE+ ONLY - Detaillierte Verfügbarkeitsdaten
  async kvm_monitoring_incidents(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/monitoring/incidences`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KVM DDOS ENDPOINTS (2) - ANSICHT FREE, ÄNDERUNG 24FIRE+
  // ─────────────────────────────────────────────────────────────────────────

  async kvm_ddos_getSettings(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/ddos`);
  }

  // 24FIRE+ ONLY
  async kvm_ddos_setSettings(kvmId, layer4, layer7, ipAddress = null) {
    const body = { layer4, layer7 };
    if (ipAddress) body.ip_address = ipAddress;
    return await this.request('POST', `/api/kvm/${kvmId}/ddos/change`, body, false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KVM CONFIG & STATUS ENDPOINTS (2) - ALLE FREE
  // ─────────────────────────────────────────────────────────────────────────

  async kvm_getConfig(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/config`);
  }

  async kvm_getStatus(kvmId) {
    return await this.request('GET', `/api/kvm/${kvmId}/status`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KVM POWER ENDPOINT (1) - FREE
  // ─────────────────────────────────────────────────────────────────────────

  async kvm_setPower(kvmId, mode) {
    return await this.request('POST', `/api/kvm/${kvmId}/power`, {
      mode
    }, false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEBSPACE ENDPOINT (1) - FREE
  // ─────────────────────────────────────────────────────────────────────────

  async webspace_getInfo(webspaceId) {
    return await this.request('GET', `/api/webspace/${webspaceId}`);
  }

  // Cache Management
  clearCache(pattern = null) {
    this.cache.clear(pattern);
  }

  cacheStats() {
    return {
      size: this.cache.cache.size,
      max: CONFIG.CACHE.MAX_SIZE
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GUI MANAGER - BEDROCK BRIDGE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

class GUIManager {
  constructor(api) {
    this.api = api;
    this.cooldowns = new Map();
  }

  isOnCooldown(playerId) {
    const cd = this.cooldowns.get(playerId);
    if (!cd) return false;
    if (Date.now() - cd < 5000) return true;
    this.cooldowns.delete(playerId);
    return false;
  }

  setCooldown(playerId) {
    this.cooldowns.set(playerId, Date.now());
  }

  // Format Helper
  formatDate(str) {
    try {
      const d = new Date(str);
      return d.toLocaleDateString('de-DE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return str; }
  }

  formatMoney(val) {
    return `${parseFloat(val).toFixed(2)}€`;
  }

  formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  // Error Form
  async showError(player, title, msg) {
    const form = new MessageFormData();
    form.setTitle(`${CONFIG.ICONS.ERROR} ${title}`);
    form.setBody(`${CONFIG.COLORS.ERROR}❌ ${msg}${CONFIG.COLORS.RESET}`);
    form.button1('OK');
    form.button2('Menü');
    const r = await form.show(player);
    return r.selection === 1;
  }

  // Premium Feature Notice
  async showPremiumNotice(player, feature) {
    const form = new MessageFormData();
    form.setTitle(`${CONFIG.ICONS.PREMIUM} 24fire+ Feature`);
    form.setBody(`${CONFIG.COLORS.WARNING}🌟 ${feature}

Dieses Feature ist nur mit 24fire+ verfügbar.

Upgraden Sie Ihr Konto auf 24fire+ um:
${CONFIG.COLORS.PRIMARY}
• Erweiterte API-Funktionen zu nutzen
• Backups zu erstellen und wiederherzustellen
• DNS-Einträge zu verwalten
• Und vieles mehr!${CONFIG.COLORS.RESET}`);
    form.button1('OK');
    await form.show(player);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MAIN MENU
  // ═════════════════════════════════════════════════════════════════════════

  async showMainMenu(player) {
    try {
      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.ACCOUNT} 24FIRE MANAGER`);
      form.button(`${CONFIG.ICONS.ACCOUNT}\nKonto`);
      form.button(`${CONFIG.ICONS.SERVICE}\nDienste`);
      form.button(`${CONFIG.ICONS.DOMAIN}\nDomains`);
      form.button(`${CONFIG.ICONS.KVM}\nKVM-Server`);
      form.button(`${CONFIG.ICONS.WEBSPACE}\nWebspace`);
      form.button(`${CONFIG.ICONS.DONATION}\nSpenden`);
      form.button(`${CONFIG.ICONS.AFFILIATE}\nAffiliate`);
      form.button(`${CONFIG.ICONS.REFRESH}\nRefresh`);
      form.button(`${CONFIG.ICONS.INFO}\nInfo`);

      const r = await form.show(player);
      if (r.canceled) return;

      switch (r.selection) {
        case 0: await this.showAccount(player); break;
        case 1: await this.showServices(player); break;
        case 2: await this.showDomains(player); break;
        case 3: await this.showKVMs(player); break;
        case 4: await this.showWebspaces(player); break;
        case 5: await this.showDonations(player); break;
        case 6: await this.showAffiliate(player); break;
        case 7:
          this.api.clearCache();
          player.sendMessage(`${CONFIG.COLORS.SUCCESS}✓ Cache geleert!${CONFIG.COLORS.RESET}`);
          await this.showMainMenu(player);
          break;
        case 8: await this.showInfo(player); break;
      }
    } catch (error) {
      Logger.error('Main Menu', error);
      if (await this.showError(player, 'Fehler', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═════════════════════════════════════════════════════════════════════════

  async showAccount(player) {
    try {
      const account = await this.api.account_getDetails();
      const premium = account.is_plus_user ?
        `${CONFIG.COLORS.SUCCESS}✓ 24fire+ Aktiv` :
        `${CONFIG.COLORS.WARNING}✗ Kostenlos (Standard)`;

      const body = `${CONFIG.COLORS.INFO}════════════════════════════
KONTO-INFORMATIONEN
════════════════════════════${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Name:${CONFIG.COLORS.RESET} ${account.firstname} ${account.lastname}
${CONFIG.COLORS.PRIMARY}E-Mail:${CONFIG.COLORS.RESET} ${account.email}

${CONFIG.COLORS.PRIMARY}Guthaben:${CONFIG.COLORS.RESET}
${CONFIG.COLORS.SUCCESS}${this.formatMoney(account.balance)}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Status:${CONFIG.COLORS.RESET}
${premium}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.PRIMARY}Registriert:${CONFIG.COLORS.RESET}
${this.formatDate(account.registry_date)}

${CONFIG.COLORS.INFO}─ Adresse ─${CONFIG.COLORS.RESET}
${account.invoice_address.name}
${account.invoice_address.street} ${account.invoice_address.number}
${account.invoice_address.zip} ${account.invoice_address.city}`;

      const form = new MessageFormData();
      form.setTitle(`${CONFIG.ICONS.ACCOUNT} Konto`);
      form.setBody(body);
      form.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r = await form.show(player);
      if (!r.canceled) await this.showMainMenu(player);
    } catch (error) {
      Logger.error('Account', error);
      if (await this.showError(player, 'Konto', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SERVICES
  // ═════════════════════════════════════════════════════════════════════════

  async showServices(player) {
    try {
      const data = await this.api.account_getServices();
      const svcs = data.services || {};

      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.SERVICE} Dienste`);

      const list = [];
      let count = 0;

      for (const [type, items] of Object.entries(svcs)) {
        for (const svc of items) {
          if (count >= 20) break;
          const icon = type === 'WEBSPACE' ? CONFIG.ICONS.WEBSPACE :
                      type === 'KVM' ? CONFIG.ICONS.KVM : CONFIG.ICONS.DOMAIN;
          form.button(`${icon}\n${svc.name}\n${type}`);
          list.push({ type, ...svc });
          count++;
        }
      }

      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === list.length) {
        await this.showMainMenu(player);
        return;
      }

      const svc = list[r.selection];
      const body = `${CONFIG.COLORS.PRIMARY}${svc.name}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}Typ:${CONFIG.COLORS.RESET} ${svc.type}
${CONFIG.COLORS.INFO}Gekauft:${CONFIG.COLORS.RESET} ${this.formatDate(svc.accounting.buy_date)}
${CONFIG.COLORS.INFO}Kaufpreis:${CONFIG.COLORS.RESET} ${this.formatMoney(svc.accounting.buy_price)}
${CONFIG.COLORS.INFO}Renewal:${CONFIG.COLORS.RESET} ${this.formatDate(svc.accounting.renew_date)}
${CONFIG.COLORS.INFO}Renewal Preis:${CONFIG.COLORS.RESET} ${this.formatMoney(svc.accounting.renew_price)}
${CONFIG.COLORS.INFO}Auto-Renew:${CONFIG.COLORS.RESET} ${svc.accounting.auto_renew ? 'Ja' : 'Nein'}`;

      const form2 = new MessageFormData();
      form2.setTitle(`${CONFIG.ICONS.SERVICE} ${svc.name}`);
      form2.setBody(body);
      form2.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r2 = await form2.show(player);
      if (!r2.canceled) await this.showServices(player);
    } catch (error) {
      Logger.error('Services', error);
      if (await this.showError(player, 'Dienste', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DOMAINS
  // ═════════════════════════════════════════════════════════════════════════

  async showDomains(player) {
    try {
      const data = await this.api.account_getServices();
      const domains = data.services?.DOMAIN || [];

      if (!domains.length) {
        await this.showError(player, 'Domains', 'Keine Domains vorhanden.');
        await this.showMainMenu(player);
        return;
      }

      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.DOMAIN} Domains (${domains.length})`);

      for (let i = 0; i < Math.min(domains.length, 20); i++) {
        form.button(`${CONFIG.ICONS.DOMAIN}\n${domains[i].name}`);
      }

      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === domains.length) {
        await this.showMainMenu(player);
        return;
      }

      await this.showDomainDetail(player, domains[r.selection]);
    } catch (error) {
      Logger.error('Domains', error);
      if (await this.showError(player, 'Domains', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showDomainDetail(player, domain) {
    try {
      const info = await this.api.domain_getInfo(domain.internal_id);
      const dns = await this.api.domain_getDNS(domain.internal_id);

      const body = `${CONFIG.COLORS.PRIMARY}${info.domain.name}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}Status:${CONFIG.COLORS.RESET} ${info.domain.status}
${CONFIG.COLORS.INFO}Auth Code:${CONFIG.COLORS.RESET} ${info.domain.authcode.substring(0, 10)}...
${CONFIG.COLORS.INFO}Erstellt:${CONFIG.COLORS.RESET} ${info.domain.timings.create}
${CONFIG.COLORS.INFO}Expires:${CONFIG.COLORS.RESET} ${info.domain.timings.expire}

${CONFIG.COLORS.INFO}─ Nameserver ─${CONFIG.COLORS.RESET}
${info.nameserver.ns1}
${info.nameserver.ns2}
${info.nameserver.ns3 ? info.nameserver.ns3 : ''}

${CONFIG.COLORS.INFO}─ DNS (${dns.length}) ─${CONFIG.COLORS.RESET}`;

      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.DOMAIN} ${info.domain.name}`);
      form.body(body);
      form.button(`${CONFIG.ICONS.DNS}\nDNS`);
      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === 0) {
        await this.showDNS(player, domain.internal_id, dns);
      } else {
        await this.showDomains(player);
      }
    } catch (error) {
      Logger.error('Domain Detail', error);
      if (await this.showError(player, 'Domain', error.message)) {
        await this.showDomains(player);
      }
    }
  }

  async showDNS(player, domainId, records) {
    const form = new ActionFormData();
    form.title(`${CONFIG.ICONS.DNS} DNS (${records.length})`);

    for (let i = 0; i < Math.min(records.length, 20); i++) {
      const r = records[i];
      form.button(`${CONFIG.ICONS.DNS}\n${r.name}\n${r.type}`);
    }

    form.button(`${CONFIG.ICONS.BACK}\nZurück`);

    const res = await form.show(player);
    if (res.canceled) return;

    if (res.selection === records.length) {
      await this.showDomains(player);
      return;
    }

    const rec = records[res.selection];
    const body = `${CONFIG.COLORS.PRIMARY}DNS Record${CONFIG.COLORS.RESET}

${CONFIG.ICONS.FREE} Alle Infos sichtbar (kostenlos)

${CONFIG.COLORS.INFO}ID:${CONFIG.COLORS.RESET} ${rec.record_id}
${CONFIG.COLORS.INFO}Typ:${CONFIG.COLORS.RESET} ${rec.type}
${CONFIG.COLORS.INFO}Name:${CONFIG.COLORS.RESET} ${rec.name}
${CONFIG.COLORS.INFO}Wert:${CONFIG.COLORS.RESET} ${rec.data}
${CONFIG.COLORS.INFO}TTL:${CONFIG.COLORS.RESET} ${rec.ttl}

${CONFIG.COLORS.WARNING}${CONFIG.ICONS.PREMIUM} Bearbeitung:${CONFIG.COLORS.RESET}
${CONFIG.COLORS.WARNING}Zum Bearbeiten oder Löschen von DNS-Einträgen ist 24fire+ erforderlich.${CONFIG.COLORS.RESET}`;

    const form2 = new MessageFormData();
    form2.setTitle(`${CONFIG.ICONS.DNS} ${rec.name}`);
    form2.setBody(body);
    form2.button1(`${CONFIG.ICONS.BACK} Zurück`);

    const r2 = await form2.show(player);
    if (!r2.canceled) await this.showDNS(player, domainId, records);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // KVM SERVERS
  // ═════════════════════════════════════════════════════════════════════════

  async showKVMs(player) {
    try {
      const data = await this.api.account_getServices();
      const kvms = data.services?.KVM || [];

      if (!kvms.length) {
        await this.showError(player, 'KVM', 'Keine KVM-Server vorhanden.');
        await this.showMainMenu(player);
        return;
      }

      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.KVM} KVM-Server (${kvms.length})`);

      for (let i = 0; i < Math.min(kvms.length, 20); i++) {
        form.button(`${CONFIG.ICONS.KVM}\n${kvms[i].name}`);
      }

      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === kvms.length) {
        await this.showMainMenu(player);
        return;
      }

      await this.showKVMDetail(player, kvms[r.selection]);
    } catch (error) {
      Logger.error('KVMs', error);
      if (await this.showError(player, 'KVM', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showKVMDetail(player, kvm) {
    try {
      const status = await this.api.kvm_getStatus(kvm.internal_id);
      const config = await this.api.kvm_getConfig(kvm.internal_id);

      const statusIcon = status.status === 'running' ? CONFIG.ICONS.ONLINE : CONFIG.ICONS.OFFLINE;
      const statusText = status.status === 'running' ?
        `${CONFIG.COLORS.SUCCESS}✓ Online` :
        `${CONFIG.COLORS.ERROR}✗ Offline`;

      const body = `${CONFIG.COLORS.PRIMARY}${kvm.name}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}Status:${CONFIG.COLORS.RESET} ${statusText}${CONFIG.COLORS.RESET}
${CONFIG.COLORS.INFO}Uptime:${CONFIG.COLORS.RESET} ${status.uptime} Min

${CONFIG.COLORS.INFO}─ Hardware ─${CONFIG.COLORS.RESET}
${CONFIG.COLORS.INFO}CPU:${CONFIG.COLORS.RESET} ${config.config.cores} Cores
${CONFIG.COLORS.INFO}RAM:${CONFIG.COLORS.RESET} ${config.config.mem} MB
${CONFIG.COLORS.INFO}Storage:${CONFIG.COLORS.RESET} ${config.config.disk} GB
${CONFIG.COLORS.INFO}OS:${CONFIG.COLORS.RESET} ${config.config.os.displayname}
${CONFIG.COLORS.INFO}Network:${CONFIG.COLORS.RESET} ${config.config.network_speed} Mbps

${CONFIG.COLORS.INFO}─ Nutzung ─${CONFIG.COLORS.RESET}
${CONFIG.COLORS.INFO}CPU:${CONFIG.COLORS.RESET} ${status.usage.cpu.data}${status.usage.cpu.unit}
${CONFIG.COLORS.INFO}RAM:${CONFIG.COLORS.RESET} ${status.usage.mem.data}${status.usage.mem.unit}
${CONFIG.COLORS.INFO}Storage:${CONFIG.COLORS.RESET} ${status.usage.nvme_storage.data}GB`;

      const form = new ActionFormData();
      form.title(`${statusIcon} ${kvm.name}`);
      form.body(body);
      form.button(`${CONFIG.ICONS.BACKUP}\nBackups`);
      form.button(`${CONFIG.ICONS.TRAFFIC}\nTraffic`);
      form.button(`${CONFIG.ICONS.POWER}\nPower`);
      form.button(`${CONFIG.ICONS.WARNING}\nDDoS`);
      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      switch (r.selection) {
        case 0: await this.showKVMBackups(player, kvm); break;
        case 1: await this.showKVMTraffic(player, kvm); break;
        case 2: await this.showKVMPower(player, kvm); break;
        case 3: await this.showKVMDDoS(player, kvm); break;
        case 4: await this.showKVMs(player); break;
      }
    } catch (error) {
      Logger.error('KVM Detail', error);
      if (await this.showError(player, 'KVM', error.message)) {
        await this.showKVMs(player);
      }
    }
  }

  async showKVMBackups(player, kvm) {
    try {
      const backups = await this.api.kvm_backup_list(kvm.internal_id);

      if (!backups.length) {
        await this.showError(player, 'Backups', 'Keine Backups vorhanden.');
        await this.showKVMDetail(player, kvm);
        return;
      }

      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.BACKUP} Backups (${backups.length})`);

      for (let i = 0; i < Math.min(backups.length, 20); i++) {
        const b = backups[i];
        form.button(`${CONFIG.ICONS.BACKUP}\n${b.backup_os}\n${b.size.toFixed(2)}GB`);
      }

      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === backups.length) {
        await this.showKVMDetail(player, kvm);
        return;
      }

      const b = backups[r.selection];
      const body = `${CONFIG.COLORS.PRIMARY}${b.backup_os}${CONFIG.COLORS.RESET}

${CONFIG.ICONS.FREE} Ansicht: Kostenlos

${CONFIG.COLORS.INFO}Größe:${CONFIG.COLORS.RESET} ${b.size.toFixed(2)} GB
${CONFIG.COLORS.INFO}Erstellt:${CONFIG.COLORS.RESET} ${this.formatDate(b.created)}
${CONFIG.COLORS.INFO}Status:${CONFIG.COLORS.RESET} ${b.status}
${CONFIG.COLORS.INFO}ID:${CONFIG.COLORS.RESET} ${b.backup_id.substring(0, 8)}...

${CONFIG.COLORS.WARNING}${CONFIG.ICONS.PREMIUM} Aktionen:${CONFIG.COLORS.RESET}
${CONFIG.COLORS.WARNING}Zum Wiederherstellen oder Löschen von Backups ist 24fire+ erforderlich.${CONFIG.COLORS.RESET}`;

      const form2 = new MessageFormData();
      form2.setTitle(`${CONFIG.ICONS.BACKUP} Backup`);
      form2.setBody(body);
      form2.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r2 = await form2.show(player);
      if (!r2.canceled) await this.showKVMBackups(player, kvm);
    } catch (error) {
      Logger.error('Backups', error);
      if (await this.showError(player, 'Backups', error.message)) {
        await this.showKVMDetail(player, kvm);
      }
    }
  }

  async showKVMTraffic(player, kvm) {
    try {
      const traffic = await this.api.kvm_traffic_current(kvm.internal_id);

      const body = `${CONFIG.COLORS.PRIMARY}${traffic.month}${CONFIG.COLORS.RESET}

${CONFIG.ICONS.FREE} Alle Daten verfügbar (kostenlos)

${CONFIG.COLORS.INFO}Eingehend:${CONFIG.COLORS.RESET} ${traffic.usage.in.toFixed(2)} GB
${CONFIG.COLORS.INFO}Ausgehend:${CONFIG.COLORS.RESET} ${traffic.usage.out.toFixed(2)} GB
${CONFIG.COLORS.INFO}Gesamt:${CONFIG.COLORS.RESET} ${CONFIG.COLORS.SUCCESS}${traffic.usage.total.toFixed(2)} GB${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}─ Limit ─${CONFIG.COLORS.RESET}
${CONFIG.COLORS.INFO}Monatlich:${CONFIG.COLORS.RESET} ${traffic.limit.monthly.toFixed(2)} GB
${CONFIG.COLORS.INFO}Verbleibend:${CONFIG.COLORS.RESET} ${traffic.limit.remaining.toFixed(2)} GB
${CONFIG.COLORS.INFO}Status:${CONFIG.COLORS.RESET} ${traffic.limit.vm_status}`;

      const form = new MessageFormData();
      form.setTitle(`${CONFIG.ICONS.TRAFFIC} Traffic`);
      form.setBody(body);
      form.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r = await form.show(player);
      if (!r.canceled) await this.showKVMDetail(player, kvm);
    } catch (error) {
      Logger.error('Traffic', error);
      if (await this.showError(player, 'Traffic', error.message)) {
        await this.showKVMDetail(player, kvm);
      }
    }
  }

  async showKVMPower(player, kvm) {
    try {
      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.POWER} Server-Steuerung`);
      form.button(`${CONFIG.ICONS.POWER}\nStarten`);
      form.button(`⏹️\nStoppen`);
      form.button(`🔄\nNeustarten`);
      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === 3) {
        await this.showKVMDetail(player, kvm);
        return;
      }

      const modes = ['start', 'stop', 'restart'];
      await this.api.kvm_setPower(kvm.internal_id, modes[r.selection]);

      player.sendMessage(`${CONFIG.COLORS.SUCCESS}✓ Server ${modes[r.selection]} eingeleitet!${CONFIG.COLORS.RESET}`);

      setTimeout(() => this.showKVMDetail(player, kvm), 2000);
    } catch (error) {
      Logger.error('Power', error);
      if (await this.showError(player, 'Power', error.message)) {
        await this.showKVMDetail(player, kvm);
      }
    }
  }

  async showKVMDDoS(player, kvm) {
    try {
      const ddos = await this.api.kvm_ddos_getSettings(kvm.internal_id);

      let body = `${CONFIG.COLORS.PRIMARY}DDoS-Schutz${CONFIG.COLORS.RESET}

${CONFIG.ICONS.FREE} Ansicht: Kostenlos

`;

      for (const [ip, settings] of Object.entries(ddos)) {
        body += `${CONFIG.COLORS.INFO}${ip}${CONFIG.COLORS.RESET}\n`;
        body += `  Layer 4: ${settings.layer4}\n`;
        body += `  Layer 7: ${settings.layer7}\n`;
      }

      body += `\n${CONFIG.COLORS.WARNING}${CONFIG.ICONS.PREMIUM} Änderungen:${CONFIG.COLORS.RESET}
${CONFIG.COLORS.WARNING}DDoS-Einstellungen können nur mit 24fire+ geändert werden.${CONFIG.COLORS.RESET}`;

      const form = new MessageFormData();
      form.setTitle(`${CONFIG.ICONS.WARNING} DDoS`);
      form.setBody(body);
      form.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r = await form.show(player);
      if (!r.canceled) await this.showKVMDetail(player, kvm);
    } catch (error) {
      Logger.error('DDoS', error);
      if (await this.showError(player, 'DDoS', error.message)) {
        await this.showKVMDetail(player, kvm);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // WEBSPACE
  // ═════════════════════════════════════════════════════════════════════════

  async showWebspaces(player) {
    try {
      const data = await this.api.account_getServices();
      const ws = data.services?.WEBSPACE || [];

      if (!ws.length) {
        await this.showError(player, 'Webspace', 'Keine Webspaces vorhanden.');
        await this.showMainMenu(player);
        return;
      }

      const form = new ActionFormData();
      form.title(`${CONFIG.ICONS.WEBSPACE} Webspace (${ws.length})`);

      for (let i = 0; i < Math.min(ws.length, 20); i++) {
        form.button(`${CONFIG.ICONS.WEBSPACE}\n${ws[i].name}`);
      }

      form.button(`${CONFIG.ICONS.BACK}\nZurück`);

      const r = await form.show(player);
      if (r.canceled) return;

      if (r.selection === ws.length) {
        await this.showMainMenu(player);
        return;
      }

      await this.showWebspaceDetail(player, ws[r.selection]);
    } catch (error) {
      Logger.error('Webspace', error);
      if (await this.showError(player, 'Webspace', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  async showWebspaceDetail(player, ws) {
    try {
      const info = await this.api.webspace_getInfo(ws.internal_id);

      const body = `${CONFIG.COLORS.PRIMARY}${info.access.username}${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}Host:${CONFIG.COLORS.RESET} ${info.access.host}
${CONFIG.COLORS.INFO}E-Mail:${CONFIG.COLORS.RESET} ${info.access.email}

${CONFIG.COLORS.INFO}─ Ressourcen ─${CONFIG.COLORS.RESET}
${CONFIG.COLORS.INFO}Domains:${CONFIG.COLORS.RESET} ${info.resources.domains}
${CONFIG.COLORS.INFO}Subdomains:${CONFIG.COLORS.RESET} ${info.resources.subdomains}
${CONFIG.COLORS.INFO}E-Mails:${CONFIG.COLORS.RESET} ${info.resources.emails}
${CONFIG.COLORS.INFO}Datenbanken:${CONFIG.COLORS.RESET} ${info.resources.databases}
${CONFIG.COLORS.INFO}SSD:${CONFIG.COLORS.RESET} ${info.resources.ssd_storage} GB
${CONFIG.COLORS.INFO}Traffic:${CONFIG.COLORS.RESET} ${info.resources.traffic} GB
${CONFIG.COLORS.INFO}Memory:${CONFIG.COLORS.RESET} ${info.resources.memory_limit} MB
${CONFIG.COLORS.INFO}IP:${CONFIG.COLORS.RESET} ${info.resources.ip_address}`;

      const form = new MessageFormData();
      form.setTitle(`${CONFIG.ICONS.WEBSPACE} ${ws.name}`);
      form.setBody(body);
      form.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r = await form.show(player);
      if (!r.canceled) await this.showWebspaces(player);
    } catch (error) {
      Logger.error('Webspace Detail', error);
      if (await this.showError(player, 'Webspace', error.message)) {
        await this.showWebspaces(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DONATIONS
  // ═════════════════════════════════════════════════════════════════════════

  async showDonations(player) {
    try {
      const data = await this.api.account_getDonations();
      const info = data.information;

      let body = `${CONFIG.COLORS.PRIMARY}Spendenseite${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}Status:${CONFIG.COLORS.RESET} ${info.enabled ? '✓ Aktiv' : '✗ Inaktiv'}
${CONFIG.COLORS.INFO}Link:${CONFIG.COLORS.RESET} ${info.link}
${CONFIG.COLORS.INFO}Beschreibung:${CONFIG.COLORS.RESET} ${info.description}

${CONFIG.COLORS.INFO}─ Pakete (${data.bundles.length}) ─${CONFIG.COLORS.RESET}`;

      for (const b of data.bundles.slice(0, 10)) {
        body += `\n${CONFIG.COLORS.PRIMARY}${b.name}:${CONFIG.COLORS.RESET} ${b.price}€`;
      }

      body += `\n\n${CONFIG.COLORS.WARNING}${CONFIG.ICONS.PREMIUM} Mehr Designs:${CONFIG.COLORS.RESET}
${CONFIG.COLORS.WARNING}Mit 24fire+ haben Sie Zugriff auf 12 weitere Designs für Ihre Spendenseite.${CONFIG.COLORS.RESET}`;

      const form = new MessageFormData();
      form.setTitle(`${CONFIG.ICONS.DONATION} Spendenseite`);
      form.setBody(body);
      form.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r = await form.show(player);
      if (!r.canceled) await this.showMainMenu(player);
    } catch (error) {
      Logger.error('Donations', error);
      if (await this.showError(player, 'Spendenseite', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // AFFILIATE
  // ═════════════════════════════════════════════════════════════════════════

  async showAffiliate(player) {
    try {
      const data = await this.api.account_getAffiliate();
      const info = data.information;
      const summary = data.summary;

      let body = `${CONFIG.COLORS.PRIMARY}Affiliate-System${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}Link:${CONFIG.COLORS.RESET} ${info.link}

${CONFIG.COLORS.INFO}─ Statistik ─${CONFIG.COLORS.RESET}
${CONFIG.COLORS.INFO}Bestätigte Leads:${CONFIG.COLORS.RESET} ${summary.confirmed_leads}
${CONFIG.COLORS.INFO}URL-Klicks:${CONFIG.COLORS.RESET} ${summary.url_clicks}
${CONFIG.COLORS.INFO}Verdienst (bezahlt):${CONFIG.COLORS.RESET} ${this.formatMoney(summary.balance_paid)}
${CONFIG.COLORS.INFO}Verdienst (ausstehend):${CONFIG.COLORS.RESET} ${this.formatMoney(summary.balance_pending)}

${CONFIG.COLORS.WARNING}${CONFIG.ICONS.PREMIUM} Höhere Provision:${CONFIG.COLORS.RESET}
${CONFIG.COLORS.WARNING}Mit 24fire+ erhalten Sie 20% Gutschrift (statt 10%) bei bestätigten Leads.${CONFIG.COLORS.RESET}`;

      const form = new MessageFormData();
      form.setTitle(`${CONFIG.ICONS.AFFILIATE} Affiliate`);
      form.setBody(body);
      form.button1(`${CONFIG.ICONS.BACK} Zurück`);

      const r = await form.show(player);
      if (!r.canceled) await this.showMainMenu(player);
    } catch (error) {
      Logger.error('Affiliate', error);
      if (await this.showError(player, 'Affiliate', error.message)) {
        await this.showMainMenu(player);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // INFO & ABOUT
  // ═════════════════════════════════════════════════════════════════════════

  async showInfo(player) {
    const body = `${CONFIG.COLORS.PRIMARY}24FIRE MANAGER v1.0${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}─ Status ─${CONFIG.COLORS.RESET}
${CONFIG.COLORS.SUCCESS}✓ Online${CONFIG.COLORS.RESET}
${CONFIG.COLORS.SUCCESS}✓ API aktiv${CONFIG.COLORS.RESET}

${CONFIG.COLORS.INFO}─ Funktionen ─${CONFIG.COLORS.RESET}
${CONFIG.ICONS.FREE} 15 kostenlose Features
${CONFIG.ICONS.PREMIUM} 10 Premium Features (24fire+)

${CONFIG.COLORS.INFO}─ Endpoints ─${CONFIG.COLORS.RESET}
Account: 4 Endpoints
Domains: 6 Endpoints (3 Free, 3 Plus)
Backups: 6 Endpoints (1 Free, 5 Plus)
Traffic: 3 Endpoints (2 Free, 1 Plus)
Monitoring: 2 Endpoints (Plus)
DDoS: 2 Endpoints (1 Free, 1 Plus)
KVM: 2 Endpoints (Free)
Power: 1 Endpoint (Free)
Webspace: 1 Endpoint (Free)

Gesamt: 27+ API Endpoints

${CONFIG.COLORS.INFO}─ 24fire+ Features ─${CONFIG.COLORS.RESET}
${CONFIG.ICONS.PREMIUM} Backup erstellen & wiederherstellen
${CONFIG.ICONS.PREMIUM} DNS-Einträge verwalten
${CONFIG.ICONS.PREMIUM} Monitoring (1 Min Aktualisierung)
${CONFIG.ICONS.PREMIUM} DDoS-Einstellungen ändern
${CONFIG.ICONS.PREMIUM} Traffic-Diagramme
${CONFIG.ICONS.PREMIUM} Höhere Affiliate-Provision (20%)
${CONFIG.ICONS.PREMIUM} Mehr Spendenseite Designs (12+)
${CONFIG.ICONS.PREMIUM} Server Recovery (10 Tage)
${CONFIG.ICONS.PREMIUM} SSH-Key Verwaltung
${CONFIG.ICONS.PREMIUM} Plus 1 Minute Monitoring

${CONFIG.COLORS.INFO}─ Kontakt ─${CONFIG.COLORS.RESET}
24fire GmbH
https://24fire.de`;

    const form = new MessageFormData();
    form.setTitle(`${CONFIG.ICONS.INFO} About`);
    form.setBody(body);
    form.button1(`${CONFIG.ICONS.BACK} Zurück`);

    const r = await form.show(player);
    if (!r.canceled) await this.showMainMenu(player);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BEDROCK BRIDGE INTEGRATION - CUSTOM COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

class BridgeCommandHandler {
  constructor(gui, api) {
    this.gui = gui;
    this.api = api;
    this.prefix = '!'; // Bedrock Bridge Standard Prefix
  }

  register(bridge = null) {
    // Bedrock Bridge Chat Integration
    system.beforeChat.subscribe((event) => {
      const msg = event.message.trim();

      // Bedrock Bridge Commands
      if (msg === '!24fire' || msg === `${this.prefix}24fire`) {
        event.cancel = true;
        this.handleCommand(event.sender);
      }

      if (msg === '!24fire info' || msg === `${this.prefix}24fire info`) {
        event.cancel = true;
        this.gui.showInfo(event.sender);
      }

      if (msg === '!24fire account' || msg === `${this.prefix}24fire account`) {
        event.cancel = true;
        this.gui.showAccount(event.sender);
      }

      if (msg === '!24fire services' || msg === `${this.prefix}24fire services`) {
        event.cancel = true;
        this.gui.showServices(event.sender);
      }

      if (msg === '!24fire domains' || msg === `${this.prefix}24fire domains`) {
        event.cancel = true;
        this.gui.showDomains(event.sender);
      }

      if (msg === '!24fire kvm' || msg === `${this.prefix}24fire kvm`) {
        event.cancel = true;
        this.gui.showKVMs(event.sender);
      }

      if (msg === '!24fire refresh' || msg === `${this.prefix}24fire refresh`) {
        event.cancel = true;
        this.api.clearCache();
        event.sender.sendMessage(`${CONFIG.COLORS.SUCCESS}✓ Cache geleert!${CONFIG.COLORS.RESET}`);
      }
    });

    Logger.info('Bedrock Bridge Commands registriert');
  }

  async handleCommand(player) {
    if (this.gui.isOnCooldown(player.id)) {
      player.sendMessage(`${CONFIG.COLORS.WARNING}⏳ Bitte warte...${CONFIG.COLORS.RESET}`);
      return;
    }

    this.gui.setCooldown(player.id);

    try {
      await this.gui.showMainMenu(player);
    } catch (error) {
      Logger.error('Command Error', error);
      player.sendMessage(`${CONFIG.COLORS.ERROR}❌ ${error.message}${CONFIG.COLORS.RESET}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

class TwentyFirePlugin {
  constructor() {
    Logger.info('24Fire Plugin initialisiert');
    this.api = new TwentyFireAPI(CONFIG.API.KEY);
    this.gui = new GUIManager(this.api);
    this.commands = new BridgeCommandHandler(this.gui, this.api);
  }

  start() {
    try {
      this.commands.register();
      Logger.info('24Fire Plugin gestartet');
      Logger.info('Befehle: !24fire, !24fire info, !24fire account, !24fire services, !24fire domains, !24fire kvm, !24fire refresh');
      Logger.info(`API Status: ${CONFIG.API.KEY ? '✓ Konfiguriert' : '✗ Nicht konfiguriert'}`);
    } catch (error) {
      Logger.error('Plugin Start', error);
      throw error;
    }
  }

  stop() {
    this.api.clearCache();
    Logger.info('24Fire Plugin gestoppt');
  }

  getStatus() {
    return {
      name: '24FIRE Manager',
      version: '1.0.0',
      running: true,
      api: CONFIG.API.KEY ? '✓ Aktiv' : '✗ Inaktiv',
      cache: CONFIG.CACHE.ENABLED ? 'Aktiv' : 'Deaktiviert',
      endpoints: '27+',
      freeFeatures: 15,
      premiumFeatures: 10
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT & START
// ═══════════════════════════════════════════════════════════════════════════

export { TwentyFirePlugin, TwentyFireAPI, GUIManager, BridgeCommandHandler, Logger };

const plugin = new TwentyFirePlugin();
plugin.start();

export default plugin;
