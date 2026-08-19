/**
 * Pterodactyl Bedrock Bridge - Main Plugin
 * Zentrale Plugin-Klasse mit vollständiger Integration
 */

import { world, Player, ChatSendBeforeEvent } from '@minecraft/server';
import { PterodactylClient } from './api/PterodactylClient';
import { ServerEndpoint } from './api/endpoints/ServerEndpoint';
import { DatabaseEndpoint } from './api/endpoints/DatabaseEndpoint';
import { BackupEndpoint } from './api/endpoints/BackupEndpoint';
import { ScheduleEndpoint } from './api/endpoints/ScheduleEndpoint';
import { AllocationEndpoint } from './api/endpoints/AllocationEndpoint';
import { UserEndpoint } from './api/endpoints/UserEndpoint';
import { WebSocketConsole } from './websocket/WebSocketConsole';
import { MonitoringService, monitoringService } from './services/MonitoringService';
import { PterodactylActionForm, PterodactylModalForm, FormBuilder } from './gui/FormBuilder';
import { IPluginConfig, IServer } from './types';
import { COMMAND_PREFIX, POWER_ACTIONS, Colors, Icons, SUCCESS_MESSAGES, ERROR_MESSAGES } from './config/Constants';
import { logger } from './utils/Logger';
import { cacheManager } from './utils/Cache';
import { errorHandler } from './utils/ErrorHandler';

export class PterodactylPlugin {
  private config: IPluginConfig;
  private client: PterodactylClient;
  private serverEndpoint: ServerEndpoint;
  private databaseEndpoint: DatabaseEndpoint;
  private backupEndpoint: BackupEndpoint;
  private scheduleEndpoint: ScheduleEndpoint;
  private allocationEndpoint: AllocationEndpoint;
  private userEndpoint: UserEndpoint;
  private consoleSessions: Map<string, WebSocketConsole> = new Map();
  private isInitialized = false;

  constructor(config: IPluginConfig) {
    this.config = config;

    // Initialize HTTP Client
    this.client = new PterodactylClient({
      panelUrl: config.panelUrl,
      apiKey: REDACTED
      timeout: config.timeout || 30,
      retryAttempts: config.retryAttempts || 3
    });

    // Initialize endpoints
    this.serverEndpoint = new ServerEndpoint(this.client);
    this.databaseEndpoint = new DatabaseEndpoint(this.client);
    this.backupEndpoint = new BackupEndpoint(this.client);
    this.scheduleEndpoint = new ScheduleEndpoint(this.client);
    this.allocationEndpoint = new AllocationEndpoint(this.client);
    this.userEndpoint = new UserEndpoint(this.client);

    // Initialize monitoring
    monitoringService.initialize(this.serverEndpoint);

    logger.setDebugMode(config.debugMode || false);
    logger.info('PterodactylPlugin initialized', { apiUrl: config.panelUrl });
  }

  /**
   * Initialize plugin
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test connection
      await this.testConnection();

      // Setup event listeners
      this.setupEventListeners();

      // Start monitoring if enabled
      if (this.config.monitoringEnabled !== false) {
        await monitoringService.start();
      }

      this.isInitialized = true;
      logger.info('PterodactylPlugin ready');
    } catch (error) {
      logger.error('Failed to initialize plugin', { error: String(error) });
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Chat command handler
    world.beforeEvents.chatSend.subscribe((event: ChatSendBeforeEvent) => {
      this.handleChatCommand(event);
    });

    logger.info('Event listeners registered');
  }

  /**
   * Handle chat commands
   */
  private handleChatCommand(event: ChatSendBeforeEvent): void {
    const message = event.message;
    const player = event.sender;

    // Check for bedrockbridge prefix
    if (!message.toLowerCase().startsWith(COMMAND_PREFIX)) {
      return;
    }

    event.cancel = true; // Cancel message sending

    const parts = message.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
    const command = parts[0]?.toLowerCase() || '';
    const args = parts.slice(1);

    this.executeCommand(player, command, args);
  }

  /**
   * Execute command
   */
  private async executeCommand(player: Player, command: string, args: string[]): Promise<void> {
    try {
      switch (command) {
        case 'gui':
        case 'menu':
          await this.showMainMenu(player);
          break;

        case 'servers':
          await this.showServerList(player);
          break;

        case 'server':
          if (args.length > 0) {
            await this.showServerDetails(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'console':
          if (args.length > 0) {
            await this.openConsole(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'start':
          if (args.length > 0) {
            await this.startServer(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'stop':
          if (args.length > 0) {
            await this.stopServer(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'restart':
          if (args.length > 0) {
            await this.restartServer(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'databases':
          if (args.length > 0) {
            await this.showDatabases(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'backups':
          if (args.length > 0) {
            await this.showBackups(player, args[0]);
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'files':
          if (args.length > 0) {
            await this.showFiles(player, args[0], args[1] || '/');
          } else {
            player.sendMessage(`${FormBuilder.formatErrorMessage('Server ID erforderlich')}`);
          }
          break;

        case 'status':
          if (args.length > 0) {
            await this.showServerStatus(player, args[0]);
          } else {
            await this.showAllStatus(player);
          }
          break;

        case 'help':
          this.showHelp(player);
          break;

        case 'info':
          this.showInfo(player);
          break;

        default:
          player.sendMessage(`${FormBuilder.formatErrorMessage(`Unbekannter Befehl: ${command}`)}`);
          this.showHelp(player);
      }
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
      logger.error(`Command error: ${command}`, { error: String(error) });
    }
  }

  /**
   * Show main menu
   */
  private async showMainMenu(player: Player): Promise<void> {
    const form = new PterodactylActionForm(
      `${Icons.SERVER} Pterodactyl Bridge`
    );

    form.setBody('Wähle eine Aktion:');
    form.addButton(`${Icons.SERVER} Server Management`);
    form.addButton(`${Icons.DATABASE} Datenbanken`);
    form.addButton(`${Icons.BACKUP} Sicherungen`);
    form.addButton(`${Icons.FILE} Dateiverwaltung`);
    form.addButton(`${Icons.CHART} Überwachung`);
    form.addButton(`${Icons.SETTINGS} Einstellungen`);
    form.addBackButton('Schließen');

    const selected = await form.show(player);

    switch (selected) {
      case 0:
        await this.showServerList(player);
        break;
      case 1:
        await this.showServerListForDatabases(player);
        break;
      case 2:
        await this.showServerListForBackups(player);
        break;
      case 3:
        await this.showServerListForFiles(player);
        break;
      case 4:
        await this.showMonitoringDashboard(player);
        break;
      case 5:
        this.showSettings(player);
        break;
    }
  }

  /**
   * Show server list
   */
  private async showServerList(player: Player): Promise<void> {
    try {
      const response = await this.serverEndpoint.listServers(1, 25);
      const servers = response.data || [];

      if (servers.length === 0) {
        player.sendMessage(`${FormBuilder.formatInfoMessage('Keine Server gefunden')}`);
        return;
      }

      const form = new PterodactylActionForm(`${Icons.SERVER} Server Management`);
      form.setBody(`Insgesamt ${servers.length} Server`);

      servers.forEach((server: IServer) => {
        const status = server.attributes.status || 'offline';
        const statusIcon = status === 'running' ? Icons.PLAY : Icons.STOP;
        form.addButton(`${statusIcon} ${server.attributes.name}\n${server.attributes.identifier}`);
      });

      form.addBackButton();

      const selected = await form.show(player);

      if (selected >= 0 && selected < servers.length) {
        await this.showServerDetails(player, servers[selected].attributes.identifier);
      }
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show server details
   */
  private async showServerDetails(player: Player, serverId: string): Promise<void> {
    try {
      const server = await this.serverEndpoint.getServer(serverId);
      const resources = await this.serverEndpoint.getResources(serverId);
      const attrs = server.attributes;
      const res = resources.attributes.resources;

      const form = new PterodactylActionForm(attrs.name);

      const body =
        `${Colors.BOLD}Status:${Colors.RESET} ${attrs.status}\n` +
        `${Colors.BOLD}Node:${Colors.RESET} ${attrs.node}\n` +
        FormBuilder.formatResourceInfo(res.cpu_absolute, res.memory_bytes, res.memory_limit_bytes, res.disk_bytes);

      form.setBody(body);
      form.addButton(`${Icons.PLAY} Start`);
      form.addButton(`${Icons.STOP} Stop`);
      form.addButton(`${Icons.RESTART} Neustart`);
      form.addButton(`${Icons.CONSOLE} Konsole`);
      form.addButton(`${Icons.FILE} Dateien`);
      form.addButton(`${Icons.DATABASE} Datenbanken`);
      form.addButton(`${Icons.BACKUP} Sicherungen`);
      form.addBackButton();

      const selected = await form.show(player);

      switch (selected) {
        case 0:
          await this.startServer(player, serverId);
          break;
        case 1:
          await this.stopServer(player, serverId);
          break;
        case 2:
          await this.restartServer(player, serverId);
          break;
        case 3:
          await this.openConsole(player, serverId);
          break;
        case 4:
          await this.showFiles(player, serverId);
          break;
        case 5:
          await this.showDatabases(player, serverId);
          break;
        case 6:
          await this.showBackups(player, serverId);
          break;
      }
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Start server
   */
  private async startServer(player: Player, serverId: string): Promise<void> {
    try {
      const form = FormBuilder.createConfirmDialog(
        'Server starten?',
        'Der Server wird gestartet.'
      );

      const confirmed = await form.show(player);
      if (!confirmed) return;

      player.sendMessage(`${FormBuilder.formatInfoMessage('Server wird gestartet...')}`);
      await this.serverEndpoint.start(serverId);
      player.sendMessage(`${FormBuilder.formatSuccessMessage(SUCCESS_MESSAGES.SERVER_STARTED)}`);

      // Invalidate cache
      this.serverEndpoint.invalidateCache(serverId);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Stop server
   */
  private async stopServer(player: Player, serverId: string): Promise<void> {
    try {
      const form = FormBuilder.createConfirmDialog(
        'Server stoppen?',
        'Der Server wird gestoppt.'
      );

      const confirmed = await form.show(player);
      if (!confirmed) return;

      player.sendMessage(`${FormBuilder.formatInfoMessage('Server wird gestoppt...')}`);
      await this.serverEndpoint.stop(serverId);
      player.sendMessage(`${FormBuilder.formatSuccessMessage(SUCCESS_MESSAGES.SERVER_STOPPED)}`);

      this.serverEndpoint.invalidateCache(serverId);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Restart server
   */
  private async restartServer(player: Player, serverId: string): Promise<void> {
    try {
      const form = FormBuilder.createConfirmDialog(
        'Server neustarten?',
        'Der Server wird neugestartet.'
      );

      const confirmed = await form.show(player);
      if (!confirmed) return;

      player.sendMessage(`${FormBuilder.formatInfoMessage('Server wird neugestartet...')}`);
      await this.serverEndpoint.restart(serverId);
      player.sendMessage(`${FormBuilder.formatSuccessMessage(SUCCESS_MESSAGES.SERVER_RESTARTED)}`);

      this.serverEndpoint.invalidateCache(serverId);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Open console
   */
  private async openConsole(player: Player, serverId: string): Promise<void> {
    try {
      const wsToken = await this.serverEndpoint.getWebSocketToken(serverId);
      const console = new WebSocketConsole(serverId, wsToken.data.token);

      // Setup console handlers
      console.onMessage((msg) => {
        player.sendMessage(`${Colors.DARK_GRAY}${msg.content}${Colors.RESET}`);
      });

      console.onStatus((status) => {
        player.sendMessage(`${Colors.GRAY}Status: ${status}${Colors.RESET}`);
      });

      console.onError((error) => {
        player.sendMessage(`${FormBuilder.formatErrorMessage(error.message)}`);
      });

      // Store console session
      this.consoleSessions.set(player.name, console);

      // Connect to actual WebSocket
      try {
        await console.connect(wsToken.data.socket);
      } catch (wsError) {
        logger.warn('WebSocket connection failed, console in offline mode', { error: String(wsError) });
        player.sendMessage(`${FormBuilder.formatInfoMessage('Konsole im Offline-Modus verbunden')}`);
      }

      player.sendMessage(`${FormBuilder.formatSuccessMessage('Konsole verbunden')}`);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show databases
   */
  private async showDatabases(player: Player, serverId: string): Promise<void> {
    try {
      const response = await this.databaseEndpoint.listDatabases(serverId);
      const databases = response.data || [];

      const form = new PterodactylActionForm(`${Icons.DATABASE} Datenbanken`);
      form.setBody(`Server: ${serverId}\nDatenbanken: ${databases.length}`);

      databases.forEach((db) => {
        form.addButton(`${Icons.DATABASE} ${db.attributes.name}\n${db.attributes.host.address}:${db.attributes.host.port}`);
      });

      form.addBackButton();

      const selected = await form.show(player);

      if (selected >= 0 && selected < databases.length) {
        const db = databases[selected];
        const dbForm = new PterodactylActionForm(db.attributes.name);
        dbForm.setBody(`Host: ${db.attributes.host.address}\nPort: ${db.attributes.host.port}`);
        dbForm.addButton('Passwort erneuern');
        dbForm.addButton('Löschen');
        dbForm.addBackButton();

        const dbSelected = await dbForm.show(player);

        switch (dbSelected) {
          case 0:
            await this.rotateDatabasePassword(player, serverId, db.attributes.id);
            break;
          case 1:
            await this.deleteDatabase(player, serverId, db.attributes.id);
            break;
        }
      }
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show backups
   */
  private async showBackups(player: Player, serverId: string): Promise<void> {
    try {
      const response = await this.backupEndpoint.listBackups(serverId);
      const backups = response.data || [];

      const form = new PterodactylActionForm(`${Icons.BACKUP} Sicherungen`);
      form.setBody(`Server: ${serverId}\nSicherungen: ${backups.length}`);

      if (backups.length === 0) {
        form.addButton('Neue Sicherung erstellen');
      } else {
        backups.slice(0, 5).forEach((backup) => {
          const size = this.backupEndpoint.formatBackupSize(backup.attributes.bytes);
          form.addButton(`${Icons.BACKUP} ${backup.attributes.name}\n${size}`);
        });

        if (backups.length > 5) {
          form.addButton(`${Icons.ARROW_RIGHT} Mehr anzeigen...`);
        }
      }

      form.addButton('Neue Sicherung erstellen');
      form.addBackButton();

      const selected = await form.show(player);

      if (selected === backups.length) {
        await this.createBackup(player, serverId);
      }
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show files
   */
  private async showFiles(player: Player, serverId: string, directory: string = '/'): Promise<void> {
    try {
      const files = await this.serverEndpoint.listFiles(serverId, directory);

      const form = new PterodactylActionForm(`${Icons.FILE} Dateien`);
      form.setBody(`Verzeichnis: ${directory}`);

      files.forEach((file) => {
        const icon = file.attributes.is_file ? Icons.FILE : Icons.FOLDER;
        form.addButton(`${icon} ${file.attributes.name}`);
      });

      form.addBackButton();

      await form.show(player);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show server status
   */
  private async showServerStatus(player: Player, serverId: string): Promise<void> {
    try {
      const resources = await this.serverEndpoint.getResources(serverId);
      const res = resources.attributes;

      const statusText =
        `${Colors.BOLD}Status: ${Colors.RESET}${res.current_state}\n` +
        FormBuilder.formatResourceInfo(
          res.resources.cpu_absolute,
          res.resources.memory_bytes,
          res.resources.memory_limit_bytes,
          res.resources.disk_bytes
        );

      const form = FormBuilder.createAlertDialog('Server Status', statusText);
      await form.show(player);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show all server status
   */
  private async showAllStatus(player: Player): Promise<void> {
    try {
      const response = await this.serverEndpoint.listServers(1, 10);
      const servers = response.data || [];

      let statusText = `${Colors.BOLD}Server Übersicht:${Colors.RESET}\n\n`;

      for (const server of servers.slice(0, 5)) {
        const status = server.attributes.status || 'offline';
        const icon = status === 'running' ? Icons.PLAY : Icons.STOP;
        statusText += `${icon} ${server.attributes.name}: ${Colors.GRAY}${status}${Colors.RESET}\n`;
      }

      if (servers.length > 5) {
        statusText += `\n${Colors.GRAY}... und ${servers.length - 5} weitere${Colors.RESET}`;
      }

      const form = FormBuilder.createAlertDialog('Alle Server', statusText);
      await form.show(player);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Show monitoring dashboard
   */
  private async showMonitoringDashboard(player: Player): Promise<void> {
    const stats = monitoringService.getStats();
    const data = monitoringService.getAllData();

    let dashboardText = `${Colors.BOLD}${Icons.CHART} Überwachungs-Dashboard${Colors.RESET}\n\n`;
    dashboardText += `Status: ${stats.isRunning ? Colors.GREEN + 'Aktiv' : Colors.RED + 'Inaktiv'}${Colors.RESET}\n`;
    dashboardText += `Überwachte Server: ${stats.monitoredServers}\n`;
    dashboardText += `Verlauf: ${stats.historySize}/${stats.maxHistorySize}\n\n`;

    let count = 0;
    for (const [_, serverData] of data) {
      if (count >= 5) break;
      dashboardText += `${Colors.YELLOW}${serverData.serverId}${Colors.RESET}\n`;
      dashboardText += `  CPU: ${serverData.cpu.toFixed(2)}%\n`;
      dashboardText += `  Memory: ${(serverData.memory / 1024 / 1024).toFixed(0)}MB\n`;
      dashboardText += `  State: ${serverData.state}\n\n`;
      count++;
    }

    const form = FormBuilder.createAlertDialog('Dashboard', dashboardText);
    await form.show(player);
  }

  /**
   * Show settings
   */
  private showSettings(player: Player): void {
    const stats = this.client.getStats();

    let settingsText = `${Colors.BOLD}Einstellungen${Colors.RESET}\n\n`;
    settingsText += `Panel URL: ${stats.baseUrl}\n`;
    settingsText += `Timeout: ${stats.timeout}s\n`;
    settingsText += `Requests: ${stats.requestCount}/240\n`;
    settingsText += `Cache: ${stats.cacheSize.entries} Einträge\n`;

    const form = FormBuilder.createAlertDialog('Pterodactyl Bridge', settingsText);
    form.show(player);
  }

  /**
   * Show help
   */
  private showHelp(player: Player): void {
    const help =
      `${Colors.BOLD}${Icons.INFO} Pterodactyl Bridge - Hilfe${Colors.RESET}\n\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} gui${Colors.RESET} - Hauptmenü öffnen\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} servers${Colors.RESET} - Server anzeigen\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} server <id>${Colors.RESET} - Server Details\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} start <id>${Colors.RESET} - Server starten\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} stop <id>${Colors.RESET} - Server stoppen\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} restart <id>${Colors.RESET} - Server neustarten\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} status${Colors.RESET} - Serverstatus\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} help${Colors.RESET} - Diese Hilfe\n` +
      `${Colors.YELLOW}${COMMAND_PREFIX} info${Colors.RESET} - Infos`;

    player.sendMessage(help);
  }

  /**
   * Show info
   */
  private showInfo(player: Player): void {
    const info =
      `${Colors.BOLD}${Icons.INFO} Pterodactyl Bridge - Info${Colors.RESET}\n\n` +
      `Version: 1.0.0\n` +
      `Plugin: Pterodactyl API Integration\n` +
      `Author: Bedrock Bridge Team\n` +
      `Website: https://github.com/bedrock-bridge\n\n` +
      `${Colors.YELLOW}Features:${Colors.RESET}\n` +
      `• Server Management\n` +
      `• Datenbank Verwaltung\n` +
      `• Sicherungen\n` +
      `• Dateiverwaltung\n` +
      `• Real-time Konsole\n` +
      `• Überwachung\n` +
      `• WebSocket Integration`;

    player.sendMessage(info);
  }

  /**
   * Helper methods
   */

  private async showServerListForDatabases(player: Player): Promise<void> {
    const response = await this.serverEndpoint.listServers();
    const servers = response.data || [];

    if (servers.length === 0) {
      player.sendMessage(`${FormBuilder.formatInfoMessage('Keine Server gefunden')}`);
      return;
    }

    const form = new PterodactylActionForm(`${Icons.DATABASE} Datenbanken`);
    servers.forEach((server: IServer) => {
      form.addButton(`${server.attributes.name}\n${server.attributes.identifier}`);
    });
    form.addBackButton();

    const selected = await form.show(player);
    if (selected >= 0 && selected < servers.length) {
      await this.showDatabases(player, servers[selected].attributes.identifier);
    }
  }

  private async showServerListForBackups(player: Player): Promise<void> {
    const response = await this.serverEndpoint.listServers();
    const servers = response.data || [];

    if (servers.length === 0) {
      player.sendMessage(`${FormBuilder.formatInfoMessage('Keine Server gefunden')}`);
      return;
    }

    const form = new PterodactylActionForm(`${Icons.BACKUP} Sicherungen`);
    servers.forEach((server: IServer) => {
      form.addButton(`${server.attributes.name}\n${server.attributes.identifier}`);
    });
    form.addBackButton();

    const selected = await form.show(player);
    if (selected >= 0 && selected < servers.length) {
      await this.showBackups(player, servers[selected].attributes.identifier);
    }
  }

  private async showServerListForFiles(player: Player): Promise<void> {
    const response = await this.serverEndpoint.listServers();
    const servers = response.data || [];

    if (servers.length === 0) {
      player.sendMessage(`${FormBuilder.formatInfoMessage('Keine Server gefunden')}`);
      return;
    }

    const form = new PterodactylActionForm(`${Icons.FILE} Dateien`);
    servers.forEach((server: IServer) => {
      form.addButton(`${server.attributes.name}\n${server.attributes.identifier}`);
    });
    form.addBackButton();

    const selected = await form.show(player);
    if (selected >= 0 && selected < servers.length) {
      await this.showFiles(player, servers[selected].attributes.identifier);
    }
  }

  private async rotateDatabasePassword(player: Player, serverId: string, databaseId: string): Promise<void> {
    const confirmed = await FormBuilder.createConfirmDialog(
      'Passwort erneuern?',
      'Dies wird das Datenbankpasswort ändern.'
    ).show(player);

    if (!confirmed) return;

    try {
      const db = await this.databaseEndpoint.rotateDatabasePassword(serverId, databaseId);
      player.sendMessage(`${FormBuilder.formatSuccessMessage(SUCCESS_MESSAGES.PASSWORD_ROTATED)}`);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  private async deleteDatabase(player: Player, serverId: string, databaseId: string): Promise<void> {
    const confirmed = await FormBuilder.createConfirmDialog(
      'Datenbank löschen?',
      'Dies wird die Datenbank permanent löschen!'
    ).show(player);

    if (!confirmed) return;

    try {
      await this.databaseEndpoint.deleteDatabase(serverId, databaseId);
      player.sendMessage(`${FormBuilder.formatSuccessMessage(SUCCESS_MESSAGES.DATABASE_DELETED)}`);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  private async createBackup(player: Player, serverId: string): Promise<void> {
    const modal = new PterodactylModalForm('Neue Sicherung');
    modal.addTextField('Name', 'Sicherungsname');

    const result = await modal.show(player);

    if (!result) return;

    try {
      player.sendMessage(`${FormBuilder.formatInfoMessage('Sicherung wird erstellt...')}`);
      await this.backupEndpoint.createBackup(serverId, result['Name']);
      player.sendMessage(`${FormBuilder.formatSuccessMessage(SUCCESS_MESSAGES.BACKUP_CREATED)}`);
    } catch (error) {
      const message = errorHandler.getUserFriendlyMessage(error);
      player.sendMessage(`${FormBuilder.formatErrorMessage(message)}`);
    }
  }

  /**
   * Test connection
   */
  private async testConnection(): Promise<void> {
    logger.info('Testing Pterodactyl API connection');
    const servers = await this.serverEndpoint.listServers(1, 1);
    logger.info('Connection test successful', { serverCount: servers.data?.length || 0 });
  }

  /**
   * Shutdown plugin
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down PterodactylPlugin');

    // Stop monitoring
    monitoringService.stop();

    // Close all console sessions
    for (const [_, console] of this.consoleSessions) {
      console.disconnect();
    }

    // Cancel all requests
    this.client.cancelAllRequests('Plugin shutdown');

    // Clear cache
    cacheManager.clear();

    logger.info('PterodactylPlugin shutdown complete');
  }

  /**
   * Get plugin stats
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      clientStats: this.client.getStats(),
      monitoring: monitoringService.getStats(),
      consoleSessions: this.consoleSessions.size,
      cacheSize: cacheManager.getStats()
    };
  }
}

// Export plugin instance
export let pterodactylPlugin: PterodactylPlugin;

// Plugin initialization hook
export async function initializePlugin(config: IPluginConfig): Promise<void> {
  pterodactylPlugin = new PterodactylPlugin(config);
  await pterodactylPlugin.initialize();
}
