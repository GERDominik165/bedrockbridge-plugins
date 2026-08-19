/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   ImageFrame - IMAGE PROCESSOR                                 ║
 * ║          Bildverarbeitung Pipeline: Resize → Quantize → Dither → Preview      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Hauptpipeline für Bildverarbeitung
 * - Resize auf Map-Größe
 * - Farbpaletten-Quantisierung
 * - Dithering anwenden
 * - 3D-Höhenmapping (optional)
 * - Shade-Korrekturen
 *
 * @module imageProcessor
 * @version 1.0.0
 */

/**
 * HAUPTFUNKTION: Analysiere und verarbeite Bild
 *
 * @param {HTMLImageElement} image - Geladenes Bild
 * @param {Array<Number>} mapArea - [width_maps, height_maps] z.B. [1, 1] = 128x128px
 * @param {String} paletteString - Space-separated Material-Codes
 * @param {Boolean} is3D - Mit Höhen-Mapping?
 * @param {String} ditherMethod - Dithering-Methode
 * @param {Number} maxHeight - Max Height für 3D (z.B. 256)
 * @returns {Object} {finalImage, shadeMap, resizedImage, success, height2Low, previewData}
 */
function analyseImage(image, mapArea, paletteString, is3D = false, ditherMethod = 'none', maxHeight = 128) {
  try {
    // 1. Canvas Setup
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true
    });

    if (!ctx) {
      throw new Error('Cannot get 2D context from canvas');
    }

    // 2. Berechne Größen
    const pixelWidth = mapArea[0] * 128;  // 1 map = 128 pixels
    const pixelHeight = mapArea[1] * 128;
    const dispScale = getDisplayScale(Math.max(pixelWidth, pixelHeight));

    // 3. Zeichne Bild auf Canvas mit korrekter Größe
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    ctx.drawImage(image, 0, 0, pixelWidth, pixelHeight);

    // 4. Hole ImageData
    const imageData = ctx.getImageData(0, 0, pixelWidth, pixelHeight);
    const resizedImage = canvas.toDataURL('image/png');

    // 5. Erstelle Shade Map für 3D
    const shadeMap = new Array(pixelWidth);
    for (let i = 0; i < pixelWidth; i++) {
      shadeMap[i] = new Array(pixelHeight);
    }

    // 6. Baue Farbpalette auf
    const colorPalette = buildPalette(paletteString, is3D);
    if (!colorPalette || colorPalette.length === 0) {
      throw new Error('Invalid or empty color palette');
    }

    // 7. Quantisiere und dithering
    applyDithering(colorPalette, imageData, ditherMethod, shadeMap);

    // 8. Höhen-Mapping wenn 3D
    let heightTooLow = 0;
    if (is3D && maxHeight > 1) {
      const heightResult = calculateHeightMapping(imageData, maxHeight, shadeMap);
      heightTooLow = heightResult.heightTooLow;
      const yMap = heightResult.yMap;

      // Korrigiere Farben basierend auf Höhe
      correctShadeByHeight(imageData, colorPalette, yMap);
    }

    // 9. Finales Image
    ctx.putImageData(imageData, 0, 0);
    const finalImage = canvas.toDataURL('image/png');
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    return {
      finalImage,
      shadeMap,
      resizedImage,
      success: true,
      heightTooLow,
      previewScale: dispScale * pixelHeight,
      previewWidth: dispScale * pixelWidth,
      warning: heightTooLow > 4 * pixelHeight ? 'Höhenlimit zu niedrig' : null
    };
  } catch (error) {
    console.error('Image processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Bestimme Display-Scale für Preview basierend auf Größe
 * Kleinere Maps = größeres Preview
 */
function getDisplayScale(maxSize) {
  switch (maxSize) {
    case 128:
    case 256:
      return 4;
    case 384:
      return 2;
    default:
      return 1;
  }
}

/**
 * Baue Farbpalette mit Dark/Light Varianten auf
 * Importierbar aus colorPalette.js
 */
function buildPalette(paletteString, is3D) {
  // Wird extern implementiert (colorPalette.js)
  if (typeof buildPaletteArray !== 'undefined') {
    return buildPaletteArray(paletteString, is3D);
  }

  // Fallback (sollte nicht erreicht werden)
  return [];
}

/**
 * Wende Dithering-Algorithmus an
 * Importierbar aus ditheringEngine.js
 */
function applyDithering(palette, imageData, method, shadeMap) {
  if (typeof window.applyDithering !== 'undefined') {
    return window.applyDithering(palette, imageData, method, shadeMap);
  }
  // Fallback: Keine Dithering
  console.warn('Dithering engine not loaded');
}

/**
 * Berechne Höhenmapping für 3D-Maps
 * Transformiert Pixel-Heights in Minecraft-Block-Heights
 *
 * @param {ImageData} imageData - Verarbeitetes Bild
 * @param {Number} maxHeight - Height-Limit
 * @param {Array<Array<Number>>} shadeMap - Shade-Information (254|255|253)
 * @returns {Object} {yMap, heightTooLow}
 */
function calculateHeightMapping(imageData, maxHeight, shadeMap) {
  const yMap = [];
  let heightTooLow = 0;

  // Für jede Spalte
  for (let x = 0; x < imageData.width; x++) {
    const column = [0]; // Start bei Y=0

    // Für jede Reihe
    for (let z = 1; z < imageData.height; z++) {
      const shadeType = shadeMap[x][z];
      const lastY = column[column.length - 1];

      // Berechne neue Höhe basierend auf Shade-Typ
      switch (shadeType) {
        case 255:
          // Normal: gleiche Höhe wie Nachbar
          column.push(lastY);
          break;
        case 254:
          // Dark: 2 Blöcke tiefer
          column.push(lastY - 2);
          break;
        case 253:
          // Light: 2 Blöcke höher
          column.push(lastY + 2);
          break;
        default:
          column.push(lastY);
      }
    }

    // Clamp zu [0, maxHeight]
    const clamped = clampHeightSequence(column, maxHeight);
    heightTooLow += clamped.cuts;
    yMap.push(clamped.result);
  }

  return { yMap, heightTooLow };
}

/**
 * Begrenzte Integer-Sequenz auf Range [0, limit]
 * Schneidet bei Bedarf ab und verschiebt Segmente
 *
 * @param {Array<Number>} arr - Height-Sequenz
 * @param {Number} limit - Max Height
 * @returns {Object} {result, cuts}
 */
function clampHeightSequence(arr, limit) {
  let min = Number.MAX_SAFE_INTEGER;
  let max = Number.MIN_SAFE_INTEGER;
  const result = [];
  const buffer = [];
  let cuts = 0;

  for (let i = 0; i < arr.length; i++) {
    const localMin = min;
    const localMax = max;

    min = Math.min(arr[i], min);
    max = Math.max(arr[i], max);

    // Wenn Range überschritten
    if (max - min > limit) {
      // Flush buffer
      for (let j = 0; j < buffer.length; j++) {
        result.push(buffer[j] - localMin);
      }
      buffer.length = 0;
      cuts++;
      min = arr[i];
      max = arr[i];
    }

    buffer.push(arr[i]);
  }

  // Flush remaining buffer
  for (let j = 0; j < buffer.length; j++) {
    result.push(buffer[j] - min);
  }

  return { result, cuts };
}

/**
 * Korrigiere Farben basierend auf Höhenmapping
 * Light/Dark Varianten werden anhand der Höhe-Unterschiede zu Nachbarn bestimmt
 *
 * @param {ImageData} imageData - Pixel (werden modifiziert)
 * @param {Array<Array<Number>>} palette - Color Palette
 * @param {Array<Array<Number>>} yMap - Height Map
 */
function correctShadeByHeight(imageData, palette, yMap) {
  for (let x = 0; x < imageData.width; x++) {
    for (let z = 0; z < imageData.height; z++) {
      const pixel = getPixelAt(x, z, imageData);
      const colorIndex = findColorInPalette(pixel, palette);

      if (colorIndex === -1) continue;

      // Finde Base-Farbe (Index ist 3er-Gruppen: normal, dark, light)
      let baseIndex = Math.floor(colorIndex / 3) * 3;

      // Bestimme Variante basierend auf Höhen-Unterschied
      // Top row wird als "höher" angenommen
      if (z === 0 || yMap[x][z] > yMap[x][z - 1]) {
        baseIndex += 2; // Light variant
      } else if (yMap[x][z] < yMap[x][z - 1]) {
        baseIndex += 1; // Dark variant
      }
      // else: baseIndex += 0 (normal)

      setPixelAt(x, z, imageData, [...palette[baseIndex], 255]);
    }
  }
}

/**
 * Finde Index einer Farbe in Palette
 * Vergleicht RGB (ignoriert Alpha)
 */
function findColorInPalette(rgb, palette) {
  for (let i = 0; i < palette.length; i++) {
    if (rgb[0] === palette[i][0] &&
        rgb[1] === palette[i][1] &&
        rgb[2] === palette[i][2]) {
      return i;
    }
  }
  return -1;
}

/**
 * Lese Pixel an Position (x, z) aus ImageData
 */
function getPixelAt(x, z, imageData) {
  const loc = 4 * (imageData.width * z + x);
  return [
    imageData.data[loc],
    imageData.data[loc + 1],
    imageData.data[loc + 2],
    imageData.data[loc + 3]
  ];
}

/**
 * Schreibe Pixel an Position (x, z) in ImageData
 */
function setPixelAt(x, z, imageData, rgba) {
  const loc = 4 * (imageData.width * z + x);
  for (let i = 0; i < 4; i++) {
    imageData.data[loc + i] = rgba[i];
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyseImage,
    calculateHeightMapping,
    correctShadeByHeight,
    getDisplayScale,
    clampHeightSequence
  };
}
