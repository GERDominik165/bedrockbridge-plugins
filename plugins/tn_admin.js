/**
 * TrophyNetwork - Admin Commands Plugin
 * Commands: !kick, !ban, !warn, !warns, !clearwarn, !fly, !invul, !kill, !clearinv, !spectate, !sudo
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { world, system, GameMode } from '@minecraft/server';

// Wait for bridge.bedrockCommands to be available
function _registerWhenReady(registerFn) {
    if (bridge && bridge.bedrockCommands) {
        try { registerFn(); } catch(e) { console.warn('[TN] Command registration error: ' + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(registerFn), 5);
    }
}


const PREFIX = "§6[§eTN-Admin§6]§r ";
const WARN_DB_KEY = "tn_warnings";

// Get/set warnings from world dynamic properties
function getWarnings() {
    try {
        const raw = world.getDynamicProperty(WARN_DB_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}
function saveWarnings(data) {
    world.setDynamicProperty(WARN_DB_KEY, JSON.stringify(data));
}

// !kick <player> [reason]
_registerWhenReady(function() {
bridge.bedrockCommands.registerAdminCommand("kick", (admin, targetArg, ...reasonParts) => {
    const target = targetArg?.readPlayer();
    if (!target) return admin.sendMessage(`${PREFIX}§cSpieler nicht gefunden: §f${targetArg}`);
    const reason = reasonParts.map(r => r.toString()).join(" ") || "Kein Grund angegeben";
    target.sendMessage(`§c§lDu wurdest gekickt!\n§r§7Grund: §f${reason}`);
    system.runTimeout(() => { target.runCommand(`kick "${target.name}" ${reason}`); }, 20);
    admin.sendMessage(`${PREFIX}§a${target.name} §7wurde gekickt. Grund: §f${reason}`);
    world.sendMessage(`§c[Kick] §f${target.name} §7wurde von §f${admin.name} §7gekickt.`);
}, "Kickt einen Spieler. Nutze: !kick <name> [grund]");

// !warn <player> <reason>
bridge.bedrockCommands.registerAdminCommand("warn", (admin, targetArg, ...reasonParts) => {
    const target = targetArg?.readPlayer();
    if (!target) return admin.sendMessage(`${PREFIX}§cSpieler nicht gefunden.`);
    const reason = reasonParts.map(r => r.toString()).join(" ") || "Regelverstoß";
    const warnings = getWarnings();
    if (!warnings[target.name]) warnings[target.name] = [];
    warnings[target.name].push({ reason, by: admin.name, time: Date.now() });
    saveWarnings(warnings);
    const count = warnings[target.name].length;
    target.sendMessage(`§c§l⚠ VERWARNUNG #${count}\n§r§7Grund: §f${reason}\n§7Von: §f${admin.name}`);
    admin.sendMessage(`${PREFIX}§a${target.name} §7verwarnt (#${count}). Grund: §f${reason}`);
}, "Verwarnt einen Spieler. Nutze: !warn <name> <grund>");

// !warns <player>
bridge.bedrockCommands.registerAdminCommand("warns", (admin, targetArg) => {
    const name = targetArg?.toString() || "";
    const warnings = getWarnings();
    const playerWarns = warnings[name] || [];
    if (playerWarns.length === 0) {
        admin.sendMessage(`${PREFIX}§7${name} hat keine Verwarnungen.`);
        return;
    }
    admin.sendMessage(`§6§l═══ Verwarnungen: ${name} ═══`);
    playerWarns.forEach((w, i) => {
        const date = new Date(w.time).toLocaleDateString("de-DE");
        admin.sendMessage(`§e#${i+1} §f${w.reason} §7(${date}, von ${w.by})`);
    });
}, "Zeigt Verwarnungen eines Spielers. Nutze: !warns <name>");

// !clearwarn <player>
bridge.bedrockCommands.registerAdminCommand("clearwarn", (admin, targetArg) => {
    const name = targetArg?.toString() || "";
    const warnings = getWarnings();
    delete warnings[name];
    saveWarnings(warnings);
    admin.sendMessage(`${PREFIX}§aAlle Verwarnungen von §f${name} §agelöscht.`);
}, "Löscht alle Verwarnungen. Nutze: !clearwarn <name>");

// !fly <player?> - toggle fly
bridge.bedrockCommands.registerAdminCommand("fly", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const flying = target.isFlying;
    target.inputPermissions.flightEnabled = !flying;
    const state = !flying ? "§aaktiviert" : "§cdeaktiviert";
    target.sendMessage(`${PREFIX}§7Flug ${state}§7.`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§7Flug für §f${target.name} ${state}§7.`);
}, "Aktiviert/deaktiviert Fliegen. Nutze: !fly [spieler]");

// !invul <player?> - god mode via health
bridge.bedrockCommands.registerAdminCommand("invul", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const hasTag = target.hasTag("invul");
    if (hasTag) {
        target.removeTag("invul");
        target.sendMessage(`${PREFIX}§cUnverwundbarkeit §7deaktiviert.`);
    } else {
        target.addTag("invul");
        target.sendMessage(`${PREFIX}§aUnverwundbarkeit §7aktiviert.`);
    }
    if (target !== admin) admin.sendMessage(`${PREFIX}§7Invul für §f${target.name} ${hasTag ? "§cdeaktiviert" : "§aaktiviert"}§7.`);
}, "Schaltet Unverwundbarkeit um. Nutze: !invul [spieler]");

// !kill <player?>
bridge.bedrockCommands.registerAdminCommand("kill", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    target.kill();
    admin.sendMessage(`${PREFIX}§a${target.name} §7wurde getötet.`);
}, "Tötet einen Spieler. Nutze: !kill [spieler]");

// !clearinv <player?>
bridge.bedrockCommands.registerAdminCommand("clearinv", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const inv = target.getComponent("minecraft:inventory")?.container;
    if (inv) {
        inv.clearAll();
        target.sendMessage(`${PREFIX}§7Dein Inventar wurde geleert.`);
        if (target !== admin) admin.sendMessage(`${PREFIX}§aInventar von §f${target.name} §ageleert.`);
    }
}, "Leert das Inventar. Nutze: !clearinv [spieler]");

// !spectate <player?>
bridge.bedrockCommands.registerAdminCommand("spec", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    const current = target.getGameMode();
    if (current === GameMode.spectator) {
        target.setGameMode(GameMode.survival);
        admin.sendMessage(`${PREFIX}§a${target.name} §7→ Survival`);
    } else {
        target.setGameMode(GameMode.spectator);
        admin.sendMessage(`${PREFIX}§a${target.name} §7→ Spectator`);
    }
}, "Schaltet Spectator-Modus um. Nutze: !spectate [spieler]");

// !sudo <player> <command> - run command as player
bridge.bedrockCommands.registerAdminCommand("sudo", (admin, targetArg, ...cmdParts) => {
    const target = targetArg?.readPlayer();
    if (!target) return admin.sendMessage(`${PREFIX}§cSpieler nicht gefunden.`);
    const cmd = cmdParts.map(c => c.toString()).join(" ");
    if (!cmd) return admin.sendMessage(`${PREFIX}§cKein Befehl angegeben.`);
    try {
        target.runCommand(cmd);
        admin.sendMessage(`${PREFIX}§a${target.name} §7hat ausgeführt: §f${cmd}`);
    } catch (e) {
        admin.sendMessage(`${PREFIX}§cFehler: §f${e.message || e}`);
    }
}, "Lässt einen Spieler einen Command ausführen. Nutze: !sudo <name> <befehl>");

// !broadcast <message>
bridge.bedrockCommands.registerAdminCommand("broadcast", (admin, ...msgParts) => {
    const msg = msgParts.map(m => m.toString()).join(" ");
    if (!msg) return admin.sendMessage(`${PREFIX}§cNachricht fehlt.`);
    world.sendMessage(`§6§l[BROADCAST] §r§f${msg}`);
}, "Sendet eine Broadcast-Nachricht. Nutze: !broadcast <nachricht>");

// Invul tick check
system.runTimeout(function invulCheck() {
    try {
        for (const p of world.getAllPlayers()) {
            if (p.hasTag("invul")) {
                const health = p.getComponent("minecraft:health");
                if (health && health.currentValue < health.effectiveMax) {
                    health.resetToMaxValue();
                }
            }
        }
    } catch(e) {}
    system.runTimeout(invulCheck, 10);
}, 10);
});
