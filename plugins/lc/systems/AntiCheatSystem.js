/**
 * 🚨 LANDCLAIM MEGA v4 - Anti-Cheat System
 * Detect and prevent cheating and exploit abuse
 * @version 4.0.0 - PRODUCTION READY
 */

export class AntiCheatSystem {
    constructor(database) {
        this.database = database;

        // === CHEAT DETECTION RULES ===
        this.rules = {
            // Block placement
            maxBlockPlacePerSecond: 20,
            maxBlockPlacePerMinute: 1000,

            // Block breaking
            maxBlockBreakPerSecond: 20,
            maxBlockBreakPerMinute: 1000,

            // Movement
            maxSpeedBlocks: 50, // blocks per second

            // Combat
            maxHitsPerSecond: 10,
            unrealisticKDA: 10, // Kill/death ratio threshold

            // Economy exploits
            maxMoneyPerHour: 50000,
            suspiciousBigTransactions: 100000,

            // Permission bypass
            maxPermissionChangesPerHour: 50
        };

        // === VIOLATION TRACKING ===
        this.violations = new Map(); // playerName -> violations
        this.playerActivity = new Map(); // playerName -> activity log
        this.suspiciousAccounts = new Set();

        // === STATISTICS ===
        this.stats = {
            totalViolations: 0,
            totalBans: 0,
            detectedCheaters: 0,
            falseFlagRate: 0
        };

        this.loadAntiCheatData();
    }

    /**
     * Load anti-cheat data
     */
    loadAntiCheatData() {
        try {
            const saved = this.database.get("anticheat:system");
            if (saved) {
                this.violations = new Map(saved.violations || []);
                this.suspiciousAccounts = new Set(saved.suspicious || []);
                this.stats = saved.stats || this.stats;
            }
            console.log(`[AntiCheat] Loaded - ${this.violations.size} players under watch`);
        } catch (error) {
            console.error(`[AntiCheat] Load failed: ${error}`);
        }
    }

    /**
     * Save anti-cheat data
     */
    saveAntiCheatData() {
        try {
            this.database.set("anticheat:system", {
                violations: Array.from(this.violations.entries()),
                suspicious: Array.from(this.suspiciousAccounts),
                stats: this.stats,
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[AntiCheat] Save failed: ${error}`);
        }
    }

    /**
     * Initialize player activity tracking
     */
    initializePlayer(playerName) {
        if (!this.violations.has(playerName)) {
            this.violations.set(playerName, {
                playerName: playerName,
                violations: [],
                score: 0,
                flagged: false,
                banDate: null
            });
        }
        if (!this.playerActivity.has(playerName)) {
            this.playerActivity.set(playerName, {
                blockPlacedPerSecond: [],
                blockBrokenPerSecond: [],
                lastPositions: [],
                lastCombatTime: null,
                moneyTransfers: [],
                permissionChanges: []
            });
        }
    }

    /**
     * Report block placement activity
     */
    reportBlockPlacement(playerName) {
        this.initializePlayer(playerName);

        const activity = this.playerActivity.get(playerName);
        const now = Date.now();

        // Track placement rate
        activity.blockPlacedPerSecond.push(now);
        activity.blockPlacedPerSecond = activity.blockPlacedPerSecond
            .filter(t => now - t < 1000); // Keep 1 second window

        if (activity.blockPlacedPerSecond.length > this.rules.maxBlockPlacePerSecond) {
            this.addViolation(playerName, "excessive_block_placement", 10, "Placing blocks too fast");
        }
    }

    /**
     * Report block breaking activity
     */
    reportBlockBreak(playerName) {
        this.initializePlayer(playerName);

        const activity = this.playerActivity.get(playerName);
        const now = Date.now();

        // Track break rate
        activity.blockBrokenPerSecond.push(now);
        activity.blockBrokenPerSecond = activity.blockBrokenPerSecond
            .filter(t => now - t < 1000); // Keep 1 second window

        if (activity.blockBrokenPerSecond.length > this.rules.maxBlockBreakPerSecond) {
            this.addViolation(playerName, "excessive_block_breaking", 15, "Breaking blocks too fast");
        }
    }

    /**
     * Report player movement
     */
    reportMovement(playerName, x, z) {
        this.initializePlayer(playerName);

        const activity = this.playerActivity.get(playerName);
        const now = Date.now();

        if (activity.lastPositions.length > 0) {
            const lastPos = activity.lastPositions[activity.lastPositions.length - 1];
            const distance = Math.sqrt(
                Math.pow(x - lastPos.x, 2) +
                Math.pow(z - lastPos.z, 2)
            );

            // Calculate time elapsed
            const timeDiff = (now - lastPos.time) / 1000; // seconds
            const speed = distance / timeDiff; // blocks per second

            if (speed > this.rules.maxSpeedBlocks) {
                this.addViolation(playerName, "suspicious_movement", 20, `Moving at ${speed.toFixed(1)} blocks/sec`);
            }
        }

        activity.lastPositions.push({ x, z, time: now });
        // Keep only last 10 positions
        if (activity.lastPositions.length > 10) {
            activity.lastPositions.shift();
        }
    }

    /**
     * Report combat activity
     */
    reportCombatHit(playerName) {
        this.initializePlayer(playerName);

        const activity = this.playerActivity.get(playerName);
        const now = Date.now();

        // Track hit rate
        if (!activity.combatHits) {
            activity.combatHits = [];
        }

        activity.combatHits.push(now);
        activity.combatHits = activity.combatHits.filter(t => now - t < 1000);

        if (activity.combatHits.length > this.rules.maxHitsPerSecond) {
            this.addViolation(playerName, "excessive_combat_hits", 15, "Hitting too fast (possible auto-clicker)");
        }

        activity.lastCombatTime = now;
    }

    /**
     * Report suspicious economy activity
     */
    reportMoneyTransaction(playerName, amount) {
        this.initializePlayer(playerName);

        const activity = this.playerActivity.get(playerName);
        const now = Date.now();

        activity.moneyTransfers.push({ amount, time: now });

        // Check hourly limit
        const lastHour = activity.moneyTransfers.filter(t => now - t.time < 3600000);
        const hourlyTotal = lastHour.reduce((sum, t) => sum + t.amount, 0);

        if (hourlyTotal > this.rules.maxMoneyPerHour) {
            this.addViolation(playerName, "money_farming_exploit", 25, `Earned ${hourlyTotal} in 1 hour`);
        }

        if (amount > this.rules.suspiciousBigTransactions) {
            this.addViolation(playerName, "suspicious_large_transaction", 10, `Large transaction: ${amount} coins`);
        }

        // Keep only last hour
        activity.moneyTransfers = lastHour;
    }

    /**
     * Report permission changes
     */
    reportPermissionChange(playerName) {
        this.initializePlayer(playerName);

        const activity = this.playerActivity.get(playerName);
        const now = Date.now();

        if (!activity.permissionChanges) {
            activity.permissionChanges = [];
        }

        activity.permissionChanges.push(now);

        // Check hourly limit
        const lastHour = activity.permissionChanges.filter(t => now - t < 3600000);

        if (lastHour.length > this.rules.maxPermissionChangesPerHour) {
            this.addViolation(playerName, "permission_spam", 20, `${lastHour.length} permission changes in 1 hour`);
        }

        activity.permissionChanges = lastHour;
    }

    /**
     * Add violation
     */
    addViolation(playerName, type, severity, details = "") {
        this.initializePlayer(playerName);

        const violation = this.violations.get(playerName);
        violation.violations.push({
            type: type,
            severity: severity,
            details: details,
            timestamp: Date.now()
        });

        violation.score += severity;
        this.stats.totalViolations++;

        // Auto-flag if score too high
        if (violation.score > 100) {
            violation.flagged = true;
            this.suspiciousAccounts.add(playerName);
        }

        this.saveAntiCheatData();
    }

    /**
     * Get player violation history
     */
    getViolations(playerName) {
        return this.violations.get(playerName) || null;
    }

    /**
     * Clear violations (admin action)
     */
    clearViolations(playerName) {
        const violation = this.violations.get(playerName);
        if (violation) {
            violation.violations = [];
            violation.score = 0;
            violation.flagged = false;
            this.suspiciousAccounts.delete(playerName);
            this.saveAntiCheatData();
            return { success: true };
        }
        return { success: false };
    }

    /**
     * Get anti-cheat statistics
     */
    getStatistics() {
        const flaggedAccounts = Array.from(this.suspiciousAccounts);

        return {
            ...this.stats,
            currentFlaggedAccounts: flaggedAccounts.length,
            flaggedAccountsList: flaggedAccounts,
            highestScorePlayers: Array.from(this.violations.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map(v => ({ player: v.playerName, score: v.score, violations: v.violations.length }))
        };
    }

    /**
     * Generate detailed cheat detection report
     */
    generateReport(playerName) {
        const violations = this.violations.get(playerName);
        if (!violations) {
            return null;
        }

        const groupedViolations = {};
        violations.violations.forEach(v => {
            groupedViolations[v.type] = (groupedViolations[v.type] || 0) + 1;
        });

        return {
            playerName: playerName,
            totalViolations: violations.violations.length,
            totalScore: violations.score,
            isFlagged: violations.flagged,
            violationTypes: groupedViolations,
            recentViolations: violations.violations.slice(-10),
            recommendation: this.getRecommendation(violations.score)
        };
    }

    /**
     * Get recommendation for admin
     */
    getRecommendation(score) {
        if (score < 30) return "No action needed";
        if (score < 60) return "Monitor player";
        if (score < 100) return "Watch closely";
        if (score < 150) return "Consider temporary ban";
        return "Recommend permanent ban";
    }

    /**
     * Check if player should be auto-banned
     */
    shouldAutoBan(playerName) {
        const violations = this.violations.get(playerName);
        if (!violations) return false;

        // Auto-ban if score exceeds 200
        return violations.score > 200;
    }
}
