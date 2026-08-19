/**
 * pvq @version 1.0.0 - BedrockBridge Plugin
 *
 * Read-only status of your pv-q.de ServerSplitter node from in-game.
 * Uses the BedrockBridge custom command system: !pvq
 * Lists the child servers of your node (name, id, node, address, memory).
 *
 * Security: this plugin is READ-ONLY (no power actions) and only ever shows a
 * whitelisted set of safe fields. It NEVER forwards secret fields returned by
 * the API (webhook_url, egg variables such as licence keys) to chat or Discord.
 *
 * Config (config/<pack-uuid>/variables.json):
 *   "pvq_uuid": "<parent node identifier, e.g. 19d73400>"
 *   "pvq_key":  "<ptlc_... ServerSplitter node-manager key>"
 * Optional:
 *   "pvq_base": override the API base URL
 */
import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";
import { variables } from "@minecraft/server-admin";
import { bridge } from "../addons";
import { bridgeDirect } from "../BridgeDirect";

// ===== CONFIG (driven by variables.json, no secrets in code) =====
function _cfg(name, def) {
  try { const v = variables.get(name); return (v === undefined || v === null) ? def : v; }
  catch { return def; }
}
const CONFIG = {
  BASE: _cfg("pvq_base", "https://pv-q.de/api/client/extensions/serversplitter/api"),
  UUID: _cfg("pvq_uuid", ""),
  KEY:  _cfg("pvq_key", "REDACTED")
};

bridge.events.bridgeInitialize.subscribe(e => e.registerAddition("discord_direct"));

let busy = false;

function _registerWhenReady(tries) {
  tries = tries || 0;
  if (bridge && bridge.bedrockCommands) {
    // Admin-only: infrastructure listing should not be public.
    const reg = bridge.bedrockCommands.registerAdminCommand
      ? bridge.bedrockCommands.registerAdminCommand.bind(bridge.bedrockCommands)
      : bridge.bedrockCommands.registerCommand.bind(bridge.bedrockCommands);
    reg("pvq", (player) => { listServers(player); },
        "Show the status of your pv-q ServerSplitter child servers (admin, read-only)");
    console.warn("[pvq] command !pvq registered (base=" + CONFIG.BASE + ")");
  } else if (tries < 200) {
    system.runTimeout(() => _registerWhenReady(tries + 1), 5);
  } else {
    console.warn("[pvq] bridge.bedrockCommands never became ready");
  }
}
_registerWhenReady();

// Only these fields are ever read from the API response. Secret-bearing
// fields (webhook_url, variables/egg vars) are deliberately never touched.
function safeChild(c) {
  const a = (c && c.attributes) || {};
  let addr = "";
  try {
    const list = a.relationships && a.relationships.allocations && a.relationships.allocations.data;
    if (list && list.length) {
      const def = list.find(x => x.attributes && x.attributes.is_default) || list[0];
      const at = def.attributes || {};
      addr = (at.ip || "?") + ":" + (at.port || "?");
    }
  } catch { /* ignore */ }
  const mem = (a.limits && typeof a.limits.memory === "number") ? a.limits.memory : null;
  return {
    name: String(a.name || a.identifier || "?"),
    id: String(a.identifier || "?"),
    node: String(a.node || "?"),
    addr,
    mem,
    suspended: !!a.is_suspended,
    installing: !!a.is_installing
  };
}

async function listServers(player) {
  if (!CONFIG.UUID || !CONFIG.KEY || CONFIG.KEY === "REDACTED") {
    player.sendMessage("§c[pvq] §7Not configured. Set §fpvq_uuid§7 and §fpvq_key§7 in variables.json.");
    return;
  }
  if (busy) { player.sendMessage("§e[pvq] §7Already fetching - one moment."); return; }
  busy = true;
  player.sendMessage("§b[pvq] §7Fetching servers for node §f" + CONFIG.UUID + "§7 ...");
  try {
    const req = new HttpRequest(CONFIG.BASE.replace(/\/$/, "") + "/" + CONFIG.UUID + "/children");
    req.method = HttpRequestMethod.Get;
    req.headers = [
      new HttpHeader("Authorization", "Bearer " + CONFIG.KEY),
      new HttpHeader("Accept", "application/json")
    ];
    const res = await http.request(req);
    if (res.status !== 200) {
      player.sendMessage("§c[pvq] §7API error (HTTP " + res.status + ").");
      return;
    }
    let parsed;
    try { parsed = JSON.parse(res.body); } catch { player.sendMessage("§c[pvq] §7Bad JSON from API."); return; }
    const raw = Array.isArray(parsed) ? parsed
      : (parsed.data || parsed.children || []);
    const kids = raw.map(safeChild);
    if (!kids.length) { player.sendMessage("§e[pvq] §7No child servers found."); return; }

    // In-game (safe fields only)
    world.sendMessage("§b[pvq] §f" + kids.length + " §7servers on node §f" + CONFIG.UUID + "§7:");
    for (const k of kids) {
      const flag = k.suspended ? " §c(suspended)" : (k.installing ? " §e(installing)" : "");
      world.sendMessage("  §7- §f" + k.name + " §8[" + k.id + "]§7 " + k.addr +
        (k.mem !== null ? " §8" + k.mem + "MB" : "") + flag);
    }

    // Discord (safe fields only)
    if (bridgeDirect.ready) {
      const lines = kids.map(k => {
        const flag = k.suspended ? " (suspended)" : (k.installing ? " (installing)" : "");
        return "- **" + k.name + "** `" + k.id + "` " + k.addr +
          (k.mem !== null ? " " + k.mem + "MB" : "") + " on " + k.node + flag;
      }).join("\n");
      bridgeDirect.sendEmbed({
        title: "pv-q servers (node " + CONFIG.UUID + ")",
        description: lines.slice(0, 3800),
        color: 0x3ba55d
      });
    }
  } catch (err) {
    player.sendMessage("§c[pvq] §7Request failed: " + (err && err.message ? err.message : err));
  } finally {
    busy = false;
  }
}
