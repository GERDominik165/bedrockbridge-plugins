/**
 * 🏛️ LANDCLAIM MEGA - Claim Manager
 * Central management system for all territories and claims
 * Handles CRUD operations, lookups, caching, and validation
 * @version 3.0.0
 */

import { Territory } from "./Territory.js";

export class ClaimManager {
    constructor(moneyManager, protectionManager, database) {
        this.db = database;
        this.moneyManager = moneyManager;
        this.protectionManager = protectionManager;

        // === CLAIM STORAGE ===
        this.claims = new Map(); // id -> Territory object
        this.playerClaims = new Map(); // playerName -> [claim IDs]
        this.chunkIndex = new Map(); // "x:z:dimension" -> claim ID (O(1) lookup)

        // === STATISTICS ===
        this.stats = {
            totalClaims: 0,
            totalChunks: 0,
            totalPlayers: 0,
            totalTerritoriesCreated: 0,
            totalTerritoriesDeleted: 0
        };

        // === CONFIGURATION ===
        this.CONFIG = {
            minClaimSize: 3, // Minimum radius in chunks
            maxClaimSize: 50, // Maximum radius in chunks
            minDistanceBetweenClaims: 2, // Chunks apart
            maxClaimsPerPlayer: 5,
            autoSaveInterval: 300000, // 5 minutes
            chunkIndexCacheSize: 10000
        };

        // === CACHE ===
        this.loadCache = new Map(); // playerName -> {claims: []}
        this.lastSave = Date.now();

        // Initialize auto-save
        this.initializeAutoSave();
        this.loadTerritoriesFromDatabase();
    }

    /**
     * Initialize auto-save system
     */
    initializeAutoSave() {
        setInterval(() => {
            if (this.isDirty) {
                this.saveAllTerritories();
                this.isDirty = false;
                console.log("[ClaimManager] Auto-saved all territories");
            }
        }, this.CONFIG.autoSaveInterval);
    }

    /**
     * Load all territories from database
     */
    loadTerritoriesFromDatabase() {
        try {
            const stored = this.db.get("territories:all");
            if (stored && stored.claims) {
                for (const claimData of stored.claims) {
                    const territory = Territory.fromJSON(claimData);
                    this.claims.set(territory.id, territory);
                    this.indexClaim(territory);
                    this.addPlayerClaim(territory.ownerName, territory.id);
                }
                this.stats.totalClaims = this.claims.size;
                console.log(`[ClaimManager] Loaded ${this.claims.size} territories from database`);
            }
        } catch (error) {
            console.error(`[ClaimManager] Error loading territories: ${error}`);
        }
    }

    /**
     * Index claim for O(1) chunk lookup
     */
    indexClaim(territory) {
        const corners = territory.getCorners();
        // Index all chunks in the claim
        for (let x = Math.floor(corners.northwest.x / 16); x <= Math.ceil(corners.southeast.x / 16); x++) {
            for (let z = Math.floor(corners.northwest.z / 16); z <= Math.ceil(corners.southeast.z / 16); z++) {
                const key = `${x}:${z}:${territory.dimension}`;
                this.chunkIndex.set(key, territory.id);
            }
        }
    }

    /**
     * Remove claim from index
     */
    unindexClaim(territory) {
        const corners = territory.getCorners();
        for (let x = Math.floor(corners.northwest.x / 16); x <= Math.ceil(corners.southeast.x / 16); x++) {
            for (let z = Math.floor(corners.northwest.z / 16); z <= Math.ceil(corners.southeast.z / 16); z++) {
                const key = `${x}:${z}:${territory.dimension}`;
                this.chunkIndex.delete(key);
            }
        }
    }

    /**
     * Get territory at coordinates (FAST - O(1) lookup)
     */
    getTerritoryAt(x, z, dimension) {
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const key = `${chunkX}:${chunkZ}:${dimension}`;

        const claimId = this.chunkIndex.get(key);
        if (claimId) {
            return this.claims.get(claimId);
        }
        return null;
    }

    /**
     * Create new claim
     */
    createClaim(ownerName, centerX, centerZ, dimension, radius = 5) {
        // === VALIDATION ===

        // Check player claim limit
        const playerClaims = this.getPlayerClaims(ownerName);
        if (playerClaims.length >= this.CONFIG.maxClaimsPerPlayer) {
            return {
                success: false,
                error: `You can only have ${this.CONFIG.maxClaimsPerPlayer} claims`
            };
        }

        // Check claim size
        if (radius < this.CONFIG.minClaimSize || radius > this.CONFIG.maxClaimSize) {
            return {
                success: false,
                error: `Claim radius must be between ${this.CONFIG.minClaimSize} and ${this.CONFIG.maxClaimSize} chunks`
            };
        }

        // Check overlap
        if (this.checkOverlap(centerX, centerZ, dimension, radius)) {
            return {
                success: false,
                error: `This area overlaps with another claim`
            };
        }

        // Check distance between claims
        if (this.checkMinDistance(centerX, centerZ, dimension, radius)) {
            return {
                success: false,
                error: `Claims must be at least ${this.CONFIG.minDistanceBetweenClaims} chunks apart`
            };
        }

        // === ECONOMY CHECK ===
        const cost = this.moneyManager.calculateClaimCost(radius);
        if (!this.moneyManager.withdrawPlayerMoney(ownerName, cost, "Claim creation")) {
            return {
                success: false,
                error: `You need ${cost} coins to create this claim (you have ${this.moneyManager.getPlayerAccount(ownerName).balance})`
            };
        }

        // === CREATE CLAIM ===
        const claimId = this.generateClaimId();
        const territory = new Territory(claimId, ownerName, centerX, centerZ, dimension, radius);

        // Initialize economy account for territory
        this.moneyManager.initializeTerritoryAccount(claimId);

        // Store and index
        this.claims.set(claimId, territory);
        this.indexClaim(territory);
        this.addPlayerClaim(ownerName, claimId);

        // Update stats
        this.stats.totalClaims++;
        this.stats.totalChunks += territory.getSize().chunks;
        this.stats.totalTerritoriesCreated++;
        this.isDirty = true;

        return {
            success: true,
            claimId: claimId,
            cost: cost,
            territory: territory
        };
    }

    /**
     * Delete claim
     */
    deleteClaim(claimId, playerName) {
        const territory = this.claims.get(claimId);
        if (!territory) {
            return { success: false, error: "Claim not found" };
        }

        if (territory.ownerName !== playerName) {
            return { success: false, error: "Only the owner can delete this claim" };
        }

        // Remove from all indexes
        this.unindexClaim(territory);
        this.claims.delete(claimId);
        this.removePlayerClaim(playerName, claimId);

        // Update stats
        this.stats.totalClaims--;
        this.stats.totalChunks -= territory.getSize().chunks;
        this.stats.totalTerritoriesDeleted++;
        this.isDirty = true;

        return { success: true };
    }

    /**
     * Expand claim
     */
    expandClaim(claimId, newRadius, playerName) {
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

        // Check overlap with new size
        if (this.checkOverlap(territory.centerX, territory.centerZ, territory.dimension, newRadius, claimId)) {
            return { success: false, error: "Expansion would overlap with another claim" };
        }

        // Calculate cost
        const expansionCost = this.moneyManager.calculateExpansionCost(territory.radius, newRadius);
        if (!this.moneyManager.withdrawPlayerMoney(playerName, expansionCost, "Claim expansion")) {
            return {
                success: false,
                error: `You need ${expansionCost} coins to expand (you have ${this.moneyManager.getPlayerAccount(playerName).balance})`
            };
        }

        // === EXPAND ===
        this.unindexClaim(territory);
        const oldSize = territory.getSize().chunks;
        territory.expand(newRadius);
        this.indexClaim(territory);

        // Update stats
        const newSize = territory.getSize().chunks;
        this.stats.totalChunks += (newSize - oldSize);
        this.isDirty = true;

        return {
            success: true,
            cost: expansionCost,
            oldRadius: territory.radius - (newRadius - territory.radius),
            newRadius: newRadius
        };
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
     * Check if claim ID exists
     */
    claimExists(claimId) {
        return this.claims.has(claimId);
    }

    /**
     * Check for overlap
     */
    checkOverlap(centerX, centerZ, dimension, radius, excludeClaimId = null) {
        const testCorners = {
            northwest: { x: centerX - (radius * 16), z: centerZ - (radius * 16) },
            southeast: { x: centerX + (radius * 16), z: centerZ + (radius * 16) }
        };

        for (const [claimId, territory] of this.claims.entries()) {
            if (excludeClaimId && claimId === excludeClaimId) continue;
            if (territory.dimension !== dimension) continue;

            const corners = territory.getCorners();

            // AABB collision detection
            if (!(testCorners.southeast.x < corners.northwest.x ||
                  testCorners.northwest.x > corners.southeast.x ||
                  testCorners.southeast.z < corners.northwest.z ||
                  testCorners.northwest.z > corners.southeast.z)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check minimum distance between claims
     */
    checkMinDistance(centerX, centerZ, dimension, radius) {
        const distance = this.CONFIG.minDistanceBetweenClaims * 16;
        const checkRadius = (radius + this.CONFIG.minDistanceBetweenClaims) * 16;

        for (const territory of this.claims.values()) {
            if (territory.dimension !== dimension) continue;

            const dist = Math.hypot(
                Math.abs(centerX - territory.centerX),
                Math.abs(centerZ - territory.centerZ)
            );

            if (dist < checkRadius) {
                return true;
            }
        }

        return false;
    }

    /**
     * Add member to claim
     */
    addMemberToClaim(claimId, playerName, role = "member", adderName) {
        const territory = this.claims.get(claimId);
        if (!territory) {
            return { success: false, error: "Claim not found" };
        }

        if (territory.ownerName !== adderName) {
            return { success: false, error: "Only the owner can add members" };
        }

        // Check member limit
        if (territory.members.size >= 20) {
            return { success: false, error: "This claim has reached maximum members (20)" };
        }

        // Check cost
        const memberCost = this.moneyManager.CONFIG.memberCost;
        if (!this.moneyManager.withdrawPlayerMoney(adderName, memberCost, "Add member to claim")) {
            return { success: false, error: `Adding a member costs ${memberCost} coins` };
        }

        territory.addMember(playerName, role);
        this.isDirty = true;

        return { success: true, cost: memberCost };
    }

    /**
     * Remove member from claim
     */
    removeMemberFromClaim(claimId, playerName, removerName) {
        const territory = this.claims.get(claimId);
        if (!territory) {
            return { success: false, error: "Claim not found" };
        }

        if (territory.ownerName !== removerName) {
            return { success: false, error: "Only the owner can remove members" };
        }

        if (!territory.members.has(playerName)) {
            return { success: false, error: "Player is not a member of this claim" };
        }

        territory.removeMember(playerName);
        this.isDirty = true;

        return { success: true };
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
            console.log(`[ClaimManager] Saved ${this.claims.size} territories`);
            return true;
        } catch (error) {
            console.error(`[ClaimManager] Error saving territories: ${error}`);
            return false;
        }
    }

    /**
     * Add claim to player's claim list
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
     * Remove claim from player's claim list
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
     * Generate unique claim ID
     */
    generateClaimId() {
        return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get nearby claims
     */
    getNearbyClaimsAt(x, z, dimension, range = 64) {
        const nearby = [];
        const rangeChunks = Math.ceil(range / 16);

        for (const territory of this.claims.values()) {
            if (territory.dimension !== dimension) continue;

            const dist = Math.hypot(x - territory.centerX, z - territory.centerZ);
            if (dist <= range) {
                nearby.push({
                    distance: dist,
                    territory: territory
                });
            }
        }

        return nearby.sort((a, b) => a.distance - b.distance);
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
     * Search claims by name
     */
    searchClaimsByName(searchTerm) {
        const result = [];
        const lower = searchTerm.toLowerCase();
        for (const territory of this.claims.values()) {
            if (territory.name.toLowerCase().includes(lower) ||
                territory.description.toLowerCase().includes(lower)) {
                result.push(territory);
            }
        }
        return result;
    }

    /**
     * Get global statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            lastSaved: this.lastSave,
            averageClaimSize: this.stats.totalClaims > 0 ?
                Math.round(this.stats.totalChunks / this.stats.totalClaims) : 0,
            uniquePlayers: this.playerClaims.size,
            indexSize: this.chunkIndex.size
        };
    }

    /**
     * Validate claim integrity
     */
    validateClaim(claimId) {
        const territory = this.claims.get(claimId);
        if (!territory) {
            return { valid: false, errors: ["Claim not found"] };
        }

        const errors = [];

        // Check if territory is in bounds
        if (territory.radius < this.CONFIG.minClaimSize) {
            errors.push(`Radius ${territory.radius} is below minimum ${this.CONFIG.minClaimSize}`);
        }
        if (territory.radius > this.CONFIG.maxClaimSize) {
            errors.push(`Radius ${territory.radius} exceeds maximum ${this.CONFIG.maxClaimSize}`);
        }

        // Check owner account
        if (!this.moneyManager.playerExists(territory.ownerName)) {
            errors.push(`Owner account missing: ${territory.ownerName}`);
        }

        // Check territory account
        if (!this.moneyManager.db.has(`territory:${claimId}`)) {
            errors.push(`Territory account missing`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get claim info string
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
