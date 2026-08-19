/**
 * PermissionManager - Role-based permissions
 */

class PermissionManager {
    constructor(rankManager) {
        this.rankManager = rankManager;
        this.customPermissions = new Map();
    }

    hasPermission(playerName, permission) {
        // Check rank-based permissions
        if (this.rankManager.hasPermission(playerName, permission)) {
            return true;
        }

        // Check custom permissions
        const perms = this.customPermissions.get(playerName.toLowerCase()) || [];
        return perms.includes(permission) || perms.includes('*');
    }

    grantPermission(playerName, permission) {
        const name = playerName.toLowerCase();
        const perms = this.customPermissions.get(name) || [];
        if (!perms.includes(permission)) {
            perms.push(permission);
            this.customPermissions.set(name, perms);
        }
    }

    revokePermission(playerName, permission) {
        const name = playerName.toLowerCase();
        const perms = this.customPermissions.get(name) || [];
        this.customPermissions.set(name, perms.filter(p => p !== permission));
    }

    getPlayerPermissions(playerName) {
        return this.customPermissions.get(playerName.toLowerCase()) || [];
    }

    saveToDatabase(db) {
        db.set('permissionManager', JSON.stringify(Array.from(this.customPermissions.entries())));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('permissionManager') || '[]');
            this.customPermissions = new Map(data);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = PermissionManager;
