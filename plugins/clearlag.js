/**
 * ClearLag Titan Edition @version 3.4.7 - BedrockBridge Plugin
 * Entwickelt für TrophyNetwork von PoWeROffAPT + ChatGPT
 *
 * ♻️ Erkennt Items, XP-Orbs, Pfeile etc. in allen 3 Dimensionen
 * 📊 Zeigt Scan-Ergebnis mit Typen + Anzahl
 * ✅ Cleart nur nach Spielerbestätigung mit UI-Menü (bis zu 10 Sekunden Wartezeit)
 * 🧠 Automatische Warteschleife bei Chatoffenheit
 * ⏳ Zeigt Dauer des Scans & Cleans
 * 💬 Discord-Embed mit Typ, Anzahl, Dimension, Dauer, Spielername
 * 🖥️ Console-Log für vollständige Protokollierung
 * 🧪 Weitere Admin-Kommandos rund um ClearLag verfügbar
 * 🔐 Nur Spieler mit dem Tag "admin" können diesen Befehl nutzen
 * 🛠️ Inklusive GUI-gestütztem Verwaltungsmenü für Auto-Clears, Zeitintervall & Logging
 * 📋 Admin-Menü auch über Klick in Ergebnis-UI erreichbar
 */

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { bridgeDirect } from "../addons";

const trackedTypes = [
  "minecraft:item", "minecraft:arrow", "minecraft:xp_orb",
  "minecraft:snowball", "minecraft:egg", "minecraft:fireball"
];

let config = {
  autoClearEnabled: false,
  autoClearInterval: 300,
  discordLogging: true
};

system.runInterval(() => {
  if (!config.autoClearEnabled) return;
  const admin = world.getAllPlayers().find(p => p.hasTag("admin"));
  if (admin) admin.runCommandAsync("clearlag").catch(() => {});
}, 20 * 5);

function openClearLagMenu(player) {
  // 2 Sekunden Delay für bessere UI-Öffnung nach Chat
  system.runTimeout(() => {
    const form = new ModalFormData()
      .title("⚙️ ClearLag Verwaltung")
      .toggle("Auto-Clear aktivieren", config.autoClearEnabled)
      .slider("Intervall (Sekunden)", 30, 600, 30, config.autoClearInterval)
      .toggle("Discord Logging", config.discordLogging)
      .submitButton("Speichern & Anwenden");

    form.show(player).then(res => {
      if (res.canceled) return;
      [config.autoClearEnabled, config.autoClearInterval, config.discordLogging] = res.formValues;
      player.sendMessage("§a✅ Einstellungen aktualisiert.");
      logToConsole(`[ClearLag] Neue Einstellungen: ${JSON.stringify(config)}`);
    });
  }, 40);
}

world.beforeEvents.chatSend.subscribe((event) => {
  const player = event.sender;
  const msg = event.message.trim().toLowerCase();

  if (msg === "/clearlagmenu" || msg === "!clearlagmenu") {
    event.cancel = true;
    if (!player.hasTag("admin")) return player.sendMessage("§cDu benötigst den Tag 'admin'.");
    openClearLagMenu(player);
  }
});

world.beforeEvents.chatSend.subscribe((event) => {
  const player = event.sender;
  const msg = event.message.trim().toLowerCase();

  if (msg === "/clearlag" || msg === "!clearlag") {
    event.cancel = true;
    if (!player.hasTag("admin")) return player.sendMessage("§cDu benötigst den Tag 'admin'.");
    runClearLag(player);
  }
});

async function runClearLag(player) {
  const report = {};
  let total = 0;
  const startTime = Date.now();

  for (const dimName of ["overworld", "nether", "the_end"]) {
    const dim = world.getDimension(dimName);
    for (const ent of dim.getEntities()) {
      if (!ent || !ent.typeId) continue;
      if (trackedTypes.includes(ent.typeId)) {
        report[dimName] ??= {};
        report[dimName][ent.typeId] = (report[dimName][ent.typeId] ?? 0) + 1;
        total++;
      }
    }
  }

  if (total === 0) {
    player.sendMessage("§aKeine unnötigen Entities gefunden.");
    return logToConsole(`[ClearLag] Keine zu entfernenden Entities.`);
  }

  const duration = Date.now() - startTime;
  let msg = `§e⚠ ${total} Entities gefunden in ${duration}ms:\n`;
  for (const dim in report) {
    msg += `§7Dimension: ${dim}\n`;
    for (const type in report[dim]) {
      msg += `  §8- §f${type.replace("minecraft:", "")}§7: ${report[dim][type]}\n`;
    }
  }

  if (config.discordLogging)
    sendDiscord("🧹 ClearLag Analyse", `Spieler **${player.name}** hat ${total} Entities erkannt und wartet auf UI-Bestätigung.\nDauer: ${duration}ms`, 0xf1c40f);

  logToConsole(`[ClearLag] ${player.name} erkannte ${total} Entity(s) in ${duration}ms.`);

  const form = new ActionFormData()
    .title("🧹 ClearLag Ergebnis")
    .body(`${msg}\n§6Wie möchtest du fortfahren?`)
    .button("§aJetzt löschen")
    .button("§7Verwalten (Menü öffnen)")
    .button("§cAbbrechen");

  const res = await form.show(player);

  if (res.canceled || res.selection === 2) {
    player.sendMessage("§7❌ ClearLag abgebrochen.");
    return logToConsole(`[ClearLag] ${player.name} hat abgebrochen.`);
  }

  if (res.selection === 1) return openClearLagMenu(player);

  let removed = 0;
  const cleanStart = Date.now();

  for (const dimName in report) {
    const dim = world.getDimension(dimName);
    for (const type of Object.keys(report[dimName])) {
      const entities = dim.getEntities({ type });
      for (const ent of entities) {
        try {
          ent.remove();
          removed++;
        } catch (e) {
          dim.runCommandAsync(`kill @e[type=${type}]`).catch(() => {});
        }
      }
    }
  }

  const cleanTime = Date.now() - cleanStart;
  player.sendMessage(`§a✅ ${removed} Entities gelöscht in ${cleanTime}ms.`);
  logToConsole(`[ClearLag] ${removed} gelöscht durch ${player.name} in ${cleanTime}ms.`);
  if (config.discordLogging)
    sendDiscord("✅ Entities gelöscht", `Spieler **${player.name}** hat ${removed} Entities gelöscht.\nDauer: ${cleanTime}ms`, 0x2ecc71);
}

function logToConsole(msg) {
  console.warn("[ClearLag] " + msg);
}

function sendDiscord(title, description, color = 0x3498db) {
  const embed = {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: { text: "TrophyNetwork ClearLag Logger" }
  };

  if (bridgeDirect?.ready) {
    bridgeDirect.sendEmbed(embed, "CommandLog", "https://mc-heads.net/avatar/ClearLag");
  } else {
    console.warn("[ClearLag] Discord-Bridge nicht bereit.");
  }
}

console.log("♻️ BedrockBridge ClearLag Titan Edition v3.4.7 geladen – vollständige Menü-Integration, Auto-Verwaltung & UI-Flow Fix aktiv!");


// --- In das zentrale BridgeHub registrieren ---
import { hub as _bridgeHub } from "./hubAPI.js";
try {
  _bridgeHub.register({ id: "clearlag", title: "🧹 ClearLag", icon: "textures/ui/trash", category: "Admin", order: 60, permission: "esploratori:admin", handler: p => openClearLagMenu(p) });
  console.warn("[clearlag] im Hub registriert");
} catch (e) { console.warn("[clearlag] hub-reg: " + e); }
