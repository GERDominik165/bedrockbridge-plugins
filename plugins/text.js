// 📦 TrophyNetwork Text Plugin – BedrockBridge Ultra Edition (v1.21.71+)
import {
  system,
  Player,
  Dimension
} from '@minecraft/server';
import {
  ModalFormData
} from '@minecraft/server-ui';
import { bridge } from '../addons';

const characterMap = {
  A: '111 101 111 101 101', B: '110 101 110 101 110', C: '111 100 100 100 111',
  D: '110 101 101 101 110', E: '111 100 110 100 111', F: '111 100 110 100 100',
  G: '011 100 101 101 011', H: '101 101 111 101 101', I: '111 010 010 010 111',
  J: '001 001 001 101 111', K: '101 101 110 101 101', L: '100 100 100 100 111',
  M: '101 111 101 101 101', N: '101 111 111 111 101', O: '010 101 101 101 010',
  P: '111 101 111 100 100', Q: '010 101 101 011 001', R: '111 101 111 110 101',
  S: '111 100 111 001 111', T: '111 010 010 010 010', U: '101 101 101 101 111',
  V: '101 101 101 101 010', W: '101 101 101 111 111', X: '101 101 010 101 101',
  Y: '101 101 010 010 010', Z: '111 001 010 100 111',
  '1': '010 110 010 010 111', '2': '111 001 111 100 111', '3': '111 001 111 001 111',
  '4': '101 101 111 001 001', '5': '111 100 111 001 111', '6': '111 100 111 101 111',
  '7': '111 001 001 001 001', '8': '111 101 111 101 111', '9': '111 101 111 001 111',
  '0': '010 101 101 101 010', '/': '001 001 010 100 100', '!': '010 010 010 000 010',
  ':': '000 010 000 010 000', '-': '000 000 111 000 000', '_': '000 000 000 000 111',
  '.': '000 000 000 000 010', ' ': '000 000 000 000 000'
};

function createText(text, x, y, z, blockId, dimension) {
  let posX = x;
  let posY = y;
  let lineOffset = 0;
  const commands = [];

  const lines = text.split('-');
  for (const line of lines) {
    posY = y - lineOffset * 6;
    posX = x;
    for (const char of line.toUpperCase()) {
      const pattern = characterMap[char] || characterMap[' '];
      const rows = pattern.split(' ');
      for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < rows[row].length; col++) {
          const block = rows[row][col] === '1' ? blockId : 'minecraft:air';
          const finalX = Math.floor(posX + col);
          const finalY = Math.floor(posY - row);
          commands.push(`setblock ${finalX} ${finalY} ${z} ${block} keep`);
        }
      }
      posX += 4;
    }
    lineOffset++;
  }

  let i = 0;
  const intervalId = system.runInterval(() => {
    if (i < commands.length) {
      try {
        dimension.runCommand(commands[i]);
      } catch (err) {
        console.warn(`[TextPlugin] Failed: ${commands[i]} -> ${err}`);
      }
      i++;
    } else {
      system.clearRunInterval(intervalId);
    }
  }, 1);
}

// /text
bridge.bedrockCommands.registerCommand('text', (player, args) => {
  if (!player.hasTag('admin')) {
    player.sendMessage('§cNo permission.');
    return;
  }

  let text = args[0] || '';
  let xStr = args[1] || '';
  let yStr = args[2] || '';
  let zStr = args[3] || '';
  let block = args[4] || '';

  if (!text || !xStr || !yStr || !zStr || !block) {
    player.sendMessage('§cUsage: /text <text> <x> <y> <z> <block>');
    return;
  }

  const base = player.location;
  const x = xStr.includes('~') ? base.x + parseInt(xStr.replace('~', '') || '0') : parseInt(xStr);
  const y = yStr.includes('~') ? base.y + parseInt(yStr.replace('~', '') || '0') : parseInt(yStr);
  const z = zStr.includes('~') ? base.z + parseInt(zStr.replace('~', '') || '0') : parseInt(zStr);

  createText(text.replaceAll('_', ' '), x, y, z, block, player.dimension);
  player.sendMessage(`§aText "§f${text}§a" placed at ${x}, ${y}, ${z} with §e${block}`);
});

// /textui
bridge.bedrockCommands.registerCommand('textui', (player) => {
  if (!player.hasTag('admin')) {
    player.sendMessage('§cNo permission.');
    return;
  }

  const form = new ModalFormData()
    .title('📦 Text Generator')
    .textField('📝 Text (_ = space, - = line break)', 'Hello_World')
    .textField('🧭 X', '~')
    .textField('🧭 Y', '~')
    .textField('🧭 Z', '~')
    .textField('🧱 Block-ID', 'minecraft:gold_block');

  form.show(player).then(response => {
    if (response.canceled) return;

    const values = response.formValues;
    if (!values) return;

    let text = values[0] || '';
    let xStr = values[1] || '';
    let yStr = values[2] || '';
    let zStr = values[3] || '';
    let block = values[4] || '';

    const base = player.location;
    const x = xStr.includes('~') ? base.x + parseInt(xStr.replace('~', '') || '0') : parseInt(xStr);
    const y = yStr.includes('~') ? base.y + parseInt(yStr.replace('~', '') || '0') : parseInt(yStr);
    const z = zStr.includes('~') ? base.z + parseInt(zStr.replace('~', '') || '0') : parseInt(zStr);

    if (!text || !block || isNaN(x) || isNaN(y) || isNaN(z)) {
      player.sendMessage('§cInvalid input.');
      return;
    }

    createText(text.replaceAll('_', ' '), x, y, z, block, player.dimension);
    player.sendMessage(`§aText "§f${text}§a" placed at ${x}, ${y}, ${z} with §e${block}`);
  });
});

console.warn('📦 TrophyNetwork Text Plugin loaded with UI (v1.21.71+)');
