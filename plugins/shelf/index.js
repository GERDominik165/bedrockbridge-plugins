/**
 * Shelf Gambling System - Main Entry Point @version 1.0.0
 *
 * Ultra-krasses, durchdachtes Gambling System für Minecraft 1.21.121
 * mit vollständiger BridgeAPI Integration
 *
 * Dieses Plugin transformiert Shelf-Blöcke in funktionierende Glücksspielautomaten!
 *
 * by InnateAlpaca
 */

import { world, system, Player } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

// Importiere alle Module (lokale Shelf-Module)
import { ShelfGamblingMachine, redstoneController, initializeCurrencySystem, setBridgeReference as setGambleBridge } from './shelfGamble.js';
import { jackpotManager, leaderboardManager, tournamentManager, antiCheatMonitor, setBridgeReference as setAdvancedBridge } from './shelfAdvanced.js';
import { shelfMonitor, comparatorSystem, hopperSystem, AutomatedGamblingSystem } from './shelfRedstone.js';
import { gamblingBridge, GamblingWebhook, setBridgeReferences as setDiscordBridge } from './shelfDiscord.js';
import { GAMBLING_CONFIG, MESSAGES, validateConfig } from './config.js';

// Importiere neue Feature-Module
import { UIManager } from './shelfUI.js';
import { AchievementManager, AnalyticsEngine } from './shelfAchievements.js';
import { DuelManager, BracketTournament, ClanManager, LadderSystem } from './shelfMultiplayer.js';
import { ParticleEffects, AnimationEngine, SoundEffects, EffectCoordinator } from './shelfEffects.js';

// Bridge API Import - wird später als optional behandelt
let bridge = null;

/* ========================================================================= */
/*                        GLOBAL STATE MANAGEMENT                           */
/* ========================================================================= */

const PLUGIN_STATE = {
    enabled: true,
    initialized: false,
    version: "2.0.0",
    activeMachines: new Map(),
    automationSystem: null,
    lastUpdate: Date.now(),

    // Feature Manager Instances
    uiManager: null,
    achievementManager: null,
    analyticsEngine: null,
    duelManager: null,
    tournamentBracket: null,
    clanManager: null,
    ladderSystem: null,
    effectCoordinator: null,

    // Active Multiplayer Sessions
    activeDuels: new Map(),
    activeTournaments: new Map(),
    activeClanWars: new Map()
};

/* ========================================================================= */
/*                        INITIALIZATION                                    */
/* ========================================================================= */

async function initializePlugin() {
    try {
        // Validiere Konfiguration
        validateConfig();

        // Initialisiere Währungs-Objectives
        initializeCurrencySystem();

        // Lade Bridge API
        try {
            const bridgeModule = await import('../../Bedrock-Bridge/scripts/addons.js');
            bridge = bridgeModule.bridge;
            const bridgeDirectAPI = bridgeModule.bridgeDirect;

            // Setze Bridge References in allen Modulen
            setGambleBridge(bridge);
            setAdvancedBridge(bridge);
            setDiscordBridge(bridge, bridgeDirectAPI);

            console.warn("§6[ShelfGamble] Bridge API geladen");
        } catch (e) {
            console.warn("§7[ShelfGamble] Bridge API nicht verfügbar - einige Features sind begrenzt");
        }

        // Registriere Commands
        registerBridgeCommands();

        // Registriere Event Listeners (mit Verzögerung)
        system.runTimeout(() => {
            try {
                registerEventListeners();
            } catch (e) {
                console.warn(`§7[ShelfGamble] Event Listeners verzögert registriert (optional): ${e.message}`);
            }
        }, 5);

        // Initialisiere Discord Integration
        if (GAMBLING_CONFIG.discord.enabled) {
            console.warn("§6[ShelfGamble] Discord Integration wird aktiviert...");
        }

        // Initialisiere Anti-Cheat
        if (GAMBLING_CONFIG.antiCheat.enabled) {
            console.warn("§6[ShelfGamble] Anti-Cheat System wird aktiviert...");
        }

        // Setup Automation
        PLUGIN_STATE.automationSystem = new AutomatedGamblingSystem(null);

        // Initialisiere Feature Manager
        PLUGIN_STATE.uiManager = new UIManager();
        PLUGIN_STATE.achievementManager = new AchievementManager();
        PLUGIN_STATE.analyticsEngine = new AnalyticsEngine();
        PLUGIN_STATE.duelManager = new DuelManager();
        PLUGIN_STATE.clanManager = new ClanManager();
        PLUGIN_STATE.ladderSystem = new LadderSystem();
        PLUGIN_STATE.effectCoordinator = new EffectCoordinator();

        console.warn("§6[ShelfGamble] ✓ Alle Feature-Module initialisiert!");

        PLUGIN_STATE.initialized = true;
        console.warn("§6[ShelfGamble] ✓ Plugin erfolgreich initialisiert (v2.0.0)!");

        // Willkommensnachricht
        world.getAllPlayers().forEach(player => {
            player.sendMessage(
                "\n§6§l═══════════════════════════════════════════════\n" +
                "§e🎰 Shelf Gambling System v2.0.0 - ULTRA KRASS 🎰\n" +
                "§6Neue Features:\n" +
                "§a✓ Achievements & Rewards\n" +
                "§a✓ Analytics & Statistics\n" +
                "§a✓ 1v1 Duels & Tournaments\n" +
                "§a✓ Clans & Guilds\n" +
                "§a✓ Particle Effects & Sounds\n" +
                "§a✓ Leaderboards & Ladder System\n" +
                "§6Nutze §e/gamble_coins§6 zum Starten!\n" +
                "§6§l═══════════════════════════════════════════════\n"
            );
        });

        return true;
    } catch (error) {
        console.warn(`§c[ShelfGamble] Initialisierungs-Fehler: ${error.message}`);
        return false;
    }
}

// initializeCurrencySystem() ist in shelfGamble.js importiert

/* ========================================================================= */
/*                        PLAYER INTERACTION HANDLER                        */
/* ========================================================================= */

/**
 * Behandle Spieler-Klick auf Shelf-Block
 */
async function handlePlayerShelfInteraction(player, block) {
    if (!shelfMonitor.isShelf(block)) return;

    // Rate limiting & validation
    if (!shelfMonitor.checkPlayerInteraction(player, block)) {
        player.sendMessage("§cZu schnell! Bitte warte ein wenig.");
        return;
    }

    const machineKey = `machine_${block.x}_${block.y}_${block.z}`;
    let machine = PLUGIN_STATE.activeMachines.get(machineKey);

    // Erstelle Maschine wenn nicht vorhanden
    if (!machine) {
        machine = new ShelfGamblingMachine(block.x, block.y, block.z, player.dimension.id);
        PLUGIN_STATE.activeMachines.set(machineKey, machine);
        redstoneController.registerMachine(block.x, block.y, block.z, machine);
    }

    // Zeige Gambling UI
    await showMainGamblingUI(player, machine);
}

/**
 * Hauptmenü für Gambling
 */
async function showMainGamblingUI(player, machine) {
    const balance = machine.getPlayerBalance(player);
    const stats = leaderboardManager.getPlayerRank(player.name);
    const jackpotInfo = jackpotManager.getJackpotInfo();

    const form = new ActionFormData()
        .title("§6🎰 SHELF GAMBLING MACHINE")
        .body(
            `§eBalance: §a${balance} coins\n` +
            `§eRank: §6#${stats.rank} (${stats.winRate} Win Rate)\n` +
            `§eJackpot Pool: §c${jackpotInfo.currentPool} coins\n\n` +
            `§7Wähle deine Aktion:`
        )
        .button("§a10 Coins")
        .button("§e25 Coins")
        .button("§c50 Coins")
        .button("§7Custom Bet")
        .button("§9📊 Statistiken")
        .button("§6🏆 Leaderboard")
        .button("§8✕ Beenden");

    const response = await form.show(player);

    if (response.canceled) return;

    switch (response.selection) {
        case 0:
        case 1:
        case 2:
            const bets = [10, 25, 50];
            await playGame(player, machine, bets[response.selection]);
            break;
        case 3:
            await showCustomBetUI(player, machine);
            break;
        case 4:
            await showPlayerStatsUI(player, machine);
            break;
        case 5:
            await showLeaderboardUI(player);
            break;
        default:
            break;
    }
}

/**
 * Custom Bet UI
 */
async function showCustomBetUI(player, machine) {
    const form = new ModalFormData()
        .title("🎲 Custom Bet")
        .slider("Coins:", GAMBLING_CONFIG.betting.minBet, GAMBLING_CONFIG.betting.maxBet, 1, 10)
        .toggle("Automatische Spin?", false);

    const response = await form.show(player);

    if (response.canceled) return;

    const betAmount = Math.floor(response.formValues[0]);
    await playGame(player, machine, betAmount);
}

/**
 * Spiel-Loop
 */
async function playGame(player, machine, betAmount) {
    try {
        // Validierung
        if (!machine.validateBet(player, betAmount)) return;

        // Track für Anti-Cheat
        leaderboardManager.trackGamePlayed(player.name);

        // Spiel ausführen
        const success = await machine.playGame(player, betAmount);

        if (success) {
            // Hole Spielergebnis
            const result = machine.getLastResult();

            // Track Analytics
            PLUGIN_STATE.analyticsEngine.trackGameEvent(player.name, {
                bet: betAmount,
                won: result?.won || false,
                winAmount: result?.winAmount || 0,
                result: result?.resultSymbols || [],
                reels: result?.reels || []
            });

            // Prüfe und vergebe Achievements
            if (result?.won) {
                PLUGIN_STATE.achievementManager.checkAndAwardAchievements(player, "win", {
                    winAmount: result.winAmount,
                    isJackpot: result.isJackpot || false
                });

                // Spiele Gewinn-Animation + Sound
                if (result.isJackpot) {
                    await PLUGIN_STATE.effectCoordinator.playJackpotSequence(player, result.winAmount);
                } else {
                    await PLUGIN_STATE.effectCoordinator.playWinSequence(player, result.winAmount);
                }
            } else {
                // Spiele Verlust-Animation
                PLUGIN_STATE.effectCoordinator.particles.showLossAnimation(player);
            }

            // Discord Broadcast
            if (GAMBLING_CONFIG.discord.enabled) {
                const machineStats = machine.getStats();
                // Wird in shelfGamble.js automatisch gebroadcasted
            }

            // Zeige Menu erneut
            await new Promise(r => system.runTimeout(r, 30));
            await showMainGamblingUI(player, machine);
        }
    } catch (error) {
        player.sendMessage(`§c[FEHLER] ${error.message}`);
    }
}

/**
 * Spieler-Statistiken UI
 */
async function showPlayerStatsUI(player, machine) {
    const stats = leaderboardManager.getPlayerRank(player.name);
    const balance = machine.getPlayerBalance(player);

    const form = new ActionFormData()
        .title("§e📊 DEINE STATISTIKEN")
        .body(
            `§eBalance: §a${balance} coins\n\n` +
            `§6Rang: §e#${stats.rank}\n` +
            `§6Spiele: §e${stats.gamesPlayed}\n` +
            `§6Gewinne: §a${stats.wins}\n` +
            `§6Win Rate: §e${stats.winRate}\n` +
            `§6Total Winnings: §a${stats.totalWinnings} coins\n`
        )
        .button("Zurück");

    await form.show(player);
    await showMainGamblingUI(player, machine);
}

/**
 * Leaderboard UI
 */
async function showLeaderboardUI(player) {
    const topPlayers = leaderboardManager.getTopPlayers(10);

    let bodyText = "§6§l━━━ TOP 10 SPIELER ━━━\n\n";
    topPlayers.forEach((entry, i) => {
        const medal = ["§4🥇", "§7🥈", "§6🥉", "  "][Math.min(i, 3)];
        bodyText += `${medal} §e${i + 1}. §6${entry.name}\n    §8${entry.totalWinnings} coins (${entry.wins} Wins)\n\n`;
    });

    const form = new ActionFormData()
        .title("§6🏆 LEADERBOARD")
        .body(bodyText)
        .button("Zurück");

    await form.show(player);
}

/* ========================================================================= */
/*                        EVENT LISTENERS                                   */
/* ========================================================================= */

// Event Listeners werden mit system.run() verzögert registriert
function registerEventListeners() {
    try {
        // Spieler-Spawn Event
        world.afterEvents.playerSpawn.subscribe((event) => {
            try {
                if (event.initialSpawn && event.player.scoreboardIdentity) {
                    // Initialisiere Coins für neuen Spieler
                    const objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
                    if (objective) {
                        const score = objective.getScore(event.player.scoreboardIdentity);
                        if (score === undefined || score === null) {
                            objective.setScore(event.player.scoreboardIdentity, GAMBLING_CONFIG.betting.defaultBalance);
                        }
                    }
                }
            } catch (e) {
                console.warn(`§7[ShelfGamble] Player spawn error: ${e.message}`);
            }
        });

        // Block-Interaktion
        world.afterEvents.playerBreakBlock.subscribe((event) => {
            try {
                if (shelfMonitor.isShelf(event.brokenBlockPermutation.type)) {
                    const key = `${event.block.x}_${event.block.y}_${event.block.z}`;
                    PLUGIN_STATE.activeMachines.delete(key);
                    shelfMonitor.shelfRegistry.delete(key);
                }
            } catch (e) {
                console.warn(`§7[ShelfGamble] Block break error: ${e.message}`);
            }
        });

        console.warn("§6[ShelfGamble] ✓ Event Listeners registriert");
    } catch (e) {
        console.warn(`§c[ShelfGamble] Event Listener Registration Error: ${e.message}`);
    }
}

/* ========================================================================= */
/*                        COMMANDS REGISTRATION                             */
/* ========================================================================= */

/**
 * Registriere Bridge Commands - asynchron beim Initialize
 */
function registerBridgeCommands() {
    if (!bridge || !bridge.bedrockCommands) {
        console.warn("§7[ShelfGamble] Bridge Commands nicht verfügbar");
        return;
    }

    try {
        // ========== SPIELER COMMANDS ==========

        bridge.bedrockCommands.registerCommand("gamble_play", (player) => {
            player.sendMessage("§6Klicke auf einen Shelf-Block um zu spielen!");
        }, "Öffne das Gambling Menu");

        bridge.bedrockCommands.registerCommand("gamble_coins", (player, args) => {
            const objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
            if (player.scoreboardIdentity) {
                const balance = objective?.getScore(player.scoreboardIdentity) ?? 0;
                player.sendMessage(`§6Deine Coins: §a${balance}`);
            }
        }, "Zeige deine Coins");

        bridge.bedrockCommands.registerCommand("gamble_leaderboard", (player) => {
            const top = leaderboardManager.getTopPlayers(10);
            let message = "§6§l━━━ TOP 10 SPIELER ━━━\n";
            top.forEach((entry, i) => {
                message += `§e${i + 1}. §6${entry.name} - ${entry.totalWinnings} coins (${entry.wins} Wins)\n`;
            });
            player.sendMessage(message);
        }, "Zeige die Top 10 Spieler");

        bridge.bedrockCommands.registerCommand("gamble_myrank", (player) => {
            const rank = leaderboardManager.getPlayerRank(player.name);
            player.sendMessage(
                `§6Rang: §e#${rank.rank}\n` +
                `§6Gewinne: §e${rank.wins}\n` +
                `§6Win Rate: §e${rank.winRate}\n` +
                `§6Total: §a${rank.totalWinnings} coins`
            );
        }, "Zeige deinen Rang und Statistiken");

        // ========== ADMIN COMMANDS ==========

        bridge.bedrockCommands.registerCommand("gamble_create", (player, args) => {
            if (!player.hasTag("admin")) {
                player.sendMessage("§cKeine Berechtigung!");
                return;
            }

            const location = player.location;
            const machine = new ShelfGamblingMachine(
                Math.floor(location.x),
                Math.floor(location.y),
                Math.floor(location.z),
                player.dimension.id
            );

            redstoneController.registerMachine(
                Math.floor(location.x),
                Math.floor(location.y),
                Math.floor(location.z),
                machine
            );

            machine.saveState();
            player.sendMessage("§a✓ Neue Gambling Machine an dieser Position erstellt!");
        }, "Erstelle eine neue Shelf Gambling Machine");

        bridge.bedrockCommands.registerCommand("gamble_give", (player, args) => {
            if (!player.hasTag("admin")) {
                player.sendMessage("§cKeine Berechtigung!");
                return;
            }

            if (args.length < 2) {
                player.sendMessage("§cUsage: /gamble_give <player> <amount>");
                return;
            }

            const targetName = args[0];
            const amount = parseInt(args[1]);

            const targets = world.getAllPlayers().filter(p => p.name === targetName);
            if (targets.length > 0) {
                const objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
                if (objective && targets[0].scoreboardIdentity) {
                    objective.addScore(targets[0].scoreboardIdentity, amount);
                    player.sendMessage(`§a✓ ${amount} coins an ${targetName} gegeben`);
                    targets[0].sendMessage(`§a✓ Du hast ${amount} coins erhalten!`);
                }
            } else {
                player.sendMessage("§cSpieler nicht gefunden!");
            }
        }, "Gebe Coins an einen Spieler");

        bridge.bedrockCommands.registerCommand("gamble_tournament", (player, args) => {
            if (!player.hasTag("admin")) {
                player.sendMessage("§cKeine Berechtigung!");
                return;
            }

            if (args.length === 0) {
                player.sendMessage("§cUsage: /gamble_tournament <start|end|stats>");
                return;
            }

            if (args[0] === "start") {
                const name = args.slice(1).join(" ") || "Shelf Gambling Tournament";
                tournamentManager.startTournament(name);
                player.sendMessage("§a✓ Turnier gestartet!");
            } else if (args[0] === "end") {
                const ranking = tournamentManager.endTournament();
                if (ranking && ranking.length > 0) {
                    player.sendMessage(`§a✓ Turnier beendet! Gewinner: ${ranking[0].name}`);
                } else {
                    player.sendMessage(`§c✗ Kein Turnier aktiv oder keine Teilnehmer!`);
                }
            } else if (args[0] === "stats") {
                const stats = tournamentManager.getTournamentStats();
                player.sendMessage(`§6Turnier Statistiken:\n${JSON.stringify(stats, null, 2)}`);
            }
        }, "Verwalte Turniere");

        // ========== MULTIPLAYER COMMANDS ==========

        bridge.bedrockCommands.registerCommand("gamble_duel", (player, args) => {
            if (args.length < 2) {
                player.sendMessage("§cUsage: /gamble_duel <player> <bet_amount>");
                return;
            }

            const opponentName = args[0];
            const betAmount = parseInt(args[1]);

            const opponents = world.getAllPlayers().filter(p => p.name === opponentName);
            if (opponents.length === 0) {
                player.sendMessage("§cSpieler nicht gefunden!");
                return;
            }

            const opponent = opponents[0];
            const duelId = PLUGIN_STATE.duelManager.initiateDuel(player, opponent, betAmount);
            player.sendMessage(`§a✓ Duel-Herausforderung an ${opponentName} gesendet!`);
        }, "Fordere einen Spieler zu einem Duel heraus");

        bridge.bedrockCommands.registerCommand("gamble_duel_accept", (player, args) => {
            player.sendMessage("§c✗ Diese Aktion muss über das UI durchgeführt werden");
        }, "Akzeptiere ein Duel-Angebot");

        bridge.bedrockCommands.registerCommand("gamble_achievements", (player) => {
            const progress = PLUGIN_STATE.achievementManager.getAchievementProgress(player.name);
            player.sendMessage(
                `§6🏆 ACHIEVEMENTS\n` +
                `§eFreigeschaltet: §a${progress.unlockedCount}/${progress.totalCount}\n` +
                `§eProgress: §e${progress.percentage}%`
            );
        }, "Zeige deine Achievements");

        bridge.bedrockCommands.registerCommand("gamble_stats", (player) => {
            const stats = PLUGIN_STATE.analyticsEngine.getDetailedStats(player.name);
            player.sendMessage(
                `§6📊 DETAILLIERTE STATISTIKEN\n` +
                `§eGespiele: §e${stats.totalGames}\n` +
                `§eGewinne: §a${stats.wins}\n` +
                `§eVerluste: §c${stats.losses}\n` +
                `§eHöchster Gewinn: §a${stats.highestWin}\n` +
                `§eGewinn-Strähne: §e${stats.consecutiveWins}`
            );
        }, "Zeige detaillierte Statistiken");

        bridge.bedrockCommands.registerCommand("gamble_ladder", (player) => {
            const position = PLUGIN_STATE.ladderSystem.getPlayerPosition(player.name);
            player.sendMessage(
                `§6📈 LADDER-POSITION\n` +
                `§ePosition: §e#${position.position}\n` +
                `§eRating: §e${position.rating}\n` +
                `§eGesamt Spieler: §e${position.totalPlayers}`
            );
        }, "Zeige deine Ladder-Position");

        bridge.bedrockCommands.registerCommand("gamble_clan_create", (player, args) => {
            if (args.length === 0) {
                player.sendMessage("§cUsage: /gamble_clan_create <clan_name>");
                return;
            }

            const clanName = args.join(" ");
            const clanId = PLUGIN_STATE.clanManager.createClan(player.name, clanName);
            player.sendMessage(`§a✓ Clan '${clanName}' erstellt!`);
        }, "Erstelle einen neuen Clan");

        console.warn("§6[ShelfGamble] ✓ Alle Commands registriert (16 total)");
    } catch (e) {
        console.warn(`§c[ShelfGamble] Command Registration Fehler: ${e.message}`);
    }
}

/* ========================================================================= */
/*                        MAIN PLUGIN INITIALIZATION                        */
/* ========================================================================= */

system.run(() => {
    system.run(async () => {
        await initializePlugin();
    });
});

export {
    PLUGIN_STATE,
    ShelfGamblingMachine,
    jackpotManager,
    leaderboardManager,
    tournamentManager,
    antiCheatMonitor,
    gamblingBridge,
    // New Feature Managers
    UIManager,
    AchievementManager,
    AnalyticsEngine,
    DuelManager,
    BracketTournament,
    ClanManager,
    LadderSystem,
    EffectCoordinator
};
