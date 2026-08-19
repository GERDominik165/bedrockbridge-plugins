/**
 * ✨ LANDCLAIM MEGA - Particle Visualizer
 * Territory boundary visualization with particles and effects
 * @version 3.0.0
 */

import { world } from "@minecraft/server";

export class ParticleVisualizer {
    constructor() {
        this.CONFIG = {
            particleTypes: {
                boundary: "minecraft:endrod",  // Green/blue line
                corners: "minecraft:villager_happy",  // Green sparkle
                center: "minecraft:wither_boss_invulnerable",  // Dark particle
                success: "minecraft:totem_powered_power_level_up",  // Green/purple
                danger: "minecraft:wither_hurt_flash",  // Red/dark
                claim: "minecraft:endrod"
            },
            particleScale: 1.0,
            lineThickness: 4 // particles per edge
        };

        this.activeVisualizations = new Map(); // playerId -> {claimId, startTime, duration}
    }

    /**
     * Show claim boundary to player
     */
    showClaimBoundary(player, territory, durationSeconds = 30) {
        if (!player.isValid()) return false;

        const corners = territory.getCorners();
        const center = territory.getCenter();

        // Show corner particles
        this.showCornerParticles(player, corners);

        // Show center particle
        this.showCenterParticle(player, center);

        // Show boundary outline
        this.showBoundaryOutline(player, corners);

        // Track visualization
        const visualId = `${player.name}:${territory.id}`;
        this.activeVisualizations.set(visualId, {
            claimId: territory.id,
            startTime: Date.now(),
            duration: durationSeconds * 1000
        });

        return true;
    }

    /**
     * Show corner particles
     */
    showCornerParticles(player, corners) {
        const cornerPoints = [
            { x: corners.northwest.x, z: corners.northwest.z },
            { x: corners.northeast.x, z: corners.northeast.z },
            { x: corners.southwest.x, z: corners.southwest.z },
            { x: corners.southeast.x, z: corners.southeast.z }
        ];

        for (const corner of cornerPoints) {
            try {
                // Find ground level at this location
                const dimension = player.dimension;
                const y = player.location.y; // Use player height for now

                world.playSound(
                    this.CONFIG.particleTypes.corners,
                    { x: corner.x, y: y, z: corner.z },
                    { volume: 0.3, pitch: 1.0 }
                );
            } catch (error) {
                // Sound failed silently
            }
        }
    }

    /**
     * Show center particle
     */
    showCenterParticle(player, center) {
        try {
            const y = player.location.y;

            world.playSound(
                this.CONFIG.particleTypes.center,
                { x: center.x, y: y, z: center.z },
                { volume: 0.5, pitch: 1.2 }
            );
        } catch (error) {
            // Fallback silently
        }
    }

    /**
     * Show boundary outline
     */
    showBoundaryOutline(player, corners) {
        // Draw lines between corners
        const edges = [
            { from: corners.northwest, to: corners.northeast },
            { from: corners.northeast, to: corners.southeast },
            { from: corners.southeast, to: corners.southwest },
            { from: corners.southwest, to: corners.northwest }
        ];

        const y = player.location.y;

        for (const edge of edges) {
            this.drawLine(player, edge.from, edge.to, y);
        }
    }

    /**
     * Draw a line between two points using particles
     */
    drawLine(player, from, to, y) {
        const distance = Math.hypot(to.x - from.x, to.z - from.z);
        const steps = Math.ceil(distance / 2); // 2 blocks between particles

        for (let i = 0; i <= steps; i++) {
            const progress = steps > 0 ? i / steps : 0;
            const x = from.x + (to.x - from.x) * progress;
            const z = from.z + (to.z - from.z) * progress;

            try {
                world.playSound(
                    this.CONFIG.particleTypes.boundary,
                    { x: x, y: y, z: z },
                    { volume: 0.2, pitch: 1.0 }
                );
            } catch (error) {
                // Continue on error
            }
        }
    }

    /**
     * Show success effect
     */
    showSuccessEffect(player, location) {
        try {
            world.playSound(
                this.CONFIG.particleTypes.success,
                location,
                { volume: 0.7, pitch: 1.5 }
            );
        } catch (error) {
            // Silent fail
        }
    }

    /**
     * Show danger effect
     */
    showDangerEffect(player, location) {
        try {
            world.playSound(
                this.CONFIG.particleTypes.danger,
                location,
                { volume: 0.7, pitch: 0.8 }
            );
        } catch (error) {
            // Silent fail
        }
    }

    /**
     * Show claim created effect
     */
    showClaimCreatedEffect(player, territory) {
        const center = territory.getCenter();
        const y = player.location.y;

        // Show explosion-like effect at center
        this.showSuccessEffect(player, { x: center.x, y: y, z: center.z });

        // Show corners
        this.showCornerParticles(player, territory.getCorners());
    }

    /**
     * Show claim deleted effect
     */
    showClaimDeletedEffect(player, territory) {
        const center = territory.getCenter();
        const y = player.location.y;

        // Show danger effect at center
        this.showDangerEffect(player, { x: center.x, y: y, z: center.z });
    }

    /**
     * Show member added effect
     */
    showMemberAddedEffect(player, location) {
        this.showSuccessEffect(player, location);
    }

    /**
     * Show access denied effect
     */
    showAccessDeniedEffect(player, location) {
        this.showDangerEffect(player, location);
    }

    /**
     * Get nearest territory outline
     */
    getNearestTerritoryOutline(player, claimManager, range = 256) {
        const nearby = claimManager.getNearbyClaimsAt(
            player.location.x,
            player.location.z,
            player.dimension.id,
            range
        );

        if (nearby.length > 0) {
            return nearby[0].territory;
        }

        return null;
    }

    /**
     * Clean up finished visualizations
     */
    cleanupVisualizations() {
        const now = Date.now();
        const toRemove = [];

        for (const [id, data] of this.activeVisualizations.entries()) {
            if (now - data.startTime > data.duration) {
                toRemove.push(id);
            }
        }

        for (const id of toRemove) {
            this.activeVisualizations.delete(id);
        }

        return toRemove.length;
    }

    /**
     * Flash territory boundary
     */
    flashBoundary(player, territory, times = 3) {
        const corners = territory.getCorners();
        const center = territory.getCenter();

        for (let i = 0; i < times; i++) {
            setTimeout(() => {
                this.showBoundaryOutline(player, corners);
            }, i * 300);
        }
    }

    /**
     * Highlight claim on map (conceptual)
     */
    getClaimVisualization(territory) {
        const corners = territory.getCorners();
        const center = territory.getCenter();

        return {
            name: territory.name,
            owner: territory.ownerName,
            center: center,
            corners: corners,
            radius: territory.radius,
            dimension: territory.dimension,
            color: territory.color
        };
    }
}
