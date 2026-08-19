/**
 * Shelf Gambling Advanced Features @version 1.0.0
 *
 * Premium Features für das Shelf Gambling System:
 * - Jackpot System mit Progressive Pools
 * - Daily/Weekly Tournaments
 * - Leaderboards und Rankings
 * - Multiplayer Syncing
 * - Anti-Cheat Detection
 *
 * by InnateAlpaca
 */

import { world, system, Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

// Bridge wird später dynamisch geladen
let bridge = null;
export function setBridgeReference(bridgeAPI) {
    bridge = bridgeAPI;
}

/* ========================================================================= */
/*                        JACKPOT SYSTEM                                    */
/* ========================================================================= */

class JackpotManager {
    constructor() {
        this.prefix = "gamble_jackpot::";
    }

    _get(key, def = 0) {
        const val = world.getDynamicProperty(this.prefix + key);
        return val ? JSON.parse(val) : def;
    }

    _set(key, val) {
        world.setDynamicProperty(this.prefix + key, JSON.stringify(val));
    }

    /**
     * Akkumuliere einen Prozentsatz aller Wetten in den Jackpot
     */
    contributeToJackpot(betAmount, contributionRate = 0.05) {
        const contribution = Math.floor(betAmount * contributionRate);
        const currentJackpot = this._get("progressive_pool", 0);
        this._set("progressive_pool", currentJackpot + contribution);
        return contribution;
    }

    /**
     * Prüfe auf Jackpot-Gewinn (sehr seltene Chance)
     */
    checkJackpotWin(player, jackpotChance = 0.001) {
        if (Math.random() < jackpotChance) {
            const jackpot = this._get("progressive_pool", 0);
            this._set("progressive_pool", 0); // Reset pool

            const objective = world.scoreboard.getObjective("coins");
            if (objective && player.scoreboardIdentity) {
                objective.addScore(player.scoreboardIdentity, jackpot);
            }

            // Broadcast an alle Spieler
            world.getAllPlayers().forEach(p => {
                p.sendMessage(
                    `\n§4§l━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `§6🎉 JACKPOT GEWONNEN! 🎉\n` +
                    `§e${player.name} hat den Jackpot geknackt!\n` +
                    `§6Gewinn: §a${jackpot} coins!\n` +
                    `§4§l━━━━━━━━━━━━━━━━━━━━━━━━\n`
                );
            });

            return { won: true, amount: jackpot };
        }
        return { won: false, amount: 0 };
    }

    getJackpotInfo() {
        return {
            currentPool: this._get("progressive_pool", 0),
            estimatedChance: "0.1%"
        };
    }
}

/* ========================================================================= */
/*                        LEADERBOARD SYSTEM                                */
/* ========================================================================= */

class LeaderboardManager {
    constructor() {
        this.prefix = "gamble_leaderboard::";
    }

    _getPlayers() {
        return JSON.parse(world.getDynamicProperty(this.prefix + "players") || "{}");
    }

    _setPlayers(players) {
        world.setDynamicProperty(this.prefix + "players", JSON.stringify(players));
    }

    /**
     * Aktualisiere Spieler-Statistiken
     */
    updatePlayerStats(playerName, winAmount) {
        const players = this._getPlayers();

        if (!players[playerName]) {
            players[playerName] = { wins: 0, totalWinnings: 0, gamesPlayed: 0 };
        }

        players[playerName].wins++;
        players[playerName].totalWinnings += winAmount;
        players[playerName].gamesPlayed++;

        this._setPlayers(players);
    }

    trackGamePlayed(playerName) {
        const players = this._getPlayers();

        if (!players[playerName]) {
            players[playerName] = { wins: 0, totalWinnings: 0, gamesPlayed: 0 };
        }

        players[playerName].gamesPlayed++;
        this._setPlayers(players);
    }

    /**
     * Hole Top 10 Spieler
     */
    getTopPlayers(limit = 10) {
        const players = this._getPlayers();
        return Object.entries(players)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.totalWinnings - a.totalWinnings)
            .slice(0, limit);
    }

    /**
     * Hole Spieler-Rang und Statistiken
     */
    getPlayerRank(playerName) {
        const players = this._getPlayers();
        const topPlayers = this.getTopPlayers(1000);
        const rank = topPlayers.findIndex(p => p.name === playerName) + 1;
        const stats = players[playerName] || { wins: 0, totalWinnings: 0, gamesPlayed: 0 };

        return {
            rank: rank || "Unranked",
            ...stats,
            winRate: stats.gamesPlayed > 0
                ? (stats.wins / stats.gamesPlayed * 100).toFixed(2) + "%"
                : "0%"
        };
    }

    resetDailyStats() {
        world.setDynamicProperty(this.prefix + "daily", JSON.stringify({}));
    }
}

/* ========================================================================= */
/*                        TOURNAMENT SYSTEM                                 */
/* ========================================================================= */

class TournamentManager {
    constructor() {
        this.prefix = "gamble_tournament::";
    }

    _get(key, def = null) {
        const val = world.getDynamicProperty(this.prefix + key);
        return val ? JSON.parse(val) : def;
    }

    _set(key, val) {
        world.setDynamicProperty(this.prefix + key, JSON.stringify(val));
    }

    /**
     * Starte ein neues Turnier
     */
    startTournament(name, durationMinutes = 60) {
        const tournament = {
            id: Date.now(),
            name,
            startTime: Date.now(),
            endTime: Date.now() + (durationMinutes * 60 * 1000),
            participants: {},
            status: "active"
        };

        this._set("current", tournament);
        this._set(`tournament_${tournament.id}`, tournament);

        world.getAllPlayers().forEach(p => {
            p.sendMessage(
                `\n§b§l═══════════════════════════\n` +
                `§e🏆 TURNIER GESTARTET! 🏆\n` +
                `§6Name: ${name}\n` +
                `§6Dauer: ${durationMinutes} Minuten\n` +
                `§bTretet dem Turnier bei und gewinnt große Preise!\n` +
                `§b§l═══════════════════════════\n`
            );
        });

        return tournament;
    }

    /**
     * Registriere Spieler im Turnier
     */
    registerPlayer(playerName) {
        const tournament = this._get("current");
        if (!tournament) return false;

        tournament.participants[playerName] = {
            wins: 0,
            totalWinnings: 0,
            joinedAt: Date.now()
        };

        this._set("current", tournament);
        return true;
    }

    /**
     * Aktualisiere Turnier-Statistiken
     */
    updateTournamentStats(playerName, winAmount) {
        const tournament = this._get("current");
        if (!tournament || !tournament.participants[playerName]) return;

        tournament.participants[playerName].wins++;
        tournament.participants[playerName].totalWinnings += winAmount;

        this._set("current", tournament);
    }

    /**
     * Beende das aktuelle Turnier
     */
    endTournament() {
        const tournament = this._get("current");
        if (!tournament) return null;

        tournament.status = "completed";
        this._set("current", tournament);

        // Finde Gewinner
        const ranking = Object.entries(tournament.participants)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.totalWinnings - a.totalWinnings);

        // Gib Preise aus
        if (ranking.length > 0) {
            const prizes = [500, 300, 100];
            for (let i = 0; i < Math.min(3, ranking.length); i++) {
                const player = world.getAllPlayers()
                    .find(p => p.name === ranking[i].name);
                if (player && player.scoreboardIdentity) {
                    const obj = world.scoreboard.getObjective("coins");
                    if (obj) {
                        obj.addScore(player.scoreboardIdentity, prizes[i]);
                        player.sendMessage(`§a🏆 Du hast Platz ${i + 1} erreicht! +${prizes[i]} coins!`);
                    }
                }
            }
        }

        return ranking;
    }

    getTournamentStats() {
        return this._get("current", { participants: {} });
    }
}

/* ========================================================================= */
/*                        ANTI-CHEAT SYSTEM                                 */
/* ========================================================================= */

class AntiCheatMonitor {
    constructor() {
        this.prefix = "gamble_anticheat::";
        this.suspiciousPlayers = new Map();
    }

    _log(playerName, reason, severity = "warning") {
        const logs = JSON.parse(world.getDynamicProperty(this.prefix + "logs") || "[]");
        logs.push({
            timestamp: Date.now(),
            player: playerName,
            reason,
            severity
        });
        world.setDynamicProperty(this.prefix + "logs", JSON.stringify(logs.slice(-1000))); // Keep last 1000
    }

    /**
     * Überwache verdächtige Spiel-Muster
     */
    monitorGamePattern(playerName, winRate, consecutiveWins) {
        // Unwahrscheinlich hohe Gewinnquote
        if (winRate > 0.8) {
            this._log(playerName, `Unwahrscheinlich hohe Gewinnquote: ${(winRate * 100).toFixed(2)}%`, "high");
            this.flagSuspicious(playerName, "high_winrate");
        }

        // Zu viele Gewinne in Folge
        if (consecutiveWins > 20) {
            this._log(playerName, `${consecutiveWins} Gewinne in Folge`, "high");
            this.flagSuspicious(playerName, "consecutive_wins");
        }
    }

    /**
     * Überwache Coin-Transaktionen
     */
    monitorCoinTransaction(playerName, amount, type) {
        if (amount > 500 && type === "win") {
            this._log(playerName, `Großer Gewinn: ${amount} coins`, "medium");
        }
    }

    flagSuspicious(playerName, reason) {
        const flags = this.suspiciousPlayers.get(playerName) || [];
        if (!flags.includes(reason)) {
            flags.push(reason);
        }
        this.suspiciousPlayers.set(playerName, flags);
    }

    getSuspiciousPlayers() {
        const result = {};
        for (const [name, flags] of this.suspiciousPlayers) {
            result[name] = flags;
        }
        return result;
    }

    getAntiCheatLog() {
        return JSON.parse(world.getDynamicProperty(this.prefix + "logs") || "[]");
    }
}

/* ========================================================================= */
/*                        EXPORTS & INTEGRATION                             */
/* ========================================================================= */

const jackpotManager = new JackpotManager();
const leaderboardManager = new LeaderboardManager();
const tournamentManager = new TournamentManager();
const antiCheatMonitor = new AntiCheatMonitor();

// Keine Commands hier - werden in index.js registriert!

export { jackpotManager, leaderboardManager, tournamentManager, antiCheatMonitor };
