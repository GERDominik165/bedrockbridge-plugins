/**
 * HealthDisplayManager - Manage health display settings
 */

class HealthDisplayManager {
    constructor() {
        this.settings = new Map();
    }

    enableHealthDisplay(playerName) {
        this.settings.set(playerName.toLowerCase(), { enabled: true });
    }

    disableHealthDisplay(playerName) {
        this.settings.set(playerName.toLowerCase(), { enabled: false });
    }

    isEnabled(playerName) {
        const setting = this.settings.get(playerName.toLowerCase());
        return setting?.enabled ?? true; // Default enabled
    }

    saveToDatabase(db) {
        db.set('healthDisplayManager', JSON.stringify(Array.from(this.settings.entries())));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('healthDisplayManager') || '[]');
            this.settings = new Map(data);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default HealthDisplayManager;
