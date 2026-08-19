/**
 * 💬 LANDCLAIM MEGA v4 - Advanced Command Manager
 * Complete command system with 25+ commands and admin tools
 * @version 4.0.0
 */

export class CommandManagerV4 {
    constructor(claimManager, moneyManager, protectionManager, adminManager) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.protectionManager = protectionManager;
        this.adminManager = adminManager;
        this.uiManager = null;

        // === COMMAND REGISTRY ===
        this.commands = new Map();
        this.aliases = new Map();
        this.commandHistory = new Map();
        this.commandStats = new Map();

        // === COOLDOWNS ===
        this.cooldowns = new Map();
        this.COOLDOWN_TIME = 500;

        this.registerAllCommands();
        console.log("[CommandManagerV4] ✅ Registered 25+ commands");
    }

    /**
     * Register ALL commands
     */
    registerAllCommands() {
        // === BASIC COMMANDS ===
        this.registerCommand("help", this.handleHelp.bind(this), ["h", "?", "info"], "Show help information");
        this.registerCommand("menu", this.handleMenu.bind(this), ["m"], "Open main menu");

        // === CLAIM COMMANDS ===
        this.registerCommand("claims", this.handleClaims.bind(this), ["list", "myclaims", "cl"], "List your claims");
        this.registerCommand("create", this.handleCreate.bind(this), ["new", "makeclaim", "nc"], "Create a new claim");
        this.registerCommand("delete", this.handleDelete.bind(this), ["remove", "deleteclaim", "dc"], "Delete a claim");
        this.registerCommand("expand", this.handleExpand.bind(this), ["grow", "ex"], "Expand a claim");
        this.registerCommand("info", this.handleInfo.bind(this), ["claim", "details", "ci"], "Get claim information");
        this.registerCommand("rename", this.handleRename.bind(this), ["rn"], "Rename a claim");

        // === MEMBER COMMANDS ===
        this.registerCommand("members", this.handleMembers.bind(this), ["member", "team", "mem"], "Manage claim members");
        this.registerCommand("add", this.handleAddMember.bind(this), ["invite", "addmember"], "Add member to claim");
        this.registerCommand("remove", this.handleRemoveMember.bind(this), ["kick", "removemember"], "Remove member from claim");
        this.registerCommand("sethome", this.handleSetHome.bind(this), ["sh"], "Set home in claim");
        this.registerCommand("home", this.handleHome.bind(this), ["h", "gohome"], "Go to home");

        // === WARP COMMANDS ===
        this.registerCommand("warp", this.handleWarp.bind(this), ["teleport", "tp", "w"], "Warp to locations");
        this.registerCommand("setwarp", this.handleSetWarp.bind(this), ["sw"], "Set warp point");
        this.registerCommand("delwarp", this.handleDelWarp.bind(this), ["dw"], "Delete warp point");

        // === ECONOMY COMMANDS ===
        this.registerCommand("balance", this.handleBalance.bind(this), ["money", "coins", "bal"], "Check your balance");
        this.registerCommand("transfer", this.handleTransfer.bind(this), ["pay", "send", "tr"], "Transfer money to player");
        this.registerCommand("stats", this.handleStats.bind(this), ["statistics", "st"], "View global statistics");
        this.registerCommand("income", this.handleIncome.bind(this), ["dailyincome"], "Claim daily income");

        // === CLAIM SETTINGS ===
        this.registerCommand("settings", this.handleSettings.bind(this), ["set", "config"], "Claim settings");
        this.registerCommand("pvp", this.handlePVPToggle.bind(this), [""], "Toggle PvP in claim");
        this.registerCommand("protection", this.handleProtectionToggle.bind(this), ["prot"], "Toggle protection");

        // === VISUALIZATION ===
        this.registerCommand("visualize", this.handleVisualize.bind(this), ["vis", "show"], "Show claim borders");
        this.registerCommand("nearby", this.handleNearby.bind(this), ["near"], "Show nearby claims");

        // === FRIENDS COMMANDS ===
        this.registerCommand("friends", this.handleFriends.bind(this), ["friend", "fr"], "Manage friends");

        // === ADMIN COMMANDS ===
        this.registerCommand("admin", this.handleAdminMenu.bind(this), ["adm", "a"], "Admin panel");
        this.registerCommand("reload", this.handleReload.bind(this), ["rl"], "Reload plugin");
    }

    /**
     * Register a command
     */
    registerCommand(name, handler, aliases = [], description = "") {
        const cmdInfo = {
            name: name,
            handler: handler,
            aliases: aliases,
            description: description
        };

        this.commands.set(name, cmdInfo);
        for (const alias of aliases) {
            this.aliases.set(alias, name);
        }
    }

    /**
     * Execute command
     */
    async executeCommand(player, args) {
        try {
            if (args.length === 0) {
                return this.handleHelp(player, []);
            }

            const commandName = args[0].toLowerCase();
            const commandArgs = args.slice(1);

            // === COOLDOWN CHECK ===
            const cooldownKey = `${player.name}:${commandName}`;
            if (this.cooldowns.has(cooldownKey)) {
                const lastTime = this.cooldowns.get(cooldownKey);
                if (Date.now() - lastTime < this.COOLDOWN_TIME) {
                    return this.error(player, "Please wait before using another command");
                }
            }

            // === GET COMMAND ===
            let actualCommand = this.commands.get(commandName);
            if (!actualCommand) {
                const aliasTarget = this.aliases.get(commandName);
                if (aliasTarget) {
                    actualCommand = this.commands.get(aliasTarget);
                }
            }

            if (!actualCommand) {
                return this.error(player, `Unknown command: /lc ${commandName}. Use /lc help`);
            }

            // === EXECUTE ===
            this.cooldowns.set(cooldownKey, Date.now());
            this.recordCommandHistory(player.name, commandName, commandArgs);
            this.recordCommandStats(commandName);

            await actualCommand.handler(player, commandArgs);
        } catch (error) {
            this.error(player, `Command error: ${error.message}`);
            console.error(`[CommandManager] Error in command: ${error}`);
        }
    }

    /**
     * COMMAND: help
     */
    handleHelp(player, args) {
        const commands = Array.from(this.commands.values());
        this.send(player, "§l§6╔════════════════════════════════════════╗");
        this.send(player, "§l§6║  🏰 LANDCLAIM MEGA v4 - HELP           ║");
        this.send(player, "§l§6╚════════════════════════════════════════╝");
        this.send(player, "§fUse /lc <command> [args]");
        this.send(player, "");

        let count = 0;
        for (const [name, info] of this.commands.entries()) {
            const aliases = info.aliases.length > 0 ? ` §7(${info.aliases.join(", ")})` : "";
            this.send(player, `§6/lc ${name}${aliases}§r - §f${info.description}`);
            count++;
            if (count % 8 === 0) this.send(player, "");
        }

        this.send(player, "§6╚════════════════════════════════════════╝");
    }

    /**
     * COMMAND: menu
     */
    async handleMenu(player, args) {
        if (this.uiManager) {
            await this.uiManager.showMainMenu(player);
        } else {
            this.handleClaims(player, args);
        }
    }

    /**
     * COMMAND: claims
     */
    handleClaims(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);

        if (claims.length === 0) {
            this.send(player, "§c❌ You don't have any claims yet");
            return;
        }

        this.send(player, `§6════════ 📍 Your Claims (${claims.length}) ════════`);
        for (let i = 0; i < claims.length; i++) {
            const territory = this.claimManager.getClaim(claims[i]);
            if (territory) {
                const size = territory.getSize();
                this.send(player,
                    `§f${i + 1}. ${territory.name} §7(${size.chunks} chunks, ${territory.members.size} members)`
                );
            }
        }
        this.send(player, "§6═══════════════════════════════════════════");
    }

    /**
     * COMMAND: create
     */
    async handleCreate(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc create <x> <z> [radius]");
            return;
        }

        const x = parseInt(args[0]);
        const z = parseInt(args[1]);
        const radius = args.length > 2 ? parseInt(args[2]) : 5;

        if (isNaN(x) || isNaN(z) || isNaN(radius)) {
            return this.error(player, "Invalid coordinates");
        }

        const result = this.claimManager.createClaim(player.name, x, z, player.dimension.id, radius);

        if (result.success) {
            this.success(player, `✅ Claim created! (Cost: ${result.cost} coins)`);
            this.send(player, `📍 Location: ${x}, ${z} | Radius: ${radius}`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * COMMAND: delete
     */
    handleDelete(player, args) {
        if (args.length === 0) {
            this.send(player, "§cUsage: /lc delete <claim-number>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const result = this.claimManager.deleteClaim(claims[num - 1], player.name);
        if (result.success) {
            this.success(player, `✅ Claim deleted successfully`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * COMMAND: expand
     */
    handleExpand(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc expand <claim-number> <new-radius>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);
        const newRadius = parseInt(args[1]);

        if (isNaN(num) || isNaN(newRadius) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid arguments");
        }

        const result = this.claimManager.expandClaim(claims[num - 1], newRadius, player.name);
        if (result.success) {
            this.success(player, `✅ Claim expanded! (Cost: ${result.cost} coins)`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * COMMAND: info
     */
    handleInfo(player, args) {
        if (args.length === 0) {
            this.send(player, "§cUsage: /lc info <claim-number>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const info = this.claimManager.getClaimInfo(claims[num - 1]);
        if (!info) {
            return this.error(player, "Claim not found");
        }

        this.send(player, `§6════════ 📋 ${info.name} ════════`);
        this.send(player, `§fOwner: §6${info.owner}`);
        this.send(player, `§fDimension: §6${info.dimension}`);
        this.send(player, `§fCenter: §6${info.center.x}, ${info.center.z}`);
        this.send(player, `§fRadius: §6${info.radius}§f chunks`);
        this.send(player, `§fSize: §6${info.size.blocks}§f blocks`);
        this.send(player, `§fMembers: §6${info.members}`);
        this.send(player, `§fCreated: §6${info.createdDate}`);
    }

    /**
     * COMMAND: rename
     */
    handleRename(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc rename <claim-number> <new-name>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);
        const newName = args.slice(1).join(" ");

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const territory = this.claimManager.getClaim(claims[num - 1]);
        if (!territory) {
            return this.error(player, "Claim not found");
        }

        territory.name = newName;
        this.claimManager.isDirty = true;
        this.success(player, `✅ Claim renamed to: ${newName}`);
    }

    /**
     * COMMAND: members
     */
    handleMembers(player, args) {
        if (args.length === 0) {
            this.send(player, "§cUsage: /lc members <claim-number>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const territory = this.claimManager.getClaim(claims[num - 1]);
        if (!territory) return this.error(player, "Claim not found");

        this.send(player, `§6════════ 👥 Members (${territory.members.size}) ════════`);
        this.send(player, `§fOwner: §6${territory.ownerName}`);

        if (territory.members.size === 0) {
            this.send(player, "§7No additional members");
            return;
        }

        for (const [memberName, memberData] of territory.members.entries()) {
            const roleColor = memberData.role === "member" ? "§a" : "§b";
            this.send(player, `  ${roleColor}${memberName}§r - ${memberData.role}`);
        }
    }

    /**
     * COMMAND: add
     */
    handleAddMember(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc add <claim-number> <player-name> [role]");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);
        const memberName = args[1];
        const role = args[2] || "member";

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const result = this.claimManager.addMemberToClaim(claims[num - 1], memberName, role, player.name);
        if (result.success) {
            this.success(player, `✅ ${memberName} added as ${role}! (Cost: ${result.cost})`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * COMMAND: remove
     */
    handleRemoveMember(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc remove <claim-number> <player-name>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);
        const memberName = args[1];

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const result = this.claimManager.removeMemberFromClaim(claims[num - 1], memberName, player.name);
        if (result.success) {
            this.success(player, `✅ ${memberName} removed from claim`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * COMMAND: sethome
     */
    handleSetHome(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);
        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const territory = this.claimManager.getClaim(claims[0]);
        territory.setHome(player.name, player.location.x, player.location.y, player.location.z, player.dimension.id);
        this.success(player, "✅ Home set!");
    }

    /**
     * COMMAND: home
     */
    async handleHome(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);
        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const territory = this.claimManager.getClaim(claims[0]);
        const home = territory.getHome(player.name);

        if (!home) {
            return this.send(player, "§7Use /lc sethome to set your home");
        }

        await player.teleport(
            { x: home.x, y: home.y, z: home.z },
            { dimension: home.dimension, rotation: { x: 0, y: 0 } }
        );
        this.success(player, "✅ Teleported to home!");
    }

    /**
     * COMMAND: warp
     */
    async handleWarp(player, args) {
        if (args.length === 0) {
            this.send(player, "§cUsage: /lc warp <claim-number> [warp-name]");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const territory = this.claimManager.getClaim(claims[num - 1]);
        if (!territory) return this.error(player, "Claim not found");

        if (args.length > 1) {
            const warpName = args[1];
            const warp = territory.warps.get(warpName);
            if (!warp) {
                return this.error(player, `Warp '${warpName}' not found`);
            }
            await player.teleport({ x: warp.x, y: warp.y, z: warp.z },
                { dimension: warp.dimension, rotation: { x: 0, y: 0 } });
            this.success(player, `✅ Warped to ${warpName}!`);
        } else {
            if (territory.warps.size === 0) {
                return this.send(player, "§7This claim has no warps");
            }
            this.send(player, `§6Warps in ${territory.name}:`);
            for (const warpName of territory.warps.keys()) {
                this.send(player, `  §a${warpName}`);
            }
        }
    }

    /**
     * COMMAND: setwarp
     */
    handleSetWarp(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc setwarp <claim-number> <warp-name>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);
        const warpName = args[1];

        if (isNaN(num) || num < 1 || num > claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const territory = this.claimManager.getClaim(claims[num - 1]);
        territory.addWarp(warpName, player.location.x, player.location.y, player.location.z, player.dimension.id);
        this.success(player, `✅ Warp '${warpName}' set!`);
    }

    /**
     * COMMAND: delwarp
     */
    handleDelWarp(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc delwarp <claim-number> <warp-name>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const num = parseInt(args[0]);
        const warpName = args[1];

        const territory = this.claimManager.getClaim(claims[num - 1]);
        territory.removeWarp(warpName);
        this.success(player, `✅ Warp '${warpName}' deleted!`);
    }

    /**
     * COMMAND: balance
     */
    handleBalance(player, args) {
        const account = this.moneyManager.getPlayerAccount(player.name);
        const stats = this.moneyManager.getPlayerStats(player.name);

        this.send(player, "§6════════ 💰 Your Balance ════════");
        this.send(player, `§fBalance: §6${account.balance} coins`);
        this.send(player, `§fTotal Earned: §a${stats.totalEarned}`);
        this.send(player, `§fTotal Spent: §c${stats.totalSpent}`);
        this.send(player, `§fNet Worth: §e${stats.netWorth}`);
    }

    /**
     * COMMAND: transfer
     */
    handleTransfer(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc transfer <player-name> <amount>");
            return;
        }

        const targetName = args[0];
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount < 1) {
            return this.error(player, "Invalid amount");
        }

        if (this.moneyManager.transferMoney(player.name, targetName, amount)) {
            this.success(player, `✅ Transferred ${amount} coins to ${targetName}`);
        } else {
            this.error(player, "Transfer failed. Check your balance");
        }
    }

    /**
     * COMMAND: stats
     */
    handleStats(player, args) {
        const stats = this.claimManager.getStatistics();
        const economy = this.moneyManager.getEconomyStats();

        this.send(player, "§6════════ 📊 Global Statistics ════════");
        this.send(player, `§fTotal Claims: §e${stats.totalClaims}`);
        this.send(player, `§fTotal Chunks: §e${stats.totalChunks}`);
        this.send(player, `§fUnique Players: §e${stats.uniquePlayers}`);
        this.send(player, `§fTotal Server Money: §6${economy.totalMoney} coins`);
        this.send(player, `§fTotal Transactions: §7${economy.totalTransactions}`);
    }

    /**
     * COMMAND: income
     */
    handleIncome(player, args) {
        const account = this.moneyManager.getPlayerAccount(player.name);
        const today = new Date().toDateString();

        if (account.dailyClaimDate === today) {
            this.send(player, "§7You already claimed daily income today");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        const totalSize = claims.reduce((sum, claimId) => {
            const territory = this.claimManager.getClaim(claimId);
            return sum + (territory ? territory.getSize().chunks : 0);
        }, 0);

        const income = this.moneyManager.claimDailyIncome(player.name, totalSize);
        this.success(player, `✅ Claimed ${income} coins daily income!`);
    }

    /**
     * COMMAND: settings
     */
    handleSettings(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);
        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const territory = this.claimManager.getClaim(claims[0]);
        this.send(player, `§6════════ ⚙️ ${territory.name} Settings ════════`);
        this.send(player, `§fPvP: ${territory.pvp ? "§aENABLED" : "§cDISABLED"}`);
        this.send(player, `§fGrief Protection: ${territory.griefProtection ? "§aON" : "§cOFF"}`);
        this.send(player, `§fExplosion Protection: ${territory.explosionProtection ? "§aON" : "§cOFF"}`);
    }

    /**
     * COMMAND: pvp
     */
    handlePVPToggle(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);
        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const territory = this.claimManager.getClaim(claims[0]);
        territory.pvp = !territory.pvp;
        this.claimManager.isDirty = true;
        this.send(player, `§fPvP: ${territory.pvp ? "§aENABLED" : "§cDISABLED"}`);
    }

    /**
     * COMMAND: protection
     */
    handleProtectionToggle(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);
        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const territory = this.claimManager.getClaim(claims[0]);
        territory.griefProtection = !territory.griefProtection;
        this.claimManager.isDirty = true;
        this.send(player, `§fProtection: ${territory.griefProtection ? "§aON" : "§cOFF"}`);
    }

    /**
     * COMMAND: visualize
     */
    handleVisualize(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);
        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const num = args.length > 0 ? parseInt(args[0]) - 1 : 0;
        if (isNaN(num) || num < 0 || num >= claims.length) {
            return this.error(player, "Invalid claim number");
        }

        const territory = this.claimManager.getClaim(claims[num]);
        this.success(player, "✅ Visualizing territory...");
    }

    /**
     * COMMAND: nearby
     */
    handleNearby(player, args) {
        const nearby = this.claimManager.getNearbyClaimsAt(
            player.location.x, player.location.z, player.dimension.id, 256
        );

        if (nearby.length === 0) {
            this.send(player, "§7No nearby claims");
            return;
        }

        this.send(player, `§6════════ 🗺️ Nearby Claims (${nearby.length}) ════════`);
        for (let i = 0; i < Math.min(nearby.length, 10); i++) {
            const item = nearby[i];
            const distance = Math.round(item.distance);
            this.send(player, `§f${i + 1}. ${item.territory.name} §7(${distance}m)`);
        }
    }

    /**
     * COMMAND: friends
     */
    handleFriends(player, args) {
        this.send(player, "§6════════ 👥 Friends System ════════");
        this.send(player, "§cComing soon!");
    }

    /**
     * COMMAND: admin
     */
    handleAdminMenu(player, args) {
        if (!this.adminManager || !this.adminManager.isAdmin(player.name)) {
            return this.error(player, "Admin access required");
        }

        this.send(player, "§6════════ 👑 Admin Menu ════════");
        this.send(player, "§c/lc admin addadmin <player>");
        this.send(player, "§c/lc admin delete <claimId>");
        this.send(player, "§c/lc admin ban <player> <minutes>");
        this.send(player, "§c/lc admin stats - View admin stats");
    }

    /**
     * COMMAND: reload
     */
    handleReload(player, args) {
        if (!this.adminManager || !this.adminManager.isAdmin(player.name)) {
            return this.error(player, "Admin access required");
        }

        this.claimManager.saveAllTerritories();
        this.adminManager.saveAdminData();
        this.success(player, "✅ Plugin data reloaded and saved");
    }

    /**
     * Record command history
     */
    recordCommandHistory(playerName, command, args) {
        if (!this.commandHistory.has(playerName)) {
            this.commandHistory.set(playerName, []);
        }

        const history = this.commandHistory.get(playerName);
        history.push({
            command: command,
            args: args,
            timestamp: Date.now()
        });

        if (history.length > 100) {
            history.shift();
        }
    }

    /**
     * Record command statistics
     */
    recordCommandStats(command) {
        const current = this.commandStats.get(command) || 0;
        this.commandStats.set(command, current + 1);
    }

    /**
     * Send message
     */
    send(player, message) {
        try {
            player.sendMessage(message);
        } catch (error) {
            console.warn(`[CommandManager] Could not send message`);
        }
    }

    /**
     * Send error message
     */
    error(player, message) {
        this.send(player, `§c❌ ${message}`);
    }

    /**
     * Send success message
     */
    success(player, message) {
        this.send(player, `§a${message}`);
    }

    /**
     * Get command statistics
     */
    getStats() {
        return {
            totalCommands: this.commands.size,
            totalAliases: this.aliases.size,
            executedCommands: Array.from(this.commandStats.values())
                .reduce((sum, count) => sum + count, 0),
            mostUsed: Array.from(this.commandStats.entries())
                .sort((a, b) => b[1] - a[1])[0]
        };
    }
}
