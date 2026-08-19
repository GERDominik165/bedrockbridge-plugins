/**
 * ConfigManager - Settings management
 */

class ConfigManager {
    constructor() {
        this.config = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            plugin: {
                name: 'ChatRank++',
                version: '2.0.0',
                enabled: true
            },
            chat: {
                format: {
                    timestamp: true,
                    dimension: true,
                    coordinates: false,
                    biome: false,
                    gamemode: false,
                    health: false
                },
                cooldown: 1000,
                maxLength: 256
            },
            moderation: {
                antiSpam: true,
                antiFlood: true,
                wordFilter: true,
                maxMessagesPerMinute: 10
            },
            discord: {
                enabled: false,
                webhookUrl: '',
                chatRelay: true,
                eventNotifications: true
            },
            database: {
                autoSave: true,
                autoSaveInterval: 60000
            },
            ranks: {
                defaultRank: 'member',
                showPrefix: true,
                showSuffix: true
            },
            clans: {
                enabled: true,
                maxMembers: 20,
                requireInvite: true
            }
        };
    }

    get(path) {
        const parts = path.split('.');
        let value = this.config;
        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) return null;
        }
        return value;
    }

    set(path, value) {
        const parts = path.split('.');
        const last = parts.pop();
        let obj = this.config;
        for (const part of parts) {
            if (!obj[part]) obj[part] = {};
            obj = obj[part];
        }
        obj[last] = value;
    }

    reset() {
        this.config = this.getDefaultConfig();
    }

    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }

    importConfig(jsonData) {
        try {
            this.config = JSON.parse(jsonData);
            return true;
        } catch (error) {
            return false;
        }
    }

    saveToDatabase(db) {
        db.set('configManager', JSON.stringify(this.config));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('configManager') || '{}');
            this.config = { ...this.getDefaultConfig(), ...data };
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = ConfigManager;
