/**
 * TrophyNetwork - Teleport Plugin
 * Commands: !tpa, !tpaccept, !tpdeny, !home, !sethome, !delhome, !back
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
const HOMES_KEY = "tn_homes";
const BACKS_KEY = "tn_backs";
const MAX_HOMES = 5;

function getHomes() {
    try { return JSON.parse(world.getDynamicProperty(HOMES_KEY) || "{}"); } catch { return {}; }
}
function saveHomes(d) { world.setDynamicProperty(HOMES_KEY, JSON.stringify(d)); }

function getBacks() {
    try { return JSON.parse(world.getDynamicProperty(BACKS_KEY) || "{}"); } catch { return {}; }
}
function saveBacks(d) { world.setDynamicProperty(BACKS_KEY, JSON.stringify(d)); }

// Pending TPA requests: Map<targetName, {requester, location, tick}>
const tpaRequests = new Map();

// Save last position on death/teleport
world.afterEvents.entityDie.subscribe(e => {
    try {
        if (!e.deadEntity || e.deadEntity.typeId !== "minecraft:player") return;
        const player = e.deadEntity;
        const backs = getBacks();
        backs[player.name] = {
            x: player.location.x, y: player.location.y, z: player.location.z,
            dim: player.dimension.id
        };
        saveBacks(backs);
    } catch(e) {}
});

// !home [name]
_registerWhenReady(function() {
bridge.bedrockCommands.registerCommand("home", (player, nameArg) => {
    const homes = getHomes();
    const playerHomes = homes[player.name] || {};
    const name = nameArg?.toString() || "home";
    
    if (!nameArg) {
        // Show home list
        const homeList = Object.keys(playerHomes);
        if (homeList.length === 0) {
            player.sendMessage(`${PREFIX}§cKeine Homes gesetzt. Nutze §e!sethome [name]`);
            return;
        }
        player.sendMessage(`§6§l═══ Deine Homes ═══`);
        for (const [n, h] of Object.entries(playerHomes)) {
            const dim = h.dim.replace("minecraft:","").replace("the_end","End");
            player.sendMessage(`§e!home ${n} §7→ §f${Math.floor(h.x)}, ${Math.floor(h.y)}, ${Math.floor(h.z)} §8(${dim})`);
        }
        return;
    }
    
    const home = playerHomes[name];
    if (!home) return player.sendMessage(`${PREFIX}§cHome §f${name} §cnicht gefunden.`);
    
    try {
        const dim = world.getDimension(home.dim || "overworld");
        player.teleport({ x: home.x, y: home.y, z: home.z }, { dimension: dim });
        player.sendMessage(`${PREFIX}§aTeleportiert zu Home §f${name}§a.`);
    } catch(e) {
        player.sendMessage(`${PREFIX}§cTeleport fehlgeschlagen: §f${e.message}`);
    }
}, "Teleportiert zum Home. Nutze: !home [name]");

// !sethome [name]
bridge.bedrockCommands.registerCommand("sethome", (player, nameArg) => {
    const name = nameArg?.toString() || "home";
    const homes = getHomes();
    if (!homes[player.name]) homes[player.name] = {};
    const count = Object.keys(homes[player.name]).length;
    
    if (!homes[player.name][name] && count >= MAX_HOMES) {
        player.sendMessage(`${PREFIX}§cMaximal §f${MAX_HOMES} §cHomes erlaubt.`);
        return;
    }
    
    const loc = player.location;
    homes[player.name][name] = { 
        x: loc.x, y: loc.y, z: loc.z, dim: player.dimension.id 
    };
    saveHomes(homes);
    player.sendMessage(`${PREFIX}§aHome §f${name} §agesetzt bei §e${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)}§a.`);
}, "Setzt ein Home. Nutze: !sethome [name]");

// !delhome <name>
bridge.bedrockCommands.registerCommand("delhome", (player, nameArg) => {
    const name = nameArg?.toString() || "home";
    const homes = getHomes();
    if (!homes[player.name]?.[name]) {
        player.sendMessage(`${PREFIX}§cHome §f${name} §cnicht gefunden.`);
        return;
    }
    delete homes[player.name][name];
    saveHomes(homes);
    player.sendMessage(`${PREFIX}§aHome §f${name} §agelöscht.`);
}, "Löscht ein Home. Nutze: !delhome <name>");

// !back - Go to last death position
bridge.bedrockCommands.registerCommand("lastpos", (player) => {
    const backs = getBacks();
    const back = backs[player.name];
    if (!back) {
        player.sendMessage(`${PREFIX}§cKeine letzte Position gespeichert.`);
        return;
    }
    try {
        const dim = world.getDimension(back.dim || "overworld");
        player.teleport({ x: back.x, y: back.y, z: back.z }, { dimension: dim });
        player.sendMessage(`${PREFIX}§aTeleportiert zur letzten Position.`);
    } catch(e) {
        player.sendMessage(`${PREFIX}§cTeleport fehlgeschlagen.`);
    }
}, "Teleportiert zur letzten Todes-Position");

// !tpa <player> - Request teleport
bridge.bedrockCommands.registerCommand("tpa", (requester, targetArg) => {
    const target = targetArg?.readPlayer();
    if (!target) return requester.sendMessage(`${PREFIX}§cSpieler nicht gefunden: §f${targetArg}`);
    if (target === requester) return requester.sendMessage(`${PREFIX}§cDu kannst dich nicht zu dir selbst tpen.`);
    
    tpaRequests.set(target.name, { requester, tick: system.currentTick });
    target.sendMessage(`${PREFIX}§e${requester.name} §7möchte zu dir teleportieren.\n§a§l!tpaccept §r§7zum Annehmen | §c§l!tpdeny §r§7zum Ablehnen (60s)`);
    requester.sendMessage(`${PREFIX}§7TPA-Anfrage an §e${target.name} §7gesendet.`);
}, "Sendet eine TPA-Anfrage. Nutze: !tpa <spieler>");

// !tpaccept
bridge.bedrockCommands.registerCommand("tpaccept", (accepter) => {
    const req = tpaRequests.get(accepter.name);
    if (!req) return accepter.sendMessage(`${PREFIX}§cKeine ausstehende TPA-Anfrage.`);
    
    if (system.currentTick - req.tick > 1200) { // 60s timeout
        tpaRequests.delete(accepter.name);
        return accepter.sendMessage(`${PREFIX}§cAnfrage abgelaufen.`);
    }
    
    try {
        const loc = accepter.location;
        req.requester.teleport(loc, { dimension: accepter.dimension });
        req.requester.sendMessage(`${PREFIX}§aTeleportiert zu §f${accepter.name}§a.`);
        accepter.sendMessage(`${PREFIX}§f${req.requester.name} §awurde zu dir teleportiert.`);
        tpaRequests.delete(accepter.name);
    } catch(e) {
        accepter.sendMessage(`${PREFIX}§cTeleport fehlgeschlagen: §f${e.message}`);
    }
}, "Akzeptiert eine TPA-Anfrage");

// !tpdeny
bridge.bedrockCommands.registerCommand("tpdeny", (accepter) => {
    const req = tpaRequests.get(accepter.name);
    if (!req) return accepter.sendMessage(`${PREFIX}§cKeine ausstehende TPA-Anfrage.`);
    req.requester.sendMessage(`${PREFIX}§c${accepter.name} §chat deine TPA-Anfrage abgelehnt.`);
    accepter.sendMessage(`${PREFIX}§7Anfrage von §f${req.requester.name} §7abgelehnt.`);
    tpaRequests.delete(accepter.name);
}, "Lehnt eine TPA-Anfrage ab");

// Clean expired TPA requests every 60s
system.runTimeout(function cleanTPA() {
    const now = system.currentTick;
    for (const [name, req] of tpaRequests.entries()) {
        if (now - req.tick > 1200) tpaRequests.delete(name);
    }
    system.runTimeout(cleanTPA, 1200);
}, 1200);
});
