/**
 * TrophyNetwork - Hauptmenü Plugin
 * Commands: !menu, !help
 * Opens UI-based menus for players and admins
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { system, world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

// Wait for bridge.bedrockCommands to be available
function _registerWhenReady(registerFn) {
    if (bridge && bridge.bedrockCommands) {
        try { registerFn(); } catch(e) { console.warn('[TN] Command registration error: ' + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(registerFn), 5);
    }
}


const PREFIX = "§6[§eTN§6]§r ";

// !menu - Main menu
_registerWhenReady(function() {
bridge.bedrockCommands.registerCommand("menu", (player) => {
    const isAdmin = player.hasTag("admin");
    const form = new ActionFormData()
        .title("§6§lTrophyNetwork §r§8- Menü")
        .body(`§7Willkommen, §f${player.name}§7!\n§7Level: §e${player.level} §7| §7Gamemode: §e${player.getGameMode()}`)
        .button("§b🏠 Homes", "textures/ui/icon_book")
        .button("§a📍 Koordinaten", "textures/ui/coordinates")
        .button("§e👥 Online-Spieler", "textures/ui/FriendsDiversity")
        .button("§d🌐 Server-Liste", "textures/ui/icon_multiplayer")
        .button("§f📋 Regeln", "textures/ui/icon_book")
        .button("§b🎮 Discord", "textures/ui/discord_icon");
    
    if (isAdmin) {
        form.button("§c⚙️ Admin-Tools", "textures/ui/icon_setting");
    }
    
    form.show(player).then(res => {
        if (res.canceled) return;
        const actions = [
            () => openHomesMenu(player),
            () => {
                const loc = player.location;
                player.sendMessage(`${PREFIX}§7Pos: §e${Math.floor(loc.x)}§7, §e${Math.floor(loc.y)}§7, §e${Math.floor(loc.z)} §8(${player.dimension.id.replace("minecraft:","").replace("the_end","End")})`);
            },
            () => showOnlinePlayers(player),
            () => showServerList(player),
            () => showRules(player),
            () => player.sendMessage(`${PREFIX}§bDiscord: §fdiscord.gg/trophynetwork`),
        ];
        if (isAdmin) actions.push(() => openAdminMenu(player));
        
        if (actions[res.selection]) actions[res.selection]();
    });
}, "Öffnet das Hauptmenü");

function openHomesMenu(player) {
    const HOMES_KEY = "tn_homes";
    let homes = {};
    try { homes = JSON.parse(world.getDynamicProperty(HOMES_KEY) || "{}"); } catch {}
    const playerHomes = Object.entries(homes[player.name] || {});
    
    const form = new ActionFormData()
        .title("§6§lMeine Homes")
        .button("§a+ Neues Home setzen", "textures/ui/plus")
        .button("§c↩ Zurück", "textures/ui/cancel");
    
    for (const [name, h] of playerHomes) {
        const dim = h.dim?.replace("minecraft:","").replace("the_end","End") || "Overworld";
        form.button(`§e${name}\n§8${Math.floor(h.x)}, ${Math.floor(h.y)}, ${Math.floor(h.z)} §7(${dim})`);
    }
    
    form.show(player).then(res => {
        if (res.canceled || res.selection === 1) return openMainMenu(player);
        if (res.selection === 0) {
            // Set new home
            openSetHomeDialog(player);
            return;
        }
        // Teleport to selected home
        const [name, home] = playerHomes[res.selection - 2];
        try {
            const dim = world.getDimension(home.dim || "overworld");
            player.teleport({ x: home.x, y: home.y, z: home.z }, { dimension: dim });
            player.sendMessage(`${PREFIX}§aTeleportiert zu Home §f${name}§a.`);
        } catch(e) {
            player.sendMessage(`${PREFIX}§cTeleport fehlgeschlagen.`);
        }
    });
}

function openSetHomeDialog(player) {
    new ModalFormData()
        .title("§6§lHome setzen")
        .textField("Home-Name", "z.B. base, mine, farm", { defaultValue: "home" })
        .show(player).then(res => {
            if (res.canceled) { openHomesMenu(player); return; }
            const name = res.formValues[0]?.toString().trim() || "home";
            const HOMES_KEY = "tn_homes";
            let homes = {};
            try { homes = JSON.parse(world.getDynamicProperty(HOMES_KEY) || "{}"); } catch {}
            if (!homes[player.name]) homes[player.name] = {};
            const loc = player.location;
            homes[player.name][name] = { x: loc.x, y: loc.y, z: loc.z, dim: player.dimension.id };
            world.setDynamicProperty(HOMES_KEY, JSON.stringify(homes));
            player.sendMessage(`${PREFIX}§aHome §f${name} §agesetzt!`);
        });
}

function showOnlinePlayers(player) {
    const players = world.getAllPlayers();
    const form = new ActionFormData()
        .title(`§6§lOnline Spieler §7(${players.length})`);
    
    let body = "";
    for (const p of players) {
        const gm = { creative: "§b[C]", survival: "§a[S]", adventure: "§e[A]", spectator: "§7[👁]" }[p.getGameMode()] || "";
        body += `${gm} §f${p.name}\n`;
    }
    form.body(body || "§7Keine Spieler online.")
        .button("§c↩ Zurück");
    
    form.show(player).then(res => { if (!res.canceled) openMainMenu(player); });
}

function showServerList(player) {
    new ActionFormData()
        .title("§6§lServer-Liste")
        .body("§7Wähle einen Server:")
        .button("§6🌐 Lobby / BedrockConnect\n§8KVM1 - 45.92.216.56:27001")
        .button("§a⚔️ TrophyNetwork SMP\n§8KVM2 - 45.145.226.55:8100")
        .button("§b🏗️ Domexitra SMP\n§8KVM2 - 45.145.226.55:19132")
        .button("§c↩ Zurück")
        .show(player).then(res => {
            if (res.canceled || res.selection === 3) { openMainMenu(player); return; }
            const transfers = [
                () => { player.sendMessage(`${PREFIX}§aVerbinde mit Lobby...`); player.runCommand("scriptevent trophynetwork:transferPlayer \"" + player.name + "\""); },
                () => { try { player.runCommand("transfer 45.145.226.55 8100"); } catch(e) { player.sendMessage(`§cVerbinde manuell: 45.145.226.55:8100`); }},
                () => { try { player.runCommand("transfer 45.145.226.55 19132"); } catch(e) { player.sendMessage(`§cVerbinde manuell: 45.145.226.55:19132`); }},
            ];
            transfers[res.selection]?.();
        });
}

function showRules(player) {
    new ActionFormData()
        .title("§6§lServer Regeln")
        .body([
            "§e1. §fKein Griefing oder Stehlen",
            "§e2. §fKein Hacking / Cheating",
            "§e3. §fRespektvoller Umgang mit allen",
            "§e4. §fKeine unfairen Vorteile",
            "§e5. §fAdmins haben das letzte Wort",
            "",
            "§8Discord: discord.gg/trophynetwork"
        ].join("\n"))
        .button("§c↩ Zurück")
        .show(player).then(() => openMainMenu(player));
}

function openAdminMenu(player) {
    new ActionFormData()
        .title("§c§l⚙️ Admin-Tools")
        .button("§6👥 Alle Spieler verwalten")
        .button("§b🌍 Welt-Einstellungen")
        .button("§e📦 Items geben")
        .button("§d⚡ Schnell-Aktionen")
        .button("§c↩ Zurück")
        .show(player).then(res => {
            if (res.canceled || res.selection === 4) { openMainMenu(player); return; }
            const actions = [
                () => openPlayerManageMenu(player),
                () => openWorldMenu(player),
                () => player.sendMessage(`${PREFIX}§7Nutze §e!give §7<spieler> §e<item> §7[anzahl]`),
                () => openQuickActionsMenu(player),
            ];
            actions[res.selection]?.();
        });
}

function openPlayerManageMenu(player) {
    const players = world.getAllPlayers().filter(p => p !== player);
    const form = new ActionFormData()
        .title("§c§l Spieler verwalten")
        .button("§c↩ Zurück");
    
    for (const p of players) {
        const gm = p.getGameMode();
        form.button(`§f${p.name}\n§8${gm}`);
    }
    
    form.show(player).then(res => {
        if (res.canceled || res.selection === 0) { openAdminMenu(player); return; }
        const target = players[res.selection - 1];
        if (!target) return;
        openPlayerActionMenu(player, target);
    });
}

function openPlayerActionMenu(player, target) {
    new ActionFormData()
        .title(`§c§l${target.name} verwalten`)
        .body(`§7Gamemode: §e${target.getGameMode()}\n§7Level: §e${target.level}\n§7Pos: §e${Math.floor(target.location.x)}, ${Math.floor(target.location.y)}, ${Math.floor(target.location.z)}`)
        .button("§b🚀 TP zu Spieler")
        .button("§a💚 Heilen")
        .button("§b🎮 → Creative")
        .button("§a⚔️ → Survival")
        .button("§c👢 Kick")
        .button("§c↩ Zurück")
        .show(player).then(res => {
            if (res.canceled || res.selection === 5) { openPlayerManageMenu(player); return; }
            const actions = [
                () => { player.teleport(target.location, { dimension: target.dimension }); player.sendMessage(`${PREFIX}§aTeleportiert zu §f${target.name}`); },
                () => { const h = target.getComponent("minecraft:health"); if(h) h.resetToMaxValue(); target.sendMessage(`${PREFIX}§aGeheilt!`); },
                () => { target.setGameMode("creative"); target.sendMessage(`${PREFIX}§bCreative Modus`); },
                () => { target.setGameMode("survival"); target.sendMessage(`${PREFIX}§aSurvival Modus`); },
                () => { target.sendMessage("§c§lGekickt!"); target.runCommand(`kick "${target.name}"`); },
            ];
            actions[res.selection]?.();
        });
}

function openWorldMenu(player) {
    new ActionFormData()
        .title("§b§l🌍 Welt-Einstellungen")
        .button("§e☀️ Tag")
        .button("§8🌙 Nacht")
        .button("§b☁️ Regen")
        .button("§f⛅ Klar")
        .button("§c↩ Zurück")
        .show(player).then(res => {
            if (res.canceled || res.selection === 4) { openAdminMenu(player); return; }
            const cmds = [
                () => world.setTimeOfDay(1000),
                () => world.setTimeOfDay(13000),
                () => world.getDimension("overworld").setWeather("rain"),
                () => world.getDimension("overworld").setWeather("clear"),
            ];
            cmds[res.selection]?.();
            player.sendMessage(`${PREFIX}§aWelt aktualisiert.`);
        });
}

function openQuickActionsMenu(player) {
    new ActionFormData()
        .title("§d§l⚡ Schnell-Aktionen")
        .button("§a✅ Alle heilen")
        .button("§b🌟 XP an alle (+100)")
        .button("§c⚡ Alle töten")
        .button("§e📣 Broadcast senden")
        .button("§c↩ Zurück")
        .show(player).then(res => {
            if (res.canceled || res.selection === 4) { openAdminMenu(player); return; }
            if (res.selection === 0) {
                for (const p of world.getAllPlayers()) { const h = p.getComponent("minecraft:health"); if(h) h.resetToMaxValue(); }
                world.sendMessage(`${PREFIX}§aAlle Spieler wurden geheilt!`);
            } else if (res.selection === 1) {
                for (const p of world.getAllPlayers()) p.addExperience(100);
                world.sendMessage(`${PREFIX}§e+100 XP §7für alle Spieler!`);
            } else if (res.selection === 2) {
                for (const p of world.getAllPlayers()) { if (p !== player) p.kill(); }
                player.sendMessage(`${PREFIX}§aAlle anderen Spieler getötet.`);
            } else if (res.selection === 3) {
                new ModalFormData()
                    .title("§e§l Broadcast")
                    .textField("Nachricht", "Deine Nachricht...")
                    .show(player).then(formRes => {
                        if (!formRes.canceled && formRes.formValues[0]) {
                            world.sendMessage(`§6§l[BROADCAST] §r§f${formRes.formValues[0]}`);
                        }
                    });
            }
        });
}

function openMainMenu(player) {
    // Trigger !menu again
    const isAdmin = player.hasTag("admin");
    const form = new ActionFormData()
        .title("§6§lTrophyNetwork §r§8- Menü")
        .body(`§7Willkommen, §f${player.name}§7!`)
        .button("§b🏠 Homes")
        .button("§a📍 Koordinaten")
        .button("§e👥 Online-Spieler")
        .button("§d🌐 Server-Liste")
        .button("§f📋 Regeln")
        .button("§b🎮 Discord");
    if (isAdmin) form.button("§c⚙️ Admin-Tools");
    
    form.show(player).then(res => {
        if (res.canceled) return;
        const actions = [
            () => openHomesMenu(player),
            () => { const l = player.location; player.sendMessage(`${PREFIX}§7Pos: §e${Math.floor(l.x)}§7, §e${Math.floor(l.y)}§7, §e${Math.floor(l.z)}`); },
            () => showOnlinePlayers(player),
            () => showServerList(player),
            () => showRules(player),
            () => player.sendMessage(`${PREFIX}§bDiscord: §fdiscord.gg/trophynetwork`),
        ];
        if (isAdmin) actions.push(() => openAdminMenu(player));
        actions[res.selection]?.();
    });
}
});


// --- In das zentrale BridgeHub registrieren ---
import { hub as _bridgeHub } from "./hubAPI.js";
try {
  _bridgeHub.register({ id: "tnmenu", title: "📋 TN-Menü", icon: "textures/ui/hamburger", category: "Allgemein", order: 40, handler: p => openMainMenu(p) });
  console.warn("[tnmenu] im Hub registriert");
} catch (e) { console.warn("[tnmenu] hub-reg: " + e); }
