import { world, system } from "@minecraft/server";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

// Optional: BedrockBridge integration
let bridgeDirect = null;
try {
    const addons = await import("../addons");
    bridgeDirect = addons.bridgeDirect;
    console.info("[UpdateNotifier] BedrockBridge integration loaded");
} catch {
    console.warn("[UpdateNotifier] Running without BedrockBridge");
}

// ====== Configuration ======
const CURRENT_VERSION = "1.21.100";
const CHECK_INTERVAL = 72000; // 1 hour in ticks

// Version Database
const VERSIONS = [
    {
        version: "1.21.101",
        title: "Minecraft - 1.21.101 (Bedrock)",
        date: "2025-01-15",
        changes: [
            "Bug fixes and stability improvements",
            "Performance optimizations",
            "Fixed multiplayer connectivity issues"
        ],
        url: "https://feedback.minecraft.net/hc/en-us/articles/38783390143885"
    },
    {
        version: "1.21.100", 
        title: "Minecraft - 1.21.100 (Bedrock)",
        date: "2025-01-08",
        changes: [
            "New features added",
            "Gameplay improvements",
            "Technical updates"
        ],
        url: "https://feedback.minecraft.net/hc/en-us/articles/38581287884557"
    },
    {
        version: "1.21.93",
        title: "Minecraft - 1.21.93/94 (Bedrock)",
        date: "2024-12-20",
        changes: [
            "Holiday features",
            "New marketplace content",
            "Stability improvements"
        ],
        url: "https://feedback.minecraft.net/hc/en-us/articles/37810171798029"
    },
    {
        version: "1.21.90",
        title: "Chase the Skies Update",
        date: "2024-12-01",
        changes: [
            "New Sky Islands dimension",
            "Wind mechanics",
            "New blocks and items"
        ],
        url: "https://feedback.minecraft.net/hc/en-us/articles/37393460002957"
    }
];

// Track notified players
const notifiedPlayers = new Map();
let currentVersion = CURRENT_VERSION;
let latestVersion = VERSIONS[0].version;

// ====== Utils ======
function compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (p1[i] > p2[i]) return 1;
        if (p1[i] < p2[i]) return -1;
    }
    return 0;
}

function hasBeenNotified(player, version) {
    const id = player.id ?? player.name;
    const notified = notifiedPlayers.get(id);
    return notified && notified.has(version);
}

function markNotified(player, version) {
    const id = player.id ?? player.name;
    if (!notifiedPlayers.has(id)) {
        notifiedPlayers.set(id, new Set());
    }
    notifiedPlayers.get(id).add(version);
}

function sendDiscordUpdate(player, versionInfo) {
    if (!bridgeDirect) return;
    
    try {
        bridgeDirect.sendEmbed({
            title: "🎮 New Bedrock Update Available!",
            description: `**Version ${versionInfo.version}** is now available!`,
            color: 0x00ff00,
            fields: [
                {
                    name: "Player Notified",
                    value: player.name,
                    inline: true
                },
                {
                    name: "Release Date",
                    value: versionInfo.date,
                    inline: true
                },
                {
                    name: "Changes",
                    value: versionInfo.changes.slice(0, 3).map(c => `• ${c}`).join("\n"),
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "Bedrock Update Notifier" }
        }, "UpdateNotifier");
    } catch {
        // Silent fail
    }
}

// ====== Notifications ======
function notifyPlayer(player, versionInfo, force = false) {
    if (!force && hasBeenNotified(player, versionInfo.version)) return;
    
    // Chat notification
    player.sendMessage("§6═══════════════════════════════════");
    player.sendMessage("§b§l🎮 NEW BEDROCK UPDATE AVAILABLE!");
    player.sendMessage(`§aVersion: §e${versionInfo.version}`);
    player.sendMessage(`§7Released: ${versionInfo.date}`);
    player.sendMessage("");
    player.sendMessage("§bWhat's New:");
    versionInfo.changes.slice(0, 3).forEach(c => {
        player.sendMessage(`§3• ${c}`);
    });
    player.sendMessage("§6═══════════════════════════════════");
    player.sendMessage("§7Type §b!update §7for full details");
    
    // Title notification
    player.onScreenDisplay.setTitle(
        `§6⚡ Update ${versionInfo.version}`,
        {
            subtitle: "§aNew version available!",
            fadeInDuration: 10,
            stayDuration: 70,
            fadeOutDuration: 20
        }
    );
    
    // Sound
    try {
        player.playSound("random.levelup", { volume: 0.5, pitch: 1.2 });
    } catch {}
    
    // Particles
    try {
        const loc = player.location;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            player.dimension.spawnParticle("minecraft:totem_particle", {
                x: loc.x + Math.cos(angle) * 2,
                y: loc.y + 1,
                z: loc.z + Math.sin(angle) * 2
            });
        }
    } catch {}
    
    markNotified(player, versionInfo.version);
    sendDiscordUpdate(player, versionInfo);
}

// ====== UI ======
function openMainMenu(player) {
    const form = new ActionFormData()
        .title("§b§lBedrock Update Center")
        .body(`§7Current: ${currentVersion}\n§7Latest: ${latestVersion}`);
    
    form.button("📰 Latest Update", "textures/ui/icon_book_writable");
    form.button("📋 All Updates", "textures/ui/copy");
    form.button("🔔 Check Now", "textures/ui/refresh_light");
    form.button("ℹ️ About", "textures/ui/infobulb");
    
    form.show(player).then(res => {
        if (res.canceled) return;
        
        switch (res.selection) {
            case 0: showLatestUpdate(player); break;
            case 1: showAllUpdates(player); break;
            case 2: checkForUpdates(player); break;
            case 3: showAbout(player); break;
        }
    }).catch(err => {
        player.sendMessage(`§cError: ${err?.message ?? err}`);
    });
}

function showLatestUpdate(player) {
    const latest = VERSIONS[0];
    
    const form = new MessageFormData()
        .title(`Update ${latest.version}`)
        .body(
            `§b${latest.title}\n` +
            `§7Released: ${latest.date}\n\n` +
            `§bChanges:\n` +
            latest.changes.map(c => `• ${c}`).join('\n') +
            `\n\n§7More info: ${latest.url}`
        )
        .button1("Back")
        .button2("Share");
    
    form.show(player).then(res => {
        if (res.selection === 0) {
            openMainMenu(player);
        } else if (res.selection === 1) {
            world.sendMessage(`§b[${player.name}] §7Check out the new §e${latest.version} §7update!`);
        }
    });
}

function showAllUpdates(player) {
    const form = new ActionFormData()
        .title("All Updates")
        .body("Select a version:");
    
    VERSIONS.forEach(v => {
        form.button(`${v.version} - ${v.title}`);
    });
    form.button("◀ Back");
    
    form.show(player).then(res => {
        if (res.canceled) return;
        
        if (res.selection < VERSIONS.length) {
            showVersionDetails(player, VERSIONS[res.selection]);
        } else {
            openMainMenu(player);
        }
    });
}

function showVersionDetails(player, versionInfo) {
    const form = new MessageFormData()
        .title(versionInfo.version)
        .body(
            `§b${versionInfo.title}\n` +
            `§7Released: ${versionInfo.date}\n\n` +
            `§bChanges:\n` +
            versionInfo.changes.map(c => `• ${c}`).join('\n')
        )
        .button1("Back")
        .button2("Close");
    
    form.show(player).then(res => {
        if (res.selection === 0) showAllUpdates(player);
    });
}

function checkForUpdates(player) {
    player.sendMessage("§7Checking for updates...");
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
        player.sendMessage(`§aNew update found: ${latestVersion}!`);
        notifyPlayer(player, VERSIONS[0], true);
    } else {
        player.sendMessage(`§7You're on the latest version (${currentVersion})`);
    }
}

function showAbout(player) {
    const form = new MessageFormData()
        .title("About")
        .body(
            "§bBedrock Update Notifier v1.0\n\n" +
            "Keeps you informed about the latest Minecraft Bedrock updates!\n\n" +
            "§bCommands:\n" +
            "• !update - Open menu\n" +
            "• !update check - Check now\n" +
            "• !update latest - Show latest\n\n" +
            "Use an emerald to open menu"
        )
        .button1("Back");
    
    form.show(player).then(() => openMainMenu(player));
}

// ====== Commands ======
world.beforeEvents.chatSend.subscribe(ev => {
    const msg = ev.message.toLowerCase();
    const player = ev.sender;
    
    if (msg.startsWith("!update")) {
        ev.cancel = true;
        system.run(() => {
            const args = msg.split(' ');
            
            if (args.length === 1) {
                openMainMenu(player);
            } else {
                switch (args[1]) {
                    case 'check':
                        checkForUpdates(player);
                        break;
                    case 'latest':
                        showLatestUpdate(player);
                        break;
                    case 'all':
                        showAllUpdates(player);
                        break;
                    case 'help':
                        player.sendMessage("§b=== Update Commands ===");
                        player.sendMessage("§7!update - Open menu");
                        player.sendMessage("§7!update check - Check for updates");
                        player.sendMessage("§7!update latest - Show latest");
                        player.sendMessage("§7!update all - Show all updates");
                        break;
                    default:
                        openMainMenu(player);
                }
            }
        });
    }
    
    // Admin commands
    if (msg.startsWith("!updateadmin") && player.hasTag("admin")) {
        ev.cancel = true;
        system.run(() => {
            const args = msg.split(' ');
            
            if (args[1] === 'broadcast') {
                world.getAllPlayers().forEach(p => {
                    notifyPlayer(p, VERSIONS[0], true);
                });
                player.sendMessage("§aBroadcasted to all players");
            } else if (args[1] === 'setversion' && args[2]) {
                currentVersion = args[2];
                player.sendMessage(`§aSet version to ${args[2]}`);
            } else {
                player.sendMessage("§b=== Admin Commands ===");
                player.sendMessage("§7!updateadmin broadcast");
                player.sendMessage("§7!updateadmin setversion <v>");
            }
        });
    }
});

// ====== Emerald opens menu ======
world.beforeEvents.itemUse.subscribe(ev => {
    if (ev.itemStack?.typeId === "minecraft:emerald") {
        const player = ev.source;
        system.run(() => openMainMenu(player));
    }
});

// ====== Player join ======
world.afterEvents.playerSpawn.subscribe(ev => {
    const player = ev.player;
    if (!player || !player.id || !player.isValid) return; // skip SimulatedPlayers
    
    system.runTimeout(() => {
        if (!player?.isValid) return;
        player.sendMessage("§7[§bUpdate§7] Use §b!update §7or an emerald for update info");
        
        if (compareVersions(latestVersion, currentVersion) > 0) {
            notifyPlayer(player, VERSIONS[0]);
        }
    }, 60);
});

// ====== Periodic check ======
system.runInterval(() => {
    if (compareVersions(latestVersion, currentVersion) > 0) {
        world.getAllPlayers().forEach(player => {
            if (!hasBeenNotified(player, latestVersion)) {
                notifyPlayer(player, VERSIONS[0]);
            }
        });
    }
}, CHECK_INTERVAL);

console.log("✨ Bedrock Update Notifier loaded!");
console.log(`Current: ${currentVersion}, Latest: ${latestVersion}`);