/**
 * griefalert.js – TrophyNetwork Ultra Edition (ultra complete with extended protection)
 * For Minecraft Bedrock 1.21.70+ using Script API v2
 * Detects TNT, lava, fire, TNT Minecart, explosions, damage, suspicious items, and griefing attempts
 */

import { world, system } from "@minecraft/server";
import { bridgeDirect } from "../addons";

const griefBlocks = new Set([
  "minecraft:tnt",
  "minecraft:tnt_minecart",
  "minecraft:lava",
  "minecraft:lava_bucket",
  "minecraft:fire",
  "minecraft:flint_and_steel",
  "minecraft:campfire",
  "minecraft:lit_furnace",
]);

const griefItems = new Set([
  "minecraft:flint_and_steel",
  "minecraft:fire_charge",
  "minecraft:lava_bucket",
]);

const griefDamage = new Set(["explosion", "fire", "lava"]);

const alertCooldowns = new Map();
function isOnCooldown(playerName, key, delay = 3000) {
  const now = Date.now();
  const id = `${playerName}:${key}`;
  if (alertCooldowns.has(id) && now - alertCooldowns.get(id) < delay) return true;
  alertCooldowns.set(id, now);
  return false;
}

function sendGriefAlert({ player, location, dimension, reason, blockType = null }) {
  const name = player?.name ?? "Unknown";
  if (isOnCooldown(name, reason)) return;

  const pos = `X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)}`;
  const dim = dimension?.id?.replace("minecraft:", "").toUpperCase() ?? "UNKNOWN";
  const message = `§c⚠ [GriefAlert] §f${name} triggered potential grief! Reason: §e${reason}\n§7Location: ${pos} | Dimension: ${dim}`;

  for (const p of world.getAllPlayers()) {
    if (p.hasTag("admin") || p.hasTag("moderator")) {
      p.sendMessage(message);
    }
  }

  try {
    bridgeDirect.sendEmbed({
      title: `⚠️ GriefAlert: ${reason}`,
      description: `**Player:** ${name}\n**Reason:** ${reason}\n**Location:** ${pos}\n**Dimension:** ${dim}${blockType ? `\n**Block/Item:** ${blockType}` : ""}`,
      color: 0xff0000,
      timestamp: new Date().toISOString(),
      author: { name, icon_url: `https://mc-heads.net/avatar/${name}` },
      footer: { text: "TrophyNetwork Grief Detection" },
    }, "GriefAlert", `https://mc-heads.net/avatar/${name}`);
  } catch (err) {
    console.error("[GriefAlert] Discord embed error:", err);
  }

  console.warn(`[GRIEF] ${message}`);
}

function safeSubscribe(eventRef, handler) {
  try {
    if (eventRef && typeof eventRef.subscribe === "function") {
      eventRef.subscribe(handler);
    } else {
      console.warn("[GriefAlert] Event not available:", eventRef);
    }
  } catch (err) {
    console.error("[GriefAlert] Subscription error:", err);
  }
}

function getClosestPlayer(location) {
  let closest = null;
  let distance = Infinity;
  for (const p of world.getPlayers()) {
    const dx = p.location.x - location.x;
    const dy = p.location.y - location.y;
    const dz = p.location.z - location.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < distance) {
      distance = d;
      closest = p;
    }
  }
  return closest;
}

function isInSafeZone(location) {
  return false; // implement your region logic here (e.g., coordinate checks)
}

// Block placement
safeSubscribe(world.afterEvents.playerPlaceBlock, ({ player, block }) => {
  if (isInSafeZone(block.location)) return;
  if (griefBlocks.has(block.typeId)) {
    const reason = block.typeId.includes("lava") ? "Lava Placement" : block.typeId.includes("fire") ? "Fire Placement" : "Suspicious Block Placement";
    sendGriefAlert({ player, location: block.location, dimension: block.dimension, reason, blockType: block.typeId });

    if (block.typeId === "minecraft:tnt") {
      system.runTimeout(() => {
        for (const ent of block.dimension.getEntities({ type: "minecraft:primed_tnt" })) {
          if (!ent.getTags().some(t => t.startsWith("placed_by:"))) {
            ent.addTag(`placed_by:${player.name}`);
          }
        }
      }, 1);
    }
  }
});

// Item usage
safeSubscribe(world.afterEvents.playerInteractWithBlock, ({ player, block, itemStack }) => {
  if (!itemStack || !block || isInSafeZone(block.location)) return;
  const itemId = itemStack.typeId;

  if (griefItems.has(itemId)) {
    const reason = itemId.includes("lava") ? "Player Used Lava Bucket" : itemId.includes("fire") ? "Player Ignited Fire" : "Player Used Ignition Item";
    sendGriefAlert({ player, location: block.location, dimension: block.dimension, reason, blockType: itemId });
  }
});

// TNT Minecart spawn
safeSubscribe(world.afterEvents.entitySpawn, ({ entity }) => {
  if (entity?.typeId === "minecraft:tnt_minecart") {
    const tags = entity.getTags();
    const playerTag = tags.find(t => t.startsWith("placed_by:"));
    const playerName = playerTag?.split(":"[1]);
    sendGriefAlert({ player: { name: playerName ?? "Unknown" }, location: entity.location, dimension: entity.dimension, reason: "TNT Minecart Spawned", blockType: "minecraft:tnt_minecart" });
  }
});

// Explosion
safeSubscribe(world.afterEvents.explosion, ({ source, dimension, impactedBlocks }) => {
  for (const block of impactedBlocks ?? []) {
    let player = source?.typeId?.startsWith("minecraft:player") ? source : getClosestPlayer(block.location);
    sendGriefAlert({ player: player ?? { name: "Unknown" }, location: block.location, dimension, reason: "Explosion Occurred", blockType: block.typeId });
  }
});

// Entity hurt
safeSubscribe(world.afterEvents.entityHurt, ({ damageSource, hurtEntity }) => {
  const cause = damageSource?.cause;
  if (griefDamage.has(cause)) {
    const player = damageSource.damagingEntity ?? getClosestPlayer(hurtEntity.location);
    const isProtected = ["villager", "animal", "iron_golem", "wandering_trader"].some(type => hurtEntity.typeId.includes(type));
    sendGriefAlert({ player: player ?? { name: "Environment" }, location: hurtEntity.location, dimension: hurtEntity.dimension, reason: isProtected ? `Protected Entity Attacked (${cause})` : `Entity Damaged by ${cause}` });
  }
});

// Suspicious item inventory scan on join
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => { if(!player || !player.id) return; if(!initialSpawn) return;
  const inv = player?.getComponent?.("inventory")?.container;
  if (!inv) return;
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (item && griefItems.has(item.typeId)) {
      sendGriefAlert({ player, location: player.location, dimension: player.dimension, reason: `Joined with Suspicious Item`, blockType: item.typeId });
    }
  }
});

console.warn("✅ griefalert.js active – TrophyNetwork Ultra Edition (Extended Protection Enabled)");