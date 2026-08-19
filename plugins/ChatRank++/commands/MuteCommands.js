/**
 * MuteCommands - Player muting commands
 */

class MuteCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /mute <player> [duration] [reason]
        bridge.registerCommand('mute', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.moderate')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName, durationStr, ...reasonParts] = args;
            if (!targetName) {
                return player.sendMessage('§cUsage: /mute <player> [duration] [reason]');
            }

            const duration = durationStr ? this.parseDuration(durationStr) : null;
            const reason = reasonParts.join(' ') || 'No reason provided';

            this.managers.mute.mutePlayer(targetName, reason, duration, player.name);
            player.sendMessage(`§aMuted ${targetName} for ${durationStr || 'permanent'}`);
            this.managers.notification.notifyAdmins(`${player.name} muted ${targetName}`);
        });

        // /unmute <player>
        bridge.registerCommand('unmute', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.moderate')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const [targetName] = args;
            if (!targetName) {
                return player.sendMessage('§cUsage: /unmute <player>');
            }

            if (this.managers.mute.unmutePlayer(targetName, player.name)) {
                player.sendMessage(`§aUnmuted ${targetName}`);
            } else {
                player.sendMessage(`§c${targetName} is not muted`);
            }
        });

        // /mutelist
        bridge.registerCommand('mutelist', (player, args) => {
            const muted = this.managers.mute.getMutedPlayers();
            player.sendMessage('§6=== Muted Players ===');
            muted.forEach(m => {
                const remaining = this.managers.mute.formatTimeRemaining(m.playerName);
                player.sendMessage(`§7${m.playerName} - ${remaining}`);
            });
        });
    }

    parseDuration(str) {
        const match = str.match(/(\d+)([smhd])/);
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return value * multipliers[unit];
    }
}

export default MuteCommands;
