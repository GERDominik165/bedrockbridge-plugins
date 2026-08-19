/**
 * 💰 LANDCLAIM MEGA v4 - Claim Tax System
 * Automatic daily taxation on claimed territories
 * @version 4.0.0 - PRODUCTION READY
 */

export class ClaimTaxSystem {
    constructor(claimManager, moneyManager, database) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.database = database;

        // === TAX CONFIGURATION ===
        this.config = {
            enabled: true,
            baseDailyTax: 10,       // coins per chunk daily
            taxCollectionTime: 0,    // 0 = midnight UTC
            graceperiodDays: 3,
            overduePenalty: 1.2,     // 20% penalty
            maxTaxPerClaim: 5000,    // Max daily tax
            taxBreakLevel: 10,       // Level for tax break
            taxBreakPercent: 0.9
        };

        // === STATISTICS ===
        this.stats = {
            totalTaxCollected: 0,
            totalClaimsOverdue: 0,
            totalClaimsDisbanded: 0,
            lastCollectionTime: Date.now(),
            collectionHistory: []
        };

        this.loadTaxData();
    }

    /**
     * Load tax data from database
     */
    loadTaxData() {
        try {
            const saved = this.database.get("tax:system");
            if (saved) {
                this.stats = saved.stats || this.stats;
            }
            console.log(`[TaxSystem] Initialized - ${this.stats.totalTaxCollected} coins collected`);
        } catch (error) {
            console.error(`[TaxSystem] Load failed: ${error}`);
        }
    }

    /**
     * Save tax data
     */
    saveTaxData() {
        try {
            this.database.set("tax:system", {
                config: this.config,
                stats: this.stats,
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[TaxSystem] Save failed: ${error}`);
        }
    }

    /**
     * Calculate tax for a claim
     */
    calculateTax(claim) {
        const baseChunks = claim.radius * claim.radius * 4;
        let dailyTax = baseChunks * this.config.baseDailyTax;

        // Apply level-based tax break
        if (claim.level >= this.config.taxBreakLevel) {
            dailyTax = Math.floor(dailyTax * this.config.taxBreakPercent);
        }

        // Cap max tax
        dailyTax = Math.min(dailyTax, this.config.maxTaxPerClaim);

        return dailyTax;
    }

    /**
     * Collect tax from a single claim
     */
    collectClaimTax(claim) {
        const dailyTax = this.calculateTax(claim);
        claim.taxation.dailyTaxAmount = dailyTax;

        // Check if tax is due
        if (Date.now() < claim.taxation.taxDueDate) {
            return { success: true, result: "not_due" };
        }

        // Check balance
        if (claim.balance < dailyTax) {
            claim.taxation.isOverdue = true;
            claim.taxation.taxDueDate = Date.now() + 86400000; // Give 24 more hours
            return { success: false, result: "insufficient_funds", owed: dailyTax };
        }

        // Deduct tax
        claim.balance -= dailyTax;
        claim.taxation.lastTaxPaid = Date.now();
        claim.taxation.taxDueDate = Date.now() + 86400000;
        claim.taxation.totalTaxPaid += dailyTax;
        claim.taxation.isOverdue = false;

        this.stats.totalTaxCollected += dailyTax;

        return { success: true, result: "paid", taxAmount: dailyTax };
    }

    /**
     * Collect taxes from all claims
     */
    collectAllTaxes() {
        const results = {
            processed: 0,
            paid: 0,
            overdue: 0,
            disbanded: 0,
            totalCollected: 0
        };

        // Get all claims
        const allClaims = this.claimManager.getAllClaims();

        for (const claim of allClaims) {
            if (!claim.taxation.enabled) continue;

            results.processed++;
            const result = this.collectClaimTax(claim);

            if (result.success && result.result === "paid") {
                results.paid++;
                results.totalCollected += result.taxAmount;
            } else if (!result.success && result.result === "insufficient_funds") {
                results.overdue++;

                // Check for persistent non-payment
                const daysOverdue = Math.floor((Date.now() - claim.taxation.lastTaxPaid) / 86400000);
                if (daysOverdue > this.config.graceperiodDays) {
                    // Disband claim
                    this.disbandClaim(claim);
                    results.disbanded++;
                }
            }
        }

        // Record collection event
        this.stats.collectionHistory.push({
            timestamp: Date.now(),
            collected: results.totalCollected,
            claimsProcessed: results.processed,
            claimsOverdue: results.overdue
        });

        this.stats.lastCollectionTime = Date.now();
        this.stats.totalClaimsOverdue = results.overdue;
        this.stats.totalClaimsDisbanded += results.disbanded;

        this.saveTaxData();
        return results;
    }

    /**
     * Disband claim due to non-payment
     */
    disbandClaim(claim) {
        // Refund remaining balance to owner
        const owner = claim.ownerName;
        if (claim.balance > 0) {
            this.moneyManager.addMoney(owner, claim.balance);
        }

        // Delete the claim
        claim.logEvent("Claim disbanded due to tax non-payment");
        this.claimManager.deleteClaim(claim.id);

        console.log(`[TaxSystem] Disbanded claim ${claim.id} of ${owner} due to non-payment`);
    }

    /**
     * Pay taxes for a claim manually
     */
    payTaxes(claimId, amountPaid) {
        const claim = this.claimManager.getClaim(claimId);
        if (!claim) return { success: false, error: "Claim not found" };

        const owed = this.calculateTax(claim);
        if (amountPaid < owed) {
            return { success: false, error: "Not enough to cover full tax" };
        }

        claim.balance -= amountPaid;
        claim.taxation.lastTaxPaid = Date.now();
        claim.taxation.taxDueDate = Date.now() + 86400000;
        claim.taxation.isOverdue = false;
        claim.logEvent(`Taxes paid: ${amountPaid} coins`);

        this.stats.totalTaxCollected += amountPaid;
        this.saveTaxData();

        return { success: true, newBalance: claim.balance };
    }

    /**
     * Get tax status for claim
     */
    getTaxStatus(claim) {
        const dailyTax = this.calculateTax(claim);
        const hoursUntilDue = Math.max(0, (claim.taxation.taxDueDate - Date.now()) / 3600000);
        const isDue = hoursUntilDue <= 0;

        return {
            dailyAmount: dailyTax,
            lastPaid: new Date(claim.taxation.lastTaxPaid).toISOString(),
            dueDate: new Date(claim.taxation.taxDueDate).toISOString(),
            hoursUntilDue: Math.floor(hoursUntilDue),
            isOverdue: claim.taxation.isOverdue,
            isEnabled: claim.taxation.enabled,
            isDue: isDue,
            totalPaid: claim.taxation.totalTaxPaid
        };
    }

    /**
     * Get system statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            avgTaxCollected: Math.floor(this.stats.totalTaxCollected / Math.max(1, this.stats.collectionHistory.length)),
            collectionsPerformed: this.stats.collectionHistory.length,
            claimsWithTax: Array.from(this.claimManager.claims.values())
                .filter(c => c.taxation.enabled).length
        };
    }

    /**
     * Set tax configuration
     */
    setConfig(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
            this.saveTaxData();
            return { success: true };
        }
        return { success: false, error: "Invalid config key" };
    }

    /**
     * Schedule automatic tax collection (call from main event loop)
     */
    setupAutoCollection() {
        // This would be called from FINAL_main_v4.js with system.runInterval()
        return {
            interval: 3600000, // 1 hour
            function: () => this.collectAllTaxes()
        };
    }
}
