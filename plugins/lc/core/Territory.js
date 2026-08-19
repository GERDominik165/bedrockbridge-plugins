/**
 * 🏰 LANDCLAIM MEGA v4 - Advanced Territory System
 * Represents a single claimed territory with complete data model and methods
 * @version 4.0.0 - PRODUCTION READY
 *
 * Enhanced Features:
 * - Advanced permission system with custom roles
 * - Territory taxation and income system
 * - Siege/warfare tracking
 * - Marketplace integration
 * - Statistics tracking
 * - Full audit logging
 */

export class Territory {
    constructor(id, ownerName, centerX, centerZ, dimension, radius = 5) {
        // === BASIC PROPERTIES ===
        this.id = id;
        this.ownerName = ownerName;
        this.centerX = centerX;
        this.centerZ = centerZ;
        this.dimension = dimension; // minecraft:overworld, minecraft:nether, minecraft:the_end
        this.radius = radius; // in chunks

        // === DATES ===
        this.createdDate = Date.now();
        this.lastModified = Date.now();
        this.lastActiveDate = Date.now();

        // === CUSTOMIZATION ===
        this.name = `Territory #${id.substring(0, 4)}`;
        this.description = `Owned by ${ownerName}`;
        this.icon = "🏰";
        this.color = "§6"; // Gold

        // === MEMBERS & ACCESS ===
        this.members = new Map(); // playerName -> {role, joinDate, permissions}
        this.allies = new Set();
        this.enemies = new Set();
        this.banned = new Set();
        this.whitelist = [];

        // === SECURITY SETTINGS ===
        this.pvp = false;
        this.griefProtection = true;
        this.explosionProtection = true;
        this.fireSpreadProtection = true;
        this.fluidFlowProtection = true;
        this.publicAccess = false;
        this.requirePassword = false;
        this.password = "";
        this.whiteListMode = false;
        this.allowVisitors = true;

        // === FEATURE TOGGLES ===
        this.features = {
            claimBlocks: true,
            chestShop: true,
            farmland: true,
            animals: true,
            pets: true,
            mobs: false,
            redstone: true,
            doors: true,
            buttons: true,
            levers: true,
            // v4 NEW FEATURES
            marketplace: true,      // Allow claim selling
            taxSystem: true,        // Enable taxation
            warfare: false,         // Allow siege mechanics
            auctionSystem: true,    // Enable claim auctions
            customRoles: true,      // Advanced permission roles
            eventTracking: true,    // Detailed event logging
            analytics: true         // Behavioral analytics
        };

        // === ECONOMY ===
        this.level = 1;
        this.balance = 0;
        this.totalCost = 0;
        this.costPerChunk = 50;
        this.upgrades = new Map(); // upgradeName -> level

        // === STATISTICS (v3) ===
        this.totalBreaks = 0;
        this.totalPlaces = 0;
        this.totalVisitors = 0;
        this.totalTime = 0;
        this.crepers = 0;
        this.tnt = 0;
        this.griefers = 0;

        // === STATISTICS (v4 ENHANCED) ===
        this.stats = {
            blocksBroken: 0,
            blocksPlaced: 0,
            playersVisited: 0,
            totalCombatEvents: 0,
            totalResourcesMined: 0,
            averageDailyActivity: 0,
            lastActivityTime: Date.now(),
            activeDaysCount: 1,
            highestMemberCount: 1,
            siegeEvents: 0,
            marketplaceListings: 0,
            auctionParticipations: 0
        };

        // === TAXATION & INCOME (v4) ===
        this.taxation = {
            enabled: false,
            dailyTaxAmount: 0,
            lastTaxPaid: Date.now(),
            taxDueDate: Date.now() + 86400000, // 24 hours
            isOverdue: false,
            totalTaxPaid: 0,
            taxHistory: []
        };

        // === MARKETPLACE & AUCTIONS (v4) ===
        this.marketplace = {
            isForSale: false,
            askingPrice: 0,
            listedDate: null,
            auctionActive: false,
            auctionStartPrice: 0,
            auctionHighestBid: 0,
            auctionHighestBidder: null,
            auctionEndDate: null,
            saleHistory: []
        };

        // === WARFARE & SIEGE (v4) ===
        this.warfare = {
            underSiege: false,
            besiegerName: null,
            siegeStartDate: null,
            siegeProgress: 0,
            lastAttackDate: null,
            defenseLvl: 1,
            warfareHistory: []
        };

        // === CUSTOM ROLES (v4) ===
        this.customRoles = new Map(); // roleName -> permissions object

        // === WARPS & HOMES ===
        this.warps = new Map(); // warpName -> {x, y, z, dimension}
        this.homes = new Map(); // playerName -> {x, y, z, dimension}
        this.trustPoints = new Map();

        // === LOGGING ===
        this.eventLogs = []; // max 1000 entries
        this.accessLogs = [];

        // === ROLE DEFINITIONS ===
        this.rolePermissions = {
            owner: {
                build: true, break: true, containers: true, buttons: true,
                redstone: true, doors: true, enter: true, view: true,
                invite: true, remove: true, edit: true, delete: true
            },
            member: {
                build: true, break: true, containers: true, buttons: true,
                redstone: true, doors: true, enter: true, view: true,
                invite: false, remove: false, edit: false, delete: false
            },
            builder: {
                build: true, break: true, containers: false, buttons: false,
                redstone: false, doors: true, enter: true, view: true,
                invite: false, remove: false, edit: false, delete: false
            },
            visitor: {
                build: false, break: false, containers: false, buttons: false,
                redstone: false, doors: true, enter: true, view: true,
                invite: false, remove: false, edit: false, delete: false
            }
        };
    }

    /**
     * Add a member to territory
     */
    addMember(playerName, role = "member") {
        this.members.set(playerName, {
            role: role,
            joinDate: Date.now(),
            permissions: this.rolePermissions[role] || {}
        });
        this.logEvent(`Member added: ${playerName} as ${role}`);
    }

    /**
     * Remove a member
     */
    removeMember(playerName) {
        this.members.delete(playerName);
        this.homes.delete(playerName);
        this.logEvent(`Member removed: ${playerName}`);
    }

    /**
     * Check if player has permission
     */
    hasPermission(playerName, permission) {
        if (playerName === this.ownerName) return true;

        if (this.members.has(playerName)) {
            const member = this.members.get(playerName);
            return member.permissions[permission] || false;
        }

        return false;
    }

    /**
     * Add warp point
     */
    addWarp(warpName, x, y, z, dimension) {
        this.warps.set(warpName, { x, y, z, dimension });
        this.logEvent(`Warp created: ${warpName}`);
    }

    /**
     * Remove warp
     */
    removeWarp(warpName) {
        this.warps.delete(warpName);
        this.logEvent(`Warp deleted: ${warpName}`);
    }

    /**
     * Set home for player
     */
    setHome(playerName, x, y, z, dimension) {
        this.homes.set(playerName, { x, y, z, dimension });
        this.logEvent(`Home set for ${playerName}`);
    }

    /**
     * Get home for player
     */
    getHome(playerName) {
        return this.homes.get(playerName) || null;
    }

    /**
     * Log an event
     */
    logEvent(message) {
        this.eventLogs.push({
            timestamp: Date.now(),
            message: message
        });

        // Keep max 1000 logs
        if (this.eventLogs.length > 1000) {
            this.eventLogs.shift();
        }

        this.lastModified = Date.now();
    }

    /**
     * Get territory size info
     */
    getSize() {
        const chunks = this.radius * this.radius * 4; // Approximate square area
        const width = this.radius * 2 * 16; // Chunk width
        const depth = this.radius * 2 * 16; // Chunk depth
        const height = 384; // -64 to 320

        return {
            chunks: chunks,
            width: width,
            depth: depth,
            height: height,
            volume: width * depth * height
        };
    }

    /**
     * Get corner coordinates
     */
    getCorners() {
        const chunkSize = this.radius * 16;
        return {
            northwest: { x: this.centerX - chunkSize, z: this.centerZ - chunkSize },
            northeast: { x: this.centerX + chunkSize, z: this.centerZ - chunkSize },
            southwest: { x: this.centerX - chunkSize, z: this.centerZ + chunkSize },
            southeast: { x: this.centerX + chunkSize, z: this.centerZ + chunkSize }
        };
    }

    /**
     * Get center coordinates
     */
    getCenter() {
        return { x: this.centerX, z: this.centerZ };
    }

    /**
     * Check if point is inside territory
     */
    isInside(x, z) {
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const dist = Math.sqrt(
            Math.pow(chunkX - Math.floor(this.centerX / 16), 2) +
            Math.pow(chunkZ - Math.floor(this.centerZ / 16), 2)
        );
        return dist <= this.radius;
    }

    /**
     * Expand territory
     */
    expand(newRadius) {
        if (newRadius > this.radius) {
            this.radius = newRadius;
            this.logEvent(`Territory expanded to radius ${newRadius}`);
            return true;
        }
        return false;
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            ownerName: this.ownerName,
            centerX: this.centerX,
            centerZ: this.centerZ,
            dimension: this.dimension,
            radius: this.radius,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            lastActiveDate: this.lastActiveDate,
            name: this.name,
            description: this.description,
            icon: this.icon,
            color: this.color,
            members: Array.from(this.members.entries()),
            allies: Array.from(this.allies),
            enemies: Array.from(this.enemies),
            banned: Array.from(this.banned),
            whitelist: this.whitelist,
            pvp: this.pvp,
            griefProtection: this.griefProtection,
            explosionProtection: this.explosionProtection,
            fireSpreadProtection: this.fireSpreadProtection,
            fluidFlowProtection: this.fluidFlowProtection,
            publicAccess: this.publicAccess,
            requirePassword: this.requirePassword,
            password: this.password,
            whiteListMode: this.whiteListMode,
            allowVisitors: this.allowVisitors,
            features: this.features,
            level: this.level,
            balance: this.balance,
            totalCost: this.totalCost,
            costPerChunk: this.costPerChunk,
            upgrades: Array.from(this.upgrades.entries()),
            totalBreaks: this.totalBreaks,
            totalPlaces: this.totalPlaces,
            totalVisitors: this.totalVisitors,
            totalTime: this.totalTime,
            crepers: this.crepers,
            tnt: this.tnt,
            griefers: this.griefers,
            warps: Array.from(this.warps.entries()),
            homes: Array.from(this.homes.entries()),
            trustPoints: Array.from(this.trustPoints.entries()),
            eventLogs: this.eventLogs,
            accessLogs: this.accessLogs
        };
    }

    /**
     * Deserialize from JSON
     */
    static fromJSON(data) {
        const territory = new Territory(
            data.id,
            data.ownerName,
            data.centerX,
            data.centerZ,
            data.dimension,
            data.radius
        );

        Object.assign(territory, {
            createdDate: data.createdDate,
            lastModified: data.lastModified,
            lastActiveDate: data.lastActiveDate,
            name: data.name,
            description: data.description,
            icon: data.icon,
            color: data.color,
            members: new Map(data.members || []),
            allies: new Set(data.allies || []),
            enemies: new Set(data.enemies || []),
            banned: new Set(data.banned || []),
            whitelist: data.whitelist || [],
            pvp: data.pvp,
            griefProtection: data.griefProtection,
            explosionProtection: data.explosionProtection,
            fireSpreadProtection: data.fireSpreadProtection,
            fluidFlowProtection: data.fluidFlowProtection,
            publicAccess: data.publicAccess,
            requirePassword: data.requirePassword,
            password: data.password,
            whiteListMode: data.whiteListMode,
            allowVisitors: data.allowVisitors,
            features: data.features || {},
            level: data.level,
            balance: data.balance,
            totalCost: data.totalCost,
            costPerChunk: data.costPerChunk,
            upgrades: new Map(data.upgrades || []),
            totalBreaks: data.totalBreaks,
            totalPlaces: data.totalPlaces,
            totalVisitors: data.totalVisitors,
            totalTime: data.totalTime,
            crepers: data.crepers,
            tnt: data.tnt,
            griefers: data.griefers,
            warps: new Map(data.warps || []),
            homes: new Map(data.homes || []),
            trustPoints: new Map(data.trustPoints || []),
            eventLogs: data.eventLogs || [],
            accessLogs: data.accessLogs || [],
            // v4 fields
            stats: data.stats || territory.stats,
            taxation: data.taxation || territory.taxation,
            marketplace: data.marketplace || territory.marketplace,
            warfare: data.warfare || territory.warfare,
            customRoles: new Map(data.customRoles || [])
        });

        return territory;
    }

    /**
     * v4: Calculate daily tax for this territory
     */
    calculateDailyTax() {
        if (!this.taxation.enabled) return 0;
        const baseChunks = this.radius * this.radius * 4;
        const dailyTax = Math.floor(baseChunks * 10); // 10 coins per chunk daily
        this.taxation.dailyTaxAmount = dailyTax;
        return dailyTax;
    }

    /**
     * v4: Pay territory tax
     */
    payTax(amount) {
        if (amount < this.taxation.dailyTaxAmount) {
            return { success: false, reason: "Not enough to cover tax" };
        }
        this.balance -= amount;
        this.taxation.lastTaxPaid = Date.now();
        this.taxation.totalTaxPaid += amount;
        this.taxation.taxHistory.push({ amount, date: Date.now() });
        this.taxation.isOverdue = false;
        this.logEvent(`Tax paid: ${amount} coins`);
        return { success: true, newBalance: this.balance };
    }

    /**
     * v4: List claim on marketplace
     */
    listOnMarketplace(price) {
        this.marketplace.isForSale = true;
        this.marketplace.askingPrice = price;
        this.marketplace.listedDate = Date.now();
        this.logEvent(`Listed on marketplace for ${price} coins`);
        return true;
    }

    /**
     * v4: Start claim auction
     */
    startAuction(startPrice, durationDays = 7) {
        this.marketplace.auctionActive = true;
        this.marketplace.auctionStartPrice = startPrice;
        this.marketplace.auctionHighestBid = startPrice;
        this.marketplace.auctionEndDate = Date.now() + (durationDays * 86400000);
        this.logEvent(`Auction started at ${startPrice} coins for ${durationDays} days`);
        return true;
    }

    /**
     * v4: Place bid on auction
     */
    placeBid(playerName, bidAmount) {
        if (!this.marketplace.auctionActive) return { success: false };
        if (bidAmount <= this.marketplace.auctionHighestBid) {
            return { success: false, reason: "Bid too low" };
        }
        this.marketplace.auctionHighestBid = bidAmount;
        this.marketplace.auctionHighestBidder = playerName;
        this.logEvent(`Bid placed by ${playerName}: ${bidAmount} coins`);
        return { success: true, highestBid: bidAmount };
    }

    /**
     * v4: Create custom role
     */
    createCustomRole(roleName, permissions) {
        this.customRoles.set(roleName, permissions);
        this.logEvent(`Custom role created: ${roleName}`);
        return true;
    }

    /**
     * v4: Get detailed statistics
     */
    getDetailedStats() {
        const daysActive = Math.floor((Date.now() - this.createdDate) / 86400000);
        return {
            ...this.stats,
            claimAge: daysActive,
            memberCount: this.members.size,
            totalMembers: this.members.size,
            balance: this.balance,
            taxStatus: this.taxation.isOverdue ? "OVERDUE" : "PAID",
            marketplaceStatus: this.marketplace.isForSale ? "LISTED" : "NOT_FOR_SALE",
            auctionStatus: this.marketplace.auctionActive ? "ACTIVE" : "NONE"
        };
    }

    /**
     * v4: Get security score (0-100)
     */
    getSecurityScore() {
        let score = 50;
        if (this.griefProtection) score += 10;
        if (this.explosionProtection) score += 10;
        if (this.fireSpreadProtection) score += 10;
        if (this.pvp) score -= 20;
        if (this.whiteListMode) score += 10;
        if (this.members.size > 5) score -= (this.members.size - 5);
        return Math.max(0, Math.min(100, score));
    }
}
