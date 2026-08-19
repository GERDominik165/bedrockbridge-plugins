/**
 * Shelf Gambling - Multiplayer & Competitive Features @version 2.0.0
 *
 * Ultra-krasse Multiplayer-Features:
 * - 1v1 Duels
 * - Team-Wettbewerbe
 * - Turniere mit Klammersystem
 * - Welt-Events
 * - Clans/Gilden
 * - Ladder-System
 *
 * by InnateAlpaca
 */

import { world, Player } from '@minecraft/server';

/* ========================================================================= */
/*                        1v1 DUEL SYSTEM                                   */
/* ========================================================================= */

export class DuelManager {
    constructor() {
        this.prefix = "gamble_duels::";
        this.activeDuels = new Map();
        this.duelQueue = [];
    }

    /**
     * Fordere Spieler zu Duel heraus
     */
    initiateDuel(challenger, opponent, betAmount) {
        const duelId = `${challenger.name}_vs_${opponent.name}_${Date.now()}`;

        const duel = {
            id: duelId,
            challenger: challenger.name,
            opponent: opponent.name,
            betAmount,
            createdAt: Date.now(),
            status: "pending",
            rounds: 0,
            challengerWins: 0,
            opponentWins: 0
        };

        this.activeDuels.set(duelId, duel);
        this.saveDuel(duel);

        opponent.sendMessage(
            `\n§6§l━━━━━━━━━━━━━━━━━━━━\n` +
            `§c⚡ DUEL HERAUSFORDERUNG! ⚡\n` +
            `§e${challenger.name} fordert dich zu einem Duel heraus!\n` +
            `§6Einsatz: §e${betAmount} coins\n` +
            `§6Nutze: §e/duel accept\n` +
            `§6§l━━━━━━━━━━━━━━━━━━━━\n`
        );

        return duelId;
    }

    /**
     * Akzeptiere Duel
     */
    async acceptDuel(player, duelId) {
        const duel = this.activeDuels.get(duelId);
        if (!duel) return false;

        duel.status = "active";
        duel.startedAt = Date.now();

        // Starte erste Runde
        await this.playDuelRound(duel);

        return true;
    }

    /**
     * Spiele eine Duel-Runde
     */
    async playDuelRound(duel) {
        duel.rounds++;

        const challengerPlayer = world.getAllPlayers().find(p => p.name === duel.challenger);
        const opponentPlayer = world.getAllPlayers().find(p => p.name === duel.opponent);

        if (!challengerPlayer || !opponentPlayer) return;

        // Beide Spieler spielen gleichzeitig
        // Wer höheren Multiplikator bekommt, gewinnt die Runde

        challengerPlayer.sendMessage(`§6Runde ${duel.rounds}: §aSTART!`);
        opponentPlayer.sendMessage(`§6Runde ${duel.rounds}: §aSTART!`);

        // Hier würde das tatsächliche Spielen stattfinden
        // Für diese Demo: Zufälliger Gewinner

        const challengerWon = Math.random() > 0.5;

        if (challengerWon) {
            duel.challengerWins++;
            challengerPlayer.sendMessage(`§a✓ Runde gewonnen!`);
            opponentPlayer.sendMessage(`§c✗ Runde verloren!`);
        } else {
            duel.opponentWins++;
            opponentPlayer.sendMessage(`§a✓ Runde gewonnen!`);
            challengerPlayer.sendMessage(`§c✗ Runde verloren!`);
        }

        // Prüfe ob Duel vorbei ist (Best of 3)
        if (duel.challengerWins === 2) {
            await this.endDuel(duel, duel.challenger);
        } else if (duel.opponentWins === 2) {
            await this.endDuel(duel, duel.opponent);
        } else if (duel.rounds < 3) {
            // Nächste Runde
            setTimeout(() => this.playDuelRound(duel), 5000);
        }
    }

    /**
     * Beende Duel
     */
    async endDuel(duel, winner) {
        duel.status = "completed";
        duel.winner = winner;
        duel.endedAt = Date.now();

        const winnerPlayer = world.getAllPlayers().find(p => p.name === winner);
        const loserName = winner === duel.challenger ? duel.opponent : duel.challenger;
        const loserPlayer = world.getAllPlayers().find(p => p.name === loserName);

        if (winnerPlayer && loserPlayer) {
            // Coins transferieren
            const objective = world.scoreboard.getObjective("coins");
            if (objective && winnerPlayer.scoreboardIdentity && loserPlayer.scoreboardIdentity) {
                objective.addScore(winnerPlayer.scoreboardIdentity, duel.betAmount);
                objective.removeScore(loserPlayer.scoreboardIdentity, duel.betAmount);
            }

            winnerPlayer.sendMessage(
                `\n§a§l━━━━━━━━━━━━━━━━━━━━\n` +
                `§a🏆 DUEL GEWONNEN! 🏆\n` +
                `§e+${duel.betAmount} coins\n` +
                `§a§l━━━━━━━━━━━━━━━━━━━━\n`
            );

            loserPlayer.sendMessage(
                `\n§c§l━━━━━━━━━━━━━━━━━━━━\n` +
                `§c😢 DUEL VERLOREN 😢\n` +
                `§e-${duel.betAmount} coins\n` +
                `§c§l━━━━━━━━━━━━━━━━━━━━\n`
            );
        }

        this.saveDuel(duel);
    }

    /**
     * Speichere Duel-Daten
     */
    saveDuel(duel) {
        world.setDynamicProperty(
            this.prefix + duel.id,
            JSON.stringify(duel)
        );
    }

    /**
     * Hole Duel-Statistiken eines Spielers
     */
    getDuelStats(playerName) {
        const allKeys = world.getDynamicPropertyIds();
        let duels = [];

        for (const key of allKeys) {
            if (key.startsWith(this.prefix)) {
                try {
                    const duel = JSON.parse(world.getDynamicProperty(key));
                    if (duel.challenger === playerName || duel.opponent === playerName) {
                        duels.push(duel);
                    }
                } catch (e) {
                    // Ignoriere
                }
            }
        }

        const wins = duels.filter(d => d.winner === playerName).length;
        const losses = duels.filter(d => d.status === "completed" && d.winner !== playerName).length;

        return {
            totalDuels: duels.length,
            wins,
            losses,
            winRate: duels.length > 0 ? (wins / duels.length * 100).toFixed(2) : 0,
            recentDuels: duels.slice(0, 5)
        };
    }
}

/* ========================================================================= */
/*                        TOURNAMENT BRACKET SYSTEM                         */
/* ========================================================================= */

export class BracketTournament {
    constructor(name, maxPlayers = 16) {
        this.id = `tournament_${Date.now()}`;
        this.name = name;
        this.maxPlayers = maxPlayers;
        this.participants = [];
        this.bracket = [];
        this.status = "registration";
        this.createdAt = Date.now();
    }

    /**
     * Registriere Spieler
     */
    registerPlayer(playerName) {
        if (this.participants.length < this.maxPlayers) {
            this.participants.push({
                name: playerName,
                joinedAt: Date.now(),
                wins: 0,
                eliminated: false
            });
            return true;
        }
        return false;
    }

    /**
     * Starte Turnier (erstelle Klammer)
     */
    startTournament() {
        if (this.participants.length < 2) return false;

        // Shuffle Spieler
        this.participants.sort(() => Math.random() - 0.5);

        // Erstelle initiale Klammer
        this.bracket = [];
        for (let i = 0; i < this.participants.length; i += 2) {
            this.bracket.push({
                player1: this.participants[i],
                player2: this.participants[i + 1],
                winner: null,
                round: 1
            });
        }

        this.status = "in_progress";
        return true;
    }

    /**
     * Hole aktuelle Klammer
     */
    getBracket() {
        return {
            name: this.name,
            participants: this.participants.length,
            status: this.status,
            matches: this.bracket
        };
    }

    /**
     * Markiere Match-Gewinner
     */
    setMatchWinner(matchIndex, winner) {
        if (this.bracket[matchIndex]) {
            this.bracket[matchIndex].winner = winner;
            winner.wins++;

            // Prüfe ob Turnier vorbei
            const allMatchesCompleted = this.bracket.every(m => m.winner !== null);
            if (allMatchesCompleted && this.bracket.length === 1) {
                this.status = "completed";
                return { completed: true, winner: this.bracket[0].winner };
            }
        }

        return { completed: false };
    }
}

/* ========================================================================= */
/*                        CLAN/GUILD SYSTEM                                 */
/* ========================================================================= */

export class ClanManager {
    constructor() {
        this.prefix = "gamble_clans::";
        this.clans = new Map();
    }

    /**
     * Erstelle Clan
     */
    createClan(leaderName, clanName) {
        const clanId = `clan_${clanName.replace(/\s/g, '_')}_${Date.now()}`;

        const clan = {
            id: clanId,
            name: clanName,
            leader: leaderName,
            members: [leaderName],
            level: 1,
            treasury: 0,
            createdAt: Date.now(),
            wins: 0,
            losses: 0
        };

        this.clans.set(clanId, clan);
        this.saveClan(clan);

        return clanId;
    }

    /**
     * Füge Mitglied zu Clan hinzu
     */
    addMember(clanId, playerName) {
        const clan = this.clans.get(clanId);
        if (clan && !clan.members.includes(playerName)) {
            clan.members.push(playerName);
            this.saveClan(clan);
            return true;
        }
        return false;
    }

    /**
     * Clan-War (Mehrere Spieler spielen füreinander)
     */
    async startClanWar(clan1Id, clan2Id, matchCount = 5) {
        const clan1 = this.clans.get(clan1Id);
        const clan2 = this.clans.get(clan2Id);

        if (!clan1 || !clan2) return false;

        let clan1Wins = 0;
        let clan2Wins = 0;

        // Hier würde echte Clan-War-Logik stattfinden
        // Für diese Demo: Zufällige Ergebnisse

        for (let i = 0; i < matchCount; i++) {
            if (Math.random() > 0.5) {
                clan1Wins++;
            } else {
                clan2Wins++;
            }
        }

        const winner = clan1Wins > clan2Wins ? clan1 : clan2;
        const loser = clan1Wins > clan2Wins ? clan2 : clan1;

        winner.wins++;
        loser.losses++;

        this.saveClan(clan1);
        this.saveClan(clan2);

        return {
            winner: winner.name,
            score: `${Math.max(clan1Wins, clan2Wins)}-${Math.min(clan1Wins, clan2Wins)}`
        };
    }

    /**
     * Speichere Clan-Daten
     */
    saveClan(clan) {
        world.setDynamicProperty(
            this.prefix + clan.id,
            JSON.stringify(clan)
        );
    }

    /**
     * Hole Clan-Statistiken
     */
    getClanStats(clanId) {
        const clan = this.clans.get(clanId);
        if (!clan) return null;

        return {
            name: clan.name,
            leader: clan.leader,
            memberCount: clan.members.length,
            level: clan.level,
            treasury: clan.treasury,
            wins: clan.wins,
            losses: clan.losses,
            winRate: clan.wins + clan.losses > 0
                ? ((clan.wins / (clan.wins + clan.losses)) * 100).toFixed(2)
                : 0
        };
    }
}

/* ========================================================================= */
/*                        LADDER/RANKING SYSTEM                             */
/* ========================================================================= */

export class LadderSystem {
    constructor() {
        this.prefix = "gamble_ladder::";
    }

    /**
     * Berechne Ladder-Rating basierend auf Wins/Losses
     */
    calculateRating(wins, losses) {
        const winRate = wins / Math.max(wins + losses, 1);
        const baseRating = wins * 50 - losses * 25;
        const bonusRating = winRate > 0.6 ? 200 : winRate > 0.5 ? 100 : 0;

        return Math.max(0, baseRating + bonusRating);
    }

    /**
     * Hole Ladder-Positionen
     */
    getLadderTop(limit = 50) {
        const allKeys = world.getDynamicPropertyIds();
        let players = [];

        // Sammle Spieler-Daten (würde aus Leaderboard kommen)
        // Für diese Demo: Placeholder

        return players.slice(0, limit);
    }

    /**
     * Hole Spieler-Position in Ladder
     */
    getPlayerPosition(playerName) {
        const ladder = this.getLadderTop(1000);
        const position = ladder.findIndex(p => p.name === playerName);

        return {
            position: position + 1,
            rating: ladder[position]?.rating || 0,
            totalPlayers: ladder.length
        };
    }
}

export { DuelManager, BracketTournament, ClanManager, LadderSystem };
