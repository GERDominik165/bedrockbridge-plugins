/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   ImageFrame - FRAME MANAGER                                  ║
 * ║         Item Frame Selection, Batch Application & Interaction Handling        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Verwaltet Item Frames und deren Interaktionen:
 * - Frame-Auswahl (Click-basiert)
 * - Batch-Operationen mit Progress
 * - Frame-Validierung
 * - Rotation & Glowing-Effekte
 * - Persistent Frame-Mapping
 *
 * @module frameManager
 * @version 1.0.0
 */

/**
 * Frame Manager State
 */
const FrameManager = {
  _selectedFrames: new Map(),       // playerName -> [frame locations]
  _selectionMode: new Map(),        // playerName -> boolean
  _frameData: new Map(),            // locationKey -> {imageId, playerId, rotation}
  _frameBlocks: new Map(),          // locationKey -> block entity

  /**
   * Starte Selection-Mode für Spieler
   */
  startSelection(player) {
    const playerName = player.name;

    if (!this._selectedFrames.has(playerName)) {
      this._selectedFrames.set(playerName, []);
    }

    this._selectionMode.set(playerName, true);
    console.log(`[FrameManager] Selection started for ${playerName}`);

    return {
      success: true,
      message: `Selection mode ON - rechtsklick auf Item Frames`
    };
  },

  /**
   * Beende Selection-Mode
   */
  stopSelection(player) {
    const playerName = player.name;
    const selectedFrames = this._selectedFrames.get(playerName) || [];

    this._selectionMode.set(playerName, false);
    console.log(`[FrameManager] Selection ended for ${playerName} - ${selectedFrames.length} frames`);

    return {
      success: true,
      count: selectedFrames.length,
      message: `Selection beendet - ${selectedFrames.length} Frames ausgewählt`
    };
  },

  /**
   * Prüfe ob Selection aktiv ist
   */
  isSelectionActive(player) {
    return this._selectionMode.get(player.name) || false;
  },

  /**
   * Addiere Frame zur Selection
   */
  addFrameToSelection(player, frameLocation) {
    const playerName = player.name;

    if (!this.isSelectionActive(player)) {
      return { success: false, error: 'Selection not active' };
    }

    // Validiere Frame
    const validation = this._validateFrame(frameLocation);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const locationKey = this._locationToKey(frameLocation);
    const selected = this._selectedFrames.get(playerName) || [];

    // Prüfe auf Duplikat
    if (selected.some(loc => this._locationToKey(loc) === locationKey)) {
      return { success: false, error: 'Frame already selected' };
    }

    selected.push(frameLocation);
    this._selectedFrames.set(playerName, selected);

    console.log(`[FrameManager] Frame added for ${playerName} at ${locationKey}`);

    return {
      success: true,
      totalSelected: selected.length,
      message: `Frame ${locationKey} hinzugefügt (${selected.length} total)`
    };
  },

  /**
   * Entferne Frame aus Selection
   */
  removeFrameFromSelection(player, frameLocation) {
    const playerName = player.name;
    const locationKey = this._locationToKey(frameLocation);
    const selected = this._selectedFrames.get(playerName) || [];

    const before = selected.length;
    const filtered = selected.filter(loc => this._locationToKey(loc) !== locationKey);

    this._selectedFrames.set(playerName, filtered);

    return {
      success: before !== filtered.length,
      totalSelected: filtered.length
    };
  },

  /**
   * Hole alle selektierten Frames
   */
  getSelectedFrames(player) {
    return this._selectedFrames.get(player.name) || [];
  },

  /**
   * Cleaer alle selektierten Frames
   */
  clearSelection(player) {
    const playerName = player.name;
    const count = this.getSelectedFrames(player).length;

    this._selectedFrames.set(playerName, []);

    return {
      success: true,
      clearedCount: count
    };
  },

  /**
   * Wende Bild auf mehrere Frames an (Batch)
   * Mit Progress-Tracking und Error-Recovery
   */
  async applyImageToFrames(player, imageData, frames, options = {}) {
    const {
      delay = 100,          // ms zwischen Frames
      updateProgress = null // Progress callback
    } = options;

    const results = {
      successful: 0,
      failed: 0,
      total: frames.length,
      errors: [],
      startTime: Date.now()
    };

    // Validiere Image
    if (!imageData || !imageData.data) {
      return {
        ...results,
        success: false,
        error: 'Invalid image data'
      };
    }

    // Appliziere auf jeden Frame
    for (let i = 0; i < frames.length; i++) {
      try {
        const frame = frames[i];
        const locationKey = this._locationToKey(frame);

        // Validiere Frame
        const validation = this._validateFrame(frame);
        if (!validation.valid) {
          results.failed++;
          results.errors.push({
            location: locationKey,
            error: validation.error
          });
          continue;
        }

        // Appliziere Bild
        const applied = await this._applyImageToSingleFrame(player, frame, imageData);

        if (applied.success) {
          results.successful++;

          // Speichere Frame-Mapping
          this._frameData.set(locationKey, {
            imageId: imageData.id,
            playerId: player.id,
            appliedTime: Date.now()
          });
        } else {
          results.failed++;
          results.errors.push({
            location: locationKey,
            error: applied.error
          });
        }

        // Progress Callback
        if (updateProgress) {
          updateProgress({
            current: i + 1,
            total: frames.length,
            successful: results.successful,
            failed: results.failed
          });
        }

        // Delay zwischen Frames
        if (i < frames.length - 1) {
          await this._delay(delay);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          frameIndex: i,
          error: error.message
        });
      }
    }

    results.success = results.failed === 0;
    results.duration = Date.now() - results.startTime;
    results.averageTimePerFrame = Math.round(results.duration / results.total);

    return results;
  },

  /**
   * Appliziere Bild auf einzelnen Frame (intern)
   */
  async _applyImageToSingleFrame(player, frameLocation, imageData) {
    try {
      // Hole Block Entity
      const blockEntity = this._getBlockEntity(frameLocation);
      if (!blockEntity) {
        return { success: false, error: 'Block entity not found' };
      }

      // Prüfe ob Item Frame
      const frameType = blockEntity.type;
      const validTypes = ['minecraft:item_frame', 'minecraft:glow_item_frame'];
      if (!validTypes.includes(frameType)) {
        return { success: false, error: 'Not an item frame' };
      }

      // Setze Map Item
      const mapItem = this._createMapItem(imageData);
      blockEntity.setItem(mapItem);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Hole Block Entity an Position
   * (Bedrock API spezifisch)
   */
  _getBlockEntity(location) {
    try {
      // Mit world/dimension API
      if (typeof location.dimension !== 'undefined') {
        return location.dimension.getBlockEntity(location);
      }

      // Fallback wenn direct BlockEntity
      return location.blockEntity || location;
    } catch (error) {
      return null;
    }
  },

  /**
   * Erstelle Map-Item aus ImageData
   */
  _createMapItem(imageData) {
    // Bedrock-spezifische Implementation
    // Würde Map mit NBT-Daten erstellen
    return {
      typeId: 'minecraft:filled_map',
      nameTag: 'Pixelart Map',
      mapDisplayName: imageData.name || 'Image Map',
      data: imageData
    };
  },

  /**
   * Validiere Frame
   */
  _validateFrame(frameLocation) {
    if (!frameLocation) {
      return { valid: false, error: 'No location' };
    }

    if (typeof frameLocation !== 'object') {
      return { valid: false, error: 'Invalid location type' };
    }

    if (!('x' in frameLocation) || !('y' in frameLocation) || !('z' in frameLocation)) {
      return { valid: false, error: 'Missing coordinates' };
    }

    return { valid: true };
  },

  /**
   * Konvertiere Location zu eindeutigem Key
   */
  _locationToKey(location) {
    return `${location.x}|${location.y}|${location.z}`;
  },

  /**
   * Delay-Helper
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Hole Frame-Metadaten
   */
  getFrameData(location) {
    const key = this._locationToKey(location);
    return this._frameData.get(key) || null;
  },

  /**
   * Setze Frame-Rotation
   */
  setFrameRotation(frameLocation, rotation) {
    try {
      const blockEntity = this._getBlockEntity(frameLocation);
      if (!blockEntity) {
        return { success: false, error: 'Block entity not found' };
      }

      // Rotation: 0-7 (8 Richtungen)
      blockEntity.setRotation(Math.max(0, Math.min(7, rotation)));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Setze Glowing-Effekt
   */
  setFrameGlowing(frameLocation, glowing) {
    try {
      const blockEntity = this._getBlockEntity(frameLocation);
      if (!blockEntity) {
        return { success: false, error: 'Block entity not found' };
      }

      if ('setGlowing' in blockEntity) {
        blockEntity.setGlowing(glowing);
      } else if ('glowing' in blockEntity) {
        blockEntity.glowing = glowing;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Gebe Statistiken aus
   */
  getStatistics() {
    let totalSelected = 0;
    let totalFrameMappings = 0;

    for (const frames of this._selectedFrames.values()) {
      totalSelected += frames.length;
    }

    totalFrameMappings = this._frameData.size;

    return {
      activeSelections: this._selectionMode.size,
      totalSelectedFrames: totalSelected,
      totalFrameMappings,
      cacheSize: totalFrameMappings
    };
  },

  /**
   * Cleaer alle Daten
   */
  clear() {
    this._selectedFrames.clear();
    this._selectionMode.clear();
    this._frameData.clear();
    this._frameBlocks.clear();
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FrameManager
  };
}
