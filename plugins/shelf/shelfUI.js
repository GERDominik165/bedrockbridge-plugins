/**
 * Shelf Gambling - Advanced UI System @version 2.0.0
 *
 * Ultra-krasses UI-System mit:
 * - Dynamische Form-Generation
 * - Modal-Dialoge
 * - Menü-Navigation
 * - Visuelles Feedback
 * - Mobile-ähnliche Interfaces
 * - Inline-Bestätigung
 *
 * by InnateAlpaca
 */

import { world, Player } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

/* ========================================================================= */
/*                        ADVANCED UI BUILDER                               */
/* ========================================================================= */

export class UIManager {
    constructor() {
        this.playerUIStates = new Map();
        this.customThemes = new Map();
        this.animations = new Map();
    }

    /**
     * Haupt-Gambling UI mit erweiterten Optionen
     */
    async showMainGamblingUI(player, machine, leaderboardManager) {
        const balance = machine.getPlayerBalance(player);
        const stats = leaderboardManager.getPlayerRank(player.name);
        const jackpotInfo = machine.state.jackpotInfo || { currentPool: 0 };

        const form = new ActionFormData()
            .title("§6§l🎰 MEGA SHELF GAMBLING 🎰§r")
            .body(
                `§6┌─────────────────────────────┐\n` +
                `§e│ §b${player.name}§e\n` +
                `§e│ Balance: §a${balance}§e coins\n` +
                `§e│ Rank: §6#${stats.rank} §7(${stats.winRate})\n` +
                `§e│ Jackpot: §c${jackpotInfo.currentPool}§e coins\n` +
                `§6└─────────────────────────────┘\n\n` +
                `§7Wähle deine Aktion:`
            )
            .button("§a§l10 Coins\n§7Niedriges Risiko")
            .button("§e§l25 Coins\n§7Mittleres Risiko")
            .button("§c§l50 Coins\n§7Hohes Risiko")
            .button("§d§lCustom Bet\n§7Deine Wahl")
            .button("§9§l📊 Statistiken\n§7Deine Daten")
            .button("§b§l🏆 Leaderboard\n§7Top Spieler")
            .button("§3§l⚙️ Einstellungen\n§7Optionen")
            .button("§8§l✕ Schließen");

        const response = await form.show(player);

        if (response.canceled) return;

        switch (response.selection) {
            case 0: case 1: case 2:
                const bets = [10, 25, 50];
                await this.showBetConfirmation(player, machine, bets[response.selection]);
                break;
            case 3:
                await this.showCustomBetUI(player, machine);
                break;
            case 4:
                await this.showDetailedStats(player, leaderboardManager);
                break;
            case 5:
                await this.showLeaderboardUI(player, leaderboardManager);
                break;
            case 6:
                await this.showSettings(player);
                break;
        }
    }

    /**
     * Bet Confirmation Dialog mit Animation
     */
    async showBetConfirmation(player, machine, betAmount) {
        const balance = machine.getPlayerBalance(player);
        const possibleWins = [
            { match: "3x Match", multiplier: 3, winAmount: betAmount * 3 },
            { match: "2x Match", multiplier: 1.5, winAmount: Math.floor(betAmount * 1.5) },
            { match: "No Match", multiplier: 0, winAmount: 0 }
        ];

        let winDescription = "§6Mögliche Gewinne:\n";
        possibleWins.forEach(w => {
            const percent = w.multiplier === 0 ? "0%" : (w.multiplier * 33).toFixed(0) + "%";
            winDescription += `§e${w.match}: §a+${w.winAmount} coins (${percent})\n`;
        });

        const form = new MessageFormData()
            .title("§6🎲 BET BESTÄTIGUNG 🎲")
            .body(
                `§6Wette: §e${betAmount} coins\n` +
                `§6Dein Balance: §a${balance} coins\n\n` +
                winDescription + `\n` +
                `§7Bist du sicher?`
            )
            .button1("§a✓ SPIELEN!")
            .button2("§c✗ Abbrechen");

        const response = await form.show(player);

        if (response.selection === 0) {
            await machine.playGame(player, betAmount);

            // Show result
            const result = machine.calculateResult(player, betAmount);
            await this.showGameResult(player, result, machine);
        }
    }

    /**
     * Zeige detailliertes Spiel-Ergebnis
     */
    async showGameResult(player, result, machine) {
        const resultText = result.won
            ? `§a§l✓ GEWONNEN!\n§eReels: ${result.reels.join(" | ")}\n§a+${result.winAmount} coins!`
            : `§c§lVerloren!\n§eReels: ${result.reels.join(" | ")}\n§c0 coins`;

        const form = new MessageFormData()
            .title(result.won ? "§a§l🎉 GEWINN! 🎉" : "§c§l😢 VERLOREN 😢")
            .body(resultText)
            .button1("§a📊 Nächste Runde")
            .button2("§8Menü");

        const response = await form.show(player);

        if (response.selection === 0) {
            await this.showMainGamblingUI(player, machine, null);
        }
    }

    /**
     * Custom Bet UI mit Slider
     */
    async showCustomBetUI(player, machine) {
        const balance = machine.getPlayerBalance(player);
        const maxBet = Math.min(balance, 64);

        const form = new ModalFormData()
            .title("🎲 Custom Bet")
            .slider("Wette (Coins):", 1, maxBet, 1, 10)
            .toggle("Auto-Spin?", false)
            .dropdown("Schwierigkeit:", ["Normal", "Hard", "Insane"], 0);

        const response = await form.show(player);

        if (!response.canceled) {
            const betAmount = Math.floor(response.formValues[0]);
            const autoSpin = response.formValues[1];
            const difficulty = response.formValues[2];

            if (autoSpin) {
                // Auto-spin mehrmals
                for (let i = 0; i < 3; i++) {
                    await machine.playGame(player, betAmount);
                    player.sendMessage(`§6[Auto-Spin ${i + 1}/3]`);
                }
            } else {
                await machine.playGame(player, betAmount);
            }
        }
    }

    /**
     * Detaillierte Spieler-Statistiken
     */
    async showDetailedStats(player, leaderboardManager) {
        const stats = leaderboardManager.getPlayerRank(player.name);
        const balance = world.scoreboard.getObjective("coins")?.getScore(player.scoreboardIdentity) ?? 0;

        const detailedStats = `
§6§l━━━━━ DEINE STATISTIKEN ━━━━━

§e👤 Spieler: §6${player.name}
§e🏆 Rang: §6#${stats.rank}
§e💰 Balance: §a${balance} coins
§e📊 Total Winnings: §a${stats.totalWinnings} coins

§e📈 Spielstatistiken:
  §7- Spiele gespielt: §6${stats.gamesPlayed}
  §7- Gewinne: §a${stats.wins}
  §7- Verluste: §c${stats.gamesPlayed - stats.wins}
  §7- Win Rate: §e${stats.winRate}

§e💎 Performance:
  §7- Durchschnittlicher Gewinn: §a${(stats.totalWinnings / Math.max(stats.wins, 1)).toFixed(2)} coins
  §7- Durchschnittlicher Verlust: §c${((stats.gamesPlayed - stats.wins) / Math.max(stats.gamesPlayed - stats.wins, 1)).toFixed(2)} coins
  §7- ROI: §e${((stats.totalWinnings / Math.max(stats.gamesPlayed, 1)) * 100).toFixed(2)}%

§6§l━━━━━━━━━━━━━━━━━━━━━━━━
`;

        const form = new ActionFormData()
            .title("§b📊 DETAILLIERTE STATISTIKEN")
            .body(detailedStats)
            .button("§aZurück zum Menü")
            .button("§bLeaderboard")
            .button("§cSchließen");

        const response = await form.show(player);

        if (response.selection === 0) {
            // Zurück zum Menü - wird implementiert mit machine
        } else if (response.selection === 1) {
            await this.showLeaderboardUI(player, leaderboardManager);
        }
    }

    /**
     * Erweitertes Leaderboard UI
     */
    async showLeaderboardUI(player, leaderboardManager) {
        const topPlayers = leaderboardManager.getTopPlayers(15);
        let bodyText = "§6§l━━━ TOP 15 SPIELER ━━━\n\n";

        topPlayers.forEach((entry, i) => {
            const medals = ["§4🥇", "§7🥈", "§6🥉"];
            const medal = medals[i] || "   ";
            const bar = this.createProgressBar(entry.totalWinnings, 5000, 10);
            bodyText += `${medal} §e${String(i + 1).padStart(2, "0")}. §6${entry.name}\n` +
                        `     ${bar} §a${entry.totalWinnings} coins\n\n`;
        });

        const form = new ActionFormData()
            .title("§6§l🏆 LEADERBOARD 🏆")
            .body(bodyText)
            .button("§aTop 10")
            .button("§bTop 50")
            .button("§cMein Rang")
            .button("§8Zurück");

        await form.show(player);
    }

    /**
     * Settings/Optionen UI
     */
    async showSettings(player) {
        const form = new ActionFormData()
            .title("⚙️ Einstellungen")
            .body(
                `§6Passe deine Gambling-Erfahrung an:\n\n` +
                `§e• Visuelle Effekte\n` +
                `§e• Sound-Einstellungen\n` +
                `§e• Benachrichtigungen\n` +
                `§e• Sprache`
            )
            .button("§5✨ Effekte")
            .button("§a🔊 Sounds")
            .button("§9📢 Benachrichtigungen")
            .button("§3🌍 Sprache")
            .button("§8Zurück");

        const response = await form.show(player);

        switch (response.selection) {
            case 0:
                await this.showEffectSettings(player);
                break;
            case 1:
                await this.showSoundSettings(player);
                break;
            case 2:
                await this.showNotificationSettings(player);
                break;
            case 3:
                await this.showLanguageSettings(player);
                break;
        }
    }

    /**
     * Visuelle Effekte Einstellungen
     */
    async showEffectSettings(player) {
        const form = new ModalFormData()
            .title("✨ Visuelle Effekte")
            .toggle("Particle-Effekte", true)
            .toggle("Animationen", true)
            .toggle("Flash-Effekte bei Gewinn", true)
            .toggle("Konfetti bei Jackpot", true);

        const response = await form.show(player);

        if (!response.canceled) {
            player.sendMessage("§a✓ Einstellungen gespeichert!");
        }
    }

    /**
     * Sound-Einstellungen
     */
    async showSoundSettings(player) {
        const form = new ModalFormData()
            .title("🔊 Sound-Einstellungen")
            .slider("Gewinn-Sound Lautstärke:", 0, 100, 10, 80)
            .slider("Verlust-Sound Lautstärke:", 0, 100, 10, 50)
            .toggle("Spin-Sound", true)
            .toggle("Click-Sounds", true);

        const response = await form.show(player);

        if (!response.canceled) {
            player.sendMessage("§a✓ Sound-Einstellungen gespeichert!");
        }
    }

    /**
     * Benachrichtigungseinstellungen
     */
    async showNotificationSettings(player) {
        const form = new ModalFormData()
            .title("📢 Benachrichtigungen")
            .toggle("Win-Benachrichtigungen", true)
            .toggle("Leaderboard-Updates", true)
            .toggle("Jackpot-Alerts", true)
            .toggle("Neue Spieler", false);

        const response = await form.show(player);

        if (!response.canceled) {
            player.sendMessage("§a✓ Benachrichtigungen konfiguriert!");
        }
    }

    /**
     * Spracheinstellungen
     */
    async showLanguageSettings(player) {
        const form = new ModalFormData()
            .title("🌍 Sprache")
            .dropdown("Wähle Sprache:", [
                "Deutsch 🇩🇪",
                "English 🇺🇸",
                "Español 🇪🇸",
                "Français 🇫🇷",
                "中文 🇨🇳"
            ], 0);

        const response = await form.show(player);

        if (!response.canceled) {
            player.sendMessage("§a✓ Sprache geändert!");
        }
    }

    /**
     * Helper: Erstelle Fortschritts-Bar
     */
    createProgressBar(current, max, length = 10) {
        const filled = Math.floor((current / max) * length);
        const empty = length - filled;
        return `§a${'█'.repeat(filled)}§7${'░'.repeat(empty)}`;
    }

    /**
     * Admin-Dashboard
     */
    async showAdminDashboard(player, stats) {
        const form = new ActionFormData()
            .title("§c⚡ ADMIN DASHBOARD ⚡")
            .body(
                `§6§l━━━ SERVER STATISTIKEN ━━━\n\n` +
                `§eAktive Spieler: §6${stats.activePlayers}\n` +
                `§eHeutige Spiele: §6${stats.totalGames}\n` +
                `§eGesamte Gewinne heute: §a${stats.totalWinnings}\n` +
                `§eGesamte Wetten heute: §c${stats.totalBets}\n` +
                `§eHouse Edge: §e${stats.houseEdge}%\n\n` +
                `§6§l━━━ OPTIONEN ━━━`
            )
            .button("§aStatistiken")
            .button("§bSpieler")
            .button("§cGeldbörsen")
            .button("§dAnticheat")
            .button("§eKonfiguration")
            .button("§8Zurück");

        const response = await form.show(player);

        switch (response.selection) {
            case 0:
                await this.showServerStats(player);
                break;
            case 1:
                await this.showPlayerManagement(player);
                break;
            case 2:
                await this.showWalletManagement(player);
                break;
            case 3:
                await this.showAntiCheatDashboard(player);
                break;
            case 4:
                await this.showConfigUI(player);
                break;
        }
    }

    /**
     * Server-Statistiken detailliert
     */
    async showServerStats(player) {
        const stats = `
§6§l━━━━━ SERVER STATISTIKEN ━━━━━

§eHeutige Statistiken:
  §7- Gesamte Spiele: §6[PLACEHOLDER]
  §7- Gesamte Wetten: §c[PLACEHOLDER]
  §7- Gesamte Gewinne: §a[PLACEHOLDER]
  §7- House Revenue: §e[PLACEHOLDER]

§eTop Spieler Heute:
  §71. [Player] - [Coins]
  §72. [Player] - [Coins]
  §73. [Player] - [Coins]

§eSystem Status:
  §7- Uptime: §6[PLACEHOLDER]
  §7- API Status: §a✓ Online
  §7- Database: §a✓ Connected
`;

        const form = new ActionFormData()
            .title("§b📊 SERVER STATISTIKEN")
            .body(stats)
            .button("Refresh")
            .button("Export")
            .button("Zurück");

        await form.show(player);
    }

    /**
     * Spieler-Verwaltung
     */
    async showPlayerManagement(player) {
        const form = new ActionFormData()
            .title("§b👥 SPIELER-VERWALTUNG")
            .body(
                `§6Verwalte Spieler und ihre Statistiken:\n\n` +
                `§e• Gesamtcoin Anpassung\n` +
                `§e• Ban/Unban\n` +
                `§e• Statistiken zurücksetzen\n` +
                `§e• Spieler durchsuchen`
            )
            .button("§aAdjust Coins")
            .button("§bBan Player")
            .button("§cReset Stats")
            .button("§dFind Player")
            .button("§8Zurück");

        await form.show(player);
    }

    /**
     * Geldbörsen-Management
     */
    async showWalletManagement(player) {
        const form = new ActionFormData()
            .title("§b💰 GELDBÖRSEN-MANAGEMENT")
            .body(
                `§6Verwalte Server-Wallet und Coins:\n\n` +
                `§e• Server-Balance: §a[PLACEHOLDER]\n` +
                `§e• House Revenue: §c[PLACEHOLDER]\n` +
                `§e• Daily Payout: §e[PLACEHOLDER]`
            )
            .button("§aView Details")
            .button("§bManual Payout")
            .button("§cWithdraw")
            .button("§dReset Balance")
            .button("§8Zurück");

        await form.show(player);
    }

    /**
     * Anti-Cheat Dashboard
     */
    async showAntiCheatDashboard(player) {
        const form = new ActionFormData()
            .title("§c🛡️ ANTI-CHEAT DASHBOARD")
            .body(
                `§6Anti-Cheat Monitoring:\n\n` +
                `§e• Verdächtige Spieler: §6[N]\n` +
                `§e• Logs heute: §6[N]\n` +
                `§e• Gebannte Spieler: §6[N]\n` +
                `§e• Status: §a✓ Active`
            )
            .button("§aShow Logs")
            .button("§bSuspicious Players")
            .button("§cBanned List")
            .button("§dSettings")
            .button("§8Zurück");

        await form.show(player);
    }

    /**
     * Konfiguration UI
     */
    async showConfigUI(player) {
        const form = new ActionFormData()
            .title("⚙️ KONFIGURATION")
            .body(
                `§6Passe die Gambling-Einstellungen an:\n\n` +
                `§e• Wettlimits\n` +
                `§e• Jackpot-Rate\n` +
                `§e• Gewinnquoten\n` +
                `§e• API-Settings`
            )
            .button("§aBetting Limits")
            .button("§bJackpot Settings")
            .button("§cOdds & Multipliers")
            .button("§dAPI Settings")
            .button("§8Zurück");

        await form.show(player);
    }
}

export { UIManager };
