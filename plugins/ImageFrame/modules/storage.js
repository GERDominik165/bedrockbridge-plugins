/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                  ImageFrame - STORAGE MODULE                                  ║
 * ║         Persistierung, Recovery, Garbage Collection & Quota Management        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Vollständiges Persistierungs-System mit:
 * - Strukturierte Daten-Organisation
 * - Automatic Garbage Collection
 * - Quota-Management & LRU-Eviction
 * - Session-Restore mit Integrität-Checks
 * - Fallback & Recovery-Mechanismen
 * - Audit-Logging aller Änderungen
 *
 * @module storage
 * @version 1.0.0
 */

/**
 * Storage Manager - Zentrale Persistierungs-Verwaltung
 */
const StorageManager = {
  // Konfiguration
  config: {
    maxStoragePerPlayer: 50 * 1024 * 1024,    // 50 MB pro Spieler
    maxImagesPerPlayer: 100,
    dataRetentionDays: 30,
    autoGcInterval: 60 * 60 * 1000,           // 1 Stunde
    enableAuditLog: true,
    enableCompression: true,
    quotaWarningThreshold: 0.8                // 80%
  },

  // State
  _storage: {},                              // playerName -> playerData
  _auditLog: [],                             // Audit-Einträge
  _gcTimer: null,                            // GC Timer ID
  _initialized: false,

  /**
   * INITIALISIERUNG
   */
  initialize(backendStorage = null) {
    if (this._initialized) return;

    console.log('[StorageManager] Initializing...');

    // Backend können sein: localStorage, bridge.database, custom
    this._backend = backendStorage || new DefaultStorageBackend();

    // Starte Auto-GC
    this._startAutoGc();

    // Lade alle Spieler-Daten
    this._loadAllData();

    this._initialized = true;
    this._audit('SYSTEM', 'INIT', 'Storage Manager initialized');

    return { success: true };
  },

  /**
   * PLAYER-DATEN SPEICHERN
   */
  savePlayerData(playerName, imageId, imageData) {
    if (!this._initialized) {
      return { success: false, error: 'Storage not initialized' };
    }

    // Validiere Input
    if (!this._validateInput(playerName, imageData)) {
      return { success: false, error: 'Invalid input data' };
    }

    try {
      // Hole oder erstelle Player-Daten
      if (!this._storage[playerName]) {
        this._storage[playerName] = {
          playerId: this._generateId(),
          images: new Map(),
          totalSize: 0,
          lastModified: Date.now(),
          createdAt: Date.now(),
          metadata: {}
        };
      }

      const playerData = this._storage[playerName];

      // Prüfe Quota
      const estimatedSize = this._estimateSize(imageData);
      if (playerData.totalSize + estimatedSize > this.config.maxStoragePerPlayer) {
        // Versuche Space freizugeben
        if (!this._freeSpace(playerName, estimatedSize)) {
          return {
            success: false,
            error: 'Storage quota exceeded',
            current: playerData.totalSize,
            required: estimatedSize,
            max: this.config.maxStoragePerPlayer
          };
        }
      }

      // Prüfe Image-Limit
      if (playerData.images.size >= this.config.maxImagesPerPlayer) {
        return {
          success: false,
          error: 'Max images per player exceeded',
          current: playerData.images.size,
          max: this.config.maxImagesPerPlayer
        };
      }

      // Speichere Image-Daten
      const compressedData = this.config.enableCompression ? this._compress(imageData) : imageData;

      const imageRecord = {
        id: imageId,
        data: compressedData,
        size: estimatedSize,
        savedAt: Date.now(),
        hash: this._calculateHash(imageData),
        metadata: {
          name: imageData.name || 'Unnamed Image',
          width: imageData.width,
          height: imageData.height,
          dither: imageData.dither,
          is3D: imageData.is3D
        }
      };

      playerData.images.set(imageId, imageRecord);
      playerData.totalSize += estimatedSize;
      playerData.lastModified = Date.now();

      // Persistiere
      this._persistPlayerData(playerName);

      // Audit
      this._audit(playerName, 'SAVE_IMAGE', {
        imageId,
        size: estimatedSize,
        totalSize: playerData.totalSize
      });

      // Quota-Warning
      const quotaUsage = playerData.totalSize / this.config.maxStoragePerPlayer;
      if (quotaUsage > this.config.quotaWarningThreshold) {
        console.warn(`[Storage] Quota warning for ${playerName}: ${(quotaUsage * 100).toFixed(1)}%`);
      }

      return {
        success: true,
        imageId,
        size: estimatedSize,
        quotaUsage: (quotaUsage * 100).toFixed(1) + '%'
      };
    } catch (error) {
      this._audit(playerName, 'SAVE_ERROR', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * PLAYER-DATEN LADEN
   */
  loadPlayerData(playerName, imageId = null) {
    try {
      // Lade falls nicht im Memory
      if (!this._storage[playerName]) {
        const loaded = this._loadPlayerData(playerName);
        if (!loaded) {
          return { success: false, error: 'Player data not found' };
        }
      }

      const playerData = this._storage[playerName];

      if (!playerData) {
        return { success: false, error: 'Player data not found' };
      }

      // Spezifisches Image?
      if (imageId) {
        const imageRecord = playerData.images.get(imageId);

        if (!imageRecord) {
          return { success: false, error: 'Image not found' };
        }

        // Dekomprimiere
        const data = this.config.enableCompression ? this._decompress(imageRecord.data) : imageRecord.data;

        // Validiere Integrität
        const hash = this._calculateHash(data);
        if (hash !== imageRecord.hash) {
          console.error(`[Storage] Data integrity check failed for ${playerName}:${imageId}`);
          return { success: false, error: 'Data integrity check failed' };
        }

        this._audit(playerName, 'LOAD_IMAGE', { imageId });

        return {
          success: true,
          data,
          metadata: imageRecord.metadata,
          savedAt: imageRecord.savedAt
        };
      }

      // Alle Images
      const images = Array.from(playerData.images.values()).map(record => ({
        id: record.id,
        metadata: record.metadata,
        savedAt: record.savedAt,
        size: record.size
      }));

      this._audit(playerName, 'LIST_IMAGES', { count: images.length });

      return {
        success: true,
        playerData: {
          playerId: playerData.playerId,
          createdAt: playerData.createdAt,
          lastModified: playerData.lastModified,
          totalSize: playerData.totalSize,
          imageCount: images.length,
          quotaUsage: (playerData.totalSize / this.config.maxStoragePerPlayer * 100).toFixed(1) + '%'
        },
        images
      };
    } catch (error) {
      this._audit(playerName, 'LOAD_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * LÖSCHEN VON IMAGE
   */
  deleteImage(playerName, imageId) {
    try {
      const playerData = this._storage[playerName];

      if (!playerData) {
        return { success: false, error: 'Player not found' };
      }

      const imageRecord = playerData.images.get(imageId);

      if (!imageRecord) {
        return { success: false, error: 'Image not found' };
      }

      // Löschen
      playerData.images.delete(imageId);
      playerData.totalSize -= imageRecord.size;
      playerData.lastModified = Date.now();

      this._persistPlayerData(playerName);

      this._audit(playerName, 'DELETE_IMAGE', {
        imageId,
        freedSize: imageRecord.size
      });

      return {
        success: true,
        freedSize: imageRecord.size,
        remainingSize: playerData.totalSize
      };
    } catch (error) {
      this._audit(playerName, 'DELETE_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * GARBAGE COLLECTION - Automatisches Aufräumen
   */
  performGc(targetQuotaPercent = 0.7) {
    console.log('[StorageManager] Running garbage collection...');

    const results = {
      playersProcessed: 0,
      imagesDeleted: 0,
      bytesFreed: 0,
      startTime: Date.now()
    };

    for (const playerName in this._storage) {
      const playerData = this._storage[playerName];
      const currentUsage = playerData.totalSize / this.config.maxStoragePerPlayer;

      if (currentUsage > targetQuotaPercent) {
        const targetSize = this.config.maxStoragePerPlayer * targetQuotaPercent;
        let toDelete = playerData.totalSize - targetSize;

        // Sortiere Images nach Age (älteste zuerst)
        const sorted = Array.from(playerData.images.entries())
          .sort((a, b) => a[1].savedAt - b[1].savedAt);

        for (const [imageId, record] of sorted) {
          if (toDelete <= 0) break;

          playerData.images.delete(imageId);
          playerData.totalSize -= record.size;
          toDelete -= record.size;

          results.imagesDeleted++;
          results.bytesFreed += record.size;

          this._audit(playerName, 'GC_DELETE', { imageId, reason: 'quota_excess' });
        }

        results.playersProcessed++;
      }

      // Prüfe auf alte Daten (älter als configurable days)
      const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
      const toDeleteOld = [];

      for (const [imageId, record] of playerData.images) {
        if (record.savedAt < cutoffTime) {
          toDeleteOld.push(imageId);
        }
      }

      for (const imageId of toDeleteOld) {
        const record = playerData.images.get(imageId);
        playerData.images.delete(imageId);
        playerData.totalSize -= record.size;

        results.imagesDeleted++;
        results.bytesFreed += record.size;

        this._audit(playerName, 'GC_DELETE', { imageId, reason: 'retention_expired' });
      }

      this._persistPlayerData(playerName);
    }

    results.duration = Date.now() - results.startTime;
    console.log(`[StorageManager] GC completed: ${results.imagesDeleted} images deleted, ${(results.bytesFreed / 1024 / 1024).toFixed(2)} MB freed`);

    return results;
  },

  /**
   * INTERNAL: Starte Auto-GC Timer
   */
  _startAutoGc() {
    if (this._gcTimer) clearInterval(this._gcTimer);

    this._gcTimer = setInterval(() => {
      this.performGc();
    }, this.config.autoGcInterval);
  },

  /**
   * INTERNAL: Versuche Space freizumachen
   */
  _freeSpace(playerName, requiredSize) {
    const playerData = this._storage[playerName];
    let freed = 0;

    // Lösche älteste Images bis genug Platz
    const sorted = Array.from(playerData.images.entries())
      .sort((a, b) => a[1].savedAt - b[1].savedAt);

    for (const [imageId, record] of sorted) {
      if (freed >= requiredSize) break;

      playerData.images.delete(imageId);
      playerData.totalSize -= record.size;
      freed += record.size;

      this._audit(playerName, 'AUTO_DELETE', { imageId, reason: 'space_shortage' });
    }

    return freed >= requiredSize;
  },

  /**
   * INTERNAL: Persistiere zu Backend
   */
  _persistPlayerData(playerName) {
    const playerData = this._storage[playerName];

    // Konvertiere Maps zu Objects für Serialization
    const serialized = {
      playerId: playerData.playerId,
      images: Object.fromEntries(playerData.images),
      totalSize: playerData.totalSize,
      lastModified: playerData.lastModified,
      createdAt: playerData.createdAt,
      metadata: playerData.metadata
    };

    return this._backend.set(`imageframe:${playerName}`, serialized);
  },

  /**
   * INTERNAL: Lade Spieler-Daten von Backend
   */
  _loadPlayerData(playerName) {
    const data = this._backend.get(`imageframe:${playerName}`);

    if (!data) return false;

    const playerData = {
      playerId: data.playerId,
      images: new Map(Object.entries(data.images || {})),
      totalSize: data.totalSize,
      lastModified: data.lastModified,
      createdAt: data.createdAt,
      metadata: data.metadata
    };

    this._storage[playerName] = playerData;
    return true;
  },

  /**
   * INTERNAL: Lade alle Spieler-Daten
   */
  _loadAllData() {
    const allKeys = this._backend.keys();

    for (const key of allKeys) {
      if (key.startsWith('imageframe:')) {
        const playerName = key.replace('imageframe:', '');
        this._loadPlayerData(playerName);
      }
    }
  },

  /**
   * INTERNAL: Validierung
   */
  _validateInput(playerName, imageData) {
    if (!playerName || typeof playerName !== 'string') return false;
    if (!imageData || typeof imageData !== 'object') return false;
    return true;
  },

  /**
   * INTERNAL: Größen-Schätzung
   */
  _estimateSize(data) {
    if (typeof data === 'string') return data.length;
    if (typeof data === 'object') return JSON.stringify(data).length;
    return 0;
  },

  /**
   * INTERNAL: Kompression (simple Base64 encoding)
   */
  _compress(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return btoa(str);
  },

  /**
   * INTERNAL: Dekompression
   */
  _decompress(compressed) {
    return atob(compressed);
  },

  /**
   * INTERNAL: Hash für Integrität
   */
  _calculateHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  },

  /**
   * INTERNAL: ID generieren
   */
  _generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  },

  /**
   * INTERNAL: Audit-Logging
   */
  _audit(playerName, action, details = {}) {
    if (!this.config.enableAuditLog) return;

    this._auditLog.push({
      timestamp: Date.now(),
      playerName,
      action,
      details,
      level: action.includes('ERROR') ? 'ERROR' : 'INFO'
    });

    // Halte nur letzte 10000 Einträge
    if (this._auditLog.length > 10000) {
      this._auditLog = this._auditLog.slice(-10000);
    }
  },

  /**
   * PUBLIC: Hole Audit-Log
   */
  getAuditLog(playerName = null, limit = 100) {
    let log = this._auditLog;

    if (playerName) {
      log = log.filter(entry => entry.playerName === playerName);
    }

    return log.slice(-limit);
  },

  /**
   * PUBLIC: Hole Statistiken
   */
  getStatistics() {
    let totalPlayers = 0;
    let totalImages = 0;
    let totalSize = 0;

    for (const playerName in this._storage) {
      const playerData = this._storage[playerName];
      totalPlayers++;
      totalImages += playerData.images.size;
      totalSize += playerData.totalSize;
    }

    return {
      totalPlayers,
      totalImages,
      totalSize,
      averageSizePerPlayer: totalPlayers > 0 ? (totalSize / totalPlayers).toFixed(0) : 0,
      maxStorage: this.config.maxStoragePerPlayer,
      auditLogSize: this._auditLog.length
    };
  },

  /**
   * PUBLIC: Cleanup
   */
  destroy() {
    if (this._gcTimer) {
      clearInterval(this._gcTimer);
    }

    this._storage = {};
    this._auditLog = [];
    this._initialized = false;
  }
};

/**
 * Default Storage Backend (In-Memory, mit Fallback zu localStorage)
 */
class DefaultStorageBackend {
  constructor() {
    this._data = {};
    this._canUseLocalStorage = typeof localStorage !== 'undefined';
  }

  set(key, value) {
    this._data[key] = value;

    // Fallback zu localStorage wenn verfügbar
    if (this._canUseLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn('[Storage] localStorage write failed:', e.message);
      }
    }

    return true;
  }

  get(key) {
    // Versuche erst in-memory
    if (key in this._data) {
      return this._data[key];
    }

    // Fallback zu localStorage
    if (this._canUseLocalStorage) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.warn('[Storage] localStorage read failed:', e.message);
      }
    }

    return null;
  }

  keys() {
    if (this._canUseLocalStorage) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      return [...Object.keys(this._data), ...keys];
    }

    return Object.keys(this._data);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StorageManager,
    DefaultStorageBackend
  };
}
