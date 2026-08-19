/**
 * 🔐 LANDCLAIM MEGA v4 - Advanced Permission System
 * Granular, customizable permission management for territories
 * @version 4.0.0 - PRODUCTION READY
 */

export class AdvancedPermissionSystem {
    constructor(database) {
        this.database = database;

        // === PERMISSION CATEGORIES ===
        this.PERMISSIONS = {
            // Building permissions
            BUILD: "build",
            BREAK: "break",
            PLACE: "place",
            INTERACT: "interact",

            // Container permissions
            CONTAINER: "container",
            CHEST: "chest",
            BARREL: "barrel",
            HOPPER: "hopper",

            // Mechanism permissions
            BUTTON: "button",
            LEVER: "lever",
            DOOR: "door",
            REDSTONE: "redstone",
            REPEATER: "repeater",
            COMPARATOR: "comparator",

            // Combat permissions
            COMBAT: "combat",
            PVP: "pvp",
            DAMAGE_ANIMALS: "damage_animals",
            DAMAGE_MOBS: "damage_mobs",

            // Management permissions
            MANAGE_MEMBERS: "manage_members",
            MANAGE_WARPS: "manage_warps",
            MANAGE_SETTINGS: "manage_settings",
            EDIT_CLAIM: "edit_claim",
            DELETE_CLAIM: "delete_claim",
            TRANSFER_CLAIM: "transfer_claim",

            // Access permissions
            ENTER: "enter",
            VIEW: "view",
            VISIT: "visit",

            // Admin permissions
            ADMIN: "admin"
        };

        // === DEFAULT ROLES ===
        this.DEFAULT_ROLES = {
            owner: {
                build: true,
                break: true,
                place: true,
                interact: true,
                container: true,
                chest: true,
                barrel: true,
                hopper: true,
                button: true,
                lever: true,
                door: true,
                redstone: true,
                repeater: true,
                comparator: true,
                combat: true,
                pvp: true,
                damage_animals: true,
                damage_mobs: true,
                manage_members: true,
                manage_warps: true,
                manage_settings: true,
                edit_claim: true,
                delete_claim: true,
                transfer_claim: true,
                enter: true,
                view: true,
                visit: true,
                admin: true
            },
            member: {
                build: true,
                break: true,
                place: true,
                interact: true,
                container: true,
                chest: true,
                barrel: true,
                hopper: true,
                button: true,
                lever: true,
                door: true,
                redstone: true,
                repeater: true,
                comparator: true,
                combat: true,
                pvp: false,
                damage_animals: true,
                damage_mobs: true,
                manage_members: false,
                manage_warps: false,
                manage_settings: false,
                edit_claim: false,
                delete_claim: false,
                transfer_claim: false,
                enter: true,
                view: true,
                visit: true,
                admin: false
            },
            builder: {
                build: true,
                break: true,
                place: true,
                interact: false,
                container: false,
                chest: false,
                barrel: false,
                hopper: false,
                button: false,
                lever: false,
                door: true,
                redstone: false,
                repeater: false,
                comparator: false,
                combat: false,
                pvp: false,
                damage_animals: false,
                damage_mobs: false,
                manage_members: false,
                manage_warps: false,
                manage_settings: false,
                edit_claim: false,
                delete_claim: false,
                transfer_claim: false,
                enter: true,
                view: true,
                visit: true,
                admin: false
            },
            visitor: {
                build: false,
                break: false,
                place: false,
                interact: false,
                container: false,
                chest: false,
                barrel: false,
                hopper: false,
                button: false,
                lever: false,
                door: true,
                redstone: false,
                repeater: false,
                comparator: false,
                combat: false,
                pvp: false,
                damage_animals: false,
                damage_mobs: false,
                manage_members: false,
                manage_warps: false,
                manage_settings: false,
                edit_claim: false,
                delete_claim: false,
                transfer_claim: false,
                enter: true,
                view: true,
                visit: true,
                admin: false
            },
            guard: {
                build: false,
                break: false,
                place: false,
                interact: false,
                container: false,
                chest: false,
                barrel: false,
                hopper: false,
                button: true,
                lever: false,
                door: true,
                redstone: false,
                repeater: false,
                comparator: false,
                combat: true,
                pvp: true,
                damage_animals: true,
                damage_mobs: true,
                manage_members: false,
                manage_warps: false,
                manage_settings: false,
                edit_claim: false,
                delete_claim: false,
                transfer_claim: false,
                enter: true,
                view: true,
                visit: true,
                admin: false
            },
            moderator: {
                build: true,
                break: true,
                place: true,
                interact: true,
                container: true,
                chest: true,
                barrel: true,
                hopper: true,
                button: true,
                lever: true,
                door: true,
                redstone: true,
                repeater: true,
                comparator: true,
                combat: true,
                pvp: true,
                damage_animals: true,
                damage_mobs: true,
                manage_members: true,
                manage_warps: true,
                manage_settings: true,
                edit_claim: true,
                delete_claim: false,
                transfer_claim: false,
                enter: true,
                view: true,
                visit: true,
                admin: false
            }
        };

        // === ROLE STORAGE ===
        this.customRoles = new Map();
        this.memberRoles = new Map(); // playerName -> { claimId -> role }

        this.loadPermissionData();
    }

    /**
     * Load permission data
     */
    loadPermissionData() {
        try {
            const saved = this.database.get("permissions:system");
            if (saved) {
                this.customRoles = new Map(saved.customRoles || []);
                this.memberRoles = new Map(saved.memberRoles || []);
            }
            console.log(`[Permissions] Loaded ${this.customRoles.size} custom roles`);
        } catch (error) {
            console.error(`[Permissions] Load failed: ${error}`);
        }
    }

    /**
     * Save permission data
     */
    savePermissionData() {
        try {
            this.database.set("permissions:system", {
                customRoles: Array.from(this.customRoles.entries()),
                memberRoles: Array.from(this.memberRoles.entries()),
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[Permissions] Save failed: ${error}`);
        }
    }

    /**
     * Create custom role
     */
    createCustomRole(roleName, baseRole, overrides = {}) {
        const basePerms = this.DEFAULT_ROLES[baseRole] || this.DEFAULT_ROLES.member;
        const customPerms = { ...basePerms, ...overrides };
        this.customRoles.set(roleName, customPerms);
        this.savePermissionData();
        return { success: true, role: roleName };
    }

    /**
     * Get role permissions
     */
    getRolePermissions(roleName) {
        if (this.DEFAULT_ROLES[roleName]) {
            return this.DEFAULT_ROLES[roleName];
        }
        return this.customRoles.get(roleName) || null;
    }

    /**
     * Check if player has permission
     */
    hasPermission(playerName, claimId, permission, claim) {
        // Owner always has all permissions
        if (claim && claim.ownerName === playerName) {
            return true;
        }

        // Get player's role in claim
        const memberData = claim.members.get(playerName);
        if (!memberData) {
            return false; // Not a member, no permission
        }

        const role = memberData.role;
        const perms = this.getRolePermissions(role);

        if (!perms) {
            return false;
        }

        return perms[permission] === true;
    }

    /**
     * Grant permission to player
     */
    grantPermission(playerName, claim, permission) {
        const member = claim.members.get(playerName);
        if (!member) {
            return { success: false, error: "Player not in claim" };
        }

        // Create custom role for this player if needed
        const customRoleName = `custom_${playerName}_${claim.id}`;
        let perms = this.getRolePermissions(member.role);

        if (!perms) {
            perms = { ...this.DEFAULT_ROLES.member };
        }

        perms = { ...perms };
        perms[permission] = true;

        this.customRoles.set(customRoleName, perms);
        member.role = customRoleName;

        this.savePermissionData();
        return { success: true };
    }

    /**
     * Revoke permission from player
     */
    revokePermission(playerName, claim, permission) {
        const member = claim.members.get(playerName);
        if (!member) {
            return { success: false, error: "Player not in claim" };
        }

        const customRoleName = `custom_${playerName}_${claim.id}`;
        let perms = this.getRolePermissions(member.role);

        if (!perms) {
            perms = { ...this.DEFAULT_ROLES.member };
        }

        perms = { ...perms };
        perms[permission] = false;

        this.customRoles.set(customRoleName, perms);
        member.role = customRoleName;

        this.savePermissionData();
        return { success: true };
    }

    /**
     * Set role for member
     */
    setMemberRole(playerName, claim, roleName) {
        const member = claim.members.get(playerName);
        if (!member) {
            return { success: false, error: "Player not in claim" };
        }

        if (!this.getRolePermissions(roleName)) {
            return { success: false, error: "Invalid role" };
        }

        member.role = roleName;
        claim.logEvent(`${playerName}'s role changed to ${roleName}`);
        return { success: true };
    }

    /**
     * Get all permissions for player in claim
     */
    getPlayerPermissions(playerName, claim) {
        const member = claim.members.get(playerName);
        if (!member) {
            return {};
        }

        return this.getRolePermissions(member.role) || {};
    }

    /**
     * Get available roles
     */
    getAvailableRoles() {
        return {
            default: Object.keys(this.DEFAULT_ROLES),
            custom: Array.from(this.customRoles.keys())
        };
    }

    /**
     * Get permission categories
     */
    getPermissionCategories() {
        return {
            building: ["build", "break", "place", "interact"],
            containers: ["container", "chest", "barrel", "hopper"],
            mechanisms: ["button", "lever", "door", "redstone", "repeater", "comparator"],
            combat: ["combat", "pvp", "damage_animals", "damage_mobs"],
            management: ["manage_members", "manage_warps", "manage_settings", "edit_claim", "delete_claim", "transfer_claim"],
            access: ["enter", "view", "visit"],
            admin: ["admin"]
        };
    }

    /**
     * List all roles with descriptions
     */
    listRoles() {
        const list = [];

        for (const [name, perms] of Object.entries(this.DEFAULT_ROLES)) {
            const allowedPerms = Object.keys(perms).filter(p => perms[p]);
            list.push({
                name: name,
                type: "default",
                permissionCount: allowedPerms.length,
                permissions: allowedPerms
            });
        }

        for (const [name, perms] of this.customRoles.entries()) {
            const allowedPerms = Object.keys(perms).filter(p => perms[p]);
            list.push({
                name: name,
                type: "custom",
                permissionCount: allowedPerms.length,
                permissions: allowedPerms
            });
        }

        return list;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            defaultRoles: Object.keys(this.DEFAULT_ROLES).length,
            customRoles: this.customRoles.size,
            totalPermissions: Object.keys(this.PERMISSIONS).length,
            totalMembersWithRoles: this.memberRoles.size
        };
    }
}
