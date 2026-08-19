/**
 * 🌍 LANDCLAIM MEGA - Player Teleportation
 * Safe teleportation with cooldowns, fall protection, and validation
 * @version 3.0.0
 */

import { world } from "@minecraft/server";

export class PlayerTeleportation {
    constructor() {
        this.cooldowns = new Map(); // playerName -> {command: timestamp}
        this.homeTeleports = new Map(); // playerName -> home location

        this.CONFIG = {
            teleportCooldown: 5000, // 5 seconds
            fallDamageHeight: 4, // blocks before damage
            safeGround: [
                "minecraft:grass_block",
                "minecraft:dirt",
                "minecraft:stone",
                "minecraft:cobblestone",
                "minecraft:sand",
                "minecraft:gravel",
                "minecraft:oak_planks",
                "minecraft:stone_bricks",
                "minecraft:oak_leaves"
            ]
        };

        // Teleport tracking
        this.recentTeleports = new Map();
    }

    /**
     * Check if player is on cooldown
     */
    isOnCooldown(playerName) {
        const cooldownData = this.cooldowns.get(playerName);
        if (!cooldownData) return false;

        const elapsed = Date.now() - cooldownData.timestamp;
        if (elapsed < this.CONFIG.teleportCooldown) {
            return Math.ceil((this.CONFIG.teleportCooldown - elapsed) / 1000);
        }

        this.cooldowns.delete(playerName);
        return false;
    }

    /**
     * Set cooldown for player
     */
    setCooldown(playerName) {
        this.cooldowns.set(playerName, { timestamp: Date.now() });
    }

    /**
     * Teleport player to location safely
     */
    async teleportPlayerSafe(player, x, y, z, dimension) {
        // === VALIDATION ===
        if (!player.isValid()) {
            return { success: false, error: "Player is offline" };
        }

        // Check cooldown
        const cooldown = this.isOnCooldown(player.name);
        if (cooldown) {
            return { success: false, error: `Teleport on cooldown (${cooldown}s remaining)` };
        }

        // === FIND SAFE Y ===
        let safeY = y;
        try {
            // Try to find safe landing spot
            safeY = await this.findSafeY(x, z, dimension, y);
            if (safeY === null) {
                safeY = y; // Fallback to requested Y
            }
        } catch (error) {
            safeY = y; // Fallback
        }

        // === TELEPORT ===
        try {
            await player.teleport(
                { x: x, y: safeY + 1, z: z },
                {
                    dimension: dimension,
                    rotation: { x: 0, y: 0 },
                    checkForBlocks: false
                }
            );

            // Set cooldown
            this.setCooldown(player.name);

            // Track teleport
            this.recentTeleports.set(player.name, {
                from: player.location,
                to: { x, y: safeY, z },
                timestamp: Date.now()
            });

            return { success: true, destination: { x, y: safeY, z } };
        } catch (error) {
            return { success: false, error: `Teleportation failed: ${error.message}` };
        }
    }

    /**
     * Find safe Y coordinate for landing
     */
    async findSafeY(x, z, dimension, suggestedY) {
        // Search downward from suggested Y
        for (let y = Math.min(suggestedY + 5, 319); y >= -64; y--) {
            try {
                // Check if ground at this level
                if (this.isSafeGround(x, y, z, dimension)) {
                    return y + 1;
                }
            } catch (error) {
                // Continue searching
            }
        }

        return null; // No safe ground found
    }

    /**
     * Check if ground is safe for landing
     */
    isSafeGround(x, y, z, dimension) {
        try {
            const block = dimension.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
            if (!block) return false;

            return this.CONFIG.safeGround.includes(block.typeId);
        } catch (error) {
            return false;
        }
    }

    /**
     * Teleport to claim center
     */
    async teleportToClaimCenter(player, territory) {
        if (!player.isValid()) {
            return { success: false, error: "Player is offline" };
        }

        // Get dimension
        const dimension = player.dimension;

        // Teleport to center
        return await this.teleportPlayerSafe(
            player,
            territory.centerX,
            64, // Default Y
            territory.centerZ,
            dimension
        );
    }

    /**
     * Teleport to warp point
     */
    async teleportToWarp(player, territory, warpName) {
        const warp = territory.warps.get(warpName);
        if (!warp) {
            return { success: false, error: `Warp '${warpName}' not found` };
        }

        try {
            const dimension = world.getDimension(warp.dimension);
            return await this.teleportPlayerSafe(
                player,
                warp.x,
                warp.y,
                warp.z,
                dimension
            );
        } catch (error) {
            return { success: false, error: `Invalid warp location` };
        }
    }

    /**
     * Set home for player in territory
     */
    setHome(playerName, territory, x, y, z) {
        const homeKey = `${playerName}:${territory.id}`;

        this.homeTeleports.set(homeKey, {
            x: x,
            y: y,
            z: z,
            dimension: territory.dimension,
            territoryId: territory.id
        });

        // Also save to territory object
        territory.setHome(playerName, x, y, z, territory.dimension);

        return { success: true };
    }

    /**
     * Teleport to home
     */
    async teleportToHome(player, territory) {
        const homeKey = `${player.name}:${territory.id}`;
        const home = this.homeTeleports.get(homeKey);

        if (!home) {
            return { success: false, error: "Home not set for this territory" };
        }

        try {
            const dimension = world.getDimension(home.dimension);
            return await this.teleportPlayerSafe(
                player,
                home.x,
                home.y,
                home.z,
                dimension
            );
        } catch (error) {
            return { success: false, error: `Home teleportation failed: ${error.message}` };
        }
    }

    /**
     * Create warp point
     */
    createWarp(playerName, territory, warpName, x, y, z, dimension) {
        // Validate warp name
        if (warpName.length < 2 || warpName.length > 20) {
            return { success: false, error: "Warp name must be 2-20 characters" };
        }

        if (territory.warps.has(warpName)) {
            return { success: false, error: `Warp '${warpName}' already exists` };
        }

        if (territory.warps.size >= 10) {
            return { success: false, error: "Maximum warps reached (10)" };
        }

        territory.addWarp(warpName, x, y, z, dimension);

        return { success: true, warp: { name: warpName, x, y, z } };
    }

    /**
     * Delete warp point
     */
    deleteWarp(playerName, territory, warpName) {
        if (!territory.warps.has(warpName)) {
            return { success: false, error: `Warp '${warpName}' not found` };
        }

        territory.removeWarp(warpName);

        return { success: true };
    }

    /**
     * Get all warps for territory
     */
    getWarps(territory) {
        const warps = [];

        for (const [warpName, warpData] of territory.warps.entries()) {
            warps.push({
                name: warpName,
                x: warpData.x,
                y: warpData.y,
                z: warpData.z,
                dimension: warpData.dimension
            });
        }

        return warps;
    }

    /**
     * Get recent teleport history
     */
    getTeleportHistory(playerName, limit = 10) {
        const history = this.recentTeleports.get(playerName);
        if (!history) return [];

        return [history]; // Simple for now
    }

    /**
     * Calculate distance between locations
     */
    calculateDistance(from, to) {
        return Math.hypot(
            Math.hypot(to.x - from.x, to.z - from.z),
            to.y - from.y
        );
    }

    /**
     * Validate teleport destination
     */
    validateDestination(x, y, z, dimension) {
        // Check coordinates are valid
        if (x < -30000000 || x > 30000000 || z < -30000000 || z > 30000000) {
            return { valid: false, error: "Destination out of world bounds" };
        }

        if (y < -64 || y > 320) {
            return { valid: false, error: "Y coordinate out of bounds" };
        }

        return { valid: true };
    }

    /**
     * Get distance to claim
     */
    getDistanceToClaim(playerLocation, territoryCenter) {
        return Math.hypot(
            territoryCenter.x - playerLocation.x,
            territoryCenter.z - playerLocation.z
        );
    }

    /**
     * Get all homes for player
     */
    getPlayerHomes(playerName) {
        const homes = [];

        for (const [key, homeData] of this.homeTeleports.entries()) {
            if (key.startsWith(`${playerName}:`)) {
                homes.push({
                    territoryId: homeData.territoryId,
                    location: { x: homeData.x, y: homeData.y, z: homeData.z }
                });
            }
        }

        return homes;
    }

    /**
     * Clear cooldown for player (admin command)
     */
    clearCooldown(playerName) {
        this.cooldowns.delete(playerName);
        return { success: true };
    }
}
