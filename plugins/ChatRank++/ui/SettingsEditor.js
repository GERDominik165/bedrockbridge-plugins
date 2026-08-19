/**
 * SettingsEditor - Settings configuration UI
 */

class SettingsEditor {
    constructor(managers) {
        this.managers = managers;
    }

    show(player) {
        const config = this.managers.config;

        const form = {
            type: 'custom_form',
            title: '§6ChatRank++ Settings',
            content: [
                {
                    type: 'toggle',
                    text: 'Show Timestamp',
                    default: config.get('chat.format.timestamp')
                },
                {
                    type: 'toggle',
                    text: 'Show Dimension',
                    default: config.get('chat.format.dimension')
                },
                {
                    type: 'toggle',
                    text: 'Show Coordinates',
                    default: config.get('chat.format.coordinates')
                },
                {
                    type: 'toggle',
                    text: 'Show Biome',
                    default: config.get('chat.format.biome')
                },
                {
                    type: 'toggle',
                    text: 'Show Gamemode',
                    default: config.get('chat.format.gamemode')
                },
                {
                    type: 'toggle',
                    text: 'Show Health',
                    default: config.get('chat.format.health')
                },
                {
                    type: 'toggle',
                    text: 'Enable Anti-Spam',
                    default: config.get('moderation.antiSpam')
                },
                {
                    type: 'toggle',
                    text: 'Enable Word Filter',
                    default: config.get('moderation.wordFilter')
                },
                {
                    type: 'slider',
                    text: 'Chat Cooldown (ms):',
                    min: 0,
                    max: 5000,
                    default: config.get('chat.cooldown')
                },
                {
                    type: 'slider',
                    text: 'Max Messages Per Minute:',
                    min: 1,
                    max: 30,
                    default: config.get('moderation.maxMessagesPerMinute')
                },
            ]
        };

        return form;
    }

    handleResponse(player, response) {
        if (response === null) return;

        const config = this.managers.config;
        const [timestamp, dimension, coords, biome, gamemode, health, antiSpam, filter, cooldown, maxMsg] = response;

        config.set('chat.format.timestamp', timestamp);
        config.set('chat.format.dimension', dimension);
        config.set('chat.format.coordinates', coords);
        config.set('chat.format.biome', biome);
        config.set('chat.format.gamemode', gamemode);
        config.set('chat.format.health', health);
        config.set('moderation.antiSpam', antiSpam);
        config.set('moderation.wordFilter', filter);
        config.set('chat.cooldown', cooldown);
        config.set('moderation.maxMessagesPerMinute', maxMsg);

        player.sendMessage('§aSettings saved successfully!');
    }
}

export default SettingsEditor;
