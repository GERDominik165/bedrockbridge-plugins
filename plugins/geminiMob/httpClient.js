/**
 * Gemini Mob Plugin - HTTP Client Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * HTTP client for Gemini AI API requests
 */

import { world } from "@minecraft/server";
import { getConfig, getApiEndpoint } from "./config.js";

/**
 * Send request to Gemini API
 */
export async function sendGeminiRequest(prompt, context = {}) {
    try {
        if (!getConfig("enableMobChat")) {
            return {
                success: false,
                message: "Mob chat is disabled",
                response: ""
            };
        }

        const apiKey = getConfig("apiKey");
        const modelName = getConfig("modelName");

        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
            return {
                success: false,
                message: "API key not configured",
                response: ""
            };
        }

        const endpoint = getApiEndpoint();

        // Build system prompt with mob context
        const systemPrompt = buildSystemPrompt(context);

        // Build request body
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: getConfig("temperature", 0.7),
                topP: getConfig("topP", 0.95),
                topK: getConfig("topK", 40),
                maxOutputTokens: getConfig("maxMobResponseLength", 200)
            },
            systemInstruction: {
                parts: [{
                    text: systemPrompt
                }]
            }
        };

        // Make HTTP request
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            return {
                success: false,
                message: `API error: ${response.status}`,
                response: ""
            };
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return {
                success: false,
                message: "Invalid API response",
                response: ""
            };
        }

        const responseText = data.candidates[0].content.parts[0].text;

        return {
            success: true,
            message: "Success",
            response: responseText,
            tokens: {
                input: data.usageMetadata?.inputTokens || 0,
                output: data.usageMetadata?.outputTokens || 0,
                total: (data.usageMetadata?.inputTokens || 0) + (data.usageMetadata?.outputTokens || 0)
            }
        };
    } catch (error) {
        return {
            success: false,
            message: `Request failed: ${error.message}`,
            response: "",
            error: error
        };
    }
}

/**
 * Build system prompt with mob context
 */
function buildSystemPrompt(context) {
    let systemPrompt = getConfig("systemPrompt", "You are a helpful Minecraft mob.");

    if (context && context.mobName) {
        systemPrompt += `\n\nYou are a ${context.mobName}.`;
    }

    if (context && context.personalities && context.personalities.length > 0) {
        systemPrompt += `\nYour personality traits are: ${context.personalities.join(", ")}.`;
    }

    if (context && context.mood) {
        systemPrompt += `\nYour current mood is: ${context.mood}.`;
    }

    if (context && context.playerName) {
        systemPrompt += `\nYou are speaking with ${context.playerName}.`;
    }

    if (context && context.trustLevel !== undefined) {
        const trustDescription = getTrustDescription(context.trustLevel);
        systemPrompt += `\nYour relationship with this player is: ${trustDescription}.`;
    }

    if (context && context.likes && context.likes.length > 0) {
        systemPrompt += `\nYou like: ${context.likes.join(", ")}.`;
    }

    if (context && context.dislikes && context.dislikes.length > 0) {
        systemPrompt += `\nYou dislike: ${context.dislikes.join(", ")}.`;
    }

    if (context && context.recentInteractions && context.recentInteractions.length > 0) {
        const recentSummary = summarizeInteractions(context.recentInteractions);
        systemPrompt += `\nRecent interactions: ${recentSummary}`;
    }

    if (context && context.memories && context.memories.length > 0) {
        systemPrompt += `\nMy memories: ${context.memories.map(m => m.description).join(", ")}.`;
    }

    systemPrompt += `\n\nRespond in character as this mob. Keep your response short (under 100 characters). Don't use asterisks or roleplay formatting. Just speak naturally as the mob would.`;

    return systemPrompt;
}

/**
 * Get trust level description
 */
function getTrustDescription(trustLevel) {
    if (trustLevel >= 150) return "best friends - deeply bonded";
    if (trustLevel >= 100) return "great friends - very close";
    if (trustLevel >= 50) return "friendly - trusting";
    if (trustLevel >= 20) return "acquaintances - somewhat familiar";
    if (trustLevel >= 0) return "neutral - no strong feelings";
    if (trustLevel >= -30) return "unfriendly - uncomfortable";
    return "hostile - dangerous";
}

/**
 * Summarize recent interactions
 */
function summarizeInteractions(interactions) {
    if (!interactions || interactions.length === 0) return "none";

    const summary = interactions.slice(-5).map(i => {
        const type = i.type || "unknown";
        const timeAgo = i.timeAgo || "ago";
        return `${type} ${timeAgo}`;
    }).join(", ");

    return summary;
}

/**
 * Send batch request
 */
export async function sendBatchGeminiRequest(prompts, context = {}) {
    const results = [];

    for (const prompt of prompts) {
        const result = await sendGeminiRequest(prompt, context);
        results.push(result);

        // Rate limiting
        await sleep(100);
    }

    return results;
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate API response
 */
export function validateApiResponse(response) {
    if (!response) return false;
    if (!response.success) return false;
    if (!response.response || response.response.length === 0) return false;
    return true;
}

/**
 * Parse mob response
 */
export function parseMobResponse(responseText) {
    if (!responseText) return null;

    // Remove any asterisks or special formatting
    let cleaned = responseText.replace(/\*/g, "").trim();

    // Limit length
    const maxLength = getConfig("maxMobResponseLength", 200);
    if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength) + "...";
    }

    return cleaned;
}

/**
 * Build conversation history
 */
export function buildConversationHistory(messages = []) {
    return messages.map(msg => ({
        role: msg.role,
        parts: [{
            text: msg.content
        }]
    }));
}

/**
 * Get token count estimate
 */
export function estimateTokenCount(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

/**
 * Check rate limit
 */
export function checkRateLimit(mobId) {
    const key = `geniimob:ratelimit:${mobId}`;
    const stored = world.getDynamicProperty(key);

    if (!stored) {
        return { allowed: true, remaining: 100, resetIn: 3600 };
    }

    const data = JSON.parse(stored);
    const now = Date.now();
    const elapsed = now - data.lastReset;

    if (elapsed > 3600000) { // 1 hour
        // Reset
        const newData = {
            count: 1,
            lastReset: now
        };
        world.setDynamicProperty(key, JSON.stringify(newData));
        return { allowed: true, remaining: 99, resetIn: 3600 };
    }

    if (data.count >= 100) {
        const resetIn = Math.ceil((3600000 - elapsed) / 1000);
        return { allowed: false, remaining: 0, resetIn };
    }

    // Increment count
    data.count++;
    world.setDynamicProperty(key, JSON.stringify(data));

    return { allowed: true, remaining: 100 - data.count, resetIn: Math.ceil((3600000 - elapsed) / 1000) };
}

/**
 * Health check
 */
export async function healthCheck() {
    try {
        const testPrompt = "Say 'ok' if you can read this.";
        const result = await sendGeminiRequest(testPrompt);

        return {
            healthy: result.success,
            message: result.message,
            apiKey: getConfig("apiKey") ? "configured" : "missing",
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        return {
            healthy: false,
            message: `Health check failed: ${e.message}`,
            error: e
        };
    }
}

export default {
    sendGeminiRequest,
    sendBatchGeminiRequest,
    validateApiResponse,
    parseMobResponse,
    buildConversationHistory,
    estimateTokenCount,
    checkRateLimit,
    healthCheck
};
