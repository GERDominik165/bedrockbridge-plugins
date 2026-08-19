/**
 * 🏰 LandClaim Premium - Konfigurationsdatei
 * @version 2.0.0
 *
 * Alle Einstellungen für das LandClaim System
 * Einfach die Werte ändern und speichern!
 */

export const LandClaimConfig = {
    // ═══════════════════════════════════════════════════════════════════
    // 💰 WIRTSCHAFT & KOSTEN
    // ═══════════════════════════════════════════════════════════════════

    economy: {
        // Kosten pro einzelnem Chunk
        // 1 Chunk = 16×16 Blöcke
        costPerChunk: 100,

        // Maximale Anzahl Chunks pro Spieler
        // Bei Radius 2 = 25 Chunks
        maxChunksPerPlayer: 50,

        // Mindestabstand zwischen zwei Claims (in Chunks)
        minChunkDistance: 5,

        // Wirtschafts-Plugin aktivieren?
        // Wenn false: Claims sind kostenlos
        enableEconomy: true,

        // Automatisch löschen wenn Spieler nicht zahlt?
        autoDeleteIfNoPay: false,

        // Tage bis zur automatischen Löschung
        expirationDays: 30,

        // Refund bei Claim-Löschung? (% des Preises)
        refundPercentage: 100
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🛡️ SCHUTZ & ANTI-GRIEF
    // ═══════════════════════════════════════════════════════════════════

    protection: {
        // Verhindere Block-Breaking im Claim?
        preventBlockBreak: true,

        // Verhindere Block-Placement im Claim?
        preventBlockPlace: true,

        // Verhindere PvP im Claim?
        // (Spieler können sich nicht gegenseitig verletzen)
        preventPvP: true,

        // Verhindere Explosionen (TNT, Creeper)?
        preventExplosion: true,

        // Verhindere Feuer-Ausbreitung?
        preventFireSpread: true,

        // Verhindere Wasser/Lava-Fluss?
        preventFluidFlow: false,

        // Schalter für alle Griefs auf einmal
        globalGriefProtection: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // 👥 BERECHTIGUNGEN FÜR MITGLIEDER
    // ═══════════════════════════════════════════════════════════════════

    permissions: {
        // Mitglieder dürfen Blöcke platzieren?
        memberCanBuild: true,

        // Mitglieder dürfen Blöcke abbauen?
        memberCanBreak: true,

        // Mitglieder dürfen Container öffnen (Truhen, Fässer)?
        memberCanUseContainers: true,

        // Mitglieder dürfen Knöpfe drücken?
        memberCanUseButtons: true,

        // Mitglieder dürfen mit Redstone interagieren?
        memberCanUseRedstone: true,

        // Mitglieder dürfen mit Lava/Wasser interagieren?
        memberCanUseLava: false,
        memberCanUseWater: false,

        // Mitglieder dürfen Tiere zähmen?
        memberCanTameAnimals: true,

        // Mitglieder dürfen Türen öffnen?
        memberCanUseDoors: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🌍 DIMENSIONEN SUPPORT
    // ═══════════════════════════════════════════════════════════════════

    dimensions: {
        // Claims in der Oberwelt erlaubt?
        overworld: true,

        // Claims im Nether erlaubt?
        nether: true,

        // Claims im Ende erlaubt?
        end: true,

        // Custom Dimensionen
        custom: false
    },

    // ═══════════════════════════════════════════════════════════════════
    // ✨ FEATURES & ZUSATZFUNKTIONEN
    // ═══════════════════════════════════════════════════════════════════

    features: {
        // Visualisierungs-System aktivieren?
        // (Zeigt Grenzen von Claims)
        enableVisualizer: true,

        // Teleportation zu Claims aktivieren?
        enableTeleport: true,

        // Wildnis-Schutz aktivieren?
        // (Beschränkungen außerhalb von Claims)
        enableWildernessProtection: false,

        // Auto-Expiration aktivieren?
        enableAutoExpiration: false,

        // Tage bevor ein inaktiver Claim gelöscht wird
        expirationDays: 30,

        // Claim-Map anzeigen?
        enableMapView: true,

        // Statistiken tracken?
        enableStatistics: true,

        // Admin-Commands aktivieren?
        enableAdminCommands: true,

        // Discord-Integration aktivieren?
        enableDiscordIntegration: false
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🎨 UI/UX - FARBEN & VISUELLES DESIGN
    // ═══════════════════════════════════════════════════════════════════

    ui: {
        // Hauptfarbe (für Titel)
        primaryColor: "§6",          // Gold

        // Sekundärfarbe (für Text)
        secondaryColor: "§b",        // Cyan

        // Erfolgs-Farbe
        successColor: "§a",          // Grün

        // Fehler-Farbe
        errorColor: "§c",            // Rot

        // Warn-Farbe
        warnColor: "§e",             // Gelb

        // Info-Farbe
        infoColor: "§d",             // Magenta

        // Nachrichten-Präfix
        prefix: "🏰",                // Emoji für Nachrichten

        // Nachrichten-Format
        // %prefix% = Präfix
        // %color% = Farbe
        // %message% = Nachricht
        messageFormat: "%prefix% %message%"
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🎮 SPIELER EINSTELLUNGEN
    // ═══════════════════════════════════════════════════════════════════

    player: {
        // Welcome-Nachricht zeigen bei erstem Join?
        showWelcomeMessage: true,

        // Hilfe-Nachricht in der Wildnis?
        showWildernessHelp: false,

        // Maximale Claims pro Spieler (WICHTIG!)
        maxClaimsPerPlayer: 50,

        // Standardradius bei neuen Claims
        defaultClaimRadius: 1,

        // Auto-Claim bei /claim Befehl?
        autoClaimOnCommand: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🔧 ADMIN & ERWEITERTE OPTIONEN
    // ═══════════════════════════════════════════════════════════════════

    admin: {
        // Admin-Tag für Berechtigungen
        adminTag: "admin",

        // Moderator-Tag
        moderatorTag: "moderator",

        // Admins können fremde Claims editieren?
        adminCanEditAnyClaimm: true,

        // Admins können fremde Claims löschen?
        adminCanDeleteAnyClaim: true,

        // Debug-Modus (Console-Output)
        debugMode: false,

        // Automatisches Speichern alle X Ticks
        autoSaveInterval: 1200,      // 60 Sekunden (20 ticks = 1 sec)

        // Maximale Claims pro Spieler (mit Admin-Override)
        maxClaimsAdminOverride: 999,

        // Log-Level: "info", "warn", "error"
        logLevel: "info"
    },

    // ═══════════════════════════════════════════════════════════════════
    // 📊 DATENSPEICHERUNG
    // ═══════════════════════════════════════════════════════════════════

    database: {
        // Datenbank-Typ: "bridge" (BedrockBridge) oder "local"
        type: "bridge",

        // Datei-Name für lokale Speicherung
        fileName: "landclaim_data",

        // Automatisches Backup bei Änderungen?
        enableBackup: true,

        // Backup-Häufigkeit (in Tagen)
        backupInterval: 7,

        // Maximale Anzahl Backups
        maxBackups: 5
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 COMMAND EINSTELLUNGEN
    // ═══════════════════════════════════════════════════════════════════

    commands: {
        // Aktiviere /lc Hauptbefehl?
        enableLcCommand: true,

        // Aktiviere /claim Schnell-Claim?
        enableClaimCommand: true,

        // Aktiviere /unclaim?
        enableUnclaimCommand: true,

        // Aktiviere /claiminfo?
        enableClaimInfoCommand: true,

        // Aktiviere Text-Präfixe (z.B. !lc)?
        enableChatPrefix: true,

        // Präfix-Zeichen
        chatPrefix: "!",

        // Cooldown zwischen Commands (in Sekunden)
        commandCooldown: 0
    },

    // ═══════════════════════════════════════════════════════════════════
    // ⚡ PERFORMANCE OPTIONEN
    // ═══════════════════════════════════════════════════════════════════

    performance: {
        // Max Chunks für schnelle Berechnung
        maxChunksPerQuery: 100,

        // Cache aktivieren?
        enableCache: true,

        // Cache TTL (Time To Live) in Millisekunden
        cacheTTL: 60000,              // 60 Sekunden

        // Chunk-Index aktivieren? (für O(1) Lookup)
        enableChunkIndex: true,

        // Optimiere für viele Claims?
        optimizeForScale: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🌐 MULTI-SERVER SUPPORT
    // ═══════════════════════════════════════════════════════════════════

    multiServer: {
        // Multi-Server Modus aktivieren?
        enabled: false,

        // Server-Identifikator
        serverId: "server_1",

        // Synchronisierung mit anderen Servern?
        enableSync: false,

        // Sync-Intervall (in Ticks)
        syncInterval: 6000              // 300 Sekunden (5 Minuten)
    }
};

// ═══════════════════════════════════════════════════════════════════════
// PRESET KONFIGURATIONEN
// ═══════════════════════════════════════════════════════════════════════

export const PRESETS = {
    // Freie Spielweise - Claims kostenlos, große Limits
    SANDBOX: {
        economy: { enableEconomy: false, maxChunksPerPlayer: 100 },
        protection: { preventPvP: false, globalGriefProtection: false },
        permissions: { memberCanBuild: true, memberCanBreak: true }
    },

    // Survival-Server - Mittlere Limits, wirtschaftlich
    SURVIVAL: {
        economy: { costPerChunk: 100, maxChunksPerPlayer: 30 },
        protection: { preventPvP: true, globalGriefProtection: true },
        permissions: { memberCanBuild: true, memberCanBreak: true }
    },

    // PvP-Server - Wenig Schutz, schnelle Kämpfe
    PVP: {
        economy: { costPerChunk: 250, maxChunksPerPlayer: 10 },
        protection: { preventPvP: false, preventExplosion: false },
        permissions: { memberCanBuild: true, memberCanBreak: false }
    },

    // Hardcore - Maximalschutz, hohe Kosten
    HARDCORE: {
        economy: { costPerChunk: 500, maxChunksPerPlayer: 5 },
        protection: { preventPvP: true, globalGriefProtection: true },
        permissions: { memberCanBuild: false, memberCanBreak: false }
    },

    // Communityserver - Zusammenarbeit
    COMMUNITY: {
        economy: { enableEconomy: false, maxChunksPerPlayer: 50 },
        protection: { preventPvP: true, preventExplosion: true },
        permissions: { memberCanBuild: true, memberCanBreak: true }
    }
};

// ═══════════════════════════════════════════════════════════════════════
// QUICK START TEMPLATES
// ═══════════════════════════════════════════════════════════════════════

export function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) {
        console.warn(`Preset '${presetName}' nicht gefunden!`);
        return;
    }

    // Merge preset in main config
    Object.keys(preset).forEach(key => {
        Object.assign(LandClaimConfig[key], preset[key]);
    });

    console.log(`✓ Preset '${presetName}' angewendet!`);
}

export default LandClaimConfig;
