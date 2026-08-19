// serverlist-mcstatus.js
// BedrockBridge Plugin: Advanced Server List with mcstatus.io API
// Version: 2.0.0 - Professional server browser with real-time status

import { world, system } from "@minecraft/server";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

// Optional modules for enhanced functionality
let transferPlayer = null;
let bridge = null;
let database = null;
let bridgeAvailable = false;

// Dynamic imports for optional features
try {
    const adminModule = await import("@minecraft/server-admin");
    transferPlayer = adminModule.transferPlayer;
    console.info("[ServerList] Transfer functionality available");
} catch (e) {
    console.warn("[ServerList] Transfer functionality not available");
}

try {
    const module = await import("../addons");
    bridge = module.bridge;
    database = module.database;
    bridgeAvailable = true;
    console.info("[ServerList] BedrockBridge API loaded");
} catch (e) {
    console.warn("[ServerList] Running in standalone mode");
}

// ===== CONFIGURATION =====
const CONFIG = {
    api: {
        base: "https://api.mcstatus.io/v2",
        endpoints: {
            statusJava: "/status/java",
            statusBedrock: "/status/bedrock",
            icon: "/icon"
        },
        timeout: 10,
        retries: 2,
        cacheDuration: 60000, // 1 minute cache
        maxConcurrentRequests: 5
    },
    
    ui: {
        title: "§b§lServer Browser",
        itemsPerPage: 6,
        colors: {
            primary: "§b",
            secondary: "§3",
            success: "§a",
            warning: "§e", 
            error: "§c",
            info: "§7",
            online: "§a",
            offline: "§c"
        },
        icons: {
            online: "textures/ui/online_light",
            offline: "textures/ui/offline_light",
            java: "textures/ui/icon_recipe_construction",
            bedrock: "textures/ui/icon_recipe_equipment",
            favorite: "textures/ui/star",
            unfavorite: "textures/ui/star_empty"
        }
    },
    
    servers: {
        // Predefined popular servers
        featured: [
            { address: "play.hypixel.net", type: "java", name: "Hypixel" },
            { address: "pe.mineplex.com", type: "bedrock", name: "Mineplex" },
            { address: "play.cubecraft.net", type: "bedrock", name: "CubeCraft" },
            { address: "play.inpvp.net", type: "bedrock", name: "InPvP" },
            { address: "play.nethergames.org", type: "bedrock", name: "NetherGames" },
            { address: "mco.lbsg.net", type: "bedrock", name: "Lifeboat" }
        ],
        categories: [
            { id: "featured", name: "§6★ Featured Servers", icon: "textures/ui/icon_trending" },
            { id: "favorites", name: "§e❤ My Favorites", icon: "textures/ui/heart_new" },
            { id: "recent", name: "§3⏰ Recently Viewed", icon: "textures/ui/clock" },
            { id: "custom", name: "§b➕ Add Custom Server", icon: "textures/ui/plus" }
        ]
    },
    
    storage: {
        maxFavorites: 50,
        maxRecent: 20,
        maxCustom: 100
    },
    
    features: {
        autoRefresh: true,
        showPing: true,
        showMOTD: true,
        showVersion: true,
        showPlayerList: false, // Can be enabled for smaller servers
        transferSupport: true
    }
};

// ===== DATA MODELS =====
class ServerInfo {
    constructor(address, type = "bedrock", customName = null) {
        this.address = address;
        this.type = type;
        this.customName = customName;
        this.status = null;
        this.lastUpdate = 0;
        this.error = null;
        this.icon = null;
    }
    
    get displayName() {
        if (this.customName) return this.customName;
        if (this.status?.motd?.clean) {
            const name = this.status.motd.clean.split('\n')[0];
            return name.length > 30 ? name.substring(0, 27) + "..." : name;
        }
        return this.address;
    }
    
    get isOnline() {
        return this.status?.online === true;
    }
    
    get playerCount() {
        if (!this.status?.players) return "0/0";
        return `${this.status.players.online || 0}/${this.status.players.max || 0}`;
    }
    
    get versionInfo() {
        if (!this.status?.version) return "Unknown";
        return this.status.version.name_clean || this.status.version.name || "Unknown";
    }
    
    get statusColor() {
        return this.isOnline ? CONFIG.ui.colors.online : CONFIG.ui.colors.offline;
    }
    
    get statusText() {
        if (this.error) return "§cError";
        if (!this.status) return "§7Loading...";
        return this.isOnline ? "§aOnline" : "§cOffline";
    }
    
    needsUpdate() {
        return Date.now() - this.lastUpdate > CONFIG.api.cacheDuration;
    }
}

// ===== STORAGE MANAGER =====
class StorageManager {
    constructor() {
        this.cache = new Map();
        this.favorites = new Map();
        this.recent = new Map();
        this.custom = new Map();
        this.init();
    }
    
    async init() {
        if (bridgeAvailable && database) {
            try {
                await database.makeTable('serverlist_favorites', {
                    playerId: 'string',
                    address: 'string',
                    type: 'string',
                    name: 'string',
                    timestamp: 'int'
                });
                
                await database.makeTable('serverlist_recent', {
                    playerId: 'string',
                    address: 'string',
                    type: 'string',
                    name: 'string',
                    timestamp: 'int'
                });
                
                await database.makeTable('serverlist_custom', {
                    playerId: 'string',
                    address: 'string',
                    type: 'string',
                    name: 'string',
                    timestamp: 'int'
                });
                
                console.info("[ServerList] Database initialized");
            } catch (error) {
                console.warn("[ServerList] Database init error:", error);
            }
        }
    }
    
    // Favorites Management
    async getFavorites(playerId) {
        if (!bridgeAvailable || !database) {
            return Array.from(this.favorites.get(playerId) || []);
        }
        
        try {
            const rows = await database.query(
                'SELECT * FROM serverlist_favorites WHERE playerId = ? ORDER BY timestamp DESC LIMIT ?',
                [playerId, CONFIG.storage.maxFavorites]
            );
            return rows.map(r => ({
                address: r.address,
                type: r.type,
                name: r.name
            }));
        } catch (error) {
            console.warn("[ServerList] Error getting favorites:", error);
            return Array.from(this.favorites.get(playerId) || []);
        }
    }
    
    async addFavorite(playerId, server) {
        const key = `${server.address}:${server.type}`;
        
        if (!bridgeAvailable || !database) {
            const favs = this.favorites.get(playerId) || new Map();
            favs.set(key, server);
            this.favorites.set(playerId, favs);
            return;
        }
        
        try {
            await database.query(
                'INSERT OR REPLACE INTO serverlist_favorites (playerId, address, type, name, timestamp) VALUES (?, ?, ?, ?, ?)',
                [playerId, server.address, server.type, server.customName || '', Date.now()]
            );
        } catch (error) {
            console.warn("[ServerList] Error adding favorite:", error);
        }
    }
    
    async removeFavorite(playerId, address, type) {
        const key = `${address}:${type}`;
        
        if (!bridgeAvailable || !database) {
            const favs = this.favorites.get(playerId) || new Map();
            favs.delete(key);
            return;
        }
        
        try {
            await database.query(
                'DELETE FROM serverlist_favorites WHERE playerId = ? AND address = ? AND type = ?',
                [playerId, address, type]
            );
        } catch (error) {
            console.warn("[ServerList] Error removing favorite:", error);
        }
    }
    
    async isFavorite(playerId, address, type) {
        const favorites = await this.getFavorites(playerId);
        return favorites.some(f => f.address === address && f.type === type);
    }
    
    // Recent Servers Management
    async addRecent(playerId, server) {
        const key = `${server.address}:${server.type}`;
        
        if (!bridgeAvailable || !database) {
            const recent = this.recent.get(playerId) || new Map();
            recent.set(key, { ...server, timestamp: Date.now() });
            
            // Limit size
            if (recent.size > CONFIG.storage.maxRecent) {
                const sorted = Array.from(recent.entries()).sort((a, b) => b[1].timestamp - a[1].timestamp);
                recent.clear();
                sorted.slice(0, CONFIG.storage.maxRecent).forEach(([k, v]) => recent.set(k, v));
            }
            
            this.recent.set(playerId, recent);
            return;
        }
        
        try {
            await database.query(
                'INSERT OR REPLACE INTO serverlist_recent (playerId, address, type, name, timestamp) VALUES (?, ?, ?, ?, ?)',
                [playerId, server.address, server.type, server.customName || '', Date.now()]
            );
            
            // Clean old entries
            await database.query(
                'DELETE FROM serverlist_recent WHERE playerId = ? AND timestamp NOT IN (SELECT timestamp FROM serverlist_recent WHERE playerId = ? ORDER BY timestamp DESC LIMIT ?)',
                [playerId, playerId, CONFIG.storage.maxRecent]
            );
        } catch (error) {
            console.warn("[ServerList] Error adding recent:", error);
        }
    }
    
    async getRecent(playerId) {
        if (!bridgeAvailable || !database) {
            const recent = this.recent.get(playerId) || new Map();
            return Array.from(recent.values()).sort((a, b) => b.timestamp - a.timestamp);
        }
        
        try {
            const rows = await database.query(
                'SELECT * FROM serverlist_recent WHERE playerId = ? ORDER BY timestamp DESC LIMIT ?',
                [playerId, CONFIG.storage.maxRecent]
            );
            return rows.map(r => ({
                address: r.address,
                type: r.type,
                name: r.name
            }));
        } catch (error) {
            console.warn("[ServerList] Error getting recent:", error);
            return [];
        }
    }
    
    // Custom Servers Management
    async getCustomServers(playerId) {
        if (!bridgeAvailable || !database) {
            return Array.from(this.custom.get(playerId) || []);
        }
        
        try {
            const rows = await database.query(
                'SELECT * FROM serverlist_custom WHERE playerId = ? ORDER BY name ASC',
                [playerId]
            );
            return rows.map(r => ({
                address: r.address,
                type: r.type,
                name: r.name
            }));
        } catch (error) {
            console.warn("[ServerList] Error getting custom servers:", error);
            return [];
        }
    }
    
    async addCustomServer(playerId, server) {
        if (!bridgeAvailable || !database) {
            const custom = this.custom.get(playerId) || [];
            custom.push(server);
            this.custom.set(playerId, custom);
            return;
        }
        
        try {
            await database.query(
                'INSERT INTO serverlist_custom (playerId, address, type, name, timestamp) VALUES (?, ?, ?, ?, ?)',
                [playerId, server.address, server.type, server.name, Date.now()]
            );
        } catch (error) {
            console.warn("[ServerList] Error adding custom server:", error);
        }
    }
    
    // Cache Management
    getCachedStatus(address, type) {
        const key = `${type}:${address}`;
        const cached = this.cache.get(key);
        if (cached && !cached.needsUpdate()) {
            return cached;
        }
        return null;
    }
    
    setCachedStatus(server) {
        const key = `${server.type}:${server.address}`;
        this.cache.set(key, server);
    }
}

// ===== API CLIENT =====
class McStatusAPI {
    constructor(storage) {
        this.storage = storage;
        this.activeRequests = new Map();
        this.requestQueue = [];
        this.processing = false;
    }
    
    async getServerStatus(address, type = "bedrock") {
        // Check cache first
        const cached = this.storage.getCachedStatus(address, type);
        if (cached) return cached;
        
        // Create new server info
        const server = new ServerInfo(address, type);
        
        // Queue request
        return this.queueRequest(server);
    }
    
    async queueRequest(server) {
        const key = `${server.type}:${server.address}`;
        
        // Check if already requesting
        if (this.activeRequests.has(key)) {
            return this.activeRequests.get(key);
        }
        
        // Create promise for this request
        const promise = new Promise((resolve) => {
            this.requestQueue.push({ server, resolve });
        });
        
        this.activeRequests.set(key, promise);
        
        // Process queue
        if (!this.processing) {
            this.processQueue();
        }
        
        return promise;
    }
    
    async processQueue() {
        if (this.processing || this.requestQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.requestQueue.length > 0) {
            // Process batch
            const batch = this.requestQueue.splice(0, CONFIG.api.maxConcurrentRequests);
            const promises = batch.map(({ server, resolve }) => 
                this.fetchServerStatus(server).then(() => resolve(server))
            );
            
            await Promise.allSettled(promises);
            
            // Small delay between batches
            if (this.requestQueue.length > 0) {
                await this.sleep(100);
            }
        }
        
        this.processing = false;
    }
    
    async fetchServerStatus(server, retry = 0) {
        const endpoint = server.type === "java" 
            ? CONFIG.api.endpoints.statusJava 
            : CONFIG.api.endpoints.statusBedrock;
        
        const url = `${CONFIG.api.base}${endpoint}/${encodeURIComponent(server.address)}`;
        
        try {
            const request = new HttpRequest(url)
                .setMethod(HttpRequestMethod.Get)
                .setHeaders([
                    new HttpHeader('Accept', 'application/json'),
                    new HttpHeader('User-Agent', 'MinecraftBedrockPlugin/2.0')
                ])
                .setTimeout(CONFIG.api.timeout);
            
            const response = await http.request(request);
            
            if (response.status === 200) {
                server.status = JSON.parse(response.body);
                server.lastUpdate = Date.now();
                server.error = null;
                
                // Try to get icon for Java servers
                if (server.type === "java" && server.status.icon) {
                    server.icon = server.status.icon;
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            if (retry < CONFIG.api.retries) {
                await this.sleep(1000 * (retry + 1));
                return this.fetchServerStatus(server, retry + 1);
            }
            
            server.error = error.message;
            server.status = { online: false };
            server.lastUpdate = Date.now();
        }
        
        // Cache the result
        this.storage.setCachedStatus(server);
        
        // Clear from active requests
        const key = `${server.type}:${server.address}`;
        this.activeRequests.delete(key);
        
        return server;
    }
    
    sleep(ms) {
        return new Promise(resolve => system.runTimeout(() => resolve(), Math.ceil(ms / 50)));
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor(api, storage) {
        this.api = api;
        this.storage = storage;
        this.playerStates = new Map();
    }
    
    async showMainMenu(player) {
        const form = new ActionFormData()
            .title(CONFIG.ui.title)
            .body(`${CONFIG.ui.colors.info}Welcome to the Server Browser!\nChoose a category:`);
        
        // Add category buttons
        for (const category of CONFIG.servers.categories) {
            form.button(category.name, category.icon);
        }
        
        form.button(`${CONFIG.ui.colors.info}⚙️ Settings`);
        form.button(`${CONFIG.ui.colors.error}✖ Close`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return;
            
            const categories = CONFIG.servers.categories;
            
            if (response.selection < categories.length) {
                const category = categories[response.selection];
                await this.showCategory(player, category.id);
            } else if (response.selection === categories.length) {
                await this.showSettings(player);
            }
            // Close button does nothing
            
        } catch (error) {
            console.error("[ServerList] Main menu error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}An error occurred. Please try again.`);
        }
    }
    
    async showCategory(player, categoryId) {
        switch (categoryId) {
            case "featured":
                await this.showFeaturedServers(player);
                break;
            case "favorites":
                await this.showFavorites(player);
                break;
            case "recent":
                await this.showRecentServers(player);
                break;
            case "custom":
                await this.showAddCustomServer(player);
                break;
        }
    }
    
    async showFeaturedServers(player) {
        player.sendMessage(`${CONFIG.ui.colors.info}Loading featured servers...`);
        
        // Fetch all featured servers status
        const serverPromises = CONFIG.servers.featured.map(s => 
            this.api.getServerStatus(s.address, s.type).then(server => {
                server.customName = s.name;
                return server;
            })
        );
        
        const servers = await Promise.all(serverPromises);
        
        await this.showServerList(player, servers, "Featured Servers", () => this.showMainMenu(player));
    }
    
    async showFavorites(player) {
        const favorites = await this.storage.getFavorites(player.id);
        
        if (favorites.length === 0) {
            const msg = new MessageFormData()
                .title("No Favorites")
                .body(`${CONFIG.ui.colors.warning}You haven't added any favorite servers yet!\n\nAdd servers to favorites from the server details menu.`)
                .button1("OK");
            
            await msg.show(player);
            return this.showMainMenu(player);
        }
        
        player.sendMessage(`${CONFIG.ui.colors.info}Loading favorite servers...`);
        
        const serverPromises = favorites.map(f => 
            this.api.getServerStatus(f.address, f.type).then(server => {
                server.customName = f.name;
                return server;
            })
        );
        
        const servers = await Promise.all(serverPromises);
        
        await this.showServerList(player, servers, "Favorite Servers", () => this.showMainMenu(player));
    }
    
    async showRecentServers(player) {
        const recent = await this.storage.getRecent(player.id);
        
        if (recent.length === 0) {
            const msg = new MessageFormData()
                .title("No Recent Servers")
                .body(`${CONFIG.ui.colors.info}You haven't viewed any servers yet.\n\nBrowse servers to see them here!`)
                .button1("OK");
            
            await msg.show(player);
            return this.showMainMenu(player);
        }
        
        player.sendMessage(`${CONFIG.ui.colors.info}Loading recent servers...`);
        
        const serverPromises = recent.map(r => 
            this.api.getServerStatus(r.address, r.type).then(server => {
                server.customName = r.name;
                return server;
            })
        );
        
        const servers = await Promise.all(serverPromises);
        
        await this.showServerList(player, servers, "Recent Servers", () => this.showMainMenu(player));
    }
    
    async showServerList(player, servers, title, onBack) {
        const form = new ActionFormData()
            .title(title)
            .body(`${CONFIG.ui.colors.info}Select a server to view details:`);
        
        // Add server buttons
        for (const server of servers) {
            const statusIcon = server.isOnline ? "§a●" : "§c●";
            const typeIcon = server.type === "java" ? "☕" : "📱";
            
            form.button(
                `${statusIcon} ${typeIcon} ${CONFIG.ui.colors.primary}${server.displayName}\n` +
                `${CONFIG.ui.colors.secondary}${server.playerCount} players ${CONFIG.ui.colors.info}| ${server.statusText}`,
                server.isOnline ? CONFIG.ui.icons.online : CONFIG.ui.icons.offline
            );
        }
        
        form.button(`${CONFIG.ui.colors.secondary}↻ Refresh`);
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return onBack();
            
            if (response.selection < servers.length) {
                await this.showServerDetails(player, servers[response.selection], () => 
                    this.showServerList(player, servers, title, onBack)
                );
            } else if (response.selection === servers.length) {
                // Refresh
                player.sendMessage(`${CONFIG.ui.colors.info}Refreshing server list...`);
                
                // Clear cache for these servers
                servers.forEach(s => {
                    s.lastUpdate = 0;
                });
                
                // Re-fetch all
                const refreshPromises = servers.map(s => this.api.getServerStatus(s.address, s.type));
                const refreshed = await Promise.all(refreshPromises);
                
                await this.showServerList(player, refreshed, title, onBack);
            } else {
                // Back
                await onBack();
            }
            
        } catch (error) {
            console.error("[ServerList] Server list error:", error);
            await onBack();
        }
    }
    
    async showServerDetails(player, server, onBack) {
        // Add to recent
        await this.storage.addRecent(player.id, server);
        
        // Check if favorite
        const isFavorite = await this.storage.isFavorite(player.id, server.address, server.type);
        
        const details = [
            `${CONFIG.ui.colors.primary}═══════════════════════════════`,
            `${CONFIG.ui.colors.primary}Server: ${CONFIG.ui.colors.secondary}${server.displayName}`,
            `${CONFIG.ui.colors.primary}Address: ${CONFIG.ui.colors.secondary}${server.address}`,
            `${CONFIG.ui.colors.primary}Type: ${CONFIG.ui.colors.secondary}${server.type === "java" ? "Java Edition" : "Bedrock Edition"}`,
            `${CONFIG.ui.colors.primary}Status: ${server.statusColor}${server.statusText}`,
            ""
        ];
        
        if (server.isOnline) {
            details.push(
                `${CONFIG.ui.colors.primary}Players: ${CONFIG.ui.colors.secondary}${server.playerCount}`,
                `${CONFIG.ui.colors.primary}Version: ${CONFIG.ui.colors.secondary}${server.versionInfo}`
            );
            
            if (CONFIG.features.showMOTD && server.status.motd) {
                details.push(
                    "",
                    `${CONFIG.ui.colors.primary}MOTD:`,
                    `${CONFIG.ui.colors.info}${server.status.motd.clean || "No description"}`
                );
            }
            
            if (server.status.players?.list && CONFIG.features.showPlayerList) {
                details.push(
                    "",
                    `${CONFIG.ui.colors.primary}Online Players:`,
                    ...server.status.players.list.slice(0, 10).map(p => 
                        `${CONFIG.ui.colors.info}• ${p.name_clean || p.name}`
                    )
                );
                if (server.status.players.list.length > 10) {
                    details.push(`${CONFIG.ui.colors.info}... and ${server.status.players.list.length - 10} more`);
                }
            }
        } else {
            details.push(`${CONFIG.ui.colors.warning}This server is currently offline or unreachable.`);
            if (server.error) {
                details.push(`${CONFIG.ui.colors.error}Error: ${server.error}`);
            }
        }
        
        details.push(`${CONFIG.ui.colors.primary}═══════════════════════════════`);
        
        const form = new ActionFormData()
            .title("Server Details")
            .body(details.join('\n'));
        
        // Buttons
        if (transferPlayer && CONFIG.features.transferSupport && server.isOnline && server.type === "bedrock") {
            form.button(`${CONFIG.ui.colors.success}🚀 Join Server`);
        }
        
        form.button(`${CONFIG.ui.colors.success}📋 Copy Address`);
        form.button(
            isFavorite 
                ? `${CONFIG.ui.colors.warning}★ Remove from Favorites`
                : `${CONFIG.ui.colors.primary}☆ Add to Favorites`,
            isFavorite ? CONFIG.ui.icons.favorite : CONFIG.ui.icons.unfavorite
        );
        form.button(`${CONFIG.ui.colors.secondary}↻ Refresh Info`);
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return onBack();
            
            let buttonIndex = 0;
            const joinButton = (transferPlayer && CONFIG.features.transferSupport && server.isOnline && server.type === "bedrock") ? buttonIndex++ : -1;
            const copyButton = buttonIndex++;
            const favoriteButton = buttonIndex++;
            const refreshButton = buttonIndex++;
            const backButton = buttonIndex++;
            
            if (joinButton !== -1 && response.selection === joinButton) {
                // Join server
                await this.joinServer(player, server);
            } else if (response.selection === copyButton - (joinButton === -1 ? 1 : 0)) {
                // Copy address
                player.sendMessage(`${CONFIG.ui.colors.success}════════════════════════`);
                player.sendMessage(`${CONFIG.ui.colors.primary}Server Address:`);
                player.sendMessage(`${CONFIG.ui.colors.secondary}${server.address}`);
                player.sendMessage(`${CONFIG.ui.colors.success}════════════════════════`);
                player.sendMessage(`${CONFIG.ui.colors.info}Add this to your server list!`);
            } else if (response.selection === favoriteButton - (joinButton === -1 ? 1 : 0)) {
                // Toggle favorite
                if (isFavorite) {
                    await this.storage.removeFavorite(player.id, server.address, server.type);
                    player.sendMessage(`${CONFIG.ui.colors.warning}Removed from favorites`);
                } else {
                    await this.storage.addFavorite(player.id, server);
                    player.sendMessage(`${CONFIG.ui.colors.success}Added to favorites!`);
                }
                // Refresh view
                await this.showServerDetails(player, server, onBack);
            } else if (response.selection === refreshButton - (joinButton === -1 ? 1 : 0)) {
                // Refresh
                player.sendMessage(`${CONFIG.ui.colors.info}Refreshing server info...`);
                server.lastUpdate = 0; // Force refresh
                const refreshed = await this.api.getServerStatus(server.address, server.type);
                refreshed.customName = server.customName;
                await this.showServerDetails(player, refreshed, onBack);
            } else {
                // Back
                await onBack();
            }
            
        } catch (error) {
            console.error("[ServerList] Server details error:", error);
            await onBack();
        }
    }
    
    async joinServer(player, server) {
        try {
            // Parse address and port
            let host = server.address;
            let port = server.type === "bedrock" ? 19132 : 25565;
            
            if (server.address.includes(':')) {
                const parts = server.address.split(':');
                host = parts[0];
                port = parseInt(parts[1]) || port;
            }
            
            player.sendMessage(`${CONFIG.ui.colors.info}Connecting to ${server.displayName}...`);
            player.sendMessage(`${CONFIG.ui.colors.secondary}Address: ${host}:${port}`);
            
            // Attempt transfer
            transferPlayer(player, { hostname: host, port: port });
            
            // Log to Discord if available
            if (bridgeAvailable && bridge?.bridgeDirect) {
                try {
                    bridge.bridgeDirect.sendEmbed({
                        title: "🔀 Server Transfer",
                        description: `**${player.name}** is joining **${server.displayName}**\n\`${server.address}\``,
                        color: 0x3498db,
                        fields: [
                            { name: "Players", value: server.playerCount, inline: true },
                            { name: "Version", value: server.versionInfo, inline: true },
                            { name: "Type", value: server.type.toUpperCase(), inline: true }
                        ],
                        timestamp: new Date().toISOString(),
                        footer: { text: "ServerList Transfer" },
                        author: { name: player.name, icon_url: `https://mc-heads.net/avatar/${player.name}` }
                    }, "ServerTransfer", `https://mc-heads.net/avatar/${player.name}`);
                } catch (e) {
                    console.warn("[ServerList] Discord log failed:", e);
                }
            }
            
        } catch (error) {
            console.error("[ServerList] Transfer error:", error);
            
            // Show manual connection info
            player.sendMessage(`${CONFIG.ui.colors.error}Automatic connection failed.`);
            player.sendMessage(`${CONFIG.ui.colors.warning}════════════════════════`);
            player.sendMessage(`${CONFIG.ui.colors.primary}Connect manually:`);
            player.sendMessage(`${CONFIG.ui.colors.secondary}${server.address}`);
            player.sendMessage(`${CONFIG.ui.colors.warning}════════════════════════`);
        }
    }
    
    async showAddCustomServer(player) {
        const form = new ModalFormData()
            .title("Add Custom Server")
            .textField("Server Name", "My Server", "")
            .textField("Server Address", "play.example.com or 192.168.1.1:19132", "")
            .dropdown("Server Type", ["Bedrock Edition", "Java Edition"], 0)
            .toggle("Add to Favorites", true);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player);
            
            const [name, address, typeIndex, addToFav] = response.formValues;
            
            // Validate input
            if (!name || !address) {
                player.sendMessage(`${CONFIG.ui.colors.error}Please fill in all fields!`);
                return this.showAddCustomServer(player);
            }
            
            // Validate address format
            const addressRegex = /^([a-zA-Z0-9.-]+)(:[0-9]+)?$/;
            if (!addressRegex.test(address)) {
                player.sendMessage(`${CONFIG.ui.colors.error}Invalid server address format!`);
                return this.showAddCustomServer(player);
            }
            
            const serverType = typeIndex === 0 ? "bedrock" : "java";
            
            // Check server status
            player.sendMessage(`${CONFIG.ui.colors.info}Checking server status...`);
            
            const server = await this.api.getServerStatus(address, serverType);
            server.customName = name;
            
            // Save custom server
            await this.storage.addCustomServer(player.id, {
                address: address,
                type: serverType,
                name: name
            });
            
            // Add to favorites if requested
            if (addToFav) {
                await this.storage.addFavorite(player.id, server);
            }
            
            player.sendMessage(`${CONFIG.ui.colors.success}Server added successfully!`);
            
            // Show server details
            await this.showServerDetails(player, server, () => this.showMainMenu(player));
            
        } catch (error) {
            console.error("[ServerList] Add custom server error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Failed to add server: ${error.message}`);
            await this.showMainMenu(player);
        }
    }
    
    async showSettings(player) {
        const form = new ActionFormData()
            .title("Server List Settings")
            .body(`${CONFIG.ui.colors.info}Configure your server list preferences:`);
        
        form.button(`${CONFIG.ui.colors.primary}🗑️ Clear Recent Servers`);
        form.button(`${CONFIG.ui.colors.primary}📊 View Statistics`);
        form.button(`${CONFIG.ui.colors.primary}🔍 Search Servers`);
        form.button(`${CONFIG.ui.colors.primary}📝 Manage Custom Servers`);
        form.button(`${CONFIG.ui.colors.primary}ℹ️ Help & Info`);
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player);
            
            switch (response.selection) {
                case 0: // Clear Recent
                    await this.clearRecentServers(player);
                    break;
                case 1: // Statistics
                    await this.showStatistics(player);
                    break;
                case 2: // Search
                    await this.showSearchMenu(player);
                    break;
                case 3: // Manage Custom
                    await this.showManageCustomServers(player);
                    break;
                case 4: // Help
                    await this.showHelp(player);
                    break;
                case 5: // Back
                    await this.showMainMenu(player);
                    break;
            }
        } catch (error) {
            console.error("[ServerList] Settings error:", error);
            await this.showMainMenu(player);
        }
    }
    
    async clearRecentServers(player) {
        const msg = new MessageFormData()
            .title("Clear Recent Servers")
            .body(`${CONFIG.ui.colors.warning}Are you sure you want to clear your recent servers list?\n\nThis action cannot be undone.`)
            .button1("Cancel")
            .button2("Clear");
        
        const response = await msg.show(player);
        if (response.selection === 1) {
            // Clear recent servers
            if (bridgeAvailable && database) {
                try {
                    await database.query(
                        'DELETE FROM serverlist_recent WHERE playerId = ?',
                        [player.id]
                    );
                } catch (error) {
                    console.warn("[ServerList] Error clearing recent:", error);
                }
            } else {
                this.storage.recent.delete(player.id);
            }
            
            player.sendMessage(`${CONFIG.ui.colors.success}Recent servers cleared!`);
        }
        
        await this.showSettings(player);
    }
    
    async showStatistics(player) {
        const favorites = await this.storage.getFavorites(player.id);
        const recent = await this.storage.getRecent(player.id);
        const custom = await this.storage.getCustomServers(player.id);
        
        const stats = [
            `${CONFIG.ui.colors.primary}=== Your Server Statistics ===`,
            "",
            `${CONFIG.ui.colors.secondary}Favorite Servers: ${CONFIG.ui.colors.info}${favorites.length}`,
            `${CONFIG.ui.colors.secondary}Recent Servers: ${CONFIG.ui.colors.info}${recent.length}`,
            `${CONFIG.ui.colors.secondary}Custom Servers: ${CONFIG.ui.colors.info}${custom.length}`,
            "",
            `${CONFIG.ui.colors.secondary}Total Unique Servers: ${CONFIG.ui.colors.info}${new Set([
                ...favorites.map(f => `${f.address}:${f.type}`),
                ...recent.map(r => `${r.address}:${r.type}`),
                ...custom.map(c => `${c.address}:${c.type}`)
            ]).size}`,
            "",
            `${CONFIG.ui.colors.primary}=== Global Statistics ===`,
            `${CONFIG.ui.colors.secondary}Featured Servers: ${CONFIG.ui.colors.info}${CONFIG.servers.featured.length}`,
            `${CONFIG.ui.colors.secondary}Cache Size: ${CONFIG.ui.colors.info}${this.storage.cache.size} servers`,
            `${CONFIG.ui.colors.secondary}Active Players: ${CONFIG.ui.colors.info}${world.getAllPlayers().length}`,
            "",
            `${CONFIG.ui.colors.info}Data provided by mcstatus.io`
        ];
        
        const form = new MessageFormData()
            .title("Server List Statistics")
            .body(stats.join('\n'))
            .button1("Back");
        
        await form.show(player);
        await this.showSettings(player);
    }
    
    async showSearchMenu(player) {
        const form = new ModalFormData()
            .title("Search Servers")
            .textField("Server Address or Name", "Enter server address...", "")
            .dropdown("Server Type", ["Bedrock Edition", "Java Edition", "Both"], 2);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showSettings(player);
            
            const [query, typeIndex] = response.formValues;
            
            if (!query || query.trim() === "") {
                player.sendMessage(`${CONFIG.ui.colors.warning}Please enter a search query`);
                return this.showSearchMenu(player);
            }
            
            player.sendMessage(`${CONFIG.ui.colors.info}Searching...`);
            
            const types = typeIndex === 2 ? ["bedrock", "java"] : [typeIndex === 0 ? "bedrock" : "java"];
            const results = [];
            
            for (const type of types) {
                try {
                    const server = await this.api.getServerStatus(query, type);
                    results.push(server);
                } catch (error) {
                    console.warn(`[ServerList] Search failed for ${query} (${type}):`, error);
                }
            }
            
            if (results.length === 0) {
                player.sendMessage(`${CONFIG.ui.colors.error}No servers found for "${query}"`);
                return this.showSettings(player);
            }
            
            await this.showServerList(player, results, "Search Results", () => this.showSettings(player));
            
        } catch (error) {
            console.error("[ServerList] Search error:", error);
            await this.showSettings(player);
        }
    }
    
    async showManageCustomServers(player) {
        const custom = await this.storage.getCustomServers(player.id);
        
        if (custom.length === 0) {
            const msg = new MessageFormData()
                .title("No Custom Servers")
                .body(`${CONFIG.ui.colors.info}You haven't added any custom servers yet.\n\nUse "Add Custom Server" from the main menu!`)
                .button1("OK");
            
            await msg.show(player);
            return this.showSettings(player);
        }
        
        const form = new ActionFormData()
            .title("Manage Custom Servers")
            .body(`${CONFIG.ui.colors.info}Select a custom server to remove:`);
        
        for (const server of custom) {
            form.button(
                `${CONFIG.ui.colors.primary}${server.name}\n${CONFIG.ui.colors.secondary}${server.address}`,
                server.type === "java" ? CONFIG.ui.icons.java : CONFIG.ui.icons.bedrock
            );
        }
        
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled || response.selection === custom.length) {
                return this.showSettings(player);
            }
            
            const selected = custom[response.selection];
            
            // Confirm deletion
            const confirm = new MessageFormData()
                .title("Remove Custom Server")
                .body(`${CONFIG.ui.colors.warning}Are you sure you want to remove:\n\n${CONFIG.ui.colors.primary}${selected.name}\n${CONFIG.ui.colors.secondary}${selected.address}\n\n${CONFIG.ui.colors.info}This will also remove it from favorites.`)
                .button1("Cancel")
                .button2("Remove");
            
            const confirmResponse = await confirm.show(player);
            if (confirmResponse.selection === 1) {
                // Remove from database
                if (bridgeAvailable && database) {
                    try {
                        await database.query(
                            'DELETE FROM serverlist_custom WHERE playerId = ? AND address = ? AND type = ?',
                            [player.id, selected.address, selected.type]
                        );
                    } catch (error) {
                        console.warn("[ServerList] Error removing custom server:", error);
                    }
                }
                
                // Also remove from favorites
                await this.storage.removeFavorite(player.id, selected.address, selected.type);
                
                player.sendMessage(`${CONFIG.ui.colors.success}Server removed successfully!`);
            }
            
            await this.showManageCustomServers(player);
            
        } catch (error) {
            console.error("[ServerList] Manage custom error:", error);
            await this.showSettings(player);
        }
    }
    
    async showHelp(player) {
        const helpText = [
            `${CONFIG.ui.colors.primary}=== Server List Help ===`,
            "",
            `${CONFIG.ui.colors.secondary}Features:`,
            `${CONFIG.ui.colors.info}• Browse featured servers from popular networks`,
            `${CONFIG.ui.colors.info}• Add your own custom servers`,
            `${CONFIG.ui.colors.info}• Save favorite servers for quick access`,
            `${CONFIG.ui.colors.info}• View recently accessed servers`,
            `${CONFIG.ui.colors.info}• Real-time server status and player counts`,
            `${CONFIG.ui.colors.info}• Support for both Java and Bedrock servers`,
            transferPlayer ? `${CONFIG.ui.colors.info}• Direct server joining (Bedrock only)` : "",
            "",
            `${CONFIG.ui.colors.secondary}How to use:`,
            `${CONFIG.ui.colors.info}1. Use a compass or type !servers to open`,
            `${CONFIG.ui.colors.info}2. Browse categories or add custom servers`,
            `${CONFIG.ui.colors.info}3. Click on a server to view details`,
            `${CONFIG.ui.colors.info}4. Add servers to favorites for easy access`,
            "",
            `${CONFIG.ui.colors.secondary}Status Indicators:`,
            `${CONFIG.ui.colors.success}● Green = Server Online`,
            `${CONFIG.ui.colors.error}● Red = Server Offline`,
            `${CONFIG.ui.colors.info}☕ = Java Edition`,
            `${CONFIG.ui.colors.info}📱 = Bedrock Edition`,
            "",
            `${CONFIG.ui.colors.primary}Data provided by mcstatus.io`,
            `${CONFIG.ui.colors.info}Server data updates every minute`
        ].filter(line => line !== "");
        
        const form = new MessageFormData()
            .title("Server List Help")
            .body(helpText.join('\n'))
            .button1("Back");
        
        await form.show(player);
        await this.showSettings(player);
    }
}

// ===== COMMAND HANDLER =====
class CommandHandler {
    constructor(ui) {
        this.ui = ui;
        this.registerCommands();
    }
    
    registerCommands() {
        const commands = ["servers", "serverlist", "sl"];
        const adminCommands = ["slAdmin", "serverlistAdmin"];
        
        if (bridgeAvailable && bridge?.bedrockCommands) {
            // BedrockBridge command registration
            commands.forEach(cmd => {
                bridge.bedrockCommands.registerCommand(
                    cmd,
                    this.handleCommand.bind(this),
                    "Open Server List menu"
                );
            });
            
            adminCommands.forEach(cmd => {
                bridge.bedrockCommands.registerAdminCommand(
                    cmd,
                    this.handleAdminCommand.bind(this),
                    "Server List admin commands"
                );
            });
            
            console.info("[ServerList] Commands registered via BedrockBridge");
        } else {
            // Standalone mode - listen for chat
            world.afterEvents.chatSend.subscribe(event => {
                const message = event.message;
                const player = event.sender;
                
                if (message.startsWith('!')) {
                    const parts = message.substring(1).split(' ');
                    const cmd = parts[0].toLowerCase();
                    
                    if (commands.includes(cmd)) {
                        event.cancel = true;
                        this.handleCommand(player, ...parts.slice(1));
                    } else if (adminCommands.includes(cmd) && player.hasTag('admin')) {
                        event.cancel = true;
                        this.handleAdminCommand(player, ...parts.slice(1));
                    }
                }
            });
            
            console.info("[ServerList] Commands registered in standalone mode");
        }
    }
    
    async handleCommand(player, subcommand, ...args) {
        switch (subcommand?.toLowerCase()) {
            case 'search':
            case 's':
                const query = args.join(' ');
                if (query) {
                    player.sendMessage(`${CONFIG.ui.colors.info}Searching for "${query}"...`);
                    try {
                        const server = await this.ui.api.getServerStatus(query, "bedrock");
                        await this.ui.showServerDetails(player, server, () => this.ui.showMainMenu(player));
                    } catch (error) {
                        player.sendMessage(`${CONFIG.ui.colors.error}Server not found or error occurred`);
                    }
                } else {
                    await this.ui.showSearchMenu(player);
                }
                break;
                
            case 'add':
            case 'a':
                await this.ui.showAddCustomServer(player);
                break;
                
            case 'favorites':
            case 'fav':
            case 'f':
                await this.ui.showFavorites(player);
                break;
                
            case 'help':
            case 'h':
            case '?':
                await this.ui.showHelp(player);
                break;
                
            default:
                await this.ui.showMainMenu(player);
        }
    }
    
    async handleAdminCommand(player, subcommand, ...args) {
        switch (subcommand?.toLowerCase()) {
            case 'cache':
                if (args[0] === 'clear') {
                    this.ui.storage.cache.clear();
                    player.sendMessage(`${CONFIG.ui.colors.success}Cache cleared!`);
                } else {
                    player.sendMessage(`${CONFIG.ui.colors.info}Cache size: ${this.ui.storage.cache.size} servers`);
                }
                break;
                
            case 'stats':
                await this.showAdminStats(player);
                break;
                
            case 'test':
                await this.testAPI(player, args[0]);
                break;
                
            default:
                player.sendMessage(`${CONFIG.ui.colors.primary}Admin Commands:`);
                player.sendMessage(`${CONFIG.ui.colors.info}• cache [clear] - Manage cache`);
                player.sendMessage(`${CONFIG.ui.colors.info}• stats - Show system statistics`);
                player.sendMessage(`${CONFIG.ui.colors.info}• test <address> - Test server connection`);
        }
    }
    
    async showAdminStats(player) {
        const stats = {
            cacheSize: this.ui.storage.cache.size,
            totalFavorites: 0,
            totalRecent: 0,
            totalCustom: 0,
            activePlayers: this.ui.playerStates.size
        };
        
        // Count totals
        for (const [_, favs] of this.ui.storage.favorites) {
            stats.totalFavorites += favs.size || favs.length;
        }
        for (const [_, recent] of this.ui.storage.recent) {
            stats.totalRecent += recent.size || recent.length;
        }
        for (const [_, custom] of this.ui.storage.custom) {
            stats.totalCustom += custom.length;
        }
        
        player.sendMessage(`${CONFIG.ui.colors.primary}=== Server List System Stats ===`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Cache entries: ${stats.cacheSize}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Total favorites: ${stats.totalFavorites}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Total recent: ${stats.totalRecent}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Total custom: ${stats.totalCustom}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Active players: ${stats.activePlayers}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Mode: ${bridgeAvailable ? 'BedrockBridge' : 'Standalone'}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Transfer: ${transferPlayer ? 'Available' : 'Not available'}`);
    }
    
    async testAPI(player, address) {
        if (!address) {
            player.sendMessage(`${CONFIG.ui.colors.error}Usage: !slAdmin test <server address>`);
            return;
        }
        
        player.sendMessage(`${CONFIG.ui.colors.info}Testing connection to ${address}...`);
        
        try {
            const start = Date.now();
            const server = await this.ui.api.getServerStatus(address, "bedrock");
            const time = Date.now() - start;
            
            player.sendMessage(`${CONFIG.ui.colors.success}✓ Connection successful!`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Response time: ${time}ms`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Status: ${server.statusText}`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Players: ${server.playerCount}`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Version: ${server.versionInfo}`);
        } catch (error) {
            player.sendMessage(`${CONFIG.ui.colors.error}✗ Connection failed: ${error.message}`);
        }
    }
}

// ===== PLUGIN MANAGER =====
class ServerListPlugin {
    constructor() {
        this.storage = new StorageManager();
        this.api = new McStatusAPI(this.storage);
        this.ui = new UIManager(this.api, this.storage);
        this.commands = new CommandHandler(this.ui);
        
        this.init();
    }
    
    async init() {
        console.info("[ServerList] Initializing plugin...");
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Start background tasks
        this.startBackgroundTasks();
        
        // Preload featured servers
        this.preloadFeaturedServers();
        
        console.info("[ServerList] Plugin initialized successfully!");
        console.info("[ServerList] Use a compass or !servers to open the menu");
    }
    
    setupEventHandlers() {
        // Compass to open menu
        world.beforeEvents.itemUse.subscribe(event => {
            if (event.itemStack?.typeId === 'minecraft:compass') {
                const player = event.source;
                system.run(() => {
                    this.ui.showMainMenu(player);
                });
                event.cancel = true;
            }
        });
        
        // Player join message
        world.afterEvents.playerJoin.subscribe(event => {
            const player = event.player;
            system.runTimeout(() => {
                player.sendMessage(
                    `${CONFIG.ui.colors.primary}Welcome! Use ${CONFIG.ui.colors.secondary}!servers${CONFIG.ui.colors.primary} or a compass to browse servers!`
                );
            }, 40); // 2 seconds delay
        });
        
        // Custom events for BedrockBridge
        if (bridgeAvailable) {
            system.afterEvents.scriptEventReceive.subscribe(event => {
                if (event.id === 'serverlist:open' && event.sourceEntity) {
                    system.run(() => {
                        this.ui.showMainMenu(event.sourceEntity);
                    });
                }
            });
        }
    }
    
    startBackgroundTasks() {
        // Cache cleanup every 5 minutes
        system.runInterval(() => {
            this.cleanupCache();
        }, 6000); // 5 minutes = 6000 ticks
        
        // Auto-refresh featured servers every 2 minutes
        if (CONFIG.features.autoRefresh) {
            system.runInterval(() => {
                this.refreshFeaturedServers();
            }, 2400); // 2 minutes = 2400 ticks
        }
    }
    
    cleanupCache() {
        let cleaned = 0;
        const now = Date.now();
        
        for (const [key, server] of this.storage.cache) {
            if (now - server.lastUpdate > CONFIG.api.cacheDuration * 2) {
                this.storage.cache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.info(`[ServerList] Cleaned ${cleaned} old cache entries`);
        }
    }
    
    async preloadFeaturedServers() {
        console.info("[ServerList] Preloading featured servers...");
        
        const promises = CONFIG.servers.featured.map(s => 
            this.api.getServerStatus(s.address, s.type).catch(err => 
                console.warn(`[ServerList] Failed to preload ${s.name}: ${err.message}`)
            )
        );
        
        await Promise.allSettled(promises);
        console.info("[ServerList] Featured servers preloaded");
    }
    
    async refreshFeaturedServers() {
        // Only refresh if players are online
        if (world.getAllPlayers().length === 0) return;
        
        // Clear cache for featured servers
        CONFIG.servers.featured.forEach(s => {
            const key = `${s.type}:${s.address}`;
            const cached = this.storage.cache.get(key);
            if (cached) {
                cached.lastUpdate = 0;
            }
        });
        
        // Refresh in background
        this.preloadFeaturedServers();
    }
}

// ===== INITIALIZATION =====
const plugin = new ServerListPlugin();

// Export for debugging
globalThis.ServerList = {
    plugin,
    version: "2.0.0",
    
    debug: {
        clearCache: () => {
            plugin.storage.cache.clear();
            return "Cache cleared";
        },
        
        testServer: async (address, type = "bedrock") => {
            try {
                const server = await plugin.api.getServerStatus(address, type);
                return {
                    online: server.isOnline,
                    players: server.playerCount,
                    version: server.versionInfo
                };
            } catch (error) {
                return `Error: ${error.message}`;
            }
        },
        
        showStats: () => {
            return {
                cacheSize: plugin.storage.cache.size,
                favorites: plugin.storage.favorites.size,
                recent: plugin.storage.recent.size,
                custom: plugin.storage.custom.size,
                activePlayers: plugin.ui.playerStates.size,
                transferAvailable: transferPlayer !== null,
                bridgeAvailable: bridgeAvailable
            };
        }
    }
};

console.info("[ServerList] mcstatus.io Server Browser v2.0.0 loaded!");
console.info("[ServerList] Use a compass or !servers to get started");
export default true;
