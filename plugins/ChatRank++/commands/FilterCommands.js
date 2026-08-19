/**
 * FilterCommands - Word filter management
 */

class FilterCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /filter add <word>
        bridge.registerCommand('filter add', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [word] = args;
            if (!word) {
                return player.sendMessage('§cUsage: /filter add <word>');
            }

            this.managers.filter.addBlockedWord(word);
            player.sendMessage(`§aAdded '${word}' to filter`);
        });

        // /filter remove <word>
        bridge.registerCommand('filter remove', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [word] = args;
            if (!word) {
                return player.sendMessage('§cUsage: /filter remove <word>');
            }

            this.managers.filter.removeBlockedWord(word);
            player.sendMessage(`§aRemoved '${word}' from filter`);
        });

        // /filter whitelist <player>
        bridge.registerCommand('filter whitelist', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName] = args;
            if (!targetName) {
                return player.sendMessage('§cUsage: /filter whitelist <player>');
            }

            this.managers.filter.whitelistPlayer(targetName);
            player.sendMessage(`§aWhitelisted ${targetName} from filter`);
        });
    }
}

module.exports = FilterCommands;
