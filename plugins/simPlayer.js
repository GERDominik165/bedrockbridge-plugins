/**
 * simPlayer.js — Demo für @minecraft/server-gametest (SimulatedPlayer)
 *
 * Spawnt echte Bot-Spieler (typeId minecraft:player, in der Spielerliste sichtbar)
 * und steuert sie. API verifiziert:
 *   spawnSimulatedPlayer({x,y,z,dimension}, name, gameMode?) -> SimulatedPlayer
 *   SimulatedPlayer: move/moveToLocation/navigateToLocation/navigateToEntity/
 *     stopMoving/jump/attack/attackEntity/chat/lookAtEntity/lookAtLocation/
 *     breakBlock/giveItem/setItem/fly/swim/disconnect/respawn ...
 *
 * Command (Admin):  ?bot spawn [name] | come | follow | stop | attack | jump | say <text> | list | remove
 */
import { world, system } from "@minecraft/server";
import { spawnSimulatedPlayer } from "@minecraft/server-gametest";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const PREFIX = "§5[§dBot§5]§r ";
const ADMIN_TAG = "esploratori:admin";
const bots = new Map();        // name -> SimulatedPlayer
const followers = new Map();   // botName -> {targetName, runId}

function spawnBot(player, name) {
  name = name || ("Bot_" + Math.floor(Math.random() * 1000));
  if (bots.has(name)) return { err: `Bot §f${name}§c existiert schon.` };
  const l = player.location;
  const loc = { x: Math.floor(l.x) + 0.5, y: Math.floor(l.y), z: Math.floor(l.z) + 0.5, dimension: player.dimension };
  try {
    const sp = spawnSimulatedPlayer(loc, name);
    bots.set(name, sp);
    return { sp };
  } catch (e) { return { err: String(e) }; }
}

function removeBot(name) {
  const sp = bots.get(name); if (!sp) return false;
  stopFollow(name);
  try { sp.disconnect(); } catch (e) {}
  bots.delete(name);
  return true;
}

function stopFollow(name) {
  const f = followers.get(name);
  if (f) { try { system.clearRun(f.runId); } catch (e) {} followers.delete(name); }
}

function anyBot(player) {
  // bevorzugt den zuletzt gespawnten
  const arr = [...bots.values()];
  return arr.length ? arr[arr.length - 1] : null;
}

function _reg(fn, t) { t = t || 0; if (bridge && bridge.bedrockCommands) { try { fn(); } catch (e) { console.warn("[simPlayer] reg:" + e); } } else if (t < 200) system.runTimeout(() => _reg(fn, t + 1), 5); }

_reg(function () {
  bridge.bedrockCommands.registerAdminCommand("bot", (player, ...args) => {
    const a = args.map(x => (x == null ? "" : x.toString()));
    const sub = (a[0] || "help").toLowerCase();

    if (sub === "spawn") {
      const res = spawnBot(player, a[1]);
      if (res.err) return player.sendMessage(`${PREFIX}§c${res.err}`);
      return player.sendMessage(`${PREFIX}§aBot §f${res.sp.name}§a gespawnt. §7?bot come|follow|attack|say|remove`);
    }
    if (sub === "list") {
      return player.sendMessage(`${PREFIX}§7Bots (${bots.size}): §f` + ([...bots.keys()].join(", ") || "—"));
    }
    if (sub === "remove") {
      if (a[1]) { return player.sendMessage(removeBot(a[1]) ? `${PREFIX}§aEntfernt §f${a[1]}` : `${PREFIX}§cKein Bot §f${a[1]}`); }
      const all = [...bots.keys()]; all.forEach(removeBot); return player.sendMessage(`${PREFIX}§a${all.length} Bot(s) entfernt.`);
    }

    const sp = a[1] ? bots.get(a[1]) : anyBot(player);
    if (!sp) return player.sendMessage(`${PREFIX}§cKein Bot da. §7?bot spawn`);

    try {
      if (sub === "come") { sp.navigateToLocation(player.location); return player.sendMessage(`${PREFIX}§7${sp.name} kommt…`); }
      if (sub === "follow") {
        stopFollow(sp.name);
        const runId = system.runInterval(() => {
          const t = world.getPlayers({ name: player.name })[0];
          if (!t || !bots.has(sp.name)) { stopFollow(sp.name); return; }
          try { sp.navigateToLocation(t.location); } catch (e) {}
        }, 20);
        followers.set(sp.name, { targetName: player.name, runId });
        return player.sendMessage(`${PREFIX}§a${sp.name} folgt dir. §7?bot stop`);
      }
      if (sub === "stop") { stopFollow(sp.name); try { sp.stopMoving(); } catch (e) {} return player.sendMessage(`${PREFIX}§7${sp.name} gestoppt.`); }
      if (sub === "jump") { sp.jump(); return player.sendMessage(`${PREFIX}§7${sp.name} springt.`); }
      if (sub === "attack") {
        const near = sp.dimension.getEntities({ location: sp.location, maxDistance: 6, excludeTypes: ["minecraft:player"] })[0];
        if (near) { sp.lookAtEntity ? sp.lookAtEntity(near) : null; sp.attackEntity(near); return player.sendMessage(`${PREFIX}§7${sp.name} greift ${near.typeId} an.`); }
        sp.attack(); return player.sendMessage(`${PREFIX}§7${sp.name} schlägt zu (kein Ziel in 6m).`);
      }
      if (sub === "say") { const msg = a.slice(a[1] && bots.has(a[1]) ? 2 : 1).join(" ") || "Hallo!"; sp.chat(msg); return; }
    } catch (e) { return player.sendMessage(`${PREFIX}§cFehler: §f${e}`); }

    player.sendMessage(`${PREFIX}§7Nutzung: §f?bot spawn [name] | come | follow | stop | jump | attack | say <text> | list | remove [name]`);
  }, "Bot-Spieler (SimulatedPlayer / gametest)");
  console.warn("[simPlayer] Command ?bot registriert");

  try {
    hub.register({
      id: "simbot", title: "🤖 Bots", icon: "textures/ui/FriendsDiversity", category: "Werkzeuge", order: 40, permission: ADMIN_TAG,
      handler: async (p) => {
        const ui = await import("@minecraft/server-ui");
        const f = new ui.ActionFormData().title("🤖 Bot-Spieler").body(`§7Aktive Bots: §f${bots.size}`)
          .button("§aBot spawnen").button("§bZu mir rufen").button("§aFolgen").button("§7Stoppen").button("§cAlle entfernen");
        const r = await f.show(p); if (!r || r.canceled) return;
        if (r.selection === 0) { const res = spawnBot(p); p.sendMessage(res.err ? `${PREFIX}§c${res.err}` : `${PREFIX}§aBot §f${res.sp.name}§a gespawnt.`); return; }
        const sp = anyBot(p); if (!sp) return p.sendMessage(`${PREFIX}§cKein Bot da.`);
        if (r.selection === 1) { try { sp.navigateToLocation(p.location); } catch (e) {} p.sendMessage(`${PREFIX}§7${sp.name} kommt.`); }
        else if (r.selection === 2) { stopFollow(sp.name); const runId = system.runInterval(() => { const t = world.getPlayers({ name: p.name })[0]; if (!t || !bots.has(sp.name)) { stopFollow(sp.name); return; } try { sp.navigateToLocation(t.location); } catch (e) {} }, 20); followers.set(sp.name, { targetName: p.name, runId }); p.sendMessage(`${PREFIX}§a${sp.name} folgt.`); }
        else if (r.selection === 3) { stopFollow(sp.name); try { sp.stopMoving(); } catch (e) {} p.sendMessage(`${PREFIX}§7Gestoppt.`); }
        else { const all = [...bots.keys()]; all.forEach(removeBot); p.sendMessage(`${PREFIX}§a${all.length} entfernt.`); }
      }
    });
    console.warn("[simPlayer] im Hub registriert");
  } catch (e) { console.warn("[simPlayer] hub-reg:" + e); }
});
