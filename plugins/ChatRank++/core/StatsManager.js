/**
 * StatsManager - Track player statistics
 */

class StatsManager {
    constructor() {
        this.stats = new Map();
    }

    trackEvent(playerName, event, value = 1) {
        const name = playerName.toLowerCase();
        if (!this.stats.has(name)) {
            this.stats.set(name, {});
        }
        const playerStats = this.stats.get(name);
        playerStats[event] = (playerStats[event] || 0) + value;
    }

    getStats(playerName) {
        return this.stats.get(playerName.toLowerCase()) || {};
    }

    getLeaderboard(event, limit = 10) {
        const entries = [];
        for (const [player, stats] of this.stats.entries()) {
            if (stats[event]) {
                entries.push({ player, value: stats[event] });
            }
        }
        return entries.sort((a, b) => b.value - a.value).slice(0, limit);
    }

    saveToDatabase(db) {
        db.set('statsManager', JSON.stringify(Array.from(this.stats.entries())));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('statsManager') || '[]');
            this.stats = new Map(data);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default StatsManager;
