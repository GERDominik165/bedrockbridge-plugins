/**
 * cmdCompat.js — kollisionstolerante Command-Registrierung für BedrockBridge
 *
 * Problem: BedrockBridge wirft "You cannot register this command as it's already
 * registered", wenn zwei Plugins denselben Command-Namen wollen -> das zweite
 * Plugin bricht beim Import ab und stoppt die ganze Kette. Damit ALLE Plugins
 * gleichzeitig laufen können, patcht dieser Shim registerCommand/registerAdminCommand/
 * registerTagCommand: bei Kollision wird automatisch ein Suffix angehängt
 * (mute -> mute2 -> mute3 …), das erste Plugin behält den sauberen Namen.
 *
 * MUSS früh importiert werden (vor den Plugins, die Commands registrieren).
 * Patcht, sobald bridge.bedrockCommands verfügbar ist (schneller Poll).
 */
import { system } from "@minecraft/server";
import { bridge } from "../addons";

const remaps = [];

function patch() {
  const bc = bridge && bridge.bedrockCommands;
  if (!bc) { system.runTimeout(patch, 1); return; }
  if (bc.__cmdCompat) return;
  bc.__cmdCompat = true;

  for (const method of ["registerCommand", "registerAdminCommand", "registerTagCommand"]) {
    const orig = bc[method];
    if (typeof orig !== "function") continue;
    bc[method] = function (name, ...rest) {
      let n = name, i = 2;
      while (true) {
        try {
          const r = orig.call(this, n, ...rest);
          if (n !== name) { remaps.push({ from: name, to: n }); console.warn(`[cmdCompat] '${name}' war belegt -> registriert als '${n}'`); }
          return r;
        } catch (e) {
          const msg = String(e);
          if ((msg.includes("already registered") || msg.includes("cannot register")) && i <= 12) { n = name + i; i++; continue; }
          throw e; // andere Fehler durchreichen
        }
      }
    };
  }
  console.warn("[cmdCompat] Command-Kollisions-Shim aktiv");
}

patch();

export function getRemaps() { return remaps.slice(); }
