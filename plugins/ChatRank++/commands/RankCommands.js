/**
 * RankCommands - Rank management commands
 */

class RankCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /rank set <player> <rank>
        bridge.registerCommand('rank set', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName, rankId] = args;
            if (!targetName || !rankId) {
                return player.sendMessage('§cUsage: /rank set <player> <rank>');
            }

            if (!this.managers.rank.hasRank(rankId)) {
                return player.sendMessage(`§cRank '${rankId}' does not exist!`);
            }

            this.managers.rank.setPlayerRank(targetName, rankId);
            this.managers.log.info('RANK', `${player.name} set ${targetName}'s rank to ${rankId}`);
            player.sendMessage(`§aSet ${targetName}'s rank to ${rankId}`);
        });

        // /rank remove <player>
        bridge.registerCommand('rank remove', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName] = args;
            if (!targetName) {
                return player.sendMessage('§cUsage: /rank remove <player>');
            }

            this.managers.rank.removePlayerRank(targetName);
            player.sendMessage(`§aRemoved ${targetName}'s rank`);
        });

        // /rank create <id> <name>
        bridge.registerCommand('rank create', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [rankId, ...nameParts] = args;
            const rankName = nameParts.join(' ');

            if (!rankId || !rankName) {
                return player.sendMessage('§cUsage: /rank create <id> <name>');
            }

            this.managers.rank.createRank(rankId, { name: rankName });
            player.sendMessage(`§aCreated rank: ${rankName}`);
        });

        // /rank delete <id>
        bridge.registerCommand('rank delete', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [rankId] = args;
            if (!rankId) {
                return player.sendMessage('§cUsage: /rank delete <id>');
            }

            if (this.managers.rank.deleteRank(rankId)) {
                player.sendMessage(`§aDeleted rank: ${rankId}`);
            } else {
                player.sendMessage(`§cFailed to delete rank: ${rankId}`);
            }
        });

        // /rank list
        bridge.registerCommand('rank list', (player, args) => {
            const ranks = this.managers.rank.getAllRanks();
            player.sendMessage('§6=== Ranks ===');
            ranks.forEach(rank => {
                player.sendMessage(`${rank.prefix} §7(${rank.id}) - Priority: ${rank.priority}`);
            });
        });

        // /rank info <player>
        bridge.registerCommand('rank info', (player, args) => {
            const [targetName] = args;
            const target = targetName || player.name;
            const rank = this.managers.rank.getPlayerRank(target);

            player.sendMessage(`§6=== Rank Info: ${target} ===`);
            player.sendMessage(`§7Rank: ${rank.name}`);
            player.sendMessage(`§7Display: ${rank.prefix}`);
            player.sendMessage(`§7Priority: ${rank.priority}`);
        });
    }
}

export default RankCommands;
