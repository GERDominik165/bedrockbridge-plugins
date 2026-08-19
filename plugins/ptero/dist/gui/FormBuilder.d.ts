/**
 * Pterodactyl Bedrock Bridge - Form Builder
 * Umfassendes GUI-System mit ActionForm, ModalForm und MessageForm
 */
import { Player } from '@minecraft/server';
export declare class PterodactylActionForm {
    private form;
    private title;
    private body;
    private buttons;
    constructor(title: string);
    setBody(body: string): this;
    addButton(label: string, icon?: string): this;
    addSuccessButton(label?: string, icon?: string): this;
    addDangerButton(label?: string, icon?: string): this;
    addWarningButton(label?: string, icon?: string): this;
    addBackButton(label?: string): this;
    show(player: Player): Promise<number>;
}
export declare class PterodactylModalForm {
    private form;
    private title;
    private fields;
    constructor(title: string);
    addTextField(label: string, placeholder?: string, defaultValue?: string): this;
    addNumberField(label: string, defaultValue?: number): this;
    addToggle(label: string, defaultValue?: boolean): this;
    addDropdown(label: string, options: string[], defaultIndex?: number): this;
    show(player: Player): Promise<any>;
}
export declare class PterodactylMessageForm {
    private form;
    private title;
    private body;
    private button1Label;
    private button2Label;
    constructor(title: string, body: string);
    setButton1(label: string): this;
    setButton2(label: string): this;
    show(player: Player): Promise<boolean>;
}
export declare class FormBuilder {
    /**
     * Create confirmation dialog
     */
    static createConfirmDialog(title: string, message: string): PterodactylMessageForm;
    /**
     * Create alert dialog
     */
    static createAlertDialog(title: string, message: string): PterodactylMessageForm;
    /**
     * Create error dialog
     */
    static createErrorDialog(title: string, error: string): PterodactylMessageForm;
    /**
     * Create success dialog
     */
    static createSuccessDialog(title: string, message: string): PterodactylMessageForm;
    /**
     * Create loading placeholder
     */
    static createLoadingForm(title: string): PterodactylMessageForm;
    /**
     * Format server list
     */
    static formatServerListItem(name: string, status: string, identifier: string): string;
    /**
     * Format resource info
     */
    static formatResourceInfo(cpu: number, memory: number, memoryLimit: number, disk: number): string;
    /**
     * Format error message
     */
    static formatErrorMessage(error: string): string;
    /**
     * Format success message
     */
    static formatSuccessMessage(message: string): string;
    /**
     * Format info message
     */
    static formatInfoMessage(message: string): string;
    /**
     * Format warning message
     */
    static formatWarningMessage(message: string): string;
}
//# sourceMappingURL=FormBuilder.d.ts.map