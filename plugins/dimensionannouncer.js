// TrophyNetwork Dimension Announcer Plugin – BedrockBridge COMPLETE + DiscordDirect
// by poweroffapt
import { system, world } from "@minecraft/server";
import { bridge, bridgeDirect } from "../addons";

// Activate DiscordDirect if available
bridge.events.bridgeInitialize.subscribe(e => {
  e.registerAddition("discord_direct");
  console.warn("✅ DiscordDirect activated for Dimension Announcer");
});

const DIMENSION_NAMES = {
  "minecraft:overworld": { chat: "§aOverworld", plain: "Overworld" },
  "minecraft:nether": { chat: "§cNether", plain: "Nether" },
  "minecraft:the_end": { chat: "§5End", plain: "End" }
};

const DIMENSION_ICONS = {
  "minecraft:overworld": "🌍",
  "minecraft:nether": "🔥",
  "minecraft:the_end": "💫"
};

const playerDimensionMap = new Map();

function getDimensionLabel(id, plain = false) {
  return DIMENSION_NAMES[id]?.[plain ? "plain" : "chat"] || id;
}

function getDimensionIcon(id) {
  return DIMENSION_ICONS[id] || "📦";
}

function sendDiscordEmbed(playerName, fromId, toId, icon) {
  const fromName = getDimensionLabel(fromId, true);
  const toName = getDimensionLabel(toId, true);
  
  if (!bridgeDirect?.ready) return;
  
  bridgeDirect.sendEmbed({
    title: `${icon} Dimension Travel`,
    description: `**${playerName}** traveled from ${fromName} to ${toName}!`,
    color: 0x00ffff,
    timestamp: new Date().toISOString(),
    footer: { text: `Tick: ${system.currentTick}` }
  }, "Dimensions", `https://mc-heads.net/avatar/${playerName}`);
}

function sendAnnouncement(player, from, to) {
  const name = player.name;
  const fromChat = getDimensionLabel(from.id);
  const toChat = getDimensionLabel(to.id);
  const icon = getDimensionIcon(to.id);
  
  const chatMsg = `§e${name} traveled from ${fromChat} §eto ${toChat}!`;
  world.sendMessage(chatMsg);
  
  try {
    player.onScreenDisplay.setActionBar(`${icon} Switching to ${toChat} ...`);
  } catch (e) {}
  
  try {
    world.getDimension("overworld").runCommand(`playsound random.orb @a[name="${name}"]`);
  } catch (e) {}
  
  console.warn(`[DIMENSION] ${name} switched from ${from.id} to ${to.id}`);
  sendDiscordEmbed(name, from.id, to.id, icon);
}

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const current = player.dimension;
    const last = playerDimensionMap.get(player.name);
    
    if (!last) {
      playerDimensionMap.set(player.name, current);
      continue;
    }
    
    if (last.id !== current.id) {
      sendAnnouncement(player, last, current);
      playerDimensionMap.set(player.name, current);
    }
  }
}, 5);

world.afterEvents.playerLeave.subscribe(ev => {
  playerDimensionMap.delete(ev.playerName);
});

console.log("🌐 Dimension Announcer Plugin – TrophyNetwork Style FINAL + DiscordDirect activated!");