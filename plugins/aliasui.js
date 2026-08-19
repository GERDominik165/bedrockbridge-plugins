import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { bridge, bridgeDirect } from "../addons";

// 🧼 Hilfsfunktion: Alias zurücksetzen
function resetAlias(player) {
  for (const tag of player.getTags()) {
    if (tag.startsWith("alias:")) player.removeTag(tag);
  }
  try {
    player.nameTag = player.name;
    player.runCommandAsync(`tag @s remove alias_${player.name}`);
  } catch {}
}

// 🔁 Alias Menü-Warteschlange
const aliasPending = new Map();

// 📤 Öffnet das Alias-Formular
function openAliasMenu(player) {
  const currentAliasTag = player.getTags().find(tag => tag.startsWith("alias:"));
  const currentAlias = currentAliasTag?.split(":")[1] || "";

  const form = new ModalFormData()
    .title("🎭 Alias-Menü")
    .textField("Welchen Spielernamen möchtest du vortäuschen?", "z. B. Notch", currentAlias)
    .toggle("Alias aktivieren", !!currentAliasTag)
    .toggle("Alias zurücksetzen und echten Namen nutzen", false);

  form.show(player).then(res => {
    aliasPending.delete(player.name);
    if (res.canceled) return;

    const aliasInput = res.formValues[0]?.trim();
    const aliasActive = res.formValues[1];
    const resetSelected = res.formValues[2];

    resetAlias(player);

    if (resetSelected) {
      player.sendMessage("§cAlias deaktiviert. Du verwendest nun wieder deinen echten Spielernamen.");
    } else if (aliasActive && aliasInput.length > 1) {
      player.addTag(`alias:${aliasInput}`);
      try {
        player.nameTag = aliasInput;
        player.runCommandAsync(`tag @s add alias_${aliasInput}`);
      } catch {}
      player.sendMessage(`§aAlias gesetzt: Du gibst dich als §b${aliasInput}§a aus.`);
    } else {
      player.sendMessage("§eAlias nicht gesetzt oder deaktiviert.");
    }
  }).catch(() => {
    aliasPending.delete(player.name);
    player.sendMessage("§cAlias-Menü konnte nicht geöffnet werden. Bitte versuche es erneut.");
  });
}

// 📦 Befehl: ?aliasui – mit Chat-Wartezeit
bridge.bedrockCommands.registerCommand("aliasui", (player) => {
  if (!player.hasTag("admin")) {
    player.sendMessage("§cKeine Berechtigung.");
    return;
  }

  if (aliasPending.has(player.name)) {
    player.sendMessage("§cAlias-Menü wird bereits geöffnet...");
    return;
  }

  player.sendMessage("§7Alias-Menü wird in wenigen Sekunden geöffnet...");
  aliasPending.set(player.name, true);

  let attempts = 0;
  const maxAttempts = 15;

  const tryOpen = system.runInterval(() => {
    if (!aliasPending.has(player.name)) return system.clearRun(tryOpen);
    if (attempts++ >= maxAttempts) {
      aliasPending.delete(player.name);
      player.sendMessage("§cAlias-Menü konnte nicht geöffnet werden. Bitte erneut versuchen.");
      return system.clearRun(tryOpen);
    }

    try {
      openAliasMenu(player);
      system.clearRun(tryOpen);
    } catch {}
  }, 20);
}, "Öffnet das Alias-Menü nach dem Chat.");

// 🔁 Befehl: ?aliasreset – Setzt den Alias zurück
bridge.bedrockCommands.registerCommand("aliasreset", (player) => {
  if (!player.hasTag("admin")) {
    player.sendMessage("§cKeine Berechtigung.");
    return;
  }
  resetAlias(player);
  player.sendMessage("§cAlias zurückgesetzt.");
}, "Entfernt deinen gesetzten Alias-Namen.");

// 🔍 Befehl: ?aliascurrent – Zeigt aktuellen Alias an
bridge.bedrockCommands.registerCommand("aliascurrent", (player) => {
  if (!player.hasTag("admin")) {
    player.sendMessage("§cKeine Berechtigung.");
    return;
  }
  const tag = player.getTags().find(t => t.startsWith("alias:"));
  if (tag) {
    const alias = tag.split(":")[1];
    player.sendMessage(`🎭 Dein aktueller Alias ist: §b${alias}`);
  } else {
    player.sendMessage("❌ Du hast keinen Alias gesetzt.");
  }
}, "Zeigt deinen aktuell gesetzten Alias an.");

// 🗨️ Alias-Chat-Override-System
world.beforeEvents.chatSend.subscribe(ev => {
  const aliasTag = ev.sender.getTags().find(tag => tag.startsWith("alias:"));
  if (aliasTag) {
    const alias = aliasTag.split(":")[1];
    ev.cancel = true;
    world.sendMessage(`§7<§b${alias}§7> §f${ev.message}`);
  }
});

console.warn("✅ AliasUI Plugin geladen, ChatOverride aktiviert und vollständig registriert.");
