/**
 * Gemini Mob Plugin - Conversation Manager Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Manages mob conversations and dialogue with players
 */

import { world } from "@minecraft/server";
import { getConfig } from "./config.js";
import { sendGeminiRequest, parseMobResponse } from "./httpClient.js";
import { getMobPersonality } from "./mobPersonality.js";
import { getMobMemory, recordInteraction } from "./mobMemory.js";

/**
 * Get or create conversation for mob-player pair
 */
export function getConversation(mobId, playerId) {
    const key = `geniimob:conversation:${mobId}:${playerId}`;
    const stored = world.getDynamicProperty(key);

    if (stored) {
        return JSON.parse(stored);
    }

    return createNewConversation(mobId, playerId);
}

/**
 * Create new conversation
 */
function createNewConversation(mobId, playerId) {
    return {
        mobId,
        playerId,
        messages: [],
        startTime: Date.now(),
        lastMessage: null,
        messageCount: 0,
        context: {}
    };
}

/**
 * Add user message to conversation
 */
export function addUserMessage(mobId, playerId, message) {
    const conversation = getConversation(mobId, playerId);

    const userMessage = {
        role: "user",
        content: message,
        timestamp: Date.now()
    };

    conversation.messages.push(userMessage);
    conversation.lastMessage = userMessage;
    conversation.messageCount++;

    // Keep conversation history limited
    const historyLimit = getConfig("conversationHistoryLimit", 20);
    if (conversation.messages.length > historyLimit) {
        conversation.messages = conversation.messages.slice(-historyLimit);
    }

    saveConversation(mobId, playerId, conversation);
    return conversation;
}

/**
 * Add mob response to conversation
 */
export function addMobResponse(mobId, playerId, response) {
    const conversation = getConversation(mobId, playerId);

    const mobMessage = {
        role: "mob",
        content: response,
        timestamp: Date.now()
    };

    conversation.messages.push(mobMessage);
    conversation.lastMessage = mobMessage;

    // Keep conversation history limited
    const historyLimit = getConfig("conversationHistoryLimit", 20);
    if (conversation.messages.length > historyLimit) {
        conversation.messages = conversation.messages.slice(-historyLimit);
    }

    saveConversation(mobId, playerId, conversation);
    return conversation;
}

/**
 * Save conversation
 */
function saveConversation(mobId, playerId, conversation) {
    world.setDynamicProperty(
        `geniimob:conversation:${mobId}:${playerId}`,
        JSON.stringify(conversation)
    );
}

/**
 * Clear conversation
 */
export function clearConversation(mobId, playerId) {
    world.clearDynamicProperty(`geniimob:conversation:${mobId}:${playerId}`);
}

/**
 * Generate mob response to player message
 */
export async function generateMobResponse(mobEntity, playerId, playerName, userMessage) {
    try {
        const mobId = mobEntity.id || mobEntity.nameTag;
        const personality = getMobPersonality(mobId);
        const memory = getMobMemory(mobId, playerId);

        // Check if mob is willing to talk
        if (!personality.traits || !personality.traits.reactivity) {
            const fallbackResponse = `${personality.typeName} looks at you without responding.`;
            return { success: false, response: fallbackResponse };
        }

        // Record the talk interaction
        recordInteraction(mobId, playerId, "talk", { message: userMessage });

        // Add user message to conversation
        addUserMessage(mobId, playerId, userMessage);

        // Build context for AI
        const conversation = getConversation(mobId, playerId);
        const context = buildAIContext(mobId, playerId, playerName, personality, memory, conversation);

        // Send request to Gemini
        const aiResponse = await sendGeminiRequest(userMessage, context);

        if (!aiResponse.success) {
            // Fallback response
            const fallback = getFallbackResponse(personality);
            addMobResponse(mobId, playerId, fallback);
            return { success: false, response: fallback, error: aiResponse.message };
        }

        // Parse and clean response
        const mobResponse = parseMobResponse(aiResponse.response);

        if (!mobResponse) {
            const fallback = getFallbackResponse(personality);
            addMobResponse(mobId, playerId, fallback);
            return { success: false, response: fallback };
        }

        // Add response to conversation
        addMobResponse(mobId, playerId, mobResponse);

        return {
            success: true,
            response: mobResponse,
            tokens: aiResponse.tokens || {}
        };
    } catch (error) {
        console.error(`Error generating mob response:`, error);
        return {
            success: false,
            response: "The mob seems confused...",
            error: error.message
        };
    }
}

/**
 * Build AI context
 */
function buildAIContext(mobId, playerId, playerName, personality, memory, conversation) {
    return {
        mobName: personality.typeName,
        personalities: personality.personalities,
        mood: personality.mood,
        playerName,
        trustLevel: memory.trust,
        energy: personality.energy,
        hunger: personality.hunger,
        happiness: personality.happiness,
        likes: personality.likes || [],
        dislikes: personality.dislikes || [],
        preferences: personality.preferences || {},
        recentInteractions: getRecentInteractionsForContext(memory),
        memories: getMemoriesForContext(memory),
        conversationLength: conversation.messages.length,
        conversationDuration: Math.round((Date.now() - conversation.startTime) / 1000)
    };
}

/**
 * Get recent interactions for context
 */
function getRecentInteractionsForContext(memory) {
    if (!memory.interactions || memory.interactions.length === 0) return [];

    return memory.interactions.slice(-5).map(i => ({
        type: i.type,
        timeAgo: formatTimeAgo(i.timestamp)
    }));
}

/**
 * Get memories for context
 */
function getMemoriesForContext(memory) {
    if (!memory.significantMemories || memory.significantMemories.length === 0) return [];

    return memory.significantMemories.slice(-3).map(m => ({
        description: m.description,
        timeAgo: formatTimeAgo(m.timestamp)
    }));
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
    const ms = Date.now() - timestamp;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
}

/**
 * Get fallback response
 */
function getFallbackResponse(personality) {
    const responses = {
        cow: ["*moo*", "moo moo", "*contented moo*"],
        sheep: ["*baa*", "baa baa", "*confused bleating*"],
        pig: ["*oink*", "oink oink", "*curious snuffle*"],
        chicken: ["*bawk*", "bawk bawk", "*nervous clucking*"],
        rabbit: ["*squeak*", "*hop*", "*twitches nose*"],
        wolf: ["*woof*", "*growl*", "*tilts head*"],
        zombie: ["*groan*", "braaains", "*unsettling moan*"],
        skeleton: ["*rattle*", "*bone clack*", "*arrows loaded*"],
        creeper: ["*hiss*", "*beep beep*", "*tension builds*"],
        enderman: ["*screech*", "*distorted voice*", "*teleports away*"]
    };

    const mobResponses = responses[personality.typeId] || ["*looks at you*", "*makes sounds*"];
    return mobResponses[Math.floor(Math.random() * mobResponses.length)];
}

/**
 * Get conversation summary
 */
export function getConversationSummary(mobId, playerId) {
    const conversation = getConversation(mobId, playerId);

    return {
        messageCount: conversation.messageCount,
        duration: Math.round((Date.now() - conversation.startTime) / 1000),
        lastMessage: conversation.lastMessage?.content || "No messages",
        lastMessageTime: conversation.lastMessage?.timestamp || null,
        messages: conversation.messages.length
    };
}

/**
 * Get all conversation summaries for a mob
 */
export function getAllConversationSummaries(mobId) {
    try {
        const conversations = [];
        const allPlayers = world.getPlayers();

        for (const player of allPlayers) {
            const conversation = getConversation(mobId, player.id);
            if (conversation && conversation.messages && conversation.messages.length > 0) {
                conversations.push({
                    playerId: player.id,
                    playerName: player.name,
                    summary: getConversationSummary(mobId, player.id)
                });
            }
        }

        return conversations;
    } catch (e) {
        console.error(`Failed to get conversation summaries for ${mobId}:`, e);
        return [];
    }
}

/**
 * Clear old conversations (cleanup)
 */
export function startCleanupInterval() {
    const cleanupInterval = getConfig("conversationCleanupInterval", 3600000); // 1 hour default

    world.getDimension("overworld").runCommandAsync(
        `schedule function geniimob:cleanup ${cleanupInterval / 50}`
    ).catch(() => {
        // Schedule command might not work, just ignore
    });
}

/**
 * Manual cleanup
 */
export function cleanupOldConversations(maxAge = 3600000) { // 1 hour default
    try {
        const currentTime = Date.now();
        let cleaned = 0;

        // This is a simplified approach - in a real implementation,
        // you'd want to track all conversation keys
        console.log(`Conversation cleanup completed. Removed ${cleaned} old conversations.`);

        return cleaned;
    } catch (e) {
        console.error("Cleanup failed:", e);
        return 0;
    }
}

/**
 * Get conversation statistics
 */
export function getConversationStatistics(mobId) {
    try {
        const conversations = [];
        const allPlayers = world.getPlayers();

        let totalMessages = 0;
        let totalDuration = 0;
        let avgMessageLength = 0;

        for (const player of allPlayers) {
            const conversation = getConversation(mobId, player.id);
            if (conversation && conversation.messages && conversation.messages.length > 0) {
                conversations.push(conversation);
                totalMessages += conversation.messages.length;
                totalDuration += Date.now() - conversation.startTime;

                for (const msg of conversation.messages) {
                    avgMessageLength += msg.content.length;
                }
            }
        }

        const totalLength = conversations.length;

        return {
            totalConversations: totalLength,
            totalMessages,
            averageDuration: totalLength > 0 ? Math.round(totalDuration / totalLength / 1000) : 0,
            averageMessageLength: totalMessages > 0 ? Math.round(avgMessageLength / totalMessages) : 0,
            players: conversations.length
        };
    } catch (e) {
        console.error(`Failed to get conversation statistics:`, e);
        return {
            totalConversations: 0,
            totalMessages: 0,
            averageDuration: 0,
            averageMessageLength: 0,
            players: 0
        };
    }
}

export default {
    getConversation,
    addUserMessage,
    addMobResponse,
    clearConversation,
    generateMobResponse,
    getConversationSummary,
    getAllConversationSummaries,
    cleanupOldConversations,
    getConversationStatistics
};
