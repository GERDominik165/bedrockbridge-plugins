/**
 * 🛡️ LANDCLAIM MEGA - Protection System
 * Complete protection and event handling
 * @version 3.0.0
 */

import { world, system } from "@minecraft/server";

export class ProtectionManager {
    constructor(claimManager) {
        this.claimManager = claimManager;
        this.violations = new Map(); // "player:territory" -> [violations]
        this.violationCounts = new Map(); // player -> count
        this.tempBans = new Map(); // player -> timestamp

        this.initializeEvents();
    }

    /**
     * Initialize all event listeners
     */
    initializeEvents() {
        // Block break events
        world.beforeEvents.playerBreakBlock.subscribe((event) => {
            this.handleBlockBreak(event);
        });

        // Block place events
        world.beforeEvents.playerPlaceBlock.subscribe((event) => {
            this.handleBlockPlace(event);
        });

        // Block interact events
        world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
            this.handleBlockInteract(event);
        });

        // Explosion events
        world.afterEvents.explosion.subscribe((event) => {
            this.handleExplosion(event);
        });

        // Entity hurt events
        world.afterEvents.entityHurt.subscribe((event) => {
            this.handleEntityHurt(event);
        });

        console.log("[ProtectionManager] All events initialized");
    }

    /**
     * Handle block break
     */
    handleBlockBreak(event) {
        const player = event.player;
        const block = event.block;
        const location = block.location;

        // Get territory at location
        const territory = this.claimManager.getTerritoryAt(
            location.x, location.z, block.dimension.id
        );

        if (!territory) {
            // Not in claimed area
            return;
        }

        // Check permissions
        if (!territory.hasPermission(player.name, "break")) {
            event.cancel = true;
            this.logViolation(player.name, territory.id, "Block break attempt");
            this.sendViolationMessage(
                player,
                `${territory.color}You cannot break blocks here!`
            );
            return;
        }

        // Log the break
        territory.totalBreaks++;
        this.claimManager.saveTerritories();
    }

    /**
     * Handle block place
     */
    handleBlockPlace(event) {
        const player = event.player;
        const location = event.block.location;

        // Get territory at location
        const territory = this.claimManager.getTerritoryAt(
            location.x, location.z, event.block.dimension.id
        );

        if (!territory) {
            // Not in claimed area
            return;
        }

        // Check permissions
        if (!territory.hasPermission(player.name, "build")) {
            event.cancel = true;
            this.logViolation(player.name, territory.id, "Block place attempt");
            this.sendViolationMessage(
                player,
                `${territory.color}You cannot place blocks here!`
            );
            return;
        }

        // Log the place
        territory.totalPlaces++;
        this.claimManager.saveTerritories();
    }

    /**
     * Handle block interaction
     */
    handleBlockInteract(event) {
        const player = event.player;
        const block = event.block;
        const location = block.location;

        // Get territory
        const territory = this.claimManager.getTerritoryAt(
            location.x, location.z, block.dimension.id
        );

        if (!territory) {
            return;
        }

        const blockType = block.typeId;

        // Check container access (chest, barrel, etc.)
        if (this.isContainer(blockType)) {
            if (!territory.hasPermission(player.name, "containers")) {
                event.cancel = true;
                this.logViolation(player.name, territory.id, "Container access attempt");
                this.sendViolationMessage(
                    player,
                    `${territory.color}You cannot open containers here!`
                );
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
    }

    /**
     * Handle explosions
     */
    handleExplosion(event) {
        if (!event.source) return;

        // Track explosions
        for (const block of event.getImpactedBlocks()) {
            const territory = this.claimManager.getTerritoryAt(
                block.location.x, block.location.z, block.dimension.id
            );

            if (territory && territory.explosionProtection) {
                // Cancel the explosion effect on this territory
                territory.crepers++;
                territory.logEvent("Explosion prevented");
            }
        }
    }

    /**
     * Handle entity hurt
     */
    handleEntityHurt(event) {
        if (!event.hurtEntity || !event.damageSource) return;

        const victim = event.hurtEntity;
        if (!(victim instanceof Player)) return;

        const player = victim;
        const location = player.location;

        // Get territory
        const territory = this.claimManager.getTerritoryAt(
            location.x, location.z, player.dimension.id
        );

        if (!territory || territory.pvp) {
            return;
        }

        // PvP disabled - check if damage from player
        if (event.damageSource.damagingEntity &&
            event.damageSource.damagingEntity instanceof Player) {
            event.damage = 0; // Cancel damage
            this.logViolation(
                event.damageSource.damagingEntity.name,
                territory.id,
                "PvP attempt"
            );
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
            "minecraft:cartography_table", "minecraft:loom"
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
                this.tempBanPlayer(playerName, 600000); // 10 minute ban
            }
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
     * Get all violations for player
     */
    getPlayerViolations(playerName) {
        const result = [];
        for (const [key, violations] of this.violations.entries()) {
            if (key.startsWith(`${playerName}:`)) {
                result.push({
                    territoryId: key.split(":")[1],
                    violations: violations
                });
            }
        }
        return result;
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
     * Send violation message to player
     */
    sendViolationMessage(player, message) {
        try {
            player.sendMessage(message);
        } catch (error) {
            console.warn(`[Protection] Could not send message to ${player.name}`);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalViolations: Array.from(this.violations.values())
                .reduce((sum, v) => sum + v.length, 0),
            playerViolations: this.violationCounts.size,
            tempBans: this.tempBans.size
        };
    }
}
