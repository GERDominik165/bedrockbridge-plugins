/**
 * 🛡️ Area Protection Utilities
 * Advanced area detection and boundary checking
 * Integrated from v1.2 LandClaim System
 * Enhanced for v2.0.0+ compatibility
 *
 * Provides:
 * - Point-in-area detection
 * - Block location checking
 * - Area boundary calculations
 * - Intersection detection
 */

import { BlockVolume } from "@minecraft/server";
import Vector3 from "../utils/Vector3.js";

/**
 * Area boundary box definition
 */
export class Area {
    /**
     * Create area boundary from block volume
     * @param {object} AreaBox - Box with from and to coordinates
     */
    constructor(AreaBox) {
        // Calculate min/max for each axis
        this.left = Math.min(AreaBox.from.x, AreaBox.to.x);
        this.right = Math.max(AreaBox.from.x, AreaBox.to.x);
        this.back = Math.min(AreaBox.from.z, AreaBox.to.z);
        this.front = Math.max(AreaBox.from.z, AreaBox.to.z);
        this.bottom = Math.min(AreaBox.from.y, AreaBox.to.y);
        this.top = Math.max(AreaBox.from.y, AreaBox.to.y);
    }
}

/**
 * Area Utilities - Static methods for area operations
 */
export class AreaUtils {
    /**
     * Check if a block location is inside an area
     * @param {object} BlockLocation - Block location {x, y, z}
     * @param {Area} Area - Area boundary
     * @returns {boolean} True if inside area
     */
    static isInside(BlockLocation, Area) {
        return (
            BlockLocation.x >= Area.left &&
            BlockLocation.x <= Area.right &&
            BlockLocation.z <= Area.front &&
            BlockLocation.z >= Area.back &&
            BlockLocation.y >= Area.bottom &&
            BlockLocation.y <= Area.top
        );
    }

    /**
     * Get area from block location
     * @param {object} BlockLocation - Block location {x, y, z}
     * @param {Array} AreaArray - Array of area objects
     * @returns {object|undefined} The containing area or undefined
     */
    static getAreaFromBlockLocation(BlockLocation, AreaArray) {
        return AreaArray.find(
            (area) =>
                BlockLocation.x >= new Area(area).left &&
                BlockLocation.x <= new Area(area).right &&
                BlockLocation.z <= new Area(area).front &&
                BlockLocation.z >= new Area(area).back &&
                BlockLocation.y >= new Area(area).bottom &&
                BlockLocation.y <= new Area(area).top
        );
    }

    /**
     * Check if two areas intersect
     * @param {Area} AreaA - First area
     * @param {Area} AreaB - Second area
     * @returns {boolean} True if areas intersect
     */
    static intersects(AreaA, AreaB) {
        // No intersection if one is completely outside the other
        if (
            AreaA.right < AreaB.left ||
            AreaA.left > AreaB.right ||
            AreaA.front < AreaB.back ||
            AreaA.back > AreaB.front ||
            AreaA.top < AreaB.bottom ||
            AreaA.bottom > AreaB.top
        ) {
            return false;
        }
        return true;
    }

    /**
     * Check if block is on area boundary
     * @param {object} BlockLocation - Block location {x, y, z}
     * @param {Area} Area - Area boundary
     * @returns {boolean} True if on boundary
     */
    static isOnBoundary(BlockLocation, Area) {
        return (
            (BlockLocation.x === Area.left || BlockLocation.x === Area.right) &&
            BlockLocation.y >= Area.bottom && BlockLocation.y <= Area.top &&
            BlockLocation.z >= Area.back && BlockLocation.z <= Area.front
        ) ||
        (
            (BlockLocation.z === Area.back || BlockLocation.z === Area.front) &&
            BlockLocation.y >= Area.bottom && BlockLocation.y <= Area.top &&
            BlockLocation.x >= Area.left && BlockLocation.x <= Area.right
        ) ||
        (
            (BlockLocation.y === Area.bottom || BlockLocation.y === Area.top) &&
            BlockLocation.x >= Area.left && BlockLocation.x <= Area.right &&
            BlockLocation.z >= Area.back && BlockLocation.z <= Area.front
        );
    }

    /**
     * Get distance from point to area boundary
     * @param {Vector3|object} point - Point to check
     * @param {Area} area - Area boundary
     * @returns {number} Distance to nearest boundary
     */
    static distanceToBoundary(point, area) {
        const dx = Math.max(area.left - point.x, 0, point.x - area.right);
        const dy = Math.max(area.bottom - point.y, 0, point.y - area.top);
        const dz = Math.max(area.back - point.z, 0, point.z - area.front);

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Get area dimensions
     * @param {Area} area - Area boundary
     * @returns {object} Width, height, depth, volume
     */
    static getDimensions(area) {
        return {
            width: area.right - area.left + 1,
            depth: area.front - area.back + 1,
            height: area.top - area.bottom + 1,
            volume: (area.right - area.left + 1) * (area.front - area.back + 1) * (area.top - area.bottom + 1),
        };
    }

    /**
     * Get area center point
     * @param {Area} area - Area boundary
     * @returns {Vector3} Center point
     */
    static getCenter(area) {
        return new Vector3(
            (area.left + area.right) / 2,
            (area.bottom + area.top) / 2,
            (area.back + area.front) / 2
        );
    }

    /**
     * Get corner coordinates
     * @param {Area} area - Area boundary
     * @returns {object} All 8 corner points
     */
    static getCorners(area) {
        return {
            corner1: new Vector3(area.left, area.bottom, area.back),    // Min/Min/Min
            corner2: new Vector3(area.right, area.bottom, area.back),   // Max/Min/Min
            corner3: new Vector3(area.left, area.top, area.back),       // Min/Max/Min
            corner4: new Vector3(area.right, area.top, area.back),      // Max/Max/Min
            corner5: new Vector3(area.left, area.bottom, area.front),   // Min/Min/Max
            corner6: new Vector3(area.right, area.bottom, area.front),  // Max/Min/Max
            corner7: new Vector3(area.left, area.top, area.front),      // Min/Max/Max
            corner8: new Vector3(area.right, area.top, area.front),     // Max/Max/Max
        };
    }

    /**
     * Check if block volume intersects with area
     * @param {BlockVolume} volume - BlockVolume to check
     * @param {Area} area - Area boundary
     * @returns {boolean} True if intersects
     */
    static blockVolumeIntersects(volume, area) {
        try {
            const areaVolume = new BlockVolume(
                { x: area.left, y: area.bottom, z: area.back },
                { x: area.right, y: area.top, z: area.front }
            );
            return volume.intersects(areaVolume) !== 0;
        } catch (e) {
            console.error(`BlockVolume intersection check failed: ${e.message}`);
            return false;
        }
    }

    /**
     * Get all block locations in area (WARNING: Memory intensive for large areas!)
     * @param {Area} area - Area boundary
     * @param {number} step - Step size (default: 1)
     * @returns {Array} Array of block locations
     */
    static getBlockLocations(area, step = 1) {
        const locations = [];

        for (let x = area.left; x <= area.right; x += step) {
            for (let y = area.bottom; y <= area.top; y += step) {
                for (let z = area.back; z <= area.front; z += step) {
                    locations.push({ x, y, z });
                }
            }
        }

        return locations;
    }

    /**
     * Expand area by amount
     * @param {Area} area - Original area
     * @param {number} amount - Amount to expand
     * @returns {Area} New expanded area
     */
    static expand(area, amount) {
        return {
            left: area.left - amount,
            right: area.right + amount,
            top: area.top + amount,
            bottom: area.bottom - amount,
            front: area.front + amount,
            back: area.back - amount,
        };
    }

    /**
     * Shrink area by amount
     * @param {Area} area - Original area
     * @param {number} amount - Amount to shrink
     * @returns {Area} New shrunk area
     */
    static shrink(area, amount) {
        return this.expand(area, -amount);
    }

    /**
     * Check if area is valid
     * @param {Area} area - Area to validate
     * @returns {boolean} True if valid
     */
    static isValid(area) {
        return (
            area.left <= area.right &&
            area.bottom <= area.top &&
            area.back <= area.front &&
            !isNaN(area.left) &&
            !isNaN(area.right) &&
            !isNaN(area.bottom) &&
            !isNaN(area.top) &&
            !isNaN(area.back) &&
            !isNaN(area.front)
        );
    }

    /**
     * Get area as object (for storage)
     * @param {Area} area - Area boundary
     * @returns {object} Serializable area object
     */
    static toObject(area) {
        return {
            from: { x: area.left, y: area.bottom, z: area.back },
            to: { x: area.right, y: area.top, z: area.front },
        };
    }
}

export default AreaUtils;
