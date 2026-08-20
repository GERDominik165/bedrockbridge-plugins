/**
 * diagnostics.js — Demo für @minecraft/diagnostics (Sentry)
 *
 * Initialisiert Sentry-Fehler-Tracking, wenn config §fsentry_dsn§r gesetzt ist,
 * und erlaubt Test-Events. API verifiziert: sentry.init(options), sentry.captureException,
 * sentry.addBreadcrumb, sentry.addTag/removeTag/getTags; SentryEventLevel.
 *
 * Command (Admin):  ?diag status | test | tag <k> <v>
 */
import { system } from "@minecraft/server";
import { variables } from "@minecraft/server-admin";
import { sentry, SentryEventLevel } from "@minecraft/diagnostics";
import { bridge } from "../addons";
import { hub } from "./hubAPI.js";

const PREFIX = "§2[§aDiag§2]§r ";
const ADMIN_TAG = "esploratori:admin";
let initialized = false;
let initError = null;

function cfg(name, def) { try { const v = variables && variables.get(name); return (v === undefined || v === null) ? def : v; } catch (e) { return def; } }

function tryInit() {
  const dsn = String(cfg("sentry_dsn", "")).trim();
  if (!dsn) { initError = "kein sentry_dsn in config"; return; }
  try { sentry.init({ dsn }); initialized = true; initError = null; }
  catch (e) { initError = String(e); }
}

function _reg(fn, t) { t = t || 0; if (bridge && bridge.bedrockCommands) { try { fn(); } catch (e) { console.warn("[diagnostics] reg:" + e); } } else if (t < 200) system.runTimeout(() => _reg(fn, t + 1), 5); }

_reg(function () {
  system.run(() => { try { tryInit(); } catch (e) { initError = String(e); } });

  bridge.bedrockCommands.registerAdminCommand("diag", (player, ...args) => {
    const a = args.map(x => (x == null ? "" : x.toString()));
    const sub = (a[0] || "status").toLowerCase();

    if (sub === "status") {
      return player.sendMessage(`${PREFIX}§7Sentry: ` + (initialized ? "§ainitialisiert ✓" : `§cinaktiv §7(${initError || "nicht initialisiert"})`));
    }
    if (sub === "init") { tryInit(); return player.sendMessage(`${PREFIX}` + (initialized ? "§ainitialisiert ✓" : `§c${initError}`)); }
    if (sub === "test") {
      if (!initialized) return player.sendMessage(`${PREFIX}§cSentry inaktiv — erst config sentry_dsn setzen.`);
      try {
        sentry.addBreadcrumb({ message: "Test-Breadcrumb von " + player.name, level: SentryEventLevel ? SentryEventLevel.Info : undefined });
        sentry.captureException(new Error("Test-Fehler von " + player.name));
        player.sendMessage(`${PREFIX}§aTest-Event an Sentry gesendet.`);
      } catch (e) { player.sendMessage(`${PREFIX}§ctest:${e}`); }
      return;
    }
    if (sub === "tag") {
      if (!a[1] || !a[2]) return player.sendMessage(`${PREFIX}§cUsage: ?diag tag <key> <value>`);
      try { sentry.addTag(a[1], a[2]); player.sendMessage(`${PREFIX}§aTag §f${a[1]}=${a[2]}§a gesetzt.`); } catch (e) { player.sendMessage(`${PREFIX}§c${e}`); }
      return;
    }
    player.sendMessage(`${PREFIX}§7Nutzung: §f?diag status | init | test | tag <k> <v>`);
  }, "Sentry-Diagnose (diagnostics)");
  console.warn("[diagnostics] Command ?diag registriert");

  try {
    hub.register({
      id: "diagnostics", title: "🩺 Diagnose", icon: "textures/ui/debug_glyph_color", category: "Verwaltung", order: 50, permission: ADMIN_TAG,
      handler: (p) => p.sendMessage(`${PREFIX}§7Sentry: ` + (initialized ? "§ainitialisiert ✓" : `§cinaktiv §7(${initError || "kein sentry_dsn"})§7 · §f?diag test`))
    });
    console.warn("[diagnostics] im Hub registriert");
  } catch (e) { console.warn("[diagnostics] hub-reg:" + e); }
});
