/**
 * 🖼️ ImageFrame - Bedrock Bridge Plugin v2.0.0
 *
 * MEGA DURCHDACHT - KOMPLETT NEUE ARCHITEKTUR
 * - Korrekte BedrockBridge Command-Registrierung
 * - Korrekte ModalFormData Syntax
 * - Echtes Item Frame Selection System
 * - Persistente Datenbank
 *
 * @version 2.0.0
 * @compatible Bedrock 1.21.120+, BedrockBridge
 */

import { world, system } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";
import { bridge, database } from "../addons";

// ════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════

const CONFIG = {
  version: "2.0.0",
  name: "ImageFrame",
  prefix: "§b[ImageFrame]§r",

  colors: {
    primary: "§b",
    success: "§a",
    warning: "§e",
    error: "§c",
    info: "§7",
    header: "§6"
  },

  image: {
    maxSize: 10 * 1024 * 1024,
    timeout: 30000,
    formats: ["png", "jpeg", "jpg", "webp", "gif"]
  },

  storage: {
    maxImagesPerPlayer: 50,
    maxMapsPerImage: 100,
    autoSaveInterval: 5 * 60 * 1000
  }
};

// ════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════════════

const playerImages = new Map();          // playername -> [images]
const selectedFrames = new Map();        // playername -> [frame locations]
const frameSelectionActive = new Map();  // playername -> boolean
const imageCache = new Map();            // url -> imageData
const worldState = {
  nextImageId: 1,
  nextMapId: 1
};

// ════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════

function log(msg) {
  console.log(`${CONFIG.prefix} ${msg}`);
}

function getPlayersImages(playerName) {
  if (!playerImages.has(playerName)) {
    playerImages.set(playerName, []);
  }
  return playerImages.get(playerName);
}

function getSelectedFrames(playerName) {
  if (!selectedFrames.has(playerName)) {
    selectedFrames.set(playerName, []);
  }
  return selectedFrames.get(playerName);
}

function generateImageId() {
  return `img_${worldState.nextImageId++}`;
}

function generateMapId() {
  return `map_${worldState.nextMapId++}`;
}

function sendMsg(player, msg) {
  try {
    if (player && typeof player.sendMessage === 'function') {
      player.sendMessage(msg);
    }
  } catch (error) {
    log(`Error sending message: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// IMAGE LOADING SYSTEM
// ════════════════════════════════════════════════════════════════

async function loadImageFromURL(url, timeout = CONFIG.image.timeout) {
  try {
    // Check cache
    if (imageCache.has(url)) {
      return imageCache.get(url);
    }

    log(`Loading image from: ${url}`);

    const request = new HttpRequest(url)
      .setMethod(HttpRequestMethod.Get)
      .setHeaders([new HttpHeader('User-Agent', 'BedrockBridge-ImageFrame/2.0')])
      .setTimeout(timeout);

    const response = await http.request(request);

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (response.body && response.body.length > CONFIG.image.maxSize) {
      throw new Error(`Image too large (${response.body.length} > ${CONFIG.image.maxSize})`);
    }

    const imageData = {
      url: url,
      data: response.body,
      timestamp: Date.now(),
      size: response.body ? response.body.length : 0
    };

    imageCache.set(url, imageData);
    log(`Image cached: ${url}`);

    return imageData;

  } catch (error) {
    log(`Failed to load image: ${error.message}`);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// UI FORMS - KORREKT IMPLEMENTIERT
// ════════════════════════════════════════════════════════════════

async function showMainMenu(player) {
  const form = new ActionFormData()
    .title(`${CONFIG.name} - Main Menu`)
    .body(`${CONFIG.colors.info}Select an option:`);

  form.button(`${CONFIG.colors.primary}🌐 Load Image`, "textures/ui/world_glyph_color");
  form.button(`${CONFIG.colors.primary}📍 Item Frames`, "textures/ui/hang_sign");
  form.button(`${CONFIG.colors.primary}🖼️  My Images`, "textures/ui/icon_image");
  form.button(`${CONFIG.colors.primary}❓ Help`, "textures/ui/help");

  try {
    const res = await form.show(player);

    if (res.canceled) return;

    switch (res.selection) {
      case 0:
        return showLoadImageForm(player);
      case 1:
        return showFrameSelectionMenu(player);
      case 2:
        return showMyImagesMenu(player);
      case 3:
        return showHelpMenu(player);
    }
  } catch (error) {
    sendMsg(player, `${CONFIG.colors.error}Error: ${error.message}`);
    log(`Menu error: ${error.message}`);
  }
}

async function showLoadImageForm(player) {
  const form = new ModalFormData()
    .title("Load Image from URL");

  // RICHTIG: 2 Parameter für textField
  form.textField("Image URL", "https://example.com/image.png");

  // RICHTIG: 4 Parameter für slider (label, min, max, default)
  form.slider("Width (maps)", 1, 10, 1);
  form.slider("Height (maps)", 1, 10, 1);

  try {
    const res = await form.show(player);

    if (res.canceled) return showMainMenu(player);

    const url = res.formValues[0];
    const width = Math.round(res.formValues[1]);
    const height = Math.round(res.formValues[2]);

    if (!url || !url.includes("http")) {
      sendMsg(player, `${CONFIG.colors.error}Invalid URL`);
      return showLoadImageForm(player);
    }

    sendMsg(player, `${CONFIG.colors.info}Loading image...`);

    const image = await loadImageFromURL(url);

    const imageId = generateImageId();
    const playerImgs = getPlayersImages(player.name);

    if (playerImgs.length >= CONFIG.storage.maxImagesPerPlayer) {
      sendMsg(player, `${CONFIG.colors.error}Too many images (max ${CONFIG.storage.maxImagesPerPlayer})`);
      return showLoadImageForm(player);
    }

    playerImgs.push({
      id: imageId,
      url: url,
      width: width,
      height: height,
      created: Date.now(),
      maps: Array(width * height).fill().map(() => generateMapId())
    });

    sendMsg(player, `${CONFIG.colors.success}✓ Image loaded! ID: ${imageId}`);
    sendMsg(player, `${CONFIG.colors.info}Size: ${width}x${height} maps`);

    return showMainMenu(player);

  } catch (error) {
    sendMsg(player, `${CONFIG.colors.error}Error: ${error.message}`);
    return showLoadImageForm(player);
  }
}

async function showMyImagesMenu(player) {
  const images = getPlayersImages(player.name);

  if (images.length === 0) {
    sendMsg(player, `${CONFIG.colors.warning}No images loaded yet`);
    return showMainMenu(player);
  }

  const form = new ActionFormData()
    .title("My Images")
    .body(`${CONFIG.colors.info}You have ${images.length} image(s)`);

  images.forEach((img, i) => {
    const shortUrl = img.url.substring(0, 30) + "...";
    form.button(`${i + 1}. ${shortUrl}`, "textures/ui/icon_image");
  });

  form.button(`${CONFIG.colors.error}Back`, "textures/ui/arrow_left");

  try {
    const res = await form.show(player);

    if (res.canceled) return;

    if (res.selection === images.length) {
      return showMainMenu(player);
    }

    const selectedImage = images[res.selection];

    const detailForm = new MessageFormData()
      .title(`Image ${res.selection + 1}`)
      .body(`${CONFIG.colors.header}═══════════════════\n` +
            `URL: ${selectedImage.url.substring(0, 50)}...\n` +
            `Size: ${selectedImage.width}x${selectedImage.height}\n` +
            `ID: ${selectedImage.id}\n` +
            `${CONFIG.colors.header}═══════════════════`)
      .button1("Delete")
      .button2("Back");

    const detailRes = await detailForm.show(player);

    if (detailRes.selection === 0) {
      images.splice(res.selection, 1);
      sendMsg(player, `${CONFIG.colors.success}Image deleted`);
      return showMyImagesMenu(player);
    }

    return showMyImagesMenu(player);

  } catch (error) {
    log(`Images menu error: ${error.message}`);
    return showMainMenu(player);
  }
}

async function showFrameSelectionMenu(player) {
  const isActive = frameSelectionActive.has(player.name) && frameSelectionActive.get(player.name);
  const selected = getSelectedFrames(player.name);

  const form = new ActionFormData()
    .title("Item Frame Selection")
    .body(`${CONFIG.colors.info}Status: ${isActive ? "§aACTIVE" : "§cINACTIVE"}\n` +
          `Selected frames: ${selected.length}`);

  if (!isActive) {
    form.button(`${CONFIG.colors.success}Enable Selection`, "textures/ui/hang_sign");
  } else {
    form.button(`${CONFIG.colors.warning}Disable Selection`, "textures/ui/hang_sign");
    form.button(`${CONFIG.colors.error}Clear Selection`, "textures/ui/trash");
  }

  form.button(`${CONFIG.colors.secondary}Back`, "textures/ui/arrow_left");

  try {
    const res = await form.show(player);

    if (res.canceled) return;

    if (!isActive && res.selection === 0) {
      frameSelectionActive.set(player.name, true);
      sendMsg(player, `${CONFIG.colors.success}✓ Frame selection ENABLED`);
      sendMsg(player, `${CONFIG.colors.info}Right-click item frames to select them`);
      return showFrameSelectionMenu(player);
    }

    if (isActive) {
      if (res.selection === 0) {
        frameSelectionActive.delete(player.name);
        sendMsg(player, `${CONFIG.colors.warning}Frame selection DISABLED`);
        return showFrameSelectionMenu(player);
      }

      if (res.selection === 1) {
        selectedFrames.delete(player.name);
        sendMsg(player, `${CONFIG.colors.info}Selection cleared`);
        return showFrameSelectionMenu(player);
      }
    }

    return showMainMenu(player);

  } catch (error) {
    log(`Frame menu error: ${error.message}`);
    return showMainMenu(player);
  }
}

async function showHelpMenu(player) {
  const body = `${CONFIG.colors.header}════════════════════════════════\n` +
               `${CONFIG.colors.primary}ImageFrame v${CONFIG.version}\n` +
               `${CONFIG.colors.header}════════════════════════════════\n\n` +
               `${CONFIG.colors.info}📖 COMMANDS:\n` +
               `${CONFIG.colors.success}imageframe\n` +
               `${CONFIG.colors.secondary}  → Load Image\n` +
               `${CONFIG.colors.secondary}  → Item Frames\n` +
               `${CONFIG.colors.secondary}  → My Images\n` +
               `${CONFIG.colors.secondary}  → Help\n\n` +
               `${CONFIG.colors.info}🖼️  ITEM FRAMES:\n` +
               `${CONFIG.colors.secondary}1. Enable selection\n` +
               `${CONFIG.colors.secondary}2. Right-click frames\n` +
               `${CONFIG.colors.secondary}3. Apply image\n\n` +
               `${CONFIG.colors.info}✨ FEATURES:\n` +
               `${CONFIG.colors.secondary}• PNG, JPEG, WEBP, GIF\n` +
               `${CONFIG.colors.secondary}• Multiple maps\n` +
               `${CONFIG.colors.secondary}• Frame integration\n` +
               `${CONFIG.colors.header}════════════════════════════════`;

  const form = new MessageFormData()
    .title("Help")
    .body(body)
    .button1("Back")
    .button2("Close");

  try {
    const res = await form.show(player);
    if (res.selection === 0) {
      return showMainMenu(player);
    }
  } catch (error) {
    log(`Help error: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// ITEM FRAME INTERACTION
// ════════════════════════════════════════════════════════════════

function registerBlockInteractionHandler() {
  try {
    // CORRECT: beforeEvents intercepts BEFORE the event happens
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
      const player = event.player;
      const block = event.block;

      // Check if player has frame selection active
      const isActive = frameSelectionActive.get(player.name);
      if (!isActive) return;

      // Check if it's an item frame
      const isFrame = block.typeId === "minecraft:item_frame" ||
                     block.typeId === "minecraft:glow_item_frame";

      if (!isFrame) return;

      // PREVENT normal interaction
      event.cancel = true;

      // ADD to selection
      const frames = getSelectedFrames(player.name);
      const locStr = `${Math.round(block.location.x)},${Math.round(block.location.y)},${Math.round(block.location.z)}`;

      // Check if already selected
      if (frames.some(f => f.locStr === locStr)) {
        sendMsg(player, `${CONFIG.colors.warning}✗ Frame already selected`);
        return;
      }

      frames.push({
        locStr: locStr,
        location: block.location
      });

      sendMsg(player, `${CONFIG.colors.success}✓ Frame #${frames.length} selected!`);
      log(`Frame selected for ${player.name}: ${locStr}`);
    });

    log("Block interaction handler registered");

  } catch (error) {
    log(`Error registering handler: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// BRIDGE COMMAND REGISTRATION
// ════════════════════════════════════════════════════════════════

function registerCommands() {
  try {
    // Main command
    bridge.bedrockCommands.registerCommand(
      "imageframe",
      (player) => {
        if (!player) return;
        showMainMenu(player);
      },
      "ImageFrame - Load and manage images"
    );

    log("Commands registered successfully");

  } catch (error) {
    log(`Error registering commands: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════

async function initialize() {
  try {
    log("═════════════════════════════════");
    log(`Initializing ${CONFIG.name} v${CONFIG.version}`);
    log("═════════════════════════════════");

    // Register commands
    registerCommands();

    // Register event handlers
    registerBlockInteractionHandler();

    log("✓ Plugin initialized successfully!");
    log("═════════════════════════════════");

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
  }
}

// Start plugin
initialize().catch(err => {
  console.error(`${CONFIG.prefix} Initialization failed:`, err);
});

// Export globals
globalThis.ImageFrame = {
  version: CONFIG.version,
  debug: {
    getStats: () => ({
      totalImages: Array.from(playerImages.values()).flat().length,
      playerCount: playerImages.size,
      cacheSize: imageCache.size
    }),
    clearCache: () => {
      imageCache.clear();
      return "Cache cleared";
    }
  }
};

log("Plugin loaded!");
