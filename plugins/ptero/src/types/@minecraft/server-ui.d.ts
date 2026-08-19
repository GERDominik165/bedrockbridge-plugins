declare module '@minecraft/server-ui' {
  import { Player } from '@minecraft/server';

  export class ActionFormData {
    title(titleText: string): ActionFormData;
    body(bodyText: string): ActionFormData;
    button(text: string, iconPath?: string): ActionFormData;
    show(player: Player): Promise<ActionFormResponse>;
  }

  export interface ActionFormResponse {
    selection?: number;
    canceled: boolean;
  }

  export class ModalFormData {
    title(titleText: string): ModalFormData;
    textField(label: string, placeholder: string, defaultValue?: string): ModalFormData;
    dropdown(label: string, options: string[], defaultValueIndex?: number): ModalFormData;
    slider(label: string, minimumValue: number, maximumValue: number, valueStep: number, defaultValue?: number): ModalFormData;
    toggle(label: string, defaultValue?: boolean): ModalFormData;
    show(player: Player): Promise<ModalFormResponse>;
  }

  export interface ModalFormResponse {
    formValues?: any[];
    canceled: boolean;
  }

  export class MessageFormData {
    title(titleText: string): MessageFormData;
    body(bodyText: string): MessageFormData;
    button1(text: string): MessageFormData;
    button2(text: string): MessageFormData;
    show(player: Player): Promise<MessageFormResponse>;
  }

  export interface MessageFormResponse {
    selection?: number;
    canceled: boolean;
  }

  export type FormResponse = ActionFormResponse | ModalFormResponse | MessageFormResponse;
}
