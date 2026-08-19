/**
 * TrophyNetwork - AI Bot SimulatedPlayer Bridge
 * Erstellt echte SimulatedPlayer für AI Multiplayer rg:bot Entities
 * SimulatedPlayer erscheinen in Spielerliste, Lokator und auf der Map
 * @author TrophyNetwork
 */
import * as mc from '@minecraft/server';
import * as gt from '@minecraft/server-gametest';

const { world, system } = mc;
const BOT_TYPE = "rg:bot";
const NAMESPACE = "rg";

// Store: botEntityId -> SimulatedPlayer
const botSimPlayers = new Map();
let gameTestInstance = null;

// Register GameTest for SimulatedPlayer creation
gt.register('tn_bots', 'ai_sim_players', (test) => {
    gameTestInstance = test;
    console.warn('[TN AI Bridge] GameTest instance ready - SimulatedPlayer creation enabled');
    
    // Start sync loop
    startBotSyncLoop(test);
    
    // Keep test alive forever
})
.maxTicks(0x7FFFFFFF)
.structureName('fakeplayer:server'); // Reuse fakeplayer structure

// Load the GameTest
system.runTimeout(() => {
    try {
        const over = world.getDimension('minecraft:overworld');
        const c = 999999990; // Far corner
        over.runCommand('gametest clearall');
        over.runCommand('execute positioned ' + c + ' 256 ' + c + ' run gametest run tn_bots:ai_sim_players');
        console.warn('[TN AI Bridge] GameTest loading...');
    } catch(e) {
        console.warn('[TN AI Bridge] Error loading GameTest: ' + e);
    }
}, 30);

// Subscribe to bot spawns
world.afterEvents.entitySpawn.subscribe(event => {
    const entity = event?.entity;
    if (!entity?.isValid) return;
    if (entity.typeId !== BOT_TYPE) return;
    
    // Wait for bot to be fully initialized
    system.runTimeout(() => {
        if (!entity?.isValid) return;
        spawnSimPlayerForBot(entity);
    }, 5);
});

// Subscribe to bot deaths/removal
world.afterEvents.entityDie.subscribe(event => {
    const entity = event?.deadEntity;
    if (!entity) return;
    if (entity.typeId !== BOT_TYPE) return;
    
    removeSimPlayerForBot(entity.id);
});

world.afterEvents.entityRemove.subscribe(event => {
    const id = event?.removedEntityId;
    if (!id) return;
    
    // Check if this was a tracked bot
    if (botSimPlayers.has(id)) {
        removeSimPlayerByEntityId(id);
    }
});

function spawnSimPlayerForBot(botEntity) {
    if (!gameTestInstance) {
        console.warn('[TN AI Bridge] No GameTest instance yet, retrying...');
        system.runTimeout(() => spawnSimPlayerForBot(botEntity), 20);
        return;
    }
    
    if (!botEntity?.isValid) return;
    if (botSimPlayers.has(botEntity.id)) return; // Already has SimPlayer
    
    try {
        const name = botEntity.nameTag || ('Bot_' + botEntity.id.substring(0, 6));
        const loc = botEntity.location;
        
        // Create SimulatedPlayer with bot's name
        const simPlayer = gameTestInstance.spawnSimulatedPlayer(
            { x: loc.x, y: loc.y, z: loc.z },
            name
        );
        
        botSimPlayers.set(botEntity.id, { simPlayer, name });
        console.warn('[TN AI Bridge] Created SimPlayer "' + name + '" for bot');
    } catch(e) {
        console.warn('[TN AI Bridge] Error creating SimPlayer: ' + e);
    }
}

function removeSimPlayerForBot(botEntityId) {
    const entry = botSimPlayers.get(botEntityId);
    if (!entry) return;
    
    try {
        entry.simPlayer.disconnect();
    } catch(e) {}
    
    botSimPlayers.delete(botEntityId);
}

function removeSimPlayerByEntityId(id) {
    removeSimPlayerForBot(id);
}

// Sync SimulatedPlayer positions to match their bots
function startBotSyncLoop(test) {
    system.runTimeout(function syncLoop() {
        try {
            // Find all rg:bot entities
            const activeBotIds = new Set();
            
            for (const dim of ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end']) {
                try {
                    const d = world.getDimension(dim);
                    const bots = d.getEntities({ type: BOT_TYPE });
                    
                    for (const bot of bots) {
                        if (!bot?.isValid) continue;
                        activeBotIds.add(bot.id);
                        
                        const entry = botSimPlayers.get(bot.id);
                        if (entry) {
                            // Sync position
                            try {
                                if (entry.simPlayer?.isValid) {
                                    entry.simPlayer.teleport(bot.location, { dimension: d });
                                    // Sync nameTag if changed
                                    if (bot.nameTag && bot.nameTag !== entry.name) {
                                        entry.name = bot.nameTag;
                                    }
                                }
                            } catch(e) {}
                        } else {
                            // New bot without SimPlayer
                            spawnSimPlayerForBot(bot);
                        }
                    }
                } catch(e) {}
            }
            
            // Remove SimPlayers for bots that no longer exist
            for (const [id, entry] of botSimPlayers.entries()) {
                if (!activeBotIds.has(id)) {
                    try { entry.simPlayer.disconnect(); } catch(e) {}
                    botSimPlayers.delete(id);
                }
            }
        } catch(e) {}
        
        system.runTimeout(syncLoop, 20); // Sync every 1 second
    }, 20);
}

console.info('[TN AI Bridge] SimulatedPlayer bridge plugin loaded');
console.info('[TN AI Bridge] AI bots will appear as real players in the player list!');
