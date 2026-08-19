// TrophyNetwork WorldInfo Plugin – BedrockBridge ULTRA MONITOR EDITION
import { world, system, DimensionTypes } from "@minecraft/server";
import { bridge, bridgeDirect } from "../addons";
import * as WH from "./webhook.js";
import * as WHConfig from "./whconfig.js";
// getCurrentTimeString not available in realtime.js - using inline time formatting

const SETTINGS = {
  intervalMinutes: 30, // wie oft Infos gesendet werden
  includePlayerList: true,
  includeTPS: true,
  includeWeather: true,
  includeTime: true,
  includeMoonPhase: true,
  includeDimensions: true,
  webhookKey: "worldStats", // aus whconfig
};

// Dimension-Namen
const DIMENSION_LABELS = {
  [DimensionTypes.overworld]: "🌍 Overworld",
  [DimensionTypes.nether]: "🔥 Nether",
  [DimensionTypes.theEnd]: "🌌 The End",
};

// Mondphasen laut Bedrock
const MOON_PHASES = [
  "🌑 Neu", "🌒 Zunehmend", "🌓 Erstes Viertel",
  "🌔 Fast voll", "🌕 Vollmond", "🌖 Abnehmend",
  "🌗 Letztes Viertel", "🌘 Alt"
];

// Formatierte Weltdaten abrufen
function getWorldInfo() {
  const players = world.getPlayers();
  const playerCount = players.length;
  const tps = bridge?.metrics?.tps?.current?.toFixed(2) ?? "Unbekannt";
  const realTime = getCurrentTimeString?.() ?? "Unbekannt";

  let content = `🗺 **Weltstatus-Bericht**\n`;
  content += `👥 Spieler online: **${playerCount}**\n`;
  if (SETTINGS.includeTPS) content += `⏱ TPS: **${tps}**\n`;
  if (SETTINGS.includeTime) content += `🕒 Realtime: **${realTime}**\n`;

  if (SETTINGS.includeDimensions) {
    for (const dimId in DIMENSION_LABELS) {
      const dim = world.getDimension(dimId);
      const weather = dim?.getWeather()?.toString() ?? "Unbekannt";
      const moon = MOON_PHASES[dim?.getMoonPhase?.() ?? 0];
      content += `\n📍 ${DIMENSION_LABELS[dimId]}\n`;
      if (SETTINGS.includeWeather) content += `⛅ Wetter: **${weather}**\n`;
      if (SETTINGS.includeMoonPhase) content += `🌙 Mondphase: **${moon}**\n`;
    }
  }

  if (SETTINGS.includePlayerList && playerCount > 0) {
    content += `\n👤 **Spieler:**\n`;
    for (const p of players) {
      const pos = p.location;
      content += `• ${p.name} @ (${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})\n`;
    }
  }

  return content;
}

// Sende Weltinformationen per Webhook
function sendWorldStats() {
  const embed = {
    title: "🌐 Server-Weltstatus",
    description: getWorldInfo(),
    color: 3447003, // Blau
    footer: { text: `Bridge Monitor – alle ${SETTINGS.intervalMinutes} Minuten` },
    timestamp: new Date().toISOString(),
  };

  WH.sendWebhook(SETTINGS.webhookKey, { embeds: [embed] });
}

// Zeitgesteuerte Ausführung
let tickInterval = SETTINGS.intervalMinutes * 60 * 20;
system.runInterval(() => sendWorldStats(), tickInterval);

// Konsolenmeldung bei Pluginstart
console.warn(`✅ WorldInfo Plugin aktiv – sendet alle ${SETTINGS.intervalMinutes} Minuten Weltstatus über WHKey '${SETTINGS.webhookKey}'`);
