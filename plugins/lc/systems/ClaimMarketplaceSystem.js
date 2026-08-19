/**
 * 🛍️ LANDCLAIM MEGA v4 - Claim Marketplace System
 * Buy, sell, auction and trade claimed territories
 * @version 4.0.0 - PRODUCTION READY
 */

export class ClaimMarketplaceSystem {
    constructor(claimManager, moneyManager, database) {
        this.claimManager = claimManager;
        this.moneyManager = moneyManager;
        this.database = database;

        // === MARKETPLACE STATE ===
        this.listings = new Map(); // claimId -> listing
        this.auctions = new Map(); // claimId -> auction
        this.transactions = []; // history
        this.escrow = new Map(); // playerName -> balance

        // === CONFIGURATION ===
        this.config = {
            listingFee: 100, // coins to list
            saleCommission: 0.05, // 5% commission
            auctionMinDuration: 3,  // 3 days
            auctionMaxDuration: 30, // 30 days
            maxListingsPerPlayer: 5,
            minAskingPrice: 1000,
            maxAskingPrice: 10000000,
            enableEscrow: true
        };

        this.loadMarketplaceData();
    }

    /**
     * Load marketplace data from database
     */
    loadMarketplaceData() {
        try {
            const saved = this.database.get("marketplace:data");
            if (saved) {
                this.listings = new Map(saved.listings || []);
                this.auctions = new Map(saved.auctions || []);
                this.transactions = saved.transactions || [];
                this.escrow = new Map(saved.escrow || []);
            }
            console.log(`[Marketplace] Loaded ${this.listings.size} listings and ${this.auctions.size} auctions`);
        } catch (error) {
            console.error(`[Marketplace] Load failed: ${error}`);
        }
    }

    /**
     * Save marketplace data
     */
    saveMarketplaceData() {
        try {
            this.database.set("marketplace:data", {
                listings: Array.from(this.listings.entries()),
                auctions: Array.from(this.auctions.entries()),
                transactions: this.transactions,
                escrow: Array.from(this.escrow.entries()),
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[Marketplace] Save failed: ${error}`);
        }
    }

    /**
     * List claim for sale
     */
    listClaimForSale(claimId, askingPrice, sellerName) {
        const claim = this.claimManager.getClaim(claimId);
        if (!claim || claim.ownerName !== sellerName) {
            return { success: false, error: "Not claim owner" };
        }

        if (askingPrice < this.config.minAskingPrice || askingPrice > this.config.maxAskingPrice) {
            return { success: false, error: "Price out of range" };
        }

        const playerListings = Array.from(this.listings.values())
            .filter(l => l.sellerName === sellerName);
        if (playerListings.length >= this.config.maxListingsPerPlayer) {
            return { success: false, error: "Max listings reached" };
        }

        // Deduct listing fee
        const playerBalance = this.moneyManager.getPlayerBalance(sellerName);
        if (playerBalance.balance < this.config.listingFee) {
            return { success: false, error: "Not enough coins for listing fee" };
        }

        this.moneyManager.deductMoney(sellerName, this.config.listingFee);

        const listing = {
            claimId: claimId,
            sellerName: sellerName,
            askingPrice: askingPrice,
            listedDate: Date.now(),
            lastUpdated: Date.now(),
            views: 0,
            interested: []
        };

        this.listings.set(claimId, listing);
        claim.listOnMarketplace(askingPrice);
        this.saveMarketplaceData();

        return { success: true, listing: listing };
    }

    /**
     * Remove listing
     */
    removeListingfromSale(claimId, playerName) {
        const listing = this.listings.get(claimId);
        if (!listing || listing.sellerName !== playerName) {
            return { success: false, error: "Not your listing" };
        }

        this.listings.delete(claimId);
        const claim = this.claimManager.getClaim(claimId);
        if (claim) {
            claim.marketplace.isForSale = false;
        }
        this.saveMarketplaceData();

        return { success: true };
    }

    /**
     * Buy claim directly
     */
    buyClaim(claimId, buyerName) {
        const listing = this.listings.get(claimId);
        if (!listing) {
            return { success: false, error: "Not for sale" };
        }

        const claim = this.claimManager.getClaim(claimId);
        const buyerBalance = this.moneyManager.getPlayerBalance(buyerName).balance;

        if (buyerBalance < listing.askingPrice) {
            return { success: false, error: "Not enough coins" };
        }

        // Transfer money
        this.moneyManager.deductMoney(buyerName, listing.askingPrice);
        const commission = Math.floor(listing.askingPrice * this.config.saleCommission);
        const sellerPayout = listing.askingPrice - commission;
        this.moneyManager.addMoney(listing.sellerName, sellerPayout);

        // Transfer claim
        const oldOwner = claim.ownerName;
        claim.ownerName = buyerName;
        claim.members.clear();
        claim.marketplace.isForSale = false;
        claim.addMember(buyerName, "owner");
        claim.logEvent(`Ownership transferred from ${oldOwner} to ${buyerName} via marketplace`);

        // Record transaction
        const transaction = {
            type: "direct_sale",
            claimId: claimId,
            seller: listing.sellerName,
            buyer: buyerName,
            price: listing.askingPrice,
            commission: commission,
            timestamp: Date.now()
        };
        this.transactions.push(transaction);
        this.listings.delete(claimId);

        this.saveMarketplaceData();
        return { success: true, transaction: transaction };
    }

    /**
     * Start auction for claim
     */
    startAuction(claimId, startPrice, durationDays, sellerName) {
        const listing = this.listings.get(claimId);
        if (!listing || listing.sellerName !== sellerName) {
            return { success: false, error: "Not your listing" };
        }

        if (durationDays < this.config.auctionMinDuration || durationDays > this.config.auctionMaxDuration) {
            return { success: false, error: "Duration out of range" };
        }

        const auction = {
            claimId: claimId,
            sellerName: sellerName,
            startPrice: startPrice,
            highestBid: startPrice,
            highestBidder: null,
            startDate: Date.now(),
            endDate: Date.now() + (durationDays * 86400000),
            bids: [],
            isActive: true
        };

        this.auctions.set(claimId, auction);
        const claim = this.claimManager.getClaim(claimId);
        if (claim) {
            claim.startAuction(startPrice, durationDays);
        }
        this.saveMarketplaceData();

        return { success: true, auction: auction };
    }

    /**
     * Place bid on auction
     */
    placeBid(claimId, bidderName, bidAmount) {
        const auction = this.auctions.get(claimId);
        if (!auction || !auction.isActive) {
            return { success: false, error: "Auction not active" };
        }

        if (Date.now() > auction.endDate) {
            return { success: false, error: "Auction ended" };
        }

        if (bidAmount <= auction.highestBid) {
            return { success: false, error: "Bid too low" };
        }

        const bidderBalance = this.moneyManager.getPlayerBalance(bidderName).balance;
        if (bidderBalance < bidAmount) {
            return { success: false, error: "Not enough coins" };
        }

        // Place bid in escrow
        this.moneyManager.deductMoney(bidderName, bidAmount);
        if (!this.escrow.has(bidderName)) {
            this.escrow.set(bidderName, 0);
        }
        this.escrow.set(bidderName, (this.escrow.get(bidderName) || 0) + bidAmount);

        // Record previous bid refund
        if (auction.highestBidder) {
            this.escrow.set(auction.highestBidder,
                (this.escrow.get(auction.highestBidder) || 0) + auction.highestBid);
            this.moneyManager.addMoney(auction.highestBidder, auction.highestBid);
        }

        auction.highestBid = bidAmount;
        auction.highestBidder = bidderName;
        auction.bids.push({
            bidder: bidderName,
            amount: bidAmount,
            timestamp: Date.now()
        });

        this.saveMarketplaceData();
        return { success: true, highestBid: bidAmount };
    }

    /**
     * Finalize auction
     */
    finalizeAuction(claimId) {
        const auction = this.auctions.get(claimId);
        if (!auction) {
            return { success: false, error: "Auction not found" };
        }

        if (Date.now() < auction.endDate) {
            return { success: false, error: "Auction still active" };
        }

        auction.isActive = false;

        if (!auction.highestBidder) {
            // No bids, return listing to seller
            return { success: true, result: "no_bids" };
        }

        // Transfer claim to winner
        const claim = this.claimManager.getClaim(claimId);
        const commission = Math.floor(auction.highestBid * this.config.saleCommission);
        const sellerPayout = auction.highestBid - commission;

        claim.ownerName = auction.highestBidder;
        claim.members.clear();
        claim.addMember(auction.highestBidder, "owner");
        claim.marketplace.auctionActive = false;

        this.moneyManager.addMoney(auction.sellerName, sellerPayout);
        this.escrow.set(auction.highestBidder, (this.escrow.get(auction.highestBidder) || 0) - auction.highestBid);

        // Record transaction
        const transaction = {
            type: "auction_win",
            claimId: claimId,
            seller: auction.sellerName,
            buyer: auction.highestBidder,
            price: auction.highestBid,
            commission: commission,
            bids: auction.bids.length,
            timestamp: Date.now()
        };
        this.transactions.push(transaction);

        this.auctions.delete(claimId);
        this.listings.delete(claimId);
        this.saveMarketplaceData();

        return { success: true, transaction: transaction };
    }

    /**
     * Get marketplace statistics
     */
    getMarketplaceStats() {
        const totalSalesValue = this.transactions.reduce((sum, t) => sum + t.price, 0);
        const totalCommissions = this.transactions.reduce((sum, t) => sum + t.commission, 0);

        return {
            activeListings: this.listings.size,
            activeAuctions: Array.from(this.auctions.values()).filter(a => a.isActive).length,
            totalTransactions: this.transactions.length,
            totalSalesValue: totalSalesValue,
            totalCommissions: totalCommissions,
            averageSalePrice: this.transactions.length > 0 ? Math.floor(totalSalesValue / this.transactions.length) : 0,
            topListedPrices: this.getTopPrices(),
            recentTransactions: this.transactions.slice(-10)
        };
    }

    /**
     * Get top listed prices
     */
    getTopPrices(limit = 5) {
        return Array.from(this.listings.values())
            .sort((a, b) => b.askingPrice - a.askingPrice)
            .slice(0, limit)
            .map(l => ({ claimId: l.claimId, price: l.askingPrice, seller: l.sellerName }));
    }

    /**
     * Search marketplace listings
     */
    searchListings(filters = {}) {
        let results = Array.from(this.listings.values());

        if (filters.maxPrice) {
            results = results.filter(l => l.askingPrice <= filters.maxPrice);
        }
        if (filters.minPrice) {
            results = results.filter(l => l.askingPrice >= filters.minPrice);
        }
        if (filters.seller) {
            results = results.filter(l => l.sellerName === filters.seller);
        }

        return results;
    }
}
