// 📸 Kamerapfade Plugin – TrophyNetwork CamPaths UI für Admins
import { world, system, Camera } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { bridge } from "../addons";

const cameraPaths = new Map(); // AdminName -> [ { x, y, z, dimension } ]
const camMenuPending = new Map();
const activeFlights = new Map(); // Für jeden Spieler aktueller Flugstatus

function openCameraMainMenu(player) {
  camMenuPending.delete(player.name);
  new ActionFormData()
    .title("📸 Kamerapfade Manager")
    .body("Verwalte Kamerapfade, Wegpunkte und Vorschau.")
    .button("➕ Neuen Pfad beginnen")
    .button("📍 Wegpunkt hinzufügen")
    .button("📜 Aktuellen Pfad anzeigen")
    .button("▶ Kamerapfad abspielen")
    .button("🔁 Zurück zum Start")
    .button("🛑 Flug stoppen")
    .button("🗑️ Pfad löschen")
    .show(player).then(res => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0: return startNewPath(player);
        case 1: return addWaypoint(player);
        case 2: return showPath(player);
        case 3: return chooseFlightSpeed(player);
        case 4: return returnToStart(player);
        case 5: return stopCameraFlight(player);
        case 6: return deletePath(player);
      }
    });
}

function startNewPath(player) {
  cameraPaths.set(player.name, []);
  player.sendMessage("§aNeuer Kamerapfad gestartet. Füge nun Wegpunkte hinzu.");
  openCameraMainMenu(player);
}

function addWaypoint(player) {
  if (!cameraPaths.has(player.name)) {
    player.sendMessage("§cKein Pfad aktiv. Bitte zuerst starten.");
    return openCameraMainMenu(player);
  }
  const loc = player.location;
  const dim = player.dimension.id;
  const waypoint = { x: loc.x, y: loc.y + 2, z: loc.z, dimension: dim };
  cameraPaths.get(player.name).push(waypoint);
  const index = cameraPaths.get(player.name).length;
  player.sendMessage(`§aWegpunkt §e#${index} §ahinzugefügt bei (§b${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)}§a).`);
  openCameraMainMenu(player);
}

function showPath(player) {
  const path = cameraPaths.get(player.name);
  if (!path || path.length === 0) {
    player.sendMessage("§eKein Pfad vorhanden.");
    return openCameraMainMenu(player);
  }
  const msg = path.map((p, i) => `§7${i + 1}. (§f${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}§7) – ${p.dimension}`).join("\n");
  new MessageFormData()
    .title("📜 Kamerapfad")
    .body(msg)
    .button1("Zurück")
    .show(player).then(() => openCameraMainMenu(player));
}

function chooseFlightSpeed(player) {
  new ModalFormData()
    .title("🎥 Kameraflug starten")
    .slider("Geschwindigkeit wählen (Sekunden pro Punkt)", 0.5, 5, 0.5, 1)
    .show(player).then(res => {
      if (res.canceled) return openCameraMainMenu(player);
      const seconds = res.formValues[0];
      playCameraPath(player, seconds);
    });
}

function playCameraPath(player, seconds = 1.5) {
  const path = cameraPaths.get(player.name);
  if (!path || path.length < 2) {
    player.sendMessage("§cMindestens zwei Wegpunkte erforderlich.");
    return openCameraMainMenu(player);
  }

  player.sendMessage("§bStarte Kameraflug...");
  try { player.camera.clear(); } catch {}
  player.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 1, holdTime: 0.5, fadeOutTime: 1 } });

  let index = 0;

  function step() {
    if (index >= path.length - 1) {
      activeFlights.delete(player.name);
      player.sendMessage("§aKameraflug abgeschlossen.");
      try { player.camera.clear(); } catch {}
      return openCameraMainMenu(player);
    }

    const current = path[index];
    const next = path[index + 1];

    if (player.dimension.id !== current.dimension) {
      player.sendMessage(`§cWegpunkt ${index + 1} ist in einer anderen Dimension.`);
      index++;
      return step();
    }

    try {
      player.camera.setCamera("minecraft:free", {
        location: current,
        facingLocation: next,
        easeOptions: {
          easeTime: seconds,
          easeType: "easeInOut"
        }
      });
    } catch {}

    index++;
    const timeoutId = system.runTimeout(step, seconds * 20);
    activeFlights.set(player.name, timeoutId);
  }

  step();
}

function stopCameraFlight(player) {
  const id = activeFlights.get(player.name);
  if (id !== undefined) {
    system.clearRun(id);
    activeFlights.delete(player.name);
    try { player.camera.clear(); } catch {}
    player.sendMessage("§cKameraflug gestoppt.");
  } else {
    player.sendMessage("§7Es läuft derzeit kein Flug.");
  }
  openCameraMainMenu(player);
}

function returnToStart(player) {
  const path = cameraPaths.get(player.name);
  if (path && path.length > 0) {
    const first = path[0];
    player.teleport(first, { dimension: world.getDimension(first.dimension) });
    player.sendMessage("§7Zurück zum Startpunkt teleportiert.");
  } else {
    player.sendMessage("§cKein Pfad verfügbar.");
  }
  openCameraMainMenu(player);
}

function deletePath(player) {
  cameraPaths.delete(player.name);
  player.sendMessage("§cPfad gelöscht.");
  openCameraMainMenu(player);
}

bridge.bedrockCommands.registerCommand("camsetup", (player) => {
  if (!player.hasTag("admin")) {
    player.sendMessage("§cKeine Berechtigung.");
    return;
  }
  if (camMenuPending.has(player.name)) {
    player.sendMessage("§7Menü wird bereits vorbereitet...");
    return;
  }
  camMenuPending.set(player.name, true);
  player.sendMessage("§7Öffne Kamerapfad-Menü in wenigen Sekunden...");
  let attempts = 0;
  const maxAttempts = 15;
  const waitForChat = system.runInterval(() => {
    if (!camMenuPending.has(player.name)) return system.clearRun(waitForChat);
    if (attempts++ >= maxAttempts) {
      camMenuPending.delete(player.name);
      player.sendMessage("§cMenü konnte nicht geöffnet werden. Bitte erneut versuchen.");
      return system.clearRun(waitForChat);
    }
    try {
      openCameraMainMenu(player);
      system.clearRun(waitForChat);
    } catch {}
  }, 20);
}, "Öffnet das Kamerapfad-Menü für Admins.");

console.warn("📸 CamPath Plugin geladen: Kameraflüge, Pfadbearbeitung und UI verfügbar.");
