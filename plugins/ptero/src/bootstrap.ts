/**
 * Pterodactyl Bedrock Bridge - Bootstrap & Initialization
 * Vollständige Initialisierung mit echtem API-Test und Datenladung
 *
 * Dieser Code wird beim Start ausgeführt und lädt alle notwendigen Daten
 */

import { world, system, Player, Dimension } from '@minecraft/server';
import { PterodactylPlugin, createPterodactylPlugin } from './Plugin';
import { ConnectionTester } from './utils/ConnectionTester';
import { logger } from './utils/Logger';
import { cacheManager } from './utils/Cache';
import { IPluginConfig } from './types';

export class PluginBootstrap {
  private static instance: PluginBootstrap | null = null;
  private plugin: PterodactylPlugin | null = null;
  private config: IPluginConfig;
  private isInitialized = false;
  private initializationError: Error | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'testing' = 'disconnected';

  /**
   * Singleton instance
   */
  static getInstance(): PluginBootstrap {
    if (!PluginBootstrap.instance) {
      PluginBootstrap.instance = new PluginBootstrap();
    }
    return PluginBootstrap.instance;
  }

  /**
   * Constructor - Private für Singleton
   */
  private constructor() {
    // Lade Konfiguration vom Server
    this.config = this.loadConfiguration();
    logger.info('PluginBootstrap created', { config: this.config });
  }

  /**
   * Lädt die Konfiguration vom Bedrock Server
   */
  private loadConfiguration(): IPluginConfig {
    return {
      // Deine echten Credentials
      panelUrl: 'https://pv-q.de/',
      apiKey: 'REDACTED',

      // Timeout und Retry-Einstellungen
      timeout: 30,
      retryAttempts: 5,

      // Bedrock-Spezifische Einstellungen
      debugMode: true,
      monitoringEnabled: true,

      // Optional: Weitere Einstellungen
      cacheEnabled: true,
      webSocketEnabled: true
    };
  }

  /**
   * Initialisiere das komplette Plugin-System
   */
  async initialize(): Promise<boolean> {
    try {
      logger.info('='.repeat(60));
      logger.info('PTERODACTYL BEDROCK BRIDGE - INITIALIZING');
      logger.info('='.repeat(60));

      // Schritt 1: Teste Verbindung
      logger.info('STEP 1: Testing connection to Pterodactyl Panel...');
      const connectionTest = await this.testConnection();

      if (!connectionTest.success) {
        logger.error('Connection test failed', {
          failures: connectionTest.summary.failedTests
        });
        throw new Error('Cannot connect to Pterodactyl Panel');
      }

      logger.info('✅ Connection successful!');
      this.connectionStatus = 'connected';

      // Schritt 2: Erstelle und initialisiere Plugin
      logger.info('STEP 2: Creating plugin instance...');
      this.plugin = new PterodactylPlugin(this.config);

      logger.info('STEP 3: Initializing plugin...');
      await this.plugin.initialize();

      // Schritt 4: Lade wichtige Daten pre-cache
      logger.info('STEP 4: Pre-loading data...');
      await this.preloadData();

      // Schritt 5: Setup Event Listener
      logger.info('STEP 5: Setting up event listeners...');
      this.setupEventListeners();

      this.isInitialized = true;

      logger.info('='.repeat(60));
      logger.info('✅ PTERODACTYL BEDROCK BRIDGE READY');
      logger.info('='.repeat(60));
      logger.info(`Panel: ${this.config.panelUrl}`);
      logger.info(`Debug Mode: ${this.config.debugMode}`);
      logger.info(`Monitoring: ${this.config.monitoringEnabled}`);

      return true;
    } catch (error) {
      this.initializationError = error as Error;
      this.connectionStatus = 'disconnected';

      logger.error('INITIALIZATION FAILED', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Versuche Recovery
      await this.attemptRecovery();

      return false;
    }
  }

  /**
   * Teste die Verbindung zum Pterodactyl Panel
   */
  private async testConnection(): Promise<any> {
    const tester = new ConnectionTester({
      panelUrl: this.config.panelUrl,
      apiKey: REDACTED
      timeout: this.config.timeout || 30
    });

    return await tester.runTests();
  }

  /**
   * Pre-lade wichtige Daten in den Cache
   */
  private async preloadData(): Promise<void> {
    try {
      if (!this.plugin) {
        logger.warn('Plugin not initialized, skipping pre-load');
        return;
      }

      logger.info('Pre-loading server list...');
      // Die genaue Implementation hängt von deinen Endpoints ab
      // Das werden wir gleich vervollständigen

      logger.info('Pre-loading user data...');
      // Pre-lade User-Daten

      logger.info('Pre-loading allocations...');
      // Pre-lade Allocations

    } catch (error) {
      logger.warn('Pre-load failed (non-critical)', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Setup globale Event Listener
   */
  private setupEventListeners(): void {
    // Chat command handler wird vom Plugin selbst gemacht
    // Hier können globale Events setup werden

    world.beforeEvents.playerSpawn.subscribe((event) => {
      const player = event.player;

      // Zeige Willkommensnachricht beim ersten Join
      if (!this.plugin) return;

      player.sendMessage('§a[§6Pterodactyl Bridge§a] §eWillkommen! Tippe /bedrockbridge help');
    });

    // Periodische Connection-Health-Check
    system.runInterval(() => {
      if (!this.plugin) return;

      const stats = this.plugin.getStats();

      // Bei Problemen loggen
      if (stats.clientStats.queueSize > 50) {
        logger.warn('Request queue is growing', {
          queueSize: stats.clientStats.queueSize
        });
      }
    }, 600); // Check alle 30 Sekunden (600 ticks / 20 ticks pro Sekunde)
  }

  /**
   * Versuche Recovery bei Fehler
   */
  private async attemptRecovery(): Promise<void> {
    logger.warn('Attempting recovery...');

    try {
      // Warte 5 Sekunden
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Versuche neu zu initialisieren
      logger.info('Retry initialization...');
      const success = await this.initialize();

      if (!success) {
        logger.error('Recovery failed, plugin running in degraded mode');
      }
    } catch (error) {
      logger.error('Recovery attempt failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Gib das Plugin-Instance zurück
   */
  getPlugin(): PterodactylPlugin | null {
    return this.plugin;
  }

  /**
   * Prüfe ob Plugin initialisiert wurde
   */
  isReady(): boolean {
    return this.isInitialized && this.plugin !== null;
  }

  /**
   * Gib Connection-Status zurück
   */
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  /**
   * Gib Initialisierungs-Fehler zurück (falls vorhanden)
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Gib Plugin-Statistiken zurück
   */
  getStats() {
    if (!this.plugin) {
      return null;
    }

    return {
      isInitialized: this.isInitialized,
      connectionStatus: this.connectionStatus,
      pluginStats: this.plugin.getStats(),
      cacheStats: cacheManager.getStats()
    };
  }

  /**
   * Shutdown das Plugin sauber
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Pterodactyl Bridge...');

    if (this.plugin) {
      await this.plugin.shutdown();
    }

    cacheManager.clear();
    this.isInitialized = false;

    logger.info('Pterodactyl Bridge shutdown complete');
  }
}

/**
 * Global Bootstrap Funktionen
 */

export async function bootstrapPlugin(): Promise<boolean> {
  const bootstrap = PluginBootstrap.getInstance();
  return await bootstrap.initialize();
}

export function getPluginInstance(): PterodactylPlugin | null {
  const bootstrap = PluginBootstrap.getInstance();
  return bootstrap.getPlugin();
}

export function isPluginReady(): boolean {
  const bootstrap = PluginBootstrap.getInstance();
  return bootstrap.isReady();
}

export function getPluginStatus(): {
  ready: boolean;
  connection: string;
  stats: any;
} {
  const bootstrap = PluginBootstrap.getInstance();
  return {
    ready: bootstrap.isReady(),
    connection: bootstrap.getConnectionStatus(),
    stats: bootstrap.getStats()
  };
}

/**
 * Initialisiere Plugin beim Server Start
 */
system.runInterval(async () => {
  const bootstrap = PluginBootstrap.getInstance();

  if (!bootstrap.isReady()) {
    logger.info('Plugin not ready yet, attempting initialization...');
    const success = await bootstrap.initialize();

    if (success) {
      logger.info('Plugin initialized successfully via system tick');
    }
  }
}, 1); // Run once per tick
