/**
 * 👥 LANDCLAIM MEGA - Friends System
 * Player friendship management with invites and friend claims
 * @version 3.0.0
 */

export class FriendsSystem {
    constructor(database) {
        this.db = database;

        // === FRIEND DATA ===
        this.friendships = new Map(); // playerName -> Set<friendName>
        this.friendRequests = new Map(); // "from->to" -> timestamp
        this.blockedPlayers = new Map(); // playerName -> Set<blockedName>
        this.friendClaims = new Map(); // playerName -> [claimIds]

        // === STATISTICS ===
        this.stats = {
            totalFriendships: 0,
            totalRequests: 0,
            totalBlocks: 0
        };

        // === CONFIGURATION ===
        this.CONFIG = {
            maxFriends: 50,
            maxClaimsSharedPerFriend: 3,
            requestExpireTime: 604800000, // 7 days
            friendBonusCoins: 100
        };

        this.loadFriendsFromDatabase();
    }

    /**
     * Load friends from database
     */
    loadFriendsFromDatabase() {
        try {
            const stored = this.db.get("friends:all");
            if (stored) {
                // Load friendships
                if (stored.friendships) {
                    for (const [player, friends] of Object.entries(stored.friendships)) {
                        this.friendships.set(player, new Set(friends));
                    }
                }

                // Load friend requests
                if (stored.friendRequests) {
                    this.friendRequests = new Map(Object.entries(stored.friendRequests));
                }

                // Load blocked players
                if (stored.blockedPlayers) {
                    for (const [player, blocked] of Object.entries(stored.blockedPlayers)) {
                        this.blockedPlayers.set(player, new Set(blocked));
                    }
                }

                console.log(`[FriendsSystem] Loaded ${this.friendships.size} players with friendships`);
            }
        } catch (error) {
            console.error(`[FriendsSystem] Error loading friends: ${error}`);
        }
    }

    /**
     * Save friends to database
     */
    saveFriends() {
        try {
            const data = {
                friendships: {},
                friendRequests: Object.fromEntries(this.friendRequests),
                blockedPlayers: {}
            };

            for (const [player, friends] of this.friendships.entries()) {
                data.friendships[player] = Array.from(friends);
            }

            for (const [player, blocked] of this.blockedPlayers.entries()) {
                data.blockedPlayers[player] = Array.from(blocked);
            }

            this.db.set("friends:all", data);
        } catch (error) {
            console.error(`[FriendsSystem] Error saving friends: ${error}`);
        }
    }

    /**
     * Send friend request
     */
    sendFriendRequest(fromPlayer, toPlayer) {
        // === VALIDATION ===
        if (fromPlayer === toPlayer) {
            return { success: false, error: "You cannot send a friend request to yourself" };
        }

        // Check if already friends
        if (this.areFriends(fromPlayer, toPlayer)) {
            return { success: false, error: `You are already friends with ${toPlayer}` };
        }

        // Check if already requested
        const requestKey = `${fromPlayer}->${toPlayer}`;
        if (this.friendRequests.has(requestKey)) {
            return { success: false, error: "You already have a pending request to this player" };
        }

        // Check if blocked
        if (this.isBlocked(toPlayer, fromPlayer)) {
            return { success: false, error: `${toPlayer} has blocked you` };
        }

        // Check friend limit
        const toPlayerFriends = this.friendships.get(toPlayer) || new Set();
        if (toPlayerFriends.size >= this.CONFIG.maxFriends) {
            return { success: false, error: `${toPlayer} has reached maximum friends` };
        }

        // === SEND REQUEST ===
        this.friendRequests.set(requestKey, Date.now());
        this.stats.totalRequests++;
        this.saveFriends();

        return { success: true };
    }

    /**
     * Accept friend request
     */
    acceptFriendRequest(fromPlayer, toPlayer) {
        const requestKey = `${fromPlayer}->${toPlayer}`;

        if (!this.friendRequests.has(requestKey)) {
            return { success: false, error: "No friend request from this player" };
        }

        // Remove request
        this.friendRequests.delete(requestKey);

        // Add friendship both ways
        if (!this.friendships.has(fromPlayer)) {
            this.friendships.set(fromPlayer, new Set());
        }
        if (!this.friendships.has(toPlayer)) {
            this.friendships.set(toPlayer, new Set());
        }

        this.friendships.get(fromPlayer).add(toPlayer);
        this.friendships.get(toPlayer).add(fromPlayer);

        this.stats.totalFriendships++;
        this.saveFriends();

        return { success: true };
    }

    /**
     * Reject friend request
     */
    rejectFriendRequest(fromPlayer, toPlayer) {
        const requestKey = `${fromPlayer}->${toPlayer}`;

        if (!this.friendRequests.has(requestKey)) {
            return { success: false, error: "No friend request from this player" };
        }

        this.friendRequests.delete(requestKey);
        this.saveFriends();

        return { success: true };
    }

    /**
     * Remove friend
     */
    removeFriend(player, friendName) {
        if (!this.areFriends(player, friendName)) {
            return { success: false, error: `${friendName} is not your friend` };
        }

        const playerFriends = this.friendships.get(player);
        const friendFriends = this.friendships.get(friendName);

        playerFriends.delete(friendName);
        friendFriends.delete(player);

        this.stats.totalFriendships--;
        this.saveFriends();

        return { success: true };
    }

    /**
     * Block player
     */
    blockPlayer(blocker, blockee) {
        if (blocker === blockee) {
            return { success: false, error: "You cannot block yourself" };
        }

        if (!this.blockedPlayers.has(blocker)) {
            this.blockedPlayers.set(blocker, new Set());
        }

        const blocked = this.blockedPlayers.get(blocker);
        if (blocked.has(blockee)) {
            return { success: false, error: `You already blocked ${blockee}` };
        }

        blocked.add(blockee);

        // Remove friendship if they are friends
        this.removeFriend(blocker, blockee);

        this.stats.totalBlocks++;
        this.saveFriends();

        return { success: true };
    }

    /**
     * Unblock player
     */
    unblockPlayer(blocker, blockee) {
        if (!this.blockedPlayers.has(blocker)) {
            return { success: false, error: `You haven't blocked ${blockee}` };
        }

        const blocked = this.blockedPlayers.get(blocker);
        if (!blocked.has(blockee)) {
            return { success: false, error: `${blockee} is not in your block list` };
        }

        blocked.delete(blockee);
        this.saveFriends();

        return { success: true };
    }

    /**
     * Check if two players are friends
     */
    areFriends(player1, player2) {
        const friends = this.friendships.get(player1);
        return friends ? friends.has(player2) : false;
    }

    /**
     * Check if player is blocked
     */
    isBlocked(blocker, blockee) {
        const blocked = this.blockedPlayers.get(blocker);
        return blocked ? blocked.has(blockee) : false;
    }

    /**
     * Get friend list
     */
    getFriendList(playerName) {
        const friends = this.friendships.get(playerName);
        return friends ? Array.from(friends) : [];
    }

    /**
     * Get incoming friend requests
     */
    getIncomingRequests(playerName) {
        const requests = [];

        for (const [key, timestamp] of this.friendRequests.entries()) {
            const [from, to] = key.split("->");
            if (to === playerName) {
                // Check if expired (7 days)
                if (Date.now() - timestamp > this.CONFIG.requestExpireTime) {
                    this.friendRequests.delete(key);
                    continue;
                }

                requests.push({
                    from: from,
                    timestamp: timestamp,
                    daysOld: Math.floor((Date.now() - timestamp) / 86400000)
                });
            }
        }

        return requests;
    }

    /**
     * Get outgoing friend requests
     */
    getOutgoingRequests(playerName) {
        const requests = [];

        for (const [key, timestamp] of this.friendRequests.entries()) {
            const [from, to] = key.split("->");
            if (from === playerName) {
                // Check if expired
                if (Date.now() - timestamp > this.CONFIG.requestExpireTime) {
                    this.friendRequests.delete(key);
                    continue;
                }

                requests.push({
                    to: to,
                    timestamp: timestamp,
                    daysOld: Math.floor((Date.now() - timestamp) / 86400000)
                });
            }
        }

        return requests;
    }

    /**
     * Get blocked list
     */
    getBlockedList(playerName) {
        const blocked = this.blockedPlayers.get(playerName);
        return blocked ? Array.from(blocked) : [];
    }

    /**
     * Share claim with friend
     */
    shareClaimWithFriend(ownerName, friendName, claimId) {
        if (!this.areFriends(ownerName, friendName)) {
            return { success: false, error: `${friendName} is not your friend` };
        }

        if (!this.friendClaims.has(ownerName)) {
            this.friendClaims.set(ownerName, []);
        }

        const sharedClaims = this.friendClaims.get(ownerName);
        if (sharedClaims.length >= this.CONFIG.maxClaimsSharedPerFriend) {
            return {
                success: false,
                error: `You can only share ${this.CONFIG.maxClaimsSharedPerFriend} claims per friend`
            };
        }

        if (!sharedClaims.includes(claimId)) {
            sharedClaims.push(claimId);
        }

        return { success: true };
    }

    /**
     * Unshare claim from friend
     */
    unshareClaimFromFriend(ownerName, friendName, claimId) {
        const sharedClaims = this.friendClaims.get(ownerName);
        if (!sharedClaims || !sharedClaims.includes(claimId)) {
            return { success: false, error: "Claim is not shared with this friend" };
        }

        sharedClaims.splice(sharedClaims.indexOf(claimId), 1);
        return { success: true };
    }

    /**
     * Check if claim is shared with friend
     */
    isClaimSharedWithFriend(ownerName, friendName, claimId) {
        if (!this.areFriends(ownerName, friendName)) {
            return false;
        }

        const sharedClaims = this.friendClaims.get(ownerName);
        return sharedClaims ? sharedClaims.includes(claimId) : false;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalPlayers: this.friendships.size,
            totalFriendships: this.stats.totalFriendships,
            totalRequests: this.stats.totalRequests,
            totalBlocks: this.stats.totalBlocks,
            pendingRequests: this.friendRequests.size,
            averageFriendsPerPlayer: this.friendships.size > 0 ?
                Math.round(this.stats.totalFriendships / this.friendships.size) : 0
        };
    }

    /**
     * Get player profile info
     */
    getPlayerProfile(playerName) {
        const friends = this.getFriendList(playerName);
        const blocked = this.getBlockedList(playerName);

        return {
            playerName: playerName,
            friendCount: friends.length,
            blockedCount: blocked.length,
            incomingRequests: this.getIncomingRequests(playerName).length,
            outgoingRequests: this.getOutgoingRequests(playerName).length
        };
    }

    /**
     * Clean expired requests
     */
    cleanExpiredRequests() {
        const now = Date.now();
        let removed = 0;

        for (const [key, timestamp] of this.friendRequests.entries()) {
            if (now - timestamp > this.CONFIG.requestExpireTime) {
                this.friendRequests.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            this.saveFriends();
            console.log(`[FriendsSystem] Cleaned ${removed} expired requests`);
        }

        return removed;
    }

    /**
     * Get friends summary
     */
    getFriendsSummary(playerName) {
        const friends = this.getFriendList(playerName);
        const incoming = this.getIncomingRequests(playerName);
        const outgoing = this.getOutgoingRequests(playerName);

        return {
            friends: friends.length,
            incomingRequests: incoming.length,
            outgoingRequests: outgoing.length,
            blocked: this.getBlockedList(playerName).length
        };
    }
}
