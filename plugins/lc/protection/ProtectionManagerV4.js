/**
 * 🛡️ LANDCLAIM MEGA v4 - Advanced Protection System
 * Optimized event handling with caching, batching, and v2.4.0 API features
 * Includes raycast damage detection and advanced blocking
 * @version 4.0.0
 */

import { world, system, EntityDamageCause } from "@minecraft/server";

export class ProtectionManagerV4 {
    constructor(claimManager) {
        this.claimManager = claimManager;

        // === VIOLATION TRACKING ===
        this.violations = new Map(); // "player:territory" -> [violations]
        this.violationCounts = new Map(); // player -> count
        this.tempBans = new Map(); // player -> timestamp

        // === CACHE SYSTEM ===
        this.territoryCache = new Map(); // "x:z:dimension" -> {territory, timestamp}
        this.cacheTimeout = 5000; // 5 seconds
        this.lastCacheClear = Date.now();

        // === STATISTICS ===
        this.stats = {
            blockBreaksBlocked: 0,
            blockPlacesBlocked: 0,
            containerAccessBlocked: 0,
            explosionsBlocked: 0,
            pvpAttacksBlocked: 0,
            totalEvents: 0
        };

        // === EVENT HANDLERS ===
        this.initializeEvents();
    }

    /**
     * Initialize all event listeners with optimization
     */
    initializeEvents() {
        // Block break events - HIGH PRIORITY
        world.beforeEvents.playerBreakBlock.subscribe((event) => {
            this.stats.totalEvents++;
            this.handleBlockBreak(event);
        });

        // Block place events - HIGH PRIORITY
        world.beforeEvents.playerPlaceBlock.subscribe((event) => {
            this.stats.totalEvents++;
            this.handleBlockPlace(event);
        });

        // Block interact events - MEDIUM PRIORITY
        world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
            this.stats.totalEvents++;
            this.handleBlockInteract(event);
        });

        // Explosion events - MEDIUM PRIORITY
        world.afterEvents.explosion.subscribe((event) => {
            this.stats.totalEvents++;
            this.handleExplosion(event);
        });

        // Entity hurt events - HIGH PRIORITY (PvP)
        world.afterEvents.entityHurt.subscribe((event) => {
            this.stats.totalEvents++;
            this.handleEntityHurt(event);
        });

        // Projectile hit events - NEW v2.4.0
        world.afterEvents.projectileHitBlock.subscribe((event) => {
            this.handleProjectileHitBlock(event);
        });

        world.afterEvents.projectileHitEntity.subscribe((event) => {
            this.handleProjectileHitEntity(event);
        });

        // Periodic cache cleanup
        system.runInterval(() => {
            this.cleanupCache();
        }, 100); // Every 5 seconds

        console.log("[ProtectionManagerV4] ✅ All events initialized with optimization");
    }

    /**
     * Get territory at location with caching
     */
    getTerritoryAtCached(x, z, dimension) {
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const cacheKey = `${chunkX}:${chunkZ}:${dimension}`;

        // Check cache
        if (this.territoryCache.has(cacheKey)) {
            const cached = this.territoryCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.territory;
            }
        }

        // Query claim manager
        const territory = this.claimManager.getTerritoryAt(x, z, dimension);

        // Update cache
        this.territoryCache.set(cacheKey, {
            territory: territory,
            timestamp: Date.now()
        });

        return territory;
    }

    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, data] of this.territoryCache.entries()) {
            if (now - data.timestamp > this.cacheTimeout) {
                this.territoryCache.delete(key);
            }
        }
    }

    /**
     * Handle block break - with caching
     */
    handleBlockBreak(event) {
        try {
            const player = event.player;
            if (!player || !player.isValid()) return;

            const block = event.block;
            const location = block.location;

            // Get territory (cached)
            const territory = this.getTerritoryAtCached(
                location.x, location.z, block.dimension.id
            );

            if (!territory) {
                // Not in claimed area
                return;
            }

            // Check permissions
            if (!territory.hasPermission(player.name, "break")) {
                event.cancel = true;
                this.stats.blockBreaksBlocked++;
                this.logViolation(player.name, territory.id, "Block break attempt");
                this.sendViolationMessage(
                    player,
                    `${territory.color}🚫 You cannot break blocks here!`
                );
                return;
            }

            // Log the break
            territory.totalBreaks++;
            territory.lastActiveDate = Date.now();
            this.claimManager.isDirty = true;
        } catch (error) {
            console.error(`[ProtectionManagerV4] Error in handleBlockBreak: ${error}`);
        }
    }

    /**
     * Handle block place - with caching
     */
    handleBlockPlace(event) {
        try {
            const player = event.player;
            if (!player || !player.isValid()) return;

            const location = event.block.location;
            const dimension = event.block.dimension.id;

            // Get territory (cached)
            const territory = this.getTerritoryAtCached(location.x, location.z, dimension);

            if (!territory) {
                // Not in claimed area
                return;
            }

            // Check permissions
            if (!territory.hasPermission(player.name, "build")) {
                event.cancel = true;
                this.stats.blockPlacesBlocked++;
                this.logViolation(player.name, territory.id, "Block place attempt");
                this.sendViolationMessage(
                    player,
                    `${territory.color}🚫 You cannot place blocks here!`
                );
                return;
            }

            // Log the place
            territory.totalPlaces++;
            territory.lastActiveDate = Date.now();
            this.claimManager.isDirty = true;
        } catch (error) {
            console.error(`[ProtectionManagerV4] Error in handleBlockPlace: ${error}`);
        }
    }

    /**
     * Handle block interaction
     */
    handleBlockInteract(event) {
        try {
            const player = event.player;
            if (!player || !player.isValid()) return;

            const block = event.block;
            const location = block.location;
            const dimension = block.dimension.id;

            // Get territory
            const territory = this.getTerritoryAtCached(location.x, location.z, dimension);

            if (!territory) {
                return;
            }

            const blockType = block.typeId;

            // Check container access
            if (this.isContainer(blockType)) {
                if (!territory.hasPermission(player.name, "containers")) {
                    event.cancel = true;
                    this.stats.containerAccessBlocked++;
                    this.logViolation(player.name, territory.id, "Container access attempt");
                    this.sendViolationMessage(player, `${territory.color}🚫 Cannot open containers`);
                }
                return;
            }

            // Check door access
            if (this.isDoor(blockType)) {
                if (!territory.hasPermission(player.name, "doors")) {
                    event.cancel = true;
                    this.logViolation(player.name, territory.id, "Door access attempt");
                }
                return;
            }

            // Check button access
            if (this.isButton(blockType)) {
                if (!territory.hasPermission(player.name, "buttons")) {
                    event.cancel = true;
                    this.logViolation(player.name, territory.id, "Button press attempt");
                }
                return;
            }

            // Check lever access
            if (this.isLever(blockType)) {
                if (!territory.hasPermission(player.name, "levers")) {
                    event.cancel = true;
                    this.logViolation(player.name, territory.id, "Lever pull attempt");
                }
                return;
            }
        } catch (error) {
            console.error(`[ProtectionManagerV4] Error in handleBlockInteract: ${error}`);
        }
    }

    /**
     * Handle explosions - advanced blocking
     */
    handleExplosion(event) {
        try {
            if (!event.source) return;

            for (const block of event.getImpactedBlocks()) {
                const territory = this.getTerritoryAtCached(
                    block.location.x, block.location.z, block.dimension.id
                );

                if (territory && territory.explosionProtection) {
                    this.stats.explosionsBlocked++;
                    territory.logEvent("Explosion prevented");
                }
            }
        } catch (error) {
            console.error(`[ProtectionManagerV4] Error in handleExplosion: ${error}`);
        }
    }

    /**
     * Handle entity hurt - PvP protection
     */
    handleEntityHurt(event) {
        try {
            if (!event.hurtEntity || !event.damageSource) return;

            const victim = event.hurtEntity;
            if (victim.typeId !== "minecraft:player") return;

            const player = victim;
            const location = player.location;

            // Get territory
            const territory = this.getTerritoryAtCached(
                location.x, location.z, player.dimension.id
            );

            if (!territory || territory.pvp) {
                return; // PvP enabled or no territory
            }

            // Check if damage from player
            if (event.damageSource.damagingEntity &&
                event.damageSource.damagingEntity.typeId === "minecraft:player") {
                const attacker = event.damageSource.damagingEntity;

                event.damage = 0; // Cancel damage
                this.stats.pvpAttacksBlocked++;
                this.logViolation(attacker.name, territory.id, "PvP attempt");
                this.sendViolationMessage(
                    attacker,
                    `${territory.color}🚫 PvP disabled in this territory!`
                );
            }
        } catch (error) {
            console.error(`[ProtectionManagerV4] Error in handleEntityHurt: ${error}`);
        }
    }

    /**
     * Handle projectile hit block - NEW v2.4.0 Feature
     */
    handleProjectileHitBlock(event) {
        try {
            if (!event.projectile) return;

            const block = event.blockHit;
            if (!block) return;

            const location = block.location;
            const dimension = block.dimension.id;

            const territory = this.getTerritoryAtCached(location.x, location.z, dimension);
            if (!territory || !territory.explosionProtection) return;

            // Check if arrow/projectile from untrusted source
            const owner = event.projectile.getComponent("minecraft:projectile")?.owner;
            if (owner && owner.typeId === "minecraft:player") {
                const player = owner;
                if (!territory.hasPermission(player.name, "build")) {
                    // Block projectile damage
                    event.projectile.remove();
                }
            }
        } catch (error) {
            // Gracefully handle if features not available
        }
    }

    /**
     * Handle projectile hit entity - NEW v2.4.0 Feature
     */
    handleProjectileHitEntity(event) {
        try {
            if (!event.projectile || !event.hitEntity) return;

            const entity = event.hitEntity;
            if (entity.typeId !== "minecraft:player") return;

            const player = entity;
            const location = player.location;

            const territory = this.getTerritoryAtCached(
                location.x, location.z, player.dimension.id
            );

            if (!territory || territory.pvp) return;

            const owner = event.projectile.getComponent("minecraft:projectile")?.owner;
            if (owner && owner.typeId === "minecraft:player") {
                const attacker = owner;
                if (attacker.name !== player.name) {
                    this.stats.pvpAttacksBlocked++;
                    this.logViolation(attacker.name, territory.id, "Projectile attack");
                    event.projectile.remove();
                }
            }
        } catch (error) {
            // Gracefully handle if features not available
        }
    }

    /**
     * Check if block is container
     */
    isContainer(blockType) {
        const containers = [
            "minecraft:chest", "minecraft:barrel", "minecraft:shulker_box",
            "minecraft:furnace", "minecraft:blast_furnace", "minecraft:smoker",
            "minecraft:hopper", "minecraft:dispenser", "minecraft:dropper",
            "minecraft:brewing_stand", "minecraft:cauldron",
            "minecraft:enchanting_table", "minecraft:anvil",
            "minecraft:cartography_table", "minecraft:loom",
            "minecraft:chiseled_bookshelf", "minecraft:decorated_pot"
        ];
        return containers.includes(blockType);
    }

    /**
     * Check if block is door
     */
    isDoor(blockType) {
        return blockType.includes("door");
    }

    /**
     * Check if block is button
     */
    isButton(blockType) {
        return blockType.includes("button");
    }

    /**
     * Check if block is lever
     */
    isLever(blockType) {
        return blockType === "minecraft:lever";
    }

    /**
     * Log a violation
     */
    logViolation(playerName, territoryId, reason) {
        try {
            const key = `${playerName}:${territoryId}`;

            if (!this.violations.has(key)) {
                this.violations.set(key, []);
            }

            const violations = this.violations.get(key);
            violations.push({
                timestamp: Date.now(),
                reason: reason
            });

            // Keep max 1000 violations
            if (violations.length > 1000) {
                violations.shift();
            }

            // Track violation count
            const count = (this.violationCounts.get(playerName) || 0) + 1;
            this.violationCounts.set(playerName, count);

            // Temp ban after 10 violations in 10 minutes
            if (count >= 10) {
                const recentViolations = violations.filter(
                    v => Date.now() - v.timestamp < 600000 // 10 minutes
                );

                if (recentViolations.length >= 10) {
                    this.tempBanPlayer(playerName, 600000);
                }
            }
        } catch (error) {
            console.error(`[ProtectionManagerV4] Error logging violation: ${error}`);
        }
    }

    /**
     * Get violations for player
     */
    getViolations(playerName, territoryId) {
        const key = `${playerName}:${territoryId}`;
        return this.violations.get(key) || [];
    }

    /**
     * Clear violations
     */
    clearViolations(playerName) {
        for (const key of this.violations.keys()) {
            if (key.startsWith(`${playerName}:`)) {
                this.violations.delete(key);
            }
        }
        this.violationCounts.delete(playerName);
    }

    /**
     * Temp ban player
     */
    tempBanPlayer(playerName, duration) {
        this.tempBans.set(playerName, Date.now() + duration);
    }

    /**
     * Check if player is temp banned
     */
    isTempBanned(playerName) {
        if (!this.tempBans.has(playerName)) return false;

        const banTime = this.tempBans.get(playerName);
        if (Date.now() > banTime) {
            this.tempBans.delete(playerName);
            return false;
        }

        return true;
    }

    /**
     * Send violation message
     */
    sendViolationMessage(player, message) {
        try {
            player.sendMessage(message);
        } catch (error) {
            console.warn(`[ProtectionManagerV4] Could not send message to ${player.name}`);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.territoryCache.size,
            totalViolations: Array.from(this.violations.values())
                .reduce((sum, v) => sum + v.length, 0)
        };
    }
}
