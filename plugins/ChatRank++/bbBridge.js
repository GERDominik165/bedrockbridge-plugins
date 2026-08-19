/**
 * ChatRank++ <-> BedrockBridge compatibility adapter.
 *
 * ChatRank++ was written against a generic `bridge` framework that provides
 *   bridge.on('playerJoin'|'playerLeave'|'chatMessage'|'playerDeath', cb)
 *   bridge.registerCommand('rank set', (player, args) => {})
 * and a `player` object with .name/.sendMessage/.location/.health/.gameMode/...
 *
 * This file maps that surface onto the real BedrockBridge + @minecraft/server API,
 * so the ~36 original files can run unmodified (apart from CommonJS->ESM).
 */
import { world, system } from "@minecraft/server";
import { bridge as bb } from "../../addons";

// Wrap a real Player so the few non-native accessors ChatRank++ expects work.
export function wrapPlayer(p) {
  if (!p || typeof p !== "object") return p;
  return new Proxy(p, {
    get(t, prop) {
      if (prop === "health") { try { return t.getComponent("minecraft:health")?.currentValue ?? 20; } catch (e) { return 20; } }
      if (prop === "gameMode") { try { return t.getGameMode?.() ?? "survival"; } catch (e) { return "survival"; } }
      const v = t[prop];
      return typeof v === "function" ? v.bind(t) : v;
    }
  });
}

export function makeChatRankBridge() {
  const pendingCmds = []; // { group, subWords:[], handler }
  const api = {
    on(evt, cb) {
      try {
        if (evt === "chatMessage") {
          world.beforeEvents.chatSend.subscribe(ev => {
            let res;
            try { res = cb(wrapPlayer(ev.sender), ev.message); } catch (e) { return; }
            if (res && res.cancel) {
              ev.cancel = true;
              if (res.customMessage) system.run(() => { try { world.sendMessage(res.customMessage); } catch (e) {} });
            }
          });
        } else if (evt === "playerJoin") {
          world.afterEvents.playerSpawn.subscribe(ev => { if (ev.initialSpawn) { try { cb(wrapPlayer(ev.player)); } catch (e) {} } });
        } else if (evt === "playerLeave") {
          world.afterEvents.playerLeave.subscribe(ev => { try { cb({ name: ev.playerName, id: ev.playerId }); } catch (e) {} });
        } else if (evt === "playerDeath") {
          world.afterEvents.entityDie.subscribe(ev => { const e = ev.deadEntity; if (e && e.typeId === "minecraft:player") { try { cb(wrapPlayer(e)); } catch (er) {} } });
        }
      } catch (e) { console.warn("[ChatRank++] event bind failed (" + evt + "): " + e); }
    },
    registerCommand(fullName, handler) {
      const parts = String(fullName).trim().split(/\s+/);
      pendingCmds.push({ group: parts[0], subWords: parts.slice(1), handler });
    }
  };
  return { api, pendingCmds };
}

// After ChatRank++ has registered all its commands, wire them into BedrockBridge:
// one `!<group>` command per group, dispatching sub-commands by the leading args.
export function flushCommands(pendingCmds, bridge) {
  const groups = {};
  for (const c of pendingCmds) { (groups[c.group] = groups[c.group] || []).push(c); }
  for (const group of Object.keys(groups)) {
    // longest sub first so "rank set" wins over a bare "rank"
    const cmds = groups[group].slice().sort((a, b) => b.subWords.length - a.subWords.length);
    const subList = cmds.map(c => c.subWords.join(" ")).filter(Boolean);
    bridge.bedrockCommands.registerCommand(group, (player, ...rawArgs) => {
      const args = rawArgs.map(a => String(a));
      for (const c of cmds) {
        const n = c.subWords.length;
        if (n === 0) continue;
        if (args.slice(0, n).map(s => s.toLowerCase()).join(" ") === c.subWords.join(" ").toLowerCase()) {
          try { c.handler(wrapPlayer(player), args.slice(n)); } catch (e) { player.sendMessage("§c[ChatRank++] " + e); }
          return;
        }
      }
      // no sub matched -> a bare-group handler (e.g. !mute, !stats), else usage
      const bare = cmds.find(c => c.subWords.length === 0);
      if (bare) { try { bare.handler(wrapPlayer(player), args); } catch (e) { player.sendMessage("§c[ChatRank++] " + e); } }
      else player.sendMessage("§e[" + group + "] " + (subList.length ? "Subcommands: " + subList.join(", ") : "no subcommands"));
    }, "ChatRank++ " + group + " commands");
  }
  return Object.keys(groups);
}
