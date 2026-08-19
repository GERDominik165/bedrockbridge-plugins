/**
 * NameCommands - Custom name management
 */

class NameCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /customname set <player> <name>
        bridge.registerCommand('customname set', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName, ...nameParts] = args;
            const customName = nameParts.join(' ');

            if (!targetName || !customName) {
                return player.sendMessage('§cUsage: /customname set <player> <name>');
            }

            const validation = this.managers.customName.validateCustomName(customName);
            if (!validation.valid) {
                return player.sendMessage('§c' + validation.errors.join(', '));
            }

            this.managers.customName.setCustomName(targetName, customName, player.name);
            player.sendMessage(`§aSet custom name for ${targetName}: ${customName}`);
        });

        // /customname remove <player>
        bridge.registerCommand('customname remove', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName] = args;
            if (!targetName) {
                return player.sendMessage('§cUsage: /customname remove <player>');
            }

            this.managers.customName.removeCustomName(targetName);
            player.sendMessage(`§aRemoved custom name for ${targetName}`);
        });

        // /customname list
        bridge.registerCommand('customname list', (player, args) => {
            const names = this.managers.customName.getAllCustomNames();
            player.sendMessage('§6=== Custom Names ===');
            names.forEach(n => {
                player.sendMessage(`§7${n.original} -> ${n.custom}`);
            });
        });
    }
}

module.exports = NameCommands;
