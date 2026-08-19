/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   ImageFrame - MAIN MODULE                                    ║
 * ║           Zentrale Integration aller Module & Bedrock API Binding            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Zentrale Koordination aller Module:
 * - Bedrock API Integration
 * - Spieler-Management
 * - Workflow-Orchestrierung
 * - Event-Handling
 * - State-Management
 *
 * @module main
 * @version 1.0.0
 */

/**
 * ImageFrame Hauptklasse - Zentrale API
 */
class ImageFrame {
  constructor(options = {}) {
    this.version = '1.0.0';

    // Module Inittialisierung
    this._initModules(options);

    // State
    this._sessions = new Map();          // playerName -> playerSession
    this._worldData = {
      initialized: false,
      startTime: Date.now(),
      totalImagesProcessed: 0,
      totalFramesApplied: 0
    };

    this._eventHandlers = new Map();
    this._initialized = false;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * INITIALIZATION
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Initialisiere alle Module
   */
  _initModules(options) {
    // Import/Require all modules
    if (typeof require !== 'undefined') {
      const path = require('path');
      const modulePath = path.join(__dirname);

      this.colorPalette = require('./colorPalette.js');
      this.ditheringEngine = require('./ditheringEngine.js');
      this.imageProcessor = require('./imageProcessor.js');
      this.imageLoader = require('./imageLoader.js');
      this.frameManager = require('./frameManager.js').FrameManager;
      this.storageManager = require('./storage.js').StorageManager;
      this.errorHandler = new (require('./errorHandler.js')).ErrorHandler();
      this.logger = new (require('./logger.js')).Logger(options.loggerConfig);
      this.validator = new (require('./validation.js')).ImageFrameValidator(options.validationConfig);
      this.heightMapper = new (require('./heightMapping.js')).HeightMapper(options.heightConfig);
      this.commandWriter = require('./commandWriter.js');
    } else {
      // Browser environment - alles ist global verfügbar
      this.logger = new Logger(options.loggerConfig);
      this.validator = new ImageFrameValidator(options.validationConfig);
      this.errorHandler = new ErrorHandler();
      this.heightMapper = new HeightMapper(options.heightConfig);
    }
  }

  /**
   * Hauptinitialisierung
   */
  async initialize(bedRockApi = null) {
    try {
      this.logger.info('ImageFrame initializing...', { version: this.version });

      // Binde Bedrock API
      this._bedRockApi = bedRockApi;

      // Initialisiere Storage
      const storageBackend = bedRockApi?.database || null;
      this.storageManager.initialize(storageBackend);

      this.logger.info('ImageFrame initialized successfully', {
        modules: 10,
        version: this.version
      });

      this._worldData.initialized = true;
      this._initialized = true;

      return { success: true };
    } catch (error) {
      const handled = this.errorHandler.handleError(error, {
        context: 'initialization'
      });

      this.logger.error('Initialization failed', { error: handled });
      return { success: false, error: handled };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * MAIN WORKFLOW: Process & Apply Image
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * HAUPTFUNKTION: Lade und verarbeite Bild
   */
  async processImage(imageUrl, processingParams, player) {
    const timerKey = this.logger.startOperation('processImage');

    try {
      // 1. VALIDATION: Rate Limit Check
      const rateLimit = this.validator.checkRateLimit(player.name);
      if (!rateLimit.allowed) {
        throw {
          code: 'RATE_LIMITED',
          message: `Too many requests. Reset in ${Math.round(rateLimit.resetIn / 1000)}s`,
          remaining: rateLimit.remaining
        };
      }

      // 2. VALIDATION: Input Validation
      const urlValidation = this.validator.validateImageUrl(imageUrl);
      if (!urlValidation.valid) {
        throw {
          code: 'INVALID_URL',
          errors: urlValidation.errors
        };
      }

      // 3. LOAD: Lade Bild mit Retry
      this.logger.debug('Loading image...', { url: imageUrl });

      const loadResult = await this.imageLoader.loadImage(imageUrl, {
        timeout: 30000,
        maxRetries: 3
      });

      if (!loadResult.success) {
        throw {
          code: 'IMAGE_LOAD_FAILED',
          error: loadResult.error
        };
      }

      const image = loadResult.image;
      this.logger.debug('Image loaded', {
        width: image.width,
        height: image.height,
        cached: loadResult.cached
      });

      // 4. VALIDATION: Image Validation
      const imageValidation = this.validator.validateLoadedImage(image);
      if (!imageValidation.valid) {
        throw {
          code: 'IMAGE_VALIDATION_FAILED',
          errors: imageValidation.errors
        };
      }

      // 5. VALIDATION: Parameter Validation
      const paramValidation = this.validator.validateProcessingParams(processingParams);
      if (!paramValidation.valid) {
        throw {
          code: 'INVALID_PARAMETERS',
          errors: paramValidation.errors
        };
      }

      // 6. PROCESS: Analysiere & verarbeite Bild
      this.logger.debug('Processing image...', {
        mapArea: processingParams.mapArea,
        dither: processingParams.dither,
        is3D: processingParams.is3D
      });

      const processResult = this._processImageInternal(
        image,
        processingParams
      );

      if (!processResult.success) {
        throw {
          code: 'PROCESSING_FAILED',
          error: processResult.error
        };
      }

      // 7. VALIDATION: Output Validation
      const outputValidation = this.validator.validateProcessingResult(processResult);
      if (!outputValidation.valid) {
        throw {
          code: 'OUTPUT_VALIDATION_FAILED',
          errors: outputValidation.errors
        };
      }

      // 8. SAVE: Speichere in Storage
      const imageId = this._generateImageId();
      const imageData = {
        id: imageId,
        name: processingParams.name || 'Unnamed Image',
        width: image.width,
        height: image.height,
        dither: processingParams.dither,
        is3D: processingParams.is3D,
        processingParams,
        finalImage: processResult.finalImage,
        shadeMap: processResult.shadeMap,
        processingTime: Date.now() - (this._worldData.startTime + Math.random())
      };

      const saveResult = this.storageManager.savePlayerData(player.name, imageId, imageData);

      if (!saveResult.success) {
        throw {
          code: 'STORAGE_FAILED',
          error: saveResult.error
        };
      }

      this._worldData.totalImagesProcessed++;

      this.logger.endOperation(timerKey, true);

      return {
        success: true,
        imageId,
        image: processResult.finalImage,
        preview: {
          width: processResult.previewWidth,
          height: processResult.previewHeight
        },
        quotaUsage: saveResult.quotaUsage
      };
    } catch (error) {
      const handled = this.errorHandler.handleError(error, {
        player: player?.name,
        imageUrl,
        operation: 'processImage'
      });

      this.logger.endOperation(timerKey, false);

      return {
        success: false,
        error: handled
      };
    }
  }

  /**
   * INTERNAL: Verarbeite Bild mit allen Pipelines
   */
  _processImageInternal(image, params) {
    try {
      const result = this._analysisImage(
        image,
        params.mapArea,
        params.palette,
        params.is3D,
        params.dither,
        params.maxHeight
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        finalImage: result.finalImage,
        shadeMap: result.shadeMap,
        resizedImage: result.resizedImage,
        previewWidth: result.previewWidth,
        previewScale: result.previewScale,
        heightTooLow: result.heightTooLow
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * WRAPPER: Image Analysis mit Palette-Building
   */
  _analysisImage(image, area, paletteString, is3D, dither, maxHeight) {
    // Nutze imageProcessor Logik
    if (typeof window !== 'undefined' && window.analyseImage) {
      return window.analyseImage(image, area, paletteString, is3D, dither, maxHeight);
    }

    // Server-side fallback
    return {
      success: false,
      error: 'analyseImage not available'
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * FRAME MANAGEMENT
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Starte Frame-Selection für Spieler
   */
  startFrameSelection(player) {
    try {
      const result = this.frameManager.startSelection(player);

      this.logger.info('Frame selection started', {
        player: player.name
      });

      return result;
    } catch (error) {
      const handled = this.errorHandler.handleError(error, {
        player: player?.name,
        operation: 'startFrameSelection'
      });

      return { success: false, error: handled };
    }
  }

  /**
   * Beende Frame-Selection
   */
  stopFrameSelection(player) {
    try {
      const result = this.frameManager.stopSelection(player);

      this.logger.info('Frame selection stopped', {
        player: player.name,
        frameCount: result.count
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Wende Bild auf selektierte Frames an
   */
  async applyImageToFrames(player, imageId) {
    const timerKey = this.logger.startOperation('applyImageToFrames');

    try {
      // Lade Image-Daten
      const loadResult = this.storageManager.loadPlayerData(player.name, imageId);

      if (!loadResult.success) {
        throw { code: 'IMAGE_NOT_FOUND', message: 'Image not found' };
      }

      const imageData = loadResult.data;

      // Hole selektierte Frames
      const frames = this.frameManager.getSelectedFrames(player);

      if (frames.length === 0) {
        throw { code: 'NO_FRAMES_SELECTED', message: 'No frames selected' };
      }

      // Appliziere auf Frames
      const result = await this.frameManager.applyImageToFrames(
        player,
        imageData,
        frames,
        {
          delay: 100,
          updateProgress: (progress) => {
            this.logger.debug(`Frame application progress: ${progress.current}/${progress.total}`, {
              player: player.name,
              imageId,
              progress
            });
          }
        }
      );

      this._worldData.totalFramesApplied += result.successful;

      this.logger.endOperation(timerKey, result.failed === 0);

      return {
        success: result.failed === 0,
        ...result
      };
    } catch (error) {
      const handled = this.errorHandler.handleError(error, {
        player: player?.name,
        imageId,
        operation: 'applyImageToFrames'
      });

      this.logger.endOperation(timerKey, false);

      return { success: false, error: handled };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PLAYER MANAGEMENT
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Erstelle/Hole Player-Session
   */
  getPlayerSession(player) {
    if (!this._sessions.has(player.name)) {
      this._sessions.set(player.name, {
        playerId: player.id,
        playerName: player.name,
        createdAt: Date.now(),
        images: [],
        selectedFrames: [],
        lastActivity: Date.now()
      });

      this.logger.info('Player session created', { player: player.name });
    }

    const session = this._sessions.get(player.name);
    session.lastActivity = Date.now();

    return session;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * UTILITY & INFO
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Hole System-Statistiken
   */
  getStatistics() {
    return {
      version: this.version,
      initialized: this._initialized,
      uptime: Date.now() - this._worldData.startTime,
      totalImagesProcessed: this._worldData.totalImagesProcessed,
      totalFramesApplied: this._worldData.totalFramesApplied,
      activeSessions: this._sessions.size,
      storage: this.storageManager.getStatistics(),
      logger: this.logger.getStatistics(),
      errorMetrics: this.errorHandler.getStatistics()
    };
  }

  /**
   * Health Check
   */
  getHealth() {
    const stats = this.getStatistics();

    return {
      status: this._initialized ? 'healthy' : 'initializing',
      modules: 10,
      activeSessions: stats.activeSessions,
      uptime: Math.round(stats.uptime / 1000) + 's',
      errors: stats.errorMetrics.totalErrors,
      storage: stats.storage.totalSize
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * INTERNAL UTILITIES
   * ═══════════════════════════════════════════════════════════════════════════
   */

  _generateImageId() {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.logger.info('ImageFrame shutting down...');

    this._sessions.clear();
    this.storageManager.destroy();
    this.logger.clear();

    this._initialized = false;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ImageFrame
  };
}

// Global availability
if (typeof window !== 'undefined') {
  window.ImageFrame = ImageFrame;
}
