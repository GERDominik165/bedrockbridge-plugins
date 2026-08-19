import { world, system } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { bridge, bridgeDirect } from '../addons';

const jailCells = [];
const jailedPlayers = new Map();
const menuCooldown = new Map();

// 🧱 Save new jail cell
function addJailCell(name, location, dimension) {
  if (jailCells.length >= 30) return false;
  jailCells.push({ name, location, dimension });
  return true;
}

// 🚨 Jail a player
function jailPlayer(player, cell, durationSeconds) {
  if (!cell?.location || !cell?.dimension) {
    player.sendMessage("§cInvalid jail cell data.");
    return;
  }

  jailedPlayers.set(player.name, {
    cell,
    remainingTicks: durationSeconds * 20
  });

  const dim = world.getDimension(cell.dimension);
  dim.runCommandAsync(`tp "${player.name}" ${cell.location.x} ${cell.location.y} ${cell.location.z}`);
  player.sendMessage(`§cYou have been jailed in cell §e${cell.name}§c.`);

  bridgeDirect.sendEmbed({
    title: '🔒 New Prisoner',
    description: `**${player.name}** has been jailed in **${cell.name}** for **${durationSeconds} seconds**.`,
    color: 0xff0000,
    author: player.name
  });
}

// ✅ Release player
function releasePlayer(player) {
  jailedPlayers.delete(player.name);
  player.sendMessage('§aYou have been released from jail.');

  bridgeDirect.sendEmbed({
    title: '✅ Released',
    description: `**${player.name}** has been released from jail.`,
    color: 0x00ff00,
    author: player.name
  });
}

// ⚙️ Jail Cell Config UI
function openJailConfig(player) {
  menuCooldown.delete(player.name);

  const form = new ModalFormData()
    .title('⚙️ Save New Jail Cell')
    .textField('🏢 Cell Name', 'Cell A');

  form.show(player).then(res => {
    if (res.canceled) return;
    const name = res.formValues[0];
    const success = addJailCell(name, player.location, player.dimension.id);
    player.sendMessage(success
      ? `§aCell §e"${name}"§a has been saved.`
      : '§cMaximum number of jail cells (30) reached.');
  });
}

// ⛓️ Jail Player UI with dropdowns
function openJailUI(player) {
  menuCooldown.delete(player.name);

  const onlinePlayers = world.getPlayers();
  if (onlinePlayers.length === 0) {
    player.sendMessage('§cNo players online.');
    return;
  }

  if (jailCells.length === 0) {
    player.sendMessage('§cNo jail cells saved yet.');
    return;
  }

  const form = new ModalFormData()
    .title('⛓️ Jail a Player')
    .dropdown('👤 Select Player', onlinePlayers.map(p => p.name))
    .dropdown('🏢 Select Cell', jailCells.map(c => c.name))
    .textField('⏱️ Duration (seconds)', '300');

  form.show(player).then(res => {
    if (res.canceled) return;

    const playerIndex = res.formValues[0];
    const cellIndex = res.formValues[1];
    const duration = parseInt(res.formValues[2]);

    const target = onlinePlayers[playerIndex];
    const cell = jailCells[cellIndex];

    if (!target || !cell || isNaN(duration)) {
      player.sendMessage('§cInvalid input.');
      return;
    }

    jailPlayer(target, cell, duration);
    player.sendMessage(`§a${target.name} has been jailed in §e${cell.name}§a for ${duration} seconds.`);
  });
}

// ⏳ Jail Timer & Anti-Escape
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const jail = jailedPlayers.get(player.name);
    if (!jail) continue;

    jail.remainingTicks -= 20;
    if (jail.remainingTicks <= 0) {
      releasePlayer(player);
      continue;
    }

    const loc = player.location;
    const cell = jail.cell.location;
    const dx = Math.abs(loc.x - cell.x);
    const dy = Math.abs(loc.y - cell.y);
    const dz = Math.abs(loc.z - cell.z);

    if (dx > 5 || dy > 5 || dz > 5) {
      player.teleport(cell);
      player.sendMessage('§cEscape attempt detected – returned to jail!');
    }
  }
}, 20);

// 🧭 Delayed UI Opening Logic
function delayedOpen(player, actionFn) {
  if (menuCooldown.has(player.name)) {
    player.sendMessage('§7Menu is already being prepared...');
    return;
  }

  menuCooldown.set(player.name, true);
  player.sendMessage('§7Opening menu in a few seconds...');

  let attempts = 0;
  const max = 15;
  const interval = system.runInterval(() => {
    if (!menuCooldown.has(player.name)) return system.clearRun(interval);
    if (attempts++ >= max) {
      menuCooldown.delete(player.name);
      player.sendMessage('§cMenu could not be opened. Please try again.');
      return system.clearRun(interval);
    }
    try {
      actionFn(player);
      system.clearRun(interval);
    } catch {}
  }, 20);
}

// 🔐 Register Commands
bridge.bedrockCommands.registerCommand('jailui', (player) => {
  if (!player.hasTag('admin')) return player.sendMessage('§cNo permission.');
  delayedOpen(player, openJailUI);
}, 'Open the jail management menu');

bridge.bedrockCommands.registerCommand('jailcell', (player) => {
  if (!player.hasTag('admin')) return player.sendMessage('§cNo permission.');
  delayedOpen(player, openJailConfig);
}, 'Save the current position as a jail cell');

bridge.bedrockCommands.registerAdminCommand('unjail', (admin, args) => {
  const target = world.getPlayers().find(p => p.name === args[0]);
  if (!target) return admin.sendMessage('§cPlayer not found.');
  releasePlayer(target);
}, 'Release a player from jail');

// 🧾 Log
console.warn('📦 Jail Plugin loaded ✅ – TrophyNetwork BedrockBridge Ultra Edition');
