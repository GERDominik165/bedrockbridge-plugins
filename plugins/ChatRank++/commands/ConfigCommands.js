/**
 * ConfigCommands - Configuration management
 */

class ConfigCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /config set <path> <value>
        bridge.registerCommand('config set', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [path, ...valueParts] = args;
            const value = valueParts.join(' ');

            if (!path || !value) {
                return player.sendMessage('§cUsage: /config set <path> <value>');
            }

            try {
                const parsedValue = JSON.parse(value);
                this.managers.config.set(path, parsedValue);
                player.sendMessage(`§aSet ${path} to ${value}`);
            } catch (error) {
                this.managers.config.set(path, value);
                player.sendMessage(`§aSet ${path} to ${value}`);
            }
        });

        // /config get <path>
        bridge.registerCommand('config get', (player, args) => {
            const [path] = args;
            if (!path) {
                return player.sendMessage('§cUsage: /config get <path>');
            }

            const value = this.managers.config.get(path);
            player.sendMessage(`§7${path}: ${JSON.stringify(value)}`);
        });
    }
}

export default ConfigCommands;
