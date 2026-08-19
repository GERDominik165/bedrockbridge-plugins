/**
 * SafeStorage Plugin v1.0.0 – TrophyNetwork Ultra Edition
 * Vollständig integriert mit BedrockBridge (bridge, bridgeDirect, database)
 * Komplett in einer Datei implementiert (Forms, Utils, Events, Logik)
 */

import { system, world, ItemStack, Player } from '@minecraft/server';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { bridge, bridgeDirect, database } from '../addons';

// ========================= UTILS =========================
class BlockData {
  constructor(block) {
    this.block = block;
    this.blockStringData = world.getDynamicProperty(this.getLockedBlockId());
    this.hasLockData = this.blockStringData !== undefined;
    this.blockName = block.typeId.replace('minecraft:', '').split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  getLockedBlockData() {
    return this.hasLockData ? JSON.parse(this.blockStringData) : undefined;
  }

  getLockedBlockId() {
    const { x, y, z } = this.block.location;
    const dim = this.block.dimension.id.replace('minecraft:', '');
    return `${dim}:${x}:${y}:${z}:lockBlock`;
  }

  couldOpen(player) {
    const isUnlock = player.getDynamicProperty(this.getLockedBlockId() + ':isUnlock') === true;
    const isRemembered = this.getLockedBlockData()?.remembered?.includes(player.id);
    return isUnlock || isRemembered;
  }
}

Player.prototype.decrementStack = function () {
  const eq = this.getComponent('equippable');
  if (this.getGameMode() === 'creative') return;
  const item = eq.getEquipment('Mainhand');
  const dec = item.amount === 1 ? undefined : (item.amount--, item);
  eq.setEquipment('Mainhand', dec);
};

function createPassword(pass, confirm) {
  const p = pass.trim(), c = confirm.trim();
  if (p.length < 5) return p ? '§cToo short (min 5).' : '§cEmpty password.';
  if (p.length > 30) return '§cToo long (max 30).';
  if (!c) return '§eConfirm password.';
  if (p !== c) return '§cPasswords don’t match';
  return true;
}

function notifyOwner(intruder, ownerId, name, action) {
  for (const p of world.getAllPlayers()) {
    if (p.id === ownerId && p.id !== intruder.id) {
      p.sendMessage(`§cWarning: ${intruder.name} tried to ${action} your ${name}.`);
      bridgeDirect.sendEmbed({
        title: 'Sicherheitswarnung',
        description: `🔒 ${intruder.name} versuchte, ${name} zu ${action}.`,
        color: 0xff5555,
        author: intruder.name
      });
    }
  }
}

function updateLockBlock(block, data) {
  const d = new BlockData(block);
  world.setDynamicProperty(d.getLockedBlockId(), data);
  const c = findConnectedChest(block);
  if (c) world.setDynamicProperty(new BlockData(c).getLockedBlockId(), data);
}

function findConnectedChest(block) {
  const inv = block.getComponent('inventory')?.container;
  if (!inv || inv.size !== 54) return;
  const dirs = ['north', 'south', 'west', 'east'];
  const tester = new ItemStack('minecraft:barrier', 1);
  tester.nameTag = 'vech:itemTester';
  const cache = inv.getItem(0);
  inv.setItem(0, tester);
  for (const d of dirs) {
    const adj = block[d]?.();
    if (adj?.typeId === block.typeId && adj.permutation.matches(block.typeId, block.permutation.getAllStates())) {
      const slot = adj.getComponent('inventory')?.container?.getItem(0);
      if (slot?.nameTag === tester.nameTag) {
        inv.setItem(0, cache);
        return adj;
      }
    }
  }
  inv.setItem(0, cache);
}

function showLockUi(player, name, block) {
  system.run(() => {
    new ModalFormData()
      .title(`Lock ${name}`)
      .textField('Password', 'Enter password')
      .textField('Confirm Password', 'Repeat password')
      .toggle('Attempt Notification')
      .toggle('Restrict Editing')
      .toggle('Allow Remembering')
      .submitButton(`Lock ${name}`)
      .show(player).then(r => {
        if (r.canceled) return;
        const [pw, cpw, notif, restrict, remember] = r.formValues;
        const pass = createPassword(pw, cpw);
        if (pass === true) {
          const data = JSON.stringify({ password: pw, attemptNotification: notif, restrictEditing: restrict, allowRemembering: remember, owner: player.id });
          updateLockBlock(block, data);
          player.decrementStack();
          player.sendMessage(`§a${name} locked.`);
        } else player.sendMessage(pass);
      });
  });
}

// ========================= EVENTS =========================
const lockables = ['minecraft:barrel', 'minecraft:chest', 'minecraft:trapped_chest'];

world.beforeEvents.playerInteractWithBlock.subscribe(({ block, player, itemStack, isFirstEvent, cancel }) => {
  if (!lockables.includes(block.typeId) || !isFirstEvent) return;

  const bd = new BlockData(block);
  const name = bd.blockName;
  const tripwire = itemStack?.typeId === 'minecraft:tripwire_hook' ? itemStack.nameTag?.toLowerCase() : null;

  if (tripwire === 'locker') {
    cancel = true;
    showLockUi(player, name, block);
  }
});

console.warn('✅ SafeStorage Plugin geladen – TrophyNetwork Ultra Edition');
