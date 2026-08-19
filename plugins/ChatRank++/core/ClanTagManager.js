/**
 * ClanTagManager - Manage clan/team tags and affiliations
 */

class ClanTagManager {
    constructor() {
        this.clans = new Map();
        this.playerClans = new Map();
        this.clanInvites = new Map();
    }

    /**
     * Create a new clan
     */
    createClan(clanId, clanData) {
        if (this.clans.has(clanId)) return false;

        this.clans.set(clanId, {
            id: clanId,
            name: clanData.name || clanId,
            tag: clanData.tag || '',
            color: clanData.color || '§7',
            icon: clanData.icon || '',
            owner: clanData.owner,
            members: [clanData.owner],
            officers: [],
            createdAt: Date.now(),
            level: 1,
            xp: 0,
            settings: {
                public: false,
                friendlyFire: false,
                ...clanData.settings
            }
        });

        this.playerClans.set(clanData.owner.toLowerCase(), clanId);
        return true;
    }

    /**
     * Delete a clan
     */
    deleteClan(clanId) {
        const clan = this.clans.get(clanId);
        if (!clan) return false;

        // Remove clan from all members
        clan.members.forEach(member => {
            this.playerClans.delete(member.toLowerCase());
        });

        this.clans.delete(clanId);
        return true;
    }

    /**
     * Add player to clan
     */
    addPlayerToClan(playerName, clanId) {
        const clan = this.clans.get(clanId);
        if (!clan) return false;

        if (!clan.members.includes(playerName)) {
            clan.members.push(playerName);
        }

        this.playerClans.set(playerName.toLowerCase(), clanId);
        return true;
    }

    /**
     * Remove player from clan
     */
    removePlayerFromClan(playerName) {
        const name = playerName.toLowerCase();
        const clanId = this.playerClans.get(name);
        if (!clanId) return false;

        const clan = this.clans.get(clanId);
        if (clan) {
            clan.members = clan.members.filter(m => m.toLowerCase() !== name);
            clan.officers = clan.officers.filter(m => m.toLowerCase() !== name);
        }

        this.playerClans.delete(name);
        return true;
    }

    /**
     * Get player clan
     */
    getPlayerClan(playerName) {
        const clanId = this.playerClans.get(playerName.toLowerCase());
        return clanId ? this.clans.get(clanId) : null;
    }

    /**
     * Get clan tag display
     */
    getClanTagDisplay(playerName) {
        const clan = this.getPlayerClan(playerName);
        if (!clan) return '';

        return `${clan.color}[${clan.tag}]§r ${clan.icon}`;
    }

    /**
     * Get all clans
     */
    getAllClans() {
        return Array.from(this.clans.values());
    }

    /**
     * Get clan by ID
     */
    getClan(clanId) {
        return this.clans.get(clanId);
    }

    /**
     * Update clan data
     */
    updateClan(clanId, updates) {
        const clan = this.clans.get(clanId);
        if (!clan) return false;

        Object.assign(clan, updates);
        return true;
    }

    /**
     * Promote player to officer
     */
    promoteToOfficer(clanId, playerName) {
        const clan = this.clans.get(clanId);
        if (!clan || !clan.members.includes(playerName)) return false;

        if (!clan.officers.includes(playerName)) {
            clan.officers.push(playerName);
        }
        return true;
    }

    /**
     * Demote player from officer
     */
    demoteFromOfficer(clanId, playerName) {
        const clan = this.clans.get(clanId);
        if (!clan) return false;

        clan.officers = clan.officers.filter(o => o !== playerName);
        return true;
    }

    /**
     * Check if player is clan owner
     */
    isOwner(playerName, clanId) {
        const clan = this.clans.get(clanId);
        return clan && clan.owner.toLowerCase() === playerName.toLowerCase();
    }

    /**
     * Check if player is clan officer
     */
    isOfficer(playerName, clanId) {
        const clan = this.clans.get(clanId);
        return clan && clan.officers.some(o => o.toLowerCase() === playerName.toLowerCase());
    }

    /**
     * Invite player to clan
     */
    invitePlayer(clanId, playerName, invitedBy) {
        const invites = this.clanInvites.get(playerName.toLowerCase()) || [];
        invites.push({
            clanId,
            invitedBy,
            timestamp: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        });
        this.clanInvites.set(playerName.toLowerCase(), invites);
    }

    /**
     * Get pending invites for player
     */
    getInvites(playerName) {
        const invites = this.clanInvites.get(playerName.toLowerCase()) || [];
        const now = Date.now();
        return invites.filter(inv => inv.expiresAt > now);
    }

    /**
     * Clear invite
     */
    clearInvite(playerName, clanId) {
        const name = playerName.toLowerCase();
        const invites = this.clanInvites.get(name) || [];
        this.clanInvites.set(name, invites.filter(inv => inv.clanId !== clanId));
    }

    /**
     * Save to database
     */
    saveToDatabase(db) {
        const data = {
            clans: Array.from(this.clans.entries()),
            playerClans: Array.from(this.playerClans.entries())
        };
        db.set('clanTagManager', JSON.stringify(data));
    }

    /**
     * Load from database
     */
    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('clanTagManager') || '{}');
            if (data.clans) {
                this.clans = new Map(data.clans);
            }
            if (data.playerClans) {
                this.playerClans = new Map(data.playerClans);
            }
            return true;
        } catch (error) {
            console.error('Failed to load clan data:', error);
            return false;
        }
    }
}

module.exports = ClanTagManager;
