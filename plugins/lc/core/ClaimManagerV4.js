/**
 * 🏛️ LANDCLAIM MEGA v4 - Enhanced Claim Manager
 * Complete claim management with persistent storage and spatial indexing
 * @version 4.0.0
 */

import { Territory } from "./Territory.js";

export class ClaimManagerV4 {
    constructor(moneyManager, protectionManager, database, spatialGrid) {
        this.db = database;
        this.moneyManager = moneyManager;
        this.protectionManager = protectionManager;
        this.spatialGrid = spatialGrid;

        // === CLAIM STORAGE ===
        this.claims = new Map(); // id -> Territory object
        this.playerClaims = new Map(); // playerName -> [claim IDs]
        this.dimensionClaims = new Map(); // "dimension" -> [claim IDs]

        // === STATISTICS ===
        this.stats = {
            totalClaims: 0,
            totalChunks: 0,
            totalPlayers: 0,
            totalTerritoriesCreated: 0,
            totalTerritoriesDeleted: 0,
            totalExpansions: 0,
            lastStatUpdate: Date.now()
        };

        // === CONFIGURATION ===
        this.CONFIG = {
            minClaimSize: 3,
            maxClaimSize: 50,
            minDistanceBetweenClaims: 2,
            maxClaimsPerPlayer: 5,
            autoSaveInterval: 300000,
            chunkIndexCacheSize: 10000,
            enableAutoExpire: false,
            expireClaimsAfterDays: 30
        };

        // === CACHE ===
        this.loadCache = new Map();
        this.lastSave = Date.now();
        this.isDirty = false;
        this.searchCache = new Map();

        this.loadTerritoriesFromDatabase();
        this.initializeAutoSave();
        console.log("[ClaimManagerV4] ✅ Initialized with persistent storage");
    }

    /**
     * Load all territories from persistent database
     */
    loadTerritoriesFromDatabase() {
        try {
            const stored = this.db.get("territories:all");
            if (stored && stored.claims) {
                for (const claimData of stored.claims) {
                    const territory = Territory.fromJSON(claimData);
                    this.claims.set(territory.id, territory);
                    this.spatialGrid.insertClaim(
                        territory.id,
                        territory.centerX,
                        territory.centerZ,
                        territory.radius,
                        territory.dimension
                    );
                    this.addPlayerClaim(territory.ownerName, territory.id);
                    this.addDimensionClaim(territory.dimension, territory.id);
                }
                this.stats.totalClaims = this.claims.size;
                console.log(`[ClaimManagerV4] ✅ Loaded ${this.claims.size} territories`);
            }
        } catch (error) {
            console.error(`[ClaimManagerV4] Error loading territories: ${error}`);
        }
    }

    /**
     * Initialize auto-save system
     */
    initializeAutoSave() {
        setInterval(() => {
            if (this.isDirty) {
                this.saveAllTerritories();
                this.isDirty = false;
            }
        }, this.CONFIG.autoSaveInterval);
    }

    /**
     * Get territory at coordinates using spatial grid (O(1))
     */
    getTerritoryAt(x, z, dimension) {
        try {
            const claimIds = this.spatialGrid.getClaimsAt(x, z, dimension);
            if (claimIds.length > 0) {
                return this.claims.get(claimIds[0]);
            }
            return null;
        } catch (error) {
            console.error(`[ClaimManagerV4] Error in getTerritoryAt: ${error}`);
            return null;
        }
    }

    /**
     * Create new claim with validation
     */
    createClaim(ownerName, centerX, centerZ, dimension, radius = 5) {
        try {
            // === VALIDATION ===
            const playerClaims = this.getPlayerClaims(ownerName);
            if (playerClaims.length >= this.CONFIG.maxClaimsPerPlayer) {
                return {
                    success: false,
                    error: `You can only have ${this.CONFIG.maxClaimsPerPlayer} claims`
                };
            }

            if (radius < this.CONFIG.minClaimSize || radius > this.CONFIG.maxClaimSize) {
                return {
                    success: false,
                    error: `Claim radius must be between ${this.CONFIG.minClaimSize} and ${this.CONFIG.maxClaimSize} chunks`
                };
            }

            if (this.checkOverlap(centerX, centerZ, dimension, radius)) {
                return {
                    success: false,
                    error: `This area overlaps with another claim`
                };
            }

            if (this.checkMinDistance(centerX, centerZ, dimension, radius)) {
                return {
                    success: false,
                    error: `Claims must be at least ${this.CONFIG.minDistanceBetweenClaims} chunks apart`
                };
            }

            // === ECONOMY CHECK ===
            const cost = this.calculateClaimCost(radius);
            if (!this.moneyManager.withdrawPlayerMoney(ownerName, cost, "Claim creation")) {
                return {
                    success: false,
                    error: `You need ${cost} coins to create this claim`
                };
            }

            // === CREATE CLAIM ===
            const claimId = this.generateClaimId();
            const territory = new Territory(claimId, ownerName, centerX, centerZ, dimension, radius);

            this.moneyManager.initializeTerritoryAccount(claimId);
            this.claims.set(claimId, territory);
            this.spatialGrid.insertClaim(claimId, centerX, centerZ, radius, dimension);
            this.addPlayerClaim(ownerName, claimId);
            this.addDimensionClaim(dimension, claimId);

            this.stats.totalClaims++;
            this.stats.totalChunks += territory.getSize().chunks;
            this.stats.totalTerritoriesCreated++;
            this.isDirty = true;

            territory.logEvent(`Territory created by ${ownerName}`);
            return {
                success: true,
                claimId: claimId,
                cost: cost,
                territory: territory
            };
        } catch (error) {
            console.error(`[ClaimManagerV4] Error creating claim: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete claim
     */
    deleteClaim(claimId, playerName) {
        try {
            const territory = this.claims.get(claimId);
            if (!territory) {
                return { success: false, error: "Claim not found" };
            }

            if (territory.ownerName !== playerName) {
                return { success: false, error: "Only the owner can delete this claim" };
            }

            this.spatialGrid.removeClaim(claimId);
            this.claims.delete(claimId);
            this.removePlayerClaim(playerName, claimId);
            this.removeDimensionClaim(territory.dimension, claimId);

            this.stats.totalClaims--;
            this.stats.totalChunks -= territory.getSize().chunks;
            this.stats.totalTerritoriesDeleted++;
            this.isDirty = true;

            territory.logEvent(`Territory deleted`);
            return { success: true };
        } catch (error) {
            console.error(`[ClaimManagerV4] Error deleting claim: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Expand claim
     */
    expandClaim(claimId, newRadius, playerName) {
        try {
            const territory = this.claims.get(claimId);
            if (!territory) {
                return { success: false, error: "Claim not found" };
            }

            if (territory.ownerName !== playerName) {
                return { success: false, error: "Only the owner can expand this claim" };
            }

            if (newRadius <= territory.radius) {
                return { success: false, error: "New radius must be larger than current radius" };
            }

            if (newRadius > this.CONFIG.maxClaimSize) {
                return { success: false, error: `Maximum claim size is ${this.CONFIG.maxClaimSize} chunks` };
            }

            if (this.checkOverlap(territory.centerX, territory.centerZ, territory.dimension, newRadius, claimId)) {
                return { success: false, error: "Expansion would overlap with another claim" };
            }

            const expansionCost = this.calculateExpansionCost(territory.radius, newRadius);
            if (!this.moneyManager.withdrawPlayerMoney(playerName, expansionCost, "Claim expansion")) {
                return {
                    success: false,
                    error: `You need ${expansionCost} coins to expand`
                };
            }

            this.spatialGrid.updateClaim(claimId, territory.centerX, territory.centerZ, newRadius);
            const oldSize = territory.getSize().chunks;
            territory.expand(newRadius);
            const newSize = territory.getSize().chunks;

            this.stats.totalChunks += (newSize - oldSize);
            this.stats.totalExpansions++;
            this.isDirty = true;

            territory.logEvent(`Territory expanded from ${territory.radius - (newRadius - territory.radius)} to ${newRadius}`);
            return {
                success: true,
                cost: expansionCost,
                newRadius: newRadius
            };
        } catch (error) {
            console.error(`[ClaimManagerV4] Error expanding claim: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all claims for player
     */
    getPlayerClaims(playerName) {
        return this.playerClaims.get(playerName) || [];
    }

    /**
     * Get claim by ID
     */
    getClaim(claimId) {
        return this.claims.get(claimId);
    }

    /**
     * Check for overlap
     */
    checkOverlap(centerX, centerZ, dimension, radius, excludeClaimId = null) {
        const nearby = this.spatialGrid.getNearby(centerX, centerZ, radius * 16, dimension);
        for (const claimId of nearby) {
            if (excludeClaimId && claimId === excludeClaimId) continue;
            const territory = this.claims.get(claimId);
            if (territory) {
                const dist = Math.hypot(centerX - territory.centerX, centerZ - territory.centerZ);
                if (dist < radius * 16) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check minimum distance between claims
     */
    checkMinDistance(centerX, centerZ, dimension, radius) {
        const minDist = this.CONFIG.minDistanceBetweenClaims * 16;
        const checkDist = (radius + this.CONFIG.minDistanceBetweenClaims) * 16;

        const nearby = this.spatialGrid.getNearby(centerX, centerZ, checkDist, dimension);
        for (const claimId of nearby) {
            const territory = this.claims.get(claimId);
            if (territory && territory.dimension === dimension) {
                const dist = Math.hypot(centerX - territory.centerX, centerZ - territory.centerZ);
                if (dist < checkDist) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Add member to claim
     */
    addMemberToClaim(claimId, playerName, role = "member", adderName) {
        try {
            const territory = this.claims.get(claimId);
            if (!territory) {
                return { success: false, error: "Claim not found" };
            }

            if (territory.ownerName !== adderName) {
                return { success: false, error: "Only the owner can add members" };
            }

            if (territory.members.size >= 20) {
                return { success: false, error: "This claim has reached maximum members (20)" };
            }

            const memberCost = this.moneyManager.CONFIG.memberCost;
            if (!this.moneyManager.withdrawPlayerMoney(adderName, memberCost, "Add member")) {
                return { success: false, error: `Adding a member costs ${memberCost} coins` };
            }

            territory.addMember(playerName, role);
            this.isDirty = true;

            return { success: true, cost: memberCost };
        } catch (error) {
            console.error(`[ClaimManagerV4] Error adding member: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove member from claim
     */
    removeMemberFromClaim(claimId, playerName, removerName) {
        try {
            const territory = this.claims.get(claimId);
            if (!territory) {
                return { success: false, error: "Claim not found" };
            }

            if (territory.ownerName !== removerName) {
                return { success: false, error: "Only the owner can remove members" };
            }

            if (!territory.members.has(playerName)) {
                return { success: false, error: "Player is not a member" };
            }

            territory.removeMember(playerName);
            this.isDirty = true;

            return { success: true };
        } catch (error) {
            console.error(`[ClaimManagerV4] Error removing member: ${error}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get nearby claims
     */
    getNearbyClaimsAt(x, z, dimension, range = 64) {
        try {
            const nearby = [];
            const claimIds = this.spatialGrid.getNearby(x, z, range, dimension);

            for (const claimId of claimIds) {
                const territory = this.claims.get(claimId);
                if (territory) {
                    const dist = Math.hypot(x - territory.centerX, z - territory.centerZ);
                    if (dist <= range) {
                        nearby.push({
                            distance: dist,
                            territory: territory
                        });
                    }
                }
            }

            return nearby.sort((a, b) => a.distance - b.distance);
        } catch (error) {
            console.error(`[ClaimManagerV4] Error getting nearby claims: ${error}`);
            return [];
        }
    }

    /**
     * Save all territories to database
     */
    saveAllTerritories() {
        try {
            const claimsArray = Array.from(this.claims.values()).map(t => t.toJSON());
            this.db.set("territories:all", {
                claims: claimsArray,
                stats: this.stats,
                savedAt: Date.now()
            });
            this.lastSave = Date.now();
            console.log(`[ClaimManagerV4] ✅ Saved ${this.claims.size} territories`);
            return true;
        } catch (error) {
            console.error(`[ClaimManagerV4] Error saving territories: ${error}`);
            return false;
        }
    }

    /**
     * Add claim to player's list
     */
    addPlayerClaim(playerName, claimId) {
        if (!this.playerClaims.has(playerName)) {
            this.playerClaims.set(playerName, []);
        }
        const claims = this.playerClaims.get(playerName);
        if (!claims.includes(claimId)) {
            claims.push(claimId);
        }
    }

    /**
     * Remove claim from player's list
     */
    removePlayerClaim(playerName, claimId) {
        const claims = this.playerClaims.get(playerName);
        if (claims) {
            const index = claims.indexOf(claimId);
            if (index > -1) {
                claims.splice(index, 1);
            }
        }
    }

    /**
     * Add claim to dimension list
     */
    addDimensionClaim(dimension, claimId) {
        if (!this.dimensionClaims.has(dimension)) {
            this.dimensionClaims.set(dimension, []);
        }
        const claims = this.dimensionClaims.get(dimension);
        if (!claims.includes(claimId)) {
            claims.push(claimId);
        }
    }

    /**
     * Remove claim from dimension list
     */
    removeDimensionClaim(dimension, claimId) {
        const claims = this.dimensionClaims.get(dimension);
        if (claims) {
            const index = claims.indexOf(claimId);
            if (index > -1) {
                claims.splice(index, 1);
            }
        }
    }

    /**
     * Calculate claim cost
     */
    calculateClaimCost(radius) {
        const chunkCount = radius * radius * 4;
        return chunkCount * 50; // 50 coins per chunk
    }

    /**
     * Calculate expansion cost
     */
    calculateExpansionCost(oldRadius, newRadius) {
        const oldChunks = oldRadius * oldRadius * 4;
        const newChunks = newRadius * newRadius * 4;
        const expansion = newChunks - oldChunks;
        return expansion * 50;
    }

    /**
     * Generate unique claim ID
     */
    generateClaimId() {
        return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get global statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            lastSaved: this.lastSave,
            averageClaimSize: this.stats.totalClaims > 0
                ? Math.round(this.stats.totalChunks / this.stats.totalClaims) : 0,
            uniquePlayers: this.playerClaims.size,
            dimensions: this.dimensionClaims.size,
            isDirty: this.isDirty
        };
    }

    /**
     * Search claims by owner
     */
    searchClaimsByOwner(ownerName) {
        const result = [];
        for (const territory of this.claims.values()) {
            if (territory.ownerName.toLowerCase().includes(ownerName.toLowerCase())) {
                result.push(territory);
            }
        }
        return result;
    }

    /**
     * Get all claims in dimension
     */
    getClaimsInDimension(dimension) {
        const claimIds = this.dimensionClaims.get(dimension) || [];
        return claimIds.map(id => this.claims.get(id)).filter(c => c);
    }

    /**
     * Validate all claims
     */
    validateAllClaims() {
        const issues = [];
        for (const [claimId, territory] of this.claims.entries()) {
            if (territory.radius < this.CONFIG.minClaimSize) {
                issues.push(`${claimId}: Radius too small`);
            }
            if (!this.moneyManager.playerExists(territory.ownerName)) {
                issues.push(`${claimId}: Owner account missing`);
            }
        }
        return {
            valid: issues.length === 0,
            issues: issues,
            totalChecked: this.claims.size
        };
    }

    /**
     * Get claim info formatted
     */
    getClaimInfo(claimId) {
        const territory = this.claims.get(claimId);
        if (!territory) return null;

        const size = territory.getSize();
        const corners = territory.getCorners();

        return {
            id: territory.id,
            name: territory.name,
            owner: territory.ownerName,
            dimension: territory.dimension,
            center: { x: territory.centerX, z: territory.centerZ },
            radius: territory.radius,
            size: {
                chunks: size.chunks,
                blocks: `${size.width}×${size.depth}`,
                volume: size.volume
            },
            corners: corners,
            members: territory.members.size,
            createdDate: new Date(territory.createdDate).toLocaleString(),
            statistics: {
                breaks: territory.totalBreaks,
                places: territory.totalPlaces,
                visitors: territory.totalVisitors
            }
        };
    }
}
