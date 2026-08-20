/**
 * visuals.js — Demo für @minecraft/server-graphics (Vibrant Visuals)
 *
 * Überschreibt Licht/Wasser pro Spieler für das aktuelle Biom. API verifiziert:
 *   getPlayerLighting(biome: BiomeType, player) -> BiomeLighting
 *     .setSunColor/.setAmbientColor/.setMoonColor/.setFlashColor ({red,green,blue})
 *     .setSunIlluminance/.setAmbientIlluminance/.setSkyIntensity/.setOrbitalOffsetDegrees(number)
 *     .resetXxx()  (alles zurücksetzen)
 *   getPlayerWater(biome, player) -> BiomeWater (.setWavesDepth/.setChlorophyll/…)
 *   Biom via player.dimension.getBiome(player.location).
 *
 * Command:  ?visuals night|blood|ocean|reset
 */
import { system } from "@minecraft/server";
import { getPlayerLighting, getPlayerWater } from "@minecraft/server-graphics";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const PREFIX = "§3[§bVisuals§3]§r ";
const col = (r, g, b) => ({ red: r, green: g, blue: b });

function biomeOf(player) {
  try { return player.dimension.getBiome(player.location); } catch (e) { return null; }
}

function apply(player, mode) {
  const biome = biomeOf(player);
  if (!biome) return "Biom nicht ermittelbar (Chunk geladen?).";
  let L, W;
  try { L = getPlayerLighting(biome, player); } catch (e) { return "Lighting: " + e; }
  try { W = getPlayerWater(biome, player); } catch (e) { W = null; }
  try {
    if (mode === "reset") {
      for (const m of ["resetSunColor", "resetAmbientColor", "resetMoonColor", "resetFlashColor", "resetSunIlluminance", "resetAmbientIlluminance", "resetSkyIntensity", "resetOrbitalOffsetDegrees"]) { try { L[m](); } catch (e) {} }
      if (W) for (const m of ["resetWavesDepth", "resetChlorophyll", "resetWavesSpeed"]) { try { W[m](); } catch (e) {} }
      return null;
    }
    if (mode === "night") {
      try { L.setAmbientColor(col(0.05, 0.06, 0.12)); } catch (e) {}
      try { L.setAmbientIlluminance(0.3); } catch (e) {}
      try { L.setSkyIntensity(0.15); } catch (e) {}
      try { L.setSunColor(col(0.1, 0.1, 0.25)); } catch (e) {}
      return null;
    }
    if (mode === "blood") {
      try { L.setAmbientColor(col(0.5, 0.03, 0.03)); } catch (e) {}
      try { L.setAmbientIlluminance(1.2); } catch (e) {}
      try { L.setSunColor(col(1, 0.1, 0.1)); } catch (e) {}
      try { L.setSkyIntensity(0.6); } catch (e) {}
      return null;
    }
    if (mode === "ocean") {
      try { L.setAmbientColor(col(0.1, 0.3, 0.5)); } catch (e) {}
      if (W) { try { W.setWavesDepth(1.5); } catch (e) {} try { W.setWavesSpeed(2); } catch (e) {} try { W.setChlorophyll(0.8); } catch (e) {} }
      return null;
    }
  } catch (e) { return String(e); }
  return "unbekannter Modus";
}

function _reg(fn, t) { t = t || 0; if (bridge && bridge.bedrockCommands) { try { fn(); } catch (e) { console.warn("[visuals] reg:" + e); } } else if (t < 200) system.runTimeout(() => _reg(fn, t + 1), 5); }

_reg(function () {
  bridge.bedrockCommands.registerCommand("visuals", (player, ...args) => {
    const mode = ((args[0] && args[0].toString()) || "help").toLowerCase();
    if (["night", "blood", "ocean", "reset"].includes(mode)) {
      const err = apply(player, mode);
      return player.sendMessage(err ? `${PREFIX}§c${err}` : `${PREFIX}§aVisual „${mode}" angewendet.`);
    }
    player.sendMessage(`${PREFIX}§7Nutzung: §f?visuals night | blood | ocean | reset`);
  }, "Grafik/Licht überschreiben (server-graphics)");
  console.warn("[visuals] Command ?visuals registriert");

  try {
    hub.register({
      id: "visuals", title: "🌈 Visuals", icon: "textures/ui/sidebar_icons/resource_packs", category: "Anzeige", order: 20, permission: null,
      handler: async (p) => {
        const ui = await import("@minecraft/server-ui");
        const f = new ui.ActionFormData().title("🌈 Visuals").body("§7Licht/Wasser für dein aktuelles Biom überschreiben.")
          .button("§9Nacht").button("§cBlutmond").button("§bOzean").button("§7Zurücksetzen");
        const r = await f.show(p); if (!r || r.canceled) return;
        const modes = ["night", "blood", "ocean", "reset"];
        const err = apply(p, modes[r.selection]);
        p.sendMessage(err ? `${PREFIX}§c${err}` : `${PREFIX}§aVisual „${modes[r.selection]}" angewendet.`);
      }
    });
    console.warn("[visuals] im Hub registriert");
  } catch (e) { console.warn("[visuals] hub-reg:" + e); }
});
