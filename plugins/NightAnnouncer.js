// TrophyNetwork NightAnnouncer Plugin – TrophyBridge MONSTER WARNING ULTRA EDITION + UI + Sound + Uhr-Item + Settings
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect } from "../addons";

bridge.events.bridgeInitialize.subscribe(e => {
  e.registerAddition("discord_direct");
  console.warn("✅ DiscordDirect aktiviert für NightAnnouncer");
});

bridge.bedrockCommands.registerCommand("timetest", (player) => {
  if (!player.hasTag("admin")) return player.sendMessage("§cKeine Berechtigung für diesen Befehl.");
  const segment = getTimeSegment();
  if (!segment) return player.sendMessage("§cFehler beim Lesen der Zeit.");
  announceTimeChange(segment, true);
  player.sendMessage("§aTest-Zeitwarnung gesendet: " + segment.label);
}, "Sende eine Test-Warnung zur aktuellen Zeitphase (nur Admin)");

bridge.bedrockCommands.registerCommand("timesettings", (player) => {
  if (!player.hasTag("admin")) return player.sendMessage("§cDu hast keine Berechtigung.");

  const form = new ActionFormData()
    .title("⚙ Zeitwarnung-Einstellungen")
    .body("Hier kannst du die Einstellungen für das Zeitwarnsystem anpassen.")
    .button("🔁 Test-Zeitwarnung senden")
    .button("📊 Aktuelle Zeit anzeigen")
    .button("❌ Menü schließen");

  showFormSafe(form, player, (res) => {
    const current = getTimeSegment();
    if (!current) return player.sendMessage("§cFehler beim Lesen der Zeit.");

    switch (res.selection) {
      case 0:
        announceTimeChange(current, true);
        player.sendMessage("§aTest-Zeitwarnung erneut gesendet.");
        break;
      case 1:
        player.sendMessage(`§eAktuelle Zeitphase: ${current.icon} ${current.label}`);
        break;
    }
  });
}, "Öffne das Einstellungsmenü für Zeitwarnungen (nur Admin)");

let lastTimeSegment = "";
const TIME_INTERVAL = 80;

const TIME_SEGMENTS = [
  { id: "sunrise", range: [23000, 23999], icon: "🌅", label: "§6Sonnenaufgang", chat: "🌅 Ein neuer Tag bricht an! Die Monster verschwinden.", discord: "🌅 Die Sonne geht auf – ein neuer Tag beginnt.", log: "Sonnenaufgang erkannt.", color: 0xffcc66, sound: "random.toast" },
  { id: "day", range: [0, 11999], icon: "☀️", label: "§eTag", chat: "☀️ Guten Morgen, die Sonne geht auf!", discord: "☀️ Die **Sonne** geht auf. Monster verschwinden bald!", log: "Tagphase gestartet. Licht durchdringt die Dunkelheit.", color: 0xffff66, sound: "random.levelup" },
  { id: "sunset", range: [12000, 12999], icon: "🌇", label: "§6Sonnenuntergang", chat: "🌇 Die Sonne geht unter. Die Dunkelheit nähert sich...", discord: "🌇 Sonnenuntergang – bereitet euch auf die Nacht vor.", log: "Sonnenuntergang beginnt.", color: 0xff9900, sound: "note.pling" },
  { id: "night", range: [13000, 17999], icon: "🌃", label: "§8Nacht", chat: "🌃 Die Nacht bricht herein. Monster erscheinen bald!", discord: "🌃 Die **Nacht** beginnt. Monster kommen hervor...", log: "Nachtphase gestartet. Monster erscheinen.", color: 0x333366, sound: "ambient.cave" },
  { id: "midnight", range: [18000, 22999], icon: "🌌", label: "§5Mitternacht", chat: "🌌 Es ist Mitternacht... Die Nacht ist am dunkelsten!", discord: "🌌 Mitternacht! Dunkelheit herrscht.", log: "Mitternacht erkannt.", color: 0x663399, sound: "mob.endermen.stare" }
];

function getTimeSegment() {
  try {
    const time = world.getTimeOfDay();
    for (const segment of TIME_SEGMENTS) {
      const [start, end] = segment.range;
      if (start <= time && time <= end) return segment;
    }
  } catch (e) {
    console.warn("[NightAnnouncer] Fehler beim Lesen der Tageszeit:", e);
  }
  return null;
}

function announceTimeChange(segment, isManual = false) {
  if (!segment) return;

  world.sendMessage(`§b[Zeit] §r${segment.chat}`);

  for (const player of world.getPlayers()) {
    try {
      player.onScreenDisplay.setActionBar(`${segment.icon} Zeitphase: ${segment.label}`);
    } catch {}
  }

  try {
    world.getDimension("overworld").runCommand(`playsound ${segment.sound} @a`);
  } catch {}

  console.warn(`[NightAnnouncer] ${segment.log}${isManual ? " (manuell)" : ""}`);

  if (bridgeDirect?.ready) {
    bridgeDirect.sendEmbed({
      title: `${segment.icon} Zeitwechsel: ${segment.label.replace(/§[0-9a-fr]/g, '')}`,
      description: segment.discord,
      color: segment.color,
      timestamp: new Date().toISOString(),
      footer: { text: `TrophyTime | Tick: ${system.currentTick}` }
    }, "NightAnnouncer");
  } else {
    console.warn("[NightAnnouncer] DiscordDirect nicht bereit.");
  }
}

function showFormSafe(form, player, onSuccess) {
  try {
    form.show(player).then(res => {
      if (!res.canceled) onSuccess(res);
    });
  } catch (e) {
    player.sendMessage("§c[UI] Nicht verfügbar. Aktiviere die UI-API oder prüfe deine Rechte.");
    console.warn(`[NightAnnouncer] UI-Fehler bei ${player.name}:`, e);
  }
}

system.runInterval(() => {
  const segment = getTimeSegment();
  if (!segment || segment.id === lastTimeSegment) return;
  announceTimeChange(segment);
  lastTimeSegment = segment.id;
}, TIME_INTERVAL);

// Uhr-Item öffnet das Zeit-Menü (nur mit Admin-Tag)
world.beforeEvents.itemUse.subscribe(ev => {
  if (ev.itemStack?.typeId !== "minecraft:clock") return;
  const player = ev.source;
  if (!player.hasTag("admin")) return;

  const currentSegment = getTimeSegment();
  if (!currentSegment) return;

  const form = new ActionFormData()
    .title("🕰️ Zeitinfo – TrophyTime")
    .body(`Aktuelle Zeitphase:\n${currentSegment.icon} ${currentSegment.label}`)
    .button("🔁 Zeitwarnung erneut senden")
    .button("⚙ Einstellungen öffnen")
    .button("❌ Schließen");

  showFormSafe(form, player, (res) => {
    if (res.selection === 0) {
      announceTimeChange(currentSegment, true);
      player.sendMessage("§aZeitwarnung erneut gesendet.");
    } else if (res.selection === 1) {
      system.runTimeout(() => bridge.bedrockCommands.execute(player, "?timesettings"), 1);
    }
  });
});

console.log("🕰️ NightAnnouncer Plugin geladen – mit Discord, Actionbar, Sound, UI-Uhr, Menü und Monsterwarnung.");
