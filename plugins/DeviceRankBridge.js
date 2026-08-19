// TrophyNetwork ChatRank Plugin – DeviceRankBridge (Robust Final Version)
import { world, system, PlatformType } from "@minecraft/server";
import { bridge, bridgeDirect } from "../addons";
import { ActionFormData } from "@minecraft/server-ui";

const deviceTags = {
  [PlatformType.Console]: "rank:console",
  [PlatformType.Desktop]: "rank:pc",
  [PlatformType.Mobile]: "rank:mobile",
};

let bannedDevices = []; // z. B. [PlatformType.Desktop, PlatformType.Mobile]
let discordLogEnabled = true;
const unknownDeviceCache = new Set();
const kickList = new Set();

// Verhindere Logspam durch gekickte Spieler
bridge.events.playerJoinLog.subscribe((e, player) => {
  if (kickList.has(player.id)) e.cancel = true;
});
bridge.events.playerLeaveLog.subscribe((e, player) => {
  if (kickList.has(player.id)) {
    e.cancel = true;
    kickList.delete(player.id);
  }
});

// Robustere Methode zur Geräteerkennung
function getDeviceType(player) {
  try {
    const type = player?.clientSystemInfo?.platformType;
    return typeof type === "string" ? type : type?.toString() ?? null;
  } catch (e) {
    console.warn(`[DeviceRankBridge] Fehler beim Abrufen von ${player?.name}:`, e);
    return null;
  }
}

function updateDeviceRank(player) {
  try {
    const device = getDeviceType(player);
    const tag = deviceTags[device];

    if (!tag) {
      if (!unknownDeviceCache.has(player.name)) {
        console.warn(`🔍 Unbekanntes Gerät für ${player.name}: ${device}`);
        player.sendMessage(`§cUnbekanntes Gerät erkannt: ${device}`);
        unknownDeviceCache.add(player.name);
      }
      return;
    }

    if (bannedDevices.includes(device)) {
      kickList.add(player.id);
      player.runCommandAsync(`kick "${player.name}" Gerätetyp blockiert: ${device}`);
      if (discordLogEnabled && bridgeDirect.ready) {
        bridgeDirect.sendEmbed({
          title: "⛔ Gerät gebannt",
          description: `**${player.name}** wurde wegen **${device}** entfernt.`,
          color: 0xff0000,
          timestamp: new Date().toISOString(),
          footer: { text: "DeviceRankBridge" },
          author: { name: player.name },
        }, "DeviceBan");
      }
      return;
    }

    for (const t of Object.values(deviceTags)) player.removeTag(t);
    player.addTag(tag);
    player.sendMessage(`§aPlattform erkannt: §e${device} §r→ §b${tag}`);
    console.log(`✅ ${player.name} spielt auf ${device}, Tag gesetzt: ${tag}`);

    if (bridgeDirect.ready) {
      bridgeDirect.sendEmbed({
        title: "📱 Gerät erkannt",
        description: `**${player.name}** spielt auf **${device}**\n→ Tag: \`${tag}\``,
        color: 0x2ecc71,
        timestamp: new Date().toISOString(),
        footer: { text: "DeviceRankBridge" },
        author: { name: player.name },
      }, "DeviceRank", `https://mc-heads.net/avatar/${player.name}`);
    }
  } catch (e) {
    console.warn(`[DeviceRankBridge] Fehler beim Update für ${player.name}:`, e);
  }
}

// Automatische Prüfung im Intervall
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const hasTag = Object.values(deviceTags).some(tag => player.getTags().includes(tag));
    if (!hasTag) updateDeviceRank(player);
  }
}, 100);

// Admin-Befehle
bridge.bedrockCommands.registerTagCommand("deviceupdate", "admin", (player) => {
  updateDeviceRank(player);
}, "Setzt deinen Gerätetag neu.");

bridge.bedrockCommands.registerTagCommand("deviceranksettings", "admin", (player) => {
  const form = new ActionFormData()
    .title("⚙ Einstellungen")
    .body("Verwalte Gerätetags und Banns")
    .button(`📵 Geräte sperren (${bannedDevices.length})`)
    .button(`📤 Discord: ${discordLogEnabled ? "§aAN" : "§cAUS"}`)
    .button("🔁 Alle Spieler prüfen")
    .button("❌ Schließen");

  form.show(player).then(res => {
    if (res.canceled) return;
    switch (res.selection) {
      case 0: return openBannedDeviceMenu(player);
      case 1:
        discordLogEnabled = !discordLogEnabled;
        player.sendMessage(`§7Discord-Logging: ${discordLogEnabled ? "§aaktiviert" : "§cdeaktiviert"}`);
        break;
      case 2:
        world.getPlayers().forEach(p => updateDeviceRank(p));
        player.sendMessage("§aAlle Spieler wurden geprüft.");
        break;
    }
    system.runTimeout(() => bridge.bedrockCommands.run(player, "deviceranksettings"), 2);
  });
}, "Öffnet das UI zur Verwaltung von Gerätetags.");

function openBannedDeviceMenu(player) {
  const devices = Object.keys(deviceTags);
  const form = new ActionFormData()
    .title("📵 Gebannte Geräte")
    .body("Gerätetypen aktivieren/deaktivieren");

  devices.forEach(type => {
    const banned = bannedDevices.includes(type);
    form.button(`${banned ? "§c❌" : "§a✔"} ${type}`);
  });

  form.show(player).then(res => {
    if (res.canceled) return bridge.bedrockCommands.run(player, "deviceranksettings");
    const selected = devices[res.selection];
    const index = bannedDevices.indexOf(selected);
    if (index >= 0) bannedDevices.splice(index, 1);
    else bannedDevices.push(selected);
    player.sendMessage(`§7${selected} ist jetzt ${bannedDevices.includes(selected) ? "§cgesperrt" : "§aerlaubt"}`);
    system.runTimeout(() => openBannedDeviceMenu(player), 2);
  });
}

// Chat Prefix Handler (Bridge-kompatibel)
if (bridge.chat?.setPrefixHandler) {
  bridge.chat.setPrefixHandler(player => {
    const ranks = player.getTags().filter(t => t.startsWith("rank:")).map(t => t.replace("rank:", ""));
    return ranks.length > 0 ? `[${ranks.join(" | ")}] ` : "";
  });
}

console.warn("✅ DeviceRankBridge gestartet – vollständig robust und dynamisch.");