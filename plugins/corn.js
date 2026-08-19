// cornbread-serverfinder.js
// BedrockBridge Plugin: Advanced Server Finder with Cornbread2100 API
// Version: 1.0.3 - Working version with transfer support

import { world, system } from "@minecraft/server";
import { HttpRequest, HttpHeader, HttpRequestMethod, http } from "@minecraft/server-net";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

// Global variables for optional modules
let transferPlayer = null;
let bridge = null;
let database = null;
let bridgeAvailable = false;

// Try to import optional modules with dynamic import
try {
    const adminModule = await import("@minecraft/server-admin");
    transferPlayer = adminModule.transferPlayer;
    console.info("[ServerFinder] Transfer functionality available");
} catch (e) {
    console.warn("[ServerFinder] Transfer functionality not available");
}

try {
    const module = await import("../addons");
    bridge = module.bridge;
    database = module.database;
    bridgeAvailable = true;
    console.info("[ServerFinder] BedrockBridge API loaded");
} catch (e) {
    console.warn("[ServerFinder] Running in standalone mode");
}

// ===== CONFIGURATION =====
const CONFIG = {
    api: {
        base: "https://api.cornbread2100.com",
        endpoints: {
            servers: "/bedrockServers",
            serverInfo: "/server",
            playerHistory: "/playerHistory"
        },
        timeout: 10,
        retries: 3,
        cacheTTL: 300000 // 5 minutes
    },
    
    ui: {
        title: "§b§lServer Finder",
        itemsPerPage: 10,
        colors: {
            primary: "§b",
            secondary: "§3", 
            success: "§a",
            warning: "§e",
            error: "§c",
            info: "§7"
        }
    },
    
    commands: {
        prefix: "!",
        main: "serverfinder",
        aliases: ["sf", "servers"],
        admin: "sfadmin"
    },
    
    features: {
        favorites: true,
        history: true,
        autoRefresh: true,
        caching: true,
        transferSupport: true
    },
    
    storage: {
        maxFavorites: 50,
        maxHistory: 100
    }
};

// ===== DATA MODELS =====
class ServerData {
    constructor(raw) {
        this.ip = this.intToIP(raw.ip);
        this.port = raw.port;
        this.version = raw.version;
        this.description = raw.description || "Minecraft Server";
        this.players = raw.players;
        this.gamemode = raw.gamemode;
        this.lastSeen = new Date(raw.lastSeen * 1000);
        this.discovered = new Date(raw.discovered * 1000);
        this.education = raw.education;
        this.geo = raw.geo;
        this.org = raw.org;
        this.raw = raw;
    }
    
    intToIP(int) {
        return [
            (int >>> 24) & 255,
            (int >>> 16) & 255,
            (int >>> 8) & 255,
            int & 255
        ].join('.');
    }
    
    getAddress() {
        return this.port === 19132 ? this.ip : `${this.ip}:${this.port}`;
    }
    
    getStatus() {
        const hoursSince = (Date.now() - this.lastSeen) / 3600000;
        if (hoursSince < 1) return { text: "Online", color: "§a" };
        if (hoursSince < 24) return { text: "Recently", color: "§e" };
        return { text: "Offline", color: "§c" };
    }
    
    getDisplayName() {
        // Remove formatting codes
        const cleanDesc = this.description.replace(/§[0-9a-fk-or]/gi, '');
        return cleanDesc.length > 30 ? cleanDesc.substring(0, 27) + "..." : cleanDesc;
    }
}

// ===== STORAGE MANAGER =====
class StorageManager {
    constructor() {
        this.cache = new Map();
        this.favorites = new Map();
        this.history = new Map();
        this.init();
    }
    
    async init() {
        if (bridgeAvailable && database) {
            try {
                await database.makeTable('sf_favorites', {
                    playerId: 'string',
                    serverId: 'string',
                    timestamp: 'int'
                });
                await database.makeTable('sf_history', {
                    playerId: 'string',
                    serverId: 'string',
                    timestamp: 'int'
                });
                await database.makeTable('sf_cache', {
                    key: 'string',
                    data: 'string',
                    expires: 'int'
                });
            } catch (error) {
                console.warn("[ServerFinder] Database init error:", error);
            }
        }
    }
    
    async getFavorites(playerId) {
        if (!bridgeAvailable || !database) {
            return this.favorites.get(playerId) || [];
        }
        
        try {
            const rows = await database.query(
                'SELECT serverId FROM sf_favorites WHERE playerId = ? ORDER BY timestamp DESC LIMIT ?',
                [playerId, CONFIG.storage.maxFavorites]
            );
            return rows.map(r => r.serverId);
        } catch (error) {
            console.warn("[ServerFinder] Error getting favorites:", error);
            return this.favorites.get(playerId) || [];
        }
    }
    
    async addFavorite(playerId, serverId) {
        if (!bridgeAvailable || !database) {
            const favs = this.favorites.get(playerId) || [];
            if (!favs.includes(serverId)) {
                favs.unshift(serverId);
                if (favs.length > CONFIG.storage.maxFavorites) favs.pop();
                this.favorites.set(playerId, favs);
            }
            return;
        }
        
        try {
            await database.query(
                'INSERT OR REPLACE INTO sf_favorites (playerId, serverId, timestamp) VALUES (?, ?, ?)',
                [playerId, serverId, Date.now()]
            );
        } catch (error) {
            console.warn("[ServerFinder] Error adding favorite:", error);
            // Fallback to memory
            const favs = this.favorites.get(playerId) || [];
            if (!favs.includes(serverId)) {
                favs.unshift(serverId);
                this.favorites.set(playerId, favs);
            }
        }
    }
    
    async removeFavorite(playerId, serverId) {
        if (!bridgeAvailable || !database) {
            const favs = this.favorites.get(playerId) || [];
            this.favorites.set(playerId, favs.filter(f => f !== serverId));
            return;
        }
        
        try {
            await database.query(
                'DELETE FROM sf_favorites WHERE playerId = ? AND serverId = ?',
                [playerId, serverId]
            );
        } catch (error) {
            console.warn("[ServerFinder] Error removing favorite:", error);
            const favs = this.favorites.get(playerId) || [];
            this.favorites.set(playerId, favs.filter(f => f !== serverId));
        }
    }
    
    async getCache(key) {
        if (!CONFIG.features.caching) return null;
        
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
        return null;
    }
    
    async setCache(key, data, ttl = CONFIG.api.cacheTTL) {
        if (!CONFIG.features.caching) return;
        
        const expires = Date.now() + ttl;
        this.cache.set(key, { data, expires });
    }
}

// ===== API CLIENT =====
class CornbreadAPI {
    constructor(storage) {
        this.storage = storage;
        this.rateLimiter = new Map();
    }
    
    async request(endpoint, params = {}, retry = 0) {
        // Rate limiting
        const now = Date.now();
        const lastRequest = this.rateLimiter.get(endpoint) || 0;
        if (now - lastRequest < 1000) {
            await this.sleep(1000 - (now - lastRequest));
        }
        this.rateLimiter.set(endpoint, Date.now());
        
        // Build URL with manual query string
        const queryParts = [];
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        const queryString = queryParts.join('&');
        const url = `${CONFIG.api.base}${endpoint}${queryString ? '?' + queryString : ''}`;
        
        // Check cache
        const cacheKey = `api:${endpoint}:${queryString}`;
        const cached = await this.storage.getCache(cacheKey);
        if (cached) return cached;
        
        try {
            const request = new HttpRequest(url)
                .setMethod(HttpRequestMethod.Get)
                .setHeaders([
                    new HttpHeader('Accept', 'application/json'),
                    new HttpHeader('User-Agent', 'MinecraftBedrockPlugin/1.0')
                ])
                .setTimeout(CONFIG.api.timeout);
            
            const response = await http.request(request);
            
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = JSON.parse(response.body);
            await this.storage.setCache(cacheKey, data);
            return data;
            
        } catch (error) {
            if (retry < CONFIG.api.retries) {
                await this.sleep(1000 * (retry + 1));
                return this.request(endpoint, params, retry + 1);
            }
            throw error;
        }
    }
    
    async getServers(options = {}) {
        const params = {
            limit: options.limit || 20,
            skip: options.skip || 0,
            sort: options.sort || 'lastSeen',
            descending: 'true'
        };
        
        // Add filters
        if (options.version) params.version = options.version;
        if (options.minPlayers !== undefined) params.minPlayers = options.minPlayers;
        if (options.maxPlayers !== undefined) params.maxPlayers = options.maxPlayers;
        if (options.port) params.port = options.port;
        if (options.description) params.description = options.description;
        if (options.ip) params.ip = options.ip;
        
        const data = await this.request(CONFIG.api.endpoints.servers, params);
        return data.map(s => new ServerData(s));
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
            .body(`${CONFIG.ui.colors.info}Choose an option:`);
        
        form.button(`${CONFIG.ui.colors.primary}🔍 Quick Search`);
        form.button(`${CONFIG.ui.colors.primary}⭐ Favorites`);
        form.button(`${CONFIG.ui.colors.primary}🌍 Browse All`);
        form.button(`${CONFIG.ui.colors.primary}🎯 Search by Version`);
        form.button(`${CONFIG.ui.colors.primary}👥 Search by Players`);
        if (transferPlayer) {
            form.button(`${CONFIG.ui.colors.success}⚡ Quick Join`);
        }
        form.button(`${CONFIG.ui.colors.info}ℹ️ Help`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return;
            
            let buttonIndex = 0;
            if (response.selection === buttonIndex++) await this.showQuickSearch(player);
            else if (response.selection === buttonIndex++) await this.showFavorites(player);
            else if (response.selection === buttonIndex++) await this.browseServers(player);
            else if (response.selection === buttonIndex++) await this.showVersionSearch(player);
            else if (response.selection === buttonIndex++) await this.showPlayerSearch(player);
            else if (transferPlayer && response.selection === buttonIndex++) await this.showQuickJoin(player);
            else await this.showHelp(player);
        } catch (error) {
            console.error("[ServerFinder] Menu error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}An error occurred. Please try again.`);
        }
    }
    
    async showQuickSearch(player) {
        const form = new ModalFormData()
            .title(`${CONFIG.ui.title} - Quick Search`);
        
        form.textField("Search for servers", "Enter keywords (name, description, etc.)");
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player);
            
            const keywords = response.formValues[0];
            if (!keywords || keywords.trim() === "") {
                player.sendMessage(`${CONFIG.ui.colors.warning}Please enter search keywords`);
                return this.showQuickSearch(player);
            }
            
            // Use LIKE syntax for description search
            await this.showServerList(player, {
                description: `%${keywords.trim()}%`,
                limit: CONFIG.ui.itemsPerPage
            }, `Search: ${keywords}`);
            
        } catch (error) {
            console.error("[ServerFinder] Search error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Search failed. Please try again.`);
            await this.showMainMenu(player);
        }
    }
    
    async showQuickJoin(player) {
        player.sendMessage(`${CONFIG.ui.colors.info}Loading online servers...`);
        
        try {
            const servers = await this.api.getServers({
                limit: 20,
                minPlayers: 1
            });
            
            const onlineServers = servers.filter(s => s.getStatus().text === "Online");
            
            if (onlineServers.length === 0) {
                const msg = new MessageFormData()
                    .title("No Online Servers")
                    .body(`${CONFIG.ui.colors.warning}No servers with players are currently online.`)
                    .button1("OK");
                
                await msg.show(player);
                return this.showMainMenu(player);
            }
            
            const form = new ActionFormData()
                .title("Quick Join - Online Servers")
                .body(`${CONFIG.ui.colors.info}Select a server to join:`);
            
            for (const server of onlineServers.slice(0, 10)) {
                const playerCount = `${server.players.online}/${server.players.max}`;
                form.button(
                    `${CONFIG.ui.colors.success}${server.getDisplayName()}\n` +
                    `${CONFIG.ui.colors.secondary}${playerCount} players • ${server.version.name}`,
                    "textures/ui/realms_green_check"
                );
            }
            
            form.button(`${CONFIG.ui.colors.error}◀ Back`);
            
            const response = await form.show(player);
            if (response.canceled || response.selection === onlineServers.length) {
                return this.showMainMenu(player);
            }
            
            await this.joinServer(player, onlineServers[response.selection]);
            
        } catch (error) {
            console.error("[ServerFinder] Quick join error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Failed to load servers`);
            await this.showMainMenu(player);
        }
    }
    
    async showVersionSearch(player) {
        const versions = [
            "1.21.93",
            "1.21.92", 
            "1.21.91",
            "1.21.90",
            "1.21.80",
            "1.21.70",
            "1.21.60",
            "1.21.50",
            "Other Version"
        ];
        
        const form = new ActionFormData()
            .title(`${CONFIG.ui.title} - Search by Version`)
            .body(`${CONFIG.ui.colors.info}Select a Minecraft version:`);
        
        versions.forEach(v => form.button(`${CONFIG.ui.colors.primary}${v}`));
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled || response.selection === versions.length) {
                return this.showMainMenu(player);
            }
            
            if (response.selection === versions.length - 1) {
                // Other version - show text input
                await this.showCustomVersionSearch(player);
            } else {
                const version = versions[response.selection];
                await this.showServerList(player, {
                    version: version,
                    limit: CONFIG.ui.itemsPerPage
                }, `Version: ${version}`);
            }
        } catch (error) {
            console.error("[ServerFinder] Version search error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Error searching by version`);
            await this.showMainMenu(player);
        }
    }
    
    async showCustomVersionSearch(player) {
        const form = new ModalFormData()
            .title(`${CONFIG.ui.title} - Custom Version`);
        
        form.textField("Enter version", "e.g., 1.21.44");
        
        try {
            const response = await form.show(player);
            if (response.canceled) return this.showVersionSearch(player);
            
            const version = response.formValues[0];
            if (!version || version.trim() === "") {
                player.sendMessage(`${CONFIG.ui.colors.warning}Please enter a version`);
                return this.showCustomVersionSearch(player);
            }
            
            await this.showServerList(player, {
                version: version.trim(),
                limit: CONFIG.ui.itemsPerPage
            }, `Version: ${version}`);
            
        } catch (error) {
            console.error("[ServerFinder] Custom version error:", error);
            await this.showVersionSearch(player);
        }
    }
    
    async showPlayerSearch(player) {
        const form = new ActionFormData()
            .title(`${CONFIG.ui.title} - Search by Players`)
            .body(`${CONFIG.ui.colors.info}Select player count range:`);
        
        form.button(`${CONFIG.ui.colors.primary}0-10 Players`);
        form.button(`${CONFIG.ui.colors.primary}10-50 Players`);
        form.button(`${CONFIG.ui.colors.primary}50-100 Players`);
        form.button(`${CONFIG.ui.colors.primary}100+ Players`);
        form.button(`${CONFIG.ui.colors.primary}Not Full Servers`);
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled || response.selection === 5) {
                return this.showMainMenu(player);
            }
            
            const filters = { limit: CONFIG.ui.itemsPerPage };
            let title = "";
            
            switch (response.selection) {
                case 0:
                    filters.minPlayers = 0;
                    filters.maxPlayers = 10;
                    title = "0-10 Players";
                    break;
                case 1:
                    filters.minPlayers = 10;
                    filters.maxPlayers = 50;
                    title = "10-50 Players";
                    break;
                case 2:
                    filters.minPlayers = 50;
                    filters.maxPlayers = 100;
                    title = "50-100 Players";
                    break;
                case 3:
                    filters.minPlayers = 100;
                    title = "100+ Players";
                    break;
                case 4:
                    filters.notFull = true;
                    title = "Not Full";
                    break;
            }
            
            await this.showServerList(player, filters, `Players: ${title}`);
            
        } catch (error) {
            console.error("[ServerFinder] Player search error:", error);
            await this.showMainMenu(player);
        }
    }
    
    async browseServers(player, page = 0) {
        const filters = {
            limit: CONFIG.ui.itemsPerPage,
            skip: page * CONFIG.ui.itemsPerPage
        };
        
        await this.showServerList(player, filters, `All Servers - Page ${page + 1}`, page);
    }
    
    async showServerList(player, filters, title, page = 0) {
        try {
            player.sendMessage(`${CONFIG.ui.colors.info}Loading servers...`);
            
            const servers = await this.api.getServers(filters);
            
            if (servers.length === 0) {
                const msg = new MessageFormData()
                    .title(title)
                    .body(`${CONFIG.ui.colors.warning}No servers found.`)
                    .button1("Back")
                    .button2("Try Again");
                
                const response = await msg.show(player);
                if (response.selection === 0) {
                    return this.showMainMenu(player);
                } else {
                    return this.showServerList(player, filters, title, page);
                }
            }
            
            const form = new ActionFormData()
                .title(title)
                .body(`${CONFIG.ui.colors.info}Found ${servers.length} servers`);
            
            // Add server buttons
            for (const server of servers) {
                const status = server.getStatus();
                const playerCount = `${server.players.online}/${server.players.max}`;
                
                form.button(
                    `${status.color}● ${CONFIG.ui.colors.primary}${server.getDisplayName()}\n` +
                    `${CONFIG.ui.colors.secondary}${playerCount} ${CONFIG.ui.colors.info}| ${server.version.name}`
                );
            }
            
            // Navigation buttons
            if (page > 0) {
                form.button(`${CONFIG.ui.colors.primary}◀ Previous Page`);
            }
            
            if (servers.length === CONFIG.ui.itemsPerPage) {
                form.button(`${CONFIG.ui.colors.primary}Next Page ▶`);
            }
            
            form.button(`${CONFIG.ui.colors.secondary}↻ Refresh`);
            form.button(`${CONFIG.ui.colors.error}✖ Back to Menu`);
            
            const response = await form.show(player);
            if (response.canceled) return this.showMainMenu(player);
            
            const selection = response.selection;
            
            // Handle server selection
            if (selection < servers.length) {
                await this.showServerDetails(player, servers[selection], () => this.showServerList(player, filters, title, page));
                return;
            }
            
            // Handle navigation
            let navIndex = servers.length;
            
            if (page > 0 && selection === navIndex++) {
                // Previous page
                filters.skip = (page - 1) * CONFIG.ui.itemsPerPage;
                await this.showServerList(player, filters, title, page - 1);
            } else if (servers.length === CONFIG.ui.itemsPerPage && selection === navIndex++) {
                // Next page
                filters.skip = (page + 1) * CONFIG.ui.itemsPerPage;
                await this.showServerList(player, filters, title, page + 1);
            } else if (selection === navIndex++) {
                // Refresh
                await this.showServerList(player, filters, title, page);
            } else {
                // Back to menu
                await this.showMainMenu(player);
            }
            
        } catch (error) {
            console.error("[ServerFinder] Server list error:", error);
            player.sendMessage(`${CONFIG.ui.colors.error}Error loading servers: ${error.message}`);
            await this.showMainMenu(player);
        }
    }
    
    async showServerDetails(player, server, onBack) {
        const playerId = player.id;
        const serverId = `${server.raw.ip}:${server.port}`;
        const favorites = await this.storage.getFavorites(playerId);
        const isFavorite = favorites.includes(serverId);
        
        const status = server.getStatus();
        
        const details = [
            `${CONFIG.ui.colors.primary}━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `${CONFIG.ui.colors.primary}Address: ${CONFIG.ui.colors.secondary}${server.getAddress()}`,
            `${CONFIG.ui.colors.primary}Status: ${status.color}${status.text}`,
            `${CONFIG.ui.colors.primary}Version: ${CONFIG.ui.colors.secondary}${server.version.name}`,
            `${CONFIG.ui.colors.primary}Players: ${CONFIG.ui.colors.secondary}${server.players.online}/${server.players.max}`,
            `${CONFIG.ui.colors.primary}Gamemode: ${CONFIG.ui.colors.secondary}${server.gamemode.name}`,
            `${CONFIG.ui.colors.primary}Last Seen: ${CONFIG.ui.colors.secondary}${this.formatTime(server.lastSeen)}`,
            ""
        ];
        
        if (server.geo) {
            details.push(`${CONFIG.ui.colors.primary}Location: ${CONFIG.ui.colors.secondary}${server.geo.city || 'Unknown'}, ${server.geo.country}`);
        }
        
        if (server.org) {
            details.push(`${CONFIG.ui.colors.primary}Host: ${CONFIG.ui.colors.secondary}${server.org.substring(0, 50)}${server.org.length > 50 ? '...' : ''}`);
        }
        
        details.push(`${CONFIG.ui.colors.primary}━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        const form = new ActionFormData()
            .title(`${CONFIG.ui.title} - Server Info`)
            .body(details.join('\n'));
        
        // Add buttons
        if (transferPlayer && CONFIG.features.transferSupport) {
            form.button(`${CONFIG.ui.colors.success}🚀 Join Server`);
        }
        
        form.button(`${CONFIG.ui.colors.success}📋 Show Address`);
        form.button(
            isFavorite 
                ? `${CONFIG.ui.colors.warning}★ Remove from Favorites`
                : `${CONFIG.ui.colors.primary}☆ Add to Favorites`
        );
        form.button(`${CONFIG.ui.colors.secondary}↻ Refresh`);
        form.button(`${CONFIG.ui.colors.error}◀ Back`);
        
        try {
            const response = await form.show(player);
            if (response.canceled) return onBack();
            
            let buttonIndex = 0;
            const joinBtn = (transferPlayer && CONFIG.features.transferSupport) ? buttonIndex++ : -1;
            const addressBtn = buttonIndex++;
            const favoriteBtn = buttonIndex++;
            const refreshBtn = buttonIndex++;
            const backBtn = buttonIndex++;
            
            if (response.selection === backBtn - 1) {
                return onBack();
            }
            
            if (joinBtn !== -1 && response.selection === joinBtn) {
                // Join server
                await this.joinServer(player, server);
            } else if (response.selection === addressBtn - (joinBtn === -1 ? 1 : 0)) {
                // Show address
                player.sendMessage(`${CONFIG.ui.colors.success}═══════════════════════`);
                player.sendMessage(`${CONFIG.ui.colors.primary}Server Address:`);
                player.sendMessage(`${CONFIG.ui.colors.secondary}${server.getAddress()}`);
                player.sendMessage(`${CONFIG.ui.colors.success}═══════════════════════`);
                player.sendMessage(`${CONFIG.ui.colors.info}Add this to your server list!`);
            } else if (response.selection === favoriteBtn - (joinBtn === -1 ? 1 : 0)) {
                // Toggle favorite
                if (isFavorite) {
                    await this.storage.removeFavorite(playerId, serverId);
                    player.sendMessage(`${CONFIG.ui.colors.warning}Removed from favorites`);
                } else {
                    await this.storage.addFavorite(playerId, serverId);
                    player.sendMessage(`${CONFIG.ui.colors.success}Added to favorites!`);
                }
            } else if (response.selection === refreshBtn - (joinBtn === -1 ? 1 : 0)) {
                // Refresh
                player.sendMessage(`${CONFIG.ui.colors.info}Refreshing...`);
                try {
                    const refreshed = await this.api.getServers({
                        limit: 1,
                        ip: server.raw.ip,
                        port: server.port
                    });
                    if (refreshed.length > 0) {
                        await this.showServerDetails(player, refreshed[0], onBack);
                    } else {
                        player.sendMessage(`${CONFIG.ui.colors.error}Server not found`);
                        onBack();
                    }
                } catch (error) {
                    player.sendMessage(`${CONFIG.ui.colors.error}Refresh failed`);
                }
            }
            
            // Show menu again unless going back
            if (response.selection < backBtn - 1) {
                await this.showServerDetails(player, server, onBack);
            }
            
        } catch (error) {
            console.error("[ServerFinder] Server details error:", error);
            onBack();
        }
    }
    
    async joinServer(player, server) {
        try {
            player.sendMessage(`${CONFIG.ui.colors.info}Connecting to ${server.getDisplayName()}...`);
            player.sendMessage(`${CONFIG.ui.colors.secondary}Address: ${server.getAddress()}`);
            
            // Attempt transfer
            transferPlayer(player, {
                hostname: server.ip,
                port: server.port
            });
            
        } catch (error) {
            console.error("[ServerFinder] Transfer error:", error);
            
            // Show manual connection info
            player.sendMessage(`${CONFIG.ui.colors.error}Automatic connection failed.`);
            player.sendMessage(`${CONFIG.ui.colors.warning}═══════════════════════`);
            player.sendMessage(`${CONFIG.ui.colors.primary}Connect manually:`);
            player.sendMessage(`${CONFIG.ui.colors.secondary}${server.getAddress()}`);
            player.sendMessage(`${CONFIG.ui.colors.warning}═══════════════════════`);
        }
    }
    
    async showFavorites(player) {
        const playerId = player.id;
        const favoriteIds = await this.storage.getFavorites(playerId);
        
        if (favoriteIds.length === 0) {
            const msg = new MessageFormData()
                .title(`${CONFIG.ui.title} - Favorites`)
                .body(`${CONFIG.ui.colors.warning}You don't have any favorite servers yet.\n\nAdd servers to favorites from the server details menu!`)
                .button1("OK");
            
            await msg.show(player);
            return this.showMainMenu(player);
        }
        
        player.sendMessage(`${CONFIG.ui.colors.info}Loading favorite servers...`);
        
        // Fetch favorite servers
        const favoriteServers = [];
        for (const favId of favoriteIds) {
            const [ip, port] = favId.split(':');
            try {
                const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
                const servers = await this.api.getServers({
                    limit: 1,
                    ip: ipInt,
                    port: parseInt(port) || 19132
                });
                if (servers.length > 0) {
                    favoriteServers.push(servers[0]);
                }
            } catch (error) {
                console.warn(`Failed to fetch favorite ${favId}: ${error}`);
            }
        }
        
        if (favoriteServers.length === 0) {
            player.sendMessage(`${CONFIG.ui.colors.warning}Could not load any favorite servers`);
            return this.showMainMenu(player);
        }
        
        // Show favorite servers
        const form = new ActionFormData()
            .title("Favorite Servers")
            .body(`${CONFIG.ui.colors.info}Your favorite servers:`);
        
        for (const server of favoriteServers) {
            const status = server.getStatus();
            const playerCount = `${server.players.online}/${server.players.max}`;
            
            form.button(
                `${status.color}● ${CONFIG.ui.colors.primary}${server.getDisplayName()}\n` +
                `${CONFIG.ui.colors.secondary}${playerCount} ${CONFIG.ui.colors.info}| ${server.version.name}`
            );
        }
        
        form.button(`${CONFIG.ui.colors.error}◀ Back to Menu`);
        
        try {
            const response = await form.show(player);
            if (response.canceled || response.selection === favoriteServers.length) {
                return this.showMainMenu(player);
            }
            
            await this.showServerDetails(player, favoriteServers[response.selection], () => this.showFavorites(player));
            
        } catch (error) {
            console.error("[ServerFinder] Favorites error:", error);
            await this.showMainMenu(player);
        }
    }
    
    async showHelp(player) {
        const helpText = [
            `${CONFIG.ui.colors.primary}=== Server Finder Help ===`,
            "",
            `${CONFIG.ui.colors.secondary}Features:`,
            `${CONFIG.ui.colors.info}• Search servers by keywords`,
            `${CONFIG.ui.colors.info}• Filter by version or player count`,
            `${CONFIG.ui.colors.info}• Browse all online servers`,
            `${CONFIG.ui.colors.info}• Save your favorite servers`,
            `${CONFIG.ui.colors.info}• View detailed server information`,
            transferPlayer ? `${CONFIG.ui.colors.info}• Join servers directly` : "",
            "",
            `${CONFIG.ui.colors.secondary}Commands:`,
            `${CONFIG.ui.colors.info}• ${CONFIG.commands.prefix}${CONFIG.commands.main} - Open menu`,
            `${CONFIG.ui.colors.info}• ${CONFIG.commands.prefix}sf search <text> - Quick search`,
            `${CONFIG.ui.colors.info}• ${CONFIG.commands.prefix}sf favorites - View favorites`,
            "",
            `${CONFIG.ui.colors.secondary}Tips:`,
            `${CONFIG.ui.colors.info}• Use a compass to open the menu`,
            `${CONFIG.ui.colors.info}• Green = Online, Yellow = Recent, Red = Offline`,
            `${CONFIG.ui.colors.info}• Data updates every few minutes`,
            "",
            `${CONFIG.ui.colors.primary}Data by cornbread2100.com`
        ].filter(line => line !== "");
        
        const form = new MessageFormData()
            .title(`${CONFIG.ui.title} - Help`)
            .body(helpText.join('\n'))
            .button1("Back")
            .button2("Close");
        
        try {
            const response = await form.show(player);
            if (response.selection === 0) {
                await this.showMainMenu(player);
            }
        } catch (error) {
            console.error("[ServerFinder] Help error:", error);
        }
    }
    
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / 3600000);
        
        if (hours < 1) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} min ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else {
            const days = Math.floor(hours / 24);
            return `${days} days ago`;
        }
    }
}

// ===== COMMAND HANDLER =====
class CommandHandler {
    constructor(ui) {
        this.ui = ui;
        this.registerCommands();
    }
    
    registerCommands() {
        if (bridgeAvailable && bridge?.bedrockCommands) {
            // BedrockBridge command registration
            bridge.bedrockCommands.registerCommand(
                CONFIG.commands.main,
                this.handleCommand.bind(this),
                "Open Server Finder menu"
            );
            
            CONFIG.commands.aliases.forEach(alias => {
                bridge.bedrockCommands.registerCommand(
                    alias,
                    this.handleCommand.bind(this),
                    "Server Finder alias"
                );
            });
            
            bridge.bedrockCommands.registerAdminCommand(
                CONFIG.commands.admin,
                this.handleAdminCommand.bind(this),
                "Server Finder admin commands"
            );
        } else {
            // Standalone mode - listen for chat messages
            world.afterEvents.chatSend.subscribe(event => {
                const message = event.message;
                const player = event.sender;
                
                if (message.startsWith(CONFIG.commands.prefix)) {
                    const parts = message.substring(CONFIG.commands.prefix.length).split(' ');
                    const cmd = parts[0].toLowerCase();
                    
                    if (cmd === CONFIG.commands.main || CONFIG.commands.aliases.includes(cmd)) {
                        event.cancel = true;
                        this.handleCommand(player, ...parts.slice(1));
                    } else if (cmd === CONFIG.commands.admin && player.hasTag('admin')) {
                        event.cancel = true;
                        this.handleAdminCommand(player, ...parts.slice(1));
                    }
                }
            });
        }
    }
    
    async handleCommand(player, subcommand, ...args) {
        switch (subcommand?.toLowerCase()) {
            case 'search':
            case 's':
                if (args.length === 0) {
                    await this.ui.showQuickSearch(player);
                } else {
                    const keywords = args.join(' ');
                    await this.ui.showServerList(player, {
                        description: `%${keywords}%`,
                        limit: CONFIG.ui.itemsPerPage
                    }, `Search: ${keywords}`);
                }
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
            case 'stats':
                await this.showStats(player);
                break;
                
            case 'cache':
                if (args[0] === 'clear') {
                    this.ui.storage.cache.clear();
                    player.sendMessage(`${CONFIG.ui.colors.success}Cache cleared!`);
                } else {
                    player.sendMessage(`${CONFIG.ui.colors.info}Cache size: ${this.ui.storage.cache.size} entries`);
                }
                break;
                
            case 'test':
                await this.testAPI(player);
                break;
                
            default:
                player.sendMessage(`${CONFIG.ui.colors.primary}Admin Commands:`);
                player.sendMessage(`${CONFIG.ui.colors.info}• stats - Show statistics`);
                player.sendMessage(`${CONFIG.ui.colors.info}• cache [clear] - Manage cache`);
                player.sendMessage(`${CONFIG.ui.colors.info}• test - Test API connection`);
        }
    }
    
    async showStats(player) {
        const stats = {
            cacheSize: this.ui.storage.cache.size,
            favorites: 0,
            players: this.ui.playerStates.size
        };
        
        // Count total favorites
        for (const [_, favs] of this.ui.storage.favorites) {
            stats.favorites += favs.length;
        }
        
        player.sendMessage(`${CONFIG.ui.colors.primary}=== Server Finder Stats ===`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Cache entries: ${stats.cacheSize}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Players tracked: ${stats.players}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Total favorites: ${stats.favorites}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Mode: ${bridgeAvailable ? 'BedrockBridge' : 'Standalone'}`);
        player.sendMessage(`${CONFIG.ui.colors.info}• Transfer: ${transferPlayer ? 'Available' : 'Not available'}`);
    }
    
    async testAPI(player) {
        player.sendMessage(`${CONFIG.ui.colors.info}Testing API connection...`);
        
        try {
            const start = Date.now();
            const servers = await this.ui.api.getServers({ limit: 1 });
            const time = Date.now() - start;
            
            player.sendMessage(`${CONFIG.ui.colors.success}✓ API test successful!`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Response time: ${time}ms`);
            player.sendMessage(`${CONFIG.ui.colors.info}• Test server: ${servers[0]?.getDisplayName() || 'None'}`);
        } catch (error) {
            player.sendMessage(`${CONFIG.ui.colors.error}✗ API test failed: ${error.message}`);
        }
    }
}

// ===== PLUGIN MANAGER =====
class ServerFinderPlugin {
    constructor() {
        this.storage = new StorageManager();
        this.api = new CornbreadAPI(this.storage);
        this.ui = new UIManager(this.api, this.storage);
        this.commands = new CommandHandler(this.ui);
        
        this.init();
    }
    
    async init() {
        console.info("[ServerFinder] Initializing plugin...");
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Start background tasks
        if (CONFIG.features.autoRefresh) {
            this.startAutoRefresh();
        }
        
        // Cleanup old cache entries
        this.startCacheCleanup();
        
        console.info("[ServerFinder] Plugin initialized successfully!");
    }
    
    setupEventHandlers() {
        // Compass item to open menu
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
            if (!player) return;
            system.runTimeout(() => {
                if (!player?.isValid) return;
                player.sendMessage(
                    `${CONFIG.ui.colors.primary}Welcome! Use ${CONFIG.ui.colors.secondary}${CONFIG.commands.prefix}${CONFIG.commands.main}${CONFIG.ui.colors.primary} or a compass to find servers!`
                );
            }, 40); // 2 seconds delay
        });
        
        // BedrockBridge integration events
        if (bridgeAvailable && bridge?.events) {
            // Custom event for opening menu
            system.afterEvents.scriptEventReceive.subscribe(event => {
                if (event.id === 'serverfinder:open' && event.sourceEntity) {
                    system.run(() => {
                        this.ui.showMainMenu(event.sourceEntity);
                    });
                }
            });
        }
    }
    
    startAutoRefresh() {
        // Refresh favorites every 5 minutes
        system.runInterval(() => {
            this.refreshFavorites();
        }, 6000); // 5 minutes = 6000 ticks
    }
    
    startCacheCleanup() {
        // Clean expired cache entries every 10 minutes
        system.runInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            
            for (const [key, entry] of this.storage.cache) {
                if (entry.expires < now) {
                    this.storage.cache.delete(key);
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                console.info(`[ServerFinder] Cleaned ${cleaned} expired cache entries`);
            }
        }, 12000); // 10 minutes = 12000 ticks
    }
    
    async refreshFavorites() {
        // Pre-fetch favorite servers for all online players
        const players = world.getAllPlayers();
        const allFavorites = new Set();
        
        for (const player of players) {
            const favs = await this.storage.getFavorites(player.id);
            favs.forEach(f => allFavorites.add(f));
        }
        
        if (allFavorites.size === 0) return;
        
        console.info(`[ServerFinder] Refreshing ${allFavorites.size} favorite servers...`);
        
        // Batch refresh favorites
        for (const favId of allFavorites) {
            const [ip, port] = favId.split(':');
            try {
                const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
                await this.api.getServers({
                    limit: 1,
                    ip: ipInt,
                    port: parseInt(port) || 19132
                });
            } catch (error) {
                console.warn(`Failed to refresh favorite ${favId}: ${error}`);
            }
        }
    }
}

// ===== INITIALIZATION =====
const plugin = new ServerFinderPlugin();

// Export for debugging
globalThis.ServerFinder = {
    plugin,
    version: "1.0.3",
    
    // Debug commands
    debug: {
        clearCache: () => {
            plugin.storage.cache.clear();
            return "Cache cleared";
        },
        
        testAPI: async () => {
            try {
                const servers = await plugin.api.getServers({ limit: 5 });
                return `Found ${servers.length} servers`;
            } catch (error) {
                return `API Error: ${error.message}`;
            }
        },
        
        showStats: () => {
            return {
                cacheSize: plugin.storage.cache.size,
                favorites: plugin.storage.favorites.size,
                players: plugin.ui.playerStates.size,
                transferAvailable: transferPlayer !== null
            };
        }
    }
};

console.info("[ServerFinder] Cornbread2100 Server Finder v1.0.3 loaded!");
console.info("[ServerFinder] Use a compass or !serverfinder to get started");
export default true;
