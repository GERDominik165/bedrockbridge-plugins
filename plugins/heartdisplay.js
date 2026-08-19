// TrophyNetwork HeartDisplay Plugin – BedrockBridge Ultra Edition
// Version: 5.3.1 – Fixed Command Registration & Enhanced UI
// Author: poweroffapt

import { system, world, EntityComponentTypes } from '@minecraft/server';
import { ModalFormData, ActionFormData, MessageFormData } from '@minecraft/server-ui';
import { bridge, database } from '../addons';

// Database for settings
const SETTINGS = database.makeTable('heartdisplay.settings');

// Global settings with defaults
let HEART_SYMBOL = SETTINGS.get('symbol') ?? '❤';
let UPDATE_INTERVAL = SETTINGS.get('interval') ?? 20;
let DISPLAY_MODE = SETTINGS.get('mode') ?? 'below';
let ENABLED = SETTINGS.get('enabled') ?? true;
let DISPLAY_STYLE = SETTINGS.get('style') ?? 'symbol';

// Constants
const DEBUG_TAG = 'heartdisplay:debug';
const HIDE_TAG = 'heartdisplay:hide';
const ADMIN_TAG = 'admin';
const DIMENSIONS = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
const PLUGIN_PREFIX = '§9[§bHeartDisplay§9]§r';

// Format hearts based on health and settings
function formatHearts(health, maxHealth = 20) {
  const percent = (health / maxHealth) * 100;
  const red = percent <= 25;
  const color = red ? '§c' : '§f';

  switch (DISPLAY_STYLE) {
    case 'percent':
      return `${color}${Math.round(percent)}%`;
    case 'bar': {
      const totalBars = 10;
      const filled = Math.round((health / maxHealth) * totalBars);
      return `${color}|` + '█'.repeat(filled) + '░'.repeat(totalBars - filled) + '|';
    }
    default: {
      const fullHearts = Math.floor(Math.max(0, health / 2));
      const hasHalf = (health % 2) >= 1;
      return `${color}${HEART_SYMBOL} ${fullHearts}${hasHalf ? '.5' : ''}`;
    }
  }
}

// Check if entity has health component
function isLivingEntity(entity) {
  try {
    return entity?.hasComponent(EntityComponentTypes.Health);
  } catch {
    return false;
  }
}

// Get entity base name without heart display
function getBaseName(entity) {
  try {
    if (entity.typeId === 'minecraft:player') return entity.name;
    if (entity.nameTag?.length) return entity.nameTag.split('\n')[0];
    return entity.typeId.replace('minecraft:', '').replaceAll('_', ' ');
  } catch {
    return 'Unknown';
  }
}

// Update entity name tag with health display
function updateEntityNameTag(entity) {
  if (!ENABLED) return;
  if (!isLivingEntity(entity)) return;
  if (entity.hasTag(HIDE_TAG)) return;

  const healthComp = entity.getComponent(EntityComponentTypes.Health);
  if (!healthComp || typeof healthComp.currentValue !== 'number') return;
  
  const health = healthComp.currentValue;
  const maxHealth = healthComp.effectiveMax;
  if (health <= 0) return;

  const baseName = getBaseName(entity);
  const heartLine = formatHearts(health, maxHealth);
  let newName = '';

  switch (DISPLAY_MODE) {
    case 'inline':
      newName = `${baseName} ${heartLine}`;
      break;
    case 'above':
      newName = `${heartLine}\n${baseName}`;
      break;
    default:
      newName = `${baseName}\n${heartLine}`;
  }

  if (entity.nameTag !== newName) {
    entity.nameTag = newName;
    if (entity.typeId === 'minecraft:player') {
      try { entity.setGlowing?.(true); } catch(e) {}
    }
  }
}

// Update name tags for all entities
function updateNameTags() {
  if (!ENABLED) return;

  for (const dimensionId of DIMENSIONS) {
    let dimension;
    try {
      dimension = world.getDimension(dimensionId);
    } catch {
      continue;
    }

    let entities;
    try {
      entities = dimension.getEntities();
    } catch {
      continue;
    }

    for (const entity of entities) {
      if (!entity || !entity.typeId) continue; // guard undefined/invalid entities
      if (entity.typeId === 'minecraft:player') {
        const sneaking = entity.getComponent('minecraft:is_sneaking')?.value ?? false;
        if (sneaking) {
          entity.nameTag = '';
          continue;
        }
      }

      updateEntityNameTag(entity);
    }
  }
}

// Apply settings from database
function applySettings() {
  HEART_SYMBOL = SETTINGS.get('symbol') ?? '❤';
  UPDATE_INTERVAL = SETTINGS.get('interval') ?? 20;
  DISPLAY_MODE = SETTINGS.get('mode') ?? 'below';
  ENABLED = SETTINGS.get('enabled') ?? true;
  DISPLAY_STYLE = SETTINGS.get('style') ?? 'symbol';
}

// ==================== UI FUNCTIONS ====================

// Open main heart menu
function openHeartMenu(player) {
  if (!player.hasTag(ADMIN_TAG)) {
    player.sendMessage(`${PLUGIN_PREFIX} §cYou do not have permission to open this menu.`);
    return;
  }

  system.runTimeout(() => {
    try {
      const form = new ActionFormData()
        .title('❤️ HeartDisplay')
        .button('⚙️ Open Settings', 'textures/ui/settings_glyph_color')
        .button('📄 Show Info', 'textures/ui/icon_book')
        .button('🔄 Force Update', 'textures/ui/refresh_light')
        .button('❌ Cancel', 'textures/ui/redX1');

      form.show(player).then(res => {
        if (res.canceled) return;
        
        if (res.selection === 0) {
          system.runTimeout(() => showHeartSettings(player), 5);
        } else if (res.selection === 1) {
          system.runTimeout(() => showHeartInfo(player), 5);
        } else if (res.selection === 2) {
          player.sendMessage(`${PLUGIN_PREFIX} §bManual update triggered...`);
          updateNameTags();
          player.sendMessage(`${PLUGIN_PREFIX} §aUpdate completed.`);
          system.runTimeout(() => openHeartMenu(player), 20);
        }
      }).catch(err => {
        console.warn(`[HeartDisplay] ⚠️ Menu show error: ${err}`);
        player.sendMessage(`${PLUGIN_PREFIX} §cThere was an error displaying the menu. Please try again.`);
      });
    } catch (err) {
      console.warn(`[HeartDisplay] ⚠️ Menu creation error: ${err}`);
      player.sendMessage(`${PLUGIN_PREFIX} §cThere was an error creating the menu. Please try again.`);
    }
  }, 20);
}

// Show heart settings menu
function showHeartSettings(player) {
  player.sendMessage(`${PLUGIN_PREFIX} §7Opening HeartDisplay settings...`);

  system.runTimeout(() => {
    try {
      const debug = player.hasTag(DEBUG_TAG);

      const form = new ModalFormData()
        .title('❤️ HeartDisplay Settings')
        .toggle('Enable HeartDisplay', ENABLED)
        .textField('Heart Symbol', '', HEART_SYMBOL)
        .dropdown('Display Mode', ['below', 'above', 'inline'], ['below', 'above', 'inline'].indexOf(DISPLAY_MODE))
        .dropdown('Display Style', ['symbol', 'percent', 'bar'], ['symbol', 'percent', 'bar'].indexOf(DISPLAY_STYLE))
        .slider('Update Interval (ticks)', 5, 60, 5, UPDATE_INTERVAL)
        .toggle('Enable debug output (console/chat)', debug);

      form.show(player).then(res => {
        if (res.canceled) {
          system.runTimeout(() => openHeartMenu(player), 5);
          return;
        }
        
        const [enabled, symbol, modeIndex, styleIndex, interval, debugView] = res.formValues;

        SETTINGS.set('enabled', enabled);
        SETTINGS.set('symbol', symbol || '❤');
        SETTINGS.set('mode', ['below', 'above', 'inline'][modeIndex]);
        SETTINGS.set('style', ['symbol', 'percent', 'bar'][styleIndex]);
        SETTINGS.set('interval', interval);

        applySettings();

        if (debugView) {
          player.addTag(DEBUG_TAG);
          player.sendMessage(`${PLUGIN_PREFIX} §eDebug enabled.`);
        } else {
          player.removeTag(DEBUG_TAG);
          player.sendMessage(`${PLUGIN_PREFIX} §7Debug disabled.`);
        }

        player.sendMessage(`${PLUGIN_PREFIX} §aHeartDisplay settings saved.`);
        
        // Confirm and apply changes immediately
        const confirmForm = new MessageFormData()
          .title("Settings Saved")
          .body("Settings have been saved. Would you like to apply them to all entities now?")
          .button1("Yes, Apply Now")
          .button2("No, Later");
          
        system.runTimeout(() => {
          confirmForm.show(player).then(response => {
            if (!response.canceled && response.selection === 0) {
              player.sendMessage(`${PLUGIN_PREFIX} §bApplying settings to all entities...`);
              updateNameTags();
              player.sendMessage(`${PLUGIN_PREFIX} §aSettings applied successfully!`);
            }
            system.runTimeout(() => openHeartMenu(player), 5);
          });
        }, 5);
      }).catch(err => {
        console.warn(`[HeartDisplay] ⚠️ Settings form error: ${err}`);
        player.sendMessage(`${PLUGIN_PREFIX} §cThere was an error with the settings form. Please try again.`);
        system.runTimeout(() => openHeartMenu(player), 20);
      });
    } catch (err) {
      console.warn(`[HeartDisplay] ⚠️ Settings menu error for ${player.name}: ${err}`);
      player.sendMessage(`${PLUGIN_PREFIX} §cError creating settings menu. Please try again.`);
      system.runTimeout(() => openHeartMenu(player), 20);
    }
  }, 40);
}

// Show heart info dialog
function showHeartInfo(player) {
  player.sendMessage(
    `${PLUGIN_PREFIX} §bPlugin Info:\n§7– Shows hearts below entities\n§7– Color changes when health is low\n§7– Sneaking hides display\n§7– Glow effect active for players\n§7– Configurable via UI or /hearts`
  );
  
  // Return to main menu after delay
  system.runTimeout(() => openHeartMenu(player), 60);
}

// ==================== COMMAND REGISTRATION ====================

// Register commands individually like in the Plugin Manager
function registerHeartsCommands() {
  // Command functions
  
  // Toggle visibility for a player
  function toggleHearts(player) {
    if (player.hasTag(HIDE_TAG)) {
      player.removeTag(HIDE_TAG);
      player.sendMessage(`${PLUGIN_PREFIX} §aHeartDisplay enabled for you.`);
    } else {
      player.addTag(HIDE_TAG);
      player.sendMessage(`${PLUGIN_PREFIX} §7HeartDisplay disabled for you.`);
    }
  }
  
  // Show heart settings UI
  function showSettingsUI(player) {
    if (!player.hasTag(ADMIN_TAG)) {
      player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to change settings.`);
      return;
    }
    system.runTimeout(() => showHeartSettings(player), 5);
  }
  
  // Force update all hearts
  function testHearts(player) {
    if (!player.hasTag(ADMIN_TAG)) {
      player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to use this command.`);
      return;
    }
    player.sendMessage(`${PLUGIN_PREFIX} §bManual update triggered...`);
    updateNameTags();
    player.sendMessage(`${PLUGIN_PREFIX} §aUpdate completed.`);
  }
  
  // Set heart symbol
  function setSymbol(player, symbol) {
    if (!player.hasTag(ADMIN_TAG)) {
      player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to change settings.`);
      return;
    }
    if (!symbol) {
      player.sendMessage(`${PLUGIN_PREFIX} §cPlease specify a heart symbol. Current: "${HEART_SYMBOL}"`);
      return;
    }
    SETTINGS.set('symbol', symbol);
    applySettings();
    player.sendMessage(`${PLUGIN_PREFIX} §aHeart symbol changed to "${symbol}"`);
  }
  
  // Enable/disable globally
  function setEnabled(player, enabled) {
    if (!player.hasTag(ADMIN_TAG)) {
      player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to change settings.`);
      return;
    }
    SETTINGS.set('enabled', enabled);
    applySettings();
    if (enabled) {
      player.sendMessage(`${PLUGIN_PREFIX} §aHeartDisplay enabled globally.`);
    } else {
      player.sendMessage(`${PLUGIN_PREFIX} §7HeartDisplay disabled globally.`);
    }
  }
  
  // Show help message
  function showHelp(player) {
    player.sendMessage(`${PLUGIN_PREFIX} §bAvailable commands:
§7/hearts - Open the UI menu (admin only)
§7/hearts toggle - Toggle display for yourself
§7/hearts hide - Hide hearts for yourself
§7/hearts show - Show hearts for yourself
§7/hearts info - Show plugin information
§7/hearts help - Show this help message
§a§oAdmin commands:
§a§o/hearts settings - Open settings menu
§a§o/hearts test - Force update all displays
§a§o/hearts enable/disable - Toggle global display
§a§o/hearts symbol <text> - Change heart symbol
§a§o/hearts mode <below|above|inline> - Change display mode
§a§o/hearts style <symbol|percent|bar> - Change display style
§a§o/hearts interval <5-60> - Change update interval
§a§o/hearts reload - Reload settings`);
  }
  
  // Register main command with pattern matching similar to Plugin Manager
  try {
    // Register the main hearts command with subcommands
    const heartsCommand = bridge.bedrockCommands.registerCommand("hearts", (player, arg1, arg2) => {
      // Use proper CommandArgument handling
      const action = arg1 ? arg1.toString().toLowerCase() : null;
      const parameter = arg2 ? arg2.toString() : null;
      
      // If no arguments, show UI for admins or show help for regular players
      if (!action) {
        if (player.hasTag(ADMIN_TAG)) {
          system.runTimeout(() => openHeartMenu(player), 5);
        } else {
          player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to open the menu. Try using /hearts help`);
        }
        return;
      }
      
      // Process the command
      switch(action) {
        case "ui":
          if (player.hasTag(ADMIN_TAG)) {
            system.runTimeout(() => openHeartMenu(player), 5);
          } else {
            player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to open the menu.`);
          }
          break;
          
        case "toggle":
          toggleHearts(player);
          break;
          
        case "hide":
          player.addTag(HIDE_TAG);
          player.sendMessage(`${PLUGIN_PREFIX} §7HeartDisplay hidden for you.`);
          break;
          
        case "show":
          player.removeTag(HIDE_TAG);
          player.sendMessage(`${PLUGIN_PREFIX} §7HeartDisplay shown again.`);
          break;
          
        case "test":
          testHearts(player);
          break;
          
        case "info":
          showHeartInfo(player);
          break;
          
        case "settings":
          showSettingsUI(player);
          break;
          
        case "symbol":
          setSymbol(player, parameter);
          break;
          
        case "enable":
          setEnabled(player, true);
          break;
          
        case "disable":
          setEnabled(player, false);
          break;
          
        case "mode":
          if (!player.hasTag(ADMIN_TAG)) {
            player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to change settings.`);
            return;
          }
          if (!parameter || !['below', 'above', 'inline'].includes(parameter)) {
            player.sendMessage(`${PLUGIN_PREFIX} §cInvalid mode. Use one of: below, above, inline`);
            return;
          }
          SETTINGS.set('mode', parameter);
          applySettings();
          player.sendMessage(`${PLUGIN_PREFIX} §aDisplay mode changed to "${parameter}"`);
          break;
          
        case "style":
          if (!player.hasTag(ADMIN_TAG)) {
            player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to change settings.`);
            return;
          }
          if (!parameter || !['symbol', 'percent', 'bar'].includes(parameter)) {
            player.sendMessage(`${PLUGIN_PREFIX} §cInvalid style. Use one of: symbol, percent, bar`);
            return;
          }
          SETTINGS.set('style', parameter);
          applySettings();
          player.sendMessage(`${PLUGIN_PREFIX} §aDisplay style changed to "${parameter}"`);
          break;
          
        case "interval":
          if (!player.hasTag(ADMIN_TAG)) {
            player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to change settings.`);
            return;
          }
          const intervalValue = parseInt(parameter);
          if (isNaN(intervalValue) || intervalValue < 5 || intervalValue > 60) {
            player.sendMessage(`${PLUGIN_PREFIX} §cInvalid interval. Please use a number between 5 and 60.`);
            return;
          }
          SETTINGS.set('interval', intervalValue);
          applySettings();
          player.sendMessage(`${PLUGIN_PREFIX} §aUpdate interval changed to ${intervalValue} ticks`);
          break;
          
        case "reload":
          if (!player.hasTag(ADMIN_TAG)) {
            player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to use this command.`);
            return;
          }
          applySettings();
          updateNameTags();
          player.sendMessage(`${PLUGIN_PREFIX} §aSettings reloaded and displays updated.`);
          break;
          
        case "help":
        default:
          showHelp(player);
      }
    }, "HeartDisplay plugin commands");

    console.warn('[HeartDisplay] ✅ Main hearts command registered.');

    // Register alternative command aliases
    bridge.bedrockCommands.registerCommand("heart", (player, arg1, arg2) => {
      // Explicitly call the main command handler
      const heartsHandler = bridge.bedrockCommands.getCommandHandler("hearts");
      if (heartsHandler) {
        heartsHandler(player, arg1, arg2);
      } else {
        player.sendMessage(`${PLUGIN_PREFIX} §cMain command not available. Please use /hearts instead.`);
      }
    }, "HeartDisplay plugin commands (alias)");
    
    bridge.bedrockCommands.registerCommand("heartmenu", (player) => {
      if (player.hasTag(ADMIN_TAG)) {
        system.runTimeout(() => openHeartMenu(player), 5);
      } else {
        player.sendMessage(`${PLUGIN_PREFIX} §cYou don't have permission to open the menu.`);
      }
    }, "Open HeartDisplay settings menu (admin only)");
    
    // Legacy command support with individual handlers for maximum reliability
    bridge.bedrockCommands.registerCommand("hidehearts", (player) => {
      player.addTag(HIDE_TAG);
      player.sendMessage(`${PLUGIN_PREFIX} §7HeartDisplay hidden for you.`);
    }, "Hide HeartDisplay only for you");
    
    bridge.bedrockCommands.registerCommand("showhearts", (player) => {
      player.removeTag(HIDE_TAG);
      player.sendMessage(`${PLUGIN_PREFIX} §7HeartDisplay shown again.`);
    }, "Show HeartDisplay again");
    
    bridge.bedrockCommands.registerCommand("togglehearts", (player) => {
      toggleHearts(player);
    }, "Toggle HeartDisplay visibility");
    
    // Register test command separately for reliability
    bridge.bedrockCommands.registerCommand("testhearts", (player) => {
      testHearts(player);
    }, "Manually updates visible HeartDisplays");
    
    console.warn('[HeartDisplay] ✅ All commands registered successfully.');
    
    // Discord command integration
    if (bridge?.discordCommands) {
      try {
        bridge.discordCommands.allow("hearts");
        bridge.discordCommands.allow("heart");
        bridge.discordCommands.allow("togglehearts");
        console.warn('[HeartDisplay] ✅ Discord commands registered.');
      } catch (err) {
        console.warn(`[HeartDisplay] ⚠️ Discord command registration error: ${err}`);
      }
    }
    
    return true;
  } catch (err) {
    console.warn(`[HeartDisplay] ❌ Command registration error: ${err}`);
    return false;
  }
}

// ==================== EVENT HANDLING ====================

// Handle bridge initialization with proper fallbacks 
// Exactly like in Plugin Manager
if (bridge?.events?.bridgeInitialize) {
  try {
    bridge.events.bridgeInitialize.subscribe(() => {
      console.log('[HeartDisplay] Bridge initialization detected, registering commands...');
      if (registerHeartsCommands()) {
        console.log('[HeartDisplay] Command registration successful on bridge init.');
      } else {
        console.warn('[HeartDisplay] Command registration failed on bridge init.');
      }
    });
    console.warn('[HeartDisplay] ✅ Bridge initialization event subscribed.');
  } catch (err) {
    console.warn(`[HeartDisplay] ⚠️ Could not subscribe to bridge init event: ${err}`);
    // Fallback if subscription fails
    system.runTimeout(() => {
      console.log('[HeartDisplay] Using fallback command registration...');
      registerHeartsCommands();
    }, 40);
  }
} else {
  console.warn('[HeartDisplay] ⚠️ No bridge initialization event available, using fallback.');
  system.runTimeout(() => {
    console.log('[HeartDisplay] Using fallback command registration...');
    registerHeartsCommands();
  }, 40);
}

// Main update interval with error handling
let intervalId = null;

function startUpdateInterval() {
  (function _heartLoop() {
    system.runTimeout(() => {
      try {
        applySettings();
        updateNameTags();
      } catch (err) {
        console.warn("[HeartDisplay] Error in heart loop: " + err);
      }
      _heartLoop();
    }, UPDATE_INTERVAL);
  })();
  console.warn("[HeartDisplay] Started update loop: " + UPDATE_INTERVAL + " ticks");
}

// Update on health change with error handling
world.afterEvents.entityHealthChanged.subscribe(event => {
  try {
    const affected = event.entity;
    if (!affected) return;
    updateEntityNameTag(affected);
  } catch (err) {
    console.warn(`[HeartDisplay] ⚠️ Health update error: ${err}`);
  }
});

// Item trigger support - similar to Plugin Manager
world.afterEvents.itemUse.subscribe(ev => {
  try {
    // Using apple item to open heart display settings
    if (ev.itemStack.typeId === "minecraft:apple" && ev.source.hasTag(ADMIN_TAG)) {
      system.runTimeout(() => openHeartMenu(ev.source), 5);
    }
  } catch (err) {
    console.warn(`[HeartDisplay] ⚠️ Item use event error: ${err}`);
  }
});

// Initial startup with reliable initialization
system.run(() => {
  try {
    applySettings();
    startUpdateInterval();
    console.warn(`[HeartDisplay Plugin] ✅ Fully initialized (update interval: ${UPDATE_INTERVAL} ticks)`);
  } catch (err) {
    console.warn(`[HeartDisplay Plugin] ❌ Initialization error: ${err}`);
  }
});

// Settings change event - update interval when settings change
(world.afterEvents.worldInitialize || {subscribe: ()=>{}}).subscribe(() => {
  // This is a good place to set up any world-specific initialization
  console.warn('[HeartDisplay] World initialized, ensuring plugin is ready...');
  
  // Make sure commands are registered (further fallback)
  system.runTimeout(() => {
    if (!bridge.bedrockCommands.getCommandHandler("hearts")) {
      console.warn('[HeartDisplay] Commands not registered after world init, attempting registration...');
      registerHeartsCommands();
    }
  }, 100);
});