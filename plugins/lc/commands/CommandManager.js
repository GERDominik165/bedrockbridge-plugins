/**
 * 💬 LANDCLAIM MEGA - Command Manager
 * Processes all /lc subcommands with help, validation, and error handling
 * @version 3.0.0
 */

export class CommandManager {
    constructor(claimManager, moneyManager, protectionManager, uiManager) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.protectionManager = protectionManager;
        this.uiManager = uiManager;

        // === COMMAND REGISTRY ===
        this.commands = new Map();
        this.aliases = new Map();
        this.commandHistory = new Map(); // playerName -> [commands]

        // === COOLDOWNS ===
        this.cooldowns = new Map(); // "player:command" -> timestamp
        this.COOLDOWN_TIME = 500; // 500ms between commands

        this.registerCommands();
    }

    /**
     * Register all available commands
     */
    registerCommands() {
        // Basic commands
        this.registerCommand("help", this.handleHelp.bind(this), ["h", "?", "info"], "Show help information");
        this.registerCommand("claims", this.handleClaims.bind(this), ["list", "myclaims"], "List your claims");
        this.registerCommand("create", this.handleCreate.bind(this), ["new", "makeclaim"], "Create a new claim");
        this.registerCommand("delete", this.handleDelete.bind(this), ["remove", "deleteclaim"], "Delete a claim");
        this.registerCommand("expand", this.handleExpand.bind(this), ["grow"], "Expand a claim");
        this.registerCommand("info", this.handleInfo.bind(this), ["claim", "details"], "Get claim information");

        // Member management
        this.registerCommand("members", this.handleMembers.bind(this), ["member", "team"], "Manage claim members");
        this.registerCommand("add", this.handleAddMember.bind(this), ["invite"], "Add member to claim");
        this.registerCommand("remove", this.handleRemoveMember.bind(this), ["kick"], "Remove member from claim");

        // Economy
        this.registerCommand("balance", this.handleBalance.bind(this), ["money", "coins"], "Check your balance");
        this.registerCommand("transfer", this.handleTransfer.bind(this), ["pay", "send"], "Transfer money to player");
        this.registerCommand("stats", this.handleStats.bind(this), ["statistics"], "View global statistics");

        // Features
        this.registerCommand("warp", this.handleWarp.bind(this), ["teleport", "tp"], "Warp to claim location");
        this.registerCommand("home", this.handleHome.bind(this), ["sethome"], "Set/go to home");
        this.registerCommand("friends", this.handleFriends.bind(this), ["friend"], "Manage friends");

        // Admin
        this.registerCommand("admin", this.handleAdmin.bind(this), ["a", "mod"], "Admin commands");

        console.log("[CommandManager] Registered 16 commands with 30+ aliases");
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

        // Register aliases
        for (const alias of aliases) {
            this.aliases.set(alias, name);
        }
    }

    /**
     * Execute command
     */
    async executeCommand(player, args) {
        if (args.length === 0) {
            return this.handleHelp(player, []);
        }

        const commandName = args[0].toLowerCase();
        const commandArgs = args.slice(1);

        // === CHECK COOLDOWN ===
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
            return this.error(player, `Unknown command: /${commandName}. Use /lc help for list`);
        }

        // === EXECUTE ===
        try {
            this.cooldowns.set(cooldownKey, Date.now());
            this.recordCommandHistory(player.name, commandName, commandArgs);

            await actualCommand.handler(player, commandArgs);
        } catch (error) {
            this.error(player, `Command error: ${error.message}`);
            console.error(`[CommandManager] Error in ${commandName}: ${error}`);
        }
    }

    /**
     * Handle /lc help
     */
    handleHelp(player, args) {
        const maxCommands = this.commands.size;
        const colors = [
            "§6", // Gold
            "§e", // Yellow
            "§a", // Green
            "§b", // Cyan
            "§d"  // Magenta
        ];

        this.send(player, "§l§6========== 🏰 LANDCLAIM HELP ==========");
        this.send(player, "§7Use /lc <command> [args]");
        this.send(player, "");

        let colorIndex = 0;
        let commandCount = 0;

        for (const [name, info] of this.commands.entries()) {
            const color = colors[colorIndex % colors.length];
            const aliases = info.aliases.length > 0 ? ` §7(${info.aliases.join(", ")})` : "";
            this.send(player, `${color}/lc ${name}${aliases}§r - ${info.description}`);

            commandCount++;
            if (commandCount % 5 === 0) {
                this.send(player, ""); // Blank line every 5 commands
                colorIndex++;
            }
        }

        this.send(player, "§6========== Total: " + maxCommands + " commands ==========");
    }

    /**
     * Handle /lc claims
     */
    handleClaims(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);

        if (claims.length === 0) {
            this.send(player, "§c❌ You don't have any claims yet. Use /lc create to make one!");
            return;
        }

        this.send(player, `§6========== 📍 Your Claims (${claims.length}/${this.claimManager.CONFIG.maxClaimsPerPlayer}) ==========`);

        for (let i = 0; i < claims.length; i++) {
            const territory = this.claimManager.getClaim(claims[i]);
            if (!territory) continue;

            const color = territory.color || "§6";
            const size = territory.getSize();
            this.send(player,
                `${color}${i + 1}. ${territory.name}§r - ${size.chunks} chunks - ` +
                `${territory.members.size} members`
            );
        }

        this.send(player, "§7Use /lc info <number> to see details");
    }

    /**
     * Handle /lc create
     */
    async handleCreate(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc create <x> <z> [radius]");
            this.send(player, "§7Example: /lc create 100 100 5");
            return;
        }

        const x = parseInt(args[0]);
        const z = parseInt(args[1]);
        const radius = args.length > 2 ? parseInt(args[2]) : 5;

        if (isNaN(x) || isNaN(z) || isNaN(radius)) {
            return this.error(player, "Invalid coordinates or radius");
        }

        const result = this.claimManager.createClaim(player.name, x, z, player.dimension.id, radius);

        if (result.success) {
            this.success(player, `✅ Claim created successfully! (Cost: ${result.cost} coins)`);
            this.send(player, `📍 Location: ${x}, ${z} | Radius: ${radius} chunks`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * Handle /lc delete
     */
    handleDelete(player, args) {
        if (args.length === 0) {
            this.send(player, "§cUsage: /lc delete <claim-name-or-number>");
            return;
        }

        const claims = this.claimManager.getPlayerClaims(player.name);
        let target = null;

        // Try to find by number
        const num = parseInt(args[0]);
        if (!isNaN(num) && num > 0 && num <= claims.length) {
            target = this.claimManager.getClaim(claims[num - 1]);
        } else {
            // Try to find by name
            for (const claimId of claims) {
                const territory = this.claimManager.getClaim(claimId);
                if (territory && territory.name.toLowerCase() === args[0].toLowerCase()) {
                    target = territory;
                    break;
                }
            }
        }

        if (!target) {
            return this.error(player, "Claim not found");
        }

        const result = this.claimManager.deleteClaim(target.id, player.name);
        if (result.success) {
            this.success(player, `✅ Claim '${target.name}' deleted successfully`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * Handle /lc expand
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
            return this.error(player, "Invalid claim number or radius");
        }

        const claimId = claims[num - 1];
        const result = this.claimManager.expandClaim(claimId, newRadius, player.name);

        if (result.success) {
            this.success(player, `✅ Claim expanded! (Cost: ${result.cost} coins)`);
            this.send(player, `📏 New radius: ${result.newRadius} chunks`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * Handle /lc info
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

        const claimId = claims[num - 1];
        const info = this.claimManager.getClaimInfo(claimId);

        if (!info) {
            return this.error(player, "Claim not found");
        }

        this.send(player, `§6========== 📋 ${info.name} ==========`);
        this.send(player, `§7Owner: §f${info.owner}`);
        this.send(player, `§7Dimension: §f${info.dimension}`);
        this.send(player, `§7Center: §f${info.center.x}, ${info.center.z}`);
        this.send(player, `§7Radius: §f${info.radius} chunks`);
        this.send(player, `§7Size: §f${info.size.blocks} blocks`);
        this.send(player, `§7Members: §f${info.members}`);
        this.send(player, `§7Created: §f${info.createdDate}`);
    }

    /**
     * Handle /lc members
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

        this.send(player, `§6========== 👥 Members of ${territory.name} ==========`);
        this.send(player, `§6Owner: §f${territory.ownerName}`);

        if (territory.members.size === 0) {
            this.send(player, "§7No additional members");
            return;
        }

        for (const [memberName, memberData] of territory.members.entries()) {
            const roleColor = memberData.role === "member" ? "§a" :
                             memberData.role === "builder" ? "§b" : "§d";
            this.send(player, `  ${roleColor}${memberName}§r - ${memberData.role}`);
        }
    }

    /**
     * Handle /lc add
     */
    handleAddMember(player, args) {
        if (args.length < 2) {
            this.send(player, "§cUsage: /lc add <claim-number> <player-name> [role]");
            this.send(player, "§7Roles: member, builder, visitor");
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
            this.success(player, `✅ ${memberName} added as ${role}! (Cost: ${result.cost} coins)`);
        } else {
            this.error(player, result.error);
        }
    }

    /**
     * Handle /lc remove
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
     * Handle /lc balance
     */
    handleBalance(player, args) {
        const account = this.moneyManager.getPlayerAccount(player.name);
        const stats = this.moneyManager.getPlayerStats(player.name);

        this.send(player, "§6========== 💰 Your Balance ==========");
        this.send(player, `§fBalance: §6${account.balance} coins`);
        this.send(player, `§fTotal Earned: §a${stats.totalEarned} coins`);
        this.send(player, `§fTotal Spent: §c${stats.totalSpent} coins`);
        this.send(player, `§fNet Worth: §e${stats.netWorth} coins`);
        this.send(player, `§fTransactions: §7${stats.transactionCount}`);
    }

    /**
     * Handle /lc transfer
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
     * Handle /lc stats
     */
    handleStats(player, args) {
        const stats = this.claimManager.getStatistics();
        const economy = this.moneyManager.getEconomyStats();

        this.send(player, "§6========== 📊 Global Statistics ==========");
        this.send(player, `§fTotal Claims: §e${stats.totalClaims}`);
        this.send(player, `§fTotal Chunks: §e${stats.totalChunks}`);
        this.send(player, `§fUnique Players: §e${stats.uniquePlayers}`);
        this.send(player, `§fAverage Claim Size: §e${stats.averageClaimSize} chunks`);
        this.send(player, "");
        this.send(player, `§fTotal Server Money: §6${economy.totalMoney} coins`);
        this.send(player, `§fTotal Transactions: §7${economy.totalTransactions}`);
    }

    /**
     * Handle /lc warp
     */
    async handleWarp(player, args) {
        if (args.length < 1) {
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
            // Warp player
            await player.teleport(
                { x: warp.x, y: warp.y, z: warp.z },
                { dimension: warp.dimension, rotation: { x: 0, y: 0 } }
            );
            this.success(player, `✅ Warped to ${warpName}!`);
        } else {
            // List warps
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
     * Handle /lc home
     */
    async handleHome(player, args) {
        const claims = this.claimManager.getPlayerClaims(player.name);

        if (claims.length === 0) {
            return this.error(player, "You don't have any claims");
        }

        const territory = this.claimManager.getClaim(claims[0]);
        const home = territory.getHome(player.name);

        if (!home) {
            return this.send(player, "§7You haven't set a home. Use /lc sethome in your claim");
        }

        await player.teleport(
            { x: home.x, y: home.y, z: home.z },
            { dimension: home.dimension, rotation: { x: 0, y: 0 } }
        );
        this.success(player, "✅ Teleported to your home!");
    }

    /**
     * Handle /lc friends
     */
    handleFriends(player, args) {
        this.send(player, "§6========== 👥 Friends System ==========");
        this.send(player, "§cFriends system coming soon!");
        this.send(player, "§7/lc friends add <player>");
        this.send(player, "§7/lc friends remove <player>");
    }

    /**
     * Handle /lc admin
     */
    handleAdmin(player, args) {
        // Only allow admins
        if (!this.isAdmin(player)) {
            return this.error(player, "Admin access required");
        }

        this.send(player, "§6========== ⚙️ Admin Commands ==========");
        this.send(player, "§cAdmin features coming soon!");
    }

    /**
     * Check if player is admin
     */
    isAdmin(player) {
        // TODO: Integrate with server's permission system
        return false;
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

        // Keep last 100 commands
        if (history.length > 100) {
            history.shift();
        }
    }

    /**
     * Send safe message to player
     */
    send(player, message) {
        try {
            player.sendMessage(message);
        } catch (error) {
            console.warn(`[CommandManager] Could not send message to ${player.name}`);
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
}
