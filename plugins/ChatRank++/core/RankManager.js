/**
 * RankManager - Enhanced rank management system
 * Handles rank creation, assignment, and display formatting
 */

class RankManager {
    constructor() {
        this.ranks = new Map();
        this.playerRanks = new Map();
        this.defaultRank = 'member';
        this.rankPriority = new Map();
        this.initializeDefaultRanks();
    }

    /**
     * Initialize default rank system
     */
    initializeDefaultRanks() {
        // Default ranks with priority (higher = more important)
        const defaultRanks = [
            { id: 'owner', name: 'Owner', prefix: '§4§l[OWNER]§r', suffix: '', color: '§4', priority: 1000, permissions: ['*'] },
            { id: 'admin', name: 'Admin', prefix: '§c§l[ADMIN]§r', suffix: '', color: '§c', priority: 900, permissions: ['chatrank.*', 'admin.*'] },
            { id: 'moderator', name: 'Moderator', prefix: '§6§l[MOD]§r', suffix: '', color: '§6', priority: 800, permissions: ['chatrank.moderate', 'chatrank.mute'] },
            { id: 'helper', name: 'Helper', prefix: '§3§l[HELPER]§r', suffix: '', color: '§3', priority: 700, permissions: ['chatrank.help'] },
            { id: 'vip+', name: 'VIP+', prefix: '§a§l[VIP+]§r', suffix: ' §a§l⭐§r', color: '§a', priority: 600, permissions: ['chatrank.vip.plus'] },
            { id: 'vip', name: 'VIP', prefix: '§a[VIP]§r', suffix: '', color: '§a', priority: 500, permissions: ['chatrank.vip'] },
            { id: 'premium', name: 'Premium', prefix: '§e[PREMIUM]§r', suffix: '', color: '§e', priority: 400, permissions: ['chatrank.premium'] },
            { id: 'member', name: 'Member', prefix: '§7[MEMBER]§r', suffix: '', color: '§7', priority: 100, permissions: ['chatrank.basic'] },
            { id: 'newbie', name: 'Newbie', prefix: '§8[NEWBIE]§r', suffix: '', color: '§8', priority: 50, permissions: ['chatrank.newbie'] }
        ];

        defaultRanks.forEach(rank => this.createRank(rank.id, rank));
    }

    /**
     * Create a new rank
     */
    createRank(rankId, rankData) {
        this.ranks.set(rankId, {
            id: rankId,
            name: rankData.name || rankId,
            prefix: rankData.prefix || '',
            suffix: rankData.suffix || '',
            color: rankData.color || '§7',
            priority: rankData.priority || 0,
            permissions: rankData.permissions || [],
            metadata: rankData.metadata || {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        this.rankPriority.set(rankId, rankData.priority || 0);
        return this.ranks.get(rankId);
    }

    /**
     * Update existing rank
     */
    updateRank(rankId, updates) {
        const rank = this.ranks.get(rankId);
        if (!rank) return false;

        Object.assign(rank, updates, { updatedAt: Date.now() });
        if (updates.priority !== undefined) {
            this.rankPriority.set(rankId, updates.priority);
        }
        return true;
    }

    /**
     * Delete a rank
     */
    deleteRank(rankId) {
        if (rankId === this.defaultRank) return false;
        this.ranks.delete(rankId);
        this.rankPriority.delete(rankId);
        // Remove rank from all players
        for (const [player, rank] of this.playerRanks.entries()) {
            if (rank === rankId) {
                this.playerRanks.set(player, this.defaultRank);
            }
        }
        return true;
    }

    /**
     * Set player rank
     */
    setPlayerRank(playerName, rankId) {
        if (!this.ranks.has(rankId)) return false;
        this.playerRanks.set(playerName.toLowerCase(), rankId);
        return true;
    }

    /**
     * Get player rank
     */
    getPlayerRank(playerName) {
        const rankId = this.playerRanks.get(playerName.toLowerCase()) || this.defaultRank;
        return this.ranks.get(rankId);
    }

    /**
     * Get player rank ID
     */
    getPlayerRankId(playerName) {
        return this.playerRanks.get(playerName.toLowerCase()) || this.defaultRank;
    }

    /**
     * Remove player rank
     */
    removePlayerRank(playerName) {
        this.playerRanks.set(playerName.toLowerCase(), this.defaultRank);
        return true;
    }

    /**
     * Get all ranks sorted by priority
     */
    getAllRanks() {
        return Array.from(this.ranks.values()).sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get rank by ID
     */
    getRank(rankId) {
        return this.ranks.get(rankId);
    }

    /**
     * Check if rank exists
     */
    hasRank(rankId) {
        return this.ranks.has(rankId);
    }

    /**
     * Get rank display string
     */
    getRankDisplay(rankId) {
        const rank = this.ranks.get(rankId);
        if (!rank) return '';
        return `${rank.prefix} §r`;
    }

    /**
     * Get player display name with rank
     */
    getPlayerDisplayName(playerName) {
        const rank = this.getPlayerRank(playerName);
        return `${rank.prefix} §r${rank.color}${playerName}§r${rank.suffix}`;
    }

    /**
     * Check if player has permission through rank
     */
    hasPermission(playerName, permission) {
        const rank = this.getPlayerRank(playerName);
        if (!rank) return false;

        // Check for wildcard permission
        if (rank.permissions.includes('*')) return true;

        // Check exact permission
        if (rank.permissions.includes(permission)) return true;

        // Check wildcard patterns (e.g., chatrank.*)
        return rank.permissions.some(perm => {
            if (perm.endsWith('.*')) {
                const prefix = perm.slice(0, -2);
                return permission.startsWith(prefix);
            }
            return false;
        });
    }

    /**
     * Import ranks from JSON
     */
    importRanks(ranksData) {
        try {
            const imported = JSON.parse(ranksData);
            let count = 0;
            for (const [rankId, rankData] of Object.entries(imported)) {
                this.createRank(rankId, rankData);
                count++;
            }
            return { success: true, count };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Export ranks to JSON
     */
    exportRanks() {
        const ranks = {};
        for (const [rankId, rankData] of this.ranks.entries()) {
            ranks[rankId] = rankData;
        }
        return JSON.stringify(ranks, null, 2);
    }

    /**
     * Get rank statistics
     */
    getStatistics() {
        const stats = {
            totalRanks: this.ranks.size,
            totalPlayers: this.playerRanks.size,
            rankDistribution: {}
        };

        for (const rankId of this.playerRanks.values()) {
            stats.rankDistribution[rankId] = (stats.rankDistribution[rankId] || 0) + 1;
        }

        return stats;
    }

    /**
     * Save data to database
     */
    saveToDatabase(db) {
        const data = {
            ranks: Array.from(this.ranks.entries()),
            playerRanks: Array.from(this.playerRanks.entries()),
            defaultRank: this.defaultRank
        };
        db.set('rankManager', JSON.stringify(data));
    }

    /**
     * Load data from database
     */
    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('rankManager') || '{}');
            if (data.ranks) {
                this.ranks = new Map(data.ranks);
            }
            if (data.playerRanks) {
                this.playerRanks = new Map(data.playerRanks);
            }
            if (data.defaultRank) {
                this.defaultRank = data.defaultRank;
            }
            return true;
        } catch (error) {
            console.error('Failed to load rank data:', error);
            return false;
        }
    }
}

module.exports = RankManager;
