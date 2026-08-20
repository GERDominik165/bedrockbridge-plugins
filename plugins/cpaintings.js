// custom-paintings.js
// BedrockBridge Plugin: Advanced Custom Paintings with Web & Camera Integration
// Version: 1.0.0

import { world, system } from "@minecraft/server";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

// Try to import BedrockBridge
let bridge, database, bridgeAvailable = false;
try {
    const module = await import("../addons");
    bridge = module.bridge;
    database = module.database;
    bridgeAvailable = true;
    console.info("[CustomPaintings] BedrockBridge API loaded");
} catch (e) {
    console.warn("[CustomPaintings] Running in standalone mode");
}

// ===== CONFIGURATION =====
const CONFIG = {
    painting: {
        entity: "custom:painting_pixel",
        blockId: "custom:painting_block",
        maxSize: 128, // 16x8 pixels
        pixelsPerRow: 8,
        defaultColor: "FFFFFF"
    },
    
    api: {
        imageProcessing: "https://api.example.com/process-image", // Your image processing API
        maxImageSize: 1024 * 1024 * 5, // 5MB
        supportedFormats: ["jpg", "jpeg", "png", "gif", "webp"],
        timeout: 30
    },
    
    ui: {
        title: "§b§lCustom Painting",
        colors: {
            primary: "§b",
            secondary: "§3",
            success: "§a",
            warning: "§e",
            error: "§c",
            info: "§7"
        }
    },
    
    features: {
        webImages: true,
        cameraRoll: true,
        colorPicker: true,
        templates: true,
        sharing: true,
        animations: true
    },
    
    storage: {
        maxSavedPaintings: 100,
        maxTemplates: 50
    }
};

// ===== PAINTING TEMPLATES =====
const TEMPLATES = {
    minecraft: {
        creeper: "0F7F0F,0F7F0F,000000,000000,000000,000000,0F7F0F,0F7F0F...", // Simplified
        steve: "8B4513,8B4513,FFDBAC,FFDBAC,FFDBAC,FFDBAC,8B4513,8B4513...",
        diamond: "00CED1,00CED1,40E0D0,40E0D0,40E0D0,40E0D0,00CED1,00CED1..."
    },
    
    patterns: {
        rainbow: generateRainbowPattern(),
        gradient: generateGradientPattern("#FF0000", "#0000FF"),
        checkerboard: generateCheckerboardPattern("#000000", "#FFFFFF")
    },
    
    art: {
        monalisa: "...", // Simplified famous paintings
        starryNight: "...",
        theScream: "..."
    }
};

// ===== UTILITY FUNCTIONS =====
function generateRandomID(length = 12) {
    return Math.random().toString(36).substring(2, 2 + length);
}

function hexToRGB(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return { r, g, b };
}

function rgbToFloat(r, g, b) {
    return {
        r: parseFloat((r / 255).toFixed(3)),
        g: parseFloat((g / 255).toFixed(3)),
        b: parseFloat((b / 255).toFixed(3))
    };
}

function generateRainbowPattern() {
    const colors = ["FF0000", "FF7F00", "FFFF00", "00FF00", "0000FF", "4B0082", "9400D3"];
    let pattern = [];
    
    for (let i = 0; i < 128; i++) {
        pattern.push(colors[i % colors.length]);
    }
    
    return pattern.join(",");
}

function generateGradientPattern(startColor, endColor) {
    const start = hexToRGB(startColor);
    const end = hexToRGB(endColor);
    let pattern = [];
    
    for (let i = 0; i < 128; i++) {
        const ratio = i / 127;
        const r = Math.round(start.r + (end.r - start.r) * ratio);
        const g = Math.round(start.g + (end.g - start.g) * ratio);
        const b = Math.round(start.b + (end.b - start.b) * ratio);
        
        pattern.push(((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'));
    }
    
    return pattern.join(",");
}

function generateCheckerboardPattern(color1, color2) {
    let pattern = [];
    
    for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 8; col++) {
            pattern.push((row + col) % 2 === 0 ? color1.replace('#', '') : color2.replace('#', ''));
        }
    }
    
    return pattern.join(",");
}

// ===== IMAGE PROCESSING =====
class ImageProcessor {
    constructor() {
        this.cache = new Map();
    }
    
    async processImageFromURL(url) {
        // Check cache
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }
        
        try {
            // Fetch image data
            const imageData = await this.fetchImage(url);
            
            // Process to 16x8 pixels
            const pixelData = await this.resizeAndQuantize(imageData);
            
            // Cache result
            this.cache.set(url, pixelData);
            
            return pixelData;
        } catch (error) {
            console.error("[CustomPaintings] Image processing error:", error);
            throw error;
        }
    }
    
    async fetchImage(url) {
        const request = new HttpRequest(url)
            .setMethod(HttpRequestMethod.Get)
            .setHeaders([
                new HttpHeader('Accept', 'image/*')
            ])
            .setTimeout(CONFIG.api.timeout);
        
        const response = await http.request(request);
        
        if (response.status !== 200) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        return response.body;
    }
    
    async resizeAndQuantize(imageData) {
        // In a real implementation, this would:
        // 1. Decode the image format
        // 2. Resize to 16x8 pixels
        // 3. Quantize colors
        // 4. Return hex color array
        
        // For now, return a placeholder pattern
        return generateGradientPattern("#FF0000", "#0000FF");
    }
    
    // Simulate camera roll image processing
    async processFromCameraRoll(imageId) {
        // In a real implementation, this would interface with
        // the device's camera roll through BedrockBridge
        
        // Simulate with random pattern
        const patterns = Object.values(TEMPLATES.patterns);
        return patterns[Math.floor(Math.random() * patterns.length)];
    }
}

// ===== PAINTING MANAGER =====
class PaintingManager {
    constructor() {
        this.paintings = new Map();
        this.imageProcessor = new ImageProcessor();
        this.init();
    }
    
    async init() {
        if (bridgeAvailable && database) {
            try {
                await database.makeTable('custom_paintings', {
                    id: 'string',
                    owner: 'string',
                    name: 'string',
                    data: 'string',
                    created: 'int',
                    type: 'string'
                });
                
                await database.makeTable('painting_templates', {
                    id: 'string',
                    name: 'string',
                    data: 'string',
                    creator: 'string',
                    public: 'int'
                });
            } catch (error) {
                console.warn("[CustomPaintings] Database init error:", error);
            }
        }
    }
    
    createPainting(location, dimension, rotation, paintingId) {
        const pixels = [];
        
        // Spawn pixel entities
        for (let i = 1; i <= CONFIG.painting.maxSize; i++) {
            const entity = dimension.spawnEntity(CONFIG.painting.entity, {
                x: location.x,
                y: location.y,
                z: location.z
            });
            
            entity.setRotation(rotation);
            entity.addTag(`pixel_${i}`);
            entity.addTag(paintingId);
            entity.setProperty("custom:pixel_id", i);
            
            pixels.push(entity);
        }
        
        this.paintings.set(paintingId, {
            id: paintingId,
            pixels: pixels,
            location: location,
            dimension: dimension.id,
            created: Date.now()
        });
        
        return paintingId;
    }
    
    applyColors(paintingId, colorData) {
        const painting = this.paintings.get(paintingId);
        if (!painting) return false;
        
        const colors = colorData.split(',').map(c => c.trim());
        
        colors.forEach((hexColor, index) => {
            if (index >= CONFIG.painting.maxSize) return;
            
            const pixelIndex = index % CONFIG.painting.pixelsPerRow;
            const pixelRow = Math.floor(index / CONFIG.painting.pixelsPerRow) + 1;
            
            const rgb = hexToRGB(hexColor);
            const floatRGB = rgbToFloat(rgb.r, rgb.g, rgb.b);
            
            // Find pixel entities
            painting.dimension.getEntities({
                type: CONFIG.painting.entity,
                tags: [paintingId, `pixel_${pixelRow}`]
            }).forEach(entity => {
                entity.setProperty(`custom:p${pixelIndex + 1}_r`, floatRGB.r);
                entity.setProperty(`custom:p${pixelIndex + 1}_g`, floatRGB.g);
                entity.setProperty(`custom:p${pixelIndex + 1}_b`, floatRGB.b);
            });
        });
        
        return true;
    }
    
    async savePainting(paintingId, owner, name, type = 'custom') {
        if (!bridgeAvailable || !database) return false;
        
        const painting = this.paintings.get(paintingId);
        if (!painting) return false;
        
        try {
            await database.query(
                'INSERT INTO custom_paintings (id, owner, name, data, created, type) VALUES (?, ?, ?, ?, ?, ?)',
                [paintingId, owner, name, painting.colorData || '', Date.now(), type]
            );
            return true;
        } catch (error) {
            console.error("[CustomPaintings] Save error:", error);
            return false;
        }
    }
    
    async loadPainting(paintingId) {
        if (!bridgeAvailable || !database) return null;
        
        try {
            const rows = await database.query(
                'SELECT * FROM custom_paintings WHERE id = ?',
                [paintingId]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("[CustomPaintings] Load error:", error);
            return null;
        }
    }
    
    removePainting(paintingId) {
        const painting = this.paintings.get(paintingId);
        if (!painting) return;
        
        // Remove all pixel entities
        world.getDimension(painting.dimension).getEntities({
            type: CONFIG.painting.entity,
            tags: [paintingId]
        }).forEach(entity => {
            entity.triggerEvent("custom:despawn");
        });
        
        this.paintings.delete(paintingId);
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor(paintingManager) {
        this.paintingManager = paintingManager;
    }
    
    async showMainMenu(player, paintingId) {
        const form = new ActionFormData()
            .title(CONFIG.ui.title)
            .body(`${CONFIG.ui.colors.info}Choose how to create your painting:`);
        
        if (CONFIG.features.webImages) {
            form.button(`${CONFIG.ui.colors.primary}🌐 Image from URL`, "textures/ui/world_glyph_color");
        }
        
        if (CONFIG.features.cameraRoll) {
            form.button(`${CONFIG.ui.colors.primary}📷 Camera Roll`, "textures/ui/camera_alt");
        }
        
        form.button(`${CONFIG.ui.colors.primary}🎨 Color Picker`, "textures/ui/paint_bucket");
        form.button(`${CONFIG.ui.colors.primary}📋 Templates`, "textures/ui/copy");
        form.button(`${CONFIG.ui.colors.secondary}✏️ Manual Input`, "textures/ui/edit_box");
        
        if (paintingId) {
            form.button(`${CONFIG.ui.colors.warning}🗑️ Remove Painting`, "textures/ui/trash");
        }
        
        try {
            const response = await form.show(player);
            if (response.canceled) {
                // Apply default if new painting
                if (!this.paintingManager.paintings.has(paintingId)) {
                    this.paintingManager.applyColors(paintingId, TEMPLATES.patterns.rainbow);
                }
                return;
            }
            
            let buttonIndex = 0;
            if (CONFIG.features.webImages && response.selection === buttonIndex++) {
                await this.showURLInput(player, paintingId);
            } else if (CONFIG.features.cameraRoll && response.selection === buttonIndex++) {
                await this.showCameraRoll(player, paintingId);
            } else if (response.selection === buttonIndex++) {
                await this.showColorPicker(player, paintingId);
            } else if (response.selection === buttonIndex++) {
                await this.showTemplates(player, paintingId);
            } else if (response.selection === buttonIndex++) {
                await this.showManualInput(player, paintingId);
            } else if (paintingId && response.selection === buttonIndex++) {
                this.paintingManager.removePainting(paintingId);
                player.sendMessage(`${CONFIG.ui.colors.success}Painting removed!`);
            }
            
        } catch (error) {
            console.error("[CustomPaintings] UI error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}An error occurred. Please try again.`);
        }
    }
    
    async showURLInput(player, paintingId) {
        const form = new ModalFormData()
            .title(`${CONFIG.ui.title} - Image URL`);
        
        form.textField("Image URL", "https://example.com/image.jpg");
        form.toggle("Stretch to fit");
        form.slider("Brightness", -100, 100, 1);
        form.slider("Contrast", -100, 100, 1);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player, paintingId);
            
            const [url, stretch, brightness, contrast] = response.formValues;
            
            if (!url || !url.startsWith('http')) {
                player.sendMessage(`${CONFIG.ui.colors.error}Please enter a valid URL`);
                return this.showURLInput(player, paintingId);
            }
            
            player.sendMessage(`${CONFIG.ui.colors.info}Processing image...`);
            
            try {
                const colorData = await this.paintingManager.imageProcessor.processImageFromURL(url);
                this.paintingManager.applyColors(paintingId, colorData);
                player.sendMessage(`${CONFIG.ui.colors.success}Image applied successfully!`);
                
                // Ask to save
                await this.showSaveDialog(player, paintingId, 'url');
                
            } catch (error) {
                player.sendMessage(`${CONFIG.ui.colors.error}Failed to process image: ${error.message}`);
                await this.showMainMenu(player, paintingId);
            }
            
        } catch (error) {
            console.error("[CustomPaintings] URL input error:", error);
        }
    }
    
    async showCameraRoll(player, paintingId) {
        // In a real implementation, this would show images from device
        // For now, simulate with a selection menu
        
        const form = new ActionFormData()
            .title(`${CONFIG.ui.title} - Camera Roll`)
            .body(`${CONFIG.ui.colors.info}Select an image:`);
        
        // Simulated recent images
        const recentImages = [
            "📸 Photo from today",
            "📸 Screenshot",
            "📸 Downloaded image",
            "📸 Camera photo"
        ];
        
        recentImages.forEach(img => {
            form.button(img, "textures/ui/camera_alt");
        });
        
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled || response.selection === recentImages.length) {
                return this.showMainMenu(player, paintingId);
            }
            
            player.sendMessage(`${CONFIG.ui.colors.info}Processing image...`);
            
            // Simulate processing
            const colorData = await this.paintingManager.imageProcessor.processFromCameraRoll(response.selection);
            this.paintingManager.applyColors(paintingId, colorData);
            
            player.sendMessage(`${CONFIG.ui.colors.success}Image applied!`);
            await this.showSaveDialog(player, paintingId, 'camera');
            
        } catch (error) {
            console.error("[CustomPaintings] Camera roll error:", error);
        }
    }
    
    async showColorPicker(player, paintingId) {
        const form = new ModalFormData()
            .title(`${CONFIG.ui.title} - Color Picker`);
        
        form.dropdown("Pattern", [
            "Solid Color",
            "Gradient",
            "Rainbow",
            "Checkerboard",
            "Random"
        ]);
        
        form.textField("Primary Color", "#RRGGBB or RRGGBB");
        form.textField("Secondary Color (for patterns)", "#RRGGBB or RRGGBB");
        form.dropdown("Direction", ["Horizontal", "Vertical", "Diagonal"]);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player, paintingId);
            
            const [pattern, primaryColor, secondaryColor, direction] = response.formValues;
            
            let colorData;
            switch (pattern) {
                case 0: // Solid
                    colorData = new Array(128).fill(primaryColor.replace('#', '')).join(',');
                    break;
                case 1: // Gradient
                    colorData = generateGradientPattern(primaryColor, secondaryColor || primaryColor);
                    break;
                case 2: // Rainbow
                    colorData = TEMPLATES.patterns.rainbow;
                    break;
                case 3: // Checkerboard
                    colorData = generateCheckerboardPattern(primaryColor, secondaryColor || '#FFFFFF');
                    break;
                case 4: // Random
                    colorData = Array.from({length: 128}, () => 
                        Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
                    ).join(',');
                    break;
            }
            
            this.paintingManager.applyColors(paintingId, colorData);
            player.sendMessage(`${CONFIG.ui.colors.success}Pattern applied!`);
            
            await this.showSaveDialog(player, paintingId, 'pattern');
            
        } catch (error) {
            console.error("[CustomPaintings] Color picker error:", error);
        }
    }
    
    async showTemplates(player, paintingId) {
        const form = new ActionFormData()
            .title(`${CONFIG.ui.title} - Templates`)
            .body(`${CONFIG.ui.colors.info}Choose a template:`);
        
        // Minecraft templates
        form.button(`${CONFIG.ui.colors.primary}🎮 Minecraft`, "textures/ui/icon_recipe_nature");
        
        // Pattern templates
        form.button(`${CONFIG.ui.colors.primary}🎨 Patterns`, "textures/ui/paint_bucket");
        
        // Art templates
        form.button(`${CONFIG.ui.colors.primary}🖼️ Famous Art`, "textures/ui/icon_image");
        
        // Saved templates
        if (CONFIG.features.sharing) {
            form.button(`${CONFIG.ui.colors.primary}💾 Saved Templates`, "textures/ui/save");
        }
        
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player, paintingId);
            
            switch (response.selection) {
                case 0:
                    await this.showMinecraftTemplates(player, paintingId);
                    break;
                case 1:
                    await this.showPatternTemplates(player, paintingId);
                    break;
                case 2:
                    await this.showArtTemplates(player, paintingId);
                    break;
                case 3:
                    if (CONFIG.features.sharing) {
                        await this.showSavedTemplates(player, paintingId);
                    }
                    break;
                default:
                    await this.showMainMenu(player, paintingId);
            }
            
        } catch (error) {
            console.error("[CustomPaintings] Templates error:", error);
        }
    }
    
    async showMinecraftTemplates(player, paintingId) {
        const form = new ActionFormData()
            .title("Minecraft Templates")
            .body(`${CONFIG.ui.colors.info}Select a Minecraft-themed painting:`);
        
        Object.keys(TEMPLATES.minecraft).forEach(name => {
            form.button(`${CONFIG.ui.colors.primary}${name.charAt(0).toUpperCase() + name.slice(1)}`);
        });
        
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            const templates = Object.entries(TEMPLATES.minecraft);
            
            if (response.canceled || response.selection === templates.length) {
                return this.showTemplates(player, paintingId);
            }
            
            const [name, data] = templates[response.selection];
            this.paintingManager.applyColors(paintingId, data);
            
            player.sendMessage(`${CONFIG.ui.colors.success}Applied ${name} template!`);
            
        } catch (error) {
            console.error("[CustomPaintings] Minecraft templates error:", error);
        }
    }
    
    async showManualInput(player, paintingId) {
        const form = new ModalFormData()
            .title(`${CONFIG.ui.title} - Manual Input`);
        
        form.textField(
            "Hex Colors (comma separated)",
            "FFFFFF, 000000, FF0000...",
            ""
        );
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player, paintingId);
            
            const colorInput = response.formValues[0];
            if (!colorInput) {
                player.sendMessage(`${CONFIG.ui.colors.warning}No colors entered`);
                return this.showManualInput(player, paintingId);
            }
            
            // Process and validate colors
            const colors = colorInput.split(',').map(c => {
                const cleaned = c.trim().replace('#', '');
                return cleaned.length === 6 ? cleaned : CONFIG.painting.defaultColor;
            });
            
            // Ensure we have exactly 128 colors
            while (colors.length < 128) {
                colors.push(CONFIG.painting.defaultColor);
            }
            
            this.paintingManager.applyColors(paintingId, colors.slice(0, 128).join(','));
            player.sendMessage(`${CONFIG.ui.colors.success}Colors applied!`);
            
            await this.showSaveDialog(player, paintingId, 'manual');
            
        } catch (error) {
            console.error("[CustomPaintings] Manual input error:", error);
        }
    }
    
    async showSaveDialog(player, paintingId, type) {
        const form = new MessageFormData()
            .title("Save Painting?")
            .body(`${CONFIG.ui.colors.info}Would you like to save this painting for later use?`)
            .button1("Yes, Save")
            .button2("No, Thanks");
        
        try {
            const response = await form.show(player);
            if (response.selection === 0) {
                await this.showSaveForm(player, paintingId, type);
            }
        } catch (error) {
            console.error("[CustomPaintings] Save dialog error:", error);
        }
    }
    
    async showSaveForm(player, paintingId, type) {
        const form = new ModalFormData()
            .title("Save Painting");
        
        form.textField("Painting Name", "My Awesome Painting");
        form.toggle("Make Public (others can use as template)");
        
        try {
            const response = await form.show(player);
            if (response.canceled) return;
            
            const [name, isPublic] = response.formValues;
            
            if (!name) {
                player.sendMessage(`${CONFIG.ui.colors.warning}Please enter a name`);
                return this.showSaveForm(player, paintingId, type);
            }
            
            const saved = await this.paintingManager.savePainting(
                paintingId,
                player.id,
                name,
                type
            );
            
            if (saved) {
                player.sendMessage(`${CONFIG.ui.colors.success}Painting saved as "${name}"!`);
            } else {
                player.sendMessage(`${CONFIG.ui.colors.error}Failed to save painting`);
            }
            
        } catch (error) {
            console.error("[CustomPaintings] Save form error:", error);
        }
    }
}

// ===== PLUGIN MANAGER =====
class CustomPaintingsPlugin {
    constructor() {
        this.paintingManager = new PaintingManager();
        this.uiManager = new UIManager(this.paintingManager);
        this.init();
    }
    
    init() {
        console.info("[CustomPaintings] Initializing plugin...");
        
        // Register event handlers
        this.registerEventHandlers();
        
        // Register commands if BedrockBridge available
        if (bridgeAvailable && bridge?.bedrockCommands) {
            this.registerCommands();
        }
        
        console.info("[CustomPaintings] Plugin initialized!");
    }
    
    registerEventHandlers() {
        // Handle painting block placement
        world.afterEvents.playerPlaceBlock.subscribe(event => {
            const { player, block, dimension } = event;
            
            if (block.typeId === CONFIG.painting.blockId) {
                const facingDirection = block.permutation.getState("minecraft:cardinal_direction");
                const rotation = this.getRotationFromDirection(facingDirection);
                
                // Remove block
                block.setType("minecraft:air");
                
                // Create painting
                const paintingId = generateRandomID();
                const location = {
                    x: block.location.x + 0.5,
                    y: block.location.y,
                    z: block.location.z + 0.5
                };
                
                this.paintingManager.createPainting(location, dimension, rotation, paintingId);
                
                // Show UI
                system.run(() => {
                    this.uiManager.showMainMenu(player, paintingId);
                });
            }
        });
        
        // Handle painting interaction
        world.afterEvents.dataDrivenEntityTrigger.subscribe(event => {
            const { entity, eventId } = event;
            if (!entity || !entity.typeId) return; // guard undefined entity
            if (entity.typeId === CONFIG.painting.entity && eventId === "custom:interact") {
                const players = entity.getEntitiesFromViewDirection({
                    maxDistance: 4,
                    type: "minecraft:player"
                });
                
                if (players.length > 0) {
                    const player = players[0].entity;
                    const paintingId = entity.getTags().find(tag => tag.length === 12);
                    
                    if (paintingId) {
                        system.run(() => {
                            this.uiManager.showMainMenu(player, paintingId);
                        });
                    }
                }
            }
            
            // Handle despawn
            if (entity.typeId === CONFIG.painting.entity && eventId === "custom:despawn") {
                const paintingId = entity.getTags().find(tag => tag.length === 12);
                if (paintingId) {
                    this.paintingManager.removePainting(paintingId);
                }
            }
        });
        
        // Handle painting break
        world.afterEvents.playerBreakBlock.subscribe(event => {
            const { block, dimension } = event;
            const location = block.location;
            
            // Check for nearby painting entities
            const nearbyEntities = dimension.getEntitiesAtBlockLocation(location);
            
            nearbyEntities.forEach(entity => {
                if (entity.typeId === CONFIG.painting.entity) {
                    const paintingId = entity.getTags().find(tag => tag.length === 12);
                    if (paintingId) {
                        this.paintingManager.removePainting(paintingId);
                        
                        // Drop painting item
                        dimension.runCommand(
                            `loot spawn ${location.x} ${location.y} ${location.z} loot custom_painting`
                        );
                    }
                }
            });
        });
    }
    
    registerCommands() {
        bridge.bedrockCommands.registerCommand(
            "painting",
            this.handleCommand.bind(this),
            "Custom painting commands"
        );
        
        bridge.bedrockCommands.registerAdminCommand(
            "paintingadmin",
            this.handleAdminCommand.bind(this),
            "Custom painting admin commands"
        );
    }
    
    async handleCommand(player, subcommand, ...args) {
        switch (subcommand?.toLowerCase()) {
            case 'list':
                await this.showPlayerPaintings(player);
                break;
                
            case 'share':
                if (args.length > 0) {
                    await this.sharePainting(player, args.join(' '));
                } else {
                    player.sendMessage(`${CONFIG.ui.colors.warning}Usage: /painting share <name>`);
                }
                break;
                
            case 'delete':
                if (args.length > 0) {
                    await this.deletePainting(player, args.join(' '));
                } else {
                    player.sendMessage(`${CONFIG.ui.colors.warning}Usage: /painting delete <name>`);
                }
                break;
                
            case 'help':
                this.showHelp(player);
                break;
                
            default:
                this.showHelp(player);
        }
    }
    
    async handleAdminCommand(player, subcommand, ...args) {
        switch (subcommand?.toLowerCase()) {
            case 'clear':
                await this.clearAllPaintings(player);
                break;
                
            case 'stats':
                await this.showStats(player);
                break;
                
            case 'reload':
                await this.reloadTemplates(player);
                break;
                
            default:
                player.sendMessage(`${CONFIG.ui.colors.primary}Admin Commands:`);
                player.sendMessage(`${CONFIG.ui.colors.info}• /paintingadmin clear - Remove all paintings`);
                player.sendMessage(`${CONFIG.ui.colors.info}• /paintingadmin stats - Show statistics`);
                player.sendMessage(`${CONFIG.ui.colors.info}• /paintingadmin reload - Reload templates`);
        }
    }
    
    async showPlayerPaintings(player) {
        if (!bridgeAvailable || !database) {
            player.sendMessage(`${CONFIG.ui.colors.error}This feature requires BedrockBridge`);
            return;
        }
        
        try {
            const paintings = await database.query(
                'SELECT * FROM custom_paintings WHERE owner = ? ORDER BY created DESC',
                [player.id]
            );
            
            if (paintings.length === 0) {
                player.sendMessage(`${CONFIG.ui.colors.warning}You don't have any saved paintings`);
                return;
            }
            
            player.sendMessage(`${CONFIG.ui.colors.primary}=== Your Paintings ===`);
            paintings.forEach(painting => {
                const date = new Date(painting.created).toLocaleDateString();
                player.sendMessage(`${CONFIG.ui.colors.info}• ${painting.name} (${painting.type}) - ${date}`);
            });
            
        } catch (error) {
            console.error("[CustomPaintings] List error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Failed to load paintings`);
        }
    }
    
    async sharePainting(player, name) {
        if (!bridgeAvailable || !database) {
            player.sendMessage(`${CONFIG.ui.colors.error}This feature requires BedrockBridge`);
            return;
        }
        
        try {
            const paintings = await database.query(
                'SELECT * FROM custom_paintings WHERE owner = ? AND name = ?',
                [player.id, name]
            );
            
            if (paintings.length === 0) {
                player.sendMessage(`${CONFIG.ui.colors.error}Painting "${name}" not found`);
                return;
            }
            
            const painting = paintings[0];
            const shareCode = generateRandomID(8);
            
            // Save as template
            await database.query(
                'INSERT INTO painting_templates (id, name, data, creator, public) VALUES (?, ?, ?, ?, ?)',
                [shareCode, painting.name, painting.data, player.name, 1]
            );
            
            player.sendMessage(`${CONFIG.ui.colors.success}Painting shared!`);
            player.sendMessage(`${CONFIG.ui.colors.info}Share code: ${CONFIG.ui.colors.secondary}${shareCode}`);
            player.sendMessage(`${CONFIG.ui.colors.info}Others can use: /painting load ${shareCode}`);
            
        } catch (error) {
            console.error("[CustomPaintings] Share error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Failed to share painting`);
        }
    }
    
    showHelp(player) {
        player.sendMessage(`${CONFIG.ui.colors.primary}=== Custom Paintings Help ===`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Place a painting block to create`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Right-click painting to edit`);
        player.sendMessage(`${CONFIG.ui.colors.info}• /painting list - View saved paintings`);
        player.sendMessage(`${CONFIG.ui.colors.info}• /painting share <name> - Share a painting`);
        player.sendMessage(`${CONFIG.ui.colors.info}• /painting delete <name> - Delete a painting`);
    }
    
    getRotationFromDirection(direction) {
        const rotations = {
            'north': { x: 0, y: 0 },
            'east': { x: 0, y: 90 },
            'south': { x: 0, y: 180 },
            'west': { x: 0, y: 270 }
        };
        return rotations[direction] || { x: 0, y: 0 };
    }
    
    async showStats(player) {
        const stats = {
            active: this.paintingManager.paintings.size,
            cached: this.paintingManager.imageProcessor.cache.size
        };
        
        if (bridgeAvailable && database) {
            try {
                const totalPaintings = await database.query('SELECT COUNT(*) as count FROM custom_paintings');
                const totalTemplates = await database.query('SELECT COUNT(*) as count FROM painting_templates');
                
                stats.saved = totalPaintings[0]?.count || 0;
                stats.templates = totalTemplates[0]?.count || 0;
            } catch (error) {
                console.error("[CustomPaintings] Stats error:", error);
            }
        }
        
        player.sendMessage(`${CONFIG.ui.colors.primary}=== Painting Statistics ===`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Active paintings: ${stats.active}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Cached images: ${stats.cached}`);
        if (stats.saved !== undefined) {
            player.sendMessage(`${CONFIG.ui.colors.info}• Saved paintings: ${stats.saved}`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Shared templates: ${stats.templates}`);
        }
    }
}

// ===== ANIMATION SYSTEM =====
class AnimationSystem {
    constructor(paintingManager) {
        this.paintingManager = paintingManager;
        this.animations = new Map();
        this.running = false;
    }
    
    addAnimation(paintingId, frames, fps = 10) {
        this.animations.set(paintingId, {
            frames: frames,
            currentFrame: 0,
            fps: fps,
            lastUpdate: Date.now()
        });
        
        if (!this.running) {
            this.startAnimationLoop();
        }
    }
    
    removeAnimation(paintingId) {
        this.animations.delete(paintingId);
        
        if (this.animations.size === 0) {
            this.running = false;
        }
    }
    
    startAnimationLoop() {
        this.running = true;
        
        system.runInterval(() => {
            if (!this.running) return;
            
            const now = Date.now();
            
            for (const [paintingId, animation] of this.animations) {
                const frameTime = 1000 / animation.fps;
                
                if (now - animation.lastUpdate >= frameTime) {
                    animation.currentFrame = (animation.currentFrame + 1) % animation.frames.length;
                    animation.lastUpdate = now;
                    
                    // Apply frame
                    this.paintingManager.applyColors(paintingId, animation.frames[animation.currentFrame]);
                }
            }
        }, 1); // Run every tick
    }
}

// ===== SPECIAL EFFECTS =====
class EffectsManager {
    static createGlowEffect(paintingId, color = "#FFFFFF") {
        // Apply glow effect to painting entities
        world.getDimensions().forEach(dimension => {
            dimension.getEntities({
                type: CONFIG.painting.entity,
                tags: [paintingId]
            }).forEach(entity => {
                entity.triggerEvent("custom:glow_on");
                // Set glow color if supported
                const rgb = hexToRGB(color);
                entity.setProperty("custom:glow_r", rgb.r / 255);
                entity.setProperty("custom:glow_g", rgb.g / 255);
                entity.setProperty("custom:glow_b", rgb.b / 255);
            });
        });
    }
    
    static createParticleEffect(paintingId, particleType = "minecraft:villager_happy") {
        const painting = this.paintingManager.paintings.get(paintingId);
        if (!painting) return;
        
        const dimension = world.getDimension(painting.dimension);
        
        // Create particles around painting
        for (let i = 0; i < 10; i++) {
            const offset = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: (Math.random() - 0.5) * 0.5
            };
            
            dimension.spawnParticle(particleType, {
                x: painting.location.x + offset.x,
                y: painting.location.y + offset.y,
                z: painting.location.z + offset.z
            });
        }
    }
}

// ===== WEB API INTEGRATION =====
class WebAPIIntegration {
    constructor() {
        this.apiEndpoints = {
            processImage: CONFIG.api.imageProcessing,
            searchImages: "https://api.example.com/search",
            trending: "https://api.example.com/trending"
        };
    }
    
    async searchImages(query) {
        const request = new HttpRequest(this.apiEndpoints.searchImages)
            .setMethod(HttpRequestMethod.Get)
            .setHeaders([
                new HttpHeader('Accept', 'application/json')
            ])
            .setQuery({ q: query, limit: 10 })
            .setTimeout(CONFIG.api.timeout);
        
        try {
            const response = await http.request(request);
            if (response.status === 200) {
                return JSON.parse(response.body);
            }
        } catch (error) {
            console.error("[CustomPaintings] Search error:", error);
        }
        
        return [];
    }
    
    async getTrendingImages() {
        const request = new HttpRequest(this.apiEndpoints.trending)
            .setMethod(HttpRequestMethod.Get)
            .setHeaders([
                new HttpHeader('Accept', 'application/json')
            ])
            .setTimeout(CONFIG.api.timeout);
        
        try {
            const response = await http.request(request);
            if (response.status === 200) {
                return JSON.parse(response.body);
            }
        } catch (error) {
            console.error("[CustomPaintings] Trending error:", error);
        }
        
        return [];
    }
}

// ===== INITIALIZATION =====
const plugin = new CustomPaintingsPlugin();

// Export for debugging
globalThis.CustomPaintings = {
    plugin,
    version: "1.0.0",
    
    // Debug utilities
    debug: {
        listPaintings: () => {
            const paintings = [];
            plugin.paintingManager.paintings.forEach((painting, id) => {
                paintings.push({
                    id: id,
                    location: painting.location,
                    dimension: painting.dimension,
                    created: new Date(painting.created)
                });
            });
            return paintings;
        },
        
        clearCache: () => {
            plugin.paintingManager.imageProcessor.cache.clear();
            return "Image cache cleared";
        },
        
        testPattern: (paintingId, pattern) => {
            if (!plugin.paintingManager.paintings.has(paintingId)) {
                return "Painting not found";
            }
            
            plugin.paintingManager.applyColors(paintingId, TEMPLATES.patterns[pattern] || TEMPLATES.patterns.rainbow);
            return `Applied ${pattern} pattern`;
        }
    }
};

console.info("[CustomPaintings] Plugin loaded successfully!");
console.info("[CustomPaintings] Place a custom painting block to get started");
// --- Hub-Eintrag ---
import { hub as _cpHub } from "./hubAPI.js";
try {
  _cpHub.register({ id: "cpaintings", title: "\u{1F5BC} Bilder", icon: "textures/ui/icon_panorama", category: "Werkzeuge", order: 70, permission: null, handler: (p) => plugin.showPlayerPaintings(p) });
  console.warn("[cpaintings] im Hub registriert");
} catch (e) { console.warn("[cpaintings] hub-reg: " + e); }
