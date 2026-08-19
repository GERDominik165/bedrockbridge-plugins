/**
 * StatsCommands - Statistics viewing commands
 */

class StatsCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /stats [player]
        bridge.registerCommand('stats', (player, args) => {
            const [targetName] = args;
            const target = targetName || player.name;
            const stats = this.managers.playerInfo.getStatistics(target);

            if (!stats) {
                return player.sendMessage(`§cNo stats found for ${target}`);
            }

            player.sendMessage(`§6=== Stats: ${target} ===`);
            player.sendMessage(`§7Messages: ${stats.messageCount}`);
            player.sendMessage(`§7Commands: ${stats.commandCount}`);
            player.sendMessage(`§7Playtime: ${this.formatTime(stats.totalPlaytime)}`);
            player.sendMessage(`§7First Seen: ${new Date(stats.firstSeen).toLocaleDateString()}`);
        });

        // /leaderboard <stat>
        bridge.registerCommand('leaderboard', (player, args) => {
            const [stat] = args;
            if (!stat) {
                return player.sendMessage('§cUsage: /leaderboard <messages|commands>');
            }

            const leaderboard = this.managers.stats.getLeaderboard(stat, 10);
            player.sendMessage(`§6=== Top ${stat} ===`);
            leaderboard.forEach((entry, index) => {
                player.sendMessage(`§7${index + 1}. ${entry.player}: ${entry.value}`);
            });
        });
    }

    formatTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }
}

module.exports = StatsCommands;
