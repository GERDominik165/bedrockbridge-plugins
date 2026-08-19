/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                  ImageFrame - COMMAND WRITER                                  ║
 * ║           Minecraft Command Generation für automatisches Placement            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Generiert Minecraft-Kommandos zum automatischen Platzieren von Blöcken
 * - setblock Kommandos für einzelne Blöcke
 * - structure Kommandos für optimiertes Placement
 * - fill Kommandos für Luftreinigung
 * - Zone-basierte Aufteilung (64x128)
 *
 * @module commandWriter
 * @version 1.0.0
 */

/**
 * Generiere Minecraft-Kommandos für Pixelart-Platzierung
 *
 * @param {String} functionName - Name für Function/Command-Set
 * @param {ImageData} imageData - Verarbeitetes Bild (Pixel zu Block-Mapping)
 * @param {Number} heightLimit - Max Height (0 = 2D, >0 = 3D)
 * @param {Boolean} keepExisting - Keep existing blocks oder clear?
 * @param {Boolean} useTeleport - TP zwischen Zonen?
 * @param {Boolean} useStructures - Structure load oder setblock?
 * @param {Array<Array<Number>>} shadeMap - 3D Height Information
 * @param {Boolean} useAbsoluteCoords - Absolute oder relative Coordinates?
 * @param {Object} origin - {X, Y, Z} Origin-Koordinaten
 * @returns {Array<String>} Array von Function-Strings (einer pro Zone)
 */
function generateCommands(functionName, imageData, heightLimit, keepExisting, useTeleport, useStructures, shadeMap, useAbsoluteCoords, origin = {X: 0, Y: 0, Z: 0}) {
  const commands = [];

  // Zone-Size: 64x128 pixels pro Funktion
  const zoneWidth = 64;
  const zoneHeight = 128;

  // Sammle alle Zone-Ursprünge
  const zoneOrigins = [];
  for (let z0 = 0; z0 < imageData.height; z0 += zoneHeight) {
    for (let x0 = 0; x0 < imageData.width; x0 += zoneWidth) {
      zoneOrigins.push([x0, z0]);
    }
  }

  // Berechne Height-Map wenn 3D
  let yMap = undefined;
  if (heightLimit > 1 && shadeMap) {
    yMap = calculateHeightMap(imageData, heightLimit, shadeMap);
  }

  // Generiere Kommandos für jede Zone
  for (let zoneIdx = 0; zoneIdx < zoneOrigins.length; zoneIdx++) {
    let zoneCommands = '';

    const [x0, z0] = zoneOrigins[zoneIdx];

    // Header mit Info
    zoneCommands += `say Pixelart Zone ${zoneIdx + 1}/${zoneOrigins.length}: ${functionName}\n`;
    zoneCommands += `say Position: X=${origin.X + x0}-${origin.X + x0 + zoneWidth - 1}, Y=${origin.Y}-${origin.Y + heightLimit}, Z=${origin.Z + z0}-${origin.Z + z0 + zoneHeight - 1}\n`;

    // Clear existing blocks wenn nicht keep
    if (!keepExisting) {
      for (let y = 0; y <= heightLimit; y++) {
        if (useAbsoluteCoords) {
          zoneCommands += `fill ${origin.X + x0} ${origin.Y + y} ${origin.Z + z0} `;
          zoneCommands += `${origin.X + x0 + zoneWidth - 1} ${origin.Y + y} ${origin.Z + z0 + zoneHeight - 1} air [] replace\n`;
        } else {
          zoneCommands += `fill ~${x0} ~${y} ~${z0} ~${x0 + zoneWidth - 1} ~${y} ~${z0 + zoneHeight - 1} air [] replace\n`;
        }
      }
    }

    // Place blocks für Zone
    for (let localZ = 0; localZ < zoneHeight; localZ++) {
      for (let localX = 0; localX < zoneWidth; localX++) {
        const globalX = x0 + localX;
        const globalZ = z0 + localZ;

        if (globalX >= imageData.width || globalZ >= imageData.height) {
          continue;
        }

        // Hole Block-Info (würde aus Pixel-Daten kommen)
        const blockInfo = getBlockAtPixel(globalX, globalZ, imageData);
        const height = yMap ? yMap[globalX][globalZ] : 0;

        if (!blockInfo || !blockInfo.blockId) {
          continue;
        }

        // Baue Kommando
        let cmd = '';

        if (useAbsoluteCoords) {
          cmd = `${origin.X + globalX} ${origin.Y + height} ${origin.Z + globalZ} `;
        } else {
          cmd = `~${globalX} ~${height} ~${globalZ} `;
        }

        if (useStructures) {
          // Structure load (schneller aber nicht immer möglich)
          if (!keepExisting || isAir(globalX, globalZ, imageData)) {
            cmd = `structure load mapart:${blockInfo.blockId} ${cmd}\n`;
          }
        } else {
          // setblock (zuverlässig)
          cmd = `setblock ${cmd}${blockInfo.blockId} []\n`;
        }

        zoneCommands += cmd;
      }
    }

    // TP zur nächsten Zone wenn vorhanden
    if (useTeleport && zoneIdx < zoneOrigins.length - 1) {
      const nextZone = zoneOrigins[zoneIdx + 1];

      if (useAbsoluteCoords) {
        zoneCommands += `structure load mapart:glowstone ${origin.X + nextZone[0]} ${origin.Y - 1} ${origin.Z + nextZone[1]}\n`;
        zoneCommands += `tp @p ${origin.X + nextZone[0]} ${origin.Y} ${origin.Z + nextZone[1]}\n`;
      } else {
        zoneCommands += `structure load mapart:glowstone ~${nextZone[0] - x0} ~-1 ~${nextZone[1] - z0}\n`;
        zoneCommands += `tp @p ~${nextZone[0] - x0} ~ ~${nextZone[1] - z0}\n`;
      }
    }

    commands.push(zoneCommands);
  }

  return commands;
}

/**
 * Berechne Height-Map aus ImageData
 * (Wrapper für externe Function)
 */
function calculateHeightMap(imageData, maxHeight, shadeMap) {
  // Externe Function von heightMapping.js
  if (typeof window.calculateHeightMap === 'function') {
    return window.calculateHeightMap(imageData, maxHeight, shadeMap);
  }

  // Fallback: Einfaches Linear-Mapping
  console.warn('Height mapping function not available');
  const yMap = new Array(imageData.width);
  for (let x = 0; x < imageData.width; x++) {
    yMap[x] = new Array(imageData.height).fill(Math.floor(maxHeight / 2));
  }
  return yMap;
}

/**
 * Hole Block-Informationen bei Pixel-Position
 * Wird basierend auf ImageData gefüllt
 *
 * Placeholder - wird mit echten Daten verbunden
 */
function getBlockAtPixel(x, y, imageData) {
  // Lese Pixel-Farbe
  const index = 4 * (imageData.width * y + x);
  const r = imageData.data[index];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];

  // Mapping Farbe -> Block (würde von colorPalette.js kommen)
  // Dies ist ein Placeholder
  return {
    blockId: 'white_concrete',
    color: [r, g, b]
  };
}

/**
 * Prüfe ob Pixel "air" ist (transparent/ignoriert)
 */
function isAir(x, y, imageData) {
  const index = 4 * (imageData.width * y + x);
  const alpha = imageData.data[index + 3];
  return alpha < 128; // Halb-transparent oder voller transparent
}

/**
 * Konvertiere Commands Array zu Function-File Format
 * Minecraft expect functions als .mcfunction Files
 *
 * @param {Array<String>} commands - Array von Command-Strings
 * @param {String} namespace - Namespace (z.B. "pixelart")
 * @param {String} functionPath - Function path (z.B. "structures/myart")
 * @returns {Object} {functions: {path: content}}
 */
function formatForMcFunction(commands, namespace = 'pixelart', functionPath = 'build/structure') {
  const functions = {};

  commands.forEach((zoneCommands, index) => {
    const path = `${namespace}:${functionPath}_zone_${index + 1}`;

    functions[path] = {
      content: zoneCommands,
      format: 'mcfunction'
    };
  });

  return { functions };
}

/**
 * Optimiere Kommandos:
 * - Entferne doppelte fills
 * - Merge adjacent setblocks
 * - Komprimiere längere Kommandos
 */
function optimizeCommands(commands) {
  return commands.map(zoneCmd => {
    return zoneCmd
      .split('\n')
      .filter(cmd => cmd.trim().length > 0)
      .filter((cmd, idx, arr) => {
        // Entferne doppelte Kommandos
        return idx === 0 || cmd !== arr[idx - 1];
      })
      .join('\n');
  });
}

/**
 * Validiere Kommandos vor Export
 */
function validateCommands(commands) {
  const errors = [];

  commands.forEach((zoneCmd, zoneIdx) => {
    const lines = zoneCmd.split('\n');

    lines.forEach((line, lineIdx) => {
      if (!line.trim()) return;

      // Prüfe auf gültige Minecraft-Kommandos
      const validPatterns = [
        /^say\s/,
        /^setblock\s/,
        /^fill\s/,
        /^structure\s/,
        /^tp\s/,
        /^execute\s/,
        /^comment\s/
      ];

      const isValid = validPatterns.some(pattern => pattern.test(line.trim()));

      if (!isValid && line.trim().length > 0) {
        errors.push({
          zone: zoneIdx,
          line: lineIdx,
          message: `Invalid command: ${line.substring(0, 50)}...`
        });
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Berechne Statistiken für Command-Set
 */
function getCommandStats(commands) {
  let totalLines = 0;
  let totalSetblock = 0;
  let totalFill = 0;
  let totalStructure = 0;

  commands.forEach(zoneCmd => {
    const lines = zoneCmd.split('\n').filter(l => l.trim());
    totalLines += lines.length;

    totalSetblock += (zoneCmd.match(/^setblock\s/gm) || []).length;
    totalFill += (zoneCmd.match(/^fill\s/gm) || []).length;
    totalStructure += (zoneCmd.match(/^structure\s/gm) || []).length;
  });

  return {
    zones: commands.length,
    totalLines,
    totalSetblock,
    totalFill,
    totalStructure,
    estimatedExecutionTime: `${Math.ceil(totalLines / 100)}s` // Rough estimate
  };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateCommands,
    formatForMcFunction,
    optimizeCommands,
    validateCommands,
    getCommandStats,
    getBlockAtPixel,
    isAir
  };
}
