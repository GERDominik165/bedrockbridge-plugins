/**
 * Pterodactyl Bedrock Bridge - Form Builder
 * Umfassendes GUI-System mit ActionForm, ModalForm und MessageForm
 */
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { Colors, Icons } from '../config/Constants';
import { logger } from '../utils/Logger';
// ==================== ACTION FORM ====================
export class PterodactylActionForm {
    constructor(title) {
        this.body = '';
        this.buttons = [];
        this.title = title;
        this.form = new ActionFormData();
        this.form.title(`${Colors.GOLD}${title}${Colors.RESET}`);
    }
    setBody(body) {
        this.body = body;
        this.form.body(`${Colors.GRAY}${body}${Colors.RESET}`);
        return this;
    }
    addButton(label, icon) {
        this.buttons.push({ label, icon });
        this.form.button(`${Colors.WHITE}${label}${Colors.RESET}`, icon);
        return this;
    }
    addSuccessButton(label = 'Confirm', icon = Icons.SUCCESS) {
        return this.addButton(`${Colors.GREEN}${label}${Colors.RESET}`, icon);
    }
    addDangerButton(label = 'Delete', icon = Icons.TRASH) {
        return this.addButton(`${Colors.RED}${label}${Colors.RESET}`, icon);
    }
    addWarningButton(label = 'Warning', icon = Icons.WARNING) {
        return this.addButton(`${Colors.YELLOW}${label}${Colors.RESET}`, icon);
    }
    addBackButton(label = 'Back') {
        return this.addButton(`${Colors.BLUE}← ${label}${Colors.RESET}`, Icons.ARROW_LEFT);
    }
    async show(player) {
        try {
            logger.debug('Showing action form', { title: this.title, buttonCount: this.buttons.length, player: player.name });
            const response = await this.form.show(player);
            if (response.canceled) {
                logger.debug('Form cancelled by player', { title: this.title, player: player.name });
                return -1;
            }
            return response.selection || -1;
        }
        catch (error) {
            logger.error('Error showing action form', { title: this.title, error: String(error) });
            player.sendMessage(`${Colors.RED}${Icons.ERROR} Fehler beim Anzeigen des Formulars${Colors.RESET}`);
            return -1;
        }
    }
}
// ==================== MODAL FORM ====================
export class PterodactylModalForm {
    constructor(title) {
        this.fields = [];
        this.title = title;
        this.form = new ModalFormData();
        this.form.title(`${Colors.GOLD}${title}${Colors.RESET}`);
    }
    addTextField(label, placeholder = '', defaultValue = '') {
        this.fields.push({ type: 'text', label, placeholder, value: defaultValue });
        this.form.textField(`${Colors.WHITE}${label}${Colors.RESET}`, placeholder, defaultValue);
        return this;
    }
    addNumberField(label, defaultValue = 0) {
        this.fields.push({ type: 'number', label, value: defaultValue });
        this.form.textField(`${Colors.WHITE}${label}${Colors.RESET}`, '0', defaultValue.toString());
        return this;
    }
    addToggle(label, defaultValue = false) {
        this.fields.push({ type: 'toggle', label, value: defaultValue });
        this.form.toggle(`${Colors.WHITE}${label}${Colors.RESET}`, defaultValue);
        return this;
    }
    addDropdown(label, options, defaultIndex = 0) {
        this.fields.push({ type: 'dropdown', label, value: defaultIndex });
        const formattedOptions = options.map(opt => `${Colors.WHITE}${opt}${Colors.RESET}`);
        this.form.dropdown(`${Colors.WHITE}${label}${Colors.RESET}`, formattedOptions, defaultIndex);
        return this;
    }
    async show(player) {
        try {
            logger.debug('Showing modal form', { title: this.title, fieldCount: this.fields.length, player: player.name });
            const response = await this.form.show(player);
            if (response.canceled) {
                logger.debug('Form cancelled by player', { title: this.title, player: player.name });
                return null;
            }
            // Map responses to field labels
            const result = {};
            const formValues = response.formValues || [];
            for (let i = 0; i < this.fields.length; i++) {
                const field = this.fields[i];
                const value = formValues[i];
                // Convert values to appropriate types
                if (field.type === 'number' && typeof value === 'string') {
                    result[field.label] = parseInt(value, 10);
                }
                else if (field.type === 'dropdown' && typeof value === 'number') {
                    result[field.label] = value;
                }
                else {
                    result[field.label] = value;
                }
            }
            return result;
        }
        catch (error) {
            logger.error('Error showing modal form', { title: this.title, error: String(error) });
            player.sendMessage(`${Colors.RED}${Icons.ERROR} Fehler beim Anzeigen des Formulars${Colors.RESET}`);
            return null;
        }
    }
}
// ==================== MESSAGE FORM ====================
export class PterodactylMessageForm {
    constructor(title, body) {
        this.title = title;
        this.body = body;
        this.button1Label = 'OK';
        this.button2Label = 'Abbrechen';
        this.form = new MessageFormData();
        this.form.title(`${Colors.GOLD}${title}${Colors.RESET}`);
        this.form.body(`${Colors.GRAY}${body}${Colors.RESET}`);
    }
    setButton1(label) {
        this.button1Label = label;
        return this;
    }
    setButton2(label) {
        this.button2Label = label;
        return this;
    }
    async show(player) {
        try {
            logger.debug('Showing message form', { title: this.title, player: player.name });
            this.form.button1(`${Colors.GREEN}${this.button1Label}${Colors.RESET}`);
            this.form.button2(`${Colors.RED}${this.button2Label}${Colors.RESET}`);
            const response = await this.form.show(player);
            if (response.canceled) {
                return false;
            }
            return response.selection === 0;
        }
        catch (error) {
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
    static createConfirmDialog(title, message) {
        const form = new PterodactylMessageForm(title, message);
        form.setButton1('Bestätigen');
        form.setButton2('Abbrechen');
        return form;
    }
    /**
     * Create alert dialog
     */
    static createAlertDialog(title, message) {
        const form = new PterodactylMessageForm(title, message);
        form.setButton1('OK');
        form.setButton2('Schließen');
        return form;
    }
    /**
     * Create error dialog
     */
    static createErrorDialog(title, error) {
        const form = new PterodactylMessageForm(`${Colors.RED}${Icons.ERROR} ${title}${Colors.RESET}`, error);
        form.setButton1('Verstanden');
        form.setButton2('Schließen');
        return form;
    }
    /**
     * Create success dialog
     */
    static createSuccessDialog(title, message) {
        const form = new PterodactylMessageForm(`${Colors.GREEN}${Icons.SUCCESS} ${title}${Colors.RESET}`, message);
        form.setButton1('OK');
        form.setButton2('Schließen');
        return form;
    }
    /**
     * Create loading placeholder
     */
    static createLoadingForm(title) {
        return new PterodactylMessageForm(`${Colors.YELLOW}${Icons.CLOCK} ${title}${Colors.RESET}`, 'Bitte warten...');
    }
    /**
     * Format server list
     */
    static formatServerListItem(name, status, identifier) {
        const statusColor = status === 'running' ? Colors.GREEN : Colors.RED;
        return `${Colors.BOLD}${name}${Colors.RESET}\n${statusColor}${status}${Colors.RESET} - ${Colors.GRAY}${identifier}`;
    }
    /**
     * Format resource info
     */
    static formatResourceInfo(cpu, memory, memoryLimit, disk) {
        const memPercent = (memory / memoryLimit) * 100;
        const memColor = memPercent > 80 ? Colors.RED : memPercent > 50 ? Colors.YELLOW : Colors.GREEN;
        return (`${Colors.BOLD}Ressourcen:${Colors.RESET}\n` +
            `CPU: ${Colors.YELLOW}${cpu.toFixed(2)}%${Colors.RESET}\n` +
            `Memory: ${memColor}${(memory / 1024 / 1024).toFixed(0)}MB${Colors.RESET} / ${(memoryLimit / 1024 / 1024).toFixed(0)}MB\n` +
            `Disk: ${Colors.CYAN}${(disk / 1024 / 1024).toFixed(0)}MB${Colors.RESET}`);
    }
    /**
     * Format error message
     */
    static formatErrorMessage(error) {
        return `${Colors.RED}${Icons.ERROR} ${error}${Colors.RESET}`;
    }
    /**
     * Format success message
     */
    static formatSuccessMessage(message) {
        return `${Colors.GREEN}${Icons.SUCCESS} ${message}${Colors.RESET}`;
    }
    /**
     * Format info message
     */
    static formatInfoMessage(message) {
        return `${Colors.BLUE}${Icons.INFO} ${message}${Colors.RESET}`;
    }
    /**
     * Format warning message
     */
    static formatWarningMessage(message) {
        return `${Colors.YELLOW}${Icons.WARNING} ${message}${Colors.RESET}`;
    }
}
//# sourceMappingURL=FormBuilder.js.map