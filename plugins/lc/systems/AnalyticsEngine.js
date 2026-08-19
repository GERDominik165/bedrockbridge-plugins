/**
 * 📈 LANDCLAIM MEGA v4 - Analytics Engine
 * Player behavior and system analytics
 * @version 4.0.0 - PRODUCTION READY
 */

export class AnalyticsEngine {
    constructor(database) {
        this.database = database;

        // === ANALYTICS DATA ===
        this.playerAnalytics = new Map(); // playerName -> analytics
        this.systemAnalytics = {
            requests: [],
            errors: [],
            performance: []
        };

        // === CONFIGURATION ===
        this.config = {
            trackingEnabled: true,
            maxHistoryDays: 30,
            samplingRate: 1.0, // 1 = 100%, 0.5 = 50%
            enablePredictions: true
        };

        // === PREDICTIVE MODELS ===
        this.predictions = {
            churnRate: {},           // Likelihood player will quit
            spendingBehavior: {},    // Expected spending
            activityTrends: {}       // Activity patterns
        };

        this.loadAnalytics();
    }

    /**
     * Load analytics data
     */
    loadAnalytics() {
        try {
            const saved = this.database.get("analytics:system");
            if (saved) {
                this.playerAnalytics = new Map(saved.playerAnalytics || []);
                this.systemAnalytics = saved.systemAnalytics || this.systemAnalytics;
                this.predictions = saved.predictions || this.predictions;
            }
            console.log(`[Analytics] Loaded analytics for ${this.playerAnalytics.size} players`);
        } catch (error) {
            console.error(`[Analytics] Load failed: ${error}`);
        }
    }

    /**
     * Save analytics data
     */
    saveAnalytics() {
        try {
            this.database.set("analytics:system", {
                playerAnalytics: Array.from(this.playerAnalytics.entries()),
                systemAnalytics: this.systemAnalytics,
                predictions: this.predictions,
                savedAt: Date.now()
            });
        } catch (error) {
            console.error(`[Analytics] Save failed: ${error}`);
        }
    }

    /**
     * Initialize player analytics
     */
    initializePlayer(playerName) {
        if (this.playerAnalytics.has(playerName)) {
            return this.playerAnalytics.get(playerName);
        }

        const analytics = {
            playerName: playerName,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            sessions: [],
            behaviors: {
                buildingRate: 0,
                miningRate: 0,
                tradingRate: 0,
                pvpEngagement: 0,
                socialEngagement: 0
            },
            preferences: {
                preferredDimension: "overworld",
                playStyle: "builder", // builder, pvp, explorer, trader
                activityTimeOfDay: "evening"
            },
            trends: {
                dailyActiveHours: 0,
                weeklyPlayTime: 0,
                monthlyPlayTime: 0,
                activityTrend: 0 // positive/negative
            },
            riskFactors: {
                churnRisk: 0, // 0-100
                violationRisk: 0,
                spendingLikelihood: 0
            }
        };

        this.playerAnalytics.set(playerName, analytics);
        return analytics;
    }

    /**
     * Track player session
     */
    trackSession(playerName, sessionData) {
        const analytics = this.initializePlayer(playerName);

        const session = {
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            duration: sessionData.endTime - sessionData.startTime,
            actions: sessionData.actions || 0,
            location: sessionData.location || "unknown",
            eventsTriggered: sessionData.events || []
        };

        analytics.sessions.push(session);
        analytics.lastSeen = Date.now();

        // Keep only last 100 sessions
        if (analytics.sessions.length > 100) {
            analytics.sessions.shift();
        }

        this.updatePlayerMetrics(playerName);
        this.saveAnalytics();
    }

    /**
     * Track player behavior
     */
    trackBehavior(playerName, behaviorType, intensity = 1) {
        const analytics = this.initializePlayer(playerName);

        switch (behaviorType) {
            case "building":
                analytics.behaviors.buildingRate += intensity;
                if (analytics.preferences.playStyle === "builder") {
                    analytics.behaviors.buildingRate += 0.5;
                }
                break;
            case "mining":
                analytics.behaviors.miningRate += intensity;
                if (analytics.preferences.playStyle === "explorer") {
                    analytics.behaviors.miningRate += 0.5;
                }
                break;
            case "trading":
                analytics.behaviors.tradingRate += intensity;
                if (analytics.preferences.playStyle === "trader") {
                    analytics.behaviors.tradingRate += 0.5;
                }
                break;
            case "pvp":
                analytics.behaviors.pvpEngagement += intensity;
                if (analytics.preferences.playStyle === "pvp") {
                    analytics.behaviors.pvpEngagement += 0.5;
                }
                break;
            case "social":
                analytics.behaviors.socialEngagement += intensity;
                break;
        }

        this.updatePlayerMetrics(playerName);
    }

    /**
     * Detect player play style
     */
    detectPlayStyle(playerName) {
        const analytics = this.playerAnalytics.get(playerName);
        if (!analytics) return "unknown";

        const { buildingRate, miningRate, tradingRate, pvpEngagement, socialEngagement } = analytics.behaviors;
        const total = buildingRate + miningRate + tradingRate + pvpEngagement + socialEngagement;

        if (total === 0) return "inactive";

        const percentages = {
            building: buildingRate / total,
            mining: miningRate / total,
            trading: tradingRate / total,
            pvp: pvpEngagement / total,
            social: socialEngagement / total
        };

        const styleRatings = {
            builder: percentages.building,
            explorer: percentages.mining,
            trader: percentages.trading,
            pvp: percentages.pvp,
            social: percentages.social
        };

        const maxStyle = Object.entries(styleRatings).sort(([, a], [, b]) => b - a)[0];
        return maxStyle ? maxStyle[0] : "unknown";
    }

    /**
     * Calculate churn risk (0-100)
     */
    calculateChurnRisk(playerName) {
        const analytics = this.playerAnalytics.get(playerName);
        if (!analytics) return 0;

        let risk = 0;

        // No sessions in last 7 days = high risk
        const lastWeek = Date.now() - (7 * 86400000);
        const recentSessions = analytics.sessions.filter(s => s.startTime > lastWeek);
        if (recentSessions.length === 0) risk += 30;
        else if (recentSessions.length < 3) risk += 15;

        // Declining activity trend
        if (analytics.trends.activityTrend < -0.3) risk += 20;

        // Low engagement
        const totalBehavior = Object.values(analytics.behaviors).reduce((a, b) => a + b, 0);
        if (totalBehavior < 100) risk += 15;

        // Recently violated or flagged
        if (analytics.riskFactors.violationRisk > 50) risk += 20;

        return Math.min(100, risk);
    }

    /**
     * Predict spending behavior
     */
    predictSpendingBehavior(playerName) {
        const analytics = this.playerAnalytics.get(playerName);
        if (!analytics) return { likelihood: 0, predictedAmount: 0 };

        const playStyle = analytics.preferences.playStyle;
        const engagementLevel = Object.values(analytics.behaviors).reduce((a, b) => a + b, 0) / 100;

        let likelihood = engagementLevel * 50; // Base on engagement

        // Play style affects spending
        if (playStyle === "builder") likelihood += 30;
        if (playStyle === "pvp") likelihood += 20;
        if (playStyle === "trader") likelihood += 35;

        const predictedAmount = Math.floor(likelihood * 100); // Scale to currency

        return {
            likelihood: Math.min(100, likelihood),
            predictedAmount: predictedAmount,
            likelyPurchases: this.predictPurchases(playerName)
        };
    }

    /**
     * Predict purchases based on behavior
     */
    predictPurchases(playerName) {
        const analytics = this.playerAnalytics.get(playerName);
        if (!analytics) return [];

        const purchases = [];

        if (analytics.behaviors.buildingRate > 30) {
            purchases.push("claim_expansion");
        }
        if (analytics.behaviors.pvpEngagement > 30) {
            purchases.push("defense_upgrade");
        }
        if (analytics.behaviors.tradingRate > 30) {
            purchases.push("marketplace_listing");
        }
        if (analytics.behaviors.socialEngagement > 30) {
            purchases.push("friend_group_claim");
        }

        return purchases;
    }

    /**
     * Update player metrics
     */
    updatePlayerMetrics(playerName) {
        const analytics = this.playerAnalytics.get(playerName);
        if (!analytics) return;

        // Calculate trends
        const now = Date.now();
        const oneDayAgo = now - 86400000;
        const sevenDaysAgo = now - (7 * 86400000);
        const thirtyDaysAgo = now - (30 * 86400000);

        analytics.trends.dailyActiveHours = analytics.sessions
            .filter(s => s.startTime > oneDayAgo)
            .reduce((sum, s) => sum + s.duration, 0) / 3600000;

        analytics.trends.weeklyPlayTime = analytics.sessions
            .filter(s => s.startTime > sevenDaysAgo)
            .reduce((sum, s) => sum + s.duration, 0) / 3600000;

        analytics.trends.monthlyPlayTime = analytics.sessions
            .filter(s => s.startTime > thirtyDaysAgo)
            .reduce((sum, s) => sum + s.duration, 0) / 3600000;

        // Update play style
        analytics.preferences.playStyle = this.detectPlayStyle(playerName);

        // Update risk factors
        analytics.riskFactors.churnRisk = this.calculateChurnRisk(playerName);

        // Predict spending
        const spending = this.predictSpendingBehavior(playerName);
        analytics.riskFactors.spendingLikelihood = spending.likelihood;

        // Store predictions
        this.predictions[playerName] = {
            churn: analytics.riskFactors.churnRisk,
            spending: spending,
            playStyle: analytics.preferences.playStyle
        };

        this.saveAnalytics();
    }

    /**
     * Track system error
     */
    trackError(errorData) {
        const error = {
            message: errorData.message,
            stack: errorData.stack,
            context: errorData.context,
            timestamp: Date.now(),
            severity: errorData.severity || "normal"
        };

        this.systemAnalytics.errors.push(error);

        // Keep last 1000 errors
        if (this.systemAnalytics.errors.length > 1000) {
            this.systemAnalytics.errors.shift();
        }

        this.saveAnalytics();
    }

    /**
     * Track system performance
     */
    trackPerformance(metric) {
        this.systemAnalytics.performance.push({
            ...metric,
            timestamp: Date.now()
        });

        // Keep last 1000 metrics
        if (this.systemAnalytics.performance.length > 1000) {
            this.systemAnalytics.performance.shift();
        }

        this.saveAnalytics();
    }

    /**
     * Get player report
     */
    getPlayerReport(playerName) {
        const analytics = this.playerAnalytics.get(playerName);
        if (!analytics) return null;

        return {
            playerName: playerName,
            accountAge: Date.now() - analytics.firstSeen,
            lastSeen: analytics.lastSeen,
            totalSessions: analytics.sessions.length,
            behaviors: analytics.behaviors,
            playStyle: analytics.preferences.playStyle,
            risks: analytics.riskFactors,
            trends: analytics.trends,
            predictions: this.predictions[playerName] || {}
        };
    }

    /**
     * Get system health report
     */
    getSystemReport() {
        const recentErrors = this.systemAnalytics.errors.slice(-100);
        const avgErrorSeverity = recentErrors.length > 0
            ? recentErrors.reduce((sum, e) => sum + (e.severity === "critical" ? 3 : e.severity === "warning" ? 1 : 0), 0) / recentErrors.length
            : 0;

        return {
            totalErrors: this.systemAnalytics.errors.length,
            recentErrors: recentErrors.length,
            averageSeverity: avgErrorSeverity,
            healthStatus: avgErrorSeverity < 0.5 ? "HEALTHY" : avgErrorSeverity < 1.5 ? "DEGRADED" : "CRITICAL"
        };
    }

    /**
     * Generate analytics summary
     */
    generateSummary() {
        const playerReports = Array.from(this.playerAnalytics.keys()).map(p => ({
            player: p,
            churnRisk: this.playerAnalytics.get(p).riskFactors.churnRisk,
            playStyle: this.playerAnalytics.get(p).preferences.playStyle
        }));

        const atRiskPlayers = playerReports.filter(p => p.churnRisk > 70).sort((a, b) => b.churnRisk - a.churnRisk);

        return {
            totalPlayersTracked: this.playerAnalytics.size,
            atRiskPlayers: atRiskPlayers,
            playStyleDistribution: this.getPlayStyleDistribution(),
            systemHealth: this.getSystemReport(),
            predictions: this.predictions
        };
    }

    /**
     * Get play style distribution
     */
    getPlayStyleDistribution() {
        const distribution = {
            builder: 0,
            explorer: 0,
            trader: 0,
            pvp: 0,
            social: 0,
            unknown: 0
        };

        for (const analytics of this.playerAnalytics.values()) {
            distribution[analytics.preferences.playStyle]++;
        }

        return distribution;
    }
}
