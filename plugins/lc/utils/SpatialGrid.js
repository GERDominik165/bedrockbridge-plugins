/**
 * 🔍 LANDCLAIM MEGA - Spatial Grid System
 * Advanced spatial partitioning for O(1) claim lookups
 * Handles multi-dimensional chunk indexing efficiently
 * @version 4.0.0
 */

export class SpatialGrid {
    constructor(cellSize = 32, dimensionId = "minecraft:overworld") {
        this.cellSize = cellSize; // Size of each grid cell
        this.dimensionId = dimensionId;
        this.grid = new Map(); // "cellX:cellZ" -> [claimIds]
        this.claimToCell = new Map(); // claimId -> Set of cells
        this.stats = {
            totalCells: 0,
            totalClaims: 0,
            averageClaimsPerCell: 0
        };
    }

    /**
     * Get cell key from coordinates
     */
    getCellKey(x, z) {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX}:${cellZ}`;
    }

    /**
     * Get all cells that a claim occupies
     */
    getClaimCells(centerX, centerZ, radius) {
        const cells = new Set();
        const rangeBlocks = radius * 16; // Convert chunks to blocks

        for (let x = centerX - rangeBlocks; x <= centerX + rangeBlocks; x += this.cellSize) {
            for (let z = centerZ - rangeBlocks; z <= centerZ + rangeBlocks; z += this.cellSize) {
                cells.add(this.getCellKey(x, z));
            }
        }

        return cells;
    }

    /**
     * Insert claim into grid
     */
    insertClaim(claimId, centerX, centerZ, radius) {
        try {
            const cells = this.getClaimCells(centerX, centerZ, radius);

            for (const cellKey of cells) {
                if (!this.grid.has(cellKey)) {
                    this.grid.set(cellKey, []);
                }
                const cellClaims = this.grid.get(cellKey);
                if (!cellClaims.includes(claimId)) {
                    cellClaims.push(claimId);
                }
            }

            this.claimToCell.set(claimId, cells);
            this.updateStats();
            return true;
        } catch (error) {
            console.error(`[SpatialGrid] Error inserting claim ${claimId}: ${error}`);
            return false;
        }
    }

    /**
     * Remove claim from grid
     */
    removeClaim(claimId) {
        try {
            const cells = this.claimToCell.get(claimId);
            if (!cells) return false;

            for (const cellKey of cells) {
                const cellClaims = this.grid.get(cellKey);
                if (cellClaims) {
                    const index = cellClaims.indexOf(claimId);
                    if (index > -1) {
                        cellClaims.splice(index, 1);
                    }
                    // Remove empty cells
                    if (cellClaims.length === 0) {
                        this.grid.delete(cellKey);
                    }
                }
            }

            this.claimToCell.delete(claimId);
            this.updateStats();
            return true;
        } catch (error) {
            console.error(`[SpatialGrid] Error removing claim ${claimId}: ${error}`);
            return false;
        }
    }

    /**
     * Get claims at specific position (FAST - O(1))
     */
    getClaimsAt(x, z) {
        const cellKey = this.getCellKey(x, z);
        return this.grid.get(cellKey) || [];
    }

    /**
     * Get nearby claims within range
     */
    getNearby(centerX, centerZ, radius) {
        const nearby = new Set();
        const rangeBlocks = radius;

        for (let x = centerX - rangeBlocks; x <= centerX + rangeBlocks; x += this.cellSize) {
            for (let z = centerZ - rangeBlocks; z <= centerZ + rangeBlocks; z += this.cellSize) {
                const cellKey = this.getCellKey(x, z);
                const cellClaims = this.grid.get(cellKey);
                if (cellClaims) {
                    cellClaims.forEach(claimId => nearby.add(claimId));
                }
            }
        }

        return Array.from(nearby);
    }

    /**
     * Update claim position (when expanded/moved)
     */
    updateClaim(claimId, centerX, centerZ, radius) {
        this.removeClaim(claimId);
        return this.insertClaim(claimId, centerX, centerZ, radius);
    }

    /**
     * Check for overlap with query region
     */
    findOverlaps(centerX, centerZ, radius, excludeClaimId = null) {
        const nearby = this.getNearby(centerX, centerZ, radius * 16);
        return nearby.filter(id => id !== excludeClaimId);
    }

    /**
     * Get all claims in grid
     */
    getAllClaims() {
        const allClaims = new Set();
        for (const cellClaims of this.grid.values()) {
            cellClaims.forEach(claimId => allClaims.add(claimId));
        }
        return Array.from(allClaims);
    }

    /**
     * Clear entire grid
     */
    clear() {
        this.grid.clear();
        this.claimToCell.clear();
        this.updateStats();
    }

    /**
     * Update statistics
     */
    updateStats() {
        const allClaims = new Set();
        this.grid.forEach(claims => claims.forEach(c => allClaims.add(c)));

        this.stats.totalCells = this.grid.size;
        this.stats.totalClaims = allClaims.size;
        this.stats.averageClaimsPerCell = this.stats.totalCells > 0
            ? (this.stats.totalClaims / this.stats.totalCells).toFixed(2)
            : 0;
    }

    /**
     * Get statistics
     */
    getStats() {
        return { ...this.stats, dimension: this.dimensionId };
    }

    /**
     * Validate grid integrity
     */
    validateIntegrity() {
        const issues = [];

        // Check for orphaned entries
        for (const [claimId, cells] of this.claimToCell.entries()) {
            let found = false;
            for (const cellKey of cells) {
                if (this.grid.has(cellKey)) {
                    const cellClaims = this.grid.get(cellKey);
                    if (cellClaims.includes(claimId)) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                issues.push(`Orphaned claim reference: ${claimId}`);
            }
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
}

/**
 * Multi-dimension spatial grid manager
 */
export class MultiDimensionSpatialGrid {
    constructor(cellSize = 32) {
        this.cellSize = cellSize;
        this.grids = new Map(); // dimensionId -> SpatialGrid
    }

    /**
     * Get or create grid for dimension
     */
    getGrid(dimensionId) {
        if (!this.grids.has(dimensionId)) {
            this.grids.set(dimensionId, new SpatialGrid(this.cellSize, dimensionId));
        }
        return this.grids.get(dimensionId);
    }

    /**
     * Insert claim across all dimensions
     */
    insertClaim(claimId, centerX, centerZ, radius, dimensionId) {
        const grid = this.getGrid(dimensionId);
        return grid.insertClaim(claimId, centerX, centerZ, radius);
    }

    /**
     * Get claims at position
     */
    getClaimsAt(x, z, dimensionId) {
        const grid = this.getGrid(dimensionId);
        return grid.getClaimsAt(x, z);
    }

    /**
     * Get nearby claims
     */
    getNearby(centerX, centerZ, radius, dimensionId) {
        const grid = this.getGrid(dimensionId);
        return grid.getNearby(centerX, centerZ, radius);
    }

    /**
     * Get all grids statistics
     */
    getAllStats() {
        const stats = {};
        for (const [dim, grid] of this.grids.entries()) {
            stats[dim] = grid.getStats();
        }
        return stats;
    }
}
