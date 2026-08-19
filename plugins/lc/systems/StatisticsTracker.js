/**
 * 📊 LANDCLAIM MEGA v4 - Statistics Tracker System
 * Comprehensive player and territory statistics
 * @version 4.0.0 - PRODUCTION READY
 */

export class StatisticsTracker {
    constructor(database) {
        this.database = database;

        // === PLAYER STATISTICS ===
        this.playerStats = new Map(); // playerName -> statistics

        // === GLOBAL STATISTICS ===
        this.globalStats = {
            totalClaims: 0,
            totalPlayers: 0,
            totalBlocks: 0,
            totalLogins: 0,
            totalMoneySpent: 0,
            totalMoneyEarned: 0,
            totalCommandsExecuted: 0,
            totalCombats: 0,
            totalDeaths: 0,
            sessionStartTime: Date.now()
        };

        // === LEADERBOARDS ===
        this.leaderboards = {
            richestPlayers: [],
            largestClaims: [],
            mostActivePlayers: [],
            topBuilders: [],
            mostKills: [],
            mostDeaths: []
        };

        this.loadStatistics();
    }

    /**
     * Load statistics from database
     */
    loadStatistics() {
        try {
            const saved = this.database.get("statistics:system");
            if (saved) {
                this.playerStats = new Map(saved.playerStats || []);
                this.globalStats = saved.globalStats || this.globalStats;
                this.leaderboards = saved.leaderboards || this.leaderboards;
            }
            console.log(`[Statistics] Loaded stats for ${this.playerStats.size} players`);
        } catch (error) {
            console.error(`[Statistics] Load failed: ${error}`);
        }
    }

    /**
     * Save statistics
     */
    saveStatistics() {
        try {
            this.database.set("statistics:system", {
                playerStats: Array.from(this.playerStats.entries()),
                globalStats: this.globalStats,
                leaderboards: this.leaderboards,
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[Statistics] Save failed: ${error}`);
        }
    }

    /**
     * Initialize player statistics
     */
    initializePlayer(playerName) {
        if (this.playerStats.has(playerName)) {
            return this.playerStats.get(playerName);
        }

        const playerStats = {
            playerName: playerName,
            joinDate: Date.now(),
            lastLogin: Date.now(),
            loginCount: 0,
            totalPlayTime: 0,
            sessionStartTime: Date.now(),

            // Claim statistics
            claimsOwned: 0,
            totalClaimArea: 0,
            claimsCreated: 0,
            claimsDeleted: 0,

            // Money statistics
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
            largestTransaction: 0,

            // Activity statistics
            commandsExecuted: 0,
            chatMessages: 0,
            blocksBroken: 0,
            blocksPlaced: 0,

            // Combat statistics
            kills: 0,
            deaths: 0,
            combats: 0,
            pvpWins: 0,

            // Social statistics
            friendCount: 0,
            groupMemberships: 0,
            tradesMade: 0,

            // Achievements
            achievements: new Set(),
            badges: [],

            // Daily activity
            dailyActivity: []
        };

        this.playerStats.set(playerName, playerStats);
        this.globalStats.totalPlayers++;
        this.saveStatistics();

        return playerStats;
    }

    /**
     * Record login
     */
    recordLogin(playerName) {
        const stats = this.initializePlayer(playerName);
        stats.lastLogin = Date.now();
        stats.loginCount++;
        stats.sessionStartTime = Date.now();
        this.globalStats.totalLogins++;
        this.saveStatistics();
    }

    /**
     * Record logout (calculate play time)
     */
    recordLogout(playerName) {
        const stats = this.playerStats.get(playerName);
        if (!stats) return;

        const sessionTime = Date.now() - stats.sessionStartTime;
        stats.totalPlayTime += sessionTime;
        this.saveStatistics();
    }

    /**
     * Record block break
     */
    recordBlockBreak(playerName, claimId) {
        const stats = this.initializePlayer(playerName);
        stats.blocksBroken++;
        this.globalStats.totalBlocks++;

        // Daily tracking
        this.recordDailyActivity(playerName, "block_break");
        this.saveStatistics();
    }

    /**
     * Record block place
     */
    recordBlockPlace(playerName, claimId) {
        const stats = this.initializePlayer(playerName);
        stats.blocksPlaced++;
        this.globalStats.totalBlocks++;

        // Daily tracking
        this.recordDailyActivity(playerName, "block_place");
        this.saveStatistics();
    }

    /**
     * Record command execution
     */
    recordCommand(playerName, command) {
        const stats = this.initializePlayer(playerName);
        stats.commandsExecuted++;
        this.globalStats.totalCommandsExecuted++;

        // Daily tracking
        this.recordDailyActivity(playerName, `command_${command}`);
        this.saveStatistics();
    }

    /**
     * Record combat event
     */
    recordCombat(playerName, opponentName, isWin) {
        const stats = this.initializePlayer(playerName);
        stats.combats++;
        if (isWin) {
            stats.pvpWins++;
            stats.kills++;
        } else {
            stats.deaths++;
        }

        this.globalStats.totalCombats++;
        if (!isWin) {
            this.globalStats.totalDeaths++;
        }

        // Daily tracking
        this.recordDailyActivity(playerName, `combat_${isWin ? "win" : "loss"}`);
        this.saveStatistics();
    }

    /**
     * Record money transaction
     */
    recordTransaction(playerName, amount, type = "earn") {
        const stats = this.initializePlayer(playerName);

        if (type === "earn") {
            stats.totalEarned += amount;
            stats.balance += amount;
            this.globalStats.totalMoneyEarned += amount;
        } else if (type === "spend") {
            stats.totalSpent += amount;
            stats.balance -= amount;
            this.globalStats.totalMoneySpent += amount;
        }

        if (amount > stats.largestTransaction) {
            stats.largestTransaction = amount;
        }

        this.saveStatistics();
    }

    /**
     * Record claim creation
     */
    recordClaimCreated(playerName, claimArea) {
        const stats = this.initializePlayer(playerName);
        stats.claimsCreated++;
        stats.claimsOwned++;
        stats.totalClaimArea += claimArea;
        this.globalStats.totalClaims++;

        this.recordDailyActivity(playerName, "claim_created");
        this.saveStatistics();
    }

    /**
     * Record claim deletion
     */
    recordClaimDeleted(playerName, claimArea) {
        const stats = this.playerStats.get(playerName);
        if (!stats) return;

        stats.claimsDeleted++;
        stats.claimsOwned = Math.max(0, stats.claimsOwned - 1);
        stats.totalClaimArea = Math.max(0, stats.totalClaimArea - claimArea);
        this.globalStats.totalClaims = Math.max(0, this.globalStats.totalClaims - 1);

        this.recordDailyActivity(playerName, "claim_deleted");
        this.saveStatistics();
    }

    /**
     * Record daily activity
     */
    recordDailyActivity(playerName, activity) {
        const stats = this.initializePlayer(playerName);
        const today = new Date().toDateString();

        let dailyEntry = stats.dailyActivity.find(d => d.date === today);
        if (!dailyEntry) {
            dailyEntry = { date: today, activities: {} };
            stats.dailyActivity.push(dailyEntry);
        }

        dailyEntry.activities[activity] = (dailyEntry.activities[activity] || 0) + 1;

        // Keep only last 30 days
        if (stats.dailyActivity.length > 30) {
            stats.dailyActivity.shift();
        }
    }

    /**
     * Award achievement
     */
    awardAchievement(playerName, achievement) {
        const stats = this.initializePlayer(playerName);
        if (!stats.achievements.has(achievement)) {
            stats.achievements.add(achievement);
            stats.badges.push({
                achievement: achievement,
                unlockedDate: Date.now()
            });
            this.saveStatistics();
            return true;
        }
        return false;
    }

    /**
     * Get player statistics
     */
    getPlayerStats(playerName) {
        return this.playerStats.get(playerName) || null;
    }

    /**
     * Get global statistics
     */
    getGlobalStats() {
        return this.globalStats;
    }

    /**
     * Update leaderboards
     */
    updateLeaderboards() {
        // Richest players
        this.leaderboards.richestPlayers = Array.from(this.playerStats.values())
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10)
            .map(s => ({ playerName: s.playerName, balance: s.balance }));

        // Largest claims
        this.leaderboards.largestClaims = Array.from(this.playerStats.values())
            .sort((a, b) => b.totalClaimArea - a.totalClaimArea)
            .slice(0, 10)
            .map(s => ({ playerName: s.playerName, area: s.totalClaimArea }));

        // Most active players
        this.leaderboards.mostActivePlayers = Array.from(this.playerStats.values())
            .sort((a, b) => b.commandsExecuted - a.commandsExecuted)
            .slice(0, 10)
            .map(s => ({ playerName: s.playerName, commands: s.commandsExecuted }));

        // Top builders
        this.leaderboards.topBuilders = Array.from(this.playerStats.values())
            .sort((a, b) => (b.blocksPlaced - a.blocksPlaced))
            .slice(0, 10)
            .map(s => ({ playerName: s.playerName, placed: s.blocksPlaced }));

        // Most kills
        this.leaderboards.mostKills = Array.from(this.playerStats.values())
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 10)
            .map(s => ({ playerName: s.playerName, kills: s.kills }));

        // Most deaths
        this.leaderboards.mostDeaths = Array.from(this.playerStats.values())
            .sort((a, b) => b.deaths - a.deaths)
            .slice(0, 10)
            .map(s => ({ playerName: s.playerName, deaths: s.deaths }));

        this.saveStatistics();
    }

    /**
     * Get leaderboards
     */
    getLeaderboards(type = "all") {
        if (type === "all") {
            return this.leaderboards;
        }
        return this.leaderboards[type] || [];
    }

    /**
     * Get player rank
     */
    getPlayerRank(playerName, metric = "balance") {
        let ranking;

        switch (metric) {
            case "balance":
                ranking = Array.from(this.playerStats.values())
                    .sort((a, b) => b.balance - a.balance);
                break;
            case "claims":
                ranking = Array.from(this.playerStats.values())
                    .sort((a, b) => b.totalClaimArea - a.totalClaimArea);
                break;
            case "commands":
                ranking = Array.from(this.playerStats.values())
                    .sort((a, b) => b.commandsExecuted - a.commandsExecuted);
                break;
            case "kills":
                ranking = Array.from(this.playerStats.values())
                    .sort((a, b) => b.kills - a.kills);
                break;
            default:
                return null;
        }

        const rank = ranking.findIndex(s => s.playerName === playerName) + 1;
        return rank > 0 ? rank : null;
    }

    /**
     * Generate statistics report
     */
    generateReport() {
        this.updateLeaderboards();

        return {
            generatedAt: Date.now(),
            global: this.globalStats,
            leaderboards: this.leaderboards,
            totalPlayersTracked: this.playerStats.size,
            topPlayer: this.leaderboards.richestPlayers[0] || null,
            mostActive: this.leaderboards.mostActivePlayers[0] || null
        };
    }
}
