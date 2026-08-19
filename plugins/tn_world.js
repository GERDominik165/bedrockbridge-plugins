/**
 * TrophyNetwork - World Management Plugin  
 * Commands: !time, !weather, !difficulty, !gamemode shortcuts, !effect, !enchant
 * @author TrophyNetwork
 */
import { bridge } from '../addons';
import { system, world, GameMode, Difficulty, WeatherType, TimeOfDay } from '@minecraft/server';

// Wait for bridge.bedrockCommands to be available
function _registerWhenReady(registerFn) {
    if (bridge && bridge.bedrockCommands) {
        try { registerFn(); } catch(e) { console.warn('[TN] Command registration error: ' + e); }
    } else {
        system.runTimeout(() => _registerWhenReady(registerFn), 5);
    }
}


const PREFIX = "§6[§eTN-World§6]§r ";

// !time <day|night|noon|midnight|ticks>
_registerWhenReady(function() {
bridge.bedrockCommands.registerAdminCommand("time", (admin, timeArg) => {
    if (!timeArg) {
        const t = world.getTimeOfDay();
        const day = world.getDay();
        admin.sendMessage(`${PREFIX}§7Tag: §e${day} §7Zeit: §e${t} §7(${Math.round(t/24000*100)}%)`);
        return;
    }
    const timeMap = { 
        day: TimeOfDay.Day, noon: TimeOfDay.Noon, 
        night: TimeOfDay.Night, midnight: TimeOfDay.MidNight,
        sunrise: TimeOfDay.Sunrise, sunset: TimeOfDay.Sunset 
    };
    const key = timeArg.toString().toLowerCase();
    if (timeMap[key] !== undefined) {
        world.setTimeOfDay(timeMap[key]);
        world.sendMessage(`${PREFIX}§7Zeit gesetzt: §e${key}`);
    } else {
        const ticks = timeArg.readInteger();
        if (!isNaN(ticks)) {
            world.setTimeOfDay(Math.max(0, Math.min(24000, ticks)));
            world.sendMessage(`${PREFIX}§7Zeit gesetzt: §e${ticks} Ticks`);
        } else {
            admin.sendMessage(`${PREFIX}§cNutze: !time <day|night|noon|midnight|sunrise|sunset|0-24000>`);
        }
    }
}, "Setzt die Weltzeit. Nutze: !time <tag|nacht|ticks>");

// !weather <clear|rain|thunder>
bridge.bedrockCommands.registerAdminCommand("weather", (admin, typeArg) => {
    const typeMap = { 
        clear: WeatherType.Clear, sunny: WeatherType.Clear,
        rain: WeatherType.Rain, regen: WeatherType.Rain,
        thunder: WeatherType.Thunder, gewitter: WeatherType.Thunder 
    };
    const key = typeArg?.toString().toLowerCase();
    if (!key || !typeMap[key]) {
        const current = admin.dimension.id;
        admin.sendMessage(`${PREFIX}§cNutze: !weather <clear|rain|thunder>`);
        return;
    }
    world.getDimension("overworld").setWeather(typeMap[key]);
    world.sendMessage(`${PREFIX}§7Wetter: §e${key}`);
}, "Setzt das Wetter. Nutze: !weather <clear|rain|thunder>");

// !difficulty <easy|normal|hard|peaceful>
bridge.bedrockCommands.registerAdminCommand("difficulty", (admin, diffArg) => {
    const diffMap = {
        peaceful: Difficulty.Peaceful, p: Difficulty.Peaceful,
        easy: Difficulty.Easy, e: Difficulty.Easy,
        normal: Difficulty.Normal, n: Difficulty.Normal,
        hard: Difficulty.Hard, h: Difficulty.Hard
    };
    const key = diffArg?.toString().toLowerCase();
    if (!key || diffMap[key] === undefined) {
        const cur = world.getDifficulty();
        admin.sendMessage(`${PREFIX}§7Aktuelle Schwierigkeit: §e${cur}\n§cNutze: !difficulty <peaceful|easy|normal|hard>`);
        return;
    }
    world.setDifficulty(diffMap[key]);
    world.sendMessage(`${PREFIX}§7Schwierigkeit: §e${key}`);
}, "Setzt die Schwierigkeit. Nutze: !difficulty <easy|normal|hard|peaceful>");

// !c / !s / !a - quick gamemode shortcuts
bridge.bedrockCommands.registerAdminCommand("c", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    target.setGameMode(GameMode.creative);
    target.sendMessage(`${PREFIX}§b§lCreative §7Modus aktiviert.`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§a${target.name} §7→ Creative`);
}, "Wechselt in Creative-Modus. Nutze: !c [spieler]");

bridge.bedrockCommands.registerAdminCommand("s", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    target.setGameMode(GameMode.survival);
    target.sendMessage(`${PREFIX}§a§lSurvival §7Modus aktiviert.`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§a${target.name} §7→ Survival`);
}, "Wechselt in Survival-Modus. Nutze: !s [spieler]");

bridge.bedrockCommands.registerAdminCommand("a", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    target.setGameMode(GameMode.adventure);
    target.sendMessage(`${PREFIX}§e§lAdventure §7Modus aktiviert.`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§a${target.name} §7→ Adventure`);
}, "Wechselt in Adventure-Modus. Nutze: !a [spieler]");

// !effect <player> <effect> <dauer> <stärke>
bridge.bedrockCommands.registerAdminCommand("effect", (admin, targetArg, effectArg, durationArg, amplifierArg) => {
    const target = targetArg?.readPlayer();
    if (!target) return admin.sendMessage(`${PREFIX}§cSpieler nicht gefunden.`);
    const effectId = effectArg?.toString() || "";
    if (!effectId) return admin.sendMessage(`${PREFIX}§cNutze: !effect <spieler> <effekt> [dauer] [stärke]`);
    const duration = (durationArg?.readInteger() || 30) * 20; // in ticks
    const amplifier = amplifierArg?.readInteger() || 0;
    try {
        const fullId = effectId.includes(":") ? effectId : `minecraft:${effectId}`;
        target.addEffect(fullId, duration, { amplifier, showParticles: true });
        admin.sendMessage(`${PREFIX}§a${effectId} §7→ §f${target.name} §7(${duration/20}s, Stufe ${amplifier+1})`);
    } catch (e) {
        admin.sendMessage(`${PREFIX}§cUngültiger Effekt: §f${effectId}`);
    }
}, "Gibt einem Spieler einen Effekt. Nutze: !effect <name> <effekt> [sek] [stufe]");

// !cleareffects <player?>
bridge.bedrockCommands.registerAdminCommand("cleareffects", (admin, targetArg) => {
    const target = targetArg?.readPlayer() || admin;
    for (const effect of target.getEffects()) {
        target.removeEffect(effect.typeId);
    }
    target.sendMessage(`${PREFIX}§7Alle Effekte entfernt.`);
    if (target !== admin) admin.sendMessage(`${PREFIX}§aEffekte von §f${target.name} §aentfernt.`);
}, "Entfernt alle Effekte. Nutze: !cleareffects [spieler]");
});
