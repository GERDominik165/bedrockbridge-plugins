/**
 * PlayerManager - Player management UI
 */

class PlayerManager {
    constructor(managers) {
        this.managers = managers;
    }

    show(player) {
        const stats = this.managers.rank.getStatistics();

        const form = {
            type: 'form',
            title: '§6Player Manager',
            content: `Total Players: ${stats.totalPlayers}\n\nSelect an action:`,
            buttons: [
                { text: '§lSearch Player\n§r§7Find player data' },
                { text: '§lSet Rank\n§r§7Assign rank to player' },
                { text: '§lMute Player\n§r§7Mute a player' },
                { text: '§lCustom Name\n§r§7Set custom name' },
                { text: '§lView Stats\n§r§7View player statistics' },
                { text: '§lBulk Operations\n§r§7Perform bulk actions' },
            ]
        };

        return form;
    }

    showSearchForm(player) {
        const form = {
            type: 'custom_form',
            title: '§6Search Player',
            content: [
                {
                    type: 'input',
                    text: 'Player Name:',
                    placeholder: 'Enter player name'
                }
            ]
        };

        return form;
    }

    showPlayerDetails(player, targetName) {
        const stats = this.managers.playerInfo.getStatistics(targetName);
        const rank = this.managers.rank.getPlayerRank(targetName);
        const clan = this.managers.clanTag.getPlayerClan(targetName);
        const customName = this.managers.customName.getCustomName(targetName);

        const details = [
            `§7Player: §f${targetName}`,
            `§7Rank: ${rank.name}`,
            clan ? `§7Clan: ${clan.name} [${clan.tag}]` : '§7Clan: None',
            customName !== targetName ? `§7Custom Name: ${customName}` : '',
            `§7Messages: ${stats?.messageCount || 0}`,
            `§7Commands: ${stats?.commandCount || 0}`,
        ].filter(l => l).join('\n');

        const form = {
            type: 'form',
            title: `§6Player: ${targetName}`,
            content: details,
            buttons: [
                { text: '§lSet Rank' },
                { text: '§lMute' },
                { text: '§lSet Custom Name' },
                { text: '§lBack' },
            ]
        };

        return form;
    }
}

export default PlayerManager;
