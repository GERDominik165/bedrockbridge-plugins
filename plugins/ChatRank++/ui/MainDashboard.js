/**
 * MainDashboard - Main admin UI
 */

class MainDashboard {
    constructor(managers) {
        this.managers = managers;
    }

    show(player) {
        const form = {
            type: 'form',
            title: '§6ChatRank++ Dashboard',
            content: 'Select an option:',
            buttons: [
                { text: '§lRank Manager\n§r§7Manage ranks and assignments' },
                { text: '§lPlayer Manager\n§r§7Manage player data' },
                { text: '§lClan Manager\n§r§7Manage clans' },
                { text: '§lSettings\n§r§7Configure plugin' },
                { text: '§lStatistics\n§r§7View stats and leaderboards' },
                { text: '§lPermissions\n§r§7Manage permissions' },
                { text: '§lFilter Manager\n§r§7Manage word filters' },
                { text: '§lLogs\n§r§7View system logs' },
            ]
        };

        // In real implementation, would use BedrockBridge form API
        return form;
    }

    handleResponse(player, response) {
        if (response === null) return;

        const actions = [
            () => this.showRankManager(player),
            () => this.showPlayerManager(player),
            () => this.showClanManager(player),
            () => this.showSettings(player),
            () => this.showStatistics(player),
            () => this.showPermissions(player),
            () => this.showFilterManager(player),
            () => this.showLogs(player),
        ];

        if (actions[response]) {
            actions[response]();
        }
    }
}

export default MainDashboard;
