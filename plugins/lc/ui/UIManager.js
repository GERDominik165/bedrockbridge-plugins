/**
 * 🎨 LANDCLAIM MEGA - UI Manager
 * Handles all GUI forms with ActionFormData fallback to chat menus
 * @version 3.0.0
 */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

export class UIManager {
    constructor(claimManager, moneyManager) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;

        // Runtime detection of form availability
        this.FORMS_AVAILABLE = false;
        this.detectFormAvailability();
    }

    /**
     * Detect if ActionFormData is available at runtime
     */
    detectFormAvailability() {
        try {
            if (typeof ActionFormData !== 'undefined' && typeof ModalFormData !== 'undefined') {
                this.FORMS_AVAILABLE = true;
                console.log("[UIManager] ✅ ActionFormData/ModalFormData available");
            } else {
                this.FORMS_AVAILABLE = false;
                console.warn("[UIManager] ⚠️ ActionFormData/ModalFormData unavailable - using chat fallback");
            }
        } catch (error) {
            this.FORMS_AVAILABLE = false;
            console.warn("[UIManager] ⚠️ Form detection failed - using chat fallback");
        }
    }

    /**
     * Safe message sending
     */
    sendMessage(player, message) {
        try {
            player.sendMessage(message);
        } catch (error) {
            console.warn(`[UIManager] Could not send message to ${player.name}`);
        }
    }

    /**
     * Show main menu
     */
    async showMainMenu(player) {
        // Early fallback if forms unavailable
        if (!this.FORMS_AVAILABLE) {
            return this.showMainMenuFallback(player);
        }

        try {
            const form = new ActionFormData()
                .title("§6🏰 LandClaim Manager")
                .body("§fManage your territories and claims")
                .button("📍 My Claims", "textures/ui/icon_claims")
                .button("🗺️ Nearby", "textures/ui/icon_map")
                .button("➕ Create", "textures/ui/icon_add")
                .button("👥 Members", "textures/ui/icon_members")
                .button("💰 Balance", "textures/ui/icon_money")
                .button("⚙️ Settings", "textures/ui/icon_settings");

            const response = await form.show(player);

            if (response.cancelled) return;

            switch (response.selection) {
                case 0: return this.showMyClaimsMenu(player);
                case 1: return this.showNearbyMenu(player);
                case 2: return this.showCreateClaimForm(player);
                case 3: return this.showMembersMenu(player);
                case 4: return this.showBalanceMenu(player);
                case 5: return this.showSettingsMenu(player);
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showMainMenuFallback(player);
            }
            this.sendMessage(player, `§c❌ Menu error: ${error.message}`);
        }
    }

    /**
     * Main menu fallback (chat-based)
     */
    showMainMenuFallback(player) {
        this.sendMessage(player, "§6========== 🏰 LandClaim Menu ==========");
        this.sendMessage(player, "§f/lc claims §7- View your claims");
        this.sendMessage(player, "§f/lc create <x> <z> [radius] §7- Create claim");
        this.sendMessage(player, "§f/lc delete <#> §7- Delete claim");
        this.sendMessage(player, "§f/lc expand <#> <radius> §7- Expand claim");
        this.sendMessage(player, "§f/lc info <#> §7- Claim details");
        this.sendMessage(player, "§f/lc members <#> §7- Manage members");
        this.sendMessage(player, "§f/lc balance §7- Check balance");
        this.sendMessage(player, "§f/lc help §7- Full command list");
        this.sendMessage(player, "§6====================================");
    }

    /**
     * Show my claims menu
     */
    async showMyClaimsMenu(player) {
        if (!this.FORMS_AVAILABLE) {
            return this.showMyClaimsMenuFallback(player);
        }

        try {
            const claims = this.claimManager.getPlayerClaims(player.name);

            if (claims.length === 0) {
                this.sendMessage(player, "§c❌ You don't have any claims!");
                return;
            }

            const form = new ActionFormData()
                .title("§6📍 My Claims")
                .body(`§fYou have §6${claims.length}§f claims`);

            for (const claimId of claims) {
                const territory = this.claimManager.getClaim(claimId);
                if (territory) {
                    const size = territory.getSize();
                    form.button(`${territory.icon} ${territory.name}`, "textures/ui/icon_claim_item");
                }
            }

            const response = await form.show(player);
            if (!response.cancelled && response.selection < claims.length) {
                const territory = this.claimManager.getClaim(claims[response.selection]);
                if (territory) {
                    return this.showClaimDetailMenu(player, territory);
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showMyClaimsMenuFallback(player);
            }
        }
    }

    /**
     * My claims fallback
     */
    showMyClaimsMenuFallback(player) {
        const claims = this.claimManager.getPlayerClaims(player.name);

        if (claims.length === 0) {
            this.sendMessage(player, "§c❌ You don't have any claims");
            return;
        }

        this.sendMessage(player, `§6========== 📍 Your Claims (${claims.length}) ==========`);

        for (let i = 0; i < claims.length; i++) {
            const territory = this.claimManager.getClaim(claims[i]);
            if (territory) {
                const size = territory.getSize();
                this.sendMessage(player,
                    `§f${i + 1}. ${territory.name} §7(${size.chunks} chunks, ${territory.members.size} members)`
                );
            }
        }

        this.sendMessage(player, "§7Use /lc info <number> for details");
    }

    /**
     * Show claim detail menu
     */
    async showClaimDetailMenu(player, territory) {
        if (!this.FORMS_AVAILABLE) {
            return this.showClaimDetailFallback(player, territory);
        }

        try {
            const size = territory.getSize();
            const form = new ActionFormData()
                .title(`§6${territory.name}`)
                .body(
                    `§fOwner: §6${territory.ownerName}\n` +
                    `§fSize: §6${size.chunks}§f chunks\n` +
                    `§fMembers: §6${territory.members.size}\n` +
                    `§fCreated: §6${new Date(territory.createdDate).toLocaleDateString()}`
                )
                .button("📋 Details", "textures/ui/icon_info")
                .button("👥 Members", "textures/ui/icon_members")
                .button("📏 Expand", "textures/ui/icon_expand")
                .button("⚙️ Settings", "textures/ui/icon_settings")
                .button("🗑️ Delete", "textures/ui/icon_delete");

            const response = await form.show(player);

            if (response.cancelled) return;

            switch (response.selection) {
                case 0: return this.showClaimDetailFallback(player, territory);
                case 1: return this.showClaimMembersMenu(player, territory);
                case 2: return this.showExpandForm(player, territory);
                case 3: return this.showClaimSettingsMenu(player, territory);
                case 4: return this.showDeleteConfirmForm(player, territory);
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showClaimDetailFallback(player, territory);
            }
        }
    }

    /**
     * Claim detail fallback
     */
    showClaimDetailFallback(player, territory) {
        const size = territory.getSize();
        const corners = territory.getCorners();

        this.sendMessage(player, `§6========== 📋 ${territory.name} ==========`);
        this.sendMessage(player, `§fOwner: §6${territory.ownerName}`);
        this.sendMessage(player, `§fDimension: §6${territory.dimension}`);
        this.sendMessage(player, `§fCenter: §6${territory.centerX}, ${territory.centerZ}`);
        this.sendMessage(player, `§fRadius: §6${territory.radius}§f chunks`);
        this.sendMessage(player, `§fSize: §6${size.chunks}§f chunks (${size.width}×${size.depth})`);
        this.sendMessage(player, `§fMembers: §6${territory.members.size}`);
        this.sendMessage(player, `§fCreated: §6${new Date(territory.createdDate).toLocaleDateString()}`);
        this.sendMessage(player, "§7Use /lc commands to manage this claim");
    }

    /**
     * Show nearby menu
     */
    async showNearbyMenu(player) {
        const nearby = this.claimManager.getNearbyClaimsAt(player.location.x, player.location.z, player.dimension.id, 256);

        if (nearby.length === 0) {
            this.sendMessage(player, "§7No nearby claims");
            return;
        }

        if (!this.FORMS_AVAILABLE) {
            return this.showNearbyFallback(player, nearby);
        }

        try {
            const form = new ActionFormData()
                .title("§6🗺️ Nearby Claims")
                .body(`§fFound §6${nearby.length}§f nearby claims`);

            for (const item of nearby.slice(0, 20)) {
                const distance = Math.round(item.distance);
                form.button(`${item.territory.name} §7(${distance}m)`, "textures/ui/icon_claim_item");
            }

            const response = await form.show(player);

            if (!response.cancelled) {
                const territory = nearby[response.selection].territory;
                return this.showClaimDetailMenu(player, territory);
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showNearbyFallback(player, nearby);
            }
        }
    }

    /**
     * Nearby fallback
     */
    showNearbyFallback(player, nearby) {
        this.sendMessage(player, `§6========== 🗺️ Nearby Claims (${nearby.length}) ==========`);

        for (let i = 0; i < nearby.length && i < 10; i++) {
            const item = nearby[i];
            const distance = Math.round(item.distance);
            this.sendMessage(player, `§f${i + 1}. ${item.territory.name} §7(${distance}m from you)`);
        }
    }

    /**
     * Show create claim form
     */
    async showCreateClaimForm(player) {
        if (!this.FORMS_AVAILABLE) {
            return this.showCreateClaimFallback(player);
        }

        try {
            const form = new ModalFormData()
                .title("§6➕ Create Claim")
                .textField("§fCenter X:", "-200", "100")
                .textField("§fCenter Z:", "-200", "100")
                .textField("§fRadius (chunks):", "5", "5")
                .toggle("§fConfirm creation", false);

            const response = await form.show(player);

            if (response.cancelled) return;

            const x = parseInt(response.formValues[0]);
            const z = parseInt(response.formValues[1]);
            const radius = parseInt(response.formValues[2]);
            const confirm = response.formValues[3];

            if (isNaN(x) || isNaN(z) || isNaN(radius)) {
                this.sendMessage(player, "§c❌ Invalid numbers");
                return;
            }

            if (!confirm) {
                this.sendMessage(player, "§7Creation cancelled");
                return;
            }

            const result = this.claimManager.createClaim(player.name, x, z, player.dimension.id, radius);

            if (result.success) {
                this.sendMessage(player, `§a✅ Claim created! Cost: ${result.cost} coins`);
            } else {
                this.sendMessage(player, `§c❌ ${result.error}`);
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showCreateClaimFallback(player);
            }
        }
    }

    /**
     * Create claim fallback
     */
    showCreateClaimFallback(player) {
        this.sendMessage(player, "§6========== ➕ Create Claim ==========");
        this.sendMessage(player, "§fUse command: /lc create <x> <z> [radius]");
        this.sendMessage(player, "§7Example: /lc create 100 100 5");
        this.sendMessage(player, "§fCurrent position: §6" + Math.round(player.location.x) + ", " + Math.round(player.location.z));
    }

    /**
     * Show expand form
     */
    async showExpandForm(player, territory) {
        if (!this.FORMS_AVAILABLE) {
            return this.sendMessage(player, "§fUse: /lc expand <#> <new-radius>");
        }

        try {
            const form = new ModalFormData()
                .title(`§6📏 Expand ${territory.name}`)
                .textField("§fNew Radius:", String(territory.radius + 1), String(territory.radius + 5));

            const response = await form.show(player);

            if (!response.cancelled && response.formValues[0]) {
                const newRadius = parseInt(response.formValues[0]);

                if (isNaN(newRadius)) {
                    this.sendMessage(player, "§c❌ Invalid radius");
                    return;
                }

                const result = this.claimManager.expandClaim(territory.id, newRadius, player.name);

                if (result.success) {
                    this.sendMessage(player, `§a✅ Expanded! Cost: ${result.cost} coins`);
                } else {
                    this.sendMessage(player, `§c❌ ${result.error}`);
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }

    /**
     * Show delete confirmation form
     */
    async showDeleteConfirmForm(player, territory) {
        if (!this.FORMS_AVAILABLE) {
            return this.sendMessage(player, "§fUse: /lc delete <#>");
        }

        try {
            const form = new ModalFormData()
                .title(`§c🗑️ Delete ${territory.name}`)
                .body("§f⚠️ This action cannot be undone!")
                .toggle("§cConfirm deletion", false);

            const response = await form.show(player);

            if (!response.cancelled && response.formValues[0]) {
                const result = this.claimManager.deleteClaim(territory.id, player.name);

                if (result.success) {
                    this.sendMessage(player, `§a✅ Claim deleted`);
                } else {
                    this.sendMessage(player, `§c❌ ${result.error}`);
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }

    /**
     * Show members menu
     */
    async showClaimMembersMenu(player, territory) {
        if (!this.FORMS_AVAILABLE) {
            return this.showClaimMembersFallback(player, territory);
        }

        try {
            const form = new ActionFormData()
                .title(`§6👥 ${territory.name} Members`)
                .body(`§fMembers: §6${territory.members.size}`)
                .button("➕ Add Member", "textures/ui/icon_add")
                .button("👤 View Members", "textures/ui/icon_info")
                .button("🗑️ Remove Member", "textures/ui/icon_delete");

            const response = await form.show(player);

            if (response.cancelled) return;

            switch (response.selection) {
                case 0: return this.showAddMemberForm(player, territory);
                case 1: return this.showClaimMembersFallback(player, territory);
                case 2: return this.showRemoveMemberForm(player, territory);
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showClaimMembersFallback(player, territory);
            }
        }
    }

    /**
     * Members fallback
     */
    showClaimMembersFallback(player, territory) {
        this.sendMessage(player, `§6========== 👥 Members ==========`);
        this.sendMessage(player, `§fOwner: §6${territory.ownerName}`);

        if (territory.members.size === 0) {
            this.sendMessage(player, "§7No additional members");
            return;
        }

        for (const [memberName, memberData] of territory.members.entries()) {
            this.sendMessage(player, `§f${memberName} §7- ${memberData.role}`);
        }
    }

    /**
     * Show add member form
     */
    async showAddMemberForm(player, territory) {
        if (!this.FORMS_AVAILABLE) {
            return this.sendMessage(player, "§fUse: /lc add <#> <player> [role]");
        }

        try {
            const form = new ModalFormData()
                .title("§6➕ Add Member")
                .textField("§fPlayer Name:", "", "Player")
                .dropdown("§fRole:", ["member", "builder", "visitor"], 0);

            const response = await form.show(player);

            if (!response.cancelled) {
                const memberName = response.formValues[0];
                const role = ["member", "builder", "visitor"][response.formValues[1]];

                const result = this.claimManager.addMemberToClaim(territory.id, memberName, role, player.name);

                if (result.success) {
                    this.sendMessage(player, `§a✅ ${memberName} added as ${role}`);
                } else {
                    this.sendMessage(player, `§c❌ ${result.error}`);
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }

    /**
     * Show remove member form
     */
    async showRemoveMemberForm(player, territory) {
        if (territory.members.size === 0) {
            this.sendMessage(player, "§7No members to remove");
            return;
        }

        if (!this.FORMS_AVAILABLE) {
            return this.sendMessage(player, "§fUse: /lc remove <#> <player>");
        }

        try {
            const form = new ActionFormData()
                .title("§c🗑️ Remove Member")
                .body("§fSelect member to remove:");

            for (const memberName of territory.members.keys()) {
                form.button(memberName, "textures/ui/icon_player");
            }

            const response = await form.show(player);

            if (!response.cancelled) {
                const members = Array.from(territory.members.keys());
                const memberName = members[response.selection];

                const result = this.claimManager.removeMemberFromClaim(territory.id, memberName, player.name);

                if (result.success) {
                    this.sendMessage(player, `§a✅ ${memberName} removed`);
                } else {
                    this.sendMessage(player, `§c❌ ${result.error}`);
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }

    /**
     * Show balance menu
     */
    async showBalanceMenu(player) {
        const account = this.moneyManager.getPlayerAccount(player.name);
        const stats = this.moneyManager.getPlayerStats(player.name);

        if (!this.FORMS_AVAILABLE) {
            return this.showBalanceFallback(player, account, stats);
        }

        try {
            const form = new ActionFormData()
                .title("§6💰 Your Balance")
                .body(
                    `§fBalance: §6${account.balance}§f coins\n` +
                    `§fTotal Earned: §a${stats.totalEarned}§f coins\n` +
                    `§fTotal Spent: §c${stats.totalSpent}§f coins\n` +
                    `§fNet Worth: §e${stats.netWorth}§f coins`
                )
                .button("📊 Details", "textures/ui/icon_info")
                .button("📤 Transfer", "textures/ui/icon_transfer");

            const response = await form.show(player);

            if (!response.cancelled) {
                switch (response.selection) {
                    case 0: return this.showBalanceFallback(player, account, stats);
                    case 1: return this.showTransferForm(player);
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
                return this.showBalanceFallback(player, account, stats);
            }
        }
    }

    /**
     * Balance fallback
     */
    showBalanceFallback(player, account, stats) {
        this.sendMessage(player, "§6========== 💰 Balance ==========");
        this.sendMessage(player, `§fBalance: §6${account.balance} coins`);
        this.sendMessage(player, `§fTotal Earned: §a${stats.totalEarned} coins`);
        this.sendMessage(player, `§fTotal Spent: §c${stats.totalSpent} coins`);
        this.sendMessage(player, `§fNet Worth: §e${stats.netWorth} coins`);
        this.sendMessage(player, `§fTransactions: §7${stats.transactionCount}`);
    }

    /**
     * Show transfer form
     */
    async showTransferForm(player) {
        if (!this.FORMS_AVAILABLE) {
            return this.sendMessage(player, "§fUse: /lc transfer <player> <amount>");
        }

        try {
            const form = new ModalFormData()
                .title("§6📤 Transfer Coins")
                .textField("§fPlayer Name:", "", "Player")
                .textField("§fAmount:", "100", "100");

            const response = await form.show(player);

            if (!response.cancelled) {
                const targetName = response.formValues[0];
                const amount = parseInt(response.formValues[1]);

                if (isNaN(amount) || amount < 1) {
                    this.sendMessage(player, "§c❌ Invalid amount");
                    return;
                }

                if (this.moneyManager.transferMoney(player.name, targetName, amount)) {
                    this.sendMessage(player, `§a✅ Transferred ${amount} coins to ${targetName}`);
                } else {
                    this.sendMessage(player, "§c❌ Transfer failed");
                }
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }

    /**
     * Show settings menu
     */
    async showSettingsMenu(player) {
        if (!this.FORMS_AVAILABLE) {
            this.sendMessage(player, "§fSettings coming soon!");
            return;
        }

        try {
            const form = new ActionFormData()
                .title("§6⚙️ Settings")
                .body("§fComing soon!")
                .button("Close", "textures/ui/icon_close");

            await form.show(player);
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }

    /**
     * Show claim settings menu
     */
    async showClaimSettingsMenu(player, territory) {
        if (!this.FORMS_AVAILABLE) {
            this.sendMessage(player, "§fClaim settings coming soon!");
            return;
        }

        try {
            const form = new ActionFormData()
                .title(`§6⚙️ ${territory.name} Settings`)
                .button("PvP: " + (territory.pvp ? "§aON" : "§cOFF"), "textures/ui/icon_pvp")
                .button("Grief Protection: " + (territory.griefProtection ? "§aON" : "§cOFF"), "textures/ui/icon_shield")
                .button("Explosions: " + (territory.explosionProtection ? "§aON" : "§cOFF"), "textures/ui/icon_explosion");

            const response = await form.show(player);

            if (!response.cancelled) {
                switch (response.selection) {
                    case 0:
                        territory.pvp = !territory.pvp;
                        this.sendMessage(player, `§fPvP: ${territory.pvp ? "§aEnabled" : "§cDisabled"}`);
                        break;
                    case 1:
                        territory.griefProtection = !territory.griefProtection;
                        this.sendMessage(player, `§fGrief Protection: ${territory.griefProtection ? "§aEnabled" : "§cDisabled"}`);
                        break;
                    case 2:
                        territory.explosionProtection = !territory.explosionProtection;
                        this.sendMessage(player, `§fExplosion Protection: ${territory.explosionProtection ? "§aEnabled" : "§cDisabled"}`);
                        break;
                }
                this.claimManager.isDirty = true;
            }
        } catch (error) {
            if (error.message?.includes("not registered")) {
                this.FORMS_AVAILABLE = false;
            }
        }
    }
}
