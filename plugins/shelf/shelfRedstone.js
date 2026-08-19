/**
 * Shelf Redstone & Block Interaction System @version 1.0.0
 *
 * Fortgeschrittene Redstone-Integration:
 * - Shelf Block Event Handling
 * - Automatic Spin Trigger
 * - Comparator Output (Gewinn-Detektion)
 * - Automated Payout Systems
 * - Custom Block States
 *
 * by InnateAlpaca
 */

import { world, system, BlockPermutation } from '@minecraft/server';

/* ========================================================================= */
/*                        SHELF BLOCK MONITORING                            */
/* ========================================================================= */

class ShelfBlockMonitor {
    constructor() {
        this.shelfRegistry = new Map();
        this.lastInteraction = new Map();
        this.comparatorTracking = new Map();
    }

    /**
     * Registriere einen Shelf-Block zur Überwachung
     */
    registerShelf(x, y, z, gamblingMachine) {
        const key = `${x}_${y}_${z}`;
        this.shelfRegistry.set(key, {
            location: { x, y, z },
            gamblingMachine,
            powered: false,
            lastState: null
        });
    }

    /**
     * Prüfe auf Shelf-Interaktionen durch Spieler
     */
    checkPlayerInteraction(player, block) {
        // Prüfe ob es ein Shelf ist
        if (!this.isShelf(block)) return false;

        const key = `${block.x}_${block.y}_${block.z}`;
        const now = Date.now();
        const lastInteraction = this.lastInteraction.get(key) || 0;

        // Rate limiting - verhindere Spam
        if (now - lastInteraction < 1000) {
            return false;
        }

        this.lastInteraction.set(key, now);
        return true;
    }

    /**
     * Prüfe ob Block ein Shelf ist (alle Varianten)
     */
    isShelf(block) {
        const shelfTypes = [
            'oak_shelf', 'spruce_shelf', 'birch_shelf', 'jungle_shelf',
            'acacia_shelf', 'dark_oak_shelf', 'mangrove_shelf', 'cherry_shelf',
            'pale_oak_shelf', 'bamboo_shelf', 'crimson_shelf', 'warped_shelf'
        ];

        return shelfTypes.includes(block.typeId);
    }

    /**
     * Hole Shelf-Daten
     */
    getShelfData(x, y, z) {
        const key = `${x}_${y}_${z}`;
        return this.shelfRegistry.get(key);
    }

    /**
     * Detektiere Redstone-Power an Shelf
     */
    getPowerState(block) {
        try {
            const state = block.permutation.getState("powered_bit");
            return state === true || state === 1;
        } catch (e) {
            return false;
        }
    }

    /**
     * Detektiere connected Shelves (bis zu 3)
     */
    getConnectedShelves(block) {
        const connected = [];
        const dimension = world.getDimension(block.dimension.id);

        // Check Nachbar-Blöcke
        const offsets = [
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: -1 }
        ];

        for (const offset of offsets) {
            try {
                const neighbor = dimension.getBlock({
                    x: block.x + offset.x,
                    y: block.y + offset.y,
                    z: block.z + offset.z
                });

                if (this.isShelf(neighbor) && this.getPowerState(neighbor)) {
                    connected.push(neighbor);
                }
            } catch (e) {
                // Block außerhalb der Welt
            }
        }

        return connected;
    }

    /**
     * Bestimme Hotbar Swap-Slots basierend auf verbundenen Shelves
     */
    getSwapSlots(shelfCount) {
        // 1 Shelf = 3 rightmost slots (6-8)
        // 2 Shelves = 6 rightmost slots (3-8)
        // 3 Shelves = all 9 slots (0-8)
        if (shelfCount >= 3) return [0, 1, 2, 3, 4, 5, 6, 7, 8];
        if (shelfCount === 2) return [3, 4, 5, 6, 7, 8];
        return [6, 7, 8];
    }
}

/* ========================================================================= */
/*                        COMPARATOR OUTPUT SYSTEM                          */
/* ========================================================================= */

class ComparatorSystem {
    constructor() {
        this.comparatorThresholds = new Map();
    }

    /**
     * Berechne Comparator Output basierend auf Shelf-Inhalt
     * Gem. Minecraft Mechaniken:
     * - Left slot = power 1
     * - Middle slot = power 2
     * - Right slot = power 4
     * - Max = 7 wenn alle besetzt
     */
    calculateOutput(shelfData) {
        let power = 0;

        // Simuliere 3 Slots des Shelves
        const slots = [
            { index: 0, value: 1 },   // Left = 1
            { index: 1, value: 2 },   // Middle = 2
            { index: 2, value: 4 }    // Right = 4
        ];

        // Prüfe ob Slots besetzt sind
        if (shelfData && shelfData.currentReels) {
            shelfData.currentReels.forEach((reel, i) => {
                if (reel && reel !== "empty") {
                    power += slots[i].value;
                }
            });
        }

        return Math.min(power, 7);
    }

    /**
     * Emuliere Comparator-Verhalten
     */
    emulateComparator(inputPower, shelfPower) {
        // Comparator im Subtract Mode
        if (shelfPower > inputPower) {
            return shelfPower - inputPower;
        } else if (shelfPower === inputPower) {
            return 0; // Gleich = aus
        } else {
            return 0;
        }
    }

    /**
     * Gib Output-Strength für Visualisierung
     */
    getOutputStrength(shelfState) {
        const power = this.calculateOutput(shelfState);
        return {
            power,
            visiblePower: Math.min(power, 15), // Max MC Redstone
            description: this.getPowerDescription(power)
        };
    }

    getPowerDescription(power) {
        const descriptions = [
            "No items",
            "Left slot",
            "Middle slot",
            "Left + Middle",
            "Right slot",
            "Left + Right",
            "Middle + Right",
            "All slots filled"
        ];
        return descriptions[power] || "Unknown";
    }
}

/* ========================================================================= */
/*                        HOPPER INTEGRATION                                */
/* ========================================================================= */

class HopperIntegrationSystem {
    constructor() {
        this.hopperNets = new Map();
    }

    /**
     * Detektiere Hopper unterhalb von Shelf
     */
    detectHopperBelow(x, y, z, dimension) {
        try {
            const dim = world.getDimension(dimension);
            const hopperBlock = dim.getBlock({ x, y: y - 1, z });

            return hopperBlock && hopperBlock.typeId === 'hopper';
        } catch (e) {
            return false;
        }
    }

    /**
     * Simuliere Hopper-Ausbau von Shelf (links zu rechts)
     */
    getHopperPullOrder(shelfData) {
        const order = [];

        // Hopper zieht von links nach rechts
        if (shelfData && shelfData.currentReels) {
            shelfData.currentReels.forEach((item, i) => {
                if (item && item !== "empty") {
                    order.push({ slot: i, item });
                }
            });
        }

        return order;
    }

    /**
     * Simuliere Dropper-Push zu Shelf (sequenziell)
     */
    simulateDropperPush(items) {
        // Dropper pushes items in sequence to leftmost slot
        return {
            insertOrder: items,
            stackingBehavior: "left_to_right_stacking"
        };
    }
}

/* ========================================================================= */
/*                        AUTOMATED SYSTEMS                                 */
/* ========================================================================= */

class AutomatedGamblingSystem {
    constructor(gamblingMachine) {
        this.machine = gamblingMachine;
        this.automationRunning = false;
        this.runningLoops = new Map();
    }

    /**
     * Starte automatische Spins mit Redstone-Taktung
     */
    async startAutomation(tickRate = 20) {
        if (this.automationRunning) return false;

        this.automationRunning = true;

        // Main automation loop
        let ticks = 0;
        const loopId = system.runInterval(() => {
            if (!this.automationRunning) {
                system.clearRun(loopId);
                return;
            }

            ticks++;

            // Trigger spin alle X ticks
            if (ticks % tickRate === 0) {
                this.triggerAutomaticSpin();
                ticks = 0;
            }
        });

        this.runningLoops.set("main", loopId);
        return true;
    }

    /**
     * Stoppe Automatisierung
     */
    stopAutomation() {
        this.automationRunning = false;
        for (const loopId of this.runningLoops.values()) {
            system.clearRun(loopId);
        }
        this.runningLoops.clear();
    }

    /**
     * Trigger automatischer Spin
     */
    async triggerAutomaticSpin() {
        const players = world.getAllPlayers();
        if (players.length === 0) return;

        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const randomBet = [10, 25, 50][Math.floor(Math.random() * 3)];

        try {
            await this.machine.playGame(randomPlayer, randomBet);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Konfiguriere verschiedene Automatisierungs-Modi
     */
    configureMode(mode) {
        const modes = {
            "slow": 100,      // 1 spin pro 5 Sekunden
            "normal": 40,     // 1 spin pro 2 Sekunden
            "fast": 20,       // 1 spin pro Sekunde
            "insane": 5       // Sehr schnell
        };

        return modes[mode] || 40;
    }
}

/* ========================================================================= */
/*                        EVENT LISTENERS                                   */
/* ========================================================================= */

const shelfMonitor = new ShelfBlockMonitor();
const comparatorSystem = new ComparatorSystem();
const hopperSystem = new HopperIntegrationSystem();

// Überwache Block-Platzierungen
world.afterEvents.blockPlace.subscribe((event) => {
    if (shelfMonitor.isShelf(event.block)) {
        const machineKey = `machine_${event.block.x}_${event.block.y}_${event.block.z}`;
        // Neue Gambling Machine wenn Shelf platziert wird
        world.sendMessage(`§6[Shelf] Neuer Shelf erkannt bei ${event.block.x}, ${event.block.y}, ${event.block.z}`);
    }
});

// Überwache Block-Zerstörung
world.afterEvents.blockBreak.subscribe((event) => {
    if (shelfMonitor.isShelf(event.brokenBlockPermutation.type)) {
        const key = `${event.block.x}_${event.block.y}_${event.block.z}`;
        shelfMonitor.shelfRegistry.delete(key);
        world.sendMessage(`§6[Shelf] Shelf entfernt von ${event.block.x}, ${event.block.y}, ${event.block.z}`);
    }
});

export {
    ShelfBlockMonitor,
    ComparatorSystem,
    HopperIntegrationSystem,
    AutomatedGamblingSystem,
    shelfMonitor,
    comparatorSystem,
    hopperSystem
};
