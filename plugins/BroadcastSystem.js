/**
 * BroadcastSystem @version 1.0.0 - BedrockBridge Plugin
 * 
 * This plugin allows sending broadcast messages both in-game and to Discord
 * using script events. Messages are displayed with formatting in-game and 
 * as embeds in Discord.
 * 
 * by YourName
 */
import { world, system } from '@minecraft/server';
import { bridge, bridgeDirect } from '../addons';

// Configure settings
const CONFIG = {
    // Script event name to listen for
    SCRIPT_EVENT_NAME: "broadcast:message",
    // Colors for in-game messages
    COLORS: {
        TITLE: "§6", // Gold color for titles
        TEXT: "§f",  // White for normal text
        HIGHLIGHT: "§b", // Aqua for highlights
        INFO: "§a",  // Green for info messages
        ALERT: "§c"  // Red for alerts/important messages
    },
    // Discord embed default colors
    DISCORD_COLORS: {
        INFO: 5793266,    // Green
        ANNOUNCEMENT: 16751402, // Gold
        ALERT: 15158332,  // Red
        DEFAULT: 3447003  // Blue
    }
};

// Initialize the plugin
function initPlugin() {
    console.log("Broadcast System plugin initialized!");
    
    // Register script event
    system.afterEvents.scriptEventReceive.subscribe((event) => {
        if (event.id === CONFIG.SCRIPT_EVENT_NAME) {
            handleBroadcastEvent(event);
        }
    });
    
    // Enable Discord direct messaging capability
    bridge.events.bridgeInitialize.subscribe(e => {
        e.registerAddition("discord_direct");
    });
}

/**
 * Handles the broadcast script event
 * Expected message format: type|title|message|color
 * Types: info, announcement, alert
 * Color is optional and refers to Discord embed color
 */
function handleBroadcastEvent(event) {
    try {
        // Parse the message
        const messageData = parseBroadcastMessage(event.message);
        
        // Send in-game message
        sendInGameBroadcast(messageData);
        
        // Send Discord message
        sendDiscordBroadcast(messageData);
        
    } catch (error) {
        console.warn(`Error handling broadcast: ${error.message}`);
    }
}

/**
 * Parse the broadcast message from script event
 */
function parseBroadcastMessage(message) {
    // Split by pipe character
    const parts = message.split('|');
    
    if (parts.length < 3) {
        throw new Error("Invalid broadcast format. Expected: type|title|message|color");
    }
    
    return {
        type: parts[0].toLowerCase(),
        title: parts[1],
        message: parts[2],
        color: parts[3] ? parseInt(parts[3]) : null
    };
}

/**
 * Send a formatted broadcast to all players in-game
 */
function sendInGameBroadcast(data) {
    // Select prefix based on message type
    let prefix = "§8[§6BROADCAST§8]§r ";
    
    if (data.type === "info") {
        prefix = "§8[§aINFO§8]§r ";
    } else if (data.type === "alert") {
        prefix = "§8[§cALERT§8]§r ";
    } else if (data.type === "announcement") {
        prefix = "§8[§6ANNOUNCEMENT§8]§r ";
    }
    
    // Create the formatted message
    const formattedTitle = `${CONFIG.COLORS.TITLE}${data.title}`;
    const formattedMessage = `${CONFIG.COLORS.TEXT}${data.message}`;
    const fullMessage = `${prefix}${formattedTitle}\n${formattedMessage}`;
    
    // Send to all players
    world.sendMessage(fullMessage);
}

/**
 * Send a fancy embed to Discord
 */
function sendDiscordBroadcast(data) {
    // Only send if bridgeDirect is ready
    if (!bridgeDirect || !bridgeDirect.ready) {
        console.warn("Cannot send to Discord: BridgeDirect is not ready");
        return;
    }
    
    // Determine color based on type
    let color = CONFIG.DISCORD_COLORS.DEFAULT;
    if (data.color) {
        color = data.color;
    } else if (data.type === "info") {
        color = CONFIG.DISCORD_COLORS.INFO;
    } else if (data.type === "announcement") {
        color = CONFIG.DISCORD_COLORS.ANNOUNCEMENT;
    } else if (data.type === "alert") {
        color = CONFIG.DISCORD_COLORS.ALERT;
    }
    
    // Create the embed
    const embed = {
        title: data.title,
        description: data.message,
        color: color,
        timestamp: new Date().toISOString(),
        footer: {
            text: `Server Broadcast`
        }
    };
    
    // Send the embed
    bridgeDirect.sendEmbed(embed, "Server Broadcast");
}

// Initialize the plugin
initPlugin();