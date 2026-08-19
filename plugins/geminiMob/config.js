/**
 * Gemini Mob Plugin - Configuration Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Comprehensive mob configuration with personalities, interactions, and behaviors
 */

import { world } from "@minecraft/server";

// ==================== MOB TYPE DEFINITIONS ====================

const MOB_TYPES = {
    // Passive Mobs
    cow: {
        name: "Cow",
        type: "passive",
        personalities: ["gentle", "curious", "social", "lazy", "protective"],
        sounds: ["moo", "moo moo", "*contented moo*"],
        interactions: {
            feed: ["milk", "wheat", "grass"],
            pet: ["gentle moo", "happy moo", "*nudges you affectionately*"],
            hit: ["pained moo", "angry moo", "*backs away nervously*"],
            milk: ["gives milk", "*yields to milking*", "thanks"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 100,
            memory: true,
            breed: true,
            followFood: true
        }
    },

    sheep: {
        name: "Sheep",
        type: "passive",
        personalities: ["timid", "curious", "follower", "playful", "anxious"],
        sounds: ["baaa", "baa baa", "*nervous bleating*"],
        interactions: {
            feed: ["grass", "wheat", "clover"],
            pet: ["happy bleat", "*happily prances*", "baa~"],
            hit: ["distressed bleat", "*quickly flees*", "baaaa!"],
            shear: ["relief", "*wool removed*", "baaa"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 80,
            memory: true,
            breed: true,
            followFood: true
        }
    },

    pig: {
        name: "Pig",
        type: "passive",
        personalities: ["greedy", "playful", "intelligent", "mischievous", "friendly"],
        sounds: ["oink", "oink oink", "*snuffles around*"],
        interactions: {
            feed: ["carrot", "potato", "beetroot"],
            pet: ["happy oink", "*wags tail*", "oink!"],
            hit: ["angry oink", "*tries to flee*", "OINK OINK"],
            ride: ["*trots forward*", "willing to go", "steady now"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 90,
            memory: true,
            breed: true,
            followFood: true
        }
    },

    chicken: {
        name: "Chicken",
        type: "passive",
        personalities: ["nervous", "curious", "flighty", "easily scared", "social"],
        sounds: ["bawk", "bawk bawk", "*frightened squawks*"],
        interactions: {
            feed: ["seeds", "grain", "wheat"],
            pet: ["gentle cluck", "*calm clucking*", "bawk~"],
            hit: ["loud squawk", "*flies away frantically*", "BAWK!"],
            collect: ["*dropped egg*", "thanks for care", "bawk"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 60,
            memory: true,
            breed: true,
            followFood: true
        }
    },

    rabbit: {
        name: "Rabbit",
        type: "passive",
        personalities: ["jumpy", "curious", "swift", "cautious", "adorable"],
        sounds: ["screech", "*quiet squeaking*", "*hop hop*"],
        interactions: {
            feed: ["carrot", "grass", "dandelion"],
            pet: ["soft squeak", "*nuzzles you*", "purr"],
            hit: ["loud screech", "*bounces away fast*", "SCREECH"],
            love: ["*binky jump*", "bouncy happily", "wheee"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 75,
            memory: true,
            breed: true,
            followFood: true
        }
    },

    // Neutral Mobs
    wolf: {
        name: "Wolf",
        type: "neutral",
        personalities: ["loyal", "protective", "intelligent", "cautious", "pack-oriented"],
        sounds: ["woof", "growl", "*threatening snarl*"],
        interactions: {
            pet: ["happy bark", "*tail wags*", "arooo"],
            hit: ["angry growl", "*snaps at you*", "WOOF!"],
            tame: ["*allows taming*", "submits to collar", "now loyal"],
            feed: ["*pleased growl*", "thanks friend", "*satisfied chew*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 100,
            memory: true,
            tame: true,
            territorial: true
        }
    },

    spider: {
        name: "Spider",
        type: "neutral",
        personalities: ["predatory", "calculating", "patient", "territorial", "alert"],
        sounds: ["hiss", "*menacing chittering*", "*web-spinning sound*"],
        interactions: {
            pet: ["*clicks nervously*", "still dangerous", "be careful"],
            hit: ["angry hiss", "*raises fangs*", "HSSSSS"],
            observe: ["*watches intently*", "evaluating", "*spins web*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 40,
            memory: true,
            tame: false,
            territorial: true
        }
    },

    cave_spider: {
        name: "Cave Spider",
        type: "neutral",
        personalities: ["venomous", "aggressive", "quick", "territorial", "cunning"],
        sounds: ["hiss", "*poisonous hiss*", "*rapid clicking*"],
        interactions: {
            pet: ["*defensive stance*", "too dangerous", "warns you"],
            hit: ["venomous hiss", "*strikes quickly*", "POISON"],
            observe: ["*glowing eyes*", "hunting mood", "*stalking*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 20,
            memory: true,
            tame: false,
            territorial: true
        }
    },

    // Hostile Mobs
    zombie: {
        name: "Zombie",
        type: "hostile",
        personalities: ["mindless", "relentless", "slow", "predictable", "undead"],
        sounds: ["braaaains", "groan", "*unsettling moan*"],
        interactions: {
            hit: ["angry roar", "*swings at you*", "ATTACK"],
            observe: ["*shambles forward*", "*fixated on you*", "*groaning menacingly*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 0,
            memory: false,
            tame: false,
            hostile: true
        }
    },

    skeleton: {
        name: "Skeleton",
        type: "hostile",
        personalities: ["strategic", "ranged", "clever", "patient", "undead"],
        sounds: ["rattle", "*bone clacking*", "*bow-string tense*"],
        interactions: {
            hit: ["angry rattle", "*draws arrow*", "ATTACK"],
            observe: ["*aims at you*", "*calculates distance*", "*skeletal laugh*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 0,
            memory: false,
            tame: false,
            hostile: true
        }
    },

    creeper: {
        name: "Creeper",
        type: "hostile",
        personalities: ["explosive", "suicidal", "silent", "destructive", "volatile"],
        sounds: ["sssss", "*increasing hiss*", "*beeping*"],
        interactions: {
            hit: ["hiss intensifies", "*backs up*", "ssssssss"],
            observe: ["*charging*", "*glowing intensely*", "*beeping faster*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 0,
            memory: false,
            tame: false,
            hostile: true
        }
    },

    enderman: {
        name: "Enderman",
        type: "hostile",
        personalities: ["mysterious", "territorial", "powerful", "alien", "intelligent"],
        sounds: ["*otherworldly screech*", "*teleport sound*", "*distorted voice*"],
        interactions: {
            hit: ["angry shriek", "*teleports away*", "SCREEEEECH"],
            observe: ["*stares intensely*", "*block teleport*", "*reality bends*"]
        },
        traits: {
            trustLevel: 0,
            maxTrust: 0,
            memory: true,
            tame: false,
            hostile: true
        }
    }
};

// ==================== PERSONALITY TRAITS ====================

const PERSONALITY_TRAITS = {
    gentle: {
        name: "Sanft",
        emoji: "🐾",
        traits: { reactivity: 0.5, trustGain: 2, trustLoss: 0.5 }
    },
    curious: {
        name: "Neugierig",
        emoji: "👀",
        traits: { reactivity: 0.8, followRange: 1.5, investigateEvents: true }
    },
    loyal: {
        name: "Treu",
        emoji: "💛",
        traits: { trustGain: 3, stayNear: true, defendOwner: true }
    },
    protective: {
        name: "Schützend",
        emoji: "🛡️",
        traits: { aggressive: true, defendOwner: true, territorial: true }
    },
    lazy: {
        name: "Faul",
        emoji: "😴",
        traits: { moveSpeed: 0.5, interestSpan: 0.3, restFrequency: 0.8 }
    },
    playful: {
        name: "Verspielt",
        emoji: "🎮",
        traits: { reactivity: 0.9, jumpFrequency: 0.8, followRange: 2.0 }
    },
    intelligent: {
        name: "Intelligent",
        emoji: "🧠",
        traits: { problemSolving: 0.8, memory: true, adaptability: 0.9 }
    },
    mischievous: {
        name: "Schelmisch",
        emoji: "😈",
        traits: { reactivity: 0.9, unpredictable: 0.7, interestSpan: 0.4 }
    },
    friendly: {
        name: "Freundlich",
        emoji: "😊",
        traits: { trustGain: 2.5, followRange: 2.5, socializing: true }
    },
    greedy: {
        name: "Gefräßig",
        emoji: "🍴",
        traits: { foodFocus: 0.9, followFood: true, foodRange: 2.0 }
    },
    timid: {
        name: "Schüchtern",
        emoji: "😨",
        traits: { fleeDistance: 1.5, trustGain: 1, reactivity: 0.6 }
    },
    follower: {
        name: "Nachfolger",
        emoji: "🐑",
        traits: { followRange: 2.0, groupBehavior: true, stayClose: true }
    },
    anxious: {
        name: "Ängstlich",
        emoji: "😰",
        traits: { reactivity: 0.7, fearOfLoudNoise: true, trustLoss: 1.5 }
    },
    predatory: {
        name: "Räuberisch",
        emoji: "🦈",
        traits: { aggressive: true, huntMobs: true, territorial: true }
    },
    calculating: {
        name: "Berechnend",
        emoji: "🎯",
        traits: { intelligence: 0.8, patience: 0.9, ambushBehavior: true }
    },
    patient: {
        name: "Geduldig",
        emoji: "⏳",
        traits: { waitTime: 3.0, ambushBehavior: true, trackingRange: 2.5 }
    },
    alert: {
        name: "Aufmerksam",
        emoji: "🚨",
        traits: { detectionRange: 1.8, reactionTime: 0.3, memory: true }
    },
    loyal: {
        name: "Treu",
        emoji: "💙",
        traits: { trustGain: 3, stayNear: true, defendOwner: true }
    },
    mindless: {
        name: "Gedankenlos",
        emoji: "🧟",
        traits: { intelligence: 0.1, unpredictable: 0.2, memory: false }
    },
    relentless: {
        name: "Unnachgiebig",
        emoji: "💪",
        traits: { persistence: 1.0, chaseRange: 3.0, giveUp: 0.0 }
    },
    mysterious: {
        name: "Mysteriös",
        emoji: "🌑",
        traits: { intelligence: 0.9, unpredictable: 0.6, memory: true }
    },
    territorial: {
        name: "Territorial",
        emoji: "🚩",
        traits: { territoryRange: 2.0, aggressive: true, stayInArea: true }
    },
    powerful: {
        name: "Mächtig",
        emoji: "⚡",
        traits: { damage: 2.0, knockback: 1.5, fear: 0.8 }
    },
    alien: {
        name: "Außerirdisch",
        emoji: "👽",
        traits: { unpredictable: 0.8, intelligence: 0.9, hostility: 0.9 }
    }
};

// ==================== INTERACTION TYPES ====================

const INTERACTION_TYPES = {
    FEED: "feed",
    PET: "pet",
    HIT: "hit",
    TRADE: "trade",
    BREED: "breed",
    TAME: "tame",
    OBSERVE: "observe",
    TALK: "talk",
    PLAY: "play",
    PROTECT: "protect",
    GATHER: "gather"
};

// ==================== RELATIONSHIP LEVELS ====================

const RELATIONSHIP_LEVELS = {
    hostile: { min: -100, max: -50, emoji: "💔", color: "§c" },
    unfriendly: { min: -50, max: -10, emoji: "😠", color: "§6" },
    neutral: { min: -10, max: 10, emoji: "😐", color: "§7" },
    friendly: { min: 10, max: 50, emoji: "😊", color: "§a" },
    trusted: { min: 50, max: 100, emoji: "❤️", color: "§b" },
    bonded: { min: 100, max: 200, emoji: "💕", color: "§d" }
};

// ==================== DEFAULT CONFIGURATION ====================

const DEFAULTS = {
    // System Settings
    pluginEnabled: true,
    apiKey: "REDACTED",
    modelName: "gemini-flash-latest",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models",

    // Mob System
    enableMobPersonalities: true,
    enableMobMemory: true,
    enableMobInteractions: true,
    enableMobEmotes: true,
    enableMobChat: true,

    // Interaction Settings
    maxMobMemoryPerPlayer: 100,
    memoryDecayTime: 3600, // seconds
    trustChangeRate: 1.0,
    relationshipUpdateInterval: 20, // ticks

    // AI Settings
    mobAIUpdateInterval: 40, // ticks
    enableAdvancedAI: true,
    enableLearning: true,
    enableFriendships: true,

    // Chat Settings
    mobChatPrefix: "@m",
    enableMobResponses: true,
    enableMobThinking: true,
    maxMobResponseLength: 200,

    // Broadcast Settings
    broadcastMobActions: true,
    broadcastMobChat: true,
    broadcastRelationshipChanges: true,

    // Command Settings
    enableCommands: true,
    commandPrefix: "/mob",

    // Database
    enablePersistence: true,
    savePath: "geminiMob",

    // Debug
    debugMode: false,
    enableLogging: true,
    logPath: "geminiMob"
};

// ==================== CONFIGURATION FUNCTIONS ====================

/**
 * Get configuration value
 */
export function getConfig(key, defaultValue = null) {
    const storedValue = world.getDynamicProperty(`geniimob:config:${key}`);
    if (storedValue !== undefined) {
        return storedValue;
    }
    return defaultValue !== null ? defaultValue : DEFAULTS[key];
}

/**
 * Set configuration value
 */
export function setConfig(key, value) {
    if (typeof value === "object") {
        world.setDynamicProperty(`geniimob:config:${key}`, JSON.stringify(value));
    } else {
        world.setDynamicProperty(`geniimob:config:${key}`, value);
    }
}

/**
 * Initialize default configuration
 */
export function initializeConfig() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (world.getDynamicProperty(`geniimob:config:${key}`) === undefined) {
            setConfig(key, value);
        }
    }
}

/**
 * Get all mob type configurations
 */
export function getMobTypes() {
    return MOB_TYPES;
}

/**
 * Get specific mob type configuration
 */
export function getMobType(mobId) {
    return MOB_TYPES[mobId] || null;
}

/**
 * Get all personality traits
 */
export function getPersonalityTraits() {
    return PERSONALITY_TRAITS;
}

/**
 * Get specific personality trait
 */
export function getPersonalityTrait(traitId) {
    return PERSONALITY_TRAITS[traitId] || null;
}

/**
 * Get interaction types
 */
export function getInteractionTypes() {
    return INTERACTION_TYPES;
}

// Direct export for convenience
export { INTERACTION_TYPES, PERSONALITY_TRAITS, MOB_TYPES, RELATIONSHIP_LEVELS };

/**
 * Get relationship levels
 */
export function getRelationshipLevels() {
    return RELATIONSHIP_LEVELS;
}

/**
 * Get relationship level by trust value
 */
export function getRelationshipLevel(trustValue) {
    for (const [level, config] of Object.entries(RELATIONSHIP_LEVELS)) {
        if (trustValue >= config.min && trustValue <= config.max) {
            return { level, ...config };
        }
    }
    return RELATIONSHIP_LEVELS.neutral;
}

/**
 * Validate API key is configured
 */
export function isApiKeyConfigured() {
    const apiKey = REDACTED"apiKey");
    return apiKey && apiKey !== "YOUR_GEMINI_API_KEY_HERE";
}

/**
 * Get API endpoint URL
 */
export function getApiEndpoint() {
    const modelName = getConfig("modelName");
    const apiKey = REDACTED"apiKey");
    return `${getConfig("apiUrl")}/${modelName}:generateContent?key=${apiKey}`;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
    for (const key of Object.keys(DEFAULTS)) {
        setConfig(key, DEFAULTS[key]);
    }
}

export const CONFIG_DEFAULTS = DEFAULTS;
export const MOB_CONFIG_TYPES = MOB_TYPES;
export const PERSONALITY_CONFIG_TRAITS = PERSONALITY_TRAITS;
export const INTERACTION_CONFIG_TYPES = INTERACTION_TYPES;
export const RELATIONSHIP_CONFIG_LEVELS = RELATIONSHIP_LEVELS;
