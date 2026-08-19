/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   ImageFrame - ERROR HANDLER MODULE                           ║
 * ║         Strukturiertes Error-Handling, Recovery & Fallbacks                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Professionelles Error-Management mit:
 * - Fehler-Kategorisierung & Codes
 * - Recovery-Strategien
 * - Retry-Logik mit Backoff
 * - Error-Logging & Monitoring
 * - User-friendly Meldungen
 * - Graceful Degradation
 *
 * @module errorHandler
 * @version 1.0.0
 */

/**
 * Fehler-Katalog - Alle möglichen Fehler definiert
 */
const ErrorCatalog = {
  // Network Errors (NET_*)
  NET_TIMEOUT: {
    code: 'NET_001',
    name: 'Network Timeout',
    message: 'Request took too long to complete',
    recoverable: true,
    suggestedAction: 'retry_with_backoff',
    httpCodes: [408, 504]
  },
  NET_UNREACHABLE: {
    code: 'NET_002',
    name: 'Network Unreachable',
    message: 'Cannot reach the server',
    recoverable: true,
    suggestedAction: 'check_connection',
    httpCodes: [0]
  },
  NET_INVALID_URL: {
    code: 'NET_003',
    name: 'Invalid URL',
    message: 'URL format is invalid',
    recoverable: false,
    suggestedAction: 'user_input_required'
  },
  NET_CORS_ERROR: {
    code: 'NET_004',
    name: 'CORS Error',
    message: 'Cross-Origin request blocked',
    recoverable: false,
    suggestedAction: 'server_configuration'
  },

  // Image Errors (IMG_*)
  IMG_LOAD_FAILED: {
    code: 'IMG_001',
    name: 'Image Load Failed',
    message: 'Could not load the image',
    recoverable: true,
    suggestedAction: 'retry_or_different_url'
  },
  IMG_FORMAT_UNSUPPORTED: {
    code: 'IMG_002',
    name: 'Unsupported Format',
    message: 'Image format is not supported',
    recoverable: false,
    suggestedAction: 'convert_image_format'
  },
  IMG_TOO_LARGE: {
    code: 'IMG_003',
    name: 'Image Too Large',
    message: 'Image exceeds maximum size',
    recoverable: false,
    suggestedAction: 'resize_image'
  },
  IMG_TOO_SMALL: {
    code: 'IMG_004',
    name: 'Image Too Small',
    message: 'Image is below minimum size',
    recoverable: false,
    suggestedAction: 'user_input_required'
  },
  IMG_DIMENSIONS_INVALID: {
    code: 'IMG_005',
    name: 'Invalid Dimensions',
    message: 'Image dimensions are invalid',
    recoverable: false,
    suggestedAction: 'user_input_required'
  },
  IMG_CORRUPTED: {
    code: 'IMG_006',
    name: 'Image Corrupted',
    message: 'Image data is corrupted',
    recoverable: true,
    suggestedAction: 'retry_or_different_image'
  },

  // Processing Errors (PROC_*)
  PROC_TIMEOUT: {
    code: 'PROC_001',
    name: 'Processing Timeout',
    message: 'Image processing took too long',
    recoverable: true,
    suggestedAction: 'try_smaller_image'
  },
  PROC_MEMORY: {
    code: 'PROC_002',
    name: 'Out of Memory',
    message: 'Not enough memory for operation',
    recoverable: true,
    suggestedAction: 'free_memory_try_again'
  },
  PROC_CANVAS_ERROR: {
    code: 'PROC_003',
    name: 'Canvas Error',
    message: 'Canvas operation failed',
    recoverable: true,
    suggestedAction: 'retry'
  },
  PROC_VALIDATION_FAILED: {
    code: 'PROC_004',
    name: 'Validation Failed',
    message: 'Processing parameters validation failed',
    recoverable: false,
    suggestedAction: 'check_parameters'
  },

  // Storage Errors (STR_*)
  STR_QUOTA_EXCEEDED: {
    code: 'STR_001',
    name: 'Storage Quota Exceeded',
    message: 'Insufficient storage space',
    recoverable: true,
    suggestedAction: 'delete_old_images'
  },
  STR_WRITE_FAILED: {
    code: 'STR_002',
    name: 'Write Failed',
    message: 'Could not write to storage',
    recoverable: true,
    suggestedAction: 'retry'
  },
  STR_READ_FAILED: {
    code: 'STR_003',
    name: 'Read Failed',
    message: 'Could not read from storage',
    recoverable: true,
    suggestedAction: 'retry'
  },
  STR_CORRUPTED: {
    code: 'STR_004',
    name: 'Data Corrupted',
    message: 'Stored data appears corrupted',
    recoverable: true,
    suggestedAction: 'delete_and_reload'
  },

  // Permission/Auth Errors (PERM_*)
  PERM_DENIED: {
    code: 'PERM_001',
    name: 'Permission Denied',
    message: 'You do not have permission for this operation',
    recoverable: false,
    suggestedAction: 'contact_admin'
  },
  PERM_INSUFFICIENT_QUOTA: {
    code: 'PERM_002',
    name: 'Insufficient Quota',
    message: 'Your quota is insufficient',
    recoverable: true,
    suggestedAction: 'wait_or_delete_items'
  },

  // Frame Errors (FRAME_*)
  FRAME_NOT_FOUND: {
    code: 'FRAME_001',
    name: 'Frame Not Found',
    message: 'Item frame not found at location',
    recoverable: false,
    suggestedAction: 'select_valid_frame'
  },
  FRAME_APPLY_FAILED: {
    code: 'FRAME_002',
    name: 'Frame Apply Failed',
    message: 'Could not apply image to frame',
    recoverable: true,
    suggestedAction: 'retry'
  },
  FRAME_INVALID: {
    code: 'FRAME_003',
    name: 'Invalid Frame',
    message: 'Frame data is invalid',
    recoverable: false,
    suggestedAction: 'select_valid_frame'
  },

  // Generic Errors
  UNKNOWN: {
    code: 'ERR_999',
    name: 'Unknown Error',
    message: 'An unexpected error occurred',
    recoverable: true,
    suggestedAction: 'contact_support'
  }
};

/**
 * Error Handler - Zentrale Fehlerbehandlung
 */
class ErrorHandler {
  constructor() {
    this._errorLog = [];
    this._recoveryCounts = new Map();
    this._activeRecoveries = new Map();
  }

  /**
   * Hauptfunktion: Handle Error
   */
  handleError(error, context = {}) {
    // Normalisiere Error zu Standard-Format
    const normalized = this._normalizeError(error);

    // Finde passenden Katalog-Eintrag
    const catalogEntry = this._findCatalogEntry(normalized);

    // Baue Error-Objekt
    const errorObject = {
      code: catalogEntry.code,
      name: catalogEntry.name,
      message: catalogEntry.message,
      originalError: error.message || error.toString(),
      recoverable: catalogEntry.recoverable,
      suggestedAction: catalogEntry.suggestedAction,
      context,
      timestamp: Date.now(),
      userMessage: this._buildUserMessage(catalogEntry, context)
    };

    // Loggen
    this._logError(errorObject);

    // Versuche Recovery wenn möglich
    if (errorObject.recoverable) {
      const recovery = this._getRecoveryStrategy(catalogEntry.suggestedAction);
      errorObject.recovery = recovery;
    }

    return errorObject;
  }

  /**
   * Versuche Error zu Recovery
   */
  async attemptRecovery(errorCode, context = {}, maxRetries = 3) {
    const catalogEntry = this._findCatalogByCode(errorCode);

    if (!catalogEntry || !catalogEntry.recoverable) {
      return {
        success: false,
        error: 'Error is not recoverable'
      };
    }

    const recoveryKey = `${errorCode}_${context.identifier || 'default'}`;
    let retryCount = this._recoveryCounts.get(recoveryKey) || 0;

    if (retryCount >= maxRetries) {
      return {
        success: false,
        error: 'Max recovery attempts exceeded',
        attempts: retryCount
      };
    }

    try {
      const strategy = this._getRecoveryStrategy(catalogEntry.suggestedAction);

      const result = await this._executeRecovery(strategy, context);

      if (result.success) {
        this._recoveryCounts.delete(recoveryKey);
        return result;
      } else {
        retryCount++;
        this._recoveryCounts.set(recoveryKey, retryCount);

        // Exponential Backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await this._wait(delay);

        // Retry rekursiv
        return this.attemptRecovery(errorCode, context, maxRetries);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * INTERNAL HELPERS
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Normalisiere Error zu Standard-Format
   */
  _normalizeError(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        name: 'Error'
      };
    }

    if (typeof error === 'object') {
      return error;
    }

    return {
      message: String(error),
      name: 'Unknown'
    };
  }

  /**
   * Finde passenden Katalog-Eintrag
   */
  _findCatalogEntry(error) {
    const message = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();

    // Exakte Matches basierend auf Error-Name
    for (const [key, entry] of Object.entries(ErrorCatalog)) {
      if (key === 'UNKNOWN') continue;

      if (name.includes(key.replace(/_/g, ' ').toLowerCase()) ||
          message.includes(key.replace(/_/g, ' ').toLowerCase())) {
        return entry;
      }
    }

    // Pattern Matches
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCatalog.NET_TIMEOUT;
    }

    if (message.includes('cors')) {
      return ErrorCatalog.NET_CORS_ERROR;
    }

    if (message.includes('memory') || message.includes('heap')) {
      return ErrorCatalog.PROC_MEMORY;
    }

    if (message.includes('quota') || message.includes('storage')) {
      return ErrorCatalog.STR_QUOTA_EXCEEDED;
    }

    if (message.includes('frame')) {
      return ErrorCatalog.FRAME_NOT_FOUND;
    }

    return ErrorCatalog.UNKNOWN;
  }

  /**
   * Finde Katalog-Eintrag nach Code
   */
  _findCatalogByCode(code) {
    for (const entry of Object.values(ErrorCatalog)) {
      if (entry.code === code) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Baue User-freundliche Nachricht
   */
  _buildUserMessage(catalogEntry, context = {}) {
    let message = catalogEntry.message;

    // Kontextuelle Details hinzufügen
    if (context.details) {
      message += ` (${context.details})`;
    }

    if (catalogEntry.suggestedAction === 'retry_with_backoff') {
      message += '. Please try again in a moment.';
    } else if (catalogEntry.suggestedAction === 'check_connection') {
      message += '. Please check your internet connection.';
    } else if (catalogEntry.suggestedAction === 'resize_image') {
      message += '. Please use a smaller image.';
    } else if (catalogEntry.suggestedAction === 'delete_old_images') {
      message += '. Please delete some images first.';
    }

    return message;
  }

  /**
   * Hole Recovery-Strategie
   */
  _getRecoveryStrategy(action) {
    const strategies = {
      retry_with_backoff: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 2000,
        multiplier: 2
      },
      check_connection: {
        type: 'wait',
        durationMs: 5000
      },
      try_smaller_image: {
        type: 'suggest',
        suggestion: 'Use a smaller image (max 1024x1024)'
      },
      delete_old_images: {
        type: 'cleanup',
        action: 'delete_oldest_images'
      },
      retry: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 1000
      }
    };

    return strategies[action] || strategies.retry;
  }

  /**
   * Führe Recovery aus
   */
  async _executeRecovery(strategy, context) {
    switch (strategy.type) {
      case 'retry':
        return { success: true, action: 'retry' };

      case 'wait':
        await this._wait(strategy.durationMs);
        return { success: true, action: 'waited' };

      case 'cleanup':
        return { success: true, action: 'cleanup_suggested' };

      case 'suggest':
        return {
          success: false,
          action: 'user_intervention_required',
          suggestion: strategy.suggestion
        };

      default:
        return { success: false, error: 'Unknown strategy' };
    }
  }

  /**
   * Log Error
   */
  _logError(errorObject) {
    this._errorLog.push(errorObject);

    // Halte letzte 1000 Errors
    if (this._errorLog.length > 1000) {
      this._errorLog = this._errorLog.slice(-1000);
    }

    console.error(`[ImageFrame] ${errorObject.code}: ${errorObject.message}`, errorObject);
  }

  /**
   * Wait Helper
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * PUBLIC: Hole Error-Log
   */
  getErrorLog(limit = 100) {
    return this._errorLog.slice(-limit);
  }

  /**
   * PUBLIC: Hole Statistiken
   */
  getStatistics() {
    const stats = {
      totalErrors: this._errorLog.length,
      byCode: {},
      byRecoverability: { recoverable: 0, nonRecoverable: 0 }
    };

    for (const error of this._errorLog) {
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;

      if (error.recoverable) {
        stats.byRecoverability.recoverable++;
      } else {
        stats.byRecoverability.nonRecoverable++;
      }
    }

    return stats;
  }

  /**
   * PUBLIC: Reset
   */
  reset() {
    this._errorLog = [];
    this._recoveryCounts.clear();
    this._activeRecoveries.clear();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ErrorHandler,
    ErrorCatalog
  };
}
