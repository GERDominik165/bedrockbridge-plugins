/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                     ImageFrame - DITHERING ENGINE                             ║
 * ║           Floyd-Steinberg, Bayer, Atkinson & No-Dither Algorithms            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Professional Dithering Algorithms für Farbquantisierung
 * Basierend auf mc-pixelart-maker Implementation
 *
 * @module ditheringEngine
 * @version 1.0.0
 */

/**
 * Quantisiere ImageData zu Farbpalette
 * Wendet optionales Dithering an und speichert Shade-Information für 3D-Maps
 *
 * @param {Array<Array<Number>>} palette - RGBA Palette ([R,G,B,alpha])
 *   Alpha codiert Variante: 255=normal, 254=dark, 253=light
 * @param {ImageData} imageData - Canvas ImageData mit Pixeln
 * @param {String} ditherMethod - 'none'|'weak-bayer'|'strong-bayer'|'floyd-steinberg'|'atkinson'
 * @param {Array<Array<Number>>} shadeMap - Optional: Output für 3D Höhe-Information
 * @returns {ImageData} Quantisierte ImageData
 */
function applyDithering(palette, imageData, ditherMethod = 'none', shadeMap = undefined) {
  const { findClosestColor } = getDitherUtils();

  // 4x4 Bayer Matrix für Ordered Dithering
  const bayerMatrix = [
    [0 / 16 - 0.5, 8 / 16 - 0.5, 2 / 16 - 0.5, 10 / 16 - 0.5],
    [12 / 16 - 0.5, 4 / 16 - 0.5, 14 / 16 - 0.5, 6 / 16 - 0.5],
    [3 / 16 - 0.5, 11 / 16 - 0.5, 1 / 16 - 0.5, 9 / 16 - 0.5],
    [15 / 16 - 0.5, 7 / 16 - 0.5, 13 / 16 - 0.5, 5 / 16 - 0.5]
  ];

  // Quantize jedes Pixel
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const inputPixel = getPixelAt(x, y, imageData);
      let quantizedPixel;

      // Wähle Dithering-Methode
      switch (ditherMethod) {
        case 'weak-bayer':
          quantizedPixel = bayerDither(x, y, inputPixel, palette, bayerMatrix, 1);
          break;
        case 'strong-bayer':
          quantizedPixel = bayerDither(x, y, inputPixel, palette, bayerMatrix, 3);
          break;
        case 'floyd-steinberg':
          quantizedPixel = floydSteinbergQuantize(x, y, inputPixel, palette, imageData);
          break;
        case 'atkinson':
          quantizedPixel = atkinsonQuantize(x, y, inputPixel, palette, imageData);
          break;
        case 'none':
        default:
          quantizedPixel = findClosestColor(inputPixel, palette);
          break;
      }

      // Speichere Shade Information (Alpha-Kanal enthält Höhen-Info)
      if (shadeMap !== undefined) {
        shadeMap[x][y] = quantizedPixel[3]; // 255|254|253
      }

      // Setze Alpha zurück auf 255 für finale Anzeige
      quantizedPixel[3] = 255;
      setPixelAt(x, y, imageData, quantizedPixel);
    }
  }

  return imageData;
}

/**
 * Bayer/Ordered Dithering - Patterned dithering
 * Schneller aber mit sichtbarem Pattern
 */
function bayerDither(x, y, inputPixel, palette, bayerMatrix, strength) {
  const { findClosestColor } = getDitherUtils();

  // Bayer value für diese Position
  const bayerValue = bayerMatrix[y % 4][x % 4];
  const ditherStrength = 5 * 255 / Math.max(10, palette.length) * bayerValue;

  // Modifiziere Input Pixel mit Dither
  const modifiedPixel = [
    Math.round(inputPixel[0] + ditherStrength * strength),
    Math.round(inputPixel[1] + ditherStrength * strength),
    Math.round(inputPixel[2] + ditherStrength * strength)
  ];

  return findClosestColor(modifiedPixel, palette);
}

/**
 * Floyd-Steinberg Dithering - Error Diffusion
 * Beste Qualität, höhere Komplexität
 * Fehler wird zu 16-tel an Nachbarn diffundiert:
 * - Right: 7/16
 * - Below: 5/16
 * - Diagonal: 1/16
 * - Left-Below: 3/16
 */
function floydSteinbergQuantize(x, y, inputPixel, palette, imageData) {
  const { findClosestColor } = getDitherUtils();

  // Finde ähnlichste Farbe
  const quantized = findClosestColor(inputPixel, palette);

  // Berechne Fehler
  const errorR = inputPixel[0] - quantized[0];
  const errorG = inputPixel[1] - quantized[1];
  const errorB = inputPixel[2] - quantized[2];

  // Diffundiere Fehler an Nachbarn
  adjustPixelAt(x + 1, y, imageData, [errorR * 7 / 16, errorG * 7 / 16, errorB * 7 / 16, 0]);
  adjustPixelAt(x - 1, y + 1, imageData, [errorR * 3 / 16, errorG * 3 / 16, errorB * 3 / 16, 0]);
  adjustPixelAt(x, y + 1, imageData, [errorR * 5 / 16, errorG * 5 / 16, errorB * 5 / 16, 0]);
  adjustPixelAt(x + 1, y + 1, imageData, [errorR * 1 / 16, errorG * 1 / 16, errorB * 1 / 16, 0]);

  return quantized;
}

/**
 * Atkinson Dithering - Schneller als Floyd-Steinberg
 * Mit weniger Artifacts als Bayer
 * Fehler wird zu 8-tel an 6 Nachbarn diffundiert
 */
function atkinsonQuantize(x, y, inputPixel, palette, imageData) {
  const { findClosestColor } = getDitherUtils();

  // Finde ähnlichste Farbe
  const quantized = findClosestColor(inputPixel, palette);

  // Berechne Fehler (geteilt durch 8)
  const errorR = (inputPixel[0] - quantized[0]) / 8;
  const errorG = (inputPixel[1] - quantized[1]) / 8;
  const errorB = (inputPixel[2] - quantized[2]) / 8;

  // Diffundiere an 6 Nachbarn
  adjustPixelAt(x + 1, y, imageData, [errorR, errorG, errorB, 0]);
  adjustPixelAt(x + 2, y, imageData, [errorR, errorG, errorB, 0]);
  adjustPixelAt(x - 1, y + 1, imageData, [errorR, errorG, errorB, 0]);
  adjustPixelAt(x, y + 1, imageData, [errorR, errorG, errorB, 0]);
  adjustPixelAt(x + 1, y + 1, imageData, [errorR, errorG, errorB, 0]);
  adjustPixelAt(x, y + 2, imageData, [errorR, errorG, errorB, 0]);

  return quantized;
}

/**
 * Lese Pixel an Position (x,y) aus ImageData
 * ImageData speichert als 1D Array: [R,G,B,A, R,G,B,A, ...]
 *
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate (z in code)
 * @param {ImageData} imageData - Canvas ImageData
 * @returns {Array<Number>} [R,G,B,A]
 */
function getPixelAt(x, y, imageData) {
  const index = 4 * (imageData.width * y + x);
  return [
    imageData.data[index],
    imageData.data[index + 1],
    imageData.data[index + 2],
    imageData.data[index + 3]
  ];
}

/**
 * Schreibe Pixel an Position (x,y) in ImageData
 *
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {ImageData} imageData - Canvas ImageData
 * @param {Array<Number>} rgba - [R,G,B,A]
 */
function setPixelAt(x, y, imageData, rgba) {
  const index = 4 * (imageData.width * y + x);
  for (let i = 0; i < 4; i++) {
    imageData.data[index + i] = rgba[i];
  }
}

/**
 * Addiere Delta zu Pixel (mit Bounds-Check)
 *
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {ImageData} imageData - Canvas ImageData
 * @param {Array<Number>} delta - [dR,dG,dB,dA]
 */
function adjustPixelAt(x, y, imageData, delta) {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return;
  }

  const index = 4 * (imageData.width * y + x);
  for (let i = 0; i < 4; i++) {
    imageData.data[index + i] += delta[i];
  }
}

/**
 * Utilities für Dithering (importierbar aus colorPalette)
 */
function getDitherUtils() {
  // Wird extern zur Verfügung gestellt (aus colorPalette.js)
  return {
    findClosestColor: typeof findClosestColor !== 'undefined' ? findClosestColor : fallbackFindClosestColor
  };
}

// Fallback wenn findClosestColor nicht importiert
function fallbackFindClosestColor(rgb, palette) {
  let minDistance = Infinity;
  let closest = palette[0];

  const r = Math.min(Math.max(rgb[0], 0), 255);
  const g = Math.min(Math.max(rgb[1], 0), 255);
  const b = Math.min(Math.max(rgb[2], 0), 255);

  for (const pColor of palette) {
    let distance;
    if (r + pColor[0] > 256) {
      distance = 2 * (r - pColor[0]) ** 2 + 4 * (g - pColor[1]) ** 2 + 3 * (b - pColor[2]) ** 2;
    } else {
      distance = 3 * (r - pColor[0]) ** 2 + 4 * (g - pColor[1]) ** 2 + 2 * (b - pColor[2]) ** 2;
    }

    if (distance < minDistance) {
      minDistance = distance;
      closest = pColor;
    }
  }

  return closest.slice();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyDithering,
    bayerDither,
    floydSteinbergQuantize,
    atkinsonQuantize,
    getPixelAt,
    setPixelAt,
    adjustPixelAt,
    getDitherUtils
  };
}
