// TrophyNetwork WeatherAnnouncer Plugin – TrophyBridge ULTRA FINAL EDITION
import { world, system } from "@minecraft/server";
import { bridge, bridgeDirect } from "../addons";

// BridgeDirect Initialisierung + Logging
bridge.events.bridgeInitialize.subscribe(e => {
  e.registerAddition("discord_direct");
  console.warn("✅ DiscordDirect aktiviert für WeatherAnnouncer");
});

let lastWeather = null;

const WEATHER_STATES = {
  klar: {
    id: "klar",
    label: "§6klarer Himmel",
    icon: "☀️",
    chat: "☀️ Die Sonne scheint wieder über §eTrophyCity§r!",
    discord: "☀️ Die Sonne scheint wieder über **TrophyCity**!",
    log: "Sonnenschein bricht durch die Wolken.",
    color: 0xffff66
  },
  regen: {
    id: "regen",
    label: "§9Regen",
    icon: "🌧️",
    chat: "🌧️ Es beginnt zu regnen. Zieht euch warm an!",
    discord: "🌧️ Ein Regenschauer beginnt. Holt eure Schirme raus!",
    log: "Regenphase gestartet.",
    color: 0x6699ff
  },
  gewitter: {
    id: "gewitter",
    label: "§5Gewitter",
    icon: "⛈️",
    chat: "⛈️ Ein Gewitter zieht auf. Sucht Schutz!",
    discord: "⛈️ Achtung! Ein Gewitter tobt über TrophyCity!",
    log: "Gewitterphase erkannt.",
    color: 0xcc0000
  },
  unbekannt: {
    id: "unbekannt",
    label: "§7Unbekannt",
    icon: "❓",
    chat: "🌤️ Unbekanntes Wetter erkannt...",
    discord: "🌤️ Das Wetter hat sich verändert – unbekannter Status.",
    log: "Unbekannte Wetteränderung festgestellt.",
    color: 0xaaaaaa
  }
};

function getWeatherState() {
  try {
    const dim = world.getDimension("overworld");
    const weather = dim.getWeather();
    switch (weather) {
      case "Clear": return "klar";
      case "Rain": return "regen";
      case "Thunder": return "gewitter";
      default: return "unbekannt";
    }
  } catch (e) {
    console.warn("[WeatherAnnouncer] Fehler beim Abrufen des Wetters:", e);
    return "unbekannt";
  }
}

function announceWeatherChange(newState) {
  const data = WEATHER_STATES[newState] ?? WEATHER_STATES.unbekannt;

  // Ingame Chat
  world.sendMessage(`§b[Wetter] §r${data.chat}`);

  // Actionbar für alle Spieler
  for (const player of world.getPlayers()) {
    try {
      player.onScreenDisplay.setActionBar(`${data.icon} Wetter: ${data.label}`);
    } catch (e) {
      console.warn(`[WeatherAnnouncer] Actionbar konnte für ${player.name} nicht gesetzt werden:`, e);
    }
  }

  // Konsole
  console.warn(`[WeatherAnnouncer] ${data.log}`);

  // Discord Logging mit Feedback
  if (bridgeDirect?.ready) {
    console.warn("[WeatherAnnouncer] DiscordDirect ist bereit. Sende Embed...");
    bridgeDirect.sendEmbed({
      title: `${data.icon} Wetteränderung: ${data.label.replace(/§[0-9a-fr]/g, '')}`,
      description: data.discord,
      color: data.color,
      timestamp: new Date().toISOString(),
      footer: { text: `TrophyWeather | Tick: ${system.currentTick}` }
    }, "WeatherAnnouncer");
  } else {
    console.warn("[WeatherAnnouncer] ⚠️ DiscordDirect nicht bereit – Embed nicht gesendet.");
  }
}

// Wettercheck alle 5 Sekunden (100 Ticks)
system.runInterval(() => {
  const current = getWeatherState();
  if (!current || typeof current !== "string") return;

  if (current !== lastWeather) {
    announceWeatherChange(current);
    lastWeather = current;
  }
}, 100);

// Testbefehl für Admins
bridge.bedrockCommands.registerAdminCommand("weathertest", (player) => {
  announceWeatherChange(getWeatherState());
  player.sendMessage("§aTest-Embed gesendet (falls Discord aktiv).");
}, "Testet die aktuelle Wetter-Discord-Meldung.");

// Debug: BridgeDirect Status
system.runTimeout(() => {
  console.warn(`[WeatherAnnouncer] BridgeDirect ready? ${bridgeDirect?.ready}`);
}, 40);

console.log("🌦️ WeatherAnnouncer Plugin – TrophyNetwork ULTRA FINAL EDITION gestartet mit dynamischer Wetterlogik, Actionbar, Konsole & Discord.");