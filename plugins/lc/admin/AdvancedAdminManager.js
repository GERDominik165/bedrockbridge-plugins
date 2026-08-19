/**
 * 👑 LANDCLAIM MEGA v4 - Advanced Admin Manager
 * Comprehensive admin tools, logging, auditing, and server management
 * @version 4.0.0
 */

import { world, system } from "@minecraft/server";

export class AdvancedAdminManager {
    constructor(claimManager, moneyManager, protectionManager, database) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.protectionManager = protectionManager;
        this.database = database;

        // === ADMIN DATA ===
        this.admins = new Set();
        this.adminLogs = [];
        this.auditTrail = [];
        this.serverLocks = new Map();

        // === CONFIGURATION ===
        this.CONFIG = {
            maxAdminLogs: 10000,
            maxAuditTrail: 50000,
            lockDuration: 3600000, // 1 hour
            autoCleanupInterval: 300000 // 5 minutes
        };

        // === STATISTICS ===
        this.stats = {
            totalAdmins: 0,
            totalClaimsManaged: 0,
            totalMoneyAdjustments: 0,
            totalBans: 0,
            totalWipes: 0
        };

        this.loadAdminData();
        this.initializeAutoCleanup();
        console.log("[AdvancedAdminManager] ✅ Initialized with full audit trail");
    }

    /**
     * Load admin data from database
     */
    loadAdminData() {
        try {
            const data = this.database.get("admin:data");
            if (data) {
                this.admins = new Set(data.admins || []);
                this.adminLogs = data.logs || [];
                this.auditTrail = data.audit || [];
                this.stats = data.stats || this.stats;
                this.stats.totalAdmins = this.admins.size;
            }
        } catch (error) {
            console.warn(`[AdvancedAdminManager] Could not load admin data: ${error}`);
        }
    }

    /**
     * Save admin data
     */
    saveAdminData() {
        try {
            const data = {
                admins: Array.from(this.admins),
                logs: this.adminLogs.slice(-this.CONFIG.maxAdminLogs),
                audit: this.auditTrail.slice(-this.CONFIG.maxAuditTrail),
                stats: this.stats
            };
            this.database.set("admin:data", data);
            return true;
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error saving admin data: ${error}`);
            return false;
        }
    }

    /**
     * Add admin
     */
    addAdmin(playerName, addedBy) {
        try {
            if (this.admins.has(playerName)) {
                return { success: false, error: "Player is already admin" };
            }

            this.admins.add(playerName);
            this.stats.totalAdmins = this.admins.size;

            this.logAction(`admin.add`, addedBy, {
                target: playerName,
                action: "Added admin"
            });

            this.saveAdminData();
            return { success: true, message: `${playerName} is now admin` };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error adding admin: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove admin
     */
    removeAdmin(playerName, removedBy) {
        try {
            if (!this.admins.has(playerName)) {
                return { success: false, error: "Player is not admin" };
            }

            this.admins.delete(playerName);
            this.stats.totalAdmins = this.admins.size;

            this.logAction(`admin.remove`, removedBy, {
                target: playerName,
                action: "Removed admin"
            });

            this.saveAdminData();
            return { success: true, message: `${playerName} is no longer admin` };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error removing admin: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if player is admin
     */
    isAdmin(playerName) {
        return this.admins.has(playerName);
    }

    /**
     * Delete claim (admin override)
     */
    adminDeleteClaim(claimId, adminName) {
        try {
            const territory = this.claimManager.getClaim(claimId);
            if (!territory) {
                return { success: false, error: "Claim not found" };
            }

            const owner = territory.ownerName;

            // Delete and refund
            this.claimManager.deleteClaim(claimId, owner);
            const cost = this.claimManager.calculateClaimCost(territory.radius);
            this.moneyManager.depositPlayerMoney(owner, cost, "Admin claim deletion refund");

            this.stats.totalClaimsManaged++;
            this.logAction(`claim.admin_delete`, adminName, {
                target: claimId,
                owner: owner,
                action: "Deleted claim and refunded"
            });

            return { success: true, message: `Deleted ${territory.name} and refunded ${cost} coins` };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error deleting claim: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Modify player balance (admin)
     */
    adminSetBalance(playerName, newBalance, adminName, reason) {
        try {
            const account = this.moneyManager.getPlayerAccount(playerName);
            const oldBalance = account.balance;

            account.balance = Math.max(0, newBalance);
            this.moneyManager.db.set(`player:${playerName}`, account);

            this.stats.totalMoneyAdjustments++;
            this.logAction(`money.admin_set`, adminName, {
                target: playerName,
                oldBalance: oldBalance,
                newBalance: newBalance,
                reason: reason
            });

            return {
                success: true,
                message: `Set balance from ${oldBalance} to ${newBalance}`,
                account: account
            };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error setting balance: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ban player
     */
    banPlayer(playerName, duration, reason, adminName) {
        try {
            const banEndTime = Date.now() + duration;

            this.database.set(`ban:${playerName}`, {
                playerName: playerName,
                bannedAt: Date.now(),
                unbanAt: banEndTime,
                reason: reason,
                bannedBy: adminName,
                active: true
            });

            this.stats.totalBans++;
            this.logAction(`player.ban`, adminName, {
                target: playerName,
                duration: duration,
                reason: reason
            });

            return { success: true, message: `Banned ${playerName} for ${duration / 60000} minutes` };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error banning player: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unban player
     */
    unbanPlayer(playerName, adminName) {
        try {
            this.database.delete(`ban:${playerName}`);

            this.logAction(`player.unban`, adminName, {
                target: playerName
            });

            return { success: true, message: `Unbanned ${playerName}` };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error unbanning player: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if player is banned
     */
    isBanned(playerName) {
        try {
            const ban = this.database.get(`ban:${playerName}`);
            if (!ban) return false;

            if (Date.now() > ban.unbanAt) {
                this.database.delete(`ban:${playerName}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error checking ban: ${error}`);
            return false;
        }
    }

    /**
     * Wipe all player claims
     */
    wipePlayerClaims(playerName, adminName) {
        try {
            const claims = this.claimManager.getPlayerClaims(playerName);
            let totalRefund = 0;

            for (const claimId of claims) {
                const territory = this.claimManager.getClaim(claimId);
                if (territory) {
                    const cost = this.claimManager.calculateClaimCost(territory.radius);
                    totalRefund += cost;
                    this.claimManager.deleteClaim(claimId, playerName);
                }
            }

            if (totalRefund > 0) {
                this.moneyManager.depositPlayerMoney(playerName, totalRefund, "Claims wiped - refund");
            }

            this.stats.totalWipes++;
            this.logAction(`claim.wipe_all`, adminName, {
                target: playerName,
                claimsWiped: claims.length,
                refund: totalRefund
            });

            return {
                success: true,
                message: `Wiped ${claims.length} claims and refunded ${totalRefund} coins`
            };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error wiping claims: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lock server (prevent new claims)
     */
    lockServer(duration, reason, adminName) {
        try {
            const unlockTime = Date.now() + duration;

            this.serverLocks.set("global", {
                lockedAt: Date.now(),
                unlockedAt: unlockTime,
                reason: reason,
                lockedBy: adminName
            });

            this.logAction(`server.lock`, adminName, {
                duration: duration,
                reason: reason
            });

            return { success: true, message: `Server locked for ${duration / 60000} minutes` };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error locking server: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unlock server
     */
    unlockServer(adminName) {
        try {
            this.serverLocks.delete("global");

            this.logAction(`server.unlock`, adminName, {});

            return { success: true, message: "Server unlocked" };
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error unlocking server: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if server is locked
     */
    isServerLocked() {
        const lock = this.serverLocks.get("global");
        if (!lock) return false;

        if (Date.now() > lock.unlockedAt) {
            this.serverLocks.delete("global");
            return false;
        }

        return true;
    }

    /**
     * Log admin action
     */
    logAction(action, actor, details) {
        try {
            const logEntry = {
                timestamp: Date.now(),
                action: action,
                actor: actor,
                details: details
            };

            this.adminLogs.push(logEntry);
            this.auditTrail.push(logEntry);

            // Keep size reasonable
            if (this.adminLogs.length > this.CONFIG.maxAdminLogs) {
                this.adminLogs.shift();
            }
            if (this.auditTrail.length > this.CONFIG.maxAuditTrail) {
                this.auditTrail.shift();
            }

            console.log(`[Admin] ${actor} - ${action}: ${JSON.stringify(details)}`);
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error logging action: ${error}`);
        }
    }

    /**
     * Get admin logs
     */
    getAdminLogs(limit = 100) {
        return this.adminLogs.slice(-limit).reverse();
    }

    /**
     * Get audit trail
     */
    getAuditTrail(limit = 100) {
        return this.auditTrail.slice(-limit).reverse();
    }

    /**
     * Get global statistics
     */
    getGlobalStatistics() {
        return {
            admins: this.admins.size,
            claimsManaged: this.stats.totalClaimsManaged,
            moneyAdjustments: this.stats.totalMoneyAdjustments,
            bans: this.stats.totalBans,
            wipes: this.stats.totalWipes,
            adminLogsCount: this.adminLogs.length,
            auditTrailCount: this.auditTrail.length
        };
    }

    /**
     * Backup all admin data
     */
    backupAdminData() {
        try {
            const backup = {
                admins: Array.from(this.admins),
                logs: this.adminLogs,
                audit: this.auditTrail,
                stats: this.stats,
                backupTime: Date.now()
            };

            this.database.set("admin:backup:latest", backup);
            console.log("[AdvancedAdminManager] ✅ Admin data backed up");
            return true;
        } catch (error) {
            console.error(`[AdvancedAdminManager] Error backing up data: ${error}`);
            return false;
        }
    }

    /**
     * Initialize auto cleanup
     */
    initializeAutoCleanup() {
        system.runInterval(() => {
            // Cleanup expired bans
            for (const [playerName, ban] of this.database.entries()) {
                if (playerName.startsWith("ban:") && Date.now() > ban.unbanAt) {
                    this.database.delete(playerName);
                }
            }

            // Cleanup expired locks
            for (const [key, lock] of this.serverLocks.entries()) {
                if (Date.now() > lock.unlockedAt) {
                    this.serverLocks.delete(key);
                }
            }

            // Auto-backup every 5 minutes
            this.backupAdminData();
        }, this.CONFIG.autoCleanupInterval / 50);
    }
}
