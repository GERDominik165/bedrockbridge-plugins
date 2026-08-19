/**
 * ⚙️ LANDCLAIM MEGA - Admin Manager
 * Administrative tools for server management and moderation
 * @version 3.0.0
 */

export class AdminManager {
    constructor(claimManager, moneyManager, protectionManager, database) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.protectionManager = protectionManager;
        this.db = database;

        // === ADMIN DATA ===
        this.admins = new Set();
        this.warnings = new Map(); // playerName -> [warnings]
        this.banList = new Set();
        this.auditLog = []; // Admin action history
        this.systemLogs = []; // System event logs

        // === CONFIGURATION ===
        this.CONFIG = {
            warningLimit: 3,
            warningExpireTime: 604800000, // 7 days
            maxAuditLogSize: 1000,
            maxSystemLogSize: 5000,
            tempBanDuration: 3600000 // 1 hour
        };

        this.loadAdminData();
    }

    /**
     * Load admin data from database
     */
    loadAdminData() {
        try {
            const stored = this.db.get("admin:data");
            if (stored) {
                this.admins = new Set(stored.admins || []);
                this.banList = new Set(stored.banList || []);
                if (stored.auditLog) {
                    this.auditLog = stored.auditLog.slice(-this.CONFIG.maxAuditLogSize);
                }
                if (stored.systemLogs) {
                    this.systemLogs = stored.systemLogs.slice(-this.CONFIG.maxSystemLogSize);
                }
                console.log(`[AdminManager] Loaded ${this.admins.size} admins`);
            }
        } catch (error) {
            console.error(`[AdminManager] Error loading admin data: ${error}`);
        }
    }

    /**
     * Save admin data
     */
    saveAdminData() {
        try {
            this.db.set("admin:data", {
                admins: Array.from(this.admins),
                banList: Array.from(this.banList),
                auditLog: this.auditLog,
                systemLogs: this.systemLogs,
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[AdminManager] Error saving admin data: ${error}`);
        }
    }

    /**
     * Check if player is admin
     */
    isAdmin(playerName) {
        return this.admins.has(playerName);
    }

    /**
     * Add admin
     */
    addAdmin(playerName) {
        if (this.admins.has(playerName)) {
            return { success: false, error: "Player is already an admin" };
        }

        this.admins.add(playerName);
        this.logAudit("ADD_ADMIN", { targetPlayer: playerName });
        this.saveAdminData();

        return { success: true };
    }

    /**
     * Remove admin
     */
    removeAdmin(playerName) {
        if (!this.admins.has(playerName)) {
            return { success: false, error: "Player is not an admin" };
        }

        this.admins.delete(playerName);
        this.logAudit("REMOVE_ADMIN", { targetPlayer: playerName });
        this.saveAdminData();

        return { success: true };
    }

    /**
     * Get admin list
     */
    getAdminList() {
        return Array.from(this.admins);
    }

    /**
     * Warn player
     */
    warnPlayer(playerName, reason, adminName) {
        if (!this.warnings.has(playerName)) {
            this.warnings.set(playerName, []);
        }

        const warnings = this.warnings.get(playerName);
        warnings.push({
            reason: reason,
            adminName: adminName,
            timestamp: Date.now()
        });

        this.logAudit("WARN_PLAYER", { targetPlayer: playerName, reason: reason, admin: adminName });

        // Check if should be kicked
        const activeWarnings = warnings.filter(w => Date.now() - w.timestamp < this.CONFIG.warningExpireTime);
        if (activeWarnings.length >= this.CONFIG.warningLimit) {
            return { success: true, shouldKick: true, warnings: activeWarnings.length };
        }

        return { success: true, warnings: activeWarnings.length };
    }

    /**
     * Get player warnings
     */
    getPlayerWarnings(playerName) {
        const warnings = this.warnings.get(playerName) || [];
        return warnings.filter(w => Date.now() - w.timestamp < this.CONFIG.warningExpireTime);
    }

    /**
     * Clear player warnings
     */
    clearPlayerWarnings(playerName, adminName) {
        if (this.warnings.has(playerName)) {
            this.warnings.delete(playerName);
            this.logAudit("CLEAR_WARNINGS", { targetPlayer: playerName, admin: adminName });
            return { success: true };
        }
        return { success: false, error: "Player has no warnings" };
    }

    /**
     * Ban player
     */
    banPlayer(playerName, reason, adminName) {
        if (this.banList.has(playerName)) {
            return { success: false, error: "Player is already banned" };
        }

        this.banList.add(playerName);
        this.logAudit("BAN_PLAYER", { targetPlayer: playerName, reason: reason, admin: adminName });
        this.saveAdminData();

        return { success: true };
    }

    /**
     * Unban player
     */
    unbanPlayer(playerName, adminName) {
        if (!this.banList.has(playerName)) {
            return { success: false, error: "Player is not banned" };
        }

        this.banList.delete(playerName);
        this.logAudit("UNBAN_PLAYER", { targetPlayer: playerName, admin: adminName });
        this.saveAdminData();

        return { success: true };
    }

    /**
     * Check if player is banned
     */
    isBanned(playerName) {
        return this.banList.has(playerName);
    }

    /**
     * Get ban list
     */
    getBanList() {
        return Array.from(this.banList);
    }

    /**
     * Force delete claim
     */
    forceDeleteClaim(claimId, adminName) {
        const territory = this.claimManager.getClaim(claimId);
        if (!territory) {
            return { success: false, error: "Claim not found" };
        }

        const owner = territory.ownerName;
        this.claimManager.deleteClaim(claimId, owner);
        this.logAudit("FORCE_DELETE_CLAIM", { claimId: claimId, owner: owner, admin: adminName });

        return { success: true };
    }

    /**
     * Force add money to player
     */
    addMoneyToPlayer(playerName, amount, reason, adminName) {
        if (!Number.isInteger(amount) || amount < 0) {
            return { success: false, error: "Invalid amount" };
        }

        this.moneyManager.depositPlayerMoney(playerName, amount, `Admin: ${reason}`);
        this.logAudit("ADD_MONEY", { targetPlayer: playerName, amount: amount, reason: reason, admin: adminName });

        return { success: true };
    }

    /**
     * Force remove money from player
     */
    removeMoneyFromPlayer(playerName, amount, reason, adminName) {
        if (!Number.isInteger(amount) || amount < 0) {
            return { success: false, error: "Invalid amount" };
        }

        const success = this.moneyManager.withdrawPlayerMoney(playerName, amount, `Admin: ${reason}`);
        if (success) {
            this.logAudit("REMOVE_MONEY", { targetPlayer: playerName, amount: amount, reason: reason, admin: adminName });
            return { success: true };
        }

        return { success: false, error: "Insufficient balance" };
    }

    /**
     * Reset player economy
     */
    resetPlayerEconomy(playerName, adminName) {
        const startBalance = this.moneyManager.CONFIG.startBalance;
        const account = this.moneyManager.getPlayerAccount(playerName);
        const difference = startBalance - account.balance;

        if (difference > 0) {
            this.moneyManager.depositPlayerMoney(playerName, difference, "Admin economy reset");
        } else {
            this.moneyManager.withdrawPlayerMoney(playerName, Math.abs(difference), "Admin economy reset");
        }

        this.logAudit("RESET_ECONOMY", { targetPlayer: playerName, admin: adminName });

        return { success: true };
    }

    /**
     * Get player violations
     */
    getPlayerViolations(playerName) {
        return this.protectionManager.getPlayerViolations(playerName);
    }

    /**
     * Get claim violations
     */
    getClaimViolations(claimId) {
        const violations = [];
        // Would need to iterate through all violations
        // This is a simplified version
        return violations;
    }

    /**
     * Clear player violations
     */
    clearPlayerViolations(playerName, adminName) {
        this.protectionManager.clearViolations(playerName);
        this.logAudit("CLEAR_VIOLATIONS", { targetPlayer: playerName, admin: adminName });
        return { success: true };
    }

    /**
     * Get global statistics
     */
    getGlobalStatistics() {
        const claimStats = this.claimManager.getStatistics();
        const economyStats = this.moneyManager.getEconomyStats();

        return {
            claims: claimStats.totalClaims,
            chunks: claimStats.totalChunks,
            players: claimStats.uniquePlayers,
            totalMoney: economyStats.totalMoney,
            transactions: economyStats.totalTransactions,
            admins: this.admins.size,
            bannedPlayers: this.banList.size,
            warnings: this.warnings.size
        };
    }

    /**
     * Get system health report
     */
    getSystemHealthReport() {
        const claimStats = this.claimManager.getStatistics();

        return {
            claims: {
                total: claimStats.totalClaims,
                averageSize: claimStats.averageClaimSize,
                indexSize: claimStats.indexSize
            },
            players: {
                unique: claimStats.uniquePlayers,
                warnings: this.warnings.size,
                banned: this.banList.size
            },
            admin: {
                adminCount: this.admins.size,
                auditLogSize: this.auditLog.length,
                systemLogSize: this.systemLogs.length
            }
        };
    }

    /**
     * Log audit action
     */
    logAudit(action, details) {
        this.auditLog.push({
            action: action,
            details: details,
            timestamp: Date.now()
        });

        // Keep max size
        if (this.auditLog.length > this.CONFIG.maxAuditLogSize) {
            this.auditLog.shift();
        }
    }

    /**
     * Log system event
     */
    logSystem(event, details) {
        this.systemLogs.push({
            event: event,
            details: details,
            timestamp: Date.now()
        });

        // Keep max size
        if (this.systemLogs.length > this.CONFIG.maxSystemLogSize) {
            this.systemLogs.shift();
        }
    }

    /**
     * Get audit log
     */
    getAuditLog(limit = 50) {
        return this.auditLog.slice(-limit).reverse();
    }

    /**
     * Get system log
     */
    getSystemLog(limit = 50) {
        return this.systemLogs.slice(-limit).reverse();
    }

    /**
     * Search audit log
     */
    searchAuditLog(actionType, playerName = null) {
        const results = [];

        for (const entry of this.auditLog) {
            if (entry.action !== actionType) continue;
            if (playerName && entry.details.targetPlayer !== playerName) continue;
            results.push(entry);
        }

        return results;
    }

    /**
     * Generate server report
     */
    generateServerReport() {
        const health = this.getSystemHealthReport();
        const stats = this.getGlobalStatistics();

        return {
            timestamp: Date.now(),
            health: health,
            statistics: stats,
            adminActions: this.auditLog.length,
            systemEvents: this.systemLogs.length
        };
    }

    /**
     * Wipe all player data (DANGEROUS)
     */
    wipePlayerData(playerName, adminName) {
        // Remove all claims
        const claims = this.claimManager.getPlayerClaims(playerName);
        for (const claimId of claims) {
            this.claimManager.deleteClaim(claimId, playerName);
        }

        // Reset economy
        this.resetPlayerEconomy(playerName, adminName);

        // Clear warnings
        this.warnings.delete(playerName);

        this.logAudit("WIPE_PLAYER_DATA", { targetPlayer: playerName, admin: adminName });
        this.saveAdminData();

        return { success: true };
    }

    /**
     * Validate server data integrity
     */
    validateServerData() {
        const errors = [];

        // Check all claims have territory accounts
        for (const [claimId, territory] of this.claimManager.claims.entries()) {
            if (!this.db.has(`territory:${claimId}`)) {
                errors.push(`Claim ${claimId} missing territory account`);
            }
        }

        // Check all players have accounts
        // This would require iterating through all claims

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Fix server data integrity issues
     */
    fixServerData(adminName) {
        let fixed = 0;

        // Create missing territory accounts
        for (const [claimId, territory] of this.claimManager.claims.entries()) {
            if (!this.db.has(`territory:${claimId}`)) {
                this.moneyManager.initializeTerritoryAccount(claimId);
                fixed++;
            }
        }

        if (fixed > 0) {
            this.logAudit("FIX_SERVER_DATA", { fixed: fixed, admin: adminName });
            this.saveAdminData();
        }

        return { success: true, fixed: fixed };
    }
}
