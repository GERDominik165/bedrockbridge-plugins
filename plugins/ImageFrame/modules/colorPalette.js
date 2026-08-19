/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                  ImageFrame - COLOR PALETTE SYSTEM                             ║
 * ║            Minecraft Material Colors for Pixelart Conversion                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Alle 60+ Minecraft-Materialien mit RGB-Werten, Dark/Light-Varianten für 3D
 * Basierend auf mc-pixelart-maker Farb-Datenbank
 *
 * @module colorPalette
 * @version 1.0.0
 */

/**
 * Minecraft Material Color Database
 * Format: {
 *   name: String - User-visible name
 *   description: String - HTML description of blocks
 *   id: String - Minecraft command identifier
 *   is_dye: Boolean - Is this a dye color?
 *   is_terc: Boolean - Is this terracotta?
 *   is_biomevar: Boolean - Does appearance vary by biome?
 *   is_greyscale: Boolean - Is this a grayscale color?
 *   rgb: [R,G,B,255] - Normal color (all <= 220 to avoid overflow)
 * }
 */
const MinecraftColors = new Map([
  // DYES - Primary Colors
  ["white", {
    name: "White Dye",
    description: "White Concrete, Wool, Carpets, Stained Glass, Shulker boxes",
    id: "white_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [220, 220, 220, 255]
  }],
  ["lightgray", {
    name: "Light Gray Dye",
    description: "Light Gray Concrete, Wool, Carpets, Pale Oak Items",
    id: "light_gray_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [132, 132, 132, 255]
  }],
  ["gray", {
    name: "Gray Dye",
    description: "Gray Concrete, Wool, Acacia Wood, Tinted Glass",
    id: "gray_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [65, 65, 65, 255]
  }],
  ["black", {
    name: "Black Dye",
    description: "Black Concrete, Wool, Coal Block, Obsidian, Netherite",
    id: "black_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [21, 21, 21, 255]
  }],
  ["brown", {
    name: "Brown Dye",
    description: "Brown Concrete, Dark Oak Wood, Soul Sand, Fences",
    id: "brown_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [88, 65, 44, 255]
  }],
  ["red", {
    name: "Red Dye",
    description: "Red Concrete, Wool, Red Mushroom, Brick, Mangrove Wood",
    id: "red_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [132, 44, 44, 255]
  }],
  ["orange", {
    name: "Orange Dye",
    description: "Orange Concrete, Acacia Wood, Copper, Pumpkins",
    id: "orange_concrete []",
    is_dye: true, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [186, 109, 44, 255]
  }],
  ["yellow", {
    name: "Yellow Dye",
    description: "Yellow Concrete, Bamboo Wood, Hay Bales, Sponge",
    id: "yellow_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [197, 197, 44, 255]
  }],
  ["lime", {
    name: "Lime Dye",
    description: "Lime Concrete, Wool, Melons",
    id: "lime_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [109, 176, 21, 255]
  }],
  ["green", {
    name: "Green Dye",
    description: "Green Concrete, Moss Block, End Portal Frame, Pickles",
    id: "green_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [88, 109, 44, 255]
  }],
  ["cyan", {
    name: "Cyan Dye",
    description: "Cyan Concrete, Warped Wood, Prismarine",
    id: "cyan_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [65, 109, 132, 255]
  }],
  ["lightblue", {
    name: "Light Blue Dye",
    description: "Light Blue Concrete, Soul Fire",
    id: "light_blue_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [88, 132, 186, 255]
  }],
  ["blue", {
    name: "Blue Dye",
    description: "Blue Concrete, Tube Coral",
    id: "blue_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [44, 65, 153, 255]
  }],
  ["purple", {
    name: "Purple Dye",
    description: "Purple Concrete, Amethyst, Chorus Flower, Mycelium",
    id: "purple_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [132, 77, 176, 255]
  }],
  ["magenta", {
    name: "Magenta Dye",
    description: "Magenta Concrete, Purpur Blocks",
    id: "magenta_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [153, 65, 186, 255]
  }],
  ["pink", {
    name: "Pink Dye",
    description: "Pink Concrete, Cherry Leaves, Brain Coral",
    id: "pink_concrete []",
    is_dye: true, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [208, 109, 142, 255]
  }],

  // TERRACOTTA - Secondary Colors
  ["whiteterc", {
    name: "White Terracotta",
    description: "White Terracotta, Calcite, Cherry Wood",
    id: "white_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [180, 152, 138, 255]
  }],
  ["lightgrayterc", {
    name: "Light Gray Terracotta",
    description: "Light Gray Terracotta, Exposed Copper, Mud Bricks",
    id: "light_gray_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [116, 92, 84, 255]
  }],
  ["grayterc", {
    name: "Gray Terracotta",
    description: "Gray Terracotta, Tuff, Cherry Wood",
    id: "gray_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [49, 35, 30, 255]
  }],
  ["blackterc", {
    name: "Black Terracotta",
    description: "Black Terracotta",
    id: "black_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: true,
    rgb: [31, 18, 13, 255]
  }],
  ["brownterc", {
    name: "Brown Terracotta",
    description: "Brown Terracotta, Dripstone",
    id: "brown_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [65, 43, 30, 255]
  }],
  ["redterc", {
    name: "Red Terracotta",
    description: "Red Terracotta, Decorated Pots",
    id: "red_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [122, 51, 39, 255]
  }],
  ["orangeterc", {
    name: "Orange Terracotta",
    description: "Orange Terracotta, Resin, Chiseled Resin",
    id: "orange_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [137, 70, 31, 255]
  }],
  ["yellowterc", {
    name: "Yellow Terracotta",
    description: "Yellow Terracotta",
    id: "yellow_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [160, 114, 31, 255]
  }],
  ["limeterc", {
    name: "Lime Terracotta",
    description: "Lime Terracotta",
    id: "lime_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [88, 100, 45, 255]
  }],
  ["greenterc", {
    name: "Green Terracotta",
    description: "Green Terracotta, Pale Oak Leaves",
    id: "green_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [65, 70, 36, 255]
  }],
  ["cyanterc", {
    name: "Cyan Terracotta",
    description: "Cyan Terracotta",
    id: "cyan_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: true,
    rgb: [75, 79, 79, 255]
  }],
  ["lightblueterc", {
    name: "Light Blue Terracotta",
    description: "Light Blue Terracotta",
    id: "light_blue_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [96, 93, 119, 255]
  }],
  ["blueterc", {
    name: "Blue Terracotta",
    description: "Blue Terracotta",
    id: "blue_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [65, 53, 79, 255]
  }],
  ["purpleterc", {
    name: "Purple Terracotta",
    description: "Purple Terracotta",
    id: "purple_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [105, 62, 75, 255]
  }],
  ["magentaterc", {
    name: "Magenta Terracotta",
    description: "Magenta Terracotta",
    id: "magenta_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [128, 75, 93, 255]
  }],
  ["pinkterc", {
    name: "Pink Terracotta",
    description: "Pink Terracotta, Stripped Cherry Wood",
    id: "pink_terracotta []",
    is_dye: false, is_terc: true, is_biomevar: false, is_greyscale: false,
    rgb: [138, 66, 67, 255]
  }],

  // WOOD MATERIALS
  ["oak", {
    name: "Oak",
    description: "Oak Planks, Logs, Wood, Fences, Doors, Signs",
    id: "oak_planks []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [123, 102, 62, 255]
  }],
  ["spruce", {
    name: "Spruce",
    description: "Spruce Planks, Logs, Wood, Fences, Doors",
    id: "spruce_planks []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [111, 74, 42, 255]
  }],
  ["crimson", {
    name: "Crimson",
    description: "Crimson Planks, Logs, Wood, Nether Materials",
    id: "crimson_planks []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [127, 54, 83, 255]
  }],
  ["warped", {
    name: "Warped",
    description: "Warped Planks, Logs, Nether Materials, Copper",
    id: "warped_planks []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [50, 122, 120, 255]
  }],

  // STONE MATERIALS
  ["dirt", {
    name: "Dirt",
    description: "Coarse Dirt, Farmland, Packed Mud, Jungle Planks, Granite",
    id: "dirt [\"dirt_type\"=\"coarse\"]",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [130, 94, 66, 255]
  }],
  ["sand", {
    name: "Sand",
    description: "Sandstone, Sand, Birch Planks, End Stone, Glowstone",
    id: "sandstone []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [213, 201, 140, 255]
  }],
  ["clay", {
    name: "Clay",
    description: "Clay Blocks",
    id: "clay []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [141, 144, 158, 255]
  }],
  ["stone", {
    name: "Stone",
    description: "Stone, Cobblestone, Andesite, Stone Bricks, Furnaces",
    id: "stone []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [96, 96, 96, 255]
  }],
  ["deepslate", {
    name: "Deepslate",
    description: "Deepslate, Cobbled/Tiled Deepslate, Bricks",
    id: "deepslate []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [86, 86, 86, 255]
  }],
  ["nether", {
    name: "Netherrack",
    description: "Netherrack, Magma, Nether Bricks, Crimson Items",
    id: "netherrack []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [96, 0, 0, 255]
  }],
  ["quartz", {
    name: "Quartz",
    description: "Quartz Block, Smooth Quartz, Diorite",
    id: "quartz_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [220, 217, 211, 255]
  }],
  ["oxicopper", {
    name: "Oxidised Copper",
    description: "Oxidised Copper, Warped Nylium",
    id: "waxed_oxidized_copper []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [18, 108, 115, 255]
  }],

  // PLANTS
  ["foliage", {
    name: "Foliage",
    description: "Azalea, Flowers, Saplings, Cactus, Bamboo",
    id: "azalea_leaves [\"persistent_bit\"=true]",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [0, 106, 0, 255]
  }],
  ["grass", {
    name: "Grass",
    description: "Grass Block (Plains/Forests/Rivers/Ocean/End)",
    id: "grass []",
    is_dye: false, is_terc: false, is_biomevar: true, is_greyscale: false,
    rgb: [125, 162, 75, 255]
  }],
  ["oakleaves", {
    name: "Tree Leaves",
    description: "Oak/Jungle/Dark Oak/Acacia/Mangrove Leaves",
    id: "oak_leaves [\"persistent_bit\"=true]",
    is_dye: false, is_terc: false, is_biomevar: true, is_greyscale: false,
    rgb: [55, 79, 21, 255]
  }],
  ["birchleaves", {
    name: "Birch Leaves",
    description: "Birch Leaves",
    id: "birch_leaves [\"persistent_bit\"=true]",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [59, 77, 39, 255]
  }],
  ["conifers", {
    name: "Spruce Leaves",
    description: "Spruce Leaves",
    id: "spruce_leaves [\"persistent_bit\"=true]",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [45, 71, 45, 255]
  }],
  ["lichen", {
    name: "Lichen",
    description: "Glow Lichen, Verdant Froglight",
    id: "verdant_froglight []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [109, 144, 129, 255]
  }],
  ["darkcrimson", {
    name: "Crimson Hyphae",
    description: "Crimson Hyphae, Stripped Crimson Hyphae",
    id: "crimson_hyphae []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [79, 21, 25, 255]
  }],
  ["darkwarped", {
    name: "Warped Hyphae",
    description: "Warped Hyphae, Stripped Warped Hyphae",
    id: "warped_hyphae []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [74, 37, 53, 255]
  }],
  ["crimsonylium", {
    name: "Crimson Nylium",
    description: "Crimson Nylium",
    id: "crimson_nylium []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [163, 42, 42, 255]
  }],
  ["warpwart", {
    name: "Warped Wart",
    description: "Warped Wart Blocks",
    id: "warped_wart_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [17, 155, 114, 255]
  }],

  // PRECIOUS MATERIALS
  ["turquoise", {
    name: "Turquoise",
    description: "Diamond Blocks, Beacons, Conduits, Prismarine",
    id: "diamond_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [79, 188, 183, 255]
  }],
  ["steel", {
    name: "Iron",
    description: "Iron Blocks, Doors, Anvils, Lanterns, Brewing Stands",
    id: "iron_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [144, 144, 144, 255]
  }],
  ["brightred", {
    name: "Redstone",
    description: "Redstone Blocks, Fire, TNT",
    id: "redstone_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [220, 0, 0, 255]
  }],
  ["gold", {
    name: "Gold",
    description: "Gold Blocks, Bells, Lanterns",
    id: "gold_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [215, 205, 66, 255]
  }],
  ["emerald", {
    name: "Emerald",
    description: "Emerald Blocks",
    id: "emerald_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [0, 187, 50, 255]
  }],
  ["lapis", {
    name: "Lapis",
    description: "Lapis Lazuli Blocks",
    id: "lapis_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [64, 110, 220, 255]
  }],
  ["rawiron", {
    name: "Raw Iron",
    description: "Blocks of Raw Iron",
    id: "raw_iron_block []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [186, 150, 126, 255]
  }],
  ["slime", {
    name: "Slime",
    description: "Slime Blocks",
    id: "slime []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [109, 153, 48, 255]
  }],
  ["web", {
    name: "Web",
    description: "Cobwebs, Mushroom Stem",
    id: "mushroom_stem []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [171, 171, 171, 255]
  }],
  ["ice", {
    name: "Ice",
    description: "Blue Ice, Packed Ice",
    id: "blue_ice []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: false,
    rgb: [138, 138, 220, 255]
  }],
  ["mud", {
    name: "Mud",
    description: "Mud Blocks",
    id: "mud []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [75, 79, 79, 255]
  }],
  ["sculk", {
    name: "Sculk",
    description: "Sculk Blocks, Catalyst, Sensor, Shrieker",
    id: "sculk []",
    is_dye: false, is_terc: false, is_biomevar: false, is_greyscale: true,
    rgb: [11, 15, 19, 255]
  }]
]);

/**
 * Berechne dunklere Schattierung für 3D-Maps (80% Helligkeit)
 * Wird auf 254 gesetzt um Höhenwert zu codieren
 * @param {Array<Number>} rgb - RGB Wert [R,G,B]
 * @returns {Array<Number>} Darker RGBA [R,G,B,254]
 */
function getDarkPixel(rgb) {
  return [
    Math.floor(rgb[0] * 180 / 220),
    Math.floor(rgb[1] * 180 / 220),
    Math.floor(rgb[2] * 180 / 220),
    254
  ];
}

/**
 * Berechne hellere Schattierung für 3D-Maps (120% Helligkeit)
 * Wird auf 253 gesetzt um Höhenwert zu codieren
 * @param {Array<Number>} rgb - RGB Wert [R,G,B]
 * @returns {Array<Number>} Lighter RGBA [R,G,B,253]
 */
function getLightPixel(rgb) {
  return [
    Math.ceil(rgb[0] * 255 / 220),
    Math.ceil(rgb[1] * 255 / 220),
    Math.ceil(rgb[2] * 255 / 220),
    253
  ];
}

/**
 * Erstelle Farbpalette für Quantisierung
 * Wenn is3D=true, werden Dark+Light Varianten hinzugefügt
 * @param {String} paletteString - Space-separated Material Keys
 * @param {Boolean} is3D - Mit 3D Höhen-Varianten?
 * @returns {Array<Array<Number>>} RGBA Werte für Quantisierung
 */
function buildPaletteArray(paletteString, is3D = false) {
  const palette = [];

  for (const code of paletteString.split(" ")) {
    const color = MinecraftColors.get(code);

    if (!color) {
      console.error(`Invalid color code: ${code}`);
      continue;
    }

    // Normal (base) color
    palette.push(color.rgb);

    // 3D height variants
    if (is3D) {
      palette.push(getDarkPixel(color.rgb));   // 254 = lower elevation
      palette.push(getLightPixel(color.rgb));  // 253 = higher elevation
    }
  }

  return palette;
}

/**
 * Finde ähnlichste Farbe mit Red-Mean weighted Distanz
 * @param {Array<Number>} rgb - Target RGB
 * @param {Array<Array<Number>>} palette - Palette RGBA array
 * @returns {Array<Number>} Ähnlichste RGBA aus Palette (kopiert)
 */
function findClosestColor(rgb, palette) {
  let minDistance = Infinity;
  let closestColor = palette[0];

  // Clamping gegen Overflow durch Dithering
  const r = Math.min(Math.max(rgb[0], 0), 255);
  const g = Math.min(Math.max(rgb[1], 0), 255);
  const b = Math.min(Math.max(rgb[2], 0), 255);

  // Berechne Distance für alle Palette-Farben
  for (const paletteColor of palette) {
    let distance;

    // Red-mean weighted distance (better color perception)
    if (r + paletteColor[0] > 256) {
      distance = 2 * Math.pow(r - paletteColor[0], 2) +
                 4 * Math.pow(g - paletteColor[1], 2) +
                 3 * Math.pow(b - paletteColor[2], 2);
    } else {
      distance = 3 * Math.pow(r - paletteColor[0], 2) +
                 4 * Math.pow(g - paletteColor[1], 2) +
                 2 * Math.pow(b - paletteColor[2], 2);
    }

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = paletteColor;
    }
  }

  return closestColor.slice(); // Important: copy, don't reference
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MinecraftColors,
    buildPaletteArray,
    findClosestColor,
    getDarkPixel,
    getLightPixel
  };
}
