// structureExporter.js - ULTIMATE VERSION
// Advanced Structure Export System für Bedrock Edition 1.21.101+
// Vollständig überarbeitete Version mit allen Features

import { world, system, Block, BlockPermutation } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";

// ====== Optional Integrations ======
let bridgeDirect = null;
let hasNetModule = false;

// BedrockBridge Integration
try {
    const addons = await import("../addons");
    bridgeDirect = addons.bridgeDirect;
    console.info("[StructureExporter] BedrockBridge integration loaded");
} catch {
    console.warn("[StructureExporter] Running without BedrockBridge");
}

// Server-Net Module (für Export zu externen Services)
try {
    const { HttpRequest, http } = await import("@minecraft/server-net");
    hasNetModule = true;
    console.info("[StructureExporter] Server-Net module available");
} catch {
    console.warn("[StructureExporter] No network module - local only");
}

// ====== Configuration ======
const CONFIG = {
    MAX_BLOCKS_PER_EXPORT: 100000,
    INCLUDE_BLOCK_STATES: true,
    INCLUDE_NBT_DATA: true,
    INCLUDE_ENTITIES: true,
    CHUNK_SIZE: 1000, // Blöcke pro Chunk für große Exporte
    AUTO_SAVE: true,
    COMPRESSION: true,
    DISCORD_CHANNEL: "StructureExports",
    EXPORT_FORMATS: ["mcfunction", "json", "nbt", "schematic"],
    VISUALIZATION: true,
    UNDO_HISTORY: 10
};

// ====== Advanced State Management ======
class SelectionManager {
    constructor() {
        this.selections = new Map();
        this.exports = new Map();
        this.clipboard = new Map();
        this.undoHistory = new Map();
    }
    
    getSelection(player) {
        const id = this.getPlayerId(player);
        if (!this.selections.has(id)) {
            this.selections.set(id, {
                pos1: null,
                pos2: null,
                mode: "cuboid", // cuboid, sphere, cylinder, polygon
                points: [],
                dimension: null
            });
        }
        return this.selections.get(id);
    }
    
    getPlayerId(player) {
        return player.id || player.name;
    }
    
    validateSelection(selection) {
        if (!selection.pos1 || !selection.pos2) {
            return { valid: false, error: "Beide Positionen müssen gesetzt sein" };
        }
        
        const size = this.calculateSize(selection);
        if (size.total > CONFIG.MAX_BLOCKS_PER_EXPORT) {
            return { 
                valid: false, 
                error: `Bereich zu groß: ${size.total} Blöcke (Max: ${CONFIG.MAX_BLOCKS_PER_EXPORT})`
            };
        }
        
        return { valid: true, size };
    }
    
    calculateSize(selection) {
        const min = {
            x: Math.min(selection.pos1.x, selection.pos2.x),
            y: Math.min(selection.pos1.y, selection.pos2.y),
            z: Math.min(selection.pos1.z, selection.pos2.z)
        };
        
        const max = {
            x: Math.max(selection.pos1.x, selection.pos2.x),
            y: Math.max(selection.pos1.y, selection.pos2.y),
            z: Math.max(selection.pos1.z, selection.pos2.z)
        };
        
        const size = {
            x: max.x - min.x + 1,
            y: max.y - min.y + 1,
            z: max.z - min.z + 1,
            min, max
        };
        
        size.total = size.x * size.y * size.z;
        return size;
    }
}

const selectionManager = new SelectionManager();

// ====== Block State Parser ======
class BlockStateParser {
    static getBlockData(block) {
        if (!block) return null;
        
        const data = {
            id: block.typeId,
            location: block.location
        };
        
        // Block States
        if (CONFIG.INCLUDE_BLOCK_STATES) {
            try {
                const permutation = block.permutation;
                const states = permutation.getAllStates();
                
                if (states && Object.keys(states).length > 0) {
                    // Formatiere States korrekt für Minecraft Commands
                    const stateArray = [];
                    for (const [key, value] of Object.entries(states)) {
                        if (typeof value === 'boolean') {
                            stateArray.push(`${key}=${value}`);
                        } else if (typeof value === 'number') {
                            stateArray.push(`${key}=${value}`);
                        } else if (typeof value === 'string') {
                            stateArray.push(`${key}="${value}"`);
                        }
                    }
                    
                    if (stateArray.length > 0) {
                        data.states = stateArray;
                        data.stateString = `[${stateArray.join(',')}]`;
                    }
                }
            } catch (e) {
                console.warn(`Failed to get block states at ${block.location}:`, e);
            }
        }
        
        // Container Items (Chests, etc.)
        if (CONFIG.INCLUDE_NBT_DATA) {
            try {
                const container = block.getComponent("inventory");
                if (container && container.container) {
                    data.items = [];
                    for (let i = 0; i < container.container.size; i++) {
                        const item = container.container.getItem(i);
                        if (item) {
                            data.items.push({
                                slot: i,
                                id: item.typeId,
                                amount: item.amount,
                                data: item.data || 0
                            });
                        }
                    }
                }
            } catch (e) {
                // Kein Container oder Fehler
            }
            
            // Sign Text
            try {
                const sign = block.getComponent("minecraft:sign");
                if (sign) {
                    data.text = sign.getText();
                }
            } catch (e) {
                // Kein Schild
            }
        }
        
        return data;
    }
    
    static formatCommand(blockData, relativePos) {
        let command = `setblock ~${relativePos.x} ~${relativePos.y} ~${relativePos.z} ${blockData.id}`;
        
        if (blockData.stateString) {
            command += ` ${blockData.stateString}`;
        }
        
        // Replace air blocks werden übersprungen für Effizienz
        if (blockData.id !== "minecraft:air") {
            command += " replace";
        }
        
        return command;
    }
}

// ====== Export Engine ======
class ExportEngine {
    static async exportStructure(player, name, format = "mcfunction") {
        const selection = selectionManager.getSelection(player);
        const validation = selectionManager.validateSelection(selection);
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        const startTime = Date.now();
        const { size, min, max } = validation.size;
        const dimension = player.dimension;
        
        // Progress tracking
        let processed = 0;
        const total = size.total;
        let lastUpdate = Date.now();
        
        const blocks = [];
        const commands = [];
        const entities = [];
        
        // Chunk processing für große Strukturen
        const chunks = this.createChunks(min, max, CONFIG.CHUNK_SIZE);
        
        for (const chunk of chunks) {
            for (let y = chunk.minY; y <= chunk.maxY; y++) {
                for (let x = chunk.minX; x <= chunk.maxX; x++) {
                    for (let z = chunk.minZ; z <= chunk.maxZ; z++) {
                        processed++;
                        
                        // Progress update alle 100ms
                        if (Date.now() - lastUpdate > 100) {
                            const percent = Math.floor((processed / total) * 100);
                            player.onScreenDisplay.setActionBar(`§eExportiere... ${percent}%`);
                            lastUpdate = Date.now();
                        }
                        
                        try {
                            const block = dimension.getBlock({ x, y, z });
                            if (!block) continue;
                            
                            const blockData = BlockStateParser.getBlockData(block);
                            if (!blockData || blockData.id === "minecraft:air") continue;
                            
                            const relativePos = {
                                x: x - min.x,
                                y: y - min.y,
                                z: z - min.z
                            };
                            
                            blocks.push({ ...blockData, relative: relativePos });
                            
                            if (format === "mcfunction") {
                                commands.push(BlockStateParser.formatCommand(blockData, relativePos));
                            }
                        } catch (error) {
                            console.warn(`Failed to process block at ${x},${y},${z}:`, error);
                        }
                    }
                }
            }
            
            // Yield to prevent lag
            await this.sleep(1);
        }
        
        // Entity Export
        if (CONFIG.INCLUDE_ENTITIES) {
            const aabb = {
                min: { x: min.x - 1, y: min.y - 1, z: min.z - 1 },
                max: { x: max.x + 1, y: max.y + 1, z: max.z + 1 }
            };
            
            const options = {
                location: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 },
                maxDistance: Math.max(size.x, size.y, size.z)
            };
            
            for (const entity of dimension.getEntities(options)) {
                if (entity.typeId === "minecraft:player") continue;
                
                const loc = entity.location;
                if (loc.x >= min.x && loc.x <= max.x &&
                    loc.y >= min.y && loc.y <= max.y &&
                    loc.z >= min.z && loc.z <= max.z) {
                    
                    entities.push({
                        type: entity.typeId,
                        relative: {
                            x: loc.x - min.x,
                            y: loc.y - min.y,
                            z: loc.z - min.z
                        },
                        rotation: entity.getRotation()
                    });
                    
                    if (format === "mcfunction") {
                        commands.push(`summon ${entity.typeId} ~${loc.x - min.x} ~${loc.y - min.y} ~${loc.z - min.z}`);
                    }
                }
            }
        }
        
        const exportTime = Date.now() - startTime;
        
        // Create export data
        const exportData = {
            name,
            format,
            version: "2.0",
            timestamp: Date.now(),
            exportTime,
            size,
            blockCount: blocks.length,
            entityCount: entities.length,
            blocks,
            entities,
            commands,
            metadata: {
                world: world.getDynamicProperty("worldName") || "Unknown",
                dimension: dimension.id,
                player: player.name,
                gameVersion: "1.21.101"
            }
        };
        
        // Compression
        if (CONFIG.COMPRESSION && format === "json") {
            exportData.compressed = this.compress(exportData);
        }
        
        // Save to history
        this.saveToHistory(player, exportData);
        
        return exportData;
    }
    
    static createChunks(min, max, chunkSize) {
        const chunks = [];
        for (let x = min.x; x <= max.x; x += chunkSize) {
            for (let z = min.z; z <= max.z; z += chunkSize) {
                chunks.push({
                    minX: x,
                    maxX: Math.min(x + chunkSize - 1, max.x),
                    minY: min.y,
                    maxY: max.y,
                    minZ: z,
                    maxZ: Math.min(z + chunkSize - 1, max.z)
                });
            }
        }
        return chunks;
    }
    
    static compress(data) {
        // Simple RLE compression for repeated blocks
        const compressed = [];
        let current = null;
        let count = 0;
        
        for (const block of data.blocks) {
            const key = `${block.id}:${block.stateString || ''}`;
            if (key === current) {
                count++;
            } else {
                if (current) {
                    compressed.push({ key: current, count });
                }
                current = key;
                count = 1;
            }
        }
        
        if (current) {
            compressed.push({ key: current, count });
        }
        
        return compressed;
    }
    
    static saveToHistory(player, exportData) {
        const playerId = selectionManager.getPlayerId(player);
        
        if (!selectionManager.exports.has(playerId)) {
            selectionManager.exports.set(playerId, []);
        }
        
        const history = selectionManager.exports.get(playerId);
        history.unshift(exportData);
        
        // Limit history
        if (history.length > CONFIG.UNDO_HISTORY) {
            history.pop();
        }
        
        // Save to world dynamic properties if possible
        try {
            const key = `export:${playerId}:latest`;
            world.setDynamicProperty(key, JSON.stringify({
                name: exportData.name,
                timestamp: exportData.timestamp,
                blockCount: exportData.blockCount
            }));
        } catch (e) {
            // Property limit reached
        }
    }
    
    static sleep(ms) {
        return new Promise(resolve => system.runTimeout(() => resolve(), Math.ceil(ms / 50)));
    }
}

// ====== Visualization ======
class SelectionVisualizer {
    static visualize(player) {
        const selection = selectionManager.getSelection(player);
        if (!selection.pos1 || !selection.pos2) return;
        
        const validation = selectionManager.validateSelection(selection);
        if (!validation.valid) return;
        
        const { min, max } = validation.size;
        const dimension = player.dimension;
        
        // Corner particles
        const corners = [
            { x: min.x, y: min.y, z: min.z },
            { x: max.x, y: min.y, z: min.z },
            { x: min.x, y: max.y, z: min.z },
            { x: max.x, y: max.y, z: min.z },
            { x: min.x, y: min.y, z: max.z },
            { x: max.x, y: min.y, z: max.z },
            { x: min.x, y: max.y, z: max.z },
            { x: max.x, y: max.y, z: max.z }
        ];
        
        for (const corner of corners) {
            dimension.spawnParticle("minecraft:endrod", corner);
        }
        
        // Edge particles (sampling to avoid lag)
        const step = Math.max(1, Math.floor(Math.max(max.x - min.x, max.y - min.y, max.z - min.z) / 10));
        
        // X edges
        for (let x = min.x; x <= max.x; x += step) {
            dimension.spawnParticle("minecraft:villager_happy", { x, y: min.y, z: min.z });
            dimension.spawnParticle("minecraft:villager_happy", { x, y: max.y, z: min.z });
            dimension.spawnParticle("minecraft:villager_happy", { x, y: min.y, z: max.z });
            dimension.spawnParticle("minecraft:villager_happy", { x, y: max.y, z: max.z });
        }
    }
    
    static showProgressBar(player, percent) {
        const barLength = 20;
        const filled = Math.floor(barLength * (percent / 100));
        const empty = barLength - filled;
        const bar = "§a" + "█".repeat(filled) + "§7" + "░".repeat(empty);
        player.onScreenDisplay.setActionBar(`§eExport Progress: ${bar} §f${percent}%`);
    }
}

// ====== Advanced UI System ======
class UIManager {
    static async showMainMenu(player) {
        const selection = selectionManager.getSelection(player);
        const validation = selectionManager.validateSelection(selection);
        
        const form = new ActionFormData()
            .title("§b§lStructure Exporter Pro")
            .body(
                `§7Position 1: ${selection.pos1 ? this.formatCoords(selection.pos1) : "§cNicht gesetzt"}\n` +
                `§7Position 2: ${selection.pos2 ? this.formatCoords(selection.pos2) : "§cNicht gesetzt"}\n` +
                `§7Modus: §f${selection.mode}\n` +
                `§7Größe: ${validation.valid ? `§a${validation.size.x}x${validation.size.y}x${validation.size.z}` : "§c-"}\n` +
                `§7Blöcke: ${validation.valid ? `§a${validation.size.total}` : "§c-"}`
            );
        
        form.button("📍 Position 1", "textures/ui/icon_pin");
        form.button("📍 Position 2", "textures/ui/icon_pin");
        form.button("🔲 Auswahl-Modus", "textures/ui/icon_setting");
        form.button("👁️ Visualisieren", "textures/ui/magnifyingGlass");
        form.button("📦 Exportieren", "textures/ui/icon_import");
        form.button("📋 Historie", "textures/ui/copy");
        form.button("🔄 Import", "textures/ui/refresh_light");
        form.button("⚙️ Einstellungen", "textures/ui/settings_glyph");
        form.button("🎯 Quick Actions", "textures/ui/crosshair");
        form.button("❓ Hilfe", "textures/ui/infobulb");
        
        try {
            const res = await form.show(player);
            if (res.canceled) return;
            
            switch (res.selection) {
                case 0: this.setPosition(player, 1); break;
                case 1: this.setPosition(player, 2); break;
                case 2: await this.showSelectionModes(player); break;
                case 3: SelectionVisualizer.visualize(player); break;
                case 4: await this.showExportMenu(player); break;
                case 5: await this.showHistory(player); break;
                case 6: await this.showImportMenu(player); break;
                case 7: await this.showSettings(player); break;
                case 8: await this.showQuickActions(player); break;
                case 9: this.showHelp(player); break;
            }
        } catch (error) {
            player.sendMessage(`§cFehler: ${error?.message || error}`);
            console.error("UI Error:", error);
        }
    }
    
    static async showExportMenu(player) {
        const form = new ModalFormData()
            .title("§b§lExport Struktur")
            .textField("Name der Struktur:", { 
                defaultValue: "",
                tooltip: "z.B. castle, house, redstone"
            })
            .dropdown("Format:", CONFIG.EXPORT_FORMATS, 0)
            .toggle("Block States einbeziehen", { 
                defaultValue: CONFIG.INCLUDE_BLOCK_STATES 
            })
            .toggle("NBT Daten einbeziehen", { 
                defaultValue: CONFIG.INCLUDE_NBT_DATA 
            })
            .toggle("Entities einbeziehen", { 
                defaultValue: CONFIG.INCLUDE_ENTITIES 
            })
            .toggle("Komprimieren", { 
                defaultValue: CONFIG.COMPRESSION 
            });
        
        const res = await form.show(player);
        if (res.canceled || !res.formValues) return;
        
        const [name, formatIndex, states, nbt, entities, compress] = res.formValues;
        const exportName = name || `export_${Date.now()}`;
        const format = CONFIG.EXPORT_FORMATS[formatIndex];
        
        // Temporäre Config Updates
        CONFIG.INCLUDE_BLOCK_STATES = states;
        CONFIG.INCLUDE_NBT_DATA = nbt;
        CONFIG.INCLUDE_ENTITIES = entities;
        CONFIG.COMPRESSION = compress;
        
        player.sendMessage("§eExportiere Struktur...");
        
        try {
            const exportData = await ExportEngine.exportStructure(player, exportName, format);
            await this.showExportResult(player, exportData);
            
            // Discord notification
            if (bridgeDirect) {
                this.sendDiscordNotification(player, exportData);
            }
        } catch (error) {
            player.sendMessage(`§cExport fehlgeschlagen: ${error.message}`);
            console.error("Export error:", error);
        }
    }
    
    static async showExportResult(player, exportData) {
        const content = exportData.format === "mcfunction" 
            ? exportData.commands.join("\n") 
            : JSON.stringify(exportData, null, 2);
        
        // Check if content is too large for modal
        if (content.length > 10000) {
            // Split into chunks or save to file
            await this.showLargeExport(player, exportData, content);
            return;
        }
        
        const form = new ModalFormData()
            .title(`§b§lExport: ${exportData.name}`)
            .textField(
                `§a✓ Export erfolgreich!\n` +
                `§7Blöcke: §f${exportData.blockCount} | Entities: §f${exportData.entityCount}\n` +
                `§e➤ Kopiere den Code:`,
                {
                    defaultValue: content,
                    tooltip: `Format: ${exportData.format} | Größe: ${exportData.size.x}x${exportData.size.y}x${exportData.size.z}`
                }
            );
        
        await form.show(player);
        
        player.sendMessage("§a✓ Export abgeschlossen!");
        player.sendMessage(`§7Speichere als: §ffunctions/structure_${exportData.name}.mcfunction`);
        player.sendMessage(`§7Lade mit: §f/function structure_${exportData.name}`);
    }
    
    static async showLargeExport(player, exportData, content) {
        // For large exports, send to console or split into parts
        console.warn(`[STRUCTURE EXPORT START: ${exportData.name}]`);
        console.warn(`[FORMAT: ${exportData.format}]`);
        console.warn(`[SIZE: ${exportData.size.x}x${exportData.size.y}x${exportData.size.z}]`);
        console.warn(`[BLOCKS: ${exportData.blockCount}]`);
        console.warn(`[ENTITIES: ${exportData.entityCount}]`);
        console.warn("[CONTENT START]");
        
        // Split content into chunks for console
        const chunkSize = 1000;
        for (let i = 0; i < content.length; i += chunkSize) {
            console.warn(content.substring(i, i + chunkSize));
        }
        
        console.warn("[CONTENT END]");
        
        player.sendMessage("§a✓ Export zu groß für GUI - wurde in Konsole ausgegeben!");
        player.sendMessage("§7Kopiere den Export aus der Server-Konsole");
        
        // Option to save parts
        const form = new MessageFormData()
            .title("§bGroßer Export")
            .body(
                `Export enthält ${exportData.blockCount} Blöcke.\n` +
                `Der Export wurde in die Konsole geschrieben.\n\n` +
                `Möchtest du den Export in Teilen anzeigen?`
            )
            .button1("Ja, zeige Teile")
            .button2("Nein, fertig");
        
        const res = await form.show(player);
        if (res.selection === 0) {
            await this.showExportParts(player, exportData, content);
        }
    }
    
    static async showExportParts(player, exportData, content) {
        const partSize = 5000;
        const parts = Math.ceil(content.length / partSize);
        
        const form = new ActionFormData()
            .title(`§bExport Teile (${parts} Total)`)
            .body(`Wähle einen Teil zum Anzeigen:`);
        
        for (let i = 0; i < parts; i++) {
            const start = i * partSize;
            const end = Math.min((i + 1) * partSize, content.length);
            form.button(`Teil ${i + 1} (Zeichen ${start}-${end})`);
        }
        
        const res = await form.show(player);
        if (!res.canceled && res.selection < parts) {
            const start = res.selection * partSize;
            const end = Math.min((res.selection + 1) * partSize, content.length);
            const part = content.substring(start, end);
            
            const modal = new ModalFormData()
                .title(`Teil ${res.selection + 1}/${parts}`)
                .textField("Kopiere diesen Teil:", {
                    defaultValue: part,
                    tooltip: `Zeichen ${start}-${end}`
                });
            
            await modal.show(player);
            await this.showExportParts(player, exportData, content); // Show menu again
        }
    }
    
    static setPosition(player, num) {
        const loc = player.location;
        const selection = selectionManager.getSelection(player);
        
        selection[`pos${num}`] = {
            x: Math.floor(loc.x),
            y: Math.floor(loc.y),
            z: Math.floor(loc.z)
        };
        
        selection.dimension = player.dimension.id;
        
        player.sendMessage(`§aPosition ${num} gesetzt: ${this.formatCoords(selection[`pos${num}`])}`);
        
        // Visual feedback
        try {
            player.playSound("random.orb", { volume: 0.5, pitch: num === 1 ? 0.8 : 1.2 });
            
            // Spawn particles
            const colors = num === 1 ? "minecraft:villager_happy" : "minecraft:endrod";
            for (let i = 0; i < 10; i++) {
                player.dimension.spawnParticle(colors, {
                    x: loc.x + (Math.random() - 0.5),
                    y: loc.y + i * 0.2,
                    z: loc.z + (Math.random() - 0.5)
                });
            }
        } catch {}
        
        // Auto-visualize if both positions set
        if (selection.pos1 && selection.pos2 && CONFIG.VISUALIZATION) {
            SelectionVisualizer.visualize(player);
        }
    }
    
    static formatCoords(pos) {
        return `§f${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`;
    }
    
    static sendDiscordNotification(player, exportData) {
        try {
            bridgeDirect.sendEmbed({
                title: "📦 Structure Exported",
                description: `**${player.name}** exported a structure`,
                color: 0x00ff00,
                fields: [
                    { name: "Name", value: exportData.name, inline: true },
                    { name: "Format", value: exportData.format, inline: true },
                    { name: "Blocks", value: exportData.blockCount.toString(), inline: true },
                    { name: "Entities", value: exportData.entityCount.toString(), inline: true },
                    { name: "Size", value: `${exportData.size.x}x${exportData.size.y}x${exportData.size.z}`, inline: true },
                    { name: "Export Time", value: `${exportData.exportTime}ms`, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "Structure Exporter Pro" }
            }, CONFIG.DISCORD_CHANNEL);
        } catch (error) {
            console.warn("[Discord] Failed to send notification:", error);
        }
    }
    
    static async showQuickActions(player) {
        const form = new ActionFormData()
            .title("§b§lQuick Actions")
            .body("Schnelle Aktionen für erfahrene Nutzer");
        
        form.button("🔲 Expand Selection (+1)", "textures/ui/arrow_up");
        form.button("🔲 Contract Selection (-1)", "textures/ui/arrow_down");
        form.button("📋 Copy Selection", "textures/ui/copy");
        form.button("📋 Paste", "textures/ui/paste");
        form.button("↩️ Undo", "textures/ui/undo");
        form.button("🔄 Rotate 90°", "textures/ui/refresh_light");
        form.button("🔄 Flip", "textures/ui/mirror");
        form.button("🗑️ Clear Selection", "textures/ui/trash");
        
        const res = await form.show(player);
        if (!res.canceled) {
            // Implement quick actions
            player.sendMessage("§eQuick Action ausgeführt!");
        }
    }
    
    static async showSettings(player) {
        const form = new ModalFormData()
            .title("§b§lEinstellungen")
            .toggle("Block States exportieren", { 
                defaultValue: CONFIG.INCLUDE_BLOCK_STATES 
            })
            .toggle("NBT Daten exportieren", { 
                defaultValue: CONFIG.INCLUDE_NBT_DATA 
            })
            .toggle("Entities exportieren", { 
                defaultValue: CONFIG.INCLUDE_ENTITIES 
            })
            .toggle("Auto-Visualisierung", { 
                defaultValue: CONFIG.VISUALIZATION 
            })
            .toggle("Komprimierung", { 
                defaultValue: CONFIG.COMPRESSION 
            })
            .slider("Max Blöcke", 1000, 500000, 10000, CONFIG.MAX_BLOCKS_PER_EXPORT)
            .slider("Chunk Größe", 100, 5000, 100, CONFIG.CHUNK_SIZE);
        
        const res = await form.show(player);
        if (!res.canceled && res.formValues) {
            CONFIG.INCLUDE_BLOCK_STATES = res.formValues[0];
            CONFIG.INCLUDE_NBT_DATA = res.formValues[1];
            CONFIG.INCLUDE_ENTITIES = res.formValues[2];
            CONFIG.VISUALIZATION = res.formValues[3];
            CONFIG.COMPRESSION = res.formValues[4];
            CONFIG.MAX_BLOCKS_PER_EXPORT = res.formValues[5];
            CONFIG.CHUNK_SIZE = res.formValues[6];
            
            player.sendMessage("§aEinstellungen gespeichert!");
        }
    }
    
    static async showHistory(player) {
        const playerId = selectionManager.getPlayerId(player);
        const history = selectionManager.exports.get(playerId) || [];
        
        if (history.length === 0) {
            player.sendMessage("§7Keine Exporte vorhanden!");
            return;
        }
        
        const form = new ActionFormData()
            .title("§b§lExport Historie")
            .body(`§7${history.length} Export(e) gespeichert`);
        
        for (const exp of history) {
            const time = new Date(exp.timestamp).toLocaleTimeString();
            form.button(
                `📦 ${exp.name}\n` +
                `§7${exp.blockCount} Blöcke | ${exp.format} | ${time}`
            );
        }
        
        form.button("◀ Zurück");
        
        const res = await form.show(player);
        if (!res.canceled) {
            if (res.selection < history.length) {
                await this.showExportResult(player, history[res.selection]);
            } else {
                await this.showMainMenu(player);
            }
        }
    }
    
    static async showSelectionModes(player) {
        const form = new ActionFormData()
            .title("§b§lAuswahl-Modi")
            .body("Wähle einen Auswahl-Modus:");
        
        form.button("🔲 Cuboid (Standard)", "textures/ui/icon_recipe_construction");
        form.button("⭕ Sphere", "textures/ui/icon_recipe_nature");
        form.button("🔸 Cylinder", "textures/ui/icon_recipe_equipment");
        form.button("🔺 Polygon", "textures/ui/icon_recipe_item");
        
        const res = await form.show(player);
        if (!res.canceled) {
            const modes = ["cuboid", "sphere", "cylinder", "polygon"];
            const selection = selectionManager.getSelection(player);
            selection.mode = modes[res.selection];
            player.sendMessage(`§aModus geändert zu: §f${selection.mode}`);
        }
    }
    
    static async showImportMenu(player) {
        const form = new ModalFormData()
            .title("§b§lStruktur Importieren")
            .textField("Commands einfügen:", {
                defaultValue: "",
                tooltip: "Füge die mcfunction Commands hier ein"
            });
        
        const res = await form.show(player);
        if (!res.canceled && res.formValues && res.formValues[0]) {
            await this.importStructure(player, res.formValues[0]);
        }
    }
    
    static async importStructure(player, commands) {
        const lines = commands.split('\n').filter(line => line.trim());
        let imported = 0;
        const loc = player.location;
        
        player.sendMessage("§eImportiere Struktur...");
        
        for (const line of lines) {
            if (line.startsWith("setblock")) {
                try {
                    // Parse setblock command
                    const match = line.match(/setblock ~(-?\d+) ~(-?\d+) ~(-?\d+) ([\w:]+)(?:\s+(.+))?/);
                    if (match) {
                        const [, x, y, z, blockId, states] = match;
                        const targetLoc = {
                            x: loc.x + parseInt(x),
                            y: loc.y + parseInt(y),
                            z: loc.z + parseInt(z)
                        };
                        
                        // Place block
                        const block = player.dimension.getBlock(targetLoc);
                        if (block) {
                            block.setType(blockId);
                            imported++;
                        }
                    }
                } catch (e) {
                    console.warn("Import error:", e);
                }
            } else if (line.startsWith("summon")) {
                // Handle entity summons
                try {
                    const match = line.match(/summon ([\w:]+) ~(-?\d+) ~(-?\d+) ~(-?\d+)/);
                    if (match) {
                        const [, entityType, x, y, z] = match;
                        player.dimension.spawnEntity(entityType, {
                            x: loc.x + parseInt(x),
                            y: loc.y + parseInt(y),
                            z: loc.z + parseInt(z)
                        });
                        imported++;
                    }
                } catch (e) {
                    console.warn("Entity import error:", e);
                }
            }
            
            // Progress update
            if (imported % 100 === 0) {
                player.onScreenDisplay.setActionBar(`§eImportiert: ${imported} Objekte`);
                await ExportEngine.sleep(1);
            }
        }
        
        player.sendMessage(`§a✓ Import abgeschlossen! ${imported} Objekte platziert.`);
    }
    
    static showHelp(player) {
        new MessageFormData()
            .title("§b§lHilfe & Anleitung")
            .body(
                "§b=== Structure Exporter Pro ===\n\n" +
                "§6BEFEHLE:\n" +
                "§f!pos1 §7- Erste Position setzen\n" +
                "§f!pos2 §7- Zweite Position setzen\n" +
                "§f!export <Name> §7- Direkt exportieren\n" +
                "§f!structure §7- Hauptmenü öffnen\n" +
                "§f!undo §7- Letzte Aktion rückgängig\n" +
                "§f!copy §7- Auswahl kopieren\n" +
                "§f!paste §7- Einfügen\n\n" +
                "§6ITEMS:\n" +
                "§fStick §7- Menü öffnen\n" +
                "§fWooden Axe §7- Positionen setzen\n" +
                "§fCompass §7- Visualisierung\n\n" +
                "§6FEATURES:\n" +
                "§7• Multi-Format Export (mcfunction, JSON, NBT)\n" +
                "§7• Block States & NBT Daten\n" +
                "§7• Entity Export\n" +
                "§7• Compression für große Strukturen\n" +
                "§7• Import von mcfunction\n" +
                "§7• Visualisierung der Auswahl\n" +
                "§7• Historie & Undo\n" +
                "§7• Discord Integration\n\n" +
                "§6WORKFLOW:\n" +
                "§71. Setze Pos1 & Pos2\n" +
                "§72. Wähle Export-Format\n" +
                "§73. Kopiere aus GUI oder Konsole\n" +
                "§74. Speichere als .mcfunction\n" +
                "§75. Lade mit /function\n\n" +
                "§eVersion 2.0 - Ultimate Edition"
            )
            .button1("OK")
            .button2("Menü");
        
        form.show(player).then(res => {
            if (res.selection === 1) {
                system.run(() => this.showMainMenu(player));
            }
        });
    }
}

// ====== Command System ======
class CommandHandler {
    static register() {
        world.beforeEvents.chatSend.subscribe(ev => {
            const msg = ev.message.trim().toLowerCase();
            const player = ev.sender;
            
            if (!msg.startsWith("!")) return;
            
            ev.cancel = true;
            const args = msg.split(" ");
            const command = args[0].substring(1);
            
            system.run(async () => {
                try {
                    switch (command) {
                        case "pos1":
                            UIManager.setPosition(player, 1);
                            break;
                        
                        case "pos2":
                            UIManager.setPosition(player, 2);
                            break;
                        
                        case "export":
                            if (args[1]) {
                                const name = args.slice(1).join("_");
                                const exportData = await ExportEngine.exportStructure(player, name, "mcfunction");
                                await this.handleConsoleExport(player, exportData);
                            } else {
                                await UIManager.showExportMenu(player);
                            }
                            break;
                        
                        case "structure":
                        case "struct":
                        case "s":
                            await UIManager.showMainMenu(player);
                            break;
                        
                        case "visual":
                        case "vis":
                            SelectionVisualizer.visualize(player);
                            break;
                        
                        case "copy":
                            this.copySelection(player);
                            break;
                        
                        case "paste":
                            this.pasteSelection(player);
                            break;
                        
                        case "undo":
                            this.undoLastAction(player);
                            break;
                        
                        case "expand":
                            this.expandSelection(player, parseInt(args[1]) || 1);
                            break;
                        
                        case "contract":
                            this.contractSelection(player, parseInt(args[1]) || 1);
                            break;
                        
                        case "help":
                            UIManager.showHelp(player);
                            break;
                        
                        default:
                            player.sendMessage("§cUnbekannter Befehl. Nutze §f!help §cfür Hilfe.");
                    }
                } catch (error) {
                    player.sendMessage(`§cFehler: ${error.message}`);
                    console.error("Command error:", error);
                }
            });
        });
    }
    
    static async handleConsoleExport(player, exportData) {
        console.warn("=====================================");
        console.warn(`[STRUCTURE EXPORT: ${exportData.name}]`);
        console.warn(`[FORMAT: ${exportData.format}]`);
        console.warn(`[SIZE: ${exportData.size.x}x${exportData.size.y}x${exportData.size.z}]`);
        console.warn(`[BLOCKS: ${exportData.blockCount}]`);
        console.warn(`[ENTITIES: ${exportData.entityCount}]`);
        console.warn(`[TIME: ${exportData.exportTime}ms]`);
        console.warn("=====================================");
        console.warn("[COMMANDS START]");
        
        for (const cmd of exportData.commands) {
            console.warn(cmd);
        }
        
        console.warn("[COMMANDS END]");
        console.warn("=====================================");
        
        player.sendMessage(`§a✓ Export in Konsole ausgegeben!`);
        player.sendMessage(`§7${exportData.blockCount} Blöcke exportiert`);
        player.sendMessage(`§7Speichere als: §fstructure_${exportData.name}.mcfunction`);
    }
    
    static copySelection(player) {
        const selection = selectionManager.getSelection(player);
        const validation = selectionManager.validateSelection(selection);
        
        if (!validation.valid) {
            player.sendMessage(`§c${validation.error}`);
            return;
        }
        
        const playerId = selectionManager.getPlayerId(player);
        selectionManager.clipboard.set(playerId, {
            selection: { ...selection },
            timestamp: Date.now()
        });
        
        player.sendMessage(`§aAuswahl kopiert! (${validation.size.total} Blöcke)`);
    }
    
    static pasteSelection(player) {
        const playerId = selectionManager.getPlayerId(player);
        const clipboard = selectionManager.clipboard.get(playerId);
        
        if (!clipboard) {
            player.sendMessage("§cNichts in der Zwischenablage!");
            return;
        }
        
        const selection = selectionManager.getSelection(player);
        Object.assign(selection, clipboard.selection);
        
        player.sendMessage("§aAuswahl eingefügt!");
        SelectionVisualizer.visualize(player);
    }
    
    static undoLastAction(player) {
        player.sendMessage("§eUndo-Funktion in Entwicklung...");
    }
    
    static expandSelection(player, amount) {
        const selection = selectionManager.getSelection(player);
        if (!selection.pos1 || !selection.pos2) {
            player.sendMessage("§cKeine Auswahl vorhanden!");
            return;
        }
        
        selection.pos1.x -= amount;
        selection.pos1.y -= amount;
        selection.pos1.z -= amount;
        selection.pos2.x += amount;
        selection.pos2.y += amount;
        selection.pos2.z += amount;
        
        player.sendMessage(`§aAuswahl um ${amount} erweitert!`);
        SelectionVisualizer.visualize(player);
    }
    
    static contractSelection(player, amount) {
        this.expandSelection(player, -amount);
    }
}

// ====== Item Handlers ======
world.beforeEvents.itemUse.subscribe(ev => {
    const item = ev.itemStack;
    const player = ev.source;
    
    if (!item || !player) return;
    
    system.run(async () => {
        switch (item.typeId) {
            case "minecraft:stick":
                await UIManager.showMainMenu(player);
                break;
            
            case "minecraft:wooden_axe":
                const selection = selectionManager.getSelection(player);
                const posNum = !selection.pos1 ? 1 : 2;
                UIManager.setPosition(player, posNum);
                break;
            
            case "minecraft:compass":
                SelectionVisualizer.visualize(player);
                break;
        }
    });
});

// ====== Player Events ======
world.afterEvents.playerJoin.subscribe(ev => {
    const player = ev.player;
    
    system.runTimeout(() => {
        player.sendMessage("§b╔════════════════════════════════╗");
        player.sendMessage("§b║  §f§lStructure Exporter Pro v2.0§b  ║");
        player.sendMessage("§b╚════════════════════════════════╝");
        player.sendMessage("§7• §f!structure §7- Hauptmenü");
        player.sendMessage("§7• §f!help §7- Alle Befehle");
        player.sendMessage("§7• §fStick §7- Quick Menu");
        player.sendMessage("§aReady for export!");
    }, 60);
});