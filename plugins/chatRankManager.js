// TrophyNetwork ChatRank Manager UI – Ultra Deluxe Ultimate Edition with Full Rank Editor
import { world, system } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect } from "../addons";
import { settings } from "./chatRank/settings";
import { colors } from "./chatRank/data/colors";

let RANKS = Object.keys(settings.roles);

function openMainMenu(admin) {
  new ActionFormData()
    .title("§l§9🔧 ChatRank Manager")
    .body("§7Verwalte alle Ränge auf dem Server")
    .button("§a🔰 Rang zuweisen")
    .button("§b🔍 Rang eines Spielers anzeigen")
    .button("§c❌ Rang entfernen")
    .button("§e📜 Liste aller Ränge")
    .button("§d⚙ Neuen Rang erstellen")
    .button("§6🛠 Rang bearbeiten / löschen")
    .show(admin).then(res => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0: openRankMenu(admin); break;
        case 1: showRank(admin); break;
        case 2: openRemoveMenu(admin); break;
        case 3: listRanks(admin); break;
        case 4: openCreateRankUI(admin); break;
        case 5: openEditRankUI(admin); break;
      }
    });
}

function openRankMenu(admin) {
  const form = new ActionFormData()
    .title("§a🔰 Rang zuweisen")
    .body("Wähle einen Rang zum Zuweisen aus:");

  RANKS.forEach(rank => form.button(`${colors[settings.roles[rank]]}§l${rank}`));

  form.show(admin).then(res => {
    if (res.canceled) return;
    const selectedRank = RANKS[res.selection];
    selectPlayerMenu(admin, selectedRank);
  });
}

function selectPlayerMenu(admin, rank) {
  const players = world.getPlayers();
  const form = new ActionFormData()
    .title(`👑 ${rank} vergeben`)
    .body("Wähle den Spieler:");

  players.forEach(p => form.button(p.name));

  form.show(admin).then(res => {
    if (res.canceled) return;
    const target = players[res.selection];
    assignRank(admin, target, rank);
  });
}

function assignRank(admin, player, rank) {
  const roleColor = colors[settings.roles[rank]] ?? "§f";
  system.run(() => {
    player.getTags().forEach(tag => { if (tag.startsWith("rank:")) player.removeTag(tag); });
    player.addTag(`rank:${rank}`);
    player.sendMessage(`§a✔ Dein Rang wurde auf ${roleColor}${rank}§r gesetzt!`);
    admin.sendMessage(`§6✔ ${player.name} hat jetzt den Rang ${roleColor}${rank}`);
    world.sendMessage(`§e📢 ${admin.name} hat §r${player.name} zum ${roleColor}${rank}§r gemacht!`);
    if (bridgeDirect.ready) {
      bridgeDirect.sendEmbed({
        title: "🔰 Rang zugewiesen",
        description: `**${player.name}** ist jetzt ${rank}`,
        color: 0x00ffff,
        timestamp: new Date().toISOString(),
        footer: { text: `Von ${admin.name}` }
      }, "ChatRank Manager", `https://mc-heads.net/avatar/${player.name}`);
    }
  });
}

function openRemoveMenu(admin) {
  const players = world.getPlayers();
  const form = new ActionFormData()
    .title("§c❌ Rang entfernen")
    .body("Wähle den Spieler:");

  players.forEach(p => form.button(p.name));

  form.show(admin).then(res => {
    if (res.canceled) return;
    const target = players[res.selection];
    removeRank(admin, target);
  });
}

function removeRank(admin, player) {
  player.getTags().forEach(tag => { if (tag.startsWith("rank:")) player.removeTag(tag); });
  player.sendMessage("§c⚠ Dein Rang wurde entfernt.");
  admin.sendMessage(`§e⚠ ${player.name} hat nun keinen Rang mehr.`);
  world.sendMessage(`§7📢 ${admin.name} hat ${player.name} den Rang entfernt.`);
  if (bridgeDirect.ready) {
    bridgeDirect.sendEmbed({
      title: "❌ Rang entfernt",
      description: `**${player.name}** hat keinen Rang mehr.`,
      color: 0xff0000,
      timestamp: new Date().toISOString(),
      footer: { text: `Von ${admin.name}` }
    }, "ChatRank Manager", `https://mc-heads.net/avatar/${player.name}`);
  }
}

function showRank(admin) {
  const players = world.getPlayers();
  const form = new ActionFormData()
    .title("§b🔍 Rang anzeigen")
    .body("Wähle den Spieler:");

  players.forEach(p => form.button(p.name));

  form.show(admin).then(res => {
    if (res.canceled) return;
    const target = players[res.selection];
    const rankTag = target.getTags().find(tag => tag.startsWith("rank:"));
    const rank = rankTag ? rankTag.slice(5) : "§7Kein Rang";
    new MessageFormData()
      .title("📛 Aktueller Rang")
      .body(`§r${target.name} hat den Rang: ${rank}`)
      .button1("OK")
      .show(admin);
  });
}

function listRanks(admin) {
  const text = RANKS.map(r => `${colors[settings.roles[r]]}§l${r}`).join("\n§r");
  new MessageFormData()
    .title("📜 Alle verfügbaren Ränge")
    .body(text)
    .button1("OK")
    .show(admin);
}

function openCreateRankUI(admin) {
  const form = new ModalFormData()
    .title("§d⚙ Neuen Rang erstellen")
    .textField("§bName des Rangs", "z. B. Elite", "")
    .textField("§aFarbcode (z. B. red, green, gold)", "", "");

  form.show(admin).then(res => {
    if (res.canceled) return;
    const [name, color] = res.formValues;
    if (!name || !color || !(color in colors)) {
      admin.sendMessage("§cUngültige Eingabe oder unbekannte Farbe.");
      return;
    }
    if (RANKS.includes(name)) {
      admin.sendMessage("§cEin Rang mit diesem Namen existiert bereits.");
      return;
    }
    settings.roles[name] = color;
    RANKS.push(name);
    admin.sendMessage(`§a✔ Rang '${name}' in Farbe ${color} wurde hinzugefügt.`);
    listRanks(admin);
  });
}

function openEditRankUI(admin) {
  const form = new ActionFormData()
    .title("§6🛠 Ränge bearbeiten oder löschen")
    .body("Wähle einen Rang aus:");

  RANKS.forEach(r => form.button(`${colors[settings.roles[r]]}${r}`));

  form.show(admin).then(res => {
    if (res.canceled) return;
    const rank = RANKS[res.selection];
    const editForm = new ModalFormData()
      .title(`🛠 Bearbeite Rang: ${rank}`)
      .textField("Neuer Name", "Lasse leer um Namen zu behalten", rank)
      .textField("Neue Farbe", "red, green, gold, etc.", settings.roles[rank])
      .toggle("❌ Diesen Rang löschen", false);

    editForm.show(admin).then(editRes => {
      if (editRes.canceled) return;
      const [newName, newColor, deleteFlag] = editRes.formValues;
      if (deleteFlag) {
        delete settings.roles[rank];
        RANKS = RANKS.filter(r => r !== rank);
        admin.sendMessage(`§c✔ Rang '${rank}' wurde gelöscht.`);
        return;
      }
      if (!(newColor in colors)) {
        admin.sendMessage("§cUngültige Farbe.");
        return;
      }
      const updatedName = newName && newName !== rank ? newName : rank;
      if (updatedName !== rank && RANKS.includes(updatedName)) {
        admin.sendMessage("§cEin Rang mit diesem Namen existiert bereits.");
        return;
      }
      if (updatedName !== rank) {
        settings.roles[updatedName] = newColor;
        delete settings.roles[rank];
        RANKS = RANKS.map(r => r === rank ? updatedName : r);
      } else {
        settings.roles[rank] = newColor;
      }
      admin.sendMessage(`§a✔ Rang '${rank}' wurde aktualisiert.`);
    });
  });
}

bridge.bedrockCommands.registerTagCommand("ranks", settings.admin_tag, (player) => {
  openMainMenu(player);
}, "Öffne das vollständige ChatRank Menü für Admins mit dem Tag");

bridge.bedrockCommands.registerCommand("rankmenu", (player) => {
  if (!player.hasTag(settings.admin_tag)) {
    player.sendMessage("§cDu hast keine Berechtigung, dieses Menü zu öffnen.");
    return;
  }
  player.sendMessage("§7[§bTrophy§fNetwork§7] §fÖffne Rang-Menü...");
  system.runTimeout(() => openMainMenu(player), 20);
}, "Öffne das ChatRank Menü (nur mit Tag)");

world.beforeEvents.itemUse.subscribe(ev => {
  if (ev.itemStack?.typeId === "minecraft:name_tag") {
    const player = ev.source;
    if (player?.hasTag(settings.admin_tag)) {
      system.run(() => openMainMenu(player));
    }
  }
});

console.log("📊 ChatRank Manager UI – Ultra Deluxe Ultimate Edition geladen mit Farben, Discord, Editor und dynamischen Rängen");

// --- In das zentrale BridgeHub registrieren (permission-gefiltert) ---
import { hub as _bridgeHub } from "./hubAPI.js";
try {
  _bridgeHub.register({ id: "ranks", title: "🎖️ Ränge", icon: "textures/items/name_tag", category: "Verwaltung", order: 10, permission: settings.admin_tag, handler: p => openMainMenu(p) });
  console.warn("[chatRankManager] im Hub registriert");
} catch (e) { console.warn("[chatRankManager] hub-reg Fehler: " + e); }
