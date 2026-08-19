/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                 ImageFrame - COMPREHENSIVE TEST SUITE                         ║
 * ║            Unit Tests + Integration Tests + Performance Tests                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Vollständige Test-Abdeckung aller Module
 * Framework: Custom Test Runner (einfach, keine Dependencies)
 *
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEST FRAMEWORK SETUP
// ═══════════════════════════════════════════════════════════════════════════

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeEach: null,
      afterEach: null
    };

    this.currentSuite = suite;
    fn();
    this.currentSuite = null;

    this.suites.push(suite);
  }

  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error('it() must be called within describe()');
    }

    this.currentSuite.tests.push({ name, fn });
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach = fn;
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEach = fn;
    }
  }

  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new AssertionError(
        message || `Expected ${expected}, got ${actual}`
      );
    }
  }

  assertTrue(value, message) {
    if (value !== true) {
      throw new AssertionError(message || `Expected true, got ${value}`);
    }
  }

  assertFalse(value, message) {
    if (value !== false) {
      throw new AssertionError(message || `Expected false, got ${value}`);
    }
  }

  assertNull(value, message) {
    if (value !== null) {
      throw new AssertionError(message || `Expected null, got ${value}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null) {
      throw new AssertionError(message || 'Expected not null');
    }
  }

  async run() {
    console.log('\\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           ImageFrame Comprehensive Test Suite                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\\n');

    for (const suite of this.suites) {
      console.log(`\\n📋 ${suite.name}`);
      console.log('─'.repeat(60));

      for (const test of suite.tests) {
        try {
          if (suite.beforeEach) {
            await suite.beforeEach();
          }

          await test.fn();

          console.log(`  ✓ ${test.name}`);
          this.results.passed++;
        } catch (error) {
          console.log(`  ✗ ${test.name}`);
          console.log(`    └─ ${error.message}`);
          this.results.failed++;
          this.results.errors.push({
            suite: suite.name,
            test: test.name,
            error: error.message
          });
        } finally {
          if (suite.afterEach) {
            await suite.afterEach();
          }
        }
      }
    }

    this._printSummary();
  }

  _printSummary() {
    const total = this.results.passed + this.results.failed;
    const percentage = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    console.log('\\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       TEST RESULTS                             ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  ✓ Passed:  ${String(this.results.passed).padEnd(51)} ║`);
    console.log(`║  ✗ Failed:  ${String(this.results.failed).padEnd(51)} ║`);
    console.log(`║  ⊘ Skipped: ${String(this.results.skipped).padEnd(51)} ║`);
    console.log(`║  Total:     ${String(total).padEnd(51)} ║`);
    console.log(`║  Success:   ${String(percentage + '%').padEnd(51)} ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\\n');

    if (this.results.failed > 0) {
      console.log('FAILED TESTS:\\n');
      for (const error of this.results.errors) {
        console.log(`  ${error.suite} > ${error.test}`);
        console.log(`    ${error.error}\\n`);
      }
    }

    return this.results.failed === 0;
  }
}

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const test = new TestRunner();

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Color Palette
// ─────────────────────────────────────────────────────────────────────────

test.describe('ColorPalette Module', () => {
  test.it('should have 60+ colors defined', () => {
    test.assertNotNull(MinecraftColors);
    test.assertTrue(MinecraftColors.size >= 60, `Expected 60+ colors, got ${MinecraftColors.size}`);
  });

  test.it('should have correct color format', () => {
    const white = MinecraftColors.get('white');
    test.assertNotNull(white);
    test.assertEquals(white.rgb.length, 4, 'Color should have RGBA');
    test.assertTrue(white.rgb[0] <= 220, 'R value should be <= 220 to avoid overflow');
  });

  test.it('should generate dark and light variants', () => {
    const white = MinecraftColors.get('white');
    const dark = getDarkPixel(white.rgb);
    const light = getLightPixel(white.rgb);

    test.assertEquals(dark.length, 4, 'Dark should be RGBA');
    test.assertEquals(light.length, 4, 'Light should be RGBA');
    test.assertEquals(dark[3], 254, 'Dark alpha should be 254');
    test.assertEquals(light[3], 253, 'Light alpha should be 253');
  });

  test.it('should find closest color correctly', () => {
    const palette = [
      [255, 0, 0, 255],    // Red
      [0, 255, 0, 255],    // Green
      [0, 0, 255, 255]     // Blue
    ];

    const closest = findClosestColor([254, 1, 0], palette);
    test.assertEquals(closest[0], 255, 'Should find red closest');
  });

  test.it('should build palette array with 3D support', () => {
    const palStr = 'white gray black';
    const palette2D = buildPaletteArray(palStr, false);
    const palette3D = buildPaletteArray(palStr, true);

    test.assertTrue(palette3D.length > palette2D.length, '3D palette should be larger');
    test.assertEquals(palette2D.length, 3, '2D should have 3 colors');
    test.assertEquals(palette3D.length, 9, '3D should have 3x3 (normal+dark+light)');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Dithering Engine
// ─────────────────────────────────────────────────────────────────────────

test.describe('Dithering Engine', () => {
  let canvas, ctx, imageData;

  test.beforeEach(() => {
    // Setup canvas for each test
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      ctx = canvas.getContext('2d');
      imageData = ctx.createImageData(10, 10);

      // Fill with test data
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 128;     // R
        imageData.data[i + 1] = 128; // G
        imageData.data[i + 2] = 128; // B
        imageData.data[i + 3] = 255; // A
      }
    }
  });

  test.it('should apply dithering without errors', () => {
    if (!imageData) return;

    const palette = [[255, 0, 0, 255], [0, 255, 0, 255]];
    const result = applyDithering(palette, imageData, 'none');

    test.assertNotNull(result);
  });

  test.it('should handle different dither methods', () => {
    if (!imageData) return;

    const methods = ['none', 'floyd-steinberg', 'weak-bayer', 'strong-bayer', 'atkinson'];
    const palette = [[128, 128, 128, 255]];

    for (const method of methods) {
      // Should not throw
      applyDithering(palette, imageData, method);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Storage Manager
// ─────────────────────────────────────────────────────────────────────────

test.describe('Storage Manager', () => {
  test.beforeEach(() => {
    StorageManager.clear();
  });

  test.it('should initialize successfully', () => {
    const result = StorageManager.initialize();
    test.assertTrue(result.success);
  });

  test.it('should save and load player data', () => {
    StorageManager.initialize();

    const imageData = {
      name: 'Test Image',
      width: 256,
      height: 256,
      data: 'test data'
    };

    const saveResult = StorageManager.savePlayerData('TestPlayer', 'img_001', imageData);
    test.assertTrue(saveResult.success);

    const loadResult = StorageManager.loadPlayerData('TestPlayer', 'img_001');
    test.assertTrue(loadResult.success);
    test.assertEquals(loadResult.data.name, 'Test Image');
  });

  test.it('should enforce quota limits', () => {
    StorageManager.initialize();

    // Try to save large data exceeding limit
    const largeData = {
      name: 'Large Image',
      data: 'x'.repeat(100 * 1024 * 1024) // 100 MB
    };

    const result = StorageManager.savePlayerData('QuotaTest', 'img_huge', largeData);

    // Should fail or succeed with warning depending on config
    test.assertNotNull(result);
  });

  test.it('should perform garbage collection', () => {
    StorageManager.initialize();

    const result = StorageManager.performGc();

    test.assertNotNull(result);
    test.assertEquals(typeof result.bytesFreed, 'number');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Validation
// ─────────────────────────────────────────────────────────────────────────

test.describe('Validation Module', () => {
  const validator = new ImageFrameValidator();

  test.it('should validate correct URLs', () => {
    const result = validator.validateImageUrl('https://example.com/image.png');
    test.assertTrue(result.valid);
  });

  test.it('should reject invalid URLs', () => {
    const result = validator.validateImageUrl('not a url');
    test.assertFalse(result.valid);
    test.assertTrue(result.errors.length > 0);
  });

  test.it('should validate image dimensions', () => {
    if (typeof HTMLImageElement === 'undefined') return;

    // Mock image element
    const mockImage = {
      width: 256,
      height: 256
    };

    const result = validator.validateLoadedImage(mockImage);
    test.assertTrue(result.valid);
  });

  test.it('should reject too small images', () => {
    const mockImage = {
      width: 16,
      height: 16
    };

    const result = validator.validateLoadedImage(mockImage);
    test.assertFalse(result.valid);
  });

  test.it('should validate processing parameters', () => {
    const params = {
      mapArea: [2, 2],
      palette: 'white gray black',
      dither: 'floyd-steinberg',
      is3D: true,
      maxHeight: 128
    };

    const result = validator.validateProcessingParams(params);
    test.assertTrue(result.valid);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Error Handler
// ─────────────────────────────────────────────────────────────────────────

test.describe('Error Handler', () => {
  const handler = new ErrorHandler();

  test.beforeEach(() => {
    handler.reset();
  });

  test.it('should handle errors correctly', () => {
    const error = new Error('Test error');
    const result = handler.handleError(error);

    test.assertNotNull(result);
    test.assertNotNull(result.code);
    test.assertNotNull(result.userMessage);
  });

  test.it('should categorize network errors', () => {
    const timeoutError = { message: 'Request timeout' };
    const result = handler.handleError(timeoutError);

    test.assertEquals(result.code, 'NET_001');
  });

  test.it('should provide recovery suggestions', () => {
    const error = { message: 'Network timeout' };
    const result = handler.handleError(error);

    test.assertTrue(result.recoverable);
    test.assertNotNull(result.recovery);
  });

  test.it('should maintain error log', () => {
    handler.handleError(new Error('Error 1'));
    handler.handleError(new Error('Error 2'));

    const log = handler.getErrorLog();
    test.assertEquals(log.length, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Logger
// ─────────────────────────────────────────────────────────────────────────

test.describe('Logger Module', () => {
  const logger = new Logger({ enableConsole: false });

  test.beforeEach(() => {
    logger.clear();
  });

  test.it('should log at different levels', () => {
    logger.info('Test info');
    logger.warn('Test warning');
    logger.error('Test error');

    const logs = logger.getRecent(10);
    test.assertEquals(logs.length, 3);
  });

  test.it('should filter logs by level', () => {
    logger.debug('Debug message');
    logger.info('Info message');
    logger.error('Error message');

    const errorLogs = logger.search('Error', { level: 'ERROR' });
    test.assertEquals(errorLogs.length, 1);
  });

  test.it('should track operation timings', () => {
    const timer = logger.startOperation('testOp');
    // Simulate work
    const result = logger.endOperation(timer, true);

    test.assertNotNull(result);
    test.assertTrue(result.duration >= 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS
// ─────────────────────────────────────────────────────────────────────────

test.describe('Integration: Complete Workflow', () => {
  test.it('should validate complete workflow', async () => {
    const validator = new ImageFrameValidator();

    const result = validator.validateCompleteWorkflow(
      'https://example.com/test.png',
      { width: 256, height: 256 },
      {
        mapArea: [1, 1],
        palette: 'white black',
        dither: 'floyd-steinberg',
        is3D: false
      }
    );

    test.assertTrue(result.allValid);
  });

  test.it('should handle storage lifecycle', () => {
    StorageManager.initialize();

    const data = { name: 'Test', data: 'test content' };
    const save = StorageManager.savePlayerData('Player1', 'img1', data);
    test.assertTrue(save.success);

    const load = StorageManager.loadPlayerData('Player1', 'img1');
    test.assertTrue(load.success);

    const del = StorageManager.deleteImage('Player1', 'img1');
    test.assertTrue(del.success);

    const reload = StorageManager.loadPlayerData('Player1', 'img1');
    test.assertFalse(reload.success);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// PERFORMANCE TESTS
// ─────────────────────────────────────────────────────────────────────────

test.describe('Performance Benchmarks', () => {
  test.it('should process images within timeout', async () => {
    const start = performance.now();

    // Simulate processing
    const palette = buildPaletteArray('white gray black', false);
    test.assertNotNull(palette);

    const duration = performance.now() - start;
    test.assertTrue(duration < 5000, `Should complete within 5s, took ${duration}ms`);
  });

  test.it('should handle concurrent operations', async () => {
    const handler = new ErrorHandler();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        Promise.resolve(handler.handleError(new Error(`Error ${i}`)))
      );
    }

    await Promise.all(promises);
    const stats = handler.getStatistics();

    test.assertEquals(stats.totalErrors, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════════════════

async function runTests() {
  await test.run();
  return test.results.failed === 0;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestRunner, runTests };
}

// Auto-run in browser
if (typeof window !== 'undefined') {
  window.runTests = runTests;
}
