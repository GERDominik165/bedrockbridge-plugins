/**
 * ⚔️ LANDCLAIM MEGA v4 - Territory Warfare System
 * Siege mechanics and territorial conquest system
 * @version 4.0.0 - PRODUCTION READY
 */

export class TerritoryWarfareSystem {
    constructor(claimManager, moneyManager, database, eventSystem) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.database = database;
        this.eventSystem = eventSystem;

        // === SIEGE SYSTEM ===
        this.sieges = new Map(); // claimId -> siege
        this.warfareHistory = [];

        // === CONFIGURATION ===
        this.config = {
            minSiegeLeaders: 3,          // Min players to start siege
            siegeDuration: 7 * 86400000, // 7 days
            healthPerBomb: 5,            // Damage per TNT
            healthPerPlayer: 50,         // Base health per claim size
            maxDefenseLvl: 5,
            costToStartSiege: 5000,      // coins
            costPerAttackDay: 1000       // coins per day
        };

        // === STATISTICS ===
        this.stats = {
            totalSieges: 0,
            totalSiegeVictories: 0,
            totalSiegeDefenses: 0,
            totalTerritoriesCaptured: 0
        };

        this.loadWarfareData();
    }

    /**
     * Load warfare data
     */
    loadWarfareData() {
        try {
            const saved = this.database.get("warfare:system");
            if (saved) {
                this.sieges = new Map(saved.sieges || []);
                this.warfareHistory = saved.history || [];
                this.stats = saved.stats || this.stats;
            }
            console.log(`[Warfare] Initialized - ${this.sieges.size} active sieges`);
        } catch (error) {
            console.error(`[Warfare] Load failed: ${error}`);
        }
    }

    /**
     * Save warfare data
     */
    saveWarfareData() {
        try {
            this.database.set("warfare:system", {
                sieges: Array.from(this.sieges.entries()),
                history: this.warfareHistory,
                stats: this.stats,
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[Warfare] Save failed: ${error}`);
        }
    }

    /**
     * Start a siege on a territory
     */
    startSiege(claimId, commanderNames) {
        const claim = this.claimManager.getClaim(claimId);
        if (!claim) {
            return { success: false, error: "Claim not found" };
        }

        if (claim.warfare.underSiege) {
            return { success: false, error: "Claim already under siege" };
        }

        if (commanderNames.length < this.config.minSiegeLeaders) {
            return { success: false, error: `Need at least ${this.config.minSiegeLeaders} commanders` };
        }

        // Check costs
        for (const commander of commanderNames) {
            const balance = this.moneyManager.getPlayerBalance(commander).balance;
            if (balance < this.config.costToStartSiege) {
                return { success: false, error: `${commander} doesn't have enough coins` };
            }
        }

        // Deduct costs
        for (const commander of commanderNames) {
            this.moneyManager.deductMoney(commander, this.config.costToStartSiege);
        }

        // Calculate claim health
        const baseChunks = claim.radius * claim.radius * 4;
        const claimHealth = baseChunks * this.config.healthPerPlayer;

        const siege = {
            claimId: claimId,
            defenderId: claim.ownerName,
            commanderNames: commanderNames,
            startDate: Date.now(),
            endDate: Date.now() + this.config.siegeDuration,
            claimHealth: claimHealth,
            currentHealth: claimHealth,
            damageDealt: 0,
            damageHistory: [],
            defendersJoined: [claim.ownerName],
            siegeActive: true,
            defenseLevel: claim.warfare.defenseLvl || 1,
            events: [],
            status: "ACTIVE"
        };

        this.sieges.set(claimId, siege);
        claim.warfare.underSiege = true;
        claim.warfare.besiegerName = commanderNames[0];
        claim.warfare.siegeStartDate = Date.now();
        claim.logEvent(`Siege started by ${commanderNames.join(", ")}`);

        this.stats.totalSieges++;
        this.eventSystem.dispatch("warfare:siegeStarted", { claimId, siege });
        this.saveWarfareData();

        return { success: true, siege: siege };
    }

    /**
     * Deal damage to a siege (via TNT/explosions)
     */
    dealDamage(claimId, attackerName, damageAmount, method = "explosion") {
        const siege = this.sieges.get(claimId);
        if (!siege || !siege.siegeActive) {
            return { success: false, error: "Siege not active" };
        }

        if (Date.now() > siege.endDate) {
            return { success: false, error: "Siege ended" };
        }

        // Apply damage
        const actualDamage = Math.floor(damageAmount * (1 / siege.defenseLevel));
        siege.currentHealth -= actualDamage;
        siege.damageDealt += actualDamage;

        siege.damageHistory.push({
            attacker: attackerName,
            damage: actualDamage,
            method: method,
            timestamp: Date.now()
        });

        siege.events.push({
            type: "damage",
            attacker: attackerName,
            damage: actualDamage,
            remainingHealth: siege.currentHealth,
            timestamp: Date.now()
        });

        // Check if claim is captured
        if (siege.currentHealth <= 0) {
            return this.concludeSiege(claimId, "attacker_victory");
        }

        this.eventSystem.dispatch("warfare:damageDealt", { claimId, attacker: attackerName, damage: actualDamage });
        this.saveWarfareData();

        return {
            success: true,
            healthRemaining: siege.currentHealth,
            percentageRemaining: (siege.currentHealth / siege.claimHealth) * 100
        };
    }

    /**
     * Add defender to siege
     */
    joinDefense(claimId, defenderName) {
        const siege = this.sieges.get(claimId);
        if (!siege) {
            return { success: false, error: "Siege not found" };
        }

        if (siege.defendersJoined.includes(defenderName)) {
            return { success: false, error: "Already defending" };
        }

        siege.defendersJoined.push(defenderName);
        siege.events.push({
            type: "defender_joined",
            player: defenderName,
            timestamp: Date.now()
        });

        this.eventSystem.dispatch("warfare:defenderJoined", { claimId, defender: defenderName });
        this.saveWarfareData();

        return { success: true };
    }

    /**
     * Conclude a siege
     */
    concludeSiege(claimId, outcome) {
        const siege = this.sieges.get(claimId);
        if (!siege) {
            return { success: false };
        }

        const claim = this.claimManager.getClaim(claimId);
        siege.siegeActive = false;
        siege.status = outcome;
        siege.endDate = Date.now();

        const record = {
            claimId: claimId,
            defender: siege.defenderId,
            commanders: siege.commanderNames,
            outcome: outcome,
            damageDealt: siege.damageDealt,
            totalDays: Math.floor((Date.now() - siege.startDate) / 86400000),
            timestamp: Date.now(),
            claimTransferred: false
        };

        if (outcome === "attacker_victory") {
            // Transfer claim to first commander
            const newOwner = siege.commanderNames[0];
            const oldOwner = claim.ownerName;

            claim.ownerName = newOwner;
            claim.members.clear();
            claim.addMember(newOwner, "owner");
            claim.warfare.underSiege = false;
            claim.logEvent(`Claim captured by ${siege.commanderNames.join(", ")} in siege`);

            record.claimTransferred = true;
            record.newOwner = newOwner;

            this.stats.totalSiegeVictories++;
            this.stats.totalTerritoriesCaptured++;

            this.eventSystem.dispatch("warfare:claimCaptured", { claimId, newOwner: newOwner });
        } else if (outcome === "defender_victory") {
            claim.warfare.underSiege = false;
            claim.logEvent(`Siege repelled - defenders victorious`);
            this.stats.totalSiegeDefenses++;

            this.eventSystem.dispatch("warfare:sieceRepelled", { claimId });
        } else if (outcome === "siege_timeout") {
            claim.warfare.underSiege = false;
            claim.logEvent(`Siege timed out`);
            this.stats.totalSiegeDefenses++;
        }

        this.warfareHistory.push(record);
        this.sieges.delete(claimId);
        this.saveWarfareData();

        return { success: true, record: record };
    }

    /**
     * Get siege information
     */
    getSiegeInfo(claimId) {
        return this.sieges.get(claimId) || null;
    }

    /**
     * Get all active sieges
     */
    getActiveSieges() {
        return Array.from(this.sieges.values()).filter(s => s.siegeActive);
    }

    /**
     * Get warfare history for claim
     */
    getWarfareHistory(claimId, limit = 10) {
        return this.warfareHistory
            .filter(r => r.claimId === claimId)
            .slice(-limit)
            .reverse();
    }

    /**
     * Get player war statistics
     */
    getPlayerWarStats(playerName) {
        const asCommander = this.warfareHistory.filter(w =>
            w.commanders.includes(playerName)
        );
        const asDefender = this.warfareHistory.filter(w =>
            w.defender === playerName
        );

        const commanderVictories = asCommander.filter(w => w.outcome === "attacker_victory").length;
        const defenderVictories = asDefender.filter(w => w.outcome === "defender_victory").length;

        return {
            playerName: playerName,
            commanderSieges: asCommander.length,
            commanderVictories: commanderVictories,
            defenderSieges: asDefender.length,
            defenderVictories: defenderVictories,
            totalSiegeParticipations: asCommander.length + asDefender.length,
            territoriesCaptured: asCommander.filter(w => w.claimTransferred).length
        };
    }

    /**
     * Get warfare statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            activeSieges: this.sieges.size,
            totalWarfareEvents: this.warfareHistory.length,
            recentSieges: this.warfareHistory.slice(-10)
        };
    }

    /**
     * Upgrade defense level of territory
     */
    upgradeDefense(claimId, level) {
        const claim = this.claimManager.getClaim(claimId);
        if (!claim) {
            return { success: false, error: "Claim not found" };
        }

        level = Math.min(level, this.config.maxDefenseLvl);
        claim.warfare.defenseLvl = level;

        // Update active siege if exists
        const siege = this.sieges.get(claimId);
        if (siege) {
            siege.defenseLevel = level;
        }

        claim.logEvent(`Defense level upgraded to ${level}`);
        this.saveWarfareData();

        return { success: true, newLevel: level };
    }

    /**
     * Check siege timeout
     */
    checkSiegeTimeouts() {
        const now = Date.now();
        const expiredSieges = Array.from(this.sieges.entries())
            .filter(([id, siege]) => now > siege.endDate && siege.siegeActive);

        for (const [claimId, siege] of expiredSieges) {
            this.concludeSiege(claimId, "siege_timeout");
        }

        return expiredSieges.length;
    }
}
