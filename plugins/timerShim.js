/**
 * timerShim.js — globale setInterval/setTimeout-Brücke für Bedrock (QuickJS)
 *
 * Bedrock hat KEIN globales setInterval/setTimeout — nur system.runInterval/runTimeout
 * (20 Ticks/s). Viele (portierte) Plugins nutzen aber bare setInterval -> ReferenceError.
 * Dieser Shim definiert die Globals EINMAL und mappt sie auf die system-API.
 * MUSS als ERSTER Import in index.js stehen (vor allen Plugins, die Timer nutzen).
 */
import { system } from "@minecraft/server";

const toTicks = (ms) => Math.max(1, Math.round((Number(ms) || 0) / 50));

if (typeof globalThis.setInterval !== "function") {
  globalThis.setInterval = (fn, ms) => { try { return system.runInterval(() => { try { fn(); } catch (e) {} }, toTicks(ms)); } catch (e) { return -1; } };
  globalThis.setTimeout = (fn, ms) => { try { return system.runTimeout(() => { try { fn(); } catch (e) {} }, toTicks(ms)); } catch (e) { return -1; } };
  globalThis.clearInterval = (id) => { try { if (id != null) system.clearRun(id); } catch (e) {} };
  globalThis.clearTimeout = (id) => { try { if (id != null) system.clearRun(id); } catch (e) {} };
  console.warn("[timerShim] setInterval/setTimeout/clearInterval/clearTimeout global gemappt");
}
