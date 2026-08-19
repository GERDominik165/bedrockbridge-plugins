/**
 * Shelf Gambling Discord Integration @version 1.0.0
 *
 * BridgeAPI Integration für:
 * - Gewinn-Ankündigungen auf Discord
 * - Leaderboard Sync
 * - Echtzeit Statistiken
 * - Webhook-Events
 * - Spieler-Updates
 *
 * by InnateAlpaca
 */

import { world } from '@minecraft/server';

// Bridge wird später dynamisch geladen
let bridge = null;
let bridgeDirect = null;
export function setBridgeReferences(bridgeAPI, bridgeDirectAPI) {
    bridge = bridgeAPI;
    bridgeDirect = bridgeDirectAPI;
}

/* ========================================================================= */
/*                        DISCORD MESSAGE FORMATTER                         */
/* ========================================================================= */

class DiscordMessageFormatter {
    /**
     * Formatiere Gewinn-Nachricht für Discord
     */
    static formatWinMessage(playerName, winAmount, reels, machineLocation) {
        return {
            embed: {
                title: "🎰 SHELF GAMBLING - GEWINN!",
                color: 0x00ff00,
                fields: [
                    { name: "Spieler", value: playerName, inline: true },
                    { name: "Gewinn", value: `**${winAmount}** coins`, inline: true },
                    { name: "Reels", value: reels.join(" | "), inline: false },
                    {
                        name: "Position",
                        value: `X: ${machineLocation.x}, Y: ${machineLocation.y}, Z: ${machineLocation.z}`,
                        inline: false
                    },
                    { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
                ],
                thumbnail: { url: "https://emoji.discord.com/icons/1041838898843762769/8a7a7a7a7a7a7a7a7a7a7a7a.png" }
            }
        };
    }

    /**
     * Formatiere Jackpot-Nachricht
     */
    static formatJackpotMessage(playerName, jackpotAmount) {
        return {
            embed: {
                title: "🎉 JACKPOT GEWONNEN! 🎉",
                description: `${playerName} hat den Jackpot geknackt!`,
                color: 0xffff00,
                fields: [
                    { name: "Spieler", value: playerName, inline: false },
                    { name: "Jackpot Amount", value: `**${jackpotAmount}** coins`, inline: false },
                    { name: "Glückwunsch!", value: "Die gesamte Server-Community gratuliert! 🎊" }
                ]
            }
        };
    }

    /**
     * Formatiere Turnier-Update
     */
    static formatTournamentUpdate(tournamentName, topPlayers) {
        let description = "**Aktuelle Rangliste:**\n\n";

        topPlayers.forEach((player, i) => {
            const medal = ["🥇", "🥈", "🥉"][i] || "▫️";
            description += `${medal} **${i + 1}. ${player.name}** - ${player.totalWinnings} coins\n`;
        });

        return {
            embed: {
                title: `🏆 ${tournamentName} - UPDATE`,
                description,
                color: 0xff6600
            }
        };
    }

    /**
     * Formatiere Leaderboard
     */
    static formatLeaderboard(topPlayers) {
        let description = "**TOP 10 SPIELER**\n\n";

        topPlayers.forEach((player, i) => {
            description += `${i + 1}. **${player.name}** - ${player.totalWinnings} coins (${player.wins} Wins)\n`;
        });

        return {
            embed: {
                title: "🏅 Shelf Gambling Leaderboard",
                description,
                color: 0x0099ff
            }
        };
    }

    /**
     * Formatiere Statistik-Bericht
     */
    static formatStatsReport(playerName, stats) {
        return {
            embed: {
                title: `📊 ${playerName} - Statistiken`,
                color: 0x9900ff,
                fields: [
                    { name: "Rang", value: `#${stats.rank}`, inline: true },
                    { name: "Gewinnquote", value: stats.winRate, inline: true },
                    { name: "Spiele", value: `${stats.gamesPlayed}`, inline: true },
                    { name: "Gewinne", value: `${stats.wins}`, inline: true },
                    { name: "Total Winnings", value: `${stats.totalWinnings} coins`, inline: true }
                ]
            }
        };
    }

    /**
     * Formatiere Anti-Cheat Alert
     */
    static formatAntiCheatAlert(playerName, suspicion, severity = "medium") {
        const colors = {
            low: 0xffff00,
            medium: 0xff9900,
            high: 0xff0000
        };

        return {
            embed: {
                title: "⚠️ ANTI-CHEAT ALERT",
                color: colors[severity],
                fields: [
                    { name: "Spieler", value: playerName, inline: true },
                    { name: "Schweregrad", value: severity.toUpperCase(), inline: true },
                    { name: "Grund", value: suspicion, inline: false },
                    { name: "Aktion", value: "Bitte überprüfen Sie diesen Spieler manuell." }
                ]
            }
        };
    }
}

/* ========================================================================= */
/*                        BRIDGE API INTEGRATION                            */
/* ========================================================================= */

class GamblingBridgeIntegration {
    constructor() {
        this.webhookURL = null;
        this.discordChannelId = null;
    }

    /**
     * Initialisiere Discord Integration
     */
    async initialize(webhookURL, channelId) {
        this.webhookURL = webhookURL;
        this.discordChannelId = channelId;

        console.warn("[GamblingBridge] Discord Integration initialisiert");
        return true;
    }

    /**
     * Sende Gewinn-Update zu Discord
     */
    async broadcastWin(playerName, winAmount, reels, location) {
        try {
            const message = DiscordMessageFormatter.formatWinMessage(playerName, winAmount, reels, location);

            // Nutze bridge API um zu Discord zu senden
            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message, this.discordChannelId);
            } else if (bridge && bridge.bedrockCommands) {
                const text = `🎰 ${playerName} hat ${winAmount} coins gewonnen!\nReels: ${reels.join(" | ")}`;
                bridge.bedrockCommands.sendMessageAsDiscord(text);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden der Gewinn-Nachricht: ${error.message}`);
            return false;
        }
    }

    /**
     * Sende Jackpot-Nachricht
     */
    async broadcastJackpot(playerName, jackpotAmount) {
        try {
            const message = DiscordMessageFormatter.formatJackpotMessage(playerName, jackpotAmount);

            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message);
            } else if (bridge && bridge.bedrockCommands) {
                const text = `🎉 JACKPOT GEWONNEN!\n${playerName} hat den Jackpot geknackt!\nJackpot: ${jackpotAmount} coins!`;
                bridge.bedrockCommands.sendMessageAsDiscord(text);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden der Jackpot-Nachricht: ${error.message}`);
            return false;
        }
    }

    /**
     * Sende Leaderboard-Update
     */
    async updateLeaderboard(topPlayers) {
        try {
            const message = DiscordMessageFormatter.formatLeaderboard(topPlayers);

            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden des Leaderboards: ${error.message}`);
            return false;
        }
    }

    /**
     * Sende Turnier-Update
     */
    async updateTournament(tournamentName, topParticipants) {
        try {
            const message = DiscordMessageFormatter.formatTournamentUpdate(tournamentName, topParticipants);

            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden des Turnier-Updates: ${error.message}`);
            return false;
        }
    }

    /**
     * Sende Anti-Cheat Alert
     */
    async sendAntiCheatAlert(playerName, reason, severity = "medium") {
        try {
            const message = DiscordMessageFormatter.formatAntiCheatAlert(playerName, reason, severity);

            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message);
            } else if (bridge && bridge.bedrockCommands) {
                const text = `⚠️ ANTI-CHEAT ALERT\nSpieler: ${playerName}\nGrund: ${reason}\nSchweregrad: ${severity}`;
                bridge.bedrockCommands.sendMessageAsDiscord(text);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden des Anti-Cheat Alerts: ${error.message}`);
            return false;
        }
    }

    /**
     * Sende Spieler-Statistiken-Update
     */
    async updatePlayerStats(playerName, stats) {
        try {
            const message = DiscordMessageFormatter.formatStatsReport(playerName, stats);

            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden der Statistiken: ${error.message}`);
            return false;
        }
    }

    /**
     * Sende täglichen Report
     */
    async sendDailyReport(stats) {
        try {
            const message = {
                embed: {
                    title: "📊 Täglicher Gambling Report",
                    color: 0x0099ff,
                    fields: [
                        { name: "Spiele heute", value: `${stats.totalGames}`, inline: true },
                        { name: "Gesamte Wetten", value: `${stats.totalBets} coins`, inline: true },
                        { name: "Gesamte Gewinne", value: `${stats.totalWinnings} coins`, inline: true },
                        { name: "House Edge", value: `${stats.houseEdge}%`, inline: true },
                        { name: "Top Spieler", value: stats.topPlayer || "Keine", inline: true },
                        { name: "Aktive Spieler", value: `${stats.activePlayers}`, inline: true }
                    ]
                }
            };

            if (bridgeDirect && bridgeDirect.sendEmbed) {
                await bridgeDirect.sendEmbed(message);
            }

            return true;
        } catch (error) {
            console.warn(`[GamblingBridge] Fehler beim Senden des Daily Reports: ${error.message}`);
            return false;
        }
    }
}

/* ========================================================================= */
/*                        WEBHOOK SYSTEM                                    */
/* ========================================================================= */

class GamblingWebhook {
    /**
     * Trigger Event-Webhook
     */
    static triggerEvent(eventType, data) {
        try {
            const payload = {
                event: eventType,
                timestamp: Date.now(),
                data
            };

            // Könnte an externe Systeme gesendet werden
            // fetch('YOUR_WEBHOOK_URL', { method: 'POST', body: JSON.stringify(payload) })

            console.warn(`[Webhook] Event: ${eventType}`, payload);
            return true;
        } catch (error) {
            console.warn(`[Webhook] Fehler: ${error.message}`);
            return false;
        }
    }
}

/* ========================================================================= */
/*                        EXPORTS                                           */
/* ========================================================================= */

const gamblingBridge = new GamblingBridgeIntegration();

export {
    DiscordMessageFormatter,
    GamblingBridgeIntegration,
    GamblingWebhook,
    gamblingBridge
};
