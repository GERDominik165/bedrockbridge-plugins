/**
 * MuteManager - Handle player muting and unmuting
 */

class MuteManager {
    constructor() {
        this.mutedPlayers = new Map();
        this.muteHistory = [];
    }

    /**
     * Mute a player
     */
    mutePlayer(playerName, reason, duration, moderator) {
        const name = playerName.toLowerCase();
        const muteData = {
            playerName: playerName,
            reason: reason || 'No reason provided',
            mutedAt: Date.now(),
            duration: duration || null, // null = permanent
            expiresAt: duration ? Date.now() + duration : null,
            moderator: moderator,
            active: true
        };

        this.mutedPlayers.set(name, muteData);
        this.muteHistory.push({ ...muteData, action: 'mute' });

        return muteData;
    }

    /**
     * Unmute a player
     */
    unmutePlayer(playerName, moderator) {
        const name = playerName.toLowerCase();
        const muteData = this.mutedPlayers.get(name);

        if (!muteData) return false;

        muteData.active = false;
        muteData.unmutedAt = Date.now();
        muteData.unmutedBy = moderator;

        this.mutedPlayers.delete(name);
        this.muteHistory.push({
            playerName: playerName,
            action: 'unmute',
            moderator: moderator,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Check if player is muted
     */
    isMuted(playerName) {
        const name = playerName.toLowerCase();
        const muteData = this.mutedPlayers.get(name);

        if (!muteData) return false;

        // Check if temporary mute has expired
        if (muteData.expiresAt && Date.now() >= muteData.expiresAt) {
            this.unmutePlayer(playerName, 'System (Auto-expire)');
            return false;
        }

        return muteData.active;
    }

    /**
     * Get mute data for player
     */
    getMuteData(playerName) {
        return this.mutedPlayers.get(playerName.toLowerCase());
    }

    /**
     * Get all muted players
     */
    getMutedPlayers() {
        return Array.from(this.mutedPlayers.values());
    }

    /**
     * Get mute history
     */
    getMuteHistory(playerName = null) {
        if (playerName) {
            return this.muteHistory.filter(h =>
                h.playerName.toLowerCase() === playerName.toLowerCase()
            );
        }
        return this.muteHistory;
    }

    /**
     * Get time remaining for mute
     */
    getTimeRemaining(playerName) {
        const muteData = this.mutedPlayers.get(playerName.toLowerCase());
        if (!muteData || !muteData.expiresAt) return null;

        const remaining = muteData.expiresAt - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    /**
     * Format time remaining
     */
    formatTimeRemaining(playerName) {
        const remaining = this.getTimeRemaining(playerName);
        if (remaining === null) return 'Permanent';
        if (remaining === 0) return 'Expired';

        const seconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Save to database
     */
    saveToDatabase(db) {
        const data = {
            mutedPlayers: Array.from(this.mutedPlayers.entries()),
            muteHistory: this.muteHistory
        };
        db.set('muteManager', JSON.stringify(data));
    }

    /**
     * Load from database
     */
    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('muteManager') || '{}');
            if (data.mutedPlayers) {
                this.mutedPlayers = new Map(data.mutedPlayers);
            }
            if (data.muteHistory) {
                this.muteHistory = data.muteHistory;
            }
            return true;
        } catch (error) {
            console.error('Failed to load mute data:', error);
            return false;
        }
    }
}

export default MuteManager;
