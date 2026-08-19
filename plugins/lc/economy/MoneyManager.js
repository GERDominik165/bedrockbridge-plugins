/**
 * 💰 LANDCLAIM MEGA - Economy System
 * Complete money management for players and territories
 * @version 3.0.0
 */

export class MoneyManager {
    constructor(database) {
        this.db = database;
        this.CONFIG = {
            startBalance: 1000,
            territoryStartBalance: 5000,
            dailyIncome: 100,
            chunkCost: 50,
            memberCost: 200,
            taxRate: 5,
            vaultCapacity: 100000,
            interestRate: 1,
            claimBonus: 500
        };

        // Cache for performance
        this.playerCache = new Map();
        this.territoryCache = new Map();
    }

    /**
     * Initialize player account
     */
    initializePlayerAccount(playerName) {
        if (!this.playerExists(playerName)) {
            const account = {
                playerName: playerName,
                balance: this.CONFIG.startBalance,
                totalEarned: this.CONFIG.startBalance,
                totalSpent: 0,
                lastClaimTime: 0,
                dailyClaimDate: new Date().toDateString(),
                accountCreated: Date.now(),
                transactions: [],
                achievements: []
            };

            this.db.set(`player:${playerName}`, account);
            this.playerCache.set(playerName, account);
            return account;
        }

        return this.getPlayerAccount(playerName);
    }

    /**
     * Initialize territory account
     */
    initializeTerritoryAccount(territoryId) {
        const account = {
            territoryId: territoryId,
            balance: this.CONFIG.territoryStartBalance,
            vault: 0,
            totalIncome: this.CONFIG.territoryStartBalance,
            totalExpenses: 0,
            taxes: 0,
            incomeLog: []
        };

        this.db.set(`territory:${territoryId}`, account);
        this.territoryCache.set(territoryId, account);
        return account;
    }

    /**
     * Get player account
     */
    getPlayerAccount(playerName) {
        if (this.playerCache.has(playerName)) {
            return this.playerCache.get(playerName);
        }

        const account = this.db.get(`player:${playerName}`);
        if (account) {
            this.playerCache.set(playerName, account);
            return account;
        }

        return this.initializePlayerAccount(playerName);
    }

    /**
     * Get territory account
     */
    getTerritoryAccount(territoryId) {
        if (this.territoryCache.has(territoryId)) {
            return this.territoryCache.get(territoryId);
        }

        const account = this.db.get(`territory:${territoryId}`);
        if (account) {
            this.territoryCache.set(territoryId, account);
            return account;
        }

        return this.initializeTerritoryAccount(territoryId);
    }

    /**
     * Check if player exists
     */
    playerExists(playerName) {
        return this.db.has(`player:${playerName}`);
    }

    /**
     * Withdraw money from player
     */
    withdrawPlayerMoney(playerName, amount, reason = "Unknown") {
        const account = this.getPlayerAccount(playerName);
        if (account.balance >= amount) {
            account.balance -= amount;
            account.totalSpent += amount;
            this.addTransaction(playerName, -amount, reason);
            this.db.set(`player:${playerName}`, account);
            this.playerCache.set(playerName, account);
            return true;
        }
        return false;
    }

    /**
     * Deposit money to player
     */
    depositPlayerMoney(playerName, amount, reason = "Unknown") {
        const account = this.getPlayerAccount(playerName);
        account.balance += amount;
        account.totalEarned += amount;
        this.addTransaction(playerName, amount, reason);
        this.db.set(`player:${playerName}`, account);
        this.playerCache.set(playerName, account);
        return true;
    }

    /**
     * Transfer money between players
     */
    transferMoney(fromPlayer, toPlayer, amount) {
        const tax = Math.floor(amount * (this.CONFIG.taxRate / 100));
        const actualAmount = amount - tax;

        if (this.withdrawPlayerMoney(fromPlayer, amount, `Transfer to ${toPlayer}`)) {
            this.depositPlayerMoney(toPlayer, actualAmount, `Transfer from ${fromPlayer}`);
            return true;
        }
        return false;
    }

    /**
     * Withdraw from territory vault
     */
    withdrawTerritoryMoney(territoryId, amount, reason = "Unknown") {
        const account = this.getTerritoryAccount(territoryId);
        if (account.vault >= amount) {
            account.vault -= amount;
            this.logTerritoryIncome(territoryId, -amount, reason);
            this.db.set(`territory:${territoryId}`, account);
            this.territoryCache.set(territoryId, account);
            return true;
        }
        return false;
    }

    /**
     * Deposit to territory vault
     */
    depositTerritoryMoney(territoryId, amount, reason = "Unknown") {
        const account = this.getTerritoryAccount(territoryId);
        const totalVault = account.vault + amount;

        if (totalVault <= this.CONFIG.vaultCapacity) {
            account.vault += amount;
            account.totalIncome += amount;
            this.logTerritoryIncome(territoryId, amount, reason);
            this.db.set(`territory:${territoryId}`, account);
            this.territoryCache.set(territoryId, account);
            return true;
        }
        return false;
    }

    /**
     * Claim daily income
     */
    claimDailyIncome(playerName, territorySize) {
        const account = this.getPlayerAccount(playerName);
        const today = new Date().toDateString();

        if (account.dailyClaimDate !== today) {
            // Base income + size bonus
            const income = this.CONFIG.dailyIncome + (territorySize * 10);
            this.depositPlayerMoney(playerName, income, "Daily income");
            account.dailyClaimDate = today;
            account.lastClaimTime = Date.now();
            this.db.set(`player:${playerName}`, account);
            this.playerCache.set(playerName, account);
            return income;
        }

        return 0;
    }

    /**
     * Add income from source
     */
    addIncomeFromSource(playerName, amount, source) {
        this.depositPlayerMoney(playerName, amount, `Income from ${source}`);
    }

    /**
     * Apply interest to vault
     */
    applyInterest(territoryId) {
        const account = this.getTerritoryAccount(territoryId);
        const interest = Math.floor(account.vault * (this.CONFIG.interestRate / 100));
        if (interest > 0) {
            this.depositTerritoryMoney(territoryId, interest, "Interest");
        }
        return interest;
    }

    /**
     * Calculate claim cost
     */
    calculateClaimCost(radius, memberCount = 0) {
        const chunkCount = radius * radius * 4;
        const baseCost = chunkCount * this.CONFIG.chunkCost;
        const memberCost = memberCount * this.CONFIG.memberCost;
        return baseCost + memberCost;
    }

    /**
     * Calculate expansion cost
     */
    calculateExpansionCost(oldRadius, newRadius) {
        const oldChunks = oldRadius * oldRadius * 4;
        const newChunks = newRadius * newRadius * 4;
        const expansion = newChunks - oldChunks;
        return expansion * this.CONFIG.chunkCost;
    }

    /**
     * Charge for claim creation
     */
    chargeForClaim(playerName, cost, reason = "Claim creation") {
        return this.withdrawPlayerMoney(playerName, cost, reason);
    }

    /**
     * Get player statistics
     */
    getPlayerStats(playerName) {
        const account = this.getPlayerAccount(playerName);
        return {
            playerName: playerName,
            balance: account.balance,
            netWorth: account.totalEarned - account.totalSpent,
            totalEarned: account.totalEarned,
            totalSpent: account.totalSpent,
            transactionCount: account.transactions.length,
            accountAge: Date.now() - account.accountCreated,
            achievements: account.achievements.length
        };
    }

    /**
     * Get territory statistics
     */
    getTerritoryStats(territoryId) {
        const account = this.getTerritoryAccount(territoryId);
        return {
            territoryId: territoryId,
            balance: account.balance,
            vault: account.vault,
            vaultCapacity: this.CONFIG.vaultCapacity,
            totalIncome: account.totalIncome,
            totalExpenses: account.totalExpenses,
            netIncome: account.totalIncome - account.totalExpenses,
            incomeLogCount: account.incomeLog.length
        };
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(playerName, limit = 50) {
        const account = this.getPlayerAccount(playerName);
        return account.transactions.slice(-limit).reverse();
    }

    /**
     * Get economy statistics (server-wide)
     */
    getEconomyStats() {
        // This would need full database iteration
        // For now, return basic stats
        return {
            totalPlayers: this.playerCache.size,
            totalMoney: Array.from(this.playerCache.values())
                .reduce((sum, acc) => sum + acc.balance, 0),
            totalTransactions: Array.from(this.playerCache.values())
                .reduce((sum, acc) => sum + acc.transactions.length, 0)
        };
    }

    /**
     * Get richest players
     */
    getRichestPlayers(limit = 10) {
        const players = Array.from(this.playerCache.values())
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);

        return players.map(p => ({
            playerName: p.playerName,
            balance: p.balance,
            netWorth: p.totalEarned - p.totalSpent
        }));
    }

    /**
     * Add transaction
     */
    addTransaction(playerName, amount, reason) {
        const account = this.getPlayerAccount(playerName);
        account.transactions.push({
            amount: amount,
            reason: reason,
            timestamp: Date.now(),
            balance: account.balance
        });

        // Keep last 1000 transactions
        if (account.transactions.length > 1000) {
            account.transactions.shift();
        }
    }

    /**
     * Log territory income
     */
    logTerritoryIncome(territoryId, amount, reason) {
        const account = this.getTerritoryAccount(territoryId);
        account.incomeLog.push({
            amount: amount,
            reason: reason,
            timestamp: Date.now()
        });

        // Keep last 500 logs
        if (account.incomeLog.length > 500) {
            account.incomeLog.shift();
        }
    }

    /**
     * Clear caches
     */
    clearCaches() {
        this.playerCache.clear();
        this.territoryCache.clear();
    }
}
