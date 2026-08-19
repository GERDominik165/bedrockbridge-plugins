/**
 * PlayerInfoManager - Track and manage player information
 */

class PlayerInfoManager {
    constructor() {
        this.playerData = new Map();
        this.sessionData = new Map();
    }

    /**
     * Update player data
     */
    updatePlayer(player) {
        const name = player.name.toLowerCase();
        const now = Date.now();

        if (!this.playerData.has(name)) {
            this.playerData.set(name, {
                name: player.name,
                uuid: player.id || 'unknown',
                firstSeen: now,
                lastSeen: now,
                totalPlaytime: 0,
                messageCount: 0,
                commandCount: 0
            });
        }

        const data = this.playerData.get(name);
        data.lastSeen = now;
        data.location = player.location;
        data.dimension = player.dimension;
        data.gamemode = player.gameMode;
        data.health = player.health;

        // Update session data
        if (!this.sessionData.has(name)) {
            this.sessionData.set(name, {
                joinTime: now,
                messagesSent: 0,
                commandsUsed: 0
            });
        }
    }

    /**
     * Get player data
     */
    getPlayerData(playerName) {
        return this.playerData.get(playerName.toLowerCase());
    }

    /**
     * Get dimension for player
     */
    getDimension(player) {
        return player.dimension?.id || 'overworld';
    }

    /**
     * Get biome for player
     */
    getBiome(player) {
        // In real implementation, would query world data
        return 'plains';
    }

    /**
     * Increment message count
     */
    incrementMessages(playerName) {
        const name = playerName.toLowerCase();
        const data = this.playerData.get(name);
        const session = this.sessionData.get(name);

        if (data) data.messageCount++;
        if (session) session.messagesSent++;
    }

    /**
     * Increment command count
     */
    incrementCommands(playerName) {
        const name = playerName.toLowerCase();
        const data = this.playerData.get(name);
        const session = this.sessionData.get(name);

        if (data) data.commandCount++;
        if (session) session.commandsUsed++;
    }

    /**
     * Get session data
     */
    getSessionData(playerName) {
        return this.sessionData.get(playerName.toLowerCase());
    }

    /**
     * Clear session data (on logout)
     */
    clearSession(playerName) {
        const name = playerName.toLowerCase();
        const session = this.sessionData.get(name);
        const data = this.playerData.get(name);

        if (session && data) {
            const sessionTime = Date.now() - session.joinTime;
            data.totalPlaytime += sessionTime;
        }

        this.sessionData.delete(name);
    }

    /**
     * Get all online players
     */
    getOnlinePlayers() {
        return Array.from(this.sessionData.keys());
    }

    /**
     * Get player statistics
     */
    getStatistics(playerName) {
        const data = this.playerData.get(playerName.toLowerCase());
        const session = this.sessionData.get(playerName.toLowerCase());

        if (!data) return null;

        return {
            ...data,
            currentSession: session,
            isOnline: !!session
        };
    }

    /**
     * Save to database
     */
    saveToDatabase(db) {
        const data = {
            playerData: Array.from(this.playerData.entries())
        };
        db.set('playerInfoManager', JSON.stringify(data));
    }

    /**
     * Load from database
     */
    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('playerInfoManager') || '{}');
            if (data.playerData) {
                this.playerData = new Map(data.playerData);
            }
            return true;
        } catch (error) {
            console.error('Failed to load player info data:', error);
            return false;
        }
    }
}

export default PlayerInfoManager;
