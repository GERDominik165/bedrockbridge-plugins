/**
 * Gemini Mob Plugin - Actions System Module
 * @version 1.0.0
 * @author BedrockBridge Community
 *
 * Visual and audio actions for mobs (emotes, animations, sounds)
 */

import { world, system, Vector3 } from "@minecraft/server";
import { getMobPersonality } from "./mobPersonality.js";

/**
 * Execute mob action/emote
 */
export function executeMobAction(mobEntity, actionType, context = {}) {
    const personality = getMobPersonality(mobEntity.id || mobEntity.nameTag);

    const action = selectAction(actionType, personality, context);

    if (!action) {
        return { success: false, message: "No action available" };
    }

    applyVisualEffect(mobEntity, action, personality);
    broadcastMobAction(mobEntity, action, personality);

    return {
        success: true,
        action,
        message: action.description
    };
}

/**
 * Select appropriate action based on type and personality
 */
function selectAction(actionType, personality, context) {
    const actions = {
        happy: getHappyActions(personality),
        sad: getSadActions(personality),
        angry: getAngryActions(personality),
        scared: getScaredActions(personality),
        curious: getCuriousActions(personality),
        tired: getTiredActions(personality),
        playing: getPlayingActions(personality),
        eating: getEatingActions(personality),
        resting: getRestingActions(personality),
        greeting: getGreetingActions(personality),
        defending: getDefendingActions(personality)
    };

    const actionList = actions[actionType] || [];

    if (actionList.length === 0) {
        return null;
    }

    return actionList[Math.floor(Math.random() * actionList.length)];
}

/**
 * Get happy actions
 */
function getHappyActions(personality) {
    const baseActions = [
        { name: "tail-wag", description: "*wags tail happily*", animation: "tail.wag", sound: "happy" },
        { name: "jump", description: "*jumps excitedly*", animation: "jump", sound: "excited" },
        { name: "spin", description: "*spins in circles*", animation: "spin", sound: "playful" },
        { name: "prance", description: "*prances around*", animation: "prance", sound: "happy" },
        { name: "purr", description: "*purrs contentedly*", animation: "purr", sound: "purr" }
    ];

    const personalitySpecific = {
        playful: [{ name: "bounce", description: "*bounces excitedly*", animation: "bounce", sound: "bouncy" }],
        gentle: [{ name: "nuzzle", description: "*nuzzles you affectionately*", animation: "nuzzle", sound: "soft" }],
        loyal: [{ name: "follow", description: "*follows closely*", animation: "follow", sound: "devoted" }],
        protective: [{ name: "stand-guard", description: "*stands protectively*", animation: "stand-guard", sound: "alert" }]
    };

    let actions = [...baseActions];

    for (const trait of personality.personalities) {
        if (personalitySpecific[trait]) {
            actions = actions.concat(personalitySpecific[trait]);
        }
    }

    return actions;
}

/**
 * Get sad actions
 */
function getSadActions(personality) {
    return [
        { name: "sit-down", description: "*sits down sadly*", animation: "sit", sound: "sad" },
        { name: "sigh", description: "*sighs heavily*", animation: "sigh", sound: "sigh" },
        { name: "whimper", description: "*whimpers quietly*", animation: "whimper", sound: "whimper" },
        { name: "look-away", description: "*looks away sadly*", animation: "look-away", sound: "sad" },
        { name: "droop", description: "*ears droop sadly*", animation: "droop", sound: "sad" }
    ];
}

/**
 * Get angry actions
 */
function getAngryActions(personality) {
    const baseActions = [
        { name: "growl", description: "*growls angrily*", animation: "growl", sound: "growl" },
        { name: "paw-ground", description: "*paws the ground*", animation: "paw", sound: "stomp" },
        { name: "hiss", description: "*hisses menacingly*", animation: "hiss", sound: "hiss" },
        { name: "bare-teeth", description: "*bares teeth*", animation: "bare-teeth", sound: "snarl" },
        { name: "tail-swipe", description: "*swipes tail angrily*", animation: "tail-swipe", sound: "swipe" }
    ];

    const personalitySpecific = {
        protective: [{ name: "stance", description: "*takes defensive stance*", animation: "stance", sound: "defense" }],
        predatory: [{ name: "stalk", description: "*stalks forward*", animation: "stalk", sound: "hunting" }],
        aggressive: [{ name: "charge", description: "*charges forward*", animation: "charge", sound: "charge" }]
    };

    let actions = [...baseActions];

    for (const trait of personality.personalities) {
        if (personalitySpecific[trait]) {
            actions = actions.concat(personalitySpecific[trait]);
        }
    }

    return actions;
}

/**
 * Get scared actions
 */
function getScaredActions(personality) {
    return [
        { name: "jump-back", description: "*jumps back in fear*", animation: "jump-back", sound: "fear" },
        { name: "cower", description: "*cowers in fear*", animation: "cower", sound: "whimper" },
        { name: "run-away", description: "*runs away quickly*", animation: "run", sound: "panic" },
        { name: "hide", description: "*tries to hide*", animation: "hide", sound: "scared" },
        { name: "shake", description: "*shakes with fear*", animation: "shake", sound: "trembling" }
    ];
}

/**
 * Get curious actions
 */
function getCuriousActions(personality) {
    return [
        { name: "sniff", description: "*sniffs around curiously*", animation: "sniff", sound: "curious" },
        { name: "head-tilt", description: "*tilts head curiously*", animation: "head-tilt", sound: "curious" },
        { name: "investigate", description: "*investigates carefully*", animation: "investigate", sound: "exploring" },
        { name: "pounce", description: "*pounces on something*", animation: "pounce", sound: "playful" },
        { name: "peer", description: "*peers at you carefully*", animation: "peer", sound: "interested" }
    ];
}

/**
 * Get tired actions
 */
function getTiredActions(personality) {
    return [
        { name: "yawn", description: "*yawns widely*", animation: "yawn", sound: "yawn" },
        { name: "stretch", description: "*stretches lazily*", animation: "stretch", sound: "relaxed" },
        { name: "lie-down", description: "*lies down tired*", animation: "lie-down", sound: "tired" },
        { name: "sleep", description: "*falls asleep*", animation: "sleep", sound: "sleep" },
        { name: "drowsy", description: "*looks drowsy*", animation: "drowsy", sound: "sleepy" }
    ];
}

/**
 * Get playing actions
 */
function getPlayingActions(personality) {
    return [
        { name: "play-bow", description: "*does a play bow*", animation: "play-bow", sound: "playful" },
        { name: "chase", description: "*plays chase*", animation: "chase", sound: "playful" },
        { name: "tumble", description: "*tumbles playfully*", animation: "tumble", sound: "playful" },
        { name: "wrestle", description: "*wrestles with air*", animation: "wrestle", sound: "playful" },
        { name: "leap", description: "*leaps around*", animation: "leap", sound: "excited" }
    ];
}

/**
 * Get eating actions
 */
function getEatingActions(personality) {
    return [
        { name: "nom", description: "*eats happily*", animation: "eat", sound: "eating" },
        { name: "slurp", description: "*slurps food eagerly*", animation: "slurp", sound: "eating" },
        { name: "munch", description: "*munches contentedly*", animation: "chew", sound: "chewing" },
        { name: "gulp", description: "*gulps down food*", animation: "swallow", sound: "gulp" },
        { name: "savor", description: "*savors the taste*", animation: "taste", sound: "satisfied" }
    ];
}

/**
 * Get resting actions
 */
function getRestingActions(personality) {
    return [
        { name: "nap", description: "*takes a nap*", animation: "nap", sound: "rest" },
        { name: "curl-up", description: "*curls up comfortably*", animation: "curl", sound: "cozy" },
        { name: "relax", description: "*relaxes peacefully*", animation: "relax", sound: "calm" },
        { name: "settle", description: "*settles down*", animation: "settle", sound: "content" },
        { name: "snooze", description: "*snoozes quietly*", animation: "snooze", sound: "sleep" }
    ];
}

/**
 * Get greeting actions
 */
function getGreetingActions(personality) {
    const baseActions = [
        { name: "wave", description: "*waves at you*", animation: "wave", sound: "greeting" },
        { name: "nod", description: "*nods in greeting*", animation: "nod", sound: "hello" },
        { name: "approach", description: "*approaches you friendly*", animation: "approach", sound: "greeting" },
        { name: "look-at", description: "*looks at you warmly*", animation: "look-at", sound: "hello" },
        { name: "bow", description: "*bows respectfully*", animation: "bow", sound: "respectful" }
    ];

    const personalitySpecific = {
        loyal: [{ name: "loyal-greet", description: "*greets you with absolute joy*", animation: "loyal-greet", sound: "devoted" }],
        friendly: [{ name: "enthusiastic", description: "*greets you enthusiastically*", animation: "enthusiastic", sound: "excited" }],
        protective: [{ name: "protective-nod", description: "*nods while guarding*", animation: "protective", sound: "alert" }]
    };

    let actions = [...baseActions];

    for (const trait of personality.personalities) {
        if (personalitySpecific[trait]) {
            actions = actions.concat(personalitySpecific[trait]);
        }
    }

    return actions;
}

/**
 * Get defending actions
 */
function getDefendingActions(personality) {
    return [
        { name: "shield", description: "*shields someone*", animation: "shield", sound: "defense" },
        { name: "stand-tall", description: "*stands tall and proud*", animation: "stand-tall", sound: "strength" },
        { name: "roar", description: "*roars defiantly*", animation: "roar", sound: "roar" },
        { name: "block", description: "*blocks the way*", animation: "block", sound: "defense" },
        { name: "guard", description: "*guards vigilantly*", animation: "guard", sound: "alert" }
    ];
}

/**
 * Apply visual effect
 */
function applyVisualEffect(mobEntity, action, personality) {
    try {
        // Add particles or effects based on action
        const effects = {
            "tail-wag": { particle: "minecraft:happy_villager" },
            "jump": { particle: "minecraft:jump" },
            "spin": { particle: "minecraft:note" },
            "growl": { particle: "minecraft:smoke" },
            "scared": { particle: "minecraft:explode" }
        };

        const effect = effects[action.name];

        if (effect && mobEntity.dimension && mobEntity.location) {
            // Spawn particle effect
            try {
                mobEntity.dimension.spawnParticle(
                    effect.particle,
                    mobEntity.location,
                    { x: 0.5, y: 0.5, z: 0.5 }
                );
            } catch (e) {
                // Particle spawn might fail silently
            }
        }
    } catch (e) {
        // Visual effects are optional
    }
}

/**
 * Broadcast mob action
 */
function broadcastMobAction(mobEntity, action, personality) {
    try {
        const name = mobEntity.nameTag || personality.typeName;
        const actionMessage = `§6[${name}] §f${action.description}`;

        // Send to nearby players
        if (mobEntity.dimension) {
            const nearbyPlayers = mobEntity.dimension.getPlayers({
                maxDistance: 32,
                location: mobEntity.location
            });

            for (const player of nearbyPlayers) {
                try {
                    player.sendMessage(actionMessage);
                } catch (e) {
                    // Player send might fail
                }
            }
        }
    } catch (e) {
        // Broadcasting is optional
    }
}

/**
 * Play mob sound
 */
export function playMobSound(mobEntity, soundType) {
    try {
        const soundMap = {
            happy: "mob.mob.happy",
            excited: "mob.mob.excited",
            playful: "mob.mob.playful",
            sad: "mob.mob.sad",
            angry: "mob.mob.angry",
            scared: "mob.mob.scared",
            hurt: "mob.mob.hurt"
        };

        const sound = soundMap[soundType] || `mob.${soundType}`;

        if (mobEntity.dimension && mobEntity.location) {
            // Sound would be played here with audio API
            // This is a placeholder
        }
    } catch (e) {
        // Sound effects are optional
    }
}

/**
 * Create speech bubble effect
 */
export function createSpeechBubble(mobEntity, message, duration = 60) {
    try {
        const actionbarMessage = `§c${mobEntity.nameTag || "Mob"}§r: §f${message.substring(0, 50)}`;

        if (mobEntity.dimension) {
            const nearbyPlayers = mobEntity.dimension.getPlayers({
                maxDistance: 32,
                location: mobEntity.location
            });

            for (const player of nearbyPlayers) {
                try {
                    player.onScreenDisplay.setActionBar(actionbarMessage);
                } catch (e) {
                    // Actionbar might fail
                }
            }
        }
    } catch (e) {
        // Speech bubbles are optional
    }
}

/**
 * Create damage effect
 */
export function createDamageEffect(mobEntity) {
    try {
        if (mobEntity.dimension && mobEntity.location) {
            // Red particles to show damage
            mobEntity.dimension.spawnParticle(
                "minecraft:damage_indicator",
                mobEntity.location,
                { x: 0.5, y: 0.5, z: 0.5 }
            );
        }
    } catch (e) {
        // Effects are optional
    }
}

/**
 * Create healing effect
 */
export function createHealingEffect(mobEntity) {
    try {
        if (mobEntity.dimension && mobEntity.location) {
            // Green particles to show healing
            mobEntity.dimension.spawnParticle(
                "minecraft:happy_villager",
                mobEntity.location,
                { x: 0.5, y: 0.5, z: 0.5 }
            );
        }
    } catch (e) {
        // Effects are optional
    }
}

/**
 * Get action description
 */
export function getActionDescription(actionName) {
    const descriptions = {
        "tail-wag": "Wags tail happily",
        "jump": "Jumps excitedly",
        "spin": "Spins in circles",
        "growl": "Growls angrily",
        "scared": "Shows fear",
        "sniff": "Sniffs curiously",
        "eat": "Eats happily"
    };

    return descriptions[actionName] || "Performs an action";
}

/**
 * Build emote message
 */
export function buildEmoteMessage(mobName, actionDescription) {
    return `*${mobName} ${actionDescription}*`;
}

export default {
    executeMobAction,
    playMobSound,
    createSpeechBubble,
    createDamageEffect,
    createHealingEffect,
    getActionDescription,
    buildEmoteMessage
};
