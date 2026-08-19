/**
 * TrophyNetwork - Server Info Plugin
 * Commands: !server, !online, !coords, !rules, !discord, !ping
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { world, system } from '@minecraft/server';

// Wait for bridge.bedrockCommands to be available
function _registerWhenReady(registerFn) {
    if (bridge && bridge.bedrockCommands) {
        try { registerFn(); } catch(e) { console.warn('[TN] Command registration error: ' + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(registerFn), 5);
    }
}


const PREFIX = "§6[§eTN§6]§r ";
const DISCORD_INVITE = "discord.gg/trophynetwork";
const SERVER_NAME = "xTony965705 Paradies";
const RULES = [
    "§e1. §fKein Griefing oder Stehlen",
    "§e2. §fKein Hacking / Cheating",
    "§e3. §fRespektvoller Umgang",
    "§e4. §fKeine unfairen Vorteile",
    "§e5. §fAdmins haben das letzte Wort",
];

// !server - Server Info
_registerWhenReady(function() {
bridge.bedrockCommands.registerCommand("server", (player) => {
    const players = world.getAllPlayers();
    const dim = player.dimension.id.replace("minecraft:", "");
    const time = world.getTimeOfDay();
    const hours = Math.floor((time / 24000) * 24);
    const minutes = Math.floor(((time / 24000) * 24 * 60) % 60);
    const timeStr = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}`;
    
    player.sendMessage([
        `§6§l════ ${SERVER_NAME} ════`,
        `§7Server: §aBDS 1.26.20.4`,
        `§7Online: §a${players.length} Spieler`,
        `§7Tick: §e${system.currentTick}`,
        `§7Zeit: §e${timeStr} §7(${time})`,
        `§7Dimension: §b${dim}`,
        `§7Discord: §b${DISCORD_INVITE}`,
        `§6§l═══════════════════`,
    ].join("\n"));
}, "Zeigt Server-Informationen an");

// !online - Online players
bridge.bedrockCommands.registerCommand("online", (player) => {
    const players = world.getAllPlayers();
    const names = players.map(p => {
        const gamemode = p.getGameMode();
        const gm = { creative: "§b[C]", survival: "§a[S]", adventure: "§e[A]", spectator: "§7[Spec]" }[gamemode] || "";
        return `${gm} §f${p.name}`;
    });
    player.sendMessage(`§6Online (${players.length}): §r${names.join("§7, ")}`);
}, "Zeigt alle Online-Spieler");

// !coords - Current coordinates
bridge.bedrockCommands.registerCommand("coords", (player) => {
    const loc = player.location;
    const x = Math.floor(loc.x);
    const y = Math.floor(loc.y);
    const z = Math.floor(loc.z);
    const dim = player.dimension.id.replace("minecraft:", "").replace("the_end","End");
    const block = player.dimension.getBlock({x: Math.floor(loc.x), y: Math.floor(loc.y)-1, z: Math.floor(loc.z)});
    const blockName = block?.typeId?.replace("minecraft:","") || "?";
    player.sendMessage(`${PREFIX}§7Position: §e${x}§7, §e${y}§7, §e${z} §7(${dim}) §8on §7${blockName}`);
}, "Zeigt deine aktuellen Koordinaten");

// !rules - Server rules
bridge.bedrockCommands.registerCommand("rules", (player) => {
    player.sendMessage("§6§l═══ Server Regeln ═══");
    for (const rule of RULES) {
        player.sendMessage(rule);
    }
    player.sendMessage("§6§l═══════════════════");
}, "Zeigt die Server-Regeln");

// !discord - Discord invite
bridge.bedrockCommands.registerCommand("discord", (player) => {
    player.sendMessage(`${PREFIX}§bJoin Discord: §f${DISCORD_INVITE}`);
}, "Zeigt den Discord-Einladungslink");

// !ping - Check connection
bridge.bedrockCommands.registerCommand("ping", (player) => {
    const startTick = system.currentTick;
    system.runTimeout(() => {
        const elapsed = system.currentTick - startTick;
        const ms = Math.round(elapsed * 50);
        const color = ms < 100 ? "§a" : ms < 200 ? "§e" : "§c";
        player.sendMessage(`${PREFIX}§7Ping: ${color}${ms}ms §7(${elapsed} ticks)`);
    }, 1);
}, "Zeigt deine Verbindungslatenz");

// !seed - World seed (admin only)
bridge.bedrockCommands.registerAdminCommand("seed", (player) => {
    player.sendMessage(`${PREFIX}§7World Seed: §e${world.seed}`);
}, "Zeigt den World-Seed");
});
