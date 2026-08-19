/**
 * Shelf Gambling Machine @version 1.0.0 - BedrockBridge Plugin
 *
 * Ultra-krasses Gambling System für Shelves in Minecraft 1.21.121
 * Features:
 * - Slot Machine Mechanik (3 Slots pro Shelf)
 * - Configurable Jackpots und Gewinnquoten
 * - Redstone Integration für Automaten-Steuerung
 * - Spieler-Statistiken und Balance-Management
 * - Discord Integration via BridgeAPI
 * - Anti-Cheat System mit Item-Tracking
 *
 * by InnateAlpaca (https://github.com/InnateAlpaca)
 */

import { world, Player, system, ItemStack, BlockPermutation } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

// Bridge wird später dynamisch geladen
let bridge = null;
export function setBridgeReference(bridgeAPI) {
    bridge = bridgeAPI;
}

/* ========================================================================= */
/*                          DATABASE & STORAGE                              */
/* ========================================================================= */

class GamblingDatabase {
    constructor(name = "gambling") {
        this.prefix = `gamble_${name}::`;
    }

    _parse(json) {
        try { return JSON.parse(json); } catch { return undefined; }
    }

    get(key, defaultValue = undefined) {
        const raw = world.getDynamicProperty(this.prefix + key);
        return this._parse(raw) ?? defaultValue;
    }

    set(key, value) {
        world.setDynamicProperty(this.prefix + key, JSON.stringify(value));
    }

    increment(key, amount = 1) {
        const current = this.get(key, 0);
        this.set(key, current + amount);
    }

    delete(key) {
        world.setDynamicProperty(this.prefix + key, undefined);
    }

    getAll() {
        const allKeys = world.getDynamicPropertyIds();
        const result = {};
        for (const id of allKeys) {
            if (!id.startsWith(this.prefix)) continue;
            const key = id.substring(this.prefix.length);
            result[key] = this._parse(world.getDynamicProperty(id));
        }
        return result;
    }
}

/* ========================================================================= */
/*                        GAMBLING CONFIGURATION                            */
/* ========================================================================= */

const GAMBLING_CONFIG = {
    // Slot Machine Symbole und deren Werte
    symbols: {
        "apple": { name: "§c❤ Apple", weight: 1, multiplier: 2 },
        "diamond": { name: "§b◆ Diamond", weight: 0.5, multiplier: 5 },
        "emerald": { name: "§2◆ Emerald", weight: 0.8, multiplier: 4 },
        "gold_block": { name: "§6⬛ Gold Block", weight: 0.3, multiplier: 10 },
        "amethyst": { name: "§5♦ Amethyst", weight: 0.2, multiplier: 20 },
        "netherite_block": { name: "§8⬛ Netherite", weight: 0.1, multiplier: 50 }
    },

    // Wett-Konfiguration
    betting: {
        minBet: 1,
        maxBet: 64,
        currency: "coins", // Objective name für Währung
        defaultBalance: 100
    },

    // Gewinn-Kombinationen
    winConditions: {
        three_match: { multiplier: 3, description: "Alle 3 gleich! 3x Gewinn" },
        two_match: { multiplier: 1.5, description: "2 gleich! 1,5x Gewinn" },
        no_match: { multiplier: 0, description: "Verloren!" }
    },

    // Automation & Redstone
    automation: {
        enabled: true,
        autoSpinOnPower: true, // Bei Redstone aktiviert = automatischer Spin
        spinDuration: 20, // Ticks für Animation
        resultDelay: 60 // Ticks bis zum nächsten Spin
    },

    // Anti-Cheat
    antiCheat: {
        enabled: true,
        trackItemPlacement: true,
        validateBlocks: true
    }
};

const db = new GamblingDatabase("shelf_gambling");

/* ========================================================================= */
/*                        SHELF MACHINE MANAGER                             */
/* ========================================================================= */

class ShelfGamblingMachine {
    constructor(x, y, z, dimension = "overworld") {
        this.location = { x, y, z, dimension };
        this.key = `machine_${x}_${y}_${z}`;
        this.state = this.loadState();
        this.spinAnimationId = null;
        this.resultDisplayId = null;
    }

    loadState() {
        return db.get(this.key, {
            totalRevenue: 0,
            totalWinnings: 0,
            spinCount: 0,
            lastWinner: null,
            lastWinAmount: 0,
            isPowered: false,
            isSpinning: false,
            currentReels: ["🎰", "🎰", "🎰"]
        });
    }

    saveState() {
        db.set(this.key, this.state);
    }

    /**
     * Hauptspiel-Loop: Spieler wetten und spinnen
     */
    async playGame(player, betAmount) {
        try {
            // Validierung
            if (!this.validateBet(player, betAmount)) return false;

            // Wette abziehen
            this.takeBet(player, betAmount);
            this.state.totalRevenue += betAmount;

            // Spin-Animation und Ergebnis
            await this.performSpin(player);
            const result = this.calculateResult(player, betAmount);

            // Gewinn auszahlen
            if (result.won) {
                this.payoutWinnings(player, result.winAmount);
                this.state.totalWinnings += result.winAmount;
                this.state.lastWinner = player.name;
                this.state.lastWinAmount = result.winAmount;
                player.sendMessage(`§a✓ Gewonnen! +${result.winAmount} coins!`);
                this.broadcastWin(player, result);
            } else {
                player.sendMessage(`§cVerloren! 0 coins`);
            }

            this.state.spinCount++;
            this.saveState();
            return true;

        } catch (error) {
            player.sendMessage(`§cFehler beim Spielen: ${error.message}`);
            return false;
        }
    }

    validateBet(player, amount) {
        // Check ob Spieler genug coins hat
        const balance = this.getPlayerBalance(player);
        if (balance < amount) {
            player.sendMessage(`§cUngenügend Coins! Du hast nur ${balance}`);
            return false;
        }
        if (amount < GAMBLING_CONFIG.betting.minBet || amount > GAMBLING_CONFIG.betting.maxBet) {
            player.sendMessage(`§cWette muss zwischen ${GAMBLING_CONFIG.betting.minBet} und ${GAMBLING_CONFIG.betting.maxBet} sein`);
            return false;
        }
        return true;
    }

    takeBet(player, amount) {
        const objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
        if (objective && player.scoreboardIdentity) {
            objective.removeScore(player.scoreboardIdentity, amount);
        }
    }

    async performSpin(player) {
        this.state.isSpinning = true;
        const spinDuration = GAMBLING_CONFIG.automation.spinDuration;

        for (let i = 0; i < spinDuration; i++) {
            // Reels schnell drehen
            const reels = [
                this.getRandomSymbol(),
                this.getRandomSymbol(),
                this.getRandomSymbol()
            ];
            this.state.currentReels = reels;

            // Visuelles Feedback an Spieler
            if (i % 5 === 0) {
                player.sendMessage(`§e🎰 Spinning... ${reels.join(" | ")}`);
            }

            await new Promise(resolve => system.runTimeout(resolve, 1));
        }

        this.state.isSpinning = false;
    }

    calculateResult(player, betAmount) {
        const reels = this.state.currentReels;

        // Zähle Matches
        let matches = 0;
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
            matches = 3;
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
            matches = 2;
        }

        let won = false;
        let multiplier = 0;
        let message = "";

        if (matches === 3) {
            multiplier = GAMBLING_CONFIG.winConditions.three_match.multiplier;
            message = `§a${GAMBLING_CONFIG.winConditions.three_match.description}`;
            won = true;
        } else if (matches === 2) {
            multiplier = GAMBLING_CONFIG.winConditions.two_match.multiplier;
            message = `§6${GAMBLING_CONFIG.winConditions.two_match.description}`;
            won = true;
        } else {
            message = `§c${GAMBLING_CONFIG.winConditions.no_match.description}`;
        }

        const winAmount = Math.floor(betAmount * multiplier);

        return {
            won,
            winAmount,
            matches,
            multiplier,
            message,
            reels
        };
    }

    getRandomSymbol() {
        const symbols = Object.entries(GAMBLING_CONFIG.symbols);
        const totalWeight = symbols.reduce((sum, [_, data]) => sum + data.weight, 0);
        let random = Math.random() * totalWeight;

        for (const [key, data] of symbols) {
            random -= data.weight;
            if (random <= 0) {
                return data.name;
            }
        }
        return symbols[0][1].name;
    }

    payoutWinnings(player, amount) {
        const objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
        if (objective && player.scoreboardIdentity) {
            objective.addScore(player.scoreboardIdentity, amount);
        }
    }

    getPlayerBalance(player) {
        const objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
        if (objective && player.scoreboardIdentity) {
            return objective.getScore(player.scoreboardIdentity) ?? GAMBLING_CONFIG.betting.defaultBalance;
        }
        return GAMBLING_CONFIG.betting.defaultBalance;
    }

    broadcastWin(player, result) {
        bridge.bedrockCommands.sendMessageAsDiscord(
            `🎰 **${player.name}** hat gewonnen!\n` +
            `Reels: ${result.reels.join(" | ")}\n` +
            `Gewinn: +${result.winAmount} coins!`
        );
    }

    getStats() {
        return {
            location: this.location,
            ...this.state,
            roi: this.state.totalRevenue > 0
                ? ((this.state.totalRevenue - this.state.totalWinnings) / this.state.totalRevenue * 100).toFixed(2) + "%"
                : "0%"
        };
    }
}

/* ========================================================================= */
/*                            USER INTERFACE                                */
/* ========================================================================= */

async function showGamblingUI(player, machine) {
    const balance = machine.getPlayerBalance(player);

    const form = new ActionFormData()
        .title("🎰 Shelf Gambling Machine")
        .body(`Your Balance: §6${balance} coins\n\nLast Winner: §a${machine.state.lastWinner ?? "None"}\nLast Win: §6+${machine.state.lastWinAmount}`)
        .button("§e📊 Place Bet (10 coins)")
        .button("§e📊 Place Bet (25 coins)")
        .button("§e📊 Place Bet (50 coins)")
        .button("§c🛑 View Stats")
        .button("§7Cancel");

    const response = await form.show(player);

    if (response.canceled) return;

    if (response.selection === 3) {
        showStatsUI(player, machine);
    } else if (response.selection < 3) {
        const bets = [10, 25, 50];
        const betAmount = bets[response.selection];
        await machine.playGame(player, betAmount);
    }
}

async function showStatsUI(player, machine) {
    const stats = machine.getStats();
    const form = new ActionFormData()
        .title("🎰 Machine Statistics")
        .body(
            `Location: §6${stats.location.x}, ${stats.location.y}, ${stats.location.z}\n\n` +
            `§oTotal Spins: §6${stats.spinCount}\n` +
            `§oTotal Revenue: §6${stats.totalRevenue}\n` +
            `§oTotal Winnings: §6${stats.totalWinnings}\n` +
            `§oHouse Edge: §6${stats.roi}\n` +
            `§oLast Winner: §a${stats.lastWinner ?? "None"}\n` +
            `§oLast Win: §6+${stats.lastWinAmount}`
        )
        .button("Back");

    await form.show(player);
}

/* ========================================================================= */
/*                        REDSTONE INTEGRATION                              */
/* ========================================================================= */

class ShelfRedstoneController {
    constructor() {
        this.activeMachines = new Map();
        this.lastPowerState = new Map();
    }

    registerMachine(x, y, z, machine) {
        const key = `${x}_${y}_${z}`;
        this.activeMachines.set(key, machine);
        this.lastPowerState.set(key, false);
    }

    updatePowerState(x, y, z, powered) {
        const key = `${x}_${y}_${z}`;
        const machine = this.activeMachines.get(key);

        if (!machine) return;

        if (powered && !this.lastPowerState.get(key)) {
            // Redstone gerade aktiviert - trigger automatic spin
            if (GAMBLING_CONFIG.automation.autoSpinOnPower) {
                this.triggerAutomaticSpin(machine);
            }
            machine.state.isPowered = true;
        } else if (!powered && this.lastPowerState.get(key)) {
            // Redstone gerade deaktiviert
            machine.state.isPowered = false;
        }

        this.lastPowerState.set(key, powered);
        machine.saveState();
    }

    async triggerAutomaticSpin(machine) {
        // Findet einen zufälligen online Spieler und lässt ihn spielen
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            // Automatische Wette
            await machine.playGame(randomPlayer, 10);
        }
    }
}

const redstoneController = new ShelfRedstoneController();

/* ========================================================================= */
/*                        INITIALIZATION & COMMANDS                         */
/* ========================================================================= */

// Initialisiere Coin-Objective wenn nicht vorhanden
function initializeCurrencySystem() {
    let objective = world.scoreboard.getObjective(GAMBLING_CONFIG.betting.currency);
    if (!objective) {
        objective = world.scoreboard.addObjective(
            GAMBLING_CONFIG.betting.currency,
            "Player gambling coins"
        );
    }

    // Initialize alle spieler
    world.getAllPlayers().forEach(player => {
        if (player.scoreboardIdentity) {
            const currentBalance = objective.getScore(player.scoreboardIdentity);
            if (currentBalance === undefined || currentBalance === null) {
                objective.setScore(player.scoreboardIdentity, GAMBLING_CONFIG.betting.defaultBalance);
            }
        }
    });
}

// Keine Commands hier - werden in index.js registriert!
// Keine Event-Listener hier - werden in index.js registriert!

export { ShelfGamblingMachine, redstoneController, initializeCurrencySystem };
