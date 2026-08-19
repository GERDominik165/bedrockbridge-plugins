/**
 * 🧮 Vector3 - Professional 3D Vector Mathematics
 * Integrated from v1.2 LandClaim System
 * Enhanced for v2.0.0+ compatibility
 *
 * Provides 3D vector operations for:
 * - Particle positioning
 * - Distance calculations
 * - Boundary visualization
 * - Area detection
 */

import { world } from '@minecraft/server';

export class Vector3 {
    /**
     * Create a new Vector3
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Convert to array format
     * @returns {[number, number, number]} [x, y, z]
     */
    toArray() {
        return [this.x, this.y, this.z];
    }

    /**
     * Convert to string representation
     * @param {string} join - Separator character (default: space)
     * @returns {string} "x y z" or "x,y,z" etc
     */
    print(join = ' ') {
        return this.toArray().join(join);
    }

    /**
     * Calculate distance between two vectors
     * @param {Vector3} vector1 - First point
     * @param {Vector3} vector2 - Second point
     * @returns {number} Distance between points
     */
    static distance(vector1, vector2) {
        return Math.sqrt(
            Math.abs(vector1.x - vector2.x) ** 2 +
            Math.abs(vector1.y - vector2.y) ** 2 +
            Math.abs(vector1.z - vector2.z) ** 2
        );
    }

    /**
     * Subtract vector2 from vector1
     * @param {Vector3} vector1 - Minuend
     * @param {Vector3} vector2 - Subtrahend
     * @returns {Vector3} Result vector
     */
    static subtract(vector1, vector2) {
        return new Vector3(
            vector1.x - vector2.x,
            vector1.y - vector2.y,
            vector1.z - vector2.z
        );
    }

    /**
     * Add two vectors
     * @param {Vector3} vector1 - First vector
     * @param {Vector3} vector2 - Second vector
     * @returns {Vector3} Sum vector
     */
    static add(vector1, vector2) {
        return new Vector3(
            vector1.x + vector2.x,
            vector1.y + vector2.y,
            vector1.z + vector2.z
        );
    }

    /**
     * Multiply vector by scalar
     * @param {Vector3} vector - Vector to multiply
     * @param {number} value - Scalar multiplier
     * @returns {Vector3} Scaled vector
     */
    static multiply(vector, value) {
        return new Vector3(
            vector.x * value,
            vector.y * value,
            vector.z * value
        );
    }

    /**
     * Floor all components
     * @param {Vector3} vector - Vector to floor
     * @returns {Vector3} Floored vector
     */
    static floor(vector) {
        return new Vector3(
            Math.floor(vector.x),
            Math.floor(vector.y),
            Math.floor(vector.z)
        );
    }

    /**
     * Create vector from x,y,z values
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {object} Object with x,y,z properties
     */
    static from(x, y, z) {
        return { x, y, z };
    }

    /**
     * Calculate magnitude (length) of vector
     * @returns {number} Magnitude
     */
    magnitude() {
        return Math.sqrt(
            this.x * this.x +
            this.y * this.y +
            this.z * this.z
        );
    }

    /**
     * Normalize vector to unit vector
     * @returns {Vector3} Unit vector in same direction
     */
    normalized() {
        const mag = this.magnitude();
        return mag !== 0
            ? new Vector3(this.x / mag, this.y / mag, this.z / mag)
            : new Vector3(0, 0, 0);
    }

    /**
     * Get object representation
     * @returns {object} Object with x,y,z properties
     */
    toObject() {
        return { x: this.x, y: this.y, z: this.z };
    }

    /**
     * Clone this vector
     * @returns {Vector3} New Vector3 with same coordinates
     */
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * Check if two vectors are equal
     * @param {Vector3} other - Vector to compare
     * @returns {boolean} True if equal
     */
    equals(other) {
        return this.x === other.x &&
               this.y === other.y &&
               this.z === other.z;
    }

    /**
     * Dot product
     * @param {Vector3} other - Vector to dot with
     * @returns {number} Dot product result
     */
    dot(other) {
        return this.x * other.x +
               this.y * other.y +
               this.z * other.z;
    }

    /**
     * Cross product
     * @param {Vector3} other - Vector to cross with
     * @returns {Vector3} Cross product result
     */
    cross(other) {
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }

    /**
     * String representation for debugging
     * @returns {string} "Vector3(x, y, z)"
     */
    toString() {
        return `Vector3(${this.x}, ${this.y}, ${this.z})`;
    }
}

export default Vector3;
