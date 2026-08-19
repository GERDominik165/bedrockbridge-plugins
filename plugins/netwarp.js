/*
 * TrophyNetwork – Coordinate Converter Plugin (Nether ↔ Overworld)
 * by TrophyNetwork + MyNameIsDIG
 * Universal calculation for any coordinates (8:1 ratio)
 */

import { world } from "@minecraft/server";
import { bridge } from "../addons";

// Plugin registrieren
bridge.events.bridgeInitialize.subscribe(e => {
  e.registerAddition("coordinate_converter");
});

// ?netwarp – exakte Umrechnung
bridge.bedrockCommands.registerCommand("netwarp", (player, args) => {
  if (args.length !== 3) {
    player.sendMessage("§6Usage: §e?netwarp <x> <y> <z>");
    return;
  }

  const [xRaw, yRaw, zRaw] = args;
  const x = Number(xRaw);
  const y = Number(yRaw);
  const z = Number(zRaw);

  if ([x, y, z].some(n => isNaN(n))) {
    player.sendMessage("§cInvalid input. Please enter valid numbers.");
    return;
  }

  const dimId = player.dimension.id;

  let xConverted, zConverted, target;

  if (dimId === "minecraft:overworld") {
    xConverted = x / 8;
    zConverted = z / 8;
    target = "Nether";
  } else if (dimId === "minecraft:nether") {
    xConverted = x * 8;
    zConverted = z * 8;
    target = "Overworld";
  } else {
    player.sendMessage("§cThis command only works in the Overworld or Nether.");
    return;
  }

  // Ausgabe mit 3 Nachkommastellen
  player.sendMessage("§b📍 Coordinate Converter");
  player.sendMessage(`§7From: §f${dimId.replace("minecraft:", "")} ➜ §a${target}`);
  player.sendMessage(`§cX: ${xConverted.toFixed(3)}, Y: ${y.toFixed(3)}, Z: ${zConverted.toFixed(3)}`);
}, "Convert coordinates between Overworld and Nether (exact 8:1 ratio).");

// -netherify – legacy mit floor logic
world.beforeEvents.chatSend.subscribe((chat) => {
  const { sender, message } = chat;

  if (!message.startsWith("-")) return;

  const parts = message.trim().toLowerCase().slice(1).split(" ").filter(Boolean);

  if (parts[0] === "netherify") {
    chat.cancel = true;

    if (parts.length !== 4) {
      sender.sendMessage("DIG's Netherify:\n§bUsage: -netherify <x> <y> <z>");
      return;
    }

    const x = Number(parts[1]);
    const y = Number(parts[2]);
    const z = Number(parts[3]);

    if ([x, y, z].some(n => isNaN(n))) {
      sender.sendMessage("§cInvalid input. Please enter valid numbers.");
      return;
    }

    const xOut = Math.floor(x / 8);
    const zOut = Math.floor(z / 8);

    sender.sendMessage(`§cNether Coordinates: ${xOut}, ${y}, ${zOut}`);
  }
});

// ✅ Log
console.warn("✅ TrophyNetwork Plugin 'coordinate_converter' loaded and working.");
