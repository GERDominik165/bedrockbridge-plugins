/**
 * TrophyNetwork - Server Transfer Plugin
 * Commands: !lobby, !smp, !servers, !hub
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { world, system } from '@minecraft/server';
import { transferPlayer } from '@minecraft/server-admin';

const PREFIX = "§6[§eTN§6]§r ";
const BEDROCKCONNECT_HOST = "trophynetwork.de";
const BEDROCKCONNECT_PORT = 27001;

function _registerWhenReady(fn) {
    if (bridge && bridge.bedrockCommands) {
        try { fn(); } catch(e) { console.warn('[TN] Command registration error: ' + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(fn), 5);
    }
}

try {
    bridge.bridgeNetwork.addPartnerServer("lobby", BEDROCKCONNECT_HOST, String(BEDROCKCONNECT_PORT));
    bridge.bridgeNetwork.addPartnerServer("smp", "45.145.226.55", "8100");
    bridge.bridgeNetwork.addPartnerServer("domexitra", "45.145.226.55", "19132");
} catch(e) {
    console.warn('[TN Lobby] bridgeNetwork registration: ' + e);
}

function transferToLobby(player) {
    try {
        transferPlayer(player, { hostname: BEDROCKCONNECT_HOST, port: BEDROCKCONNECT_PORT });
    } catch(err) {
        try { player.runCommand('transfer ' + BEDROCKCONNECT_HOST + ' ' + BEDROCKCONNECT_PORT); } catch(e2) {}
        console.warn('[TN Lobby] Transfer fallback for ' + (player && player.name || '?') + ': ' + err);
    }
}

system.afterEvents.scriptEventReceive.subscribe(function(e) {
    if (e.id === "trophynetwork:restartTransfer") {
        var realPlayers = world.getAllPlayers().filter(function(p) { return p && p.id; });
        for (var i = 0; i < realPlayers.length; i++) {
            var player = realPlayers[i];
            try {
                player.sendMessage("§c§l[SERVER] §r§fServer wird neugestartet! Du wirst zur Lobby gesendet...");
                transferToLobby(player);
            } catch(err) {
                console.warn("[TN Lobby] Failed to transfer " + (player && player.name || '?') + ": " + err);
            }
        }
    }
    if (e.id === "trophynetwork:transferPlayer") {
        var playerName = e.message.replace(/"/g, "");
        var target = world.getAllPlayers().find(function(p) { return p && p.id && p.name === playerName; });
        if (target) {
            try {
                transferToLobby(target);
            } catch(err) {
                if (target.sendMessage) target.sendMessage("§cTransfer fehlgeschlagen. Verbinde manuell: §f" + BEDROCKCONNECT_HOST + ":" + BEDROCKCONNECT_PORT);
            }
        }
    }
}, { namespaces: ["trophynetwork"] });

_registerWhenReady(function() {
    bridge.bedrockCommands.registerCommand("lobby", function(player) {
        player.sendMessage(PREFIX + "§aDu wirst zur §6Lobby §averbunden...");
        system.sendScriptEvent("trophynetwork:transferPlayer", '"' + player.name + '"');
    }, "Verbindet dich mit der Lobby (BedrockConnect)");

    bridge.bedrockCommands.registerCommand("hub", function(player) {
        player.sendMessage(PREFIX + "§aDu wirst zum §6Hub §averbunden...");
        system.sendScriptEvent("trophynetwork:transferPlayer", '"' + player.name + '"');
    }, "Verbindet dich mit dem Hub");

    bridge.bedrockCommands.registerCommand("servers", function(player) {
        player.sendMessage("§6§l═══ Verfügbare Server ═══");
        player.sendMessage("§e!lobby §7→ §fBedrockConnect Hub §8(trophynetwork.de:27001)");
        player.sendMessage("§e!smp §7→ §fTrophyNetwork SMP §8(45.145.226.55:8100)");
        player.sendMessage("§e!domexitra §7→ §fDomexitra SMP §8(45.145.226.55:19132)");
        player.sendMessage("§6§l═════════════════════");
    }, "Zeigt alle verfuegbaren Server");

    bridge.bedrockCommands.registerCommand("smp", function(player) {
        player.sendMessage(PREFIX + "§aDu wirst mit dem §6TrophyNetwork SMP §averbunden...");
        try {
            transferPlayer(player, { hostname: '45.145.226.55', port: 8100 });
        } catch(e) {
            player.sendMessage(PREFIX + "§cVerbinde manuell: §f45.145.226.55:8100");
        }
    }, "Verbindet dich mit dem TrophyNetwork SMP");
});

console.info('[TN Lobby] Server Transfer Plugin geladen');
