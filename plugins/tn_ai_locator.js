/**
 * TrophyNetwork - AI Bot Locator Plugin
 * Zeigt AI Multiplayer Bots (rg:bot) in der Sidebar-Liste an
 * Nutzt Scoreboard um Bots sichtbar zu machen
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { world, system } from '@minecraft/server';

const PREFIX = "§6[§eTN§6]§r ";
const BOT_TYPE = "rg:bot";
const SCOREBOARD_OBJ = "tn_ai_bots";

// Wait for bridge ready
function _registerWhenReady(fn) {
    if (bridge && bridge.bedrockCommands) {
        try { fn(); } catch(e) { console.warn("[TN AI Locator] Error: " + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(fn), 5);
    }
}

// Setup scoreboard for AI bot display
function setupBotScoreboard() {
    try {
        const obj = world.scoreboard.getObjective(SCOREBOARD_OBJ) 
            || world.scoreboard.addObjective(SCOREBOARD_OBJ, "§6AI Players§r");
        return obj;
    } catch(e) { return null; }
}

// Update AI bot display in scoreboard
function updateBotDisplay() {
    try {
        const obj = world.scoreboard.getObjective(SCOREBOARD_OBJ);
        if (!obj) return;
        
        // Clear old entries
        try {
            const participants = obj.getParticipants();
            for (const p of participants) {
                try { obj.removeParticipant(p); } catch(e) {}
            }
        } catch(e) {}
        
        // Add current bots
        let botCount = 0;
        for (const dim of ["overworld", "nether", "the_end"]) {
            try {
                const d = world.getDimension("minecraft:" + dim);
                const bots = d.getEntities({ type: BOT_TYPE });
                for (const bot of bots) {
                    if (!bot?.isValid) continue;
                    const name = bot.nameTag || ("Bot " + (++botCount));
                    try {
                        obj.setScore(name, botCount++);
                    } catch(e) {}
                }
            } catch(e) {}
        }
        
        return botCount;
    } catch(e) { return 0; }
}

// Initialize
system.runTimeout(() => {
    try {
        setupBotScoreboard();
        console.warn("[TN AI Locator] Initialized");
    } catch(e) {}
}, 20);

// Update every 5 seconds
(function updateLoop() {
    system.runTimeout(() => {
        updateBotDisplay();
        updateLoop();
    }, 100);
})();

// Commands
_registerWhenReady(function() {
    // !botlist - show active AI bots
    bridge.bedrockCommands.registerCommand("botlist", (player) => {
        try {
            const allBots = [];
            for (const dim of ["overworld", "nether", "the_end"]) {
                try {
                    const d = world.getDimension("minecraft:" + dim);
                    const bots = d.getEntities({ type: BOT_TYPE });
                    allBots.push(...bots.filter(b => b?.isValid));
                } catch(e) {}
            }
            
            if (allBots.length === 0) {
                player.sendMessage(PREFIX + "§7Keine AI-Bots aktiv.");
                return;
            }
            
            player.sendMessage("§6§l═══ AI Bots (" + allBots.length + ") ═══");
            for (const bot of allBots) {
                const loc = bot.location;
                const dim = bot.dimension.id.replace("minecraft:","").replace("the_end","End");
                const dist = Math.floor(Math.sqrt(
                    Math.pow(loc.x - player.location.x, 2) +
                    Math.pow(loc.z - player.location.z, 2)
                ));
                const name = bot.nameTag || "Bot";
                player.sendMessage("§e" + name + " §7@ §f" + Math.floor(loc.x) + "," + Math.floor(loc.y) + "," + Math.floor(loc.z) + " §8(" + dim + ", §7" + dist + "m§8)");
            }
        } catch(e) {
            player.sendMessage(PREFIX + "§cFehler: " + e);
        }
    }, "Zeigt alle aktiven AI-Bots mit Positionen");
    
    // !botnear - find nearest AI bot
    bridge.bedrockCommands.registerCommand("botnear", (player) => {
        try {
            let nearestBot = null;
            let nearestDist = Infinity;
            
            for (const dim of ["overworld", "nether", "the_end"]) {
                try {
                    const d = world.getDimension("minecraft:" + dim);
                    const bots = d.getEntities({ type: BOT_TYPE });
                    for (const bot of bots) {
                        if (!bot?.isValid) continue;
                        if (dim !== player.dimension.id.replace("minecraft:","")) continue;
                        const loc = bot.location;
                        const dist = Math.sqrt(
                            Math.pow(loc.x - player.location.x, 2) +
                            Math.pow(loc.y - player.location.y, 2) +
                            Math.pow(loc.z - player.location.z, 2)
                        );
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestBot = bot;
                        }
                    }
                } catch(e) {}
            }
            
            if (!nearestBot) {
                player.sendMessage(PREFIX + "§7Kein AI-Bot in deiner Dimension.");
                return;
            }
            
            const loc = nearestBot.location;
            const name = nearestBot.nameTag || "Bot";
            player.sendMessage(PREFIX + "§eNächster Bot: §f" + name + " §7| §f" + Math.floor(loc.x) + "," + Math.floor(loc.y) + "," + Math.floor(loc.z) + " §7(§f" + Math.floor(nearestDist) + "m§7)");
        } catch(e) {
            player.sendMessage(PREFIX + "§cFehler: " + e);
        }
    }, "Zeigt den nächsten AI-Bot");
});

console.info("[TN AI Locator] Plugin loaded - use !botlist or !botnear");
