/**
 * CustomNameManager - Manage custom display names for players
 */

class CustomNameManager {
    constructor() {
        this.customNames = new Map();
        this.nameHistory = new Map();
    }

    /**
     * Set custom name for player
     */
    setCustomName(playerName, customName, setBy) {
        const name = playerName.toLowerCase();
        const oldName = this.customNames.get(name);

        this.customNames.set(name, {
            original: playerName,
            custom: customName,
            setBy: setBy,
            setAt: Date.now()
        });

        // Track history
        const history = this.nameHistory.get(name) || [];
        history.push({
            from: oldName?.custom || playerName,
            to: customName,
            setBy: setBy,
            timestamp: Date.now()
        });
        this.nameHistory.set(name, history);

        return true;
    }

    /**
     * Remove custom name
     */
    removeCustomName(playerName) {
        const name = playerName.toLowerCase();
        const data = this.customNames.get(name);

        if (!data) return false;

        this.customNames.delete(name);

        // Track in history
        const history = this.nameHistory.get(name) || [];
        history.push({
            from: data.custom,
            to: data.original,
            action: 'removed',
            timestamp: Date.now()
        });
        this.nameHistory.set(name, history);

        return true;
    }

    /**
     * Get custom name for player
     */
    getCustomName(playerName) {
        const data = this.customNames.get(playerName.toLowerCase());
        return data?.custom || playerName;
    }

    /**
     * Check if player has custom name
     */
    hasCustomName(playerName) {
        return this.customNames.has(playerName.toLowerCase());
    }

    /**
     * Get custom name data
     */
    getCustomNameData(playerName) {
        return this.customNames.get(playerName.toLowerCase());
    }

    /**
     * Get all custom names
     */
    getAllCustomNames() {
        return Array.from(this.customNames.entries()).map(([key, data]) => ({
            player: key,
            ...data
        }));
    }

    /**
     * Get name history for player
     */
    getNameHistory(playerName) {
        return this.nameHistory.get(playerName.toLowerCase()) || [];
    }

    /**
     * Search custom names
     */
    searchCustomNames(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const [key, data] of this.customNames.entries()) {
            if (data.original.toLowerCase().includes(lowerQuery) ||
                data.custom.toLowerCase().includes(lowerQuery)) {
                results.push({ player: key, ...data });
            }
        }

        return results;
    }

    /**
     * Validate custom name
     */
    validateCustomName(customName) {
        const errors = [];

        if (customName.length < 3) {
            errors.push('Name must be at least 3 characters');
        }

        if (customName.length > 16) {
            errors.push('Name must be at most 16 characters');
        }

        if (!/^[a-zA-Z0-9_§&]+$/.test(customName)) {
            errors.push('Name contains invalid characters');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Save to database
     */
    saveToDatabase(db) {
        const data = {
            customNames: Array.from(this.customNames.entries()),
            nameHistory: Array.from(this.nameHistory.entries())
        };
        db.set('customNameManager', JSON.stringify(data));
    }

    /**
     * Load from database
     */
    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('customNameManager') || '{}');
            if (data.customNames) {
                this.customNames = new Map(data.customNames);
            }
            if (data.nameHistory) {
                this.nameHistory = new Map(data.nameHistory);
            }
            return true;
        } catch (error) {
            console.error('Failed to load custom name data:', error);
            return false;
        }
    }
}

export default CustomNameManager;
