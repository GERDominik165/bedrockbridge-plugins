/**
 * AdvancedCooldownManager - Cooldown system for commands
 */

class AdvancedCooldownManager {
    constructor() {
        this.cooldowns = new Map();
        this.bypasses = new Set();
    }

    setCooldown(playerName, command, duration) {
        const key = `${playerName.toLowerCase()}:${command}`;
        this.cooldowns.set(key, Date.now() + duration);
    }

    isOnCooldown(playerName, command) {
        if (this.bypasses.has(playerName.toLowerCase())) return false;
        const key = `${playerName.toLowerCase()}:${command}`;
        const expiry = this.cooldowns.get(key);
        return expiry && Date.now() < expiry;
    }

    getTimeRemaining(playerName, command) {
        const key = `${playerName.toLowerCase()}:${command}`;
        const expiry = this.cooldowns.get(key);
        if (!expiry) return 0;
        return Math.max(0, expiry - Date.now());
    }

    addBypass(playerName) {
        this.bypasses.add(playerName.toLowerCase());
    }

    removeBypass(playerName) {
        this.bypasses.delete(playerName.toLowerCase());
    }

    clearCooldown(playerName, command) {
        const key = `${playerName.toLowerCase()}:${command}`;
        this.cooldowns.delete(key);
    }
}

module.exports = AdvancedCooldownManager;
