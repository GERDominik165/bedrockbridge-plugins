/**
 * ChatRank++ Settings
 * Plugin configuration and metadata
 */

export default {
    name: 'ChatRank++',
    version: '2.0.0',
    description: 'Complete chat ranking and management system for BedrockBridge',
    author: 'ChatRank++ Team',

    // Plugin metadata
    metadata: {
        minBedrockBridgeVersion: '1.0.0',
        supportedMinecraftVersions: ['1.19', '1.20', '1.21'],
        dependencies: [],
        permissions: [
            'chatrank.admin',
            'chatrank.moderate',
            'chatrank.vip',
            'chatrank.premium'
        ]
    },

    // Default configuration
    defaults: {
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
        }
    }
};
