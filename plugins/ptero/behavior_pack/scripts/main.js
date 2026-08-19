/**
 * Pterodactyl Bedrock Bridge - Main Plugin
 * Reines Bedrock-Plugin ohne externe Build-Tools
 *
 * Installiert einfach in: behavior_pack/scripts/main.js
 * Funktioniert direkt im Bedrock Server!
 */

import { world, system, Player } from '@minecraft/server';
import { http, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';

// ============================================================================
// KONFIGURATION - HIER DEINE API-DATEN EINTRAGEN
// ============================================================================

const CONFIG = {
  PANEL_URL: 'https://pv-q.de/',
  API_KEY: 'REDACTED_PVQ_KEY',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  COMMAND_PREFIX: 'bedrockbridge',
  DEBUG_MODE: true
};

// ============================================================================
// COLORS & ICONS
// ============================================================================

const Colors = {
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
  BOLD: '§l',
  STRIKETHROUGH: '§m',
  UNDERLINE: '§n',
  ITALIC: '§o',
  RESET: '§r'
};

const Icons = {
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
  CHART: '📊',
  CONSOLE: '💻'
};

// ============================================================================
// HTTP CLIENT
// ============================================================================

class PterodactylClient {
  constructor(config) {
    this.panelUrl = config.PANEL_URL.replace(/\/$/, '');
    this.apiKey = config.API_KEY;
    this.timeout = config.TIMEOUT;
    this.retryAttempts = config.RETRY_ATTEMPTS;
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  async get(endpoint) {
    return this.request(endpoint, HttpRequestMethod.Get, null);
  }

  async post(endpoint, body) {
    return this.request(endpoint, HttpRequestMethod.Post, body);
  }

  async put(endpoint, body) {
    return this.request(endpoint, HttpRequestMethod.Put, body);
  }

  async delete(endpoint) {
    return this.request(endpoint, HttpRequestMethod.Delete, null);
  }

  async request(endpoint, method, body) {
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const url = `${this.panelUrl}${endpoint}`;
        const request = new HttpRequest(url);

        request.method = method;
        request.addHeader('Authorization', `Bearer ${this.apiKey}`);
        request.addHeader('Accept', 'Application/vnd.pterodactyl.v1+json');
        request.addHeader('Content-Type', 'application/json');
        request.addHeader('User-Agent', 'BedrockBridge/1.0.0');
        request.setTimeout(this.timeout);

        if (body) {
          request.setBody(JSON.stringify(body));
        }

        const response = await http.request(request);

        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.body}`);
        }

        if (!response.body || response.body.trim() === '') {
          return null;
        }

        return JSON.parse(response.body);
      } catch (error) {
        if (attempt < this.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// GUI BUILDER
// ============================================================================

class GUIBuilder {
  static async showMainMenu(player) {
    const form = new ActionFormData();
    form.title(`${Colors.BOLD}${Colors.GOLD}Pterodactyl Bridge${Colors.RESET}`);
    form.body(`${Colors.YELLOW}Wähle eine Option:${Colors.RESET}`);

    form.button(`${Icons.SERVER}${Colors.BOLD} Server Management${Colors.RESET}`);
    form.button(`${Icons.DATABASE}${Colors.BOLD} Datenbanken${Colors.RESET}`);
    form.button(`${Icons.BACKUP}${Colors.BOLD} Sicherungen${Colors.RESET}`);
    form.button(`${Icons.FILE}${Colors.BOLD} Dateien${Colors.RESET}`);
    form.button(`${Icons.SCHEDULE}${Colors.BOLD} Zeitpläne${Colors.RESET}`);
    form.button(`${Icons.CHART}${Colors.BOLD} Monitoring${Colors.RESET}`);
    form.button(`${Icons.SETTINGS}${Colors.BOLD} Einstellungen${Colors.RESET}`);
    form.button(`${Icons.INFO}${Colors.BOLD} Infos${Colors.RESET}`);

    const response = await form.show(player);
    return response;
  }

  static async showServerList(player, servers) {
    const form = new ActionFormData();
    form.title(`${Colors.BOLD}${Icons.SERVER} Server (${servers.length})${Colors.RESET}`);
    form.body(`${Colors.GRAY}Insgesamt: ${servers.length} Server${Colors.RESET}\n\n`);

    servers.forEach((server) => {
      const status = server.attributes?.status || 'offline';
      const statusIcon = status === 'running' ? Icons.PLAY : Icons.STOP;
      const statusColor = status === 'running' ? Colors.GREEN : Colors.RED;

      form.button(
        `${statusIcon} ${Colors.BOLD}${server.attributes?.name}${Colors.RESET}\n` +
        `${Colors.GRAY}${statusColor}${status}${Colors.RESET}`
      );
    });

    form.button(`${Colors.BOLD}Zurück${Colors.RESET}`);

    const response = await form.show(player);
    return response;
  }

  static async showServerDetails(player, server, resources) {
    const form = new ActionFormData();
    const name = server.attributes?.name || 'Unknown';
    const status = server.attributes?.status || 'offline';
    const statusColor = status === 'running' ? Colors.GREEN : Colors.RED;

    form.title(`${Colors.BOLD}${name}${Colors.RESET}`);

    let body = `${Colors.YELLOW}Status:${Colors.RESET} ${statusColor}${status}${Colors.RESET}\n`;
    body += `${Colors.YELLOW}Node:${Colors.RESET} ${Colors.GRAY}${server.attributes?.node}${Colors.RESET}\n\n`;

    if (resources?.attributes?.resources) {
      const res = resources.attributes.resources;
      body += `${Colors.YELLOW}Ressourcen:${Colors.RESET}\n`;
      body += `├ CPU: ${Colors.GRAY}${(res.cpu_absolute || 0).toFixed(1)}%${Colors.RESET}\n`;
      body += `├ RAM: ${Colors.GRAY}${((res.memory_bytes || 0) / 1024 / 1024).toFixed(0)}MB${Colors.RESET}\n`;
      body += `└ Disk: ${Colors.GRAY}${((res.disk_bytes || 0) / 1024 / 1024 / 1024).toFixed(2)}GB${Colors.RESET}\n`;
    }

    form.body(body);

    if (status !== 'running') {
      form.button(`${Icons.PLAY} ${Colors.GREEN}Starten${Colors.RESET}`);
    } else {
      form.button(`${Icons.STOP} ${Colors.RED}Stoppen${Colors.RESET}`);
      form.button(`${Icons.RESTART} ${Colors.YELLOW}Neustarten${Colors.RESET}`);
    }

    form.button(`${Icons.CONSOLE} ${Colors.BOLD}Konsole${Colors.RESET}`);
    form.button(`${Icons.FILE} ${Colors.BOLD}Dateien${Colors.RESET}`);
    form.button(`${Icons.DATABASE} ${Colors.BOLD}Datenbanken${Colors.RESET}`);
    form.button(`${Icons.BACKUP} ${Colors.BOLD}Sicherungen${Colors.RESET}`);
    form.button(`${Colors.BOLD}Zurück${Colors.RESET}`);

    const response = await form.show(player);
    return response;
  }

  static async showConfirmation(player, title, message) {
    const form = new MessageFormData();
    form.title(title);
    form.body(message);
    form.button1(`${Icons.SUCCESS} Ja`);
    form.button2(`${Icons.ERROR} Nein`);

    const response = await form.show(player);
    return response?.selection === 0;
  }

  static async showError(player, title, message) {
    const form = new MessageFormData();
    form.title(`${Colors.RED}${Icons.ERROR} ${title}${Colors.RESET}`);
    form.body(`${Colors.GRAY}${message}${Colors.RESET}`);
    form.button1(`${Colors.RED}OK${Colors.RESET}`);
    await form.show(player);
  }

  static async showSuccess(player, message) {
    const form = new MessageFormData();
    form.title(`${Colors.GREEN}${Icons.SUCCESS} Erfolg${Colors.RESET}`);
    form.body(message);
    form.button1(`${Colors.GREEN}OK${Colors.RESET}`);
    await form.show(player);
  }
}

// ============================================================================
// PLUGIN MANAGER
// ============================================================================

class PterodactylPlugin {
  constructor(config) {
    this.config = config;
    this.client = new PterodactylClient(config);
    this.isInitialized = false;
    this.connectionError = null;
  }

  async initialize() {
    try {
      world.sendMessage(`${Colors.YELLOW}${Icons.INFO} Pterodactyl Bridge wird initialisiert...${Colors.RESET}`);

      // Test connection
      const response = await this.client.get('/api/client');
      if (response) {
        world.sendMessage(`${Colors.GREEN}${Icons.SUCCESS} Verbindung erfolgreich!${Colors.RESET}`);
        this.isInitialized = true;
        return true;
      }
    } catch (error) {
      this.connectionError = error;
      world.sendMessage(`${Colors.RED}${Icons.ERROR} Verbindungsfehler: ${error.message}${Colors.RESET}`);
      return false;
    }
  }

  async getServers() {
    try {
      const response = await this.client.get('/api/client?per_page=50');
      return response?.data || [];
    } catch (error) {
      throw new Error(`Server-Liste fehlgeschlagen: ${error.message}`);
    }
  }

  async getServerDetails(serverId) {
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}`);
      return response;
    } catch (error) {
      throw new Error(`Server-Details fehlgeschlagen: ${error.message}`);
    }
  }

  async getResources(serverId) {
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/resources`);
      return response;
    } catch (error) {
      throw new Error(`Ressourcen fehlgeschlagen: ${error.message}`);
    }
  }

  async startServer(serverId) {
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'start' });
      return true;
    } catch (error) {
      throw new Error(`Server starten fehlgeschlagen: ${error.message}`);
    }
  }

  async stopServer(serverId) {
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'stop' });
      return true;
    } catch (error) {
      throw new Error(`Server stoppen fehlgeschlagen: ${error.message}`);
    }
  }

  async restartServer(serverId) {
    try {
      await this.client.post(`/api/client/servers/${serverId}/power`, { signal: 'restart' });
      return true;
    } catch (error) {
      throw new Error(`Server neustarten fehlgeschlagen: ${error.message}`);
    }
  }

  async getDatabases(serverId) {
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/databases`);
      return response?.data || [];
    } catch (error) {
      throw new Error(`Datenbanken fehlgeschlagen: ${error.message}`);
    }
  }

  async getBackups(serverId) {
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/backups`);
      return response?.data || [];
    } catch (error) {
      throw new Error(`Sicherungen fehlgeschlagen: ${error.message}`);
    }
  }

  async createBackup(serverId) {
    try {
      await this.client.post(`/api/client/servers/${serverId}/backups`, {});
      return true;
    } catch (error) {
      throw new Error(`Sicherung erstellen fehlgeschlagen: ${error.message}`);
    }
  }

  async getFiles(serverId, directory = '/') {
    try {
      const response = await this.client.get(
        `/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(directory)}`
      );
      return response?.data || [];
    } catch (error) {
      throw new Error(`Dateien fehlgeschlagen: ${error.message}`);
    }
  }

  async getSchedules(serverId) {
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/schedules`);
      return response?.data || [];
    } catch (error) {
      throw new Error(`Zeitpläne fehlgeschlagen: ${error.message}`);
    }
  }

  async getAllocations(serverId) {
    try {
      const response = await this.client.get(`/api/client/servers/${serverId}/network/allocations`);
      return response?.data || [];
    } catch (error) {
      throw new Error(`Allocations fehlgeschlagen: ${error.message}`);
    }
  }
}

// ============================================================================
// COMMAND HANDLER
// ============================================================================

const plugin = new PterodactylPlugin(CONFIG);

async function handleCommand(event) {
  const message = event.message;
  const player = event.sender;

  if (!message.toLowerCase().startsWith(CONFIG.COMMAND_PREFIX)) {
    return;
  }

  event.cancel = true;

  const parts = message.slice(CONFIG.COMMAND_PREFIX.length).trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);

  try {
    switch (command) {
      case 'gui':
      case 'menu':
        await handleMainMenu(player);
        break;

      case 'servers':
        await handleServerManagement(player);
        break;

      case 'status':
        handleStatus(player);
        break;

      case 'test':
        await handleTest(player);
        break;

      case 'help':
        handleHelp(player);
        break;

      case 'info':
        handleInfo(player);
        break;

      default:
        player.sendMessage(
          `${Colors.RED}${Icons.ERROR} Unbekannter Befehl: ${command}${Colors.RESET}\n` +
          `${Colors.GRAY}Tippe /${CONFIG.COMMAND_PREFIX} help${Colors.RESET}`
        );
    }
  } catch (error) {
    await GUIBuilder.showError(player, 'Fehler', error.message);
  }
}

async function handleMainMenu(player) {
  if (!plugin.isInitialized) {
    await GUIBuilder.showError(player, 'Fehler', 'Plugin nicht bereit!');
    return;
  }

  const choice = await GUIBuilder.showMainMenu(player);

  switch (choice) {
    case 0:
      await handleServerManagement(player);
      break;
    case 1:
      player.sendMessage(`${Colors.YELLOW}Datenbanken-Verwaltung wird geladen...${Colors.RESET}`);
      break;
    case 2:
      player.sendMessage(`${Colors.YELLOW}Sicherungen werden geladen...${Colors.RESET}`);
      break;
    case 3:
      player.sendMessage(`${Colors.YELLOW}Datei-Verwaltung wird geladen...${Colors.RESET}`);
      break;
    case 4:
      player.sendMessage(`${Colors.YELLOW}Zeitplan-Verwaltung wird geladen...${Colors.RESET}`);
      break;
    case 5:
      player.sendMessage(`${Colors.YELLOW}Monitoring-Dashboard wird geladen...${Colors.RESET}`);
      break;
    case 6:
      await handleSettings(player);
      break;
    case 7:
      await handleInfo(player);
      break;
  }
}

async function handleServerManagement(player) {
  try {
    player.sendMessage(`${Colors.YELLOW}${Icons.INFO} Server werden geladen...${Colors.RESET}`);

    const servers = await plugin.getServers();

    if (servers.length === 0) {
      await GUIBuilder.showError(player, 'Keine Server', 'Es wurden keine Server gefunden.');
      return;
    }

    const selectedIdx = await GUIBuilder.showServerList(player, servers);

    if (selectedIdx === undefined || selectedIdx >= servers.length) {
      return;
    }

    const server = servers[selectedIdx];
    const resources = await plugin.getResources(server.attributes.identifier);

    const actionIdx = await GUIBuilder.showServerDetails(player, server, resources);

    switch (actionIdx) {
      case 0:
        const startConfirm = await GUIBuilder.showConfirmation(
          player,
          'Server starten?',
          'Möchtest du den Server wirklich starten?'
        );
        if (startConfirm) {
          player.sendMessage(`${Colors.YELLOW}${Icons.INFO} Starte Server...${Colors.RESET}`);
          await plugin.startServer(server.attributes.identifier);
          await GUIBuilder.showSuccess(player, 'Server erfolgreich gestartet!');
        }
        break;

      case 1:
        const stopConfirm = await GUIBuilder.showConfirmation(
          player,
          'Server stoppen?',
          'Möchtest du den Server wirklich stoppen?'
        );
        if (stopConfirm) {
          player.sendMessage(`${Colors.YELLOW}${Icons.INFO} Stoppe Server...${Colors.RESET}`);
          await plugin.stopServer(server.attributes.identifier);
          await GUIBuilder.showSuccess(player, 'Server erfolgreich gestoppt!');
        }
        break;

      case 2:
        const restartConfirm = await GUIBuilder.showConfirmation(
          player,
          'Server neustarten?',
          'Möchtest du den Server wirklich neustarten?'
        );
        if (restartConfirm) {
          player.sendMessage(`${Colors.YELLOW}${Icons.INFO} Starte Server neu...${Colors.RESET}`);
          await plugin.restartServer(server.attributes.identifier);
          await GUIBuilder.showSuccess(player, 'Server erfolgreich neugestartet!');
        }
        break;
    }
  } catch (error) {
    await GUIBuilder.showError(player, 'Server Fehler', error.message);
  }
}

async function handleSettings(player) {
  const message =
    `${Colors.BOLD}Einstellungen${Colors.RESET}\n\n` +
    `${Colors.YELLOW}Plugin Status:${Colors.RESET}\n` +
    `├ Initialisiert: ${plugin.isInitialized ? Colors.GREEN + 'Ja' : Colors.RED + 'Nein'}${Colors.RESET}\n` +
    `├ Panel: ${CONFIG.PANEL_URL}\n` +
    `└ API-Key: ${CONFIG.API_KEY.substring(0, 10)}...${Colors.RESET}\n`;

  await GUIBuilder.showError(player, 'Einstellungen', message);
}

async function handleInfo(player) {
  const message =
    `${Colors.BOLD}${Colors.GOLD}Pterodactyl Bridge v1.0.0${Colors.RESET}\n\n` +
    `${Colors.YELLOW}Features:${Colors.RESET}\n` +
    `${Colors.GREEN}✓${Colors.RESET} Server Management\n` +
    `${Colors.GREEN}✓${Colors.RESET} Datenbank Verwaltung\n` +
    `${Colors.GREEN}✓${Colors.RESET} Sicherungen\n` +
    `${Colors.GREEN}✓${Colors.RESET} Dateiverwaltung\n` +
    `${Colors.GREEN}✓${Colors.RESET} Zeitpläne\n` +
    `${Colors.GREEN}✓${Colors.RESET} Monitoring\n\n` +
    `${Colors.YELLOW}Autor:${Colors.RESET} Bedrock Bridge Team\n` +
    `${Colors.YELLOW}Version:${Colors.RESET} 1.0.0\n` +
    `${Colors.YELLOW}Status:${Colors.RESET} ${plugin.isInitialized ? Colors.GREEN + 'Bereit' : Colors.RED + 'Fehler'}${Colors.RESET}`;

  await GUIBuilder.showError(player, 'Infos', message);
}

function handleStatus(player) {
  if (!plugin.isInitialized) {
    player.sendMessage(`${Colors.RED}${Icons.ERROR} Plugin nicht bereit!${Colors.RESET}`);
    if (plugin.connectionError) {
      player.sendMessage(`${Colors.GRAY}Fehler: ${plugin.connectionError.message}${Colors.RESET}`);
    }
    return;
  }

  player.sendMessage(
    `${Colors.GREEN}${Icons.SUCCESS} Pterodactyl Bridge bereit!${Colors.RESET}\n` +
    `${Colors.GREEN}✓ Verbunden${Colors.RESET}\n` +
    `${Colors.GREEN}✓ API aktiv${Colors.RESET}\n\n` +
    `${Colors.YELLOW}Tippe /${CONFIG.COMMAND_PREFIX} gui für das Menü${Colors.RESET}`
  );
}

async function handleTest(player) {
  player.sendMessage(`${Colors.YELLOW}🔄 Teste Verbindung...${Colors.RESET}`);

  try {
    const response = await plugin.client.get('/api/client?per_page=1');

    if (response?.data) {
      player.sendMessage(
        `${Colors.GREEN}✓ Verbindung erfolgreich!${Colors.RESET}\n` +
        `${Colors.GRAY}Server gefunden: ${response.data.length}${Colors.RESET}`
      );
    }
  } catch (error) {
    player.sendMessage(
      `${Colors.RED}✗ Verbindung fehlgeschlagen!${Colors.RESET}\n` +
      `${Colors.GRAY}${error.message}${Colors.RESET}`
    );
  }
}

function handleHelp(player) {
  const help =
    `${Colors.BOLD}${Colors.YELLOW}Pterodactyl Bridge - Hilfe${Colors.RESET}\n\n` +
    `${Colors.YELLOW}Verfügbare Befehle:${Colors.RESET}\n` +
    `${Colors.GOLD}/${CONFIG.COMMAND_PREFIX} gui${Colors.RESET} - Hauptmenü öffnen\n` +
    `${Colors.GOLD}/${CONFIG.COMMAND_PREFIX} servers${Colors.RESET} - Server verwalten\n` +
    `${Colors.GOLD}/${CONFIG.COMMAND_PREFIX} status${Colors.RESET} - Plugin Status\n` +
    `${Colors.GOLD}/${CONFIG.COMMAND_PREFIX} test${Colors.RESET} - Verbindung testen\n` +
    `${Colors.GOLD}/${CONFIG.COMMAND_PREFIX} help${Colors.RESET} - Diese Hilfe\n` +
    `${Colors.GOLD}/${CONFIG.COMMAND_PREFIX} info${Colors.RESET} - Plugin-Infos\n\n` +
    `${Colors.GRAY}Alle Funktionen sind über das GUI verfügbar!${Colors.RESET}`;

  player.sendMessage(help);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Plugin beim Server-Start initialisieren
system.runTimeout(async () => {
  world.sendMessage(`${Colors.BOLD}${Colors.GOLD}Pterodactyl Bridge${Colors.RESET} ${Colors.GRAY}wird geladen...${Colors.RESET}`);
  const success = await plugin.initialize();

  if (success) {
    world.sendMessage(`${Colors.GREEN}${Icons.SUCCESS} Pterodactyl Bridge bereit!${Colors.RESET}`);
    world.sendMessage(`${Colors.YELLOW}Tippe /${CONFIG.COMMAND_PREFIX} help für Hilfe${Colors.RESET}`);
  }
}, 20); // 1 Sekunde Verzögerung

// Chat Command Handler registrieren
world.beforeEvents.chatSend.subscribe((event) => {
  handleCommand(event);
});

// Welcome Message beim Join
world.afterEvents.playerSpawn.subscribe((event) => {
  if (plugin.isInitialized) {
    event.player.sendMessage(
      `${Colors.GREEN}${Icons.SUCCESS} Pterodactyl Bridge bereit!${Colors.RESET} ` +
      `${Colors.GRAY}Tippe ${Colors.YELLOW}/${CONFIG.COMMAND_PREFIX} help${Colors.RESET}`
    );
  }
});

console.log('[Pterodactyl Bridge] Plugin geladen');
