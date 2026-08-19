/**
 * Gemini Mob Plugin - Personality System Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Comprehensive personality and character trait system for mobs
 */

import { world } from "@minecraft/server";
import { getConfig, getMobType, getPersonalityTrait } from "./config.js";

// Name pools for different mob types
const NAME_POOLS = {
    "minecraft:cow": ["Bessie", "Daisy", "Mooney", "Buttercup", "Clover", "Moocha", "Stella", "Molly"],
    "minecraft:sheep": ["Woolly", "Fluffy", "Baaa-rry", "Cottontail", "Snowball", "Marshmallow", "Silky", "Fluffington"],
    "minecraft:pig": ["Porky", "Hamlet", "Snoutley", "Porkchop", "Mud", "Trotters", "Oinky", "Rosie"],
    "minecraft:chicken": ["Clucky", "Henny", "Chickie", "Eggy", "Peck", "Wingsly", "Squawk", "Coop"],
    "minecraft:rabbit": ["Hoppy", "Bunbun", "Carrot", "Thumper", "Whiskers", "Flopsy", "Ears", "Nibbles"],
    "minecraft:wolf": ["Shadow", "Fang", "Luna", "Stormy", "Howler", "Paws", "Timber", "Midnight"],
    "minecraft:spider": ["Spinner", "Webby", "Silk", "Crawler", "Arachnid", "Leggy", "Creepy", "Fangs"],
    "minecraft:cave_spider": ["Crawler", "Toxic", "Fangs", "Venom", "Creepster", "Webfoot", "Scutter", "Sneaky"],
    "minecraft:zombie": ["Groaner", "Shambler", "Rotty", "Decaying", "Undead", "Moaner", "Stumbly", "Flesh"],
    "minecraft:skeleton": ["Bonesy", "Skelly", "Boney", "Marrow", "Rattles", "Skull", "Ribs", "Spine"],
    "minecraft:creeper": ["Kaboom", "Hissy", "Creepy", "Explosive", "Sticky", "Detonator", "Boom", "Danger"],
    "minecraft:enderman": ["Tall", "Whispers", "Purple", "Teleport", "Blocks", "Stranger", "Other", "Portal"],
    "unknown": ["Buddy", "Friend", "Pal", "Wanderer", "Mystery", "Curious", "Explorer", "Unknown"]
};

/**
 * Generate unique name for mob based on type
 */
function generateUniqueMobName(typeId) {
    const names = NAME_POOLS[typeId] || ["Creature"];
    const baseName = names[Math.floor(Math.random() * names.length)];

    // Add a number suffix for true uniqueness
    const uniqueSuffix = Math.floor(Math.random() * 10000);
    return `${baseName}`;
}

/**
 * Generate or get mob personality
 */
export function getMobPersonality(mobId, typeId = null) {
    const stored = world.getDynamicProperty(`geniimob:personality:${mobId}`);
    if (stored) {
        return JSON.parse(stored);
    }
    return generatePersonality(mobId, typeId);
}

/**
 * Generate new personality for a mob
 */
export function generatePersonality(mobId, typeId) {
    const mobType = typeId ? getMobType(typeId) : null;

    if (!mobType || !mobType.personalities) {
        return createDefaultPersonality(mobId);
    }

    const selectedPersonalities = selectRandomPersonalities(mobType.personalities, 2);
    const personalityTraits = buildPersonalityTraits(selectedPersonalities);

    const uniqueName = generateUniqueMobName(typeId);

    const personality = {
        mobId,
        typeId,
        typeName: mobType.name,
        name: uniqueName,
        personalities: selectedPersonalities,
        traits: personalityTraits,
        mood: "neutral",
        energy: 100,
        hunger: 50,
        happiness: 50,
        curiosity: 50,
        createdAt: Date.now(),
        quirks: generateQuirks(selectedPersonalities),
        preferences: generatePreferences(mobType),
        fears: generateFears(mobType),
        likes: generateLikes(mobType),
        dislikes: generateDislikes(mobType)
    };

    savePersonality(mobId, personality);
    return personality;
}

/**
 * Create default personality
 */
function createDefaultPersonality(mobId) {
    const uniqueName = generateUniqueMobName("unknown");

    return {
        mobId,
        typeId: "unknown",
        typeName: "Creature",
        name: uniqueName,
        personalities: ["curious"],
        traits: { reactivity: 0.5, memory: false },
        mood: "neutral",
        energy: 50,
        hunger: 50,
        happiness: 50,
        curiosity: 30,
        quirks: [],
        preferences: {},
        fears: [],
        likes: [],
        dislikes: []
    };
}

/**
 * Select random personalities from available options
 */
function selectRandomPersonalities(options, count) {
    const selected = [];
    const available = [...options];

    for (let i = 0; i < Math.min(count, available.length); i++) {
        const index = Math.floor(Math.random() * available.length);
        selected.push(available[index]);
        available.splice(index, 1);
    }

    return selected;
}

/**
 * Build personality traits from selected personalities
 */
function buildPersonalityTraits(personalityIds) {
    const traits = {};

    for (const id of personalityIds) {
        const trait = getPersonalityTrait(id);
        if (trait && trait.traits) {
            Object.assign(traits, trait.traits);
        }
    }

    return traits;
}

/**
 * Generate quirks based on personalities
 */
function generateQuirks(personalityIds) {
    const quirks = [
        { id: "head-tilt", chance: 0.3, description: "Tilts head when confused" },
        { id: "tail-wag", chance: 0.4, description: "Wags tail when happy" },
        { id: "nervous-hop", chance: 0.35, description: "Hops nervously when scared" },
        { id: "excited-jump", chance: 0.4, description: "Jumps excitedly when happy" },
        { id: "circles", chance: 0.25, description: "Spins in circles when excited" },
        { id: "sniffs", chance: 0.3, description: "Sniffs things frequently" },
        { id: "eye-twitch", chance: 0.2, description: "Twitches eyes when nervous" },
        { id: "ground-paw", chance: 0.35, description: "Paws at the ground anxiously" },
        { id: "back-up-slowly", chance: 0.25, description: "Backs away when uncomfortable" },
        { id: "stands-on-hind", chance: 0.3, description: "Stands on hind legs when alert" }
    ];

    return quirks.filter(() => Math.random() < 0.4);
}

/**
 * Generate food and item preferences
 */
function generatePreferences(mobType) {
    const preferences = {
        favoriteFood: [],
        dislikedFood: [],
        playStyle: "normal",
        resting: "ground",
        socialDistance: "normal"
    };

    if (mobType && mobType.interactions && mobType.interactions.feed) {
        const foods = mobType.interactions.feed;
        preferences.favoriteFood = foods.slice(0, 2);
        if (foods.length > 2) {
            preferences.dislikedFood = [foods[foods.length - 1]];
        }
    }

    return preferences;
}

/**
 * Generate fears based on mob type
 */
function generateFears(mobType) {
    const baseFears = [
        { trigger: "fire", intensity: 0.8 },
        { trigger: "lava", intensity: 0.9 },
        { trigger: "water", intensity: 0.3 },
        { trigger: "sudden_damage", intensity: 0.7 },
        { trigger: "loud_noise", intensity: 0.5 }
    ];

    const mobSpecificFears = {
        cow: [{ trigger: "fire", intensity: 0.9 }],
        sheep: [{ trigger: "wolf", intensity: 0.95 }],
        chicken: [{ trigger: "fire", intensity: 0.8 }, { trigger: "attack", intensity: 0.9 }],
        rabbit: [{ trigger: "wolf", intensity: 0.9 }],
        wolf: [{ trigger: "lava", intensity: 0.8 }],
        spider: [{ trigger: "fire", intensity: 0.7 }],
        zombie: [],
        skeleton: [],
        creeper: [],
        enderman: [{ trigger: "water", intensity: 0.95 }]
    };

    if (mobType && mobSpecificFears[mobType]) {
        return baseFears.filter(f => !mobSpecificFears[mobType].some(sf => sf.trigger === f.trigger))
            .concat(mobSpecificFears[mobType]);
    }

    return baseFears;
}

/**
 * Generate things mob likes
 */
function generateLikes(mobType) {
    const likes = ["being petted", "getting food", "sunny weather"];

    const mobSpecificLikes = {
        cow: ["grass", "being milked", "open fields"],
        sheep: ["grass", "grass", "other sheep"],
        pig: ["mud", "carrots", "rolling around"],
        chicken: ["seeds", "sunny spots", "pecking"],
        rabbit: ["carrots", "flowers", "hopping"],
        wolf: ["meat", "loyalty", "protecting owner"],
        spider: ["insects", "hunting", "solitude"],
        cave_spider: ["insects", "darkness", "hunting"],
        zombie: ["flesh", "darkness"],
        skeleton: ["night time", "arrows"],
        creeper: ["explosions", "destruction"],
        enderman: ["dark places", "solitude", "blocks"]
    };

    if (mobType && mobSpecificLikes[mobType]) {
        return [...new Set([...likes, ...mobSpecificLikes[mobType]])];
    }

    return likes;
}

/**
 * Generate things mob dislikes
 */
function generateDislikes(mobType) {
    const dislikes = ["being hit", "starvation", "rain"];

    const mobSpecificDislikes = {
        cow: ["violence", "being separated"],
        sheep: ["predators", "shearing", "being alone"],
        pig: ["staying still", "sadness"],
        chicken: ["loud noises", "being trapped"],
        rabbit: ["being cornered", "loud sounds"],
        wolf: ["being tamed by mean people", "abandonment"],
        spider: ["bright light"],
        cave_spider: ["bright light", "water"],
        zombie: ["sunlight"],
        skeleton: ["sunshine"],
        creeper: ["cats"],
        enderman: ["water", "staring", "aggression"]
    };

    if (mobType && mobSpecificDislikes[mobType]) {
        return [...new Set([...dislikes, ...mobSpecificDislikes[mobType]])];
    }

    return dislikes;
}

/**
 * Save personality to world
 */
function savePersonality(mobId, personality) {
    world.setDynamicProperty(`geniimob:personality:${mobId}`, JSON.stringify(personality));
}

/**
 * Update mood based on recent interactions
 */
export function updateMood(mobId, personality) {
    const interactions = getRecentInteractions(mobId, 60); // Last 60 seconds

    let moodInfluence = 0;
    let totalWeight = 0;

    for (const interaction of interactions) {
        const weight = 1.0 / (1 + (Date.now() - interaction.timestamp) / 10000);

        if (interaction.type === "pet" || interaction.type === "feed") {
            moodInfluence += weight * 0.3;
        } else if (interaction.type === "hit") {
            moodInfluence -= weight * 0.5;
        } else if (interaction.type === "talk") {
            moodInfluence += weight * 0.1;
        }

        totalWeight += weight;
    }

    const averageInfluence = totalWeight > 0 ? moodInfluence / totalWeight : 0;

    // Update mood
    let newMood = "neutral";
    const moodValue = personality.happiness + averageInfluence * 50;

    if (moodValue > 70) {
        newMood = "ecstatic";
    } else if (moodValue > 50) {
        newMood = "happy";
    } else if (moodValue > 30) {
        newMood = "content";
    } else if (moodValue > 10) {
        newMood = "neutral";
    } else if (moodValue > -20) {
        newMood = "sad";
    } else if (moodValue > -50) {
        newMood = "angry";
    } else {
        newMood = "furious";
    }

    personality.mood = newMood;
    savePersonality(mobId, personality);

    return personality;
}

/**
 * Get recent interactions
 */
function getRecentInteractions(mobId, timeWindow = 60) {
    const stored = world.getDynamicProperty(`geniimob:interactions:${mobId}`);
    if (!stored) return [];

    const interactions = JSON.parse(stored);
    const now = Date.now();
    const filtered = interactions.filter(i => (now - i.timestamp) / 1000 < timeWindow);

    return filtered;
}

/**
 * Update personality stats
 */
export function updatePersonalityStats(mobId, personality, deltaTime = 1) {
    // Decrease energy over time
    personality.energy = Math.max(0, personality.energy - deltaTime * 0.05);

    // Increase hunger over time
    personality.hunger = Math.min(100, personality.hunger + deltaTime * 0.02);

    // Decrease happiness if too hungry
    if (personality.hunger > 70) {
        personality.happiness = Math.max(0, personality.happiness - deltaTime * 0.1);
    }

    // Decrease happiness if no energy
    if (personality.energy < 20) {
        personality.happiness = Math.max(0, personality.happiness - deltaTime * 0.05);
    }

    // Natural happiness decay
    personality.happiness = Math.max(0, personality.happiness - deltaTime * 0.01);
    personality.curiosity = Math.max(0, personality.curiosity - deltaTime * 0.01);

    savePersonality(mobId, personality);
    return personality;
}

/**
 * Get personality description
 */
export function getPersonalityDescription(personality) {
    const traits = personality.personalities.join(" & ");
    return `${personality.typeName} [${traits}] - Mood: ${personality.mood}`;
}

/**
 * Get mood emoji
 */
export function getMoodEmoji(personality) {
    const moodEmojis = {
        ecstatic: "😄",
        happy: "😊",
        content: "😌",
        neutral: "😐",
        sad: "😢",
        angry: "😠",
        furious: "🤬"
    };
    return moodEmojis[personality.mood] || "😐";
}

/**
 * Check personality compatibility with action
 */
export function isCompatibleWithPersonality(personality, actionType) {
    if (!personality.traits) return true;

    const incompatibilities = {
        "pet": ["predatory", "hostile"],
        "ride": ["hostile"],
        "breed": ["hostile"],
        "feed": [] // Most mobs can be fed
    };

    const incompatible = incompatibilities[actionType] || [];
    return !personality.personalities.some(p => incompatible.includes(p));
}

/**
 * Calculate personality-based reaction
 */
export function getPersonalityReaction(personality, actionType, actionTarget = null) {
    const reactions = {
        pet: {
            gentle: { chance: 0.8, response: "nuzzles you affectionately" },
            protective: { chance: 0.6, response: "leans against you happily" },
            playful: { chance: 0.9, response: "jumps and spins excitedly" },
            timid: { chance: 0.4, response: "flinches but accepts your touch" }
        },
        hit: {
            protective: { chance: 0.95, response: "retaliates aggressively" },
            playful: { chance: 0.3, response: "thinks you're playing" },
            timid: { chance: 0.9, response: "flees immediately" },
            loyal: { chance: 0.2, response: "yelps in confusion" }
        },
        feed: {
            greedy: { chance: 0.95, response: "devours food eagerly" },
            gentle: { chance: 0.7, response: "eats gracefully" },
            curious: { chance: 0.8, response: "sniffs food carefully first" },
            playful: { chance: 0.6, response: "bats food around playfully" }
        }
    };

    const actionReactions = reactions[actionType] || {};
    let selectedReaction = null;
    let highestChance = 0;

    for (const trait of personality.personalities) {
        const reaction = actionReactions[trait];
        if (reaction && reaction.chance > highestChance) {
            highestChance = reaction.chance;
            selectedReaction = reaction;
        }
    }

    return selectedReaction || { chance: 0.5, response: "reacts indifferently" };
}

export default {
    getMobPersonality,
    generatePersonality,
    updateMood,
    updatePersonalityStats,
    getPersonalityDescription,
    getMoodEmoji,
    isCompatibleWithPersonality,
    getPersonalityReaction
};
