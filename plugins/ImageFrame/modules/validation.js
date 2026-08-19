/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                  ImageFrame - VALIDATION MODULE                               ║
 * ║        Multi-Level Validierung: Input → Processing → Output Checks           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Umfassendes Validierungs-System mit:
 * - Input-Validierung (URLs, Images, Parameter)
 * - Processing-Validierung (Canvas, Dithering)
 * - Output-Validierung (Ergebnis-Integrität)
 * - Sicherheits-Checks (Limits, Timeouts, DoS-Protection)
 * - Detaillierte Error-Messages
 *
 * @module validation
 * @version 1.0.0
 */

/**
 * Validierungs-Konfiguration
 */
const ValidationConfig = {
  // Image-Constraints
  minImageWidth: 32,
  maxImageWidth: 4096,
  minImageHeight: 32,
  maxImageHeight: 4096,
  maxImageFileSize: 10 * 1024 * 1024,   // 10 MB
  supportedFormats: ['png', 'jpeg', 'jpg', 'webp', 'gif'],

  // Processing-Constraints
  minMapSize: 1,
  maxMapSize: 10,                        // 1280x1280 pixels
  maxProcessingTime: 120000,             // 120 Sekunden
  maxMemoryUsage: 500 * 1024 * 1024,    // 500 MB

  // Sicherheit
  maxConcurrentOperations: 10,
  requestTimeoutMs: 30000,
  maxRetries: 3,
  rateLimitPerHour: 100,

  // Validierungs-Levels
  performFullValidation: true,
  performSecurityChecks: true,
  performPerformanceChecks: true
};

/**
 * Validator Class - Zentrale Validierungs-Logik
 */
class ImageFrameValidator {
  constructor(config = {}) {
    this.config = { ...ValidationConfig, ...config };
    this._rateLimitCache = new Map();
    this._errorLog = [];
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * INPUT VALIDATION
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Validiere Image URL
   */
  validateImageUrl(url) {
    const errors = [];

    // URL-Format
    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        errors: ['URL must be a non-empty string']
      };
    }

    // URL-Struktur
    try {
      const parsed = new URL(url);

      // Protocol
      if (!['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol)) {
        errors.push(`Invalid protocol: ${parsed.protocol}. Must be http, https, data, or blob`);
      }

      // Domain-Whitelist (optinal, für Sicherheit)
      const trustedDomains = ['example.com', 'images.example.com'];
      // if (parsed.hostname && !trustedDomains.some(d => parsed.hostname.endsWith(d))) {
      //   errors.push(`Domain not whitelisted: ${parsed.hostname}`);
      // }
    } catch (error) {
      errors.push(`Invalid URL format: ${error.message}`);
    }

    // File-Format wenn erkennbar
    const ext = url.split('.').pop().toLowerCase();
    if (!url.startsWith('data:') && !this.config.supportedFormats.includes(ext)) {
      errors.push(`Unsupported file format: .${ext}. Supported: ${this.config.supportedFormats.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validiere geladenes Image
   */
  validateLoadedImage(image) {
    const errors = [];

    // Existenz
    if (!image) {
      return {
        valid: false,
        errors: ['No image loaded']
      };
    }

    // Typ
    if (!(image instanceof HTMLImageElement) && !(image instanceof HTMLCanvasElement)) {
      errors.push('Invalid image type (must be HTMLImageElement or HTMLCanvasElement)');
    }

    // Dimensionen
    if (image.width < this.config.minImageWidth) {
      errors.push(`Image width too small: ${image.width}px (minimum: ${this.config.minImageWidth}px)`);
    }

    if (image.width > this.config.maxImageWidth) {
      errors.push(`Image width too large: ${image.width}px (maximum: ${this.config.maxImageWidth}px)`);
    }

    if (image.height < this.config.minImageHeight) {
      errors.push(`Image height too small: ${image.height}px (minimum: ${this.config.minImageHeight}px)`);
    }

    if (image.height > this.config.maxImageHeight) {
      errors.push(`Image height too large: ${image.height}px (maximum: ${this.config.maxImageHeight}px)`);
    }

    // Aspect Ratio Check (nicht zu extrem)
    const aspectRatio = Math.max(image.width, image.height) / Math.min(image.width, image.height);
    if (aspectRatio > 10) {
      errors.push(`Image aspect ratio too extreme: ${aspectRatio.toFixed(2)}:1 (max 10:1)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata: {
        width: image.width,
        height: image.height,
        aspectRatio: (image.width / image.height).toFixed(2)
      }
    };
  }

  /**
   * Validiere Processing-Parameter
   */
  validateProcessingParams(params) {
    const errors = [];

    if (!params || typeof params !== 'object') {
      return {
        valid: false,
        errors: ['Parameters must be an object']
      };
    }

    // Map Size
    if (!params.mapArea || !Array.isArray(params.mapArea) || params.mapArea.length !== 2) {
      errors.push('mapArea must be [width, height]');
    } else {
      const [w, h] = params.mapArea;

      if (w < this.config.minMapSize || w > this.config.maxMapSize) {
        errors.push(`Map width out of range: ${w} (${this.config.minMapSize}-${this.config.maxMapSize})`);
      }

      if (h < this.config.minMapSize || h > this.config.maxMapSize) {
        errors.push(`Map height out of range: ${h} (${this.config.minMapSize}-${this.config.maxMapSize})`);
      }
    }

    // Palette
    if (!params.palette || typeof params.palette !== 'string') {
      errors.push('palette must be a space-separated string of color codes');
    } else if (params.palette.trim().split(' ').length === 0) {
      errors.push('palette must contain at least one color');
    }

    // Dithering
    const validDithers = ['none', 'floyd-steinberg', 'weak-bayer', 'strong-bayer', 'atkinson'];
    if (params.dither && !validDithers.includes(params.dither)) {
      errors.push(`Invalid dithering method: ${params.dither}. Valid: ${validDithers.join(', ')}`);
    }

    // 3D Options
    if (typeof params.is3D !== 'undefined' && typeof params.is3D !== 'boolean') {
      errors.push('is3D must be boolean');
    }

    if (params.is3D && (typeof params.maxHeight !== 'number' || params.maxHeight < 1 || params.maxHeight > 256)) {
      errors.push('maxHeight must be number between 1 and 256');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PROCESSING VALIDATION
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Validiere während Processing
   */
  validateProcessingProgress(progress) {
    const errors = [];

    if (!progress || typeof progress !== 'object') {
      return { valid: false, errors: ['Invalid progress object'] };
    }

    // Time Check
    if (progress.elapsed > this.config.maxProcessingTime) {
      errors.push(`Processing timeout: ${progress.elapsed}ms exceeds ${this.config.maxProcessingTime}ms`);
    }

    // Memory Check
    if (progress.memoryUsed > this.config.maxMemoryUsage) {
      errors.push(`Memory usage exceeded: ${(progress.memoryUsed / 1024 / 1024).toFixed(2)}MB > ${(this.config.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warning: progress.memoryUsed > this.config.maxMemoryUsage * 0.8 ?
        'High memory usage' : null
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * OUTPUT VALIDATION
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Validiere Processing-Ergebnis
   */
  validateProcessingResult(result) {
    const errors = [];
    const warnings = [];

    if (!result || typeof result !== 'object') {
      return {
        valid: false,
        errors: ['Invalid result object']
      };
    }

    // Erfolg-Flag
    if (typeof result.success !== 'boolean') {
      errors.push('Result must have success boolean');
    }

    // Finale Bilder
    if (!result.finalImage || !result.finalImage.data) {
      errors.push('finalImage data missing or invalid');
    }

    if (!result.resizedImage) {
      errors.push('resizedImage missing');
    }

    // Shade Map
    if (result.is3D && (!result.shadeMap || !Array.isArray(result.shadeMap))) {
      errors.push('shadeMap required for 3D but missing or invalid');
    }

    // Height-to-Low Warning
    if (result.heightTooLow > 0) {
      warnings.push(`Height limit was exceeded ${result.heightTooLow} times (may show visual artifacts)`);
    }

    // Preview-Daten
    if (result.previewWidth && result.previewHeight) {
      if (result.previewWidth < 64 || result.previewHeight < 64) {
        warnings.push('Preview size is small (may be hard to see)');
      }

      if (result.previewWidth > 2048 || result.previewHeight > 2048) {
        warnings.push('Preview size is large (may be slow)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      isValid3D: result.is3D === true && result.shadeMap !== undefined
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * SECURITY VALIDATION
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Rate-Limiting Check
   */
  checkRateLimit(playerName) {
    const key = `rate_${playerName}`;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    if (!this._rateLimitCache.has(key)) {
      this._rateLimitCache.set(key, []);
    }

    const requests = this._rateLimitCache.get(key);

    // Entferne alte Requests
    const recentRequests = requests.filter(t => t > oneHourAgo);
    this._rateLimitCache.set(key, recentRequests);

    // Prüfe Limit
    if (recentRequests.length >= this.config.rateLimitPerHour) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: recentRequests[0] + 60 * 60 * 1000 - now
      };
    }

    // Add current request
    recentRequests.push(now);

    return {
      allowed: true,
      remaining: this.config.rateLimitPerHour - recentRequests.length,
      resetIn: 60 * 60 * 1000
    };
  }

  /**
   * DoS-Protection Check
   */
  checkDosProtection(playerName, operation) {
    // Prüfe concurrent operations
    const key = `concurrent_${playerName}`;

    if (!this._rateLimitCache.has(key)) {
      this._rateLimitCache.set(key, 0);
    }

    const count = this._rateLimitCache.get(key);

    if (count >= this.config.maxConcurrentOperations) {
      return {
        allowed: false,
        error: `Too many concurrent operations (max ${this.config.maxConcurrentOperations})`
      };
    }

    return { allowed: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * COMPREHENSIVE VALIDATION
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Validiere kompletten Workflow
   */
  validateCompleteWorkflow(imageUrl, loadedImage, processingParams) {
    const results = {
      url: this.validateImageUrl(imageUrl),
      image: this.validateLoadedImage(loadedImage),
      params: this.validateProcessingParams(processingParams),
      allValid: true
    };

    results.allValid = results.url.valid && results.image.valid && results.params.valid;

    return results;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * UTILITY METHODS
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Log Validation Error
   */
  logValidationError(context, validation) {
    if (!validation.valid) {
      this._errorLog.push({
        timestamp: Date.now(),
        context,
        errors: validation.errors
      });
    }
  }

  /**
   * Get Error Log
   */
  getErrorLog(limit = 100) {
    return this._errorLog.slice(-limit);
  }

  /**
   * Clear Cache & Log
   */
  reset() {
    this._rateLimitCache.clear();
    this._errorLog = [];
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ImageFrameValidator,
    ValidationConfig
  };
}
