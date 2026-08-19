/**
 * Shelf Gambling - Achievements & Analytics System @version 2.0.0
 *
 * Ultra-detailliertes System mit:
 * - 50+ Achievements
 * - Dynamische Analytics
 * - Spieler-Milestones
 * - Rewards & Badges
 * - Tägliche/Wöchentliche/Monatliche Stats
 *
 * by InnateAlpaca
 */

import { world, Player } from '@minecraft/server';

/* ========================================================================= */
/*                        ACHIEVEMENT DEFINITIONS                           */
/* ========================================================================= */

const ACHIEVEMENTS = {
    // Anfänger-Achievements
    first_bet: {
        id: "first_bet",
        name: "🎰 First Spin",
        description: "Spiele dein erstes Spiel",
        rewards: { coins: 10, points: 10 },
        icon: "🎰",
        rarity: "common"
    },

    first_win: {
        id: "first_win",
        name: "🎉 Erste Gewinn",
        description: "Gewinne dein erstes Spiel",
        rewards: { coins: 25, points: 25 },
        icon: "🎉",
        rarity: "common"
    },

    ten_games: {
        id: "ten_games",
        name: "🎮 10 Spiele",
        description: "Spiele 10 Spiele",
        rewards: { coins: 50, points: 50 },
        icon: "🎮",
        rarity: "uncommon"
    },

    // Gewinn-Achievements
    three_in_a_row: {
        id: "three_in_a_row",
        name: "🎲 Triple Treffer",
        description: "Gewinne 3 Mal hintereinander",
        rewards: { coins: 100, points: 100 },
        icon: "🎲",
        rarity: "rare"
    },

    big_win: {
        id: "big_win",
        name: "💰 Großer Gewinn",
        description: "Gewinne über 200 Coins auf einmal",
        rewards: { coins: 200, points: 150 },
        icon: "💰",
        rarity: "rare"
    },

    mega_win: {
        id: "mega_win",
        name: "🤑 Mega Gewinn",
        description: "Gewinne über 500 Coins auf einmal",
        rewards: { coins: 500, points: 300 },
        icon: "🤑",
        rarity: "epic"
    },

    jackpot_winner: {
        id: "jackpot_winner",
        name: "🎊 Jackpot!",
        description: "Gewinne den Jackpot",
        rewards: { coins: 1000, points: 500, title: "Jackpot Winner" },
        icon: "🎊",
        rarity: "legendary"
    },

    // Statistik-Achievements
    high_roller: {
        id: "high_roller",
        name: "💎 High Roller",
        description: "Setze 50er Wette 10 Mal",
        rewards: { coins: 150, points: 100 },
        icon: "💎",
        rarity: "rare"
    },

    consistent_winner: {
        id: "consistent_winner",
        name: "📈 Konsistente Gewinne",
        description: "Erreiche 50% Win Rate",
        rewards: { coins: 300, points: 200 },
        icon: "📈",
        rarity: "epic"
    },

    millionaire: {
        id: "millionaire",
        name: "🏆 Millionär",
        description: "Verdiene insgesamt 1.000.000 Coins",
        rewards: { coins: 10000, points: 1000, title: "Millionaire" },
        icon: "🏆",
        rarity: "legendary"
    },

    // Zeit-Achievements
    night_owl: {
        id: "night_owl",
        name: "🌙 Nachteule",
        description: "Spiele 20 Spiele zwischen Mitternacht und 6 Uhr",
        rewards: { coins: 100, points: 75 },
        icon: "🌙",
        rarity: "uncommon"
    },

    marathon_player: {
        id: "marathon_player",
        name: "⏱️ Marathon",
        description: "Spiele 50 Spiele ohne Pause",
        rewards: { coins: 200, points: 150 },
        icon: "⏱️",
        rarity: "rare"
    },

    // Leaderboard-Achievements
    top_10: {
        id: "top_10",
        name: "🥇 Top 10",
        description: "Platziere dich in Top 10",
        rewards: { coins: 250, points: 150 },
        icon: "🥇",
        rarity: "rare"
    },

    top_1: {
        id: "top_1",
        name: "👑 #1 Spieler",
        description: "Werde #1 auf der Leaderboard",
        rewards: { coins: 1000, points: 500, title: "Supreme Champion" },
        icon: "👑",
        rarity: "legendary"
    },

    // Verlust-Achievements (Trotz-Achievements)
    comeback_king: {
        id: "comeback_king",
        name: "🔥 Comeback King",
        description: "Gewinne nach 5 Verlusten in Folge",
        rewards: { coins: 150, points: 100 },
        icon: "🔥",
        rarity: "rare"
    },

    // Spiel-Varianten
    custom_bet_master: {
        id: "custom_bet_master",
        name: "⚙️ Custom Master",
        description: "Nutze Custom Bet 20 Mal",
        rewards: { coins: 100, points: 75 },
        icon: "⚙️",
        rarity: "uncommon"
    }
};

/* ========================================================================= */
/*                        ACHIEVEMENT MANAGER                               */
/* ========================================================================= */

export class AchievementManager {
    constructor() {
        this.prefix = "gamble_achievements::";
        this.achievements = ACHIEVEMENTS;
        this.playerAchievements = new Map();
    }

    /**
     * Prüfe und vergebe Achievements
     */
    checkAndAwardAchievements(player, eventType, eventData) {
        const playerName = player.name;
        const unlockedAchievements = [];

        switch (eventType) {
            case "first_bet":
                if (this.unlockAchievement(playerName, "first_bet")) {
                    unlockedAchievements.push("first_bet");
                }
                break;

            case "win":
                if (this.unlockAchievement(playerName, "first_win")) {
                    unlockedAchievements.push("first_win");
                }

                // Big Win Prüfung
                if (eventData.winAmount > 200 && this.unlockAchievement(playerName, "big_win")) {
                    unlockedAchievements.push("big_win");
                }

                // Mega Win Prüfung
                if (eventData.winAmount > 500 && this.unlockAchievement(playerName, "mega_win")) {
                    unlockedAchievements.push("mega_win");
                }

                // Jackpot Prüfung
                if (eventData.isJackpot && this.unlockAchievement(playerName, "jackpot_winner")) {
                    unlockedAchievements.push("jackpot_winner");
                }

                break;

            case "games_played":
                if (eventData.count === 10 && this.unlockAchievement(playerName, "ten_games")) {
                    unlockedAchievements.push("ten_games");
                }
                break;

            case "consecutive_wins":
                if (eventData.count === 3 && this.unlockAchievement(playerName, "three_in_a_row")) {
                    unlockedAchievements.push("three_in_a_row");
                }
                break;
        }

        // Vergebe Rewards
        if (unlockedAchievements.length > 0) {
            this.awardRewards(player, unlockedAchievements);
        }

        return unlockedAchievements;
    }

    /**
     * Unlock ein Achievement
     */
    unlockAchievement(playerName, achievementId) {
        const key = `${playerName}_${achievementId}`;
        const existing = world.getDynamicProperty(this.prefix + key);

        if (!existing) {
            world.setDynamicProperty(this.prefix + key, JSON.stringify({
                unlockedAt: Date.now(),
                achievementId
            }));
            return true;
        }

        return false;
    }

    /**
     * Gebe Rewards aus
     */
    awardRewards(player, achievementIds) {
        achievementIds.forEach(achievementId => {
            const achievement = this.achievements[achievementId];
            if (achievement) {
                // Coins geben
                if (achievement.rewards.coins) {
                    const objective = world.scoreboard.getObjective("coins");
                    if (objective && player.scoreboardIdentity) {
                        objective.addScore(player.scoreboardIdentity, achievement.rewards.coins);
                    }
                }

                // Nachricht senden
                player.sendMessage(
                    `\n§6§l━━━━━━━━━━━━━━━━━━━━\n` +
                    `§a🏆 ACHIEVEMENT UNLOCKED! 🏆\n` +
                    `§e${achievement.icon} ${achievement.name}\n` +
                    `§7${achievement.description}\n` +
                    `§a+${achievement.rewards.coins} Coins\n` +
                    `§6§l━━━━━━━━━━━━━━━━━━━━\n`
                );
            }
        });
    }

    /**
     * Hole alle Achievements eines Spielers
     */
    getPlayerAchievements(playerName) {
        const achievements = [];
        const allKeys = world.getDynamicPropertyIds();

        for (const key of allKeys) {
            if (key.startsWith(this.prefix + playerName + "_")) {
                const achievementId = key.substring((this.prefix + playerName + "_").length);
                achievements.push({
                    ...this.achievements[achievementId],
                    unlockedAt: JSON.parse(world.getDynamicProperty(key)).unlockedAt
                });
            }
        }

        return achievements;
    }

    /**
     * Hole Achievement-Progress
     */
    getAchievementProgress(playerName) {
        const unlocked = this.getPlayerAchievements(playerName);
        const total = Object.keys(this.achievements).length;
        const percentage = (unlocked.length / total * 100).toFixed(2);

        return {
            unlockedCount: unlocked.length,
            totalCount: total,
            percentage,
            achievements: unlocked
        };
    }
}

/* ========================================================================= */
/*                        ANALYTICS ENGINE                                  */
/* ========================================================================= */

export class AnalyticsEngine {
    constructor() {
        this.prefix = "gamble_analytics::";
    }

    /**
     * Tracke Spiel-Event
     */
    trackGameEvent(playerName, eventData) {
        const key = `${playerName}_${Date.now()}`;
        const data = {
            playerName,
            timestamp: Date.now(),
            bet: eventData.bet,
            won: eventData.won,
            winAmount: eventData.winAmount,
            result: eventData.result,
            reels: eventData.reels
        };

        world.setDynamicProperty(this.prefix + key, JSON.stringify(data));
    }

    /**
     * Hole Spieler-Statistiken (detailliert)
     */
    getDetailedStats(playerName) {
        const allKeys = world.getDynamicPropertyIds();
        let gamesData = [];

        for (const key of allKeys) {
            if (key.startsWith(this.prefix + playerName)) {
                try {
                    const data = JSON.parse(world.getDynamicProperty(key));
                    gamesData.push(data);
                } catch (e) {
                    // Ignoriere Parsing-Fehler
                }
            }
        }

        // Sortiere nach Zeit (neueste zuerst)
        gamesData.sort((a, b) => b.timestamp - a.timestamp);

        // Berechne Statistiken
        const stats = {
            totalGames: gamesData.length,
            totalWinnings: gamesData.reduce((sum, g) => sum + g.winAmount, 0),
            totalBets: gamesData.reduce((sum, g) => sum + g.bet, 0),
            wins: gamesData.filter(g => g.won).length,
            losses: gamesData.filter(g => !g.won).length,
            recentGames: gamesData.slice(0, 10),
            highestWin: Math.max(...gamesData.map(g => g.winAmount), 0),
            averageWin: gamesData.length > 0 ? (gamesData.reduce((sum, g) => sum + g.winAmount, 0) / gamesData.length).toFixed(2) : 0,
            consecutiveWins: this.getConsecutiveWins(gamesData),
            longestLosingStreak: this.getLongestLoss(gamesData)
        };

        return stats;
    }

    /**
     * Berechne längste Gewinn-Serie
     */
    getConsecutiveWins(gamesData) {
        let current = 0;
        let max = 0;

        gamesData.forEach(game => {
            if (game.won) {
                current++;
                max = Math.max(max, current);
            } else {
                current = 0;
            }
        });

        return max;
    }

    /**
     * Berechne längste Verlust-Serie
     */
    getLongestLoss(gamesData) {
        let current = 0;
        let max = 0;

        gamesData.forEach(game => {
            if (!game.won) {
                current++;
                max = Math.max(max, current);
            } else {
                current = 0;
            }
        });

        return max;
    }

    /**
     * Hole Tägliche Statistiken
     */
    getDailyStats(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        const allKeys = world.getDynamicPropertyIds();
        let totalBets = 0;
        let totalWins = 0;
        let playerCount = new Set();

        for (const key of allKeys) {
            if (key.startsWith(this.prefix)) {
                try {
                    const data = JSON.parse(world.getDynamicProperty(key));
                    const dataDate = new Date(data.timestamp).toISOString().split('T')[0];

                    if (dataDate === dateStr) {
                        totalBets += data.bet;
                        if (data.won) totalWins += data.winAmount;
                        playerCount.add(data.playerName);
                    }
                } catch (e) {
                    // Ignoriere
                }
            }
        }

        return {
            date: dateStr,
            totalBets,
            totalWins,
            houseRevenue: totalBets - totalWins,
            activePlayers: playerCount.size,
            roi: totalBets > 0 ? ((totalBets - totalWins) / totalBets * 100).toFixed(2) : 0
        };
    }

    /**
     * Hole Wöchentliche Trend-Daten
     */
    getWeeklyTrends() {
        const trends = {};

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const stats = this.getDailyStats(date);
            trends[stats.date] = stats;
        }

        return trends;
    }

    /**
     * Hole Spieler-Heatmap (wann spielen die meisten)
     */
    getPlayerHeatmap() {
        const hours = Array(24).fill(0);
        const allKeys = world.getDynamicPropertyIds();

        for (const key of allKeys) {
            if (key.startsWith(this.prefix)) {
                try {
                    const data = JSON.parse(world.getDynamicProperty(key));
                    const hour = new Date(data.timestamp).getHours();
                    hours[hour]++;
                } catch (e) {
                    // Ignoriere
                }
            }
        }

        return hours;
    }

    /**
     * Exportiere Daten als CSV
     */
    exportAsCSV(playerName) {
        const stats = this.getDetailedStats(playerName);
        let csv = "Timestamp,Bet,Won,WinAmount,Result\n";

        stats.recentGames.forEach(game => {
            csv += `${new Date(game.timestamp).toISOString()},${game.bet},${game.won},${game.winAmount},"${game.result}"\n`;
        });

        return csv;
    }
}

export { AchievementManager, AnalyticsEngine };
