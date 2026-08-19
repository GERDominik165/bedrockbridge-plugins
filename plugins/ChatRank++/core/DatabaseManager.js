import { world } from "@minecraft/server";
/**
 * DatabaseManager - Persistent data storage
 */

class DatabaseManager {
    constructor() {
        this.data = new Map();
        this.autoSaveInterval = 60000; // 1 minute
        this.lastSave = Date.now();
    }

    set(key, value) {
        this.data.set(key, value);
    }

    get(key, defaultValue = null) {
        return this.data.get(key) || defaultValue;
    }

    has(key) {
        return this.data.has(key);
    }

    delete(key) {
        return this.data.delete(key);
    }

    clear() {
        this.data.clear();
    }

    keys() {
        return Array.from(this.data.keys());
    }

    async save() {
        try { world.setDynamicProperty('chatrankpp:db', this.exportData()); } catch (e) {}
        this.lastSave = Date.now();
        return true;
    }

    async load() {
        try { const raw = world.getDynamicProperty('chatrankpp:db'); if (typeof raw === 'string' && raw) this.importData(raw); } catch (e) {}
        return true;
    }

    exportData() {
        return JSON.stringify(Array.from(this.data.entries()), null, 2);
    }

    importData(jsonData) {
        try {
            const entries = JSON.parse(jsonData);
            this.data = new Map(entries);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default DatabaseManager;
