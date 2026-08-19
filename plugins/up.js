// universal-update-notifier.js
// Comprehensive Update Notification System for Minecraft Bedrock & GitHub Releases
// Features:
// - Checks Minecraft Bedrock updates from version database
// - Monitors GitHub releases (BedrockBridge & custom repos)
// - Shows unified dashboard on player join
// - Smart caching with ETags for GitHub API efficiency
// - Discord integration via BedrockBridge
// - Elegant UI with version comparison

import { world, system } from "@minecraft/server";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

// ====== Optional: BedrockBridge Integration ======
let bridgeDirect = null;
try {
    const addons = await import("../addons");
    bridgeDirect = addons.bridgeDirect;
    console.info("[UpdateNotifier] BedrockBridge integration loaded");
} catch {
    console.warn("[UpdateNotifier] Running without BedrockBridge");
}

// ====== Configuration ======
const CONFIG = {
    // Current versions
    MINECRAFT_VERSION: "1.21.121",
    BEDROCKBRIDGE_VERSION: "1.6.10", // Will be updated from GitHub
    
    // Check intervals (in ticks)
    CHECK_INTERVAL: 72000, // 1 hour
    GITHUB_POLL_INTERVAL: 12000, // 10 minutes
    
    // GitHub repositories to monitor
    REPOS: [
        { 
            owner: "InnateAlpaca", 
            repo: "BedrockBridge", 
            label: "BedrockBridge",
            isCore: true // Marks this as the BedrockBridge repo
        },
        // Add your custom repos here:
        // { owner: "YourOrg", repo: "YourRepo", label: "Your Plugin" }
    ],
    
    // Display settings
    SHOW_ON_JOIN_DELAY: 60, // 3 seconds after join
    DISCORD_CHANNEL: "UpdateNotifications"
};

// ====== Minecraft Version Database ======
const MINECRAFT_VERSIONS = [
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
    }
];

// ====== State Management ======
const state = {
    notifiedPlayers: new Map(),
    githubCache: new Map(),
    lastCheck: {
        minecraft: 0,
        github: 0
    },
    versions: {
        minecraft: {
            current: CONFIG.MINECRAFT_VERSION,
            latest: MINECRAFT_VERSIONS[0].version
        },
        bedrockBridge: {
            current: CONFIG.BEDROCKBRIDGE_VERSION,
            latest: null
        }
    }
};

// ====== Utility Functions ======
function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const normalize = v => v.replace(/^v/, '').split('.').map(Number);
    const p1 = normalize(v1);
    const p2 = normalize(v2);
    
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

function formatTimeSince(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getPlayerNotifications(player) {
    if (!player) return {joinCount:0,lastJoin:0,minecraft:new Set(),github:new Set()};
    const id = player.id ?? player.name;
    if (!state.notifiedPlayers.has(id)) {
        state.notifiedPlayers.set(id, {
            minecraft: new Set(),
            github: new Set(),
            joinCount: 0,
            lastJoin: Date.now()
        });
    }
    return state.notifiedPlayers.get(id);
}

// ====== Dynamic Properties ======
function dpKey(prefix, key) {
    return `update:${prefix}:${key}`;
}

function dpGet(key) {
    try { return world.getDynamicProperty(key); }
    catch { return undefined; }
}

function dpSet(key, val) {
    try { world.setDynamicProperty(key, val); }
    catch {}
}

// ====== GitHub API Functions ======
async function fetchGitHubRelease(repo) {
    const repoKey = `${repo.owner}/${repo.repo}`;
    const uri = `https://api.github.com/repos/${repoKey}/releases/latest`;
    
    const req = new HttpRequest(uri);
    req.method = HttpRequestMethod.Get;
    req.headers = [
        new HttpHeader("User-Agent", "MC-UpdateNotifier/2.0"),
        new HttpHeader("Accept", "application/json"),
        new HttpHeader("X-GitHub-Api-Version", "2022-11-28")
    ];
    
    // Use ETag for efficiency
    const etag = dpGet(dpKey("etag", repoKey));
    if (etag) {
        req.headers.push(new HttpHeader("If-None-Match", etag));
    }
    
    req.timeout = 10;
    
    try {
        const res = await http.request(req);
        
        // Handle rate limiting
        const remaining = Number(res.headers?.find(h => 
            h.name?.toLowerCase() === "x-ratelimit-remaining")?.value ?? "1");
        
        if (remaining <= 0) {
            console.warn(`[GitHub] Rate limit hit for ${repoKey}`);
            return null;
        }
        
        if (res.status === 304) {
            // Not modified - use cache
            return state.githubCache.get(repoKey);
        }
        
        if (res.status !== 200) {
            throw new Error(`GitHub API error: ${res.status}`);
        }
        
        // Save new ETag
        const newEtag = res.headers?.find(h => 
            h.name?.toLowerCase() === "etag")?.value;
        if (newEtag) {
            dpSet(dpKey("etag", repoKey), newEtag);
        }
        
        // Parse response
        const data = JSON.parse(res.body);
        const release = {
            tag: data.tag_name,
            name: data.name || data.tag_name,
            url: data.html_url,
            published: data.published_at,
            notes: data.body || "",
            assets: (data.assets || []).map(a => ({
                name: a.name,
                url: a.browser_download_url
            }))
        };
        
        // Cache the result
        state.githubCache.set(repoKey, release);
        dpSet(dpKey("github", repoKey), JSON.stringify(release));
        
        // Update BedrockBridge version if this is the core repo
        if (repo.isCore && release.tag) {
            state.versions.bedrockBridge.latest = release.tag;
            dpSet(dpKey("version", "bedrockbridge"), release.tag);
        }
        
        return release;
        
    } catch (error) {
        console.error(`[GitHub] Error fetching ${repoKey}:`, error);
        // Try to use cached data
        const cached = dpGet(dpKey("github", repoKey));
        if (cached) {
            try { return JSON.parse(cached); }
            catch { return null; }
        }
        return null;
    }
}

// ====== Update Check Functions ======
async function checkAllUpdates() {
    const updates = {
        minecraft: null,
        github: []
    };
    
    // Check Minecraft version
    if (compareVersions(state.versions.minecraft.latest, state.versions.minecraft.current) > 0) {
        updates.minecraft = MINECRAFT_VERSIONS[0];
    }
    
    // Check GitHub releases
    for (const repo of CONFIG.REPOS) {
        const release = await fetchGitHubRelease(repo);
        if (release) {
            const repoKey = `${repo.owner}/${repo.repo}`;
            const lastNotified = dpGet(dpKey("notified", repoKey));
            
            if (!lastNotified || lastNotified !== release.tag) {
                updates.github.push({ repo, release, isNew: true });
            } else {
                updates.github.push({ repo, release, isNew: false });
            }
        }
    }
    
    state.lastCheck.github = Date.now();
    return updates;
}

// ====== Player Join Handler ======
async function handlePlayerJoin(player) {
    const notifications = getPlayerNotifications(player);
    notifications.joinCount++;
    notifications.lastJoin = Date.now();
    
    // Delay to let player fully load
    system.runTimeout(async () => {
        try {
            // Fetch latest updates
            const updates = await checkAllUpdates();
            
            // Build status message
            const statusLines = [];
            
            // Header with player name
            statusLines.push(`§b§l═══ Welcome ${player.name} ═══`);
            statusLines.push("");
            
            // Version Status Section
            statusLines.push("§6▶ Version Status:");
            
            // Minecraft version
            const mcCurrent = state.versions.minecraft.current;
            const mcLatest = state.versions.minecraft.latest;
            const mcStatus = compareVersions(mcLatest, mcCurrent) > 0 
                ? `§c⚠ Update Available: ${mcLatest}` 
                : "§a✓ Up to date";
            statusLines.push(`§7  Minecraft Bedrock: §f${mcCurrent} ${mcStatus}`);
            
            // BedrockBridge version
            const bbVersion = state.versions.bedrockBridge.latest || "checking...";
            statusLines.push(`§7  BedrockBridge: §f${bbVersion}`);
            
            // Other repos
            for (const item of updates.github) {
                if (!item.repo.isCore && item.release) {
                    const indicator = item.isNew ? "§e🔔" : "§a✓";
                    statusLines.push(`§7  ${item.repo.label}: §f${item.release.tag} ${indicator}`);
                }
            }
            
            statusLines.push("");
            
            // Update notifications
            let hasUpdates = false;
            
            if (updates.minecraft) {
                hasUpdates = true;
                statusLines.push("§c§l⚠ MINECRAFT UPDATE AVAILABLE!");
                statusLines.push(`§e  Version ${updates.minecraft.version} - ${updates.minecraft.date}`);
                statusLines.push("");
            }
            
            const newGitHubUpdates = updates.github.filter(u => u.isNew);
            if (newGitHubUpdates.length > 0) {
                hasUpdates = true;
                statusLines.push("§e§l🔔 NEW GITHUB RELEASES:");
                for (const item of newGitHubUpdates) {
                    statusLines.push(`§b  ${item.repo.label}: §f${item.release.tag}`);
                }
                statusLines.push("");
            }
            
            // Commands hint
            statusLines.push("§7Commands: §b!update §7- Main menu | §b!github §7- GitHub releases");
            statusLines.push(`§7Join count: §f#${notifications.joinCount} §7| Last check: §f${formatTimeSince(state.lastCheck.github)}`);
            statusLines.push("§b§l═════════════════════════");
            
            // Send message
            for (const line of statusLines) {
                if (player?.isValid) { try { player.sendMessage(line); } catch(e) {} }
            }
            
            // Show title if updates available
            if (hasUpdates) {
                player.onScreenDisplay.setTitle("§6⚡ Updates Available", {
                    subtitle: "§eCheck §b!update §efor details",
                    fadeInDuration: 10,
                    stayDuration: 100,
                    fadeOutDuration: 20
                });
                
                try {
                    player.playSound("random.orb", { volume: 0.3, pitch: 1.0 });
                } catch {}
            }
            
            // Send Discord notification for first join
            if (notifications.joinCount === 1 && bridgeDirect) {
                sendDiscordJoinNotification(player, updates);
            }
            
        } catch (error) {
            console.error("[UpdateNotifier] Join handler error:", error);
            if (player?.isValid) { try { player.sendMessage("§7[Update] Use §b!update §7to check for updates"); } catch(e) {} }
        }
    }, CONFIG.SHOW_ON_JOIN_DELAY);
}

// ====== Discord Integration ======
function sendDiscordJoinNotification(player, updates) {
    if (!bridgeDirect) return;
    
    try {
        const fields = [
            {
                name: "Player",
                value: player.name,
                inline: true
            },
            {
                name: "Minecraft Version",
                value: `${state.versions.minecraft.current} → ${state.versions.minecraft.latest}`,
                inline: true
            }
        ];
        
        if (state.versions.bedrockBridge.latest) {
            fields.push({
                name: "BedrockBridge",
                value: state.versions.bedrockBridge.latest,
                inline: true
            });
        }
        
        const hasUpdates = updates.minecraft || updates.github.some(u => u.isNew);
        
        bridgeDirect.sendEmbed({
            title: hasUpdates ? "🔔 Player Joined - Updates Available" : "✅ Player Joined",
            description: `${player.name} joined the server`,
            color: hasUpdates ? 0xffa500 : 0x00ff00,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: "Update Notifier" }
        }, CONFIG.DISCORD_CHANNEL);
    } catch (error) {
        console.warn("[Discord] Failed to send notification:", error);
    }
}

// ====== UI Functions ======
async function openMainMenu(player) {
    const form = new ActionFormData()
        .title("§b§lUpdate Center")
        .body(
            `§7Minecraft: ${state.versions.minecraft.current} → ${state.versions.minecraft.latest}\n` +
            `§7BedrockBridge: ${state.versions.bedrockBridge.latest || "checking..."}\n` +
            `§7Last check: ${formatTimeSince(state.lastCheck.github)}`
        );
    
    form.button("📰 Minecraft Updates", "textures/ui/icon_book_writable");
    form.button("🔧 GitHub Releases", "textures/ui/automation_glyph");
    form.button("🔄 Check Now", "textures/ui/refresh_light");
    form.button("📊 Status Report", "textures/ui/conduit_power_effect");
    form.button("⚙️ Settings", "textures/ui/settings_glyph");
    
    try {
        const res = await form.show(player);
        if (res.canceled) return;
        
        switch (res.selection) {
            case 0: await showMinecraftUpdates(player); break;
            case 1: await showGitHubReleases(player); break;
            case 2: await performManualCheck(player); break;
            case 3: await showStatusReport(player); break;
            case 4: await showSettings(player); break;
        }
    } catch (error) {
        if (player?.isValid) { try { player.sendMessage(`§cError: ${error?.message || error}`); } catch(e) {} }
    }
}

async function showMinecraftUpdates(player) {
    const form = new ActionFormData()
        .title("§b§lMinecraft Bedrock Updates")
        .body(`Current: ${state.versions.minecraft.current}\nLatest: ${state.versions.minecraft.latest}`);
    
    for (const version of MINECRAFT_VERSIONS.slice(0, 5)) {
        const isCurrent = version.version === state.versions.minecraft.current;
        const icon = isCurrent ? "§a✓" : "";
        form.button(`${version.version} ${icon}\n§7${version.date}`);
    }
    form.button("◀ Back");
    
    const res = await form.show(player);
    if (!res.canceled) {
        if (res.selection < MINECRAFT_VERSIONS.length) {
            await showMinecraftVersionDetails(player, MINECRAFT_VERSIONS[res.selection]);
        } else {
            await openMainMenu(player);
        }
    }
}

async function showMinecraftVersionDetails(player, version) {
    const form = new MessageFormData()
        .title(version.version)
        .body(
            `§b${version.title}\n` +
            `§7Released: ${version.date}\n\n` +
            `§bChanges:\n` +
            version.changes.map(c => `• ${c}`).join('\n') +
            `\n\n§7More info: ${version.url}`
        )
        .button1("Back")
        .button2("Share");
    
    const res = await form.show(player);
    if (res.selection === 0) {
        await showMinecraftUpdates(player);
    } else if (res.selection === 1) {
        world.sendMessage(`§b[${player.name}] §7Check out §e${version.version} §7- ${version.title}!`);
    }
}

async function showGitHubReleases(player) {
    const form = new ActionFormData()
        .title("§b§lGitHub Releases")
        .body("Select a repository to view latest release:");
    
    for (const repo of CONFIG.REPOS) {
        const repoKey = `${repo.owner}/${repo.repo}`;
        const cached = state.githubCache.get(repoKey);
        const tag = cached?.tag || "checking...";
        const icon = repo.isCore ? "🔧" : "📦";
        form.button(`${icon} ${repo.label}\n§7${tag}`);
    }
    form.button("◀ Back");
    
    const res = await form.show(player);
    if (!res.canceled) {
        if (res.selection < CONFIG.REPOS.length) {
            await showGitHubDetails(player, CONFIG.REPOS[res.selection]);
        } else {
            await openMainMenu(player);
        }
    }
}

async function showGitHubDetails(player, repo) {
    const repoKey = `${repo.owner}/${repo.repo}`;
    const release = state.githubCache.get(repoKey) || await fetchGitHubRelease(repo);
    
    if (!release) {
        if (player?.isValid) { try { player.sendMessage("§cFailed to fetch release information"); } catch(e) {} }
        return;
    }
    
    const form = new MessageFormData()
        .title(`${repo.label} - ${release.tag}`)
        .body(
            `§b${release.name}\n` +
            `§7Published: ${new Date(release.published).toLocaleDateString()}\n` +
            `§7URL: ${release.url}\n\n` +
            `§bRelease Notes:\n${release.notes.slice(0, 500)}${release.notes.length > 500 ? '...' : ''}\n\n` +
            `§bAssets: ${release.assets.length} file(s)`
        )
        .button1("Back")
        .button2("Share");
    
    const res = await form.show(player);
    if (res.selection === 0) {
        await showGitHubReleases(player);
    } else if (res.selection === 1) {
        world.sendMessage(`§b[${player.name}] §7${repo.label} §e${release.tag} §7→ ${release.url}`);
    }
}

async function performManualCheck(player) {
    if (player?.isValid) { try { player.sendMessage("§7[Update] Checking all sources..."); } catch(e) {} }
    
    try {
        const updates = await checkAllUpdates();
        
        let foundUpdates = false;
        
        // Check Minecraft
        if (updates.minecraft) {
            if (player?.isValid) { try { player.sendMessage(`§a✓ Minecraft: §eUpdate available - ${updates.minecraft.version}`); } catch(e) {} }
            foundUpdates = true;
        } else {
            if (player?.isValid) { try { player.sendMessage(`§7✓ Minecraft: Up to date (${state.versions.minecraft.current})`); } catch(e) {} }
        }
        
        // Check GitHub
        for (const item of updates.github) {
            if (item.release) {
                const status = item.isNew ? "§eNew release" : "§7Current";
                if (player?.isValid) { try { player.sendMessage(`§7✓ ${item.repo.label}: ${status} - ${item.release.tag}`); } catch(e) {} }
                if (item.isNew) foundUpdates = true;
            }
        }
        
        if (foundUpdates) {
            if (player?.isValid) { try { player.sendMessage("§a§lUpdates found! Check the menu for details."); } catch(e) {} }
        } else {
            if (player?.isValid) { try { player.sendMessage("§7All systems up to date!"); } catch(e) {} }
        }
        
    } catch (error) {
        if (player?.isValid) { try { player.sendMessage(`§cError checking updates: ${error?.message || error}`); } catch(e) {} }
    }
}

async function showStatusReport(player) {
    const notifications = getPlayerNotifications(player);
    
    const form = new MessageFormData()
        .title("§b§lStatus Report")
        .body(
            `§b═══ System Status ═══\n\n` +
            `§6Versions:\n` +
            `§7• Minecraft: §f${state.versions.minecraft.current}\n` +
            `§7• Latest MC: §f${state.versions.minecraft.latest}\n` +
            `§7• BedrockBridge: §f${state.versions.bedrockBridge.latest || "unknown"}\n\n` +
            `§6Your Stats:\n` +
            `§7• Join count: §f${notifications.joinCount}\n` +
            `§7• Last join: §f${formatTimeSince(notifications.lastJoin)}\n` +
            `§7• Notifications: §f${notifications.minecraft.size + notifications.github.size}\n\n` +
            `§6System:\n` +
            `§7• Last MC check: §f${formatTimeSince(state.lastCheck.minecraft)}\n` +
            `§7• Last GitHub check: §f${formatTimeSince(state.lastCheck.github)}\n` +
            `§7• Cached repos: §f${state.githubCache.size}\n` +
            `§7• Active players: §f${world.getAllPlayers().length}`
        )
        .button1("OK")
        .button2("Refresh");
    
    const res = await form.show(player);
    if (res.selection === 1) {
        await performManualCheck(player);
        await showStatusReport(player);
    }
}

async function showSettings(player) {
    if (!player.hasTag("admin")) {
        if (player?.isValid) { try { player.sendMessage("§cAdmin access required"); } catch(e) {} }
        return;
    }
    
    const form = new ModalFormData()
        .title("§b§lUpdate Settings")
        .textField("Minecraft Version", "1.21.100", state.versions.minecraft.current)
        .textField("BedrockBridge Version", "1.0.0", state.versions.bedrockBridge.current || "")
        .toggle("Discord Notifications", !!bridgeDirect)
        .toggle("Auto-check on join", true);
    
    const res = await form.show(player);
    if (!res.canceled && res.formValues) {
        const [mcVersion, bbVersion, discord, autoCheck] = res.formValues;
        
        if (mcVersion) {
            state.versions.minecraft.current = mcVersion;
            CONFIG.MINECRAFT_VERSION = mcVersion;
            dpSet(dpKey("version", "minecraft"), mcVersion);
        }
        
        if (bbVersion) {
            state.versions.bedrockBridge.current = bbVersion;
            CONFIG.BEDROCKBRIDGE_VERSION = bbVersion;
            dpSet(dpKey("version", "bedrockbridge-current"), bbVersion);
        }
        
        if (player?.isValid) { try { player.sendMessage("§aSettings updated!"); } catch(e) {} }
    }
}

// ====== Command Handlers ======
world.beforeEvents.chatSend.subscribe(ev => {
    const msg = ev.message.toLowerCase().trim();
    const player = ev.sender;
    
    if (msg.startsWith("!update")) {
        ev.cancel = true;
        system.run(async () => {
            const args = msg.split(' ');
            
            if (args.length === 1) {
                await openMainMenu(player);
            } else {
                switch (args[1]) {
                    case 'check':
                        await performManualCheck(player);
                        break;
                    case 'minecraft':
                    case 'mc':
                        await showMinecraftUpdates(player);
                        break;
                    case 'github':
                    case 'git':
                        await showGitHubReleases(player);
                        break;
                    case 'status':
                        await showStatusReport(player);
                        break;
                    case 'help':
                        if (player?.isValid) { try { player.sendMessage("§b═══ Update Commands ═══"); } catch(e) {} }
                        if (player?.isValid) { try { player.sendMessage("§7!update - Open main menu"); } catch(e) {} }
                        if (player?.isValid) { try { player.sendMessage("§7!update check - Check all sources"); } catch(e) {} }
                        if (player?.isValid) { try { player.sendMessage("§7!update minecraft - Minecraft versions"); } catch(e) {} }
                        if (player?.isValid) { try { player.sendMessage("§7!update github - GitHub releases"); } catch(e) {} }
                        if (player?.isValid) { try { player.sendMessage("§7!update status - System status"); } catch(e) {} }
                        if (player?.isValid) { try { player.sendMessage("§7!github - Quick GitHub menu"); } catch(e) {} }
                        break;
                    default:
                        await openMainMenu(player);
                }
            }
        });
    } else if (msg.startsWith("!github")) {
        ev.cancel = true;
        system.run(async () => {
            await showGitHubReleases(player);
        });
    }
    
    // Admin commands
    if (msg.startsWith("!updateadmin") && player.hasTag("admin")) {
        ev.cancel = true;
        system.run(async () => {
            const args = msg.split(' ');
            
            if (args[1] === 'broadcast') {
                const updates = await checkAllUpdates();
                world.getAllPlayers().forEach(p => handlePlayerJoin(p));
                if (player?.isValid) { try { player.sendMessage("§aBroadcasted update status to all players"); } catch(e) {} }
            } else if (args[1] === 'reset') {
                state.notifiedPlayers.clear();
                state.githubCache.clear();
                if (player?.isValid) { try { player.sendMessage("§aReset all caches"); } catch(e) {} }
            } else if (args[1] === 'settings') {
                await showSettings(player);
            } else {
                if (player?.isValid) { try { player.sendMessage("§b═══ Admin Commands ═══"); } catch(e) {} }
                if (player?.isValid) { try { player.sendMessage("§7!updateadmin broadcast - Notify all"); } catch(e) {} }
                if (player?.isValid) { try { player.sendMessage("§7!updateadmin reset - Clear caches"); } catch(e) {} }
                if (player?.isValid) { try { player.sendMessage("§7!updateadmin settings - Configure"); } catch(e) {} }
            }
        });
    }
});

// ====== Event Handlers ======
world.afterEvents.playerSpawn.subscribe(ev => {
    if (!ev?.player || !ev.player.id) return; // skip SimulatedPlayers
    handlePlayerJoin(ev.player);
});

// ====== Periodic Checks ======
// Check Minecraft versions periodically
system.runInterval(() => {
    if (compareVersions(state.versions.minecraft.latest, state.versions.minecraft.current) > 0) {
        world.getAllPlayers().forEach(player => {
            const notifications = getPlayerNotifications(player);
            if (!notifications.minecraft.has(state.versions.minecraft.latest)) {
                if (player?.isValid) { try { player.sendMessage(`§6§l⚠ Minecraft ${state.versions.minecraft.latest} is available!`); } catch(e) {} }
                notifications.minecraft.add(state.versions.minecraft.latest);
            }
        });
    }
}, CONFIG.CHECK_INTERVAL);

// Check GitHub releases periodically
system.runInterval(async () => {
    for (const repo of CONFIG.REPOS) {
        try {
            await fetchGitHubRelease(repo);
        } catch (error) {
            console.warn(`[GitHub] Failed to check ${repo.label}:`, error);
        }
    }
}, CONFIG.GITHUB_POLL_INTERVAL);

// ====== Initialization ======
async function initialize() {
    console.log("§b════════════════════════════════");
    console.log("§b✨ Universal Update Notifier v2.0");
    console.log(`§7Minecraft: ${CONFIG.MINECRAFT_VERSION}`);
    console.log(`§7Monitoring ${CONFIG.REPOS.length} GitHub repos`);
    
    // Load cached versions
    const cachedBBVersion = dpGet(dpKey("version", "bedrockbridge"));
    if (cachedBBVersion) {
        state.versions.bedrockBridge.latest = cachedBBVersion;
    }
    
    // Initial GitHub check
    for (const repo of CONFIG.REPOS) {
        try {
            await fetchGitHubRelease(repo);
        } catch {}
    }
    
    console.log("§b════════════════════════════════");
}

// Start the system
initialize();