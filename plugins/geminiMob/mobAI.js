/**
 * Gemini Mob Plugin - AI Behavior System Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * AI-driven behavior system with decision making and emotional responses
 */

import { world, system } from "@minecraft/server";
import { getMobPersonality, updatePersonalityStats, getMoodEmoji } from "./mobPersonality.js";
import { getMobMemory, predictMobBehavior, getMemoriesForContext } from "./mobMemory.js";
import { getMobType } from "./config.js";

/**
 * Make mob AI decision
 */
export function makeMobDecision(mobEntity, personality, memory) {
    const mobId = mobEntity.id || mobEntity.nameTag;
    const decision = {
        action: "idle",
        priority: 0,
        reason: "no compelling reason"
    };

    // Check immediate needs
    if (personality.hunger > 70) {
        const foodSearchResult = shouldSearchForFood(mobEntity, personality, memory);
        if (foodSearchResult.should) {
            decision.action = "search_food";
            decision.priority = 10;
            decision.reason = "very hungry";
            return decision;
        }
    }

    if (personality.energy < 20) {
        decision.action = "rest";
        decision.priority = 9;
        decision.reason = "exhausted";
        return decision;
    }

    // Check for threats
    const threatLevel = assessThreatLevel(mobEntity, personality);
    if (threatLevel > 0.7) {
        decision.action = "flee";
        decision.priority = 8;
        decision.reason = "threatened";
        return decision;
    }

    // Check mood
    if (personality.mood === "ecstatic") {
        decision.action = "play";
        decision.priority = 5;
        decision.reason = "happy and playful";
        return decision;
    }

    if (personality.mood === "angry" || personality.mood === "furious") {
        decision.action = "aggressive";
        decision.priority = 7;
        decision.reason = "angry";
        return decision;
    }

    // Check curiosity
    if (personality.curiosity > 60 && Math.random() < 0.3) {
        decision.action = "explore";
        decision.priority = 3;
        decision.reason = "curious about surroundings";
        return decision;
    }

    // Default to idle or social
    if (Math.random() < 0.2) {
        decision.action = "social";
        decision.priority = 2;
        decision.reason = "feeling social";
    }

    return decision;
}

/**
 * Check if mob should search for food
 */
function shouldSearchForFood(mobEntity, personality, memory) {
    if (!personality.traits?.followFood) {
        return { should: false, reason: "doesn't follow food" };
    }

    if (personality.hunger < 70) {
        return { should: false, reason: "not hungry enough" };
    }

    return {
        should: true,
        reason: "very hungry and will search for food"
    };
}

/**
 * Assess threat level from nearby entities
 */
function assessThreatLevel(mobEntity, personality) {
    let threatLevel = 0;

    // Get nearby entities
    const nearbyEntities = mobEntity.dimension.getEntities({
        maxDistance: 16,
        families: ["mob", "player"]
    });

    for (const entity of nearbyEntities) {
        if (entity.id === mobEntity.id) continue;

        const distance = mobEntity.location.distance(entity.location) || 0;
        const baseThreat = calculateEntityThreat(entity, personality);

        // Threat decreases with distance
        const distanceFactor = Math.max(0, 1 - distance / 16);
        threatLevel += baseThreat * distanceFactor;
    }

    return Math.min(1, threatLevel);
}

/**
 * Calculate threat from specific entity
 */
function calculateEntityThreat(entity, personality) {
    const entityType = entity.typeId || "";

    // Hostile mobs are always threatening
    const hostileMobs = ["zombie", "skeleton", "creeper", "enderman", "ghast", "blaze", "magma_cube"];
    if (hostileMobs.some(h => entityType.includes(h))) {
        return 0.8;
    }

    // Players might be threatening if relationship is hostile
    if (entityType.includes("player")) {
        // Would need to check memory here
        return 0.2;
    }

    // Other mobs are generally not threatening
    return 0;
}

/**
 * Generate AI response to player message
 */
export function generateMobResponse(context) {
    const personality = context.personality;
    const memory = context.memory;

    let responseTemplate = selectResponseTemplate(personality, context);

    if (!responseTemplate) {
        responseTemplate = {
            base: "looks at you with interest",
            happy: "happy reaction",
            sad: "sad reaction"
        };
    }

    const response = buildResponse(responseTemplate, personality, memory, context);

    return {
        message: response,
        shouldBroadcast: shouldBroadcastResponse(personality),
        confidence: calculateResponseConfidence(personality)
    };
}

/**
 * Select response template based on personality
 */
function selectResponseTemplate(personality, context) {
    const trust = context.trust || 0;
    const mood = personality.mood;

    const templates = {
        ecstatic: {
            base: "jumps around excitedly",
            action: "*spins in circles*",
            greeting: "so happy to see you!",
            reaction: "*tail wagging intensely*"
        },
        happy: {
            base: "greets you warmly",
            action: "*wags tail happily*",
            greeting: "nice to see you!",
            reaction: "*happy sounds*"
        },
        content: {
            base: "acknowledges you",
            action: "*nods slowly*",
            greeting: "hello there",
            reaction: "*peaceful sounds*"
        },
        neutral: {
            base: "looks at you neutrally",
            action: "*stares*",
            greeting: "what do you want?",
            reaction: "*neutral sounds*"
        },
        sad: {
            base: "looks away sadly",
            action: "*lowers head*",
            greeting: "don't bother me",
            reaction: "*sad sounds*"
        },
        angry: {
            base: "growls at you",
            action: "*bares teeth*",
            greeting: "I don't like you!",
            reaction: "*angry sounds*"
        },
        furious: {
            base: "attacks you!",
            action: "*charges at you*",
            greeting: "STAY AWAY!",
            reaction: "*roar*"
        }
    };

    return templates[mood] || templates.neutral;
}

/**
 * Build response from template
 */
function buildResponse(template, personality, memory, context) {
    const types = [
        template.base,
        template.action,
        template.greeting,
        template.reaction
    ];

    const selected = types[Math.floor(Math.random() * types.length)];

    // Add personality flavor
    let flavoredResponse = selected;

    if (personality.personalities.includes("playful")) {
        flavoredResponse = "*playfully* " + flavoredResponse;
    }

    if (personality.personalities.includes("curious")) {
        flavoredResponse += " *curious about you*";
    }

    if (personality.personalities.includes("protective")) {
        if (context.playerName) {
            flavoredResponse += " *stands protectively near " + context.playerName + "*";
        }
    }

    return flavoredResponse;
}

/**
 * Should broadcast response
 */
function shouldBroadcastResponse(personality) {
    // More social personalities broadcast more
    const socialTraits = ["friendly", "playful", "loyal", "protective"];
    const hasSocialTrait = personality.personalities.some(p => socialTraits.includes(p));

    return hasSocialTrait || personality.mood === "ecstatic" || personality.mood === "happy";
}

/**
 * Calculate response confidence
 */
function calculateResponseConfidence(personality) {
    let confidence = 0.5;

    // Intelligent mobs are more confident
    if (personality.traits?.intelligence) {
        confidence += personality.traits.intelligence * 0.2;
    }

    // Mood affects confidence
    const moodConfidence = {
        ecstatic: 0.9,
        happy: 0.8,
        content: 0.6,
        neutral: 0.5,
        sad: 0.4,
        angry: 0.7,
        furious: 0.8
    };

    confidence = moodConfidence[personality.mood] || confidence;

    return Math.min(1, confidence);
}

/**
 * Generate behavior pattern
 */
export function generateBehaviorPattern(personality) {
    const patterns = {
        playful: {
            jumpFrequency: 0.3,
            moveRange: 20,
            interactivity: 0.8,
            groupBehavior: true
        },
        curious: {
            jumpFrequency: 0.1,
            moveRange: 30,
            interactivity: 0.7,
            groupBehavior: false
        },
        lazy: {
            jumpFrequency: 0.05,
            moveRange: 5,
            interactivity: 0.3,
            groupBehavior: false
        },
        protective: {
            jumpFrequency: 0.2,
            moveRange: 25,
            interactivity: 0.6,
            groupBehavior: true
        },
        predatory: {
            jumpFrequency: 0.4,
            moveRange: 40,
            interactivity: 0.5,
            groupBehavior: true
        }
    };

    let pattern = {
        jumpFrequency: 0.1,
        moveRange: 15,
        interactivity: 0.5,
        groupBehavior: false
    };

    for (const trait of personality.personalities) {
        if (patterns[trait]) {
            pattern = { ...pattern, ...patterns[trait] };
        }
    }

    return pattern;
}

/**
 * Predict next action
 */
export function predictNextAction(personality, memory) {
    const likelihood = {
        idle: 30,
        move: 25,
        eat: 20,
        sleep: 15,
        interact: 10
    };

    // Modify by personality
    if (personality.personalities.includes("playful")) {
        likelihood.move += 15;
        likelihood.interact += 10;
        likelihood.idle -= 25;
    }

    if (personality.personalities.includes("lazy")) {
        likelihood.sleep += 20;
        likelihood.idle += 15;
        likelihood.move -= 30;
    }

    if (personality.personalities.includes("curious")) {
        likelihood.move += 20;
        likelihood.interact += 15;
        likelihood.idle -= 35;
    }

    // Modify by hunger
    if (personality.hunger > 60) {
        likelihood.eat += 40;
        likelihood.idle -= 30;
    }

    // Modify by energy
    if (personality.energy < 30) {
        likelihood.sleep += 30;
        likelihood.idle += 15;
        likelihood.move -= 45;
    }

    // Normalize probabilities
    const total = Object.values(likelihood).reduce((a, b) => a + b, 0);

    for (const [key, value] of Object.entries(likelihood)) {
        likelihood[key] = value / total;
    }

    return likelihood;
}

/**
 * Get mob learning state
 */
export function getMobLearningState(mobId) {
    const stored = world.getDynamicProperty(`geniimob:learning:${mobId}`);

    if (stored) {
        return JSON.parse(stored);
    }

    return createDefaultLearningState(mobId);
}

/**
 * Create default learning state
 */
function createDefaultLearningState(mobId) {
    return {
        mobId,
        skillsLearned: [],
        dangerPatterns: [],
        safeZones: [],
        routines: [],
        preferences: {},
        createdAt: Date.now()
    };
}

/**
 * Update learning state
 */
export function updateLearningState(mobId, learningData) {
    world.setDynamicProperty(`geniimob:learning:${mobId}`, JSON.stringify(learningData));
}

/**
 * Teach mob new behavior
 */
export function teachMobBehavior(mobId, behavior, context) {
    const learningState = getMobLearningState(mobId);

    const newSkill = {
        name: behavior,
        context,
        learnedAt: Date.now(),
        timesUsed: 0,
        effectiveness: 0.5
    };

    learningState.skillsLearned.push(newSkill);

    if (learningState.skillsLearned.length > 20) {
        learningState.skillsLearned.shift();
    }

    updateLearningState(mobId, learningState);

    return newSkill;
}

/**
 * Get mob intelligence score
 */
export function calculateIntelligenceScore(personality) {
    let score = 50; // Base score

    if (personality.traits?.intelligence) {
        score += personality.traits.intelligence * 30;
    }

    if (personality.traits?.memory) {
        score += 15;
    }

    if (personality.traits?.problemSolving) {
        score += personality.traits.problemSolving * 25;
    }

    if (personality.traits?.adaptability) {
        score += personality.traits.adaptability * 20;
    }

    return Math.round(Math.min(100, score));
}

export default {
    makeMobDecision,
    generateMobResponse,
    generateBehaviorPattern,
    predictNextAction,
    getMobLearningState,
    teachMobBehavior,
    calculateIntelligenceScore
};
