/**
 * 🗄️ Storage System - Key-Value Database
 * Professional persistent storage using Scoreboards
 * Integrated from v1.2 LandClaim System
 * Enhanced for v2.0.0+ compatibility
 *
 * Features:
 * - Persistent key-value storage
 * - Supports strings, numbers, booleans, objects
 * - Automatic data recovery
 * - Atomic operations
 */

import { Scoreboard } from "./Scoreboard.js";

/**
 * Storage Class - Key-value database using scoreboards
 */
export class Storage {
    #storage = new Map();

    /**
     * Create new storage instance
     * @param {string} name - Storage identifier (unique per database)
     */
    constructor(name) {
        this.name = name;
        this.#storage = new Map();

        // Safe name for scoreboard objective
        this.objectiveName = `<storage: ${name.replace(/ %§/ig, '_')}>`;
        this.scoreboard = new Scoreboard(this.objectiveName);

        // Load existing data from scoreboard
        const participants = this.scoreboard.getParticipants();
        let deleted = 0;

        for (const participant of participants) {
            try {
                const object = this.#STRING2JSON(participant.displayName);
                this.#storage.set(object.key, object.value);
            } catch {
                // Clean up corrupted entries
                this.scoreboard.removeParticipant(participant.displayName);
                deleted++;
            }
        }

        if (deleted > 0) {
            console.error(`§fRemoved ${deleted} invalid entry(ies) from storage: §t ${this.objectiveName}`);
        }
    }

    /**
     * Get value by key
     * @param {string|number|boolean} key - The key
     * @returns {any|undefined} The value or undefined
     */
    get(key) {
        try {
            if (this.#isKeyInvalid(key)) throw 'Invalid key type at [storage.get]';
            return this.copyValue(this.#storage.get(key));
        } catch (error) {
            console.error(`Storage Error (${this.name}): ${error}`);
        }
    }

    /**
     * Get all keys
     * @returns {IterableIterator} Iterator of all keys
     */
    keys() {
        return this.#storage.keys();
    }

    /**
     * Get all values
     * @returns {IterableIterator} Iterator of all values
     */
    values() {
        return this.#storage.values();
    }

    /**
     * Get all entries
     * @returns {IterableIterator} Iterator of [key, value] pairs
     */
    entries() {
        return this.#storage.entries();
    }

    /**
     * Set value for key
     * @param {string|number|boolean} key - The key
     * @param {any} value - The value (string, number, boolean, or object)
     */
    set(key, value) {
        try {
            if (this.#isKeyInvalid(key)) throw 'Invalid key type at [storage.set]';
            if (this.#isValueInvalid(value)) throw 'Invalid value type at [storage.set]';

            // Delete old entry if exists
            if (this.has(key)) this.delete(key);

            // Store in memory
            this.#storage.set(key, value);

            // Persist to scoreboard
            this.#setInScoreboard(key, value);
        } catch (error) {
            console.error(`Storage Error (${this.name}): ${error}`);
        }
    }

    /**
     * Update value atomically
     * @param {string|number|boolean} key - The key
     * @param {(value) => any} callback - Function to transform value
     */
    overwrite(key, callback) {
        try {
            if (this.#isKeyInvalid(key)) throw 'Invalid key type at [storage.overwrite]';

            // Get current value
            let outputValue = callback(this.get(key));

            if (this.#isValueInvalid(outputValue)) throw 'Invalid value type at [storage.overwrite]';

            // Set atomically
            this.set(key, outputValue);
        } catch (error) {
            console.error(`Storage Error (${this.name}): ${error}`);
        }
    }

    /**
     * Check if key exists
     * @param {string|number|boolean} key - The key
     * @returns {boolean} True if exists
     */
    has(key) {
        try {
            if (this.#isKeyInvalid(key)) throw 'Invalid key type at [storage.has]';
            return this.#storage.has(key);
        } catch (error) {
            console.error(`Storage Error (${this.name}): ${error}`);
        }
    }

    /**
     * Delete key-value pair
     * @param {string|number|boolean} key - The key
     * @returns {boolean} True if deleted
     */
    delete(key) {
        try {
            if (this.#isKeyInvalid(key)) throw 'Invalid key type at [storage.delete]';

            if (this.has(key)) {
                const value = this.get(key);
                this.#deleteInScoreboard(key, value);
                this.#storage.delete(key);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Storage Error (${this.name}): ${error}`);
        }
    }

    /**
     * Clear all data
     */
    clear() {
        this.#storage.clear();
        this.scoreboard.clearParticipants();
    }

    /**
     * Get number of entries
     */
    get size() {
        return this.#storage.size;
    }

    /**
     * Copy value (deep copy for objects)
     * @param {any} value - Value to copy
     * @returns {any} Copied value
     * @private
     */
    copyValue(value) {
        const vT = typeof value;
        return vT === 'object'
            ? Array.isArray(value)
                ? [...value]
                : {...value}
            : value;
    }

    /**
     * Store in scoreboard
     * @param {string|number|boolean} key - The key
     * @param {any} value - The value
     * @private
     */
    #setInScoreboard(key, value) {
        const string = this.#JSON2STRING(key, value);
        this.scoreboard.setScore(string, 0);
    }

    /**
     * Remove from scoreboard
     * @param {string|number|boolean} key - The key
     * @param {any} value - The value
     * @private
     */
    #deleteInScoreboard(key, value) {
        const string = this.#JSON2STRING(key, value);
        this.scoreboard.removeParticipant(string);
    }

    /**
     * Convert JSON to scoreboard-safe string
     * @param {string|number|boolean} key - The key
     * @param {any} value - The value
     * @returns {string} Encoded string
     * @private
     */
    #JSON2STRING(key, value) {
        // Replace quotes with special character to avoid scoreboard issues
        return JSON.stringify({ key, value }).replace(/"/g, '‟');
    }

    /**
     * Convert string back to JSON
     * @param {string} string - Encoded string
     * @returns {object} Object with key and value
     * @private
     */
    #STRING2JSON(string) {
        return JSON.parse(string.replace(/‟/g, '"'));
    }

    /**
     * Validate key type
     * @param {any} key - Key to validate
     * @returns {boolean} True if invalid
     * @private
     */
    #validKeyTypes = ['string', 'number', 'boolean'];
    #isKeyInvalid(key) {
        return !this.#validKeyTypes.includes(typeof key);
    }

    /**
     * Validate value type
     * @param {any} value - Value to validate
     * @returns {boolean} True if invalid
     * @private
     */
    #validValueTypes = ['string', 'number', 'boolean', 'object'];
    #isValueInvalid(value) {
        return !this.#validValueTypes.includes(typeof value);
    }

    /**
     * Get all data as plain object (for backup)
     * @returns {object} All data
     */
    toJSON() {
        const result = {};
        for (const [key, value] of this.#storage.entries()) {
            result[key] = this.copyValue(value);
        }
        return result;
    }

    /**
     * Load data from plain object (for restore)
     * @param {object} data - Data to load
     */
    fromJSON(data) {
        this.clear();
        for (const [key, value] of Object.entries(data)) {
            this.set(key, value);
        }
    }

    /**
     * Get statistics
     * @returns {object} Size and other info
     */
    getStats() {
        return {
            name: this.name,
            size: this.size,
            storageName: this.objectiveName,
            keys: Array.from(this.keys()),
        };
    }
}

export default Storage;
