// TrophyNetwork RealTimeClock Plugin – TrophyBridge REALSYNC PREMIUM EDITION
import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect } from "../addons";

let realtimeEnabled = true;
let realtimeVisibleForAdminsOnly = true;
let realtimeWorldSync = false;
let timezoneOffset = 0; // Minuten – z. B. 60 = GMT+1

const timezones = [
  { label: "GMT -12:00 – Baker Island / Howland", offset: -720 },
  { label: "GMT -11:00 – American Samoa / Niue", offset: -660 },
  { label: "GMT -10:00 – Hawaii / Cook Islands", offset: -600 },
  { label: "GMT -9:30 – Marquesas Islands", offset: -570 },
  { label: "GMT -9:00 – Alaska / Gambier Islands", offset: -540 },
  { label: "GMT -8:00 – Pacific Time (US/Canada)", offset: -480 },
  { label: "GMT -7:00 – Mountain Time (US/Canada)", offset: -420 },
  { label: "GMT -6:00 – Central Time (US/Canada/Mexico)", offset: -360 },
  { label: "GMT -5:00 – Eastern Time (US/Canada)", offset: -300 },
  { label: "GMT -4:00 – Atlantic Time / Caribbean", offset: -240 },
  { label: "GMT -3:30 – Newfoundland", offset: -210 },
  { label: "GMT -3:00 – Argentina / Brazil / Uruguay", offset: -180 },
  { label: "GMT -2:00 – South Georgia / Noronha", offset: -120 },
  { label: "GMT -1:00 – Azores / Cape Verde", offset: -60 },
  { label: "GMT ±0:00 – Greenwich / UK / Portugal", offset: 0 },
  { label: "GMT +1:00 – Central Europe (Berlin/Amsterdam/Rom/Paris)", offset: 60 },
  { label: "GMT +2:00 – Eastern Europe / SAST", offset: 120 },
  { label: "GMT +3:00 – Moscow / EAT / Arabia", offset: 180 },
  { label: "GMT +3:30 – Iran Standard Time", offset: 210 },
  { label: "GMT +4:00 – UAE / Armenia / Seychelles", offset: 240 },
  { label: "GMT +4:30 – Afghanistan Time", offset: 270 },
  { label: "GMT +5:00 – Pakistan / Maldives", offset: 300 },
  { label: "GMT +5:30 – India / Sri Lanka", offset: 330 },
  { label: "GMT +5:45 – Nepal Time", offset: 345 },
  { label: "GMT +6:00 – Bangladesh / Bhutan", offset: 360 },
  { label: "GMT +6:30 – Myanmar / Cocos Islands", offset: 390 },
  { label: "GMT +7:00 – Indochina / Krasnoyarsk", offset: 420 },
  { label: "GMT +8:00 – China / Perth / Singapore", offset: 480 },
  { label: "GMT +8:45 – Eucla (Australia)", offset: 525 },
  { label: "GMT +9:00 – Japan / Korea / Palau", offset: 540 },
  { label: "GMT +9:30 – Central Australia", offset: 570 },
  { label: "GMT +10:00 – Eastern Australia / Vladivostok", offset: 600 },
  { label: "GMT +10:30 – Lord Howe Island", offset: 630 },
  { label: "GMT +11:00 – Solomon / Vanuatu / Magadan", offset: 660 },
  { label: "GMT +12:00 – New Zealand / Fiji / Tuvalu", offset: 720 },
  { label: "GMT +12:45 – Chatham Islands", offset: 765 },
  { label: "GMT +13:00 – Tonga / Phoenix Islands", offset: 780 },
  { label: "GMT +14:00 – Line Islands", offset: 840 },
];

bridge.events.bridgeInitialize.subscribe(e => {
  console.warn("✅ RealTimeClock Plugin initialisiert (PREMIUM EDITION)");
});

bridge.bedrockCommands.registerCommand("realtime", (player) => {
  const now = getAdjustedDate();
  const formatted = formatTime(now);
  player.sendMessage(`§b🕒 Aktuelle Realzeit (GMT${formatTimezoneOffset()}): §f${formatted}`);
}, "Zeigt die aktuelle Realzeit an.");

bridge.bedrockCommands.registerCommand("realtimeui", (player) => {
  if (!player.hasTag("admin")) return player.sendMessage("§cKeine Berechtigung.");
  system.runTimeout(() => openMainMenu(player), 20);
}, "Öffne das Echtzeit-Einstellungsmenü (nur Admin)");

function openMainMenu(player) {
  const now = getAdjustedDate();
  const formatted = formatTime(now);

  const form = new ActionFormData()
    .title("🕒 RealTimeClock Einstellungen")
    .body("§7Verwalte die Echtzeitanzeige, Weltzeitsynchronisation und Zeitzone.")
    .button(`${realtimeEnabled ? "§a✔" : "§c✖"} Echtzeit-Overlay: ${realtimeEnabled ? "Aktiv" : "Deaktiviert"}`)
    .button(`${realtimeWorldSync ? "§a✔" : "§c✖"} Weltzeit-Sync: ${realtimeWorldSync ? "Aktiv" : "Deaktiviert"}`)
    .button(`${realtimeVisibleForAdminsOnly ? "§e👤" : "§b🌐"} Sichtbarkeit: ${realtimeVisibleForAdminsOnly ? "Nur Admins" : "Alle Spieler"}`)
    .button(`🌍 Zeitzone auswählen (aktuell GMT${formatTimezoneOffset()})`)
    .button(`🔁 Aktuelle Realzeit anzeigen: ${formatted}`)
    .button("🔧 Erweiterte Einstellungen")
    .button("📤 Zeit-Log an Konsole senden")
    .button("❌ Menü schließen");

  showFormSafe(form, player, (res) => {
    if (res.canceled) return;
    switch (res.selection) {
      case 0:
        realtimeEnabled = !realtimeEnabled;
        player.sendMessage(`§bEchtzeit-Overlay ${realtimeEnabled ? "aktiviert" : "deaktiviert"}`);
        break;
      case 1:
        realtimeWorldSync = !realtimeWorldSync;
        player.sendMessage(`§bWeltzeitsync ${realtimeWorldSync ? "aktiviert" : "deaktiviert"}`);
        break;
      case 2:
        realtimeVisibleForAdminsOnly = !realtimeVisibleForAdminsOnly;
        player.sendMessage(`§bSichtbarkeit geändert zu: ${realtimeVisibleForAdminsOnly ? "Nur Admins" : "Alle Spieler"}`);
        break;
      case 3:
        return openTimezoneListMenu(player);
      case 4:
        player.sendMessage(`§3🕒 Aktuelle Realzeit: §f${formatted}`);
        break;
      case 5:
        return openAdvancedSettingsMenu(player);
      case 6:
        console.log(`[RealTimeClock] Uhrzeit-Log: ${now.toISOString()} | Weltzeit: ${world.getTimeOfDay()}`);
        player.sendMessage("§aZeitinformationen wurden in die Konsole geschrieben.");
        break;
    }
    system.runTimeout(() => openMainMenu(player), 2);
  });
}

function openTimezoneListMenu(player) {
  const form = new ModalFormData()
    .title("🌍 Zeitzone wählen")
    .dropdown("Wähle eine Zeitzone:", timezones.map(tz => tz.label), timezones.findIndex(tz => tz.offset === timezoneOffset));

  showFormSafe(form, player, (res) => {
    if (res.canceled) return openMainMenu(player);
    const selected = timezones[res.formValues[0]];
    timezoneOffset = selected.offset;
    player.sendMessage(`§aZeitzone geändert zu ${selected.label}`);
    system.runTimeout(() => openMainMenu(player), 2);
  });
}

function openAdvancedSettingsMenu(player) {
  const form = new ActionFormData()
    .title("🔧 Erweiterte Einstellungen")
    .body("Weitere geplante Premium-Funktionen:")
    .button("📘 Hilfe & Anleitung (bald)")
    .button("🛰 Discord-Benachrichtigung (bald)")
    .button("⬅ Zurück");
  showFormSafe(form, player, (res) => {
    if (res.selection === 2 || res.canceled) return openMainMenu(player);
    player.sendMessage("§7Diese Funktion ist noch in Entwicklung.");
    system.runTimeout(() => openAdvancedSettingsMenu(player), 2);
  });
}

function formatTimezoneOffset() {
  const h = Math.floor(timezoneOffset / 60);
  const m = Math.abs(timezoneOffset % 60);
  return `${h >= 0 ? "+" : ""}${h}${m !== 0 ? ":" + String(m).padStart(2, "0") : ""}`;
}

function getAdjustedDate() {
  const now = new Date();
  return new Date(now.getTime() + timezoneOffset * 60000);
}

function formatTime(date) {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function showFormSafe(form, player, onSuccess) {
  try {
    form.show(player).then(res => {
      if (!res.canceled) onSuccess(res);
    });
  } catch (e) {
    player.sendMessage("§c[UI] Nicht verfügbar. Aktiviere die UI-API oder prüfe deine Rechte.");
    console.warn(`[RealTimeClock] UI-Fehler bei ${player.name}:`, e);
  }
}

system.runInterval(() => {
  if (!realtimeEnabled) return;
  const now = getAdjustedDate();
  const formatted = formatTime(now);
  for (const player of world.getPlayers()) {
    if (realtimeVisibleForAdminsOnly && !player.hasTag("admin")) continue;
    try {
      player.onScreenDisplay.setActionBar(`§3🕒 Realzeit (GMT${formatTimezoneOffset()}): ${formatted}`);
    } catch {}
  }
}, 20);

system.runInterval(() => {
  if (!realtimeWorldSync) return;
  const now = getAdjustedDate();
  const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const mcTime = Math.floor((totalSeconds / 86400) * 24000);
  try {
    world.setTimeOfDay(mcTime);
    console.log(`[RealTimeClock] Weltzeit gesetzt: ${mcTime} (Real ${now.toISOString()})`);
  } catch (e) {
    console.warn("[RealTimeClock] Fehler beim Setzen der Weltzeit:", e);
  }
}, 40);

console.log("🕒 RealTimeClock Plugin geladen – Echtzeit-Overlay, UI, Weltzeit-Sync, Zeitzone, Logging & Premium-Einstellungen.");
