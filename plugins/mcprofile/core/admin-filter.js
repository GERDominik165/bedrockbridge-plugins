/**
 * Admin Filter & Permission Manager
 * @version 2.0.0
 *
 * Handles admin tag validation and permission checking
 * Supports multiple permission levels and tag-based access control
 */

class AdminFilter {
    constructor() {
        this.adminTags = ['admin', 'operator', 'owner', 'moderator'];
        this.permissionLevels = {
            'owner': 5,
            'admin': 4,
            'moderator': 3,
            'helper': 2,
            'member': 1,
            'guest': 0
        };
    }

    /**
     * Check if player has admin tag
     */
    isAdmin(player) {
        if (!player || typeof player !== 'object') {
            return false;
        }

        try {
            // Check for admin tag
            return this.hasTag(player, 'admin');
        } catch (error) {
            console.error(`Error checking admin status: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if player has specific tag
     */
    hasTag(player, tag) {
        try {
            if (!player.getTags) {
                return false;
            }

            const tags = player.getTags();
            return tags.includes(tag);
        } catch (error) {
            console.error(`Error checking tag: ${error.message}`);
            return false;
        }
    }

    /**
     * Get all tags for player
     */
    getTags(player) {
        try {
            if (!player.getTags) {
                return [];
            }

            return player.getTags();
        } catch (error) {
            console.error(`Error getting tags: ${error.message}`);
            return [];
        }
    }

    /**
     * Check if player has any admin-related tag
     */
    hasAdminTags(player) {
        try {
            const playerTags = this.getTags(player);
            return playerTags.some(tag => this.adminTags.includes(tag));
        } catch (error) {
            console.error(`Error checking admin tags: ${error.message}`);
            return false;
        }
    }

    /**
     * Get permission level for player
     */
    getPermissionLevel(player) {
        try {
            const playerTags = this.getTags(player);
            let maxLevel = 0;

            for (const tag of playerTags) {
                const level = this.permissionLevels[tag] || 0;
                if (level > maxLevel) {
                    maxLevel = level;
                }
            }

            return maxLevel;
        } catch (error) {
            console.error(`Error getting permission level: ${error.message}`);
            return 0;
        }
    }

    /**
     * Check if player has permission for action
     */
    hasPermission(player, requiredLevel) {
        const playerLevel = this.getPermissionLevel(player);
        return playerLevel >= requiredLevel;
    }

    /**
     * Check if player can execute command
     */
    canExecuteCommand(player, commandLevel = 4) {
        return this.hasPermission(player, commandLevel);
    }

    /**
     * Validate admin credentials
     */
    validateAdmin(player) {
        return {
            isAdmin: this.isAdmin(player),
            hasAdminTags: this.hasAdminTags(player),
            permissionLevel: this.getPermissionLevel(player),
            tags: this.getTags(player)
        };
    }

    /**
     * Add admin tag to player
     */
    addAdminTag(player) {
        try {
            if (player.addTag) {
                player.addTag('admin');
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error adding admin tag: ${error.message}`);
            return false;
        }
    }

    /**
     * Remove admin tag from player
     */
    removeAdminTag(player) {
        try {
            if (player.removeTag) {
                player.removeTag('admin');
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error removing admin tag: ${error.message}`);
            return false;
        }
    }

    /**
     * Get permission level name
     */
    getPermissionLevelName(level) {
        for (const [name, lvl] of Object.entries(this.permissionLevels)) {
            if (lvl === level) {
                return name;
            }
        }
        return 'unknown';
    }

    /**
     * Check if admin has specific command permission
     */
    hasCommandPermission(player, command) {
        const commandPermissions = {
            'mcprofile': 4,          // Admin only
            'mcprofile-reload': 5,   // Owner only
            'mcprofile-cache': 4,    // Admin only
            'mcprofile-info': 2      // Helper and above
        };

        const requiredLevel = commandPermissions[command] || 4;
        return this.hasPermission(player, requiredLevel);
    }

    /**
     * Filter players by permission level
     */
    filterPlayersByLevel(players, minLevel) {
        return players.filter(player => {
            return this.hasPermission(player, minLevel);
        });
    }

    /**
     * Get admin list
     */
    getAdminList(players) {
        return players.filter(player => this.isAdmin(player));
    }

    /**
     * Validate player for profile access
     */
    validateProfileAccess(player) {
        return {
            allowed: this.isAdmin(player),
            reason: this.isAdmin(player) ? 'Admin access granted' : 'Admin tag required for profile access',
            level: this.getPermissionLevel(player)
        };
    }
}

export default AdminFilter;
