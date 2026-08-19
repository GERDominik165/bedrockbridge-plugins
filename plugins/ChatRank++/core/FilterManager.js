/**
 * FilterManager - Word filtering and moderation
 */

class FilterManager {
    constructor() {
        this.blockedWords = new Set();
        this.whitelistedPlayers = new Set();
        this.filterEnabled = true;
        this.initializeDefaultFilters();
    }

    initializeDefaultFilters() {
        // Add common inappropriate words (simplified for example)
        ['spam', 'badword1', 'badword2'].forEach(word => this.blockedWords.add(word));
    }

    addBlockedWord(word) {
        this.blockedWords.add(word.toLowerCase());
    }

    removeBlockedWord(word) {
        this.blockedWords.delete(word.toLowerCase());
    }

    filterMessage(message) {
        if (!this.filterEnabled) return { filtered: message, blocked: false };

        let filtered = message;
        let blocked = false;

        for (const word of this.blockedWords) {
            const regex = new RegExp(word, 'gi');
            if (regex.test(filtered)) {
                filtered = filtered.replace(regex, '*'.repeat(word.length));
                blocked = true;
            }
        }

        return { filtered, blocked };
    }

    isPlayerWhitelisted(playerName) {
        return this.whitelistedPlayers.has(playerName.toLowerCase());
    }

    whitelistPlayer(playerName) {
        this.whitelistedPlayers.add(playerName.toLowerCase());
    }

    unwhitelistPlayer(playerName) {
        this.whitelistedPlayers.delete(playerName.toLowerCase());
    }

    saveToDatabase(db) {
        db.set('filterManager', JSON.stringify({
            blockedWords: Array.from(this.blockedWords),
            whitelistedPlayers: Array.from(this.whitelistedPlayers),
            filterEnabled: this.filterEnabled
        }));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('filterManager') || '{}');
            if (data.blockedWords) this.blockedWords = new Set(data.blockedWords);
            if (data.whitelistedPlayers) this.whitelistedPlayers = new Set(data.whitelistedPlayers);
            if (data.filterEnabled !== undefined) this.filterEnabled = data.filterEnabled;
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default FilterManager;
