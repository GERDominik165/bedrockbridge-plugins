/**
 * Gemini Mob Plugin - Message Formatter Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Formats and styles messages for display in game
 */

import { getMobPersonality, getMoodEmoji } from "./mobPersonality.js";
import { getMobType, getRelationshipLevel } from "./config.js";

/**
 * Format mob response message
 */
export function formatMobResponseMessage(mobName, response, mood = "neutral") {
    const moodEmoji = getMoodEmoji({ mood });
    return `§6[${mobName}] §f${moodEmoji} ${response}`;
}

/**
 * Format interaction message
 */
export function formatInteractionMessage(mobName, playerName, interactionType, result) {
    const messages = {
        feed: `§6${mobName} §feats from §6${playerName}'s §fhand`,
        pet: `§6${playerName} §fpets §6${mobName}`,
        hit: `§6${playerName} §fhits §6${mobName}`,
        talk: `§6${playerName} §ftalks to §6${mobName}`,
        tame: `§6${mobName} §fhas been tamed by §6${playerName}`,
        breed: `§6${mobName} §fand its partner are breeding!`
    };

    return messages[interactionType] || `§6${playerName} §finteracts with §6${mobName}`;
}

/**
 * Format relationship change message
 */
export function formatRelationshipChangeMessage(mobName, oldTrust, newTrust, change) {
    const relationship = getRelationshipLevel(newTrust);
    const arrow = change > 0 ? "§a↑" : "§c↓";

    return `§6${mobName}§r ${arrow} Trust: §e${oldTrust} → ${newTrust} §r(${relationship.emoji} ${relationship.level})`;
}

/**
 * Format mob status message
 */
export function formatMobStatusMessage(personality, memory) {
    return [
        `§6=== ${personality.typeName} Status ===`,
        `§eMood: ${personality.mood} ${getMoodEmoji(personality)}`,
        `§ePersonality: ${personality.personalities.join(", ")}`,
        `§eEnergy: ${personality.energy}/100`,
        `§eHunger: ${personality.hunger}/100`,
        `§eHappiness: ${personality.happiness}/100`,
        `§eTrust: ${memory.trust}/200 (${getRelationshipLevel(memory.trust).level})`
    ].join("\n");
}

/**
 * Format mob information
 */
export function formatMobInformationMessage(mobId, personality, memory) {
    const messages = [
        `§6=== ${personality.typeName} - Detailed Info ===`,
        `§eID: ${mobId}`,
        `§eType: ${personality.typeId}`,
        `§ePersonalities: ${personality.personalities.join(", ")}`,
        `§eMood: ${personality.mood} ${getMoodEmoji(personality)}`,
        ``,
        `§6Status:`,
        `§e  Energy: ${personality.energy}/100`,
        `§e  Hunger: ${personality.hunger}/100`,
        `§e  Happiness: ${personality.happiness}/100`,
        `§e  Curiosity: ${personality.curiosity}/100`,
        ``,
        `§6Relationship:`,
        `§e  Trust: ${memory.trust}`,
        `§e  Level: ${getRelationshipLevel(memory.trust).level}`,
        `§e  Tamed: ${memory.isTamed ? "Yes" : "No"}`,
        `§e  Days Known: ${Math.floor((Date.now() - memory.firstMet) / (1000 * 60 * 60 * 24))}`,
        `§e  Interactions: ${memory.interactions?.length || 0}`,
        ``,
        `§6Preferences:`,
        `§e  Favorite Food: ${personality.preferences?.favoriteFood?.join(", ") || "Unknown"}`,
        `§e  Likes: ${personality.likes?.join(", ") || "Unknown"}`,
        `§e  Dislikes: ${personality.dislikes?.join(", ") || "Unknown"}`,
        ``,
        `§6Memories:`,
        `§e  Significant: ${memory.significantMemories?.length || 0}`,
        `§e  All: ${memory.interactions?.length || 0}`
    ];

    return messages.join("\n");
}

/**
 * Format help message
 */
export function formatHelpMessage() {
    return [
        `§6=== Gemini Mob Commands ===`,
        `§f/mob pet <mob> §e- Pet a mob`,
        `§f/mob feed <mob> <item> §e- Feed a mob`,
        `§f/mob talk <mob> <message> §e- Talk to a mob`,
        `§f/mob status <mob> §e- Check mob status`,
        `§f/mob info <mob> §e- Detailed mob info`,
        `§f/mob tame <mob> §e- Tame a mob`,
        `§f/mob breed <mob1> <mob2> §e- Breed two mobs`,
        `§f/mob memory <mob> §e- Check mob's memories`,
        `§f/mob relationship §e- Check relationship with all mobs`,
        `§f/mob list §e- List all mobs`
    ].join("\n");
}

/**
 * Format error message
 */
export function formatErrorMessage(message) {
    return `§c❌ Error: §f${message}`;
}

/**
 * Format success message
 */
export function formatSuccessMessage(message) {
    return `§a✓ Success: §f${message}`;
}

/**
 * Format warning message
 */
export function formatWarningMessage(message) {
    return `§6⚠ Warning: §f${message}`;
}

/**
 * Format mob action message
 */
export function formatMobActionMessage(mobName, action) {
    return `§6*${mobName} ${action}*`;
}

/**
 * Format personality description
 */
export function formatPersonalityDescription(personality) {
    const traits = personality.personalities.map(p => `§e${p}§r`).join(", ");
    return `§6${personality.typeName}§r (${traits})`;
}

/**
 * Format interaction list
 */
export function formatInteractionList(interactions) {
    if (!interactions || interactions.length === 0) {
        return "§7No interactions";
    }

    const lines = ["§6Recent Interactions:"];

    for (let i = 0; i < Math.min(5, interactions.length); i++) {
        const interaction = interactions[interactions.length - 1 - i];
        const timeAgo = formatTimeDifference(interaction.timestamp);
        lines.push(`§e  ${interaction.type}§r - ${timeAgo}`);
    }

    return lines.join("\n");
}

/**
 * Format time difference
 */
function formatTimeDifference(timestamp) {
    const ms = Date.now() - timestamp;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds < 5) return "just now";
    return `${seconds}s ago`;
}

/**
 * Format trust gauge
 */
export function formatTrustGauge(trust) {
    const maxTrust = 200;
    const percentage = Math.min(100, (trust + 100) / 2);
    const blocks = Math.round(percentage / 5);
    const emptyBlocks = 20 - blocks;

    let gauge = "§a";
    for (let i = 0; i < blocks; i++) gauge += "█";

    gauge += "§7";
    for (let i = 0; i < emptyBlocks; i++) gauge += "█";

    gauge += " §e" + Math.round(percentage) + "%";

    return gauge;
}

/**
 * Format mood gauge
 */
export function formatMoodGauge(happiness) {
    const blocks = Math.round(happiness / 5);
    const emptyBlocks = 20 - blocks;

    let gauge = "§d";
    for (let i = 0; i < blocks; i++) gauge += "▓";

    gauge += "§7";
    for (let i = 0; i < emptyBlocks; i++) gauge += "░";

    return gauge;
}

/**
 * Format memory entry
 */
export function formatMemoryEntry(memory) {
    const timeAgo = formatTimeDifference(memory.timestamp);
    return `§e${memory.description}§r (${timeAgo})`;
}

/**
 * Format relationships summary
 */
export function formatRelationshipsSummary(relationships) {
    if (!relationships || relationships.length === 0) {
        return "§7No relationships yet";
    }

    const lines = ["§6Your Mob Relationships:"];

    for (const rel of relationships) {
        const level = getRelationshipLevel(rel.trust);
        const gauge = formatTrustGauge(rel.trust);
        lines.push(`§e${rel.mobName}§r - ${level.emoji} ${gauge}`);
    }

    return lines.join("\n");
}

/**
 * Format breeding message
 */
export function formatBreedingMessage(mob1Name, mob2Name, babyName) {
    return `§6✨ §6${mob1Name}§r and §6${mob2Name}§r are breeding! A baby §6${babyName}§r will arrive soon!`;
}

/**
 * Format taming message
 */
export function formatTamingMessage(mobName, playerName) {
    return `§6🎉 §6${mobName}§r has been tamed by §6${playerName}§r!`;
}

/**
 * Format food preference message
 */
export function formatFoodPreferenceMessage(mobName, food, liked = true) {
    if (liked) {
        return `§6${mobName}§r §aloves §f${food}!`;
    } else {
        return `§6${mobName}§r §cdislikes §f${food}`;
    }
}

/**
 * Format personality change message
 */
export function formatPersonalityChangeMessage(mobName, oldMood, newMood) {
    return `§6${mobName}§r mood changed from §e${oldMood}§r to §e${newMood}`;
}

/**
 * Format configuration message
 */
export function formatConfigurationWarning() {
    return [
        "§c❌ Gemini Mob Plugin Configuration Warning",
        "§fAPI key is not configured!",
        "§eSet it using: /mob config apikey <your-key>"
    ].join("\n");
}

/**
 * Format plugin status message
 */
export function formatPluginStatusMessage(stats) {
    return [
        `§6=== Gemini Mob Plugin Status ===`,
        `§eMobs Active: ${stats.activeMobs || 0}`,
        `§eTotal Interactions: ${stats.totalInteractions || 0}`,
        `§eAPI Status: ${stats.apiHealthy ? "§a✓ Healthy" : "§c✗ Unhealthy"}`,
        `§eDatabase Size: ${stats.databaseSize || "Unknown"}`
    ].join("\n");
}

export default {
    formatMobResponseMessage,
    formatInteractionMessage,
    formatRelationshipChangeMessage,
    formatMobStatusMessage,
    formatMobInformationMessage,
    formatHelpMessage,
    formatErrorMessage,
    formatSuccessMessage,
    formatWarningMessage,
    formatMobActionMessage,
    formatPersonalityDescription,
    formatInteractionList,
    formatTrustGauge,
    formatMoodGauge,
    formatMemoryEntry,
    formatRelationshipsSummary,
    formatBreedingMessage,
    formatTamingMessage,
    formatFoodPreferenceMessage,
    formatPersonalityChangeMessage,
    formatConfigurationWarning,
    formatPluginStatusMessage
};
