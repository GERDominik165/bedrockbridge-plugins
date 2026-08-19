/**
 * Pterodactyl Bedrock Bridge - Advanced Form Builder
 * Erweiterte GUI mit allen Pterodactyl-Funktionen
 */

import { Player } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { Colors, Icons } from '../config/Constants';
import { logger } from '../utils/Logger';

export class AdvancedFormBuilder {
  /**
   * Hauptmenü mit allen Funktionen
   */
  static async showMainMenu(player: Player): Promise<string | null> {
    const form = new ActionFormData();

    form.title(`${Colors.BOLD}${Colors.GOLD}Pterodactyl Bridge${Colors.RESET}`);
    form.body(
      `${Colors.YELLOW}Willkommen auf deinem Pterodactyl-Verwaltungspanel${Colors.RESET}\n\n` +
      `${Colors.GRAY}Wähle eine Option:${Colors.RESET}`
    );

    form.button(`${Icons.SERVER}${Colors.BOLD} Server Management${Colors.RESET}`);
    form.button(`${Icons.DATABASE}${Colors.BOLD} Datenbanken${Colors.RESET}`);
    form.button(`${Icons.BACKUP}${Colors.BOLD} Sicherungen${Colors.RESET}`);
    form.button(`${Icons.FILE}${Colors.BOLD} Dateien${Colors.RESET}`);
    form.button(`${Icons.SCHEDULE}${Colors.BOLD} Zeitpläne${Colors.RESET}`);
    form.button(`${Icons.CHART}${Colors.BOLD} Monitoring${Colors.RESET}`);
    form.button(`${Icons.SETTINGS}${Colors.BOLD} Einstellungen${Colors.RESET}`);
    form.button(`${Icons.INFO}${Colors.BOLD} Infos${Colors.RESET}`);

    try {
      const response = await form.show(player);

      if (response === undefined) {
        return null;
      }

      const options = [
        'servers',
        'databases',
        'backups',
        'files',
        'schedules',
        'monitoring',
        'settings',
        'info'
      ];

      return options[response] || null;
    } catch (error) {
      logger.error('Main menu error', { error: String(error) });
      return null;
    }
  }

  /**
   * Server-Liste mit Pagination
   */
  static async showServerList(player: Player, servers: any[], page: number = 1): Promise<any | null> {
    const itemsPerPage = 8;
    const totalPages = Math.ceil(servers.length / itemsPerPage);
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, servers.length);
    const pageServers = servers.slice(startIdx, endIdx);

    const form = new ActionFormData();

    form.title(
      `${Colors.BOLD}${Icons.SERVER} Server (${page}/${totalPages})${Colors.RESET}`
    );

    form.body(
      `${Colors.GRAY}Insgesamt: ${servers.length} Server${Colors.RESET}\n` +
      `${Colors.GRAY}Seite: ${page}/${totalPages}${Colors.RESET}\n\n`
    );

    // Zeige Server
    pageServers.forEach((server: any) => {
      const status = server.attributes?.status || 'offline';
      const statusColor = status === 'running' ? Colors.GREEN : Colors.RED;
      const statusIcon = status === 'running' ? Icons.PLAY : Icons.STOP;

      form.button(
        `${statusIcon} ${Colors.BOLD}${server.attributes?.name}${Colors.RESET}\n` +
        `${Colors.GRAY}${statusColor}${status}${Colors.RESET} | ID: ${server.attributes?.identifier}`
      );
    });

    // Navigation Buttons
    if (page > 1) {
      form.button(`${Icons.ARROW_LEFT} ${Colors.BOLD}Zurück${Colors.RESET}`);
    }
    if (page < totalPages) {
      form.button(`${Colors.BOLD}Weiter ${Icons.ARROW_RIGHT}${Colors.RESET}`);
    }

    form.button(`${Colors.BOLD}Zurück zum Menü${Colors.RESET}`);

    try {
      const response = await form.show(player);

      if (response === undefined) {
        return null;
      }

      // Prüfe ob Navigation geclickt wurde
      let buttonIdx = response;
      if (page > 1 && response === pageServers.length) {
        // "Zurück" Button geclickt
        return await this.showServerList(player, servers, page - 1);
      }
      if (page < totalPages && response === pageServers.length + (page > 1 ? 1 : 0)) {
        // "Weiter" Button geclickt
        return await this.showServerList(player, servers, page + 1);
      }

      // Prüfe ob Menü geclickt wurde
      if (response >= pageServers.length) {
        return null;
      }

      return pageServers[response];
    } catch (error) {
      logger.error('Server list error', { error: String(error) });
      return null;
    }
  }

  /**
   * Server Details & Aktionen
   */
  static async showServerDetails(
    player: Player,
    server: any,
    resources: any
  ): Promise<string | null> {
    const form = new ActionFormData();

    const name = server.attributes?.name || 'Unknown';
    const status = server.attributes?.status || 'offline';
    const statusColor = status === 'running' ? Colors.GREEN : Colors.RED;

    form.title(`${Colors.BOLD}${name}${Colors.RESET}`);

    // Server Info
    const infoText =
      `${Colors.YELLOW}${Icons.INFO} Server Informationen:${Colors.RESET}\n` +
      `├ Status: ${statusColor}${status}${Colors.RESET}\n` +
      `├ Node: ${Colors.GRAY}${server.attributes?.node}${Colors.RESET}\n` +
      `├ Besitzer: ${Colors.GRAY}${server.attributes?.server_owner}${Colors.RESET}\n\n` +
      `${Colors.YELLOW}${Icons.CHART} Ressourcen:${Colors.RESET}\n`;

    if (resources?.attributes?.resources) {
      const res = resources.attributes.resources;
      infoText.concat(
        `├ CPU: ${Colors.GRAY}${(res.cpu_absolute || 0).toFixed(1)}%${Colors.RESET}\n` +
        `├ RAM: ${Colors.GRAY}${((res.memory_bytes || 0) / 1024 / 1024).toFixed(0)}MB / ${((res.memory_limit_bytes || 0) / 1024 / 1024).toFixed(0)}MB${Colors.RESET}\n` +
        `├ Disk: ${Colors.GRAY}${((res.disk_bytes || 0) / 1024 / 1024 / 1024).toFixed(2)}GB${Colors.RESET}\n` +
        `└ Network: ${Colors.GRAY}RX: ${((res.network?.rx_bytes || 0) / 1024).toFixed(0)}KB | TX: ${((res.network?.tx_bytes || 0) / 1024).toFixed(0)}KB${Colors.RESET}\n`
      );
    }

    form.body(infoText);

    // Power-Buttons
    if (status !== 'running') {
      form.button(`${Icons.PLAY} ${Colors.GREEN}Starten${Colors.RESET}`);
    } else {
      form.button(`${Icons.STOP} ${Colors.RED}Stoppen${Colors.RESET}`);
      form.button(`${Icons.RESTART} ${Colors.YELLOW}Neustarten${Colors.RESET}`);
    }

    // Verwaltungs-Buttons
    form.button(`${Icons.CONSOLE} ${Colors.BOLD}Konsole${Colors.RESET}`);
    form.button(`${Icons.FILE} ${Colors.BOLD}Dateien${Colors.RESET}`);
    form.button(`${Icons.DATABASE} ${Colors.BOLD}Datenbanken${Colors.RESET}`);
    form.button(`${Icons.BACKUP} ${Colors.BOLD}Sicherungen${Colors.RESET}`);
    form.button(`${Icons.SCHEDULE} ${Colors.BOLD}Zeitpläne${Colors.RESET}`);

    form.button(`${Colors.BOLD}Zurück${Colors.RESET}`);

    try {
      const response = await form.show(player);

      if (response === undefined) {
        return null;
      }

      const options = [
        status !== 'running' ? 'start' : 'stop',
        status === 'running' ? 'restart' : null,
        'console',
        'files',
        'databases',
        'backups',
        'schedules'
      ].filter(x => x !== null);

      return options[response] || 'back';
    } catch (error) {
      logger.error('Server details error', { error: String(error) });
      return null;
    }
  }

  /**
   * Bestätigungs-Dialog
   */
  static async showConfirmation(
    player: Player,
    title: string,
    message: string
  ): Promise<boolean> {
    const form = new MessageFormData();

    form.title(title);
    form.body(message);
    form.button1(`${Icons.SUCCESS} ${Colors.GREEN}Bestätigen${Colors.RESET}`);
    form.button2(`${Icons.ERROR} ${Colors.RED}Abbrechen${Colors.RESET}`);

    try {
      const response = await form.show(player);
      return response?.selection === 0;
    } catch (error) {
      logger.error('Confirmation dialog error', { error: String(error) });
      return false;
    }
  }

  /**
   * Eingabe-Dialog
   */
  static async showInputForm(
    player: Player,
    title: string,
    fields: Array<{ name: string; label: string; placeholder?: string }>
  ): Promise<any | null> {
    const form = new ModalFormData();

    form.title(title);

    fields.forEach((field) => {
      form.textField(field.label, field.placeholder || '');
    });

    form.submitButton('Speichern');

    try {
      const response = await form.show(player);

      if (response?.canceled) {
        return null;
      }

      const result: any = {};
      fields.forEach((field, index) => {
        result[field.name] = response?.formValues[index] || '';
      });

      return result;
    } catch (error) {
      logger.error('Input form error', { error: String(error) });
      return null;
    }
  }

  /**
   * Datenbank-Verwaltung
   */
  static async showDatabaseList(player: Player, databases: any[]): Promise<any | null> {
    const form = new ActionFormData();

    form.title(`${Colors.BOLD}${Icons.DATABASE} Datenbanken${Colors.RESET}`);
    form.body(
      `${Colors.GRAY}Insgesamt: ${databases.length} Datenbanken${Colors.RESET}\n\n`
    );

    databases.forEach((db: any) => {
      form.button(
        `${Icons.DATABASE} ${Colors.BOLD}${db.attributes?.name}${Colors.RESET}\n` +
        `${Colors.GRAY}Host: ${db.attributes?.host?.address}:${db.attributes?.host?.port}${Colors.RESET}`
      );
    });

    form.button(`${Colors.BOLD}Neue Datenbank${Colors.RESET}`);
    form.button(`${Colors.BOLD}Zurück${Colors.RESET}`);

    try {
      const response = await form.show(player);

      if (response === undefined) {
        return null;
      }

      if (response === databases.length) {
        return { action: 'create' };
      }
      if (response > databases.length) {
        return null;
      }

      return { action: 'select', database: databases[response] };
    } catch (error) {
      logger.error('Database list error', { error: String(error) });
      return null;
    }
  }

  /**
   * Backup-Verwaltung
   */
  static async showBackupList(player: Player, backups: any[]): Promise<any | null> {
    const form = new ActionFormData();

    form.title(`${Colors.BOLD}${Icons.BACKUP} Sicherungen${Colors.RESET}`);
    form.body(
      `${Colors.GRAY}Insgesamt: ${backups.length} Sicherungen${Colors.RESET}\n\n`
    );

    backups.slice(0, 8).forEach((backup: any) => {
      const size = (backup.attributes?.bytes || 0) / 1024 / 1024;
      const date = new Date(backup.attributes?.created_at).toLocaleDateString('de-DE');

      form.button(
        `${Icons.BACKUP} ${Colors.BOLD}${backup.attributes?.name}${Colors.RESET}\n` +
        `${Colors.GRAY}${size.toFixed(2)}MB | ${date}${Colors.RESET}`
      );
    });

    form.button(`${Colors.BOLD}Neue Sicherung${Colors.RESET}`);
    form.button(`${Colors.BOLD}Zurück${Colors.RESET}`);

    try {
      const response = await form.show(player);

      if (response === undefined) {
        return null;
      }

      if (response === backups.length) {
        return { action: 'create' };
      }
      if (response > backups.length) {
        return null;
      }

      return { action: 'select', backup: backups[response] };
    } catch (error) {
      logger.error('Backup list error', { error: String(error) });
      return null;
    }
  }

  /**
   * Datei-Browser
   */
  static async showFileBrowser(player: Player, files: any[], path: string = '/'): Promise<any | null> {
    const form = new ActionFormData();

    form.title(`${Colors.BOLD}${Icons.FILE} Dateien${Colors.RESET}`);
    form.body(`${Colors.GRAY}Pfad: ${path}${Colors.RESET}\n\n`);

    files.forEach((file: any) => {
      const icon = file.attributes?.is_file ? Icons.FILE : Icons.FOLDER;
      form.button(`${icon} ${file.attributes?.name}`);
    });

    form.button(`${Colors.BOLD}Zurück${Colors.RESET}`);

    try {
      const response = await form.show(player);

      if (response === undefined) {
        return null;
      }

      if (response === files.length) {
        return null;
      }

      return files[response];
    } catch (error) {
      logger.error('File browser error', { error: String(error) });
      return null;
    }
  }

  /**
   * Monitoring Dashboard
   */
  static async showMonitoringDashboard(
    player: Player,
    servers: any[],
    monitoringData: any
  ): Promise<void> {
    const form = new ActionFormData();

    let body = `${Colors.BOLD}${Colors.YELLOW}${Icons.CHART} Überwachungs-Dashboard${Colors.RESET}\n\n`;

    servers.slice(0, 5).forEach((server: any) => {
      const data = monitoringData[server.attributes?.identifier];

      body += `${Colors.YELLOW}${server.attributes?.name}${Colors.RESET}\n`;
      body += `├ Status: ${Colors.GRAY}${server.attributes?.status}${Colors.RESET}\n`;

      if (data) {
        body += `├ CPU: ${Colors.GRAY}${(data.cpu || 0).toFixed(1)}%${Colors.RESET}\n`;
        body += `├ RAM: ${Colors.GRAY}${((data.memory || 0) / 1024 / 1024).toFixed(0)}MB${Colors.RESET}\n`;
        body += `└ Disk: ${Colors.GRAY}${((data.disk || 0) / 1024 / 1024 / 1024).toFixed(2)}GB${Colors.RESET}\n\n`;
      }
    });

    form.title(`${Colors.BOLD}${Icons.CHART} Monitoring${Colors.RESET}`);
    form.body(body);
    form.button(`${Colors.BOLD}Schließen${Colors.RESET}`);

    await form.show(player);
  }

  /**
   * Fehlerhafte Operation
   */
  static async showError(player: Player, title: string, message: string): Promise<void> {
    const form = new MessageFormData();

    form.title(`${Colors.RED}${Icons.ERROR} ${title}${Colors.RESET}`);
    form.body(`${Colors.GRAY}${message}${Colors.RESET}`);
    form.button1(`${Colors.RED}Schließen${Colors.RESET}`);

    try {
      await form.show(player);
    } catch (error) {
      logger.error('Error form failed', { error: String(error) });
    }
  }

  /**
   * Erfolgreiche Operation
   */
  static async showSuccess(player: Player, message: string): Promise<void> {
    const form = new MessageFormData();

    form.title(`${Colors.GREEN}${Icons.SUCCESS} Erfolg${Colors.RESET}`);
    form.body(message);
    form.button1(`${Colors.GREEN}OK${Colors.RESET}`);

    try {
      await form.show(player);
    } catch (error) {
      logger.error('Success form failed', { error: String(error) });
    }
  }

  /**
   * Lade-Bildschirm
   */
  static showLoading(player: Player, message: string = 'Lädt...'): void {
    player.sendMessage(
      `${Colors.YELLOW}⏳ ${message}${Colors.RESET}`
    );
  }

  /**
   * Fortschritt-Nachricht
   */
  static showProgress(player: Player, current: number, total: number, action: string): void {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

    player.sendMessage(
      `${Colors.YELLOW}${action}: ${bar} ${percentage}%${Colors.RESET}`
    );
  }
}

export default AdvancedFormBuilder;
