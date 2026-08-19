// TrophyNetwork PhysixBlocks Plugin – BedrockBridge Ultra Edition
// Version: 2.6.0 – Player-Proximity Gravity Engine with Active Logging
// Author: poweroffapt

import { system, world } from '@minecraft/server';

const PHYSICS_INTERVAL = 40; // alle 2 Sekunden (20 Ticks = 1 Sekunde)
const SCAN_HEIGHT = { min: -2, max: 5 };
const MAX_DROP = 20;
const DEFAULT_RADIUS = 120;
const DEBUG = false;

const FALLING_BLOCKS = new Set([
  'minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt',
  'minecraft:podzol', 'minecraft:mycelium', 'minecraft:red_sand',
  'minecraft:sand', 'minecraft:gravel', 'minecraft:cobblestone',
  'minecraft:stone', 'minecraft:bookshelf', 'minecraft:planks',
  'minecraft:log', 'minecraft:log2', 'minecraft:stripped_oak_log',
  'minecraft:jukebox', 'minecraft:note_block', 'minecraft:wool',
  'minecraft:moss_block'
]);

function isAir(block) {
  return block?.typeId === 'minecraft:air';
}

function applyGravityToBlock(block) {
  try {
    if (!block || isAir(block) || !FALLING_BLOCKS.has(block.typeId)) return false;

    const loc = block.location;
    let finalY = loc.y;

    for (let i = 1; i <= MAX_DROP && finalY - i > 0; i++) {
      const below = block.dimension.getBlock({ x: loc.x, y: finalY - i, z: loc.z });
      if (!below || !isAir(below)) break;
      finalY = loc.y - i;
    }

    if (finalY !== loc.y) {
      block.dimension.setBlockType({ x: loc.x, y: finalY, z: loc.z }, block.typeId);
      block.dimension.setBlockType(loc, 'minecraft:air');
      console.warn(`\u001b[33m[PhysixBlocks] ⬇️ '${block.typeId}' fell Y=${loc.y} → Y=${finalY} @ (${loc.x}, ${loc.z})\u001b[0m`);
      return true;
    }
  } catch (err) {
    console.warn(`\u001b[31m[PhysixBlocks] ⚠️ applyGravityToBlock: ${err}\u001b[0m`);
  }
  return false;
}

function getScanRadius(player) {
  try {
    const score = world.scoreboard.getObjective("physix_radius")?.getScore(player);
    return score !== undefined ? Math.min(score, 32) : DEFAULT_RADIUS;
  } catch {
    return DEFAULT_RADIUS;
  }
}

function scanForFallingBlocks() {
  const players = world.getPlayers();
  if (players.length === 0) {
    console.warn('[PhysixBlocks] ❗ Kein Spieler online – Scan übersprungen.');
    return;
  }

  for (const player of players) {
    let dimension;
    try {
      dimension = player.dimension;
    } catch (err) {
      console.warn(`[PhysixBlocks] ⚠️ Fehler bei Spieler-Dimension: ${err}`);
      continue;
    }

    const origin = player.location;
    const radius = getScanRadius(player);
    let moved = 0;

    for (let x = -radius; x <= radius; x++) {
      for (let y = SCAN_HEIGHT.min; y <= SCAN_HEIGHT.max; y++) {
        for (let z = -radius; z <= radius; z++) {
          const pos = {
            x: Math.floor(origin.x + x),
            y: Math.floor(origin.y + y),
            z: Math.floor(origin.z + z)
          };

          try {
            const block = dimension.getBlock(pos);
            if (!block) continue;
            if (DEBUG) console.log(`[DEBUG] ${block.typeId} @ ${pos.x},${pos.y},${pos.z}`);
            if (FALLING_BLOCKS.has(block.typeId)) {
              if (applyGravityToBlock(block)) moved++;
            }
          } catch {}
        }
      }
    }

    if (moved > 0) {
      console.warn(`[PhysixBlocks] ✔️ ${moved} Block(s) bewegt bei ${player.name}`);
    } else {
      console.log(`[PhysixBlocks] 🔍 Keine bewegbaren Blöcke bei ${player.name}`);
    }
  }
}

system.runInterval(() => {
  try {
    scanForFallingBlocks();
  } catch (err) {
    console.warn(`[PhysixBlocks] ⚠️ Fehler beim Scan: ${err}`);
  }
}, PHYSICS_INTERVAL);

system.run(() => {
  console.warn('[PhysixBlocks Plugin] ✅ Aktiv – Spielerbasierte Schwerkraft-Überprüfung läuft');
});
