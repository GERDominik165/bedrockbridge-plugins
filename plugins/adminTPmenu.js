/**
 * EnhancedTrophyTP - Advanced Admin Teleport Menu
 * Version: 2.0.0
 * Compatible with: Minecraft Bedrock 1.21.93+
 * 
 * Features:
 * - Robust UI handling with delayed form opening
 * - Multiple access methods: command and ScriptEvent
 * - Advanced player targeting with tag-based permissions
 * - Customizable UI with icons and colors
 * - Detailed logging for troubleshooting
 * - Multi-dimension teleporting with safety checks
 * - ScriptEvent integration with flexible data passing
 * - Error recovery and fallback mechanisms
 */

import { world, system, Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

// ===== CONFIGURATION =====
const CONFIG = {
  // Command settings
  commands: {
    main: "trophyadmintp", // Main command name
    alias: "tatp",         // Optional alias command
  },
  
  // Permission settings
  permissions: {
    adminTags: ["admin", "staff", "mod"], // Any of these tags grants access
    requireTag: true,                     // Set to false to only use isOp() check
    allowOpWithoutTag: true,              // Allow operators without tags
  },
  
  // UI Settings
  ui: {
    title: "§9Admin Teleport Menu",
    menuBody: "Select a teleport action:",
    colors: {
      success: "§a",
      error: "§c",
      info: "§e",
      highlight: "§b",
      menu: "§9"
    },
    prefix: "§9[TrophyTP]§r",
    icons: {
      teleportToPlayer: "textures/ui/icon_multiplayer.png",
      teleportToMe: "textures/ui/icon_import.png", 
      teleportPlayerToPlayer: "textures/ui/icon_world.png",
      back: "textures/ui/arrow_left.png",
      player: "textures/ui/icon_multiplayer.png",
      myself: "textures/ui/permissions_member_star.png"
    }
  },
  
  // ScriptEvent settings
  scriptEvent: {
    name: "trophy:open_tp_menu",  // Event name to listen for
    namespace: "trophy",          // Event namespace to subscribe to
    logging: true,                // Enable detailed event logging
  },
  
  // Advanced settings
  advanced: {
    menuOpenAttempts: 15,         // Max attempts to open menu
    menuOpenDelay: 20,            // Ticks between open attempts (20 = 1 second)
    teleportYOffset: 0.2,         // Y-axis offset when teleporting
    notifyTargets: true,          // Notify players when they're teleported
    dimensionChangeAllowed: true, // Allow cross-dimension teleports
    debug: false,                 // Enhanced debug logging (set to true for troubleshooting)
    checkPlayerValidity: true,    // Validate player objects before operations
  }
};

// ===== MENU HANDLING =====
// Menu queue system - tracks pending menu requests
const menuPending = new Map();
let debugLogCounter = 0;

// ===== UTILITY FUNCTIONS =====

/**
 * Enhanced logging function with debug mode support
 * @param {string} message - The message to log
 * @param {string} type - The type of log (info, error, warn, debug)
 * @param {boolean} forceLog - Force logging even if debug is disabled
 */
function log(message, type = "info", forceLog = false) {
  const prefix = "[EnhancedTrophyTP]";
  
  // Only log debug messages if debug is enabled or force flag is set
  if (type === "debug" && !CONFIG.advanced.debug && !forceLog) {
    return;
  }
  
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const logMessage = `${prefix} [${timestamp}] ${message}`;
  
  switch (type) {
    case "error":
      console.error(logMessage);
      break;
    case "warn":
      console.warn(logMessage);
      break;
    case "debug":
      console.warn(`${prefix} [DEBUG ${++debugLogCounter}] ${message}`);
      break;
    default:
      console.warn(logMessage);
  }
}

/**
 * Validate if an object is a valid player
 * @param {any} obj - Object to validate
 * @returns {boolean} True if valid player
 */
function isValidPlayer(obj) {
  if (!obj) return false;
  
  try {
    // Check for essential player properties
    // Don't check specific methods as they might not exist in all versions
    return (obj && 
            typeof obj.name === 'string' && 
            typeof obj.id === 'string' &&
            obj.location !== undefined &&
            obj.dimension !== undefined);
  } catch (e) {
    return false;
  }
}

/**
 * Check if player has permission to use teleport features
 * @param {Player} player - The player to check
 * @returns {boolean} True if player has permission
 */
function hasPermission(player) {
  if (!isValidPlayer(player)) return false;
  
  try {
    // Check if player has operator status
    let isOperator = false;
    
    // Try different methods to check operator status
    if (typeof player.isOp === 'function') {
      isOperator = player.isOp();
    } else if (player.isOp !== undefined) {
      isOperator = player.isOp;
    } else if (player.hasTag && player.hasTag("op")) {
      // Fallback: check for op tag
      isOperator = true;
    }
    
    // If player is operator and config allows operators
    if (isOperator && CONFIG.permissions.allowOpWithoutTag) {
      log(`${player.name} granted access as operator`, "debug");
      return true;
    }
    
    // If requiring tag, check for any allowed tags
    if (CONFIG.permissions.requireTag) {
      // Ensure hasTag is available
      if (typeof player.hasTag !== 'function') {
        log(`Player.hasTag is not a function, cannot check tags`, "warn");
        return isOperator; // Fallback to operator status
      }
      
      for (const tag of CONFIG.permissions.adminTags) {
        try {
          if (player.hasTag(tag)) {
            log(`${player.name} granted access with tag: ${tag}`, "debug");
            return true;
          }
        } catch (tagError) {
          log(`Error checking tag ${tag}: ${tagError.message}`, "debug");
        }
      }
      
      // No matching tags found
      return false;
    }
    
    // Default fallback to operator status
    return isOperator;
  } catch (error) {
    log(`Error checking permissions for ${player?.name}: ${error.message}`, "error");
    return false;
  }
}

/**
 * Get formatted message with prefix
 * @param {string} message - The message to format
 * @param {string} type - The type of message (for color coding)
 * @returns {string} Formatted message
 */
function formatMessage(message, type = "info") {
  const color = CONFIG.ui.colors[type] || CONFIG.ui.colors.info;
  return `${CONFIG.ui.prefix} ${color}${message}`;
}

/**
 * Send formatted message to player
 * @param {Player} player - The player to send message to
 * @param {string} message - The message to send
 * @param {string} type - The type of message
 */
function sendMessage(player, message, type = "info") {
  if (!isValidPlayer(player)) return;
  
  try {
    player.sendMessage(formatMessage(message, type));
  } catch (error) {
    log(`Error sending message to player: ${error.message}`, "error");
  }
}

/**
 * Get all players except specified one
 * @param {Player} excludePlayer - Player to exclude from list
 * @returns {Player[]} Array of other players
 */
function getOtherPlayers(excludePlayer) {
  try {
    return [...world.getPlayers()].filter(p => 
      isValidPlayer(p) && p.id !== excludePlayer?.id
    );
  } catch (error) {
    log(`Error getting other players: ${error.message}`, "error");
    return [];
  }
}

// ===== COMMAND REGISTRATION =====

/**
 * Register commands if bridge is available
 */
function registerCommands() {
  // Check if bridge is available
  if (typeof bridge === 'undefined' || !bridge?.bedrockCommands?.registerCommand) {
    log("Bridge not available, skipping command registration", "warn");
    return;
  }

  // Register main command
  try {
    bridge.bedrockCommands.registerCommand(CONFIG.commands.main, (player) => {
      if (!isValidPlayer(player)) {
        log("Invalid player object received in command", "error");
        return;
      }
      
      if (hasPermission(player)) {
        tryOpenMenuWithDelay(player);
      } else {
        sendMessage(player, "You don't have permission to use this command.", "error");
      }
    }, `Open the advanced admin teleport menu`);
    
    log(`Successfully registered /${CONFIG.commands.main} command`);
  } catch (error) {
    log(`Command registration error: ${error.message}`, "error");
  }

  // Register alias command if set
  if (CONFIG.commands.alias && CONFIG.commands.alias !== CONFIG.commands.main) {
    try {
      bridge.bedrockCommands.registerCommand(CONFIG.commands.alias, (player) => {
        if (!isValidPlayer(player)) {
          log("Invalid player object received in alias command", "error");
          return;
        }
        
        if (hasPermission(player)) {
          tryOpenMenuWithDelay(player);
        } else {
          sendMessage(player, "You don't have permission to use this command.", "error");
        }
      }, `Alias for /${CONFIG.commands.main}`);
      
      log(`Successfully registered /${CONFIG.commands.alias} alias command`);
    } catch (error) {
      log(`Alias command registration error: ${error.message}`, "error");
    }
  }
}

// ===== SCRIPT EVENT LISTENER =====

/**
 * Register ScriptEvent listener
 */
function registerScriptEventListener() {
  try {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id !== CONFIG.scriptEvent.name) return;
      
      log(`Received ScriptEvent: ${event.id}`, "debug");
      handleScriptEvent(event);
    }, { namespaces: [CONFIG.scriptEvent.namespace] });
    
    log(`Successfully registered ScriptEvent listener for '${CONFIG.scriptEvent.name}'`);
  } catch (error) {
    log(`Failed to register ScriptEvent: ${error.message}`, "error");
  }
}

/**
 * Handle ScriptEvent
 * @param {object} event - The script event
 */
function handleScriptEvent(event) {
  try {
    let player = null;
    
    // First, try to get player from sourceEntity
    if (event.sourceEntity) {
      log(`Checking sourceEntity...`, "debug");
      
      // Validate if sourceEntity is a player
      if (isValidPlayer(event.sourceEntity)) {
        player = event.sourceEntity;
        log(`Found valid player from sourceEntity: ${player.name}`, "debug");
      } else {
        log(`SourceEntity is not a valid player`, "debug");
      }
    }
    
    // If no player from sourceEntity, try to parse message
    if (!player && event.message) {
      log(`Trying to parse message: ${event.message}`, "debug");
      
      try {
        const data = JSON.parse(event.message);
        
        if (data.player) {
          // Find player by name
          const foundPlayer = [...world.getPlayers()].find(p => 
            p.name.toLowerCase() === data.player.toLowerCase()
          );
          
          if (foundPlayer && isValidPlayer(foundPlayer)) {
            player = foundPlayer;
            log(`Found player from message data: ${player.name}`, "debug");
          } else {
            log(`Player not found: ${data.player}`, "warn");
            return;
          }
        }
      } catch (parseError) {
        log(`Failed to parse message as JSON: ${parseError.message}`, "debug");
      }
    }
    
    // If we still don't have a player, exit
    if (!player) {
      log(`No valid player found for ScriptEvent`, "warn");
      return;
    }
    
    // Check permissions and open menu
    if (hasPermission(player)) {
      log(`Opening menu for ${player.name} via ScriptEvent`, "debug");
      tryOpenMenuWithDelay(player);
    } else {
      log(`Player ${player.name} lacks permission`, "warn");
      sendMessage(player, "You don't have permission to use this menu.", "error");
    }
  } catch (error) {
    log(`Error handling ScriptEvent: ${error.message}`, "error");
  }
}

// ===== MENU FUNCTIONS =====

/**
 * Try to open menu with delay (handles chat being open)
 * @param {Player} player - The player to show menu to
 */
function tryOpenMenuWithDelay(player) {
  if (!isValidPlayer(player)) {
    log("Invalid player object in tryOpenMenuWithDelay", "error");
    return;
  }
  
  // Check if already pending
  if (menuPending.has(player.name)) {
    sendMessage(player, "Menu is already trying to open. Please close your chat.", "info");
    return;
  }
  
  // Send instructions
  sendMessage(player, "Teleport menu will open in a few seconds...", "info");
  sendMessage(player, "Please close your chat now.", "highlight");
  
  // Mark as pending
  menuPending.set(player.name, {
    player: player,
    attempts: 0,
    startTime: Date.now()
  });
  
  // Start trying to open menu
  const maxAttempts = CONFIG.advanced.menuOpenAttempts;
  
  const tryOpen = system.runInterval(() => {
    const pendingData = menuPending.get(player.name);
    
    // Stop if no longer pending
    if (!pendingData) {
      system.clearRun(tryOpen);
      return;
    }
    
    // Check if player is still valid
    if (!isValidPlayer(player)) {
      menuPending.delete(player.name);
      system.clearRun(tryOpen);
      log(`Player ${player.name} is no longer valid`, "warn");
      return;
    }
    
    // Check max attempts
    if (pendingData.attempts++ >= maxAttempts) {
      menuPending.delete(player.name);
      sendMessage(player, "Could not open menu. Please make sure your chat is closed and try again.", "error");
      system.clearRun(tryOpen);
      return;
    }
    
    // Try to open the menu
    try {
      openTeleportMenu(player);
      system.clearRun(tryOpen);
    } catch (error) {
      // Menu probably couldn't open due to chat being open
      log(`Attempt ${pendingData.attempts}: ${error.message}`, "debug");
    }
  }, CONFIG.advanced.menuOpenDelay);
}

/**
 * Open the main teleport menu
 * @param {Player} player - The player to show menu to
 */
function openTeleportMenu(player) {
  if (!isValidPlayer(player)) {
    log("Invalid player in openTeleportMenu", "error");
    return;
  }
  
  const form = new ActionFormData()
    .title(CONFIG.ui.title)
    .body(CONFIG.ui.menuBody)
    .button("Teleport to a player", CONFIG.ui.icons.teleportToPlayer)
    .button("Teleport player to me", CONFIG.ui.icons.teleportToMe)
    .button("Teleport player to player", CONFIG.ui.icons.teleportPlayerToPlayer);

  form.show(player).then(response => {
    // Remove from pending once shown
    menuPending.delete(player.name);
    
    if (response.canceled || response.selection === undefined) {
      return;
    }
    
    // Handle menu selection with small delay
    switch (response.selection) {
      case 0: 
        system.runTimeout(() => showTeleportToPlayer(player), 5);
        break;
      case 1: 
        system.runTimeout(() => showTeleportToMe(player), 5);
        break;
      case 2: 
        system.runTimeout(() => showTeleportPlayerToPlayer(player), 5);
        break;
    }
  }).catch((error) => {
    // Menu couldn't be shown
    throw error; // Re-throw to be caught by tryOpenMenuWithDelay
  });
}

/**
 * Show teleport to player menu
 * @param {Player} player - The player showing the menu
 */
function showTeleportToPlayer(player) {
  if (!isValidPlayer(player)) return;
  
  const players = getOtherPlayers(player);
  
  if (players.length === 0) {
    sendMessage(player, "No other players are online.", "error");
    system.runTimeout(() => openTeleportMenu(player), 5);
    return;
  }
  
  const form = new ActionFormData()
    .title(`${CONFIG.ui.colors.menu}Teleport To Player`)
    .body("Select a player to teleport to:");
  
  // Add player buttons
  players.forEach(p => {
    const dimInfo = getDimensionDisplay(p.dimension?.id);
    form.button(`${p.name} ${dimInfo}`, CONFIG.ui.icons.player);
  });
  
  // Back button
  form.button("§cBack", CONFIG.ui.icons.back);
  
  form.show(player).then(response => {
    if (response.canceled || response.selection === undefined) return;
    
    // Back button pressed
    if (response.selection === players.length) {
      system.runTimeout(() => openTeleportMenu(player), 5);
      return;
    }
    
    const target = players[response.selection];
    
    if (!isValidPlayer(target)) {
      sendMessage(player, "Target player is no longer valid.", "error");
      return;
    }
    
    // Perform teleport
    if (teleportPlayer(player, target, player)) {
      sendMessage(player, `Teleported to ${target.name}`, "success");
    }
  }).catch((error) => {
    log(`Menu error: ${error.message}`, "error");
    sendMessage(player, "Error showing menu.", "error");
  });
}

/**
 * Show teleport player to me menu
 * @param {Player} player - The player showing the menu
 */
function showTeleportToMe(player) {
  if (!isValidPlayer(player)) return;
  
  const players = getOtherPlayers(player);
  
  if (players.length === 0) {
    sendMessage(player, "No other players are online.", "error");
    system.runTimeout(() => openTeleportMenu(player), 5);
    return;
  }
  
  const form = new ActionFormData()
    .title(`${CONFIG.ui.colors.menu}Teleport Player To Me`)
    .body("Select a player to teleport to you:");
  
  // Add player buttons
  players.forEach(p => {
    const dimInfo = getDimensionDisplay(p.dimension?.id);
    form.button(`${p.name} ${dimInfo}`, CONFIG.ui.icons.player);
  });
  
  // Back button
  form.button("§cBack", CONFIG.ui.icons.back);
  
  form.show(player).then(response => {
    if (response.canceled || response.selection === undefined) return;
    
    // Back button pressed
    if (response.selection === players.length) {
      system.runTimeout(() => openTeleportMenu(player), 5);
      return;
    }
    
    const target = players[response.selection];
    
    if (!isValidPlayer(target)) {
      sendMessage(player, "Target player is no longer valid.", "error");
      return;
    }
    
    // Perform teleport
    if (teleportPlayer(target, player, player)) {
      sendMessage(player, `Teleported ${target.name} to you`, "success");
      
      if (CONFIG.advanced.notifyTargets) {
        sendMessage(target, `You were teleported to ${player.name}`, "info");
      }
    }
  }).catch((error) => {
    log(`Menu error: ${error.message}`, "error");
    sendMessage(player, "Error showing menu.", "error");
  });
}

/**
 * Show teleport player to player menu (source selection)
 * @param {Player} player - The player showing the menu
 */
function showTeleportPlayerToPlayer(player) {
  if (!isValidPlayer(player)) return;
  
  const allPlayers = [...world.getPlayers()].filter(p => isValidPlayer(p));
  
  if (allPlayers.length < 2) {
    sendMessage(player, "Not enough players are online.", "error");
    system.runTimeout(() => openTeleportMenu(player), 5);
    return;
  }
  
  const form = new ActionFormData()
    .title(`${CONFIG.ui.colors.menu}Select Player to Move`)
    .body("Choose which player to teleport:");
  
  // Add all players including self
  allPlayers.forEach(p => {
    const dimInfo = getDimensionDisplay(p.dimension?.id);
    const icon = p.id === player.id ? CONFIG.ui.icons.myself : CONFIG.ui.icons.player;
    const prefix = p.id === player.id ? "§e" : "";
    form.button(`${prefix}${p.name} ${dimInfo}`, icon);
  });
  
  // Back button
  form.button("§cBack", CONFIG.ui.icons.back);
  
  form.show(player).then(response => {
    if (response.canceled || response.selection === undefined) return;
    
    // Back button pressed
    if (response.selection === allPlayers.length) {
      system.runTimeout(() => openTeleportMenu(player), 5);
      return;
    }
    
    const sourcePlayer = allPlayers[response.selection];
    
    if (!isValidPlayer(sourcePlayer)) {
      sendMessage(player, "Selected player is no longer valid.", "error");
      return;
    }
    
    // Show destination selection
    system.runTimeout(() => showDestinationPlayerMenu(player, sourcePlayer), 5);
  }).catch((error) => {
    log(`Menu error: ${error.message}`, "error");
    sendMessage(player, "Error showing menu.", "error");
  });
}

/**
 * Show destination player selection menu
 * @param {Player} player - The player showing the menu
 * @param {Player} sourcePlayer - The player to be teleported
 */
function showDestinationPlayerMenu(player, sourcePlayer) {
  if (!isValidPlayer(player) || !isValidPlayer(sourcePlayer)) return;
  
  const possibleDestinations = [...world.getPlayers()].filter(p => 
    isValidPlayer(p) && p.id !== sourcePlayer.id
  );
  
  if (possibleDestinations.length === 0) {
    sendMessage(player, "No valid destination players.", "error");
    system.runTimeout(() => showTeleportPlayerToPlayer(player), 5);
    return;
  }
  
  const form = new ActionFormData()
    .title(`${CONFIG.ui.colors.menu}Select Destination`)
    .body(`Choose where to teleport ${sourcePlayer.name}:`);
  
  // Add all possible destinations
  possibleDestinations.forEach(p => {
    const dimInfo = getDimensionDisplay(p.dimension?.id);
    const icon = p.id === player.id ? CONFIG.ui.icons.myself : CONFIG.ui.icons.player;
    const prefix = p.id === player.id ? "§e" : "";
    form.button(`${prefix}${p.name} ${dimInfo}`, icon);
  });
  
  // Back button
  form.button("§cBack", CONFIG.ui.icons.back);
  
  form.show(player).then(response => {
    if (response.canceled || response.selection === undefined) return;
    
    // Back button pressed
    if (response.selection === possibleDestinations.length) {
      system.runTimeout(() => showTeleportPlayerToPlayer(player), 5);
      return;
    }
    
    const destinationPlayer = possibleDestinations[response.selection];
    
    if (!isValidPlayer(destinationPlayer)) {
      sendMessage(player, "Destination player is no longer valid.", "error");
      return;
    }
    
    // Perform teleport
    if (teleportPlayer(sourcePlayer, destinationPlayer, player)) {
      // Send appropriate success messages
      if (sourcePlayer.id === player.id) {
        sendMessage(player, `Teleported to ${destinationPlayer.name}`, "success");
      } else if (destinationPlayer.id === player.id) {
        sendMessage(player, `Teleported ${sourcePlayer.name} to you`, "success");
        if (CONFIG.advanced.notifyTargets) {
          sendMessage(sourcePlayer, `You were teleported to ${player.name}`, "info");
        }
      } else {
        sendMessage(player, `Teleported ${sourcePlayer.name} to ${destinationPlayer.name}`, "success");
        if (CONFIG.advanced.notifyTargets) {
          sendMessage(sourcePlayer, `You were teleported to ${destinationPlayer.name}`, "info");
        }
      }
    }
  }).catch((error) => {
    log(`Menu error: ${error.message}`, "error");
    sendMessage(player, "Error showing menu.", "error");
  });
}

/**
 * Get dimension display string
 * @param {string} dimensionId - The dimension ID
 * @returns {string} Formatted dimension display
 */
function getDimensionDisplay(dimensionId) {
  if (!dimensionId) return "";
  
  const dimColors = {
    "minecraft:overworld": "§a",
    "minecraft:nether": "§c",
    "minecraft:the_end": "§5"
  };
  
  const dimNames = {
    "minecraft:overworld": "Overworld",
    "minecraft:nether": "Nether",
    "minecraft:the_end": "End"
  };
  
  const color = dimColors[dimensionId] || "§7";
  const name = dimNames[dimensionId] || dimensionId.split(":")[1] || "Unknown";
  
  return `§7[${color}${name}§7]`;
}

/**
 * Teleport a player to a destination
 * @param {Player} playerToMove - Player to teleport
 * @param {Player} destination - Destination player
 * @param {Player} messagePlayer - Player to send error messages to
 * @returns {boolean} Success status
 */
function teleportPlayer(playerToMove, destination, messagePlayer) {
  try {
    // Validate players
    if (!isValidPlayer(playerToMove) || !isValidPlayer(destination)) {
      throw new Error("Invalid player reference");
    }
    
    log(`Teleporting ${playerToMove.name} to ${destination.name}`, "debug");
    
    // Get destination location and dimension
    const destLocation = destination.location;
    const destDimension = destination.dimension;
    
    if (!destLocation || !destDimension) {
      throw new Error("Cannot get destination location or dimension");
    }
    
    // Check cross-dimension teleport
    const crossDimension = playerToMove.dimension.id !== destDimension.id;
    if (crossDimension && !CONFIG.advanced.dimensionChangeAllowed) {
      throw new Error("Cross-dimension teleport not allowed");
    }
    
    // Create teleport location
    const teleportLocation = {
      x: destLocation.x,
      y: destLocation.y + CONFIG.advanced.teleportYOffset,
      z: destLocation.z
    };
    
    // Create teleport options
    const teleportOptions = {
      dimension: destDimension,
      rotation: destination.getRotation ? destination.getRotation() : { x: 0, y: 0 },
      keepVelocity: false
    };
    
    // Log teleport details
    log(`Teleport details: ${playerToMove.name} to (${teleportLocation.x.toFixed(1)}, ${teleportLocation.y.toFixed(1)}, ${teleportLocation.z.toFixed(1)}) in ${destDimension.id}`, "debug");
    
    // Perform teleport
    playerToMove.teleport(teleportLocation, teleportOptions);
    
    log(`Successfully teleported ${playerToMove.name}`, "debug");
    return true;
    
  } catch (error) {
    log(`Teleport error: ${error.message}`, "error");
    
    if (messagePlayer && isValidPlayer(messagePlayer)) {
      sendMessage(messagePlayer, `Teleport failed: ${error.message}`, "error");
    }
    
    return false;
  }
}

// ===== INITIALIZATION =====

/**
 * Initialize the plugin
 */
function initialize() {
  log("Initializing Enhanced Trophy Teleport Plugin v2.0.0");
  
  // Register commands if bridge is available
  if (typeof bridge !== 'undefined') {
    registerCommands();
  } else {
    log("Bridge not available - commands will not be registered", "warn");
    log("ScriptEvents can still be used to access the menu", "info");
  }
  
  // Register ScriptEvent listener
  registerScriptEventListener();
  
  // Log usage instructions
  log("=== Usage Instructions ===", "info", true);
  
  if (typeof bridge !== 'undefined') {
    log(`Command: /${CONFIG.commands.main} or /${CONFIG.commands.alias}`, "info", true);
  }
  
  log(`ScriptEvent: /scriptevent ${CONFIG.scriptEvent.name}`, "info", true);
  log(`ScriptEvent with player: /scriptevent ${CONFIG.scriptEvent.name} {"player":"PlayerName"}`, "info", true);
  log("=========================", "info", true);
}

// Run initialization
initialize();