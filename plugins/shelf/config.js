/**
 * Shelf Gambling Configuration @version 1.0.0
 *
 * Zentrale Konfiguration für das komplette Gambling System
 * Passe diese Werte an deine Bedürfnisse an!
 *
 * by InnateAlpaca
 */

export const GAMBLING_CONFIG = {
    /* ===== GRUNDLEGENDE SETTINGS ===== */
    enabled: true,
    version: "1.0.0",
    debugMode: false,

    /* ===== SLOT MACHINE SYMBOLE ===== */
    symbols: {
        "apple": {
            name: "§c❤ Apple",
            weight: 1.0,
            multiplier: 2,
            description: "Häufig, 2x Gewinn"
        },
        "diamond": {
            name: "§b◆ Diamond",
            weight: 0.5,
            multiplier: 5,
            description: "Selten, 5x Gewinn"
        },
        "emerald": {
            name: "§2◆ Emerald",
            weight: 0.8,
            multiplier: 4,
            description: "Selten, 4x Gewinn"
        },
        "gold_block": {
            name: "§6⬛ Gold Block",
            weight: 0.3,
            multiplier: 10,
            description: "Sehr selten, 10x Gewinn"
        },
        "amethyst": {
            name: "§5♦ Amethyst",
            weight: 0.2,
            multiplier: 20,
            description: "Ultra selten, 20x Gewinn"
        },
        "netherite_block": {
            name: "§8⬛ Netherite",
            weight: 0.1,
            multiplier: 50,
            description: "Extrem selten, 50x Gewinn!"
        }
    },

    /* ===== WETT-SYSTEM ===== */
    betting: {
        minBet: 1,
        maxBet: 64,
        currency: "coins",
        currencySymbol: "💰",
        defaultBalance: 100,
        initialBalance: 100,
        balancePerNewPlayer: 100,

        // Quick-Bet Optionen
        quickBets: [10, 25, 50],
        customBetEnabled: true
    },

    /* ===== GEWINN-MULTIPLIKATOREN ===== */
    winConditions: {
        three_match: {
            multiplier: 3,
            description: "Alle 3 gleich! 3x Gewinn",
            color: "§a"  // Grün
        },
        two_match: {
            multiplier: 1.5,
            description: "2 gleich! 1,5x Gewinn",
            color: "§6"  // Gold
        },
        no_match: {
            multiplier: 0,
            description: "Verloren!",
            color: "§c"  // Rot
        }
    },

    /* ===== JACKPOT SYSTEM ===== */
    jackpot: {
        enabled: true,
        jackpotChance: 0.001,  // 0.1% Chance
        contributionRate: 0.05,  // 5% aller Wetten → Jackpot
        minJackpot: 1000,
        maxJackpot: 100000,
        initialPool: 500
    },

    /* ===== REDSTONE AUTOMATION ===== */
    automation: {
        enabled: true,
        autoSpinOnPower: true,
        spinDuration: 20,  // Ticks für Animation
        resultDelay: 60,   // Ticks bis zum nächsten Spin
        comparatorOutput: true,
        hopperIntegration: true
    },

    /* ===== TOURNAMENT SYSTEM ===== */
    tournaments: {
        enabled: true,
        defaultDuration: 3600000,  // 1 Stunde in Millisekunden
        autoStart: false,
        prizes: [500, 300, 100],  // Preise für Top 3
        broadcastUpdates: true
    },

    /* ===== LEADERBOARD ===== */
    leaderboard: {
        enabled: true,
        trackStats: true,
        topPlayersCount: 10,
        autoUpdate: true,
        updateInterval: 300000  // 5 Minuten
    },

    /* ===== ANTI-CHEAT SYSTEM ===== */
    antiCheat: {
        enabled: true,
        trackItemPlacement: true,
        validateBlocks: true,
        monitorWinRates: true,
        suspiciousWinRateThreshold: 0.8,
        consecutiveWinThreshold: 20,
        logAllTransactions: true,
        alertAdmins: true,
        logRetention: 1000  // Keep last 1000 logs
    },

    /* ===== DISCORD INTEGRATION ===== */
    discord: {
        enabled: true,
        broadcastWins: true,
        broadcastJackpots: true,
        updateLeaderboard: true,
        updateTournaments: true,
        antiCheatAlerts: true,
        dailyReports: true,
        reportTime: "00:00",  // UTC
        webhookRetries: 3,
        webhookTimeout: 5000
    },

    /* ===== GAMEPLAY BALANCING ===== */
    balance: {
        houseEdgePct: 5,  // Maison behält 5% aller Wetten
        maxPayoutPerDay: 10000,
        maxPayoutPerPlayer: 5000,
        dailyResetTime: "00:00"  // UTC
    },

    /* ===== UI/UX SETTINGS ===== */
    ui: {
        animatedReels: true,
        soundEffects: true,
        particleEffects: true,
        colorfulText: true,
        showOdds: true,
        showStats: true
    },

    /* ===== ADMIN/MODERATION ===== */
    admin: {
        requireAdminForSetup: false,
        adminCanEditConfig: true,
        adminCanManuallySetBalance: true,
        adminCanTriggerJackpot: true,
        adminCanResetStats: false
    },

    /* ===== LOGGING ===== */
    logging: {
        logAllGames: true,
        logWins: true,
        logJackpots: true,
        logSuspiciousActivity: true,
        logDuration: 2592000000  // 30 Tage
    }
};

/* ========================================================================= */
/*                        COMMAND CONFIGURATION                             */
/* ========================================================================= */

export const COMMAND_CONFIG = {
    player: {
        // Spieler-Befehle
        "gamble_play": "Öffne die Gambling Machine UI",
        "gamble_coins": "Zeige deine Coins oder gib sie aus",
        "gamble_stats": "Zeige deine persönlichen Statistiken",
        "gamble_leaderboard": "Zeige die Top 10 Spieler",
        "gamble_myrank": "Zeige deinen Rang",
        "gamble_tournament": "Zeige Turnier-Informationen"
    },
    admin: {
        // Admin-Befehle
        "gamble_create": "Erstelle eine neue Gambling Machine",
        "gamble_config": "Konfiguriere das System",
        "gamble_stats_all": "Zeige alle Statistiken",
        "gamble_reset": "Setze Statistiken zurück",
        "gamble_give": "Gebe Coins an Spieler",
        "gamble_tournament_admin": "Verwalte Turniere",
        "gamble_anticheat": "Anti-Cheat Management"
    }
};

/* ========================================================================= */
/*                        MESSAGE TEMPLATES                                 */
/* ========================================================================= */

export const MESSAGES = {
    // Gewinn-Nachrichten
    win_three: "§a✓ GEWONNEN! Alle 3 gleich! +§6{amount}§a coins!",
    win_two: "§6✓ Gut gemacht! 2 gleich! +§6{amount}§6 coins!",
    lose: "§cVerloren! 0 coins",

    // Fehler-Nachrichten
    insufficient_balance: "§cUngenügend Coins! Du hast nur §6{balance}",
    invalid_bet: "§cWette muss zwischen §6{min}§c und §6{max}§c sein",
    machine_not_found: "§cKeine Gambling Machine hier!",
    access_denied: "§cKeine Berechtigung!",

    // Info-Nachrichten
    machine_created: "§a✓ Neue Gambling Machine erstellt!",
    stats_header: "§6§l━━━ DEINE STATISTIKEN ━━━",
    leaderboard_header: "§6§l━━━ TOP 10 SPIELER ━━━",

    // Spiel-Nachrichten
    spinning: "§e🎰 Spinning... {reels}",
    jackpot: "§4§l🎉 JACKPOT GEWONNEN! 🎉§r\n§e{player} hat den Jackpot geknackt!\n§6Gewinn: §a{amount} coins!",

    // Tournament-Nachrichten
    tournament_start: "§b§l════════════════════════════\n§e🏆 TURNIER GESTARTET! 🏆\n§6Name: {name}\n§6Dauer: {duration} Minuten\n§bTretet bei und gewinnt große Preise!\n§b§l════════════════════════════",
    tournament_end: "§b§l════════════════════════════\n§e🏆 TURNIER BEENDET! 🏆\n§6Gewinner: {winner}\n§6Gewinn: {prize} coins\n§b§l════════════════════════════"
};

/* ========================================================================= */
/*                        DEBUG/TEST UTILITIES                              */
/* ========================================================================= */

export const DEBUG_CONFIG = {
    simulateHighWins: false,
    bypassMinBalance: false,
    maxWinChance: 0.5,  // 50% Gewinnchance im Debug-Modus
    instantSpins: false  // Überspinge Spin-Animation
};

/* ========================================================================= */
/*                        HELPER FUNCTIONS                                  */
/* ========================================================================= */

/**
 * Validiere Konfiguration
 */
export function validateConfig() {
    if (GAMBLING_CONFIG.betting.minBet >= GAMBLING_CONFIG.betting.maxBet) {
        throw new Error("minBet muss kleiner als maxBet sein");
    }

    if (GAMBLING_CONFIG.jackpot.jackpotChance <= 0 || GAMBLING_CONFIG.jackpot.jackpotChance > 1) {
        throw new Error("jackpotChance muss zwischen 0 und 1 liegen");
    }

    if (GAMBLING_CONFIG.balance.houseEdgePct < 0 || GAMBLING_CONFIG.balance.houseEdgePct > 100) {
        throw new Error("houseEdgePct muss zwischen 0 und 100 liegen");
    }

    return true;
}

/**
 * Exportiere Konfiguration als JSON
 */
export function exportConfig() {
    return JSON.stringify(GAMBLING_CONFIG, null, 2);
}

/**
 * Importiere benutzerdefinierte Konfiguration
 */
export function importConfig(configJSON) {
    try {
        const parsed = JSON.parse(configJSON);
        Object.assign(GAMBLING_CONFIG, parsed);
        validateConfig();
        return true;
    } catch (error) {
        console.warn(`[Config] Import Fehler: ${error.message}`);
        return false;
    }
}

export default GAMBLING_CONFIG;
