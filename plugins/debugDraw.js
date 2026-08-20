/**
 * debugDraw.js — Demo für @minecraft/debug-utilities
 *
 * Zeichnet Debug-Formen (Box/Kugel/Linie/Pfeil/Text) in die Welt und zeigt
 * Laufzeit-Statistiken. API (per Introspektion verifiziert):
 *   debugDrawer.addShape(shape) / removeShape(shape) / removeAll()
 *   new DebugBox(location) mit .bound; new DebugSphere(location) mit .scale;
 *   new DebugLine(a,b); new DebugArrow(a,b); new DebugText(location, text)
 *   Shapes haben .color ({red,green,blue} 0..1). collectRuntimeStats().
 *
 * Command (Admin):  ?draw box|sphere|line|arrow|text <text?> | clear | stats
 */
import { system } from "@minecraft/server";
import { debugDrawer, DebugBox, DebugSphere, DebugLine, DebugArrow, DebugText, collectRuntimeStats } from "@minecraft/debug-utilities";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const PREFIX = "§8[§7Debug§8]§r ";
const ADMIN_TAG = "esploratori:admin";
const active = []; // gezeichnete Shapes (zum Aufräumen)

function col(r, g, b) { return { red: r, green: g, blue: b }; }
function addTemp(shape, seconds) {
  try { debugDrawer.addShape(shape); active.push(shape); } catch (e) { return "add:" + e; }
  system.runTimeout(() => { try { debugDrawer.removeShape(shape); } catch (e) {} const i = active.indexOf(shape); if (i >= 0) active.splice(i, 1); }, (seconds || 20) * 20);
  return null;
}

function drawAt(player, kind, text) {
  const l = player.location;
  const at = { x: Math.floor(l.x) + 0.5, y: Math.floor(l.y) + 1, z: Math.floor(l.z) + 0.5 };
  try {
    if (kind === "box") { const s = new DebugBox(at); try { s.bound = { x: 1, y: 1, z: 1 }; } catch (e) {} try { s.color = col(1, 0.2, 0.2); } catch (e) {} return addTemp(s, 30); }
    if (kind === "sphere") { const s = new DebugSphere(at); try { s.scale = 2; } catch (e) {} try { s.color = col(0.2, 0.6, 1); } catch (e) {} return addTemp(s, 30); }
    if (kind === "line") { const s = new DebugLine(at, { x: at.x, y: at.y + 4, z: at.z }); try { s.color = col(0.2, 1, 0.2); } catch (e) {} return addTemp(s, 30); }
    if (kind === "arrow") { const s = new DebugArrow(at, { x: at.x + 4, y: at.y, z: at.z }); try { s.color = col(1, 1, 0.2); } catch (e) {} return addTemp(s, 30); }
    if (kind === "text") { const s = new DebugText(at, text || "TrophyNetwork"); try { s.color = col(1, 1, 1); } catch (e) {} return addTemp(s, 30); }
  } catch (e) { return String(e); }
  return "unknown";
}

function _reg(fn, t) { t = t || 0; if (bridge && bridge.bedrockCommands) { try { fn(); } catch (e) { console.warn("[debugDraw] reg:" + e); } } else if (t < 200) system.runTimeout(() => _reg(fn, t + 1), 5); }

_reg(function () {
  bridge.bedrockCommands.registerAdminCommand("draw", (player, ...args) => {
    const a = args.map(x => (x == null ? "" : x.toString()));
    const kind = (a[0] || "").toLowerCase();
    if (kind === "clear") { try { debugDrawer.removeAll(); } catch (e) {} active.length = 0; return player.sendMessage(`${PREFIX}§aAlle Debug-Formen entfernt.`); }
    if (kind === "stats") {
      try { const s = collectRuntimeStats(); player.sendMessage(`${PREFIX}§7Runtime: §f` + JSON.stringify(s).slice(0, 300)); }
      catch (e) { player.sendMessage(`${PREFIX}§cstats:${e}`); }
      return;
    }
    if (["box", "sphere", "line", "arrow", "text"].includes(kind)) {
      const err = drawAt(player, kind, a.slice(1).join(" "));
      return player.sendMessage(err ? `${PREFIX}§c${err}` : `${PREFIX}§a${kind} gezeichnet (30s).`);
    }
    player.sendMessage(`${PREFIX}§7Nutzung: §f?draw box|sphere|line|arrow|text <text> | clear | stats`);
  }, "Debug-Formen zeichnen (debug-utilities)");
  console.warn("[debugDraw] Command ?draw registriert");

  try {
    hub.register({
      id: "debugdraw", title: "📐 Debug-Formen", icon: "textures/ui/magnifyingGlass", category: "Werkzeuge", order: 30, permission: ADMIN_TAG,
      handler: async (p) => {
        const ui = await import("@minecraft/server-ui");
        const f = new ui.ActionFormData().title("📐 Debug-Formen").body("§7Zeichnet an deiner Position (30s).")
          .button("§cBox").button("§bKugel").button("§aLinie").button("§ePfeil").button("§fText").button("§7Alles löschen").button("§7Runtime-Stats");
        const r = await f.show(p); if (!r || r.canceled) return;
        const map = ["box", "sphere", "line", "arrow", "text"];
        if (r.selection < 5) { const e = drawAt(p, map[r.selection]); p.sendMessage(e ? `${PREFIX}§c${e}` : `${PREFIX}§a${map[r.selection]} gezeichnet.`); }
        else if (r.selection === 5) { try { debugDrawer.removeAll(); } catch (e) {} p.sendMessage(`${PREFIX}§aGelöscht.`); }
        else { try { p.sendMessage(`${PREFIX}§7` + JSON.stringify(collectRuntimeStats()).slice(0, 300)); } catch (e) {} }
      }
    });
    console.warn("[debugDraw] im Hub registriert");
  } catch (e) { console.warn("[debugDraw] hub-reg:" + e); }
});
