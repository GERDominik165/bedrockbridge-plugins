// TrophyNetwork CommandSpyPlus Plugin – BedrockBridge Ultra Edition
// Version: 3.6.1 – Full NBT Fix, Reliable Readout & BedrockBridge UI Sync
// Author: poweroffapt

import { world, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { bridge, bridgeDirect } from '../addons';

const DEBUG = true;
const SCAN_INTERVAL = 40;
const SCAN_RADIUS = 16;
const TRACKED_BLOCKS = new Map();
const BLOCK_HISTORY = [];

function getBlockKey(block) {
  const { x, y, z } = block.location;
  return `${block.dimension.id}|${x}|${y}|${z}`;
}

function extractCommandBlockData(block) {
  try {
    const be = block.getComponent('block_entity');
    const data = be?.data ?? {};

    const command = data.Command ?? '<leer>';
    const name = data.CustomName ?? '(kein Name)';
    const auto = data.auto ?? false;
    const cond = data.conditional ?? false;

    let mode = 'impulse';
    if (block.typeId.includes('chain')) mode = 'chain';
    else if (block.typeId.includes('repeating')) mode = 'repeat';

    return {
      command,
      name,
      auto,
      cond,
      mode,
      rawNBT: JSON.stringify(data, null, 2)
    };
  } catch (err) {
    if (DEBUG) console.warn(`[CommandSpyPlus] ⚠️ Fehler beim Extract: ${err}`);
    return null;
  }
}

function logCommandBlockInfo(block, source = 'System') {
  try {
    const { x, y, z } = block.location;
    const dim = block.dimension?.id ?? 'unknown';
    const data = extractCommandBlockData(block);
    if (!data) return;

    const hash = `${data.command}|${data.name}|${data.auto}|${data.cond}|${data.mode}`;
    const key = getBlockKey(block);
    const oldHash = TRACKED_BLOCKS.get(key);

    if (oldHash === hash) return;
    TRACKED_BLOCKS.set(key, hash);

    const entry = {
      source,
      position: `(${x}, ${y}, ${z}) in ${dim}`,
      type: block.typeId,
      auto: data.auto,
      cond: data.cond,
      mode: data.mode,
      name: data.name,
      command: data.command,
      rawNBT: data.rawNBT,
      timestamp: new Date().toISOString()
    };

    BLOCK_HISTORY.unshift(entry);
    if (BLOCK_HISTORY.length > 100) BLOCK_HISTORY.pop();

    const message = `🧱 ${source} erkannte CommandBlock:\n` +
      `📌 Position: ${entry.position}\n` +
      `🔁 Typ: ${entry.type} | Auto: ${entry.auto ? 'Ja' : 'Nein'} | Bedingt: ${entry.cond ? 'Ja' : 'Nein'} | Modus: ${entry.mode}\n` +
      `📄 Name: ${entry.name}\n` +
      `💬 Befehl: ${entry.command}`;

    console.warn(`\u001b[36m[CommandSpyPlus] ${message}\u001b[0m`);

    try {
      bridgeDirect.sendEmbed({
        title: '📦 CommandBlock erkannt',
        description: message,
        color: 0xff9900,
        author: source
      });
    } catch (err) {
      if (DEBUG) console.warn(`[CommandSpyPlus] ❌ Discord-Embed fehlgeschlagen: ${err}`);
    }
  } catch (err) {
    console.warn(`[CommandSpyPlus] ⚠️ Fehler beim Loggen: ${err}`);
  }
}

function scanNearbyCommandBlocks() {
  for (const player of world.getPlayers()) {
    const dim = player.dimension;
    const origin = player.location;

    for (let x = -SCAN_RADIUS; x <= SCAN_RADIUS; x++) {
      for (let y = -6; y <= 7; y++) {
        for (let z = -SCAN_RADIUS; z <= SCAN_RADIUS; z++) {
          const pos = {
            x: Math.floor(origin.x + x),
            y: Math.floor(origin.y + y),
            z: Math.floor(origin.z + z)
          };
          try {
            const block = dim.getBlock(pos);
            if (block?.typeId?.includes('command_block')) {
              logCommandBlockInfo(block, `Scan bei ${player.name}`);
            } else {
              const key = `${dim.id}|${pos.x}|${pos.y}|${pos.z}`;
              if (TRACKED_BLOCKS.has(key)) {
                console.warn(`[CommandSpyPlus] ❌ CommandBlock entfernt @ ${key}`);
                TRACKED_BLOCKS.delete(key);
              }
            }
          } catch {}
        }
      }
    }
  }
}

function initialSpawnScan() {
  const dim = world.getDimension("overworld");
  const center = { x: 0, y: 64, z: 0 };

  for (let x = -32; x <= 32; x++) {
    for (let y = 0; y <= 128; y++) {
      for (let z = -32; z <= 32; z++) {
        const pos = {
          x: center.x + x,
          y: center.y + y,
          z: center.z + z
        };
        try {
          const block = dim.getBlock(pos);
          if (block?.typeId?.includes('command_block')) {
            logCommandBlockInfo(block, 'InitialScan');
          }
        } catch {}
      }
    }
  }
  console.warn(`[CommandSpyPlus] 🌍 Initialscan abgeschlossen.`);
}

function showCommandBlockList(player) {
  const form = new ActionFormData()
    .title('📜 Gefundene CommandBlöcke')
    .body('Wähle einen CommandBlock zum Anzeigen der Details aus:');

  const recent = BLOCK_HISTORY.slice(0, 25);
  recent.forEach((entry) => {
    form.button(`${entry.command.substring(0, 30)}\n§7${entry.position}`);
  });

  form.show(player).then((response) => {
    if (!response.canceled) {
      const selected = recent[response.selection];
      if (selected) {
        system.runTimeout(() => {
          const details = `📌 Position: ${selected.position}\n` +
            `🔁 Auto: ${selected.auto} | Cond: ${selected.cond} | Modus: ${selected.mode}\n` +
            `📄 Name: ${selected.name}\n` +
            `💬 Befehl: ${selected.command}\n` +
            `📦 NBT:\n${selected.rawNBT}`;

          player.sendMessage(`§6[CommandSpyPlus UI] Details:\n§7${details}`);
        }, 200);
      }
    }
  }).catch(() => {});
}

function startMonitoring() {
  console.warn('[CommandSpyPlus] 🚀 Initialisiere Blocküberwachung ...');

  system.runInterval(() => {
    scanNearbyCommandBlocks();
  }, SCAN_INTERVAL);

  system.run(() => {
    initialSpawnScan();
    console.warn('[CommandSpyPlus] ✅ System aktiv – Commandblocks werden überwacht');
  });

  world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
    if (block?.typeId?.includes("command_block")) {
      logCommandBlockInfo(block, `${player.name} platzierte`);
    }
  });

  world.afterEvents.playerInteractWithBlock.subscribe(({ block, player }) => {
    if (block?.typeId?.includes("command_block")) {
      system.runTimeout(() => {
        const refreshed = block.dimension.getBlock(block.location);
        if (refreshed?.typeId?.includes("command_block")) {
          logCommandBlockInfo(refreshed, `${player.name} editierte`);
        }
      }, 100);
    }
  });
}

system.afterEvents.scriptEventReceive.subscribe(e => {
  if (!e.sourceEntity?.hasTag("admin")) return;
  if (e.id === "commandspy:list") {
    system.runTimeout(() => {
      showCommandBlockList(e.sourceEntity);
    }, 300);
  }
});

try {
  system.runTimeout(() => {
    startMonitoring();
  }, 40);
} catch (err) {
  console.warn(`[CommandSpyPlus] ❌ Initialisierungsfehler: ${err}`);
  startMonitoring();
}


// --- In das zentrale BridgeHub registrieren ---
import { hub as _bridgeHub } from "./hubAPI.js";
try {
  _bridgeHub.register({ id: "commandspy", title: "👁 Command-Spy", icon: "textures/ui/spyglass_flat", category: "Admin", order: 50, permission: "esploratori:admin", handler: showCommandBlockList });
  console.warn("[commandspy] im Hub registriert");
} catch (e) { console.warn("[commandspy] hub-reg: " + e); }
