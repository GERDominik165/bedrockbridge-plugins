/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ImageFrame - IMAGE LOADER                                  ║
 * ║           Laden von Bildern mit Cache, Retry-Logik & Timeouts                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Robustes Image-Loading mit:
 * - In-Memory Caching
 * - Configurable Retry-Attempts
 * - Request-Timeouts
 * - Size Limits & Validation
 * - Progress Tracking
 *
 * @module imageLoader
 * @version 1.0.0
 */

/**
 * Image Cache - Speichert geladene Bilder mit Metadaten
 */
const ImageCache = {
  _cache: new Map(),
  _stats: {
    hits: 0,
    misses: 0,
    totalSize: 0,
    maxSize: 100 * 1024 * 1024 // 100 MB max cache
  },

  /**
   * Speichere Bild im Cache
   */
  set(url, imageData) {
    const size = this._estimateSize(imageData);

    // Prüfe auf Speicherplatz
    if (this._stats.totalSize + size > this._stats.maxSize) {
      this._evictLRU();
    }

    this._cache.set(url, {
      data: imageData,
      timestamp: Date.now(),
      size: size
    });

    this._stats.totalSize += size;
  },

  /**
   * Hole Bild aus Cache
   */
  get(url) {
    const cached = this._cache.get(url);

    if (!cached) {
      this._stats.misses++;
      return null;
    }

    // Prüfe TTL (30 Minuten Standard)
    const age = Date.now() - cached.timestamp;
    if (age > 30 * 60 * 1000) {
      this._cache.delete(url);
      this._stats.totalSize -= cached.size;
      this._stats.misses++;
      return null;
    }

    this._stats.hits++;
    return cached.data;
  },

  /**
   * Entferne ältestes Element (LRU)
   */
  _evictLRU() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [url, data] of this._cache) {
      if (data.timestamp < oldestTime) {
        oldestTime = data.timestamp;
        oldest = url;
      }
    }

    if (oldest) {
      const entry = this._cache.get(oldest);
      this._cache.delete(oldest);
      this._stats.totalSize -= entry.size;
    }
  },

  /**
   * Schätze Größe von Image-Daten
   */
  _estimateSize(imageData) {
    if (typeof imageData === 'string') {
      return imageData.length;
    }
    if (imageData instanceof Blob) {
      return imageData.size;
    }
    return 0;
  },

  /**
   * Gebe Cache-Statistiken aus
   */
  getStats() {
    return {
      ...this._stats,
      cacheSize: this._cache.size,
      hitRate: this._stats.hits / (this._stats.hits + this._stats.misses) || 0
    };
  },

  /**
   * Leere Cache
   */
  clear() {
    this._cache.clear();
    this._stats = {
      hits: 0,
      misses: 0,
      totalSize: 0,
      maxSize: 100 * 1024 * 1024
    };
  }
};

/**
 * Konfiguration für Image-Loading
 */
const LoaderConfig = {
  maxFileSize: 10 * 1024 * 1024,      // 10 MB
  timeout: 30000,                      // 30 Sekunden
  maxRetries: 3,
  retryDelay: 2000,                    // 2 Sekunden
  supportedFormats: ['png', 'jpeg', 'jpg', 'webp', 'gif'],
  enableCache: true,
  enableValidation: true
};

/**
 * HAUPTFUNKTION: Lade Bild von URL mit Retry-Logik
 *
 * @param {String} imageUrl - Bild-URL
 * @param {Object} options - Optionen
 * @param {Function} progressCallback - Progress Callback (bytes loaded, total)
 * @returns {Promise<{image: HTMLImageElement, url: String, success: Boolean, cached: Boolean, error: String}>}
 */
async function loadImage(imageUrl, options = {}, progressCallback = null) {
  const config = { ...LoaderConfig, ...options };

  // Prüfe Cache
  if (config.enableCache) {
    const cached = ImageCache.get(imageUrl);
    if (cached) {
      console.log(`[ImageLoader] Cache hit: ${imageUrl}`);
      return {
        image: cached.image,
        url: imageUrl,
        success: true,
        cached: true
      };
    }
  }

  // Versuche zu laden mit Retries
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await loadImageWithTimeout(imageUrl, config);

      // Validiere Bild wenn enabled
      if (config.enableValidation) {
        const validation = validateImage(result.image);
        if (!validation.valid) {
          throw new Error(`Image validation failed: ${validation.error}`);
        }
      }

      // Speichere im Cache
      if (config.enableCache) {
        ImageCache.set(imageUrl, result.image);
      }

      return {
        image: result.image,
        url: imageUrl,
        success: true,
        cached: false,
        attempt,
        loadTime: result.loadTime
      };
    } catch (error) {
      console.warn(`[ImageLoader] Attempt ${attempt + 1}/${config.maxRetries + 1} failed:`, error.message);

      // Letzer Versuch?
      if (attempt === config.maxRetries) {
        return {
          success: false,
          url: imageUrl,
          error: error.message,
          attempts: config.maxRetries + 1
        };
      }

      // Warte vor Retry
      await delay(config.retryDelay);
    }
  }

  return {
    success: false,
    url: imageUrl,
    error: 'Max retries exceeded'
  };
}

/**
 * Lade Bild mit Timeout
 */
function loadImageWithTimeout(imageUrl, config) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const timeout = setTimeout(() => {
      reject(new Error(`Load timeout after ${config.timeout}ms`));
    }, config.timeout);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timeout);
      const loadTime = performance.now() - startTime;
      resolve({ image: img, loadTime });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Image load failed'));
    };

    img.src = imageUrl;
  });
}

/**
 * Validiere geladenes Bild
 */
function validateImage(img) {
  if (!img) {
    return { valid: false, error: 'No image' };
  }

  if (img.width <= 0 || img.height <= 0) {
    return { valid: false, error: 'Invalid dimensions' };
  }

  if (img.width > 4096 || img.height > 4096) {
    return { valid: false, error: 'Image too large (max 4096x4096)' };
  }

  if (img.width < 32 || img.height < 32) {
    return { valid: false, error: 'Image too small (min 32x32)' };
  }

  return { valid: true };
}

/**
 * Validiere URL
 */
function validateUrl(url) {
  try {
    const parsed = new URL(url);

    // Prüfe Protocol
    if (!['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }

    // Prüfe File-Format wenn möglich
    if (parsed.pathname) {
      const ext = parsed.pathname.split('.').pop().toLowerCase();
      if (!LoaderConfig.supportedFormats.includes(ext) && !url.startsWith('data:')) {
        return { valid: false, error: `Unsupported format: ${ext}` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Resize Bild auf Target-Größe unter Beibehaltung des Aspect Ratio
 *
 * @param {HTMLImageElement} img - Quell-Bild
 * @param {Number} maxWidth - Max Breite
 * @param {Number} maxHeight - Max Höhe
 * @returns {HTMLCanvasElement} Resized Image als Canvas
 */
function resizeImage(img, maxWidth, maxHeight) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Berechne neue Größe (mit Aspect Ratio)
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // Zeichne resized
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Konvertiere Bild zu Data URL (für Speicherung)
 */
function imageToDataUrl(img, quality = 0.9) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL('image/png', quality);
}

/**
 * Hilfsfunktion: Warte (Delay)
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Lade mehrere Bilder parallel mit Promise.all
 */
async function loadImagesParallel(urls, options = {}) {
  const promises = urls.map(url => loadImage(url, options));
  return Promise.all(promises);
}

/**
 * Lade mehrere Bilder mit Limit (z.B. max 3 gleichzeitig)
 */
async function loadImagesWithLimit(urls, limit = 3, options = {}) {
  const results = [];
  const queue = [...urls];

  while (queue.length > 0) {
    const batch = queue.splice(0, limit);
    const batchResults = await Promise.all(batch.map(url => loadImage(url, options)));
    results.push(...batchResults);
  }

  return results;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadImage,
    validateUrl,
    validateImage,
    resizeImage,
    imageToDataUrl,
    loadImagesParallel,
    loadImagesWithLimit,
    ImageCache,
    LoaderConfig
  };
}
