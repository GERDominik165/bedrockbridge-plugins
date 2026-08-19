/**
 * HideVisibilityManager - Control player visibility
 */

class HideVisibilityManager {
    constructor() {
        this.hiddenPlayers = new Map();
    }

    hidePlayer(playerName, setBy) {
        this.hiddenPlayers.set(playerName.toLowerCase(), {
            hidden: true,
            setBy,
            setAt: Date.now()
        });
    }

    showPlayer(playerName) {
        this.hiddenPlayers.delete(playerName.toLowerCase());
    }

    isHidden(playerName) {
        return this.hiddenPlayers.has(playerName.toLowerCase());
    }

    saveToDatabase(db) {
        db.set('hideVisibilityManager', JSON.stringify(Array.from(this.hiddenPlayers.entries())));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('hideVisibilityManager') || '[]');
            this.hiddenPlayers = new Map(data);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default HideVisibilityManager;
