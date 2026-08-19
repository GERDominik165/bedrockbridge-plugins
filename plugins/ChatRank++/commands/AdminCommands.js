/**
 * AdminCommands - General admin commands
 */

class AdminCommands {
    constructor(managers) {
        this.managers = managers;
    }

    register(bridge) {
        // /chatrank reload
        bridge.registerCommand('chatrank reload', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            // Reload all data from database
            Object.values(this.managers).forEach(mgr => {
                if (mgr.loadFromDatabase) {
                    mgr.loadFromDatabase(this.managers.database);
                }
            });

            player.sendMessage('§aChatRank++ reloaded!');
        });

        // /chatrank save
        bridge.registerCommand('chatrank save', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            Object.values(this.managers).forEach(mgr => {
                if (mgr.saveToDatabase) {
                    mgr.saveToDatabase(this.managers.database);
                }
            });

            player.sendMessage('§aData saved successfully!');
        });

        // /chatrank info
        bridge.registerCommand('chatrank info', (player, args) => {
            const stats = this.managers.rank.getStatistics();
            player.sendMessage('§6=== ChatRank++ Info ===');
            player.sendMessage(`§7Version: 2.0.0`);
            player.sendMessage(`§7Total Ranks: ${stats.totalRanks}`);
            player.sendMessage(`§7Players with Ranks: ${stats.totalPlayers}`);
        });

        // /chatrank export
        bridge.registerCommand('chatrank export', (player, args) => {
            if (!this.managers.permission.hasPermission(player.name, 'chatrank.admin')) {
                return player.sendMessage('§cYou do not have permission!');
            }

            const data = this.managers.database.exportData();
            player.sendMessage('§aExported data to console');
            console.log('ChatRank++ Export:', data);
        });
    }
}

export default AdminCommands;
