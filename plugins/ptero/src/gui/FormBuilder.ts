/**
 * Pterodactyl Bedrock Bridge - Form Builder
 * Umfassendes GUI-System mit ActionForm, ModalForm und MessageForm
 */

import { Player } from '@minecraft/server';
import {
  ActionFormData,
  ModalFormData,
  MessageFormData,
  FormResponse
} from '@minecraft/server-ui';
import { Colors, Icons } from '../config/Constants';
import { logger } from '../utils/Logger';

// ==================== ACTION FORM ====================

export class PterodactylActionForm {
  private form: ActionFormData;
  private title: string;
  private body: string = '';
  private buttons: Array<{ label: string; icon?: string }> = [];

  constructor(title: string) {
    this.title = title;
    this.form = new ActionFormData();
    this.form.title(`${Colors.GOLD}${title}${Colors.RESET}`);
  }

  setBody(body: string): this {
    this.body = body;
    this.form.body(`${Colors.GRAY}${body}${Colors.RESET}`);
    return this;
  }

  addButton(label: string, icon?: string): this {
    this.buttons.push({ label, icon });
    this.form.button(`${Colors.WHITE}${label}${Colors.RESET}`, icon);
    return this;
  }

  addSuccessButton(label: string = 'Confirm', icon: string = Icons.SUCCESS): this {
    return this.addButton(`${Colors.GREEN}${label}${Colors.RESET}`, icon);
  }

  addDangerButton(label: string = 'Delete', icon: string = Icons.TRASH): this {
    return this.addButton(`${Colors.RED}${label}${Colors.RESET}`, icon);
  }

  addWarningButton(label: string = 'Warning', icon: string = Icons.WARNING): this {
    return this.addButton(`${Colors.YELLOW}${label}${Colors.RESET}`, icon);
  }

  addBackButton(label: string = 'Back'): this {
    return this.addButton(`${Colors.BLUE}← ${label}${Colors.RESET}`, Icons.ARROW_LEFT);
  }

  async show(player: Player): Promise<number> {
    try {
      logger.debug('Showing action form', { title: this.title, buttonCount: this.buttons.length, player: player.name });
      const response = await this.form.show(player);

      if (response.canceled) {
        logger.debug('Form cancelled by player', { title: this.title, player: player.name });
        return -1;
      }

      return response.selection || -1;
    } catch (error) {
      logger.error('Error showing action form', { title: this.title, error: String(error) });
      player.sendMessage(`${Colors.RED}${Icons.ERROR} Fehler beim Anzeigen des Formulars${Colors.RESET}`);
      return -1;
    }
  }
}

// ==================== MODAL FORM ====================

export class PterodactylModalForm {
  private form: ModalFormData;
  private title: string;
  private fields: Array<{ type: string; label: string; placeholder?: string; value?: any }> = [];

  constructor(title: string) {
    this.title = title;
    this.form = new ModalFormData();
    this.form.title(`${Colors.GOLD}${title}${Colors.RESET}`);
  }

  addTextField(label: string, placeholder: string = '', defaultValue: string = ''): this {
    this.fields.push({ type: 'text', label, placeholder, value: defaultValue });
    this.form.textField(`${Colors.WHITE}${label}${Colors.RESET}`, placeholder, defaultValue);
    return this;
  }

  addNumberField(label: string, defaultValue: number = 0): this {
    this.fields.push({ type: 'number', label, value: defaultValue });
    this.form.textField(`${Colors.WHITE}${label}${Colors.RESET}`, '0', defaultValue.toString());
    return this;
  }

  addToggle(label: string, defaultValue: boolean = false): this {
    this.fields.push({ type: 'toggle', label, value: defaultValue });
    this.form.toggle(`${Colors.WHITE}${label}${Colors.RESET}`, defaultValue);
    return this;
  }

  addDropdown(label: string, options: string[], defaultIndex: number = 0): this {
    this.fields.push({ type: 'dropdown', label, value: defaultIndex });
    const formattedOptions = options.map(opt => `${Colors.WHITE}${opt}${Colors.RESET}`);
    this.form.dropdown(`${Colors.WHITE}${label}${Colors.RESET}`, formattedOptions, defaultIndex);
    return this;
  }

  async show(player: Player): Promise<any> {
    try {
      logger.debug('Showing modal form', { title: this.title, fieldCount: this.fields.length, player: player.name });
      const response = await this.form.show(player);

      if (response.canceled) {
        logger.debug('Form cancelled by player', { title: this.title, player: player.name });
        return null;
      }

      // Map responses to field labels
      const result: any = {};
      const formValues = response.formValues || [];

      for (let i = 0; i < this.fields.length; i++) {
        const field = this.fields[i];
        const value = formValues[i];

        // Convert values to appropriate types
        if (field.type === 'number' && typeof value === 'string') {
          result[field.label] = parseInt(value, 10);
        } else if (field.type === 'dropdown' && typeof value === 'number') {
          result[field.label] = value;
        } else {
          result[field.label] = value;
        }
      }

      return result;
    } catch (error) {
      logger.error('Error showing modal form', { title: this.title, error: String(error) });
      player.sendMessage(`${Colors.RED}${Icons.ERROR} Fehler beim Anzeigen des Formulars${Colors.RESET}`);
      return null;
    }
  }
}

// ==================== MESSAGE FORM ====================

export class PterodactylMessageForm {
  private form: MessageFormData;
  private title: string;
  private body: string;
  private button1Label: string;
  private button2Label: string;

  constructor(title: string, body: string) {
    this.title = title;
    this.body = body;
    this.button1Label = 'OK';
    this.button2Label = 'Abbrechen';
    this.form = new MessageFormData();
    this.form.title(`${Colors.GOLD}${title}${Colors.RESET}`);
    this.form.body(`${Colors.GRAY}${body}${Colors.RESET}`);
  }

  setButton1(label: string): this {
    this.button1Label = label;
    return this;
  }

  setButton2(label: string): this {
    this.button2Label = label;
    return this;
  }

  async show(player: Player): Promise<boolean> {
    try {
      logger.debug('Showing message form', { title: this.title, player: player.name });
      this.form.button1(`${Colors.GREEN}${this.button1Label}${Colors.RESET}`);
      this.form.button2(`${Colors.RED}${this.button2Label}${Colors.RESET}`);

      const response = await this.form.show(player);

      if (response.canceled) {
        return false;
      }

      return response.selection === 0;
    } catch (error) {
      logger.error('Error showing message form', { title: this.title, error: String(error) });
      player.sendMessage(`${Colors.RED}${Icons.ERROR} Fehler beim Anzeigen der Nachricht${Colors.RESET}`);
      return false;
    }
  }
}

// ==================== FORM BUILDER HELPER ====================

export class FormBuilder {
  /**
   * Create confirmation dialog
   */
  static createConfirmDialog(title: string, message: string): PterodactylMessageForm {
    const form = new PterodactylMessageForm(title, message);
    form.setButton1('Bestätigen');
    form.setButton2('Abbrechen');
    return form;
  }

  /**
   * Create alert dialog
   */
  static createAlertDialog(title: string, message: string): PterodactylMessageForm {
    const form = new PterodactylMessageForm(title, message);
    form.setButton1('OK');
    form.setButton2('Schließen');
    return form;
  }

  /**
   * Create error dialog
   */
  static createErrorDialog(title: string, error: string): PterodactylMessageForm {
    const form = new PterodactylMessageForm(
      `${Colors.RED}${Icons.ERROR} ${title}${Colors.RESET}`,
      error
    );
    form.setButton1('Verstanden');
    form.setButton2('Schließen');
    return form;
  }

  /**
   * Create success dialog
   */
  static createSuccessDialog(title: string, message: string): PterodactylMessageForm {
    const form = new PterodactylMessageForm(
      `${Colors.GREEN}${Icons.SUCCESS} ${title}${Colors.RESET}`,
      message
    );
    form.setButton1('OK');
    form.setButton2('Schließen');
    return form;
  }

  /**
   * Create loading placeholder
   */
  static createLoadingForm(title: string): PterodactylMessageForm {
    return new PterodactylMessageForm(
      `${Colors.YELLOW}${Icons.CLOCK} ${title}${Colors.RESET}`,
      'Bitte warten...'
    );
  }

  /**
   * Format server list
   */
  static formatServerListItem(name: string, status: string, identifier: string): string {
    const statusColor = status === 'running' ? Colors.GREEN : Colors.RED;
    return `${Colors.BOLD}${name}${Colors.RESET}\n${statusColor}${status}${Colors.RESET} - ${Colors.GRAY}${identifier}`;
  }

  /**
   * Format resource info
   */
  static formatResourceInfo(cpu: number, memory: number, memoryLimit: number, disk: number): string {
    const memPercent = (memory / memoryLimit) * 100;
    const memColor = memPercent > 80 ? Colors.RED : memPercent > 50 ? Colors.YELLOW : Colors.GREEN;

    return (
      `${Colors.BOLD}Ressourcen:${Colors.RESET}\n` +
      `CPU: ${Colors.YELLOW}${cpu.toFixed(2)}%${Colors.RESET}\n` +
      `Memory: ${memColor}${(memory / 1024 / 1024).toFixed(0)}MB${Colors.RESET} / ${(memoryLimit / 1024 / 1024).toFixed(0)}MB\n` +
      `Disk: ${Colors.CYAN}${(disk / 1024 / 1024).toFixed(0)}MB${Colors.RESET}`
    );
  }

  /**
   * Format error message
   */
  static formatErrorMessage(error: string): string {
    return `${Colors.RED}${Icons.ERROR} ${error}${Colors.RESET}`;
  }

  /**
   * Format success message
   */
  static formatSuccessMessage(message: string): string {
    return `${Colors.GREEN}${Icons.SUCCESS} ${message}${Colors.RESET}`;
  }

  /**
   * Format info message
   */
  static formatInfoMessage(message: string): string {
    return `${Colors.BLUE}${Icons.INFO} ${message}${Colors.RESET}`;
  }

  /**
   * Format warning message
   */
  static formatWarningMessage(message: string): string {
    return `${Colors.YELLOW}${Icons.WARNING} ${message}${Colors.RESET}`;
  }
}
