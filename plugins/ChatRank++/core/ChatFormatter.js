/**
 * ChatFormatter - Complete chat formatting system
 * Handles all chat message formatting, colors, and effects
 */

class ChatFormatter {
    constructor(rankManager, playerInfoManager) {
        this.rankManager = rankManager;
        this.playerInfoManager = playerInfoManager;
        this.formatOptions = {
            timestamp: true,
            dimension: true,
            coordinates: false,
            biome: false,
            gamemode: false,
            health: false,
            ping: false
        };
        this.colorEffects = new Map();
        this.gradients = this.initializeGradients();
    }

    /**
     * Initialize color gradients
     */
    initializeGradients() {
        return {
            rainbow: ['§c', '§6', '§e', '§a', '§b', '§9', '§d'],
            fire: ['§c', '§6', '§e', '§f'],
            ocean: ['§1', '§3', '§b', '§f'],
            forest: ['§2', '§a', '§e', '§f'],
            sunset: ['§5', '§d', '§6', '§e'],
            ice: ['§b', '§3', '§f', '§7'],
            toxic: ['§2', '§a', '§e', '§6'],
            blood: ['§4', '§c', '§6', '§e'],
            gold: ['§6', '§e', '§f', '§6'],
            purple: ['§5', '§d', '§f', '§d'],
            blue: ['§1', '§9', '§3', '§b'],
            yellow: ['§e', '§6', '§e', '§f'],
            black: ['§0', '§8', '§7', '§f'],
            glitch: ['§k§c', '§k§a', '§k§e', '§k§b']
        };
    }

    /**
     * Format complete chat message
     */
    formatMessage(player, message, options = {}) {
        const opts = { ...this.formatOptions, ...options };
        const parts = [];

        // Timestamp
        if (opts.timestamp) {
            parts.push(this.formatTimestamp());
        }

        // Dimension
        if (opts.dimension) {
            parts.push(this.formatDimension(player));
        }

        // Coordinates
        if (opts.coordinates) {
            parts.push(this.formatCoordinates(player));
        }

        // Biome
        if (opts.biome) {
            parts.push(this.formatBiome(player));
        }

        // Gamemode
        if (opts.gamemode) {
            parts.push(this.formatGamemode(player));
        }

        // Health
        if (opts.health) {
            parts.push(this.formatHealth(player));
        }

        // Rank and name
        parts.push(this.formatPlayerName(player));

        // Message with color effects
        parts.push('§f:§r ' + this.applyColorEffects(player.name, message));

        return parts.filter(p => p).join(' ');
    }

    /**
     * Format timestamp
     */
    formatTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `§8[§7${hours}:${minutes}§8]§r`;
    }

    /**
     * Format dimension
     */
    formatDimension(player) {
        const dimension = this.playerInfoManager ? this.playerInfoManager.getDimension(player) : 'overworld';
        const dimColors = {
            'overworld': '§a',
            'nether': '§c',
            'the end': '§d',
            'the_end': '§d'
        };
        const dimIcons = {
            'overworld': '🌍',
            'nether': '🔥',
            'the end': '⭐',
            'the_end': '⭐'
        };
        const color = dimColors[dimension.toLowerCase()] || '§7';
        const icon = dimIcons[dimension.toLowerCase()] || '📍';
        return `${color}[${dimension.toUpperCase()}]§r`;
    }

    /**
     * Format coordinates
     */
    formatCoordinates(player) {
        const pos = player.location || { x: 0, y: 0, z: 0 };
        return `§7[§e${Math.floor(pos.x)}§7, §e${Math.floor(pos.y)}§7, §e${Math.floor(pos.z)}§7]§r`;
    }

    /**
     * Format biome
     */
    formatBiome(player) {
        const biome = this.playerInfoManager ? this.playerInfoManager.getBiome(player) : 'plains';
        return `§7[§2${biome}§7]§r`;
    }

    /**
     * Format gamemode
     */
    formatGamemode(player) {
        const gamemode = player.gameMode || 'survival';
        const gmColors = {
            'survival': '§a',
            'creative': '§6',
            'adventure': '§b',
            'spectator': '§7'
        };
        const gmAbbr = {
            'survival': 'S',
            'creative': 'C',
            'adventure': 'A',
            'spectator': 'SP'
        };
        const color = gmColors[gamemode.toLowerCase()] || '§7';
        const abbr = gmAbbr[gamemode.toLowerCase()] || 'S';
        return `${color}[${abbr}]§r`;
    }

    /**
     * Format health
     */
    formatHealth(player) {
        const health = player.health || 20;
        const maxHealth = 20;
        const percentage = (health / maxHealth) * 100;

        let color;
        if (percentage >= 75) color = '§a';
        else if (percentage >= 50) color = '§e';
        else if (percentage >= 25) color = '§6';
        else color = '§c';

        return `${color}[❤ ${Math.floor(health)}]§r`;
    }

    /**
     * Format player name with rank
     */
    formatPlayerName(player) {
        return this.rankManager.getPlayerDisplayName(player.name);
    }

    /**
     * Apply color effects to message
     */
    applyColorEffects(playerName, message) {
        const effect = this.colorEffects.get(playerName.toLowerCase());
        if (!effect) return message;

        switch (effect.type) {
            case 'gradient':
                return this.applyGradient(message, effect.gradient);
            case 'rainbow':
                return this.applyRainbow(message);
            case 'wave':
                return this.applyWave(message, effect.colors);
            case 'glitch':
                return this.applyGlitch(message);
            case 'bold':
                return `§l${message}§r`;
            case 'italic':
                return `§o${message}§r`;
            case 'underline':
                return `§n${message}§r`;
            default:
                return message;
        }
    }

    /**
     * Apply gradient effect
     */
    applyGradient(text, gradientName) {
        const colors = this.gradients[gradientName] || this.gradients.rainbow;
        let result = '';
        const step = Math.max(1, Math.floor(text.length / colors.length));

        for (let i = 0; i < text.length; i++) {
            const colorIndex = Math.floor(i / step) % colors.length;
            result += colors[colorIndex] + text[i];
        }

        return result + '§r';
    }

    /**
     * Apply rainbow effect
     */
    applyRainbow(text) {
        return this.applyGradient(text, 'rainbow');
    }

    /**
     * Apply wave effect
     */
    applyWave(text, colors) {
        const waveColors = colors || ['§a', '§b', '§3', '§b'];
        let result = '';

        for (let i = 0; i < text.length; i++) {
            const colorIndex = Math.floor((i + Date.now() / 200) % waveColors.length);
            result += waveColors[colorIndex] + text[i];
        }

        return result + '§r';
    }

    /**
     * Apply glitch effect
     */
    applyGlitch(text) {
        const glitchChars = ['§k', ''];
        let result = '';

        for (let i = 0; i < text.length; i++) {
            if (Math.random() < 0.3) {
                result += '§k' + text[i] + '§r§c';
            } else {
                result += '§c' + text[i];
            }
        }

        return result + '§r';
    }

    /**
     * Set color effect for player
     */
    setColorEffect(playerName, effectType, options = {}) {
        this.colorEffects.set(playerName.toLowerCase(), {
            type: effectType,
            ...options
        });
    }

    /**
     * Remove color effect for player
     */
    removeColorEffect(playerName) {
        this.colorEffects.delete(playerName.toLowerCase());
    }

    /**
     * Get available gradients
     */
    getAvailableGradients() {
        return Object.keys(this.gradients);
    }

    /**
     * Update format options
     */
    updateFormatOptions(options) {
        Object.assign(this.formatOptions, options);
    }

    /**
     * Get format options
     */
    getFormatOptions() {
        return { ...this.formatOptions };
    }

    /**
     * Strip color codes from text
     */
    stripColors(text) {
        return text.replace(/§[0-9a-fk-or]/gi, '');
    }

    /**
     * Parse color codes
     */
    parseColorCodes(text) {
        return text.replace(/&([0-9a-fk-or])/gi, '§$1');
    }

    /**
     * Save to database
     */
    saveToDatabase(db) {
        const data = {
            formatOptions: this.formatOptions,
            colorEffects: Array.from(this.colorEffects.entries())
        };
        db.set('chatFormatter', JSON.stringify(data));
    }

    /**
     * Load from database
     */
    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('chatFormatter') || '{}');
            if (data.formatOptions) {
                this.formatOptions = data.formatOptions;
            }
            if (data.colorEffects) {
                this.colorEffects = new Map(data.colorEffects);
            }
            return true;
        } catch (error) {
            console.error('Failed to load chat formatter data:', error);
            return false;
        }
    }
}

export default ChatFormatter;
