/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   ImageFrame - HEIGHT MAPPING MODULE                          ║
 * ║          3D Map Art: Höhen-Berechnung mit Shade-Varianten                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Spezialisiert auf 3D-Map-Art Höhen-Berechnung:
 * - Shade-zu-Höhe Mapping (Normal/Dark/Light)
 * - Intelligente Height-Sequenz-Begrenzung
 * - Höhen-Validierung & Optimierung
 * - Visual Artifact Minimierung
 *
 * @module heightMapping
 * @version 1.0.0
 */

/**
 * Height Mapper - 3D Map Art Höhen-Berechnung
 */
class HeightMapper {
  constructor(config = {}) {
    this.config = {
      maxHeight: 256,
      minHeight: 0,
      enableOptimization: true,
      enableSmoothing: false,
      ...config
    };
  }

  /**
   * HAUPTFUNKTION: Berechne Höhenmapping aus ImageData
   *
   * @param {ImageData} imageData - Verarbeitetes (dithered) Bild
   * @param {Number} maxHeight - Maximum Height-Limit
   * @param {Array<Array<Number>>} shadeMap - Shade-Information (254|255|253)
   * @returns {Object} {yMap: Array, statistics}
   */
  calculateHeightMap(imageData, maxHeight = 128, shadeMap) {
    if (!shadeMap) {
      return {
        success: false,
        error: 'shadeMap required for height mapping',
        yMap: null
      };
    }

    try {
      const yMap = [];
      const statistics = {
        totalCuts: 0,
        blocksUsed: new Map(),
        minHeight: Infinity,
        maxHeight: -Infinity,
        averageHeight: 0
      };

      let totalHeight = 0;

      // Für jede Spalte (x)
      for (let x = 0; x < imageData.width; x++) {
        const column = this._buildHeightColumn(x, imageData.height, shadeMap);

        // Clamp zu [0, maxHeight] mit Smart-Cutting
        const clamped = this._clampHeightSequence(column, maxHeight);

        // Recordstatistics
        statistics.totalCuts += clamped.cuts;

        for (const height of clamped.result) {
          totalHeight += height;
          statistics.minHeight = Math.min(statistics.minHeight, height);
          statistics.maxHeight = Math.max(statistics.maxHeight, height);
        }

        yMap.push(clamped.result);
      }

      // Calculate Average
      statistics.averageHeight = Math.round(totalHeight / (imageData.width * imageData.height));

      // Optimiere wenn enabled
      if (this.config.enableOptimization) {
        this._optimizeHeightMap(yMap, shadeMap);
      }

      return {
        success: true,
        yMap,
        statistics
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        yMap: null
      };
    }
  }

  /**
   * INTERNAL: Baue Höhen-Spalte aus Shade-Map
   *
   * Shade-Bedeutung:
   * 255 = Normal-Farbe → gleiche Höhe wie Nachbar
   * 254 = Dark-Variante → 2 Blöcke tiefer
   * 253 = Light-Variante → 2 Blöcke höher
   */
  _buildHeightColumn(x, height, shadeMap) {
    const column = [0]; // Start bei Y=0

    for (let z = 1; z < height; z++) {
      const currentShade = shadeMap[x][z];
      const lastY = column[column.length - 1];

      let nextY;

      switch (currentShade) {
        case 255:
          // Normal: gleiche Höhe wie Vorgänger
          nextY = lastY;
          break;

        case 254:
          // Dark: 2 Blöcke tiefer (unter-Beleuchtung)
          nextY = lastY - 2;
          break;

        case 253:
          // Light: 2 Blöcke höher (über-Beleuchtung)
          nextY = lastY + 2;
          break;

        default:
          // Fallback
          nextY = lastY;
          break;
      }

      column.push(nextY);
    }

    return column;
  }

  /**
   * INTERNAL: Clamp Height-Sequenz zu [0, limit]
   *
   * Intelligentes Cutting:
   * - Versucht Deltas zwischen aufeinanderfolgenden Pixeln zu bewahren
   * - Minimiert Visual-Artifacts
   * - Zählt "Cuts" (Diskontinuitäten)
   */
  _clampHeightSequence(arr, limit) {
    let minVal = Number.MAX_SAFE_INTEGER;
    let maxVal = Number.MIN_SAFE_INTEGER;
    const result = [];
    const buffer = [];
    let cuts = 0;

    for (let i = 0; i < arr.length; i++) {
      const currentValue = arr[i];

      // Update local min/max
      const localMin = minVal;
      const localMax = maxVal;

      minVal = Math.min(currentValue, minVal);
      maxVal = Math.max(currentValue, maxVal);

      // Prüfe ob Range überschritten
      if (maxVal - minVal > limit) {
        // Range zu groß! Flush Buffer mit lokalem Min
        for (let j = 0; j < buffer.length; j++) {
          result.push(buffer[j] - localMin);
        }

        buffer.length = 0;
        cuts++;

        // Reset für neue Segment
        minVal = currentValue;
        maxVal = currentValue;
      }

      buffer.push(currentValue);
    }

    // Flush verbleibende Buffer
    for (let j = 0; j < buffer.length; j++) {
      result.push(buffer[j] - minVal);
    }

    return { result, cuts };
  }

  /**
   * INTERNAL: Optimiere Height-Map
   *
   * - Smoothing für sanftere Übergänge (optional)
   * - Entfernung von Extremen
   * - Local Height Adjustments
   */
  _optimizeHeightMap(yMap, shadeMap) {
    if (!this.config.enableSmoothing) {
      return;
    }

    const width = yMap.length;
    const height = yMap[0].length;

    // Smoothing pass: Averaging mit Nachbarn
    for (let x = 1; x < width - 1; x++) {
      for (let z = 1; z < height - 1; z++) {
        // Nutze nur Nachbarn, nicht diagonal
        const neighbors = [
          yMap[x - 1][z],
          yMap[x + 1][z],
          yMap[x][z - 1],
          yMap[x][z + 1],
          yMap[x][z]
        ];

        const avg = Math.round(neighbors.reduce((a, b) => a + b) / neighbors.length);

        // Sanfte Anpassung (max 1 Block Unterschied)
        const current = yMap[x][z];
        if (Math.abs(current - avg) > 1) {
          yMap[x][z] = current + (avg > current ? 1 : -1);
        }
      }
    }
  }

  /**
   * PUBLIC: Validiere Height-Map
   */
  validateHeightMap(yMap, maxHeight) {
    const errors = [];
    const warnings = [];

    if (!yMap || !Array.isArray(yMap)) {
      return {
        valid: false,
        errors: ['Invalid yMap structure']
      };
    }

    if (yMap.length === 0) {
      errors.push('yMap is empty');
    }

    for (let x = 0; x < yMap.length; x++) {
      const column = yMap[x];

      if (!Array.isArray(column)) {
        errors.push(`Column ${x} is not an array`);
        continue;
      }

      for (let z = 0; z < column.length; z++) {
        const height = column[z];

        if (typeof height !== 'number') {
          errors.push(`Invalid height at [${x}][${z}]: ${typeof height}`);
        }

        if (height < 0) {
          errors.push(`Negative height at [${x}][${z}]: ${height}`);
        }

        if (height > maxHeight) {
          warnings.push(`Height exceeds limit at [${x}][${z}]: ${height} > ${maxHeight}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * PUBLIC: Gebe Height-Statistiken aus
   */
  getStatistics(yMap, shadeMap) {
    const stats = {
      width: yMap.length,
      height: yMap[0]?.length || 0,
      minHeight: Infinity,
      maxHeight: -Infinity,
      averageHeight: 0,
      medianHeight: 0,
      shadeDistribution: {
        normal: 0,
        dark: 0,
        light: 0,
        unknown: 0
      },
      flatPercentage: 0
    };

    if (stats.width === 0 || stats.height === 0) {
      return stats;
    }

    const allHeights = [];

    for (let x = 0; x < yMap.length; x++) {
      for (let z = 0; z < yMap[x].length; z++) {
        const height = yMap[x][z];
        allHeights.push(height);

        stats.minHeight = Math.min(stats.minHeight, height);
        stats.maxHeight = Math.max(stats.maxHeight, height);

        // Shade Distribution
        const shade = shadeMap[x][z];
        if (shade === 255) stats.shadeDistribution.normal++;
        else if (shade === 254) stats.shadeDistribution.dark++;
        else if (shade === 253) stats.shadeDistribution.light++;
        else stats.shadeDistribution.unknown++;
      }
    }

    // Calculate Average
    stats.averageHeight = Math.round(
      allHeights.reduce((a, b) => a + b) / allHeights.length
    );

    // Calculate Median
    allHeights.sort((a, b) => a - b);
    const mid = Math.floor(allHeights.length / 2);
    stats.medianHeight = allHeights[mid];

    // Calculate Flat Percentage (heights = 0)
    const flatCount = allHeights.filter(h => h === 0).length;
    stats.flatPercentage = ((flatCount / allHeights.length) * 100).toFixed(1) + '%';

    return stats;
  }

  /**
   * PUBLIC: Exportiere Height-Map als Grid
   */
  exportAsGrid(yMap, options = {}) {
    const { format = 'text', scale = 1 } = options;

    if (format === 'csv') {
      return this._exportCsv(yMap, scale);
    }

    // Text format (für Debugging)
    const grid = [];

    for (let z = 0; z < yMap[0].length; z++) {
      const row = [];

      for (let x = 0; x < yMap.length; x += scale) {
        const height = yMap[x][z];
        row.push(String(height).padStart(3));
      }

      grid.push(row.join(' '));
    }

    return grid.join('\n');
  }

  /**
   * INTERNAL: Export als CSV
   */
  _exportCsv(yMap, scale) {
    const rows = [];

    for (let z = 0; z < yMap[0].length; z++) {
      const row = [];

      for (let x = 0; x < yMap.length; x += scale) {
        row.push(yMap[x][z]);
      }

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HeightMapper
  };
}
