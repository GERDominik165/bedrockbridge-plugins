/**
 * StatsViewer - Statistics viewing UI
 */

class StatsViewer {
    constructor(managers) {
        this.managers = managers;
    }

    show(player) {
        const rankStats = this.managers.rank.getStatistics();
        const topMessages = this.managers.stats.getLeaderboard('messagesSent', 5);

        const content = [
            '§l§6System Statistics§r',
            '',
            `§7Total Ranks: §f${rankStats.totalRanks}`,
            `§7Players with Ranks: §f${rankStats.totalPlayers}`,
            '',
            '§l§6Top Chatters§r',
            ...topMessages.map((e, i) => `§7${i+1}. ${e.player}: §f${e.value}`),
        ].join('\n');

        const form = {
            type: 'form',
            title: '§6Statistics',
            content: content,
            buttons: [
                { text: '§lMessage Leaderboard' },
                { text: '§lCommand Leaderboard' },
                { text: '§lRank Distribution' },
                { text: '§lBack' },
            ]
        };

        return form;
    }
}

module.exports = StatsViewer;
