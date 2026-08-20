/**
 * commonUtil.js — Demo für @minecraft/common
 *
 * @minecraft/common liefert die typisierten Engine-Fehlerklassen. Dieses Plugin
 * zeigt, wie man Fehler SAUBER klassifiziert (statt nur String-Vergleich) und
 * stellt einen wiederverwendbaren `classify(e)`-Helfer bereit.
 *
 * Command:  ?errcheck <blockId>   (löst gezielt einen Fehler aus und benennt den Typ)
 */
import { system, BlockPermutation } from "@minecraft/server";
import * as common from "@minecraft/common";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const PREFIX = "§6[§eCommon§6]§r ";

// Wiederverwendbar: gibt den @minecraft/common-Fehlertyp-Namen zurück (oder "Error").
export function classify(e) {
  for (const name of Object.keys(common)) {
    const cls = common[name];
    try { if (typeof cls === "function" && e instanceof cls) return name; } catch (x) {}
  }
  return (e && e.constructor && e.constructor.name) || "Error";
}

function _reg(fn, t) { t = t || 0; if (bridge && bridge.bedrockCommands) { try { fn(); } catch (e) { console.warn("[commonUtil] reg:" + e); } } else if (t < 200) system.runTimeout(() => _reg(fn, t + 1), 5); }

_reg(function () {
  bridge.bedrockCommands.registerCommand("errcheck", (player, ...args) => {
    const id = (args[0] && args[0].toString()) || "minecraft:not_a_real_block";
    try {
      BlockPermutation.resolve(id);
      player.sendMessage(`${PREFIX}§a„${id}" ist gültig — kein Fehler.`);
    } catch (e) {
      player.sendMessage(`${PREFIX}§7„${id}" → Fehlertyp: §e${classify(e)}§7: §f${e}`);
    }
  }, "Typisierte Fehler-Klassifikation (common)");
  console.warn("[commonUtil] Command ?errcheck registriert");

  try {
    hub.register({
      id: "common", title: "🧩 Fehlertypen", icon: "textures/ui/debug_glyph_color", category: "Werkzeuge", order: 60, permission: null,
      handler: (p) => p.sendMessage(`${PREFIX}§7@minecraft/common Fehlertypen: §f` + Object.keys(common).filter(k => k.endsWith("Error")).join(", ") + `§7 · Test: §f?errcheck minecraft:xyz`)
    });
    console.warn("[commonUtil] im Hub registriert");
  } catch (e) { console.warn("[commonUtil] hub-reg:" + e); }
});
