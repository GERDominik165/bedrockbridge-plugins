declare module '@minecraft/server' {
  export class World {
    sendMessage(message: string): void;
    beforeEvents: {
      chatSend: {
        subscribe(callback: (event: ChatSendBeforeEvent) => void): void;
      };
    };
  }

  export interface ChatSendBeforeEvent {
    message: string;
    sender: Player;
    cancel: boolean;
  }

  export class Player {
    name: string;
    sendMessage(message: string): void;
  }

  export const world: World;
}
