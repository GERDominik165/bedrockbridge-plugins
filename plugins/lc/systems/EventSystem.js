/**
 * 🎯 LANDCLAIM MEGA v4 - Event System
 * Custom event dispatcher and handler system
 * @version 4.0.0 - PRODUCTION READY
 */

export class EventSystem {
    constructor() {
        // === EVENT LISTENERS ===
        this.listeners = new Map(); // eventName -> [handlers]

        // === EVENT HISTORY ===
        this.eventHistory = [];
        this.maxHistorySize = 10000;

        // === STATISTICS ===
        this.stats = {
            totalEventsDispatched: 0,
            totalListeners: 0,
            activeEvents: new Set()
        };

        this.initializeDefaultEvents();
    }

    /**
     * Initialize default event types
     */
    initializeDefaultEvents() {
        const defaultEvents = [
            // Claim events
            "claim:created",
            "claim:deleted",
            "claim:expanded",
            "claim:renamed",
            "claim:updated",
            "claim:transferred",

            // Member events
            "member:added",
            "member:removed",
            "member:roleChanged",
            "member:invited",

            // Protection events
            "protection:blockBreak",
            "protection:blockPlace",
            "protection:combat",
            "protection:violation",

            // Economy events
            "economy:transaction",
            "economy:earned",
            "economy:spent",
            "economy:balance",

            // Marketplace events
            "marketplace:listed",
            "marketplace:unlisted",
            "marketplace:sold",
            "marketplace:auctionStarted",
            "marketplace:auctionEnded",

            // Tax events
            "tax:paid",
            "tax:overdue",
            "tax:collected",

            // Player events
            "player:login",
            "player:logout",
            "player:achievement",

            // System events
            "system:startup",
            "system:shutdown",
            "system:error",
            "system:warning"
        ];

        defaultEvents.forEach(eventName => {
            this.listeners.set(eventName, []);
        });
    }

    /**
     * Subscribe to an event
     */
    on(eventName, handler, priority = 0) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const listener = {
            handler: handler,
            priority: priority,
            subscriptionDate: Date.now()
        };

        const listeners = this.listeners.get(eventName);
        listeners.push(listener);

        // Sort by priority (higher = first)
        listeners.sort((a, b) => b.priority - a.priority);

        this.stats.totalListeners++;

        // Return unsubscribe function
        return () => this.off(eventName, handler);
    }

    /**
     * Subscribe to event once
     */
    once(eventName, handler, priority = 0) {
        const wrapper = (data) => {
            handler(data);
            this.off(eventName, wrapper);
        };

        return this.on(eventName, wrapper, priority);
    }

    /**
     * Unsubscribe from event
     */
    off(eventName, handler) {
        if (!this.listeners.has(eventName)) return false;

        const listeners = this.listeners.get(eventName);
        const index = listeners.findIndex(l => l.handler === handler);

        if (index !== -1) {
            listeners.splice(index, 1);
            this.stats.totalListeners--;
            return true;
        }

        return false;
    }

    /**
     * Dispatch an event
     */
    dispatch(eventName, data = {}) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const event = {
            name: eventName,
            data: data,
            timestamp: Date.now(),
            listeners: 0,
            cancelled: false
        };

        const listeners = this.listeners.get(eventName);

        // Execute all listeners
        for (const listener of listeners) {
            if (event.cancelled) break;

            try {
                const result = listener.handler(event);

                // If handler returns false, cancel event
                if (result === false) {
                    event.cancelled = true;
                }

                event.listeners++;
            } catch (error) {
                console.error(`[EventSystem] Error in ${eventName} listener: ${error}`);
                this.dispatch("system:error", {
                    event: eventName,
                    error: error.message
                });
            }
        }

        // Record event in history
        this.recordEvent(event);

        // Update statistics
        this.stats.totalEventsDispatched++;
        this.stats.activeEvents.add(eventName);

        return event;
    }

    /**
     * Dispatch event asynchronously
     */
    dispatchAsync(eventName, data = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const result = this.dispatch(eventName, data);
                resolve(result);
            }, 0);
        });
    }

    /**
     * Record event in history
     */
    recordEvent(event) {
        this.eventHistory.push({
            ...event,
            executedAt: Date.now()
        });

        // Keep history under size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history
     */
    getHistory(eventName = null, limit = 100) {
        let history = this.eventHistory;

        if (eventName) {
            history = history.filter(e => e.name === eventName);
        }

        return history.slice(-limit).reverse();
    }

    /**
     * Get listener count for event
     */
    getListenerCount(eventName) {
        return (this.listeners.get(eventName) || []).length;
    }

    /**
     * Get all registered events
     */
    getRegisteredEvents() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get event statistics
     */
    getStatistics() {
        const eventStats = {};

        for (const [eventName, listeners] of this.listeners.entries()) {
            const history = this.eventHistory.filter(e => e.name === eventName);

            eventStats[eventName] = {
                listeners: listeners.length,
                dispatchedCount: history.length,
                lastDispatched: history.length > 0 ? history[history.length - 1].timestamp : null
            };
        }

        return {
            ...this.stats,
            eventStats: eventStats
        };
    }

    /**
     * Remove all listeners for event
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            const listeners = this.listeners.get(eventName);
            if (listeners) {
                this.stats.totalListeners -= listeners.length;
                this.listeners.set(eventName, []);
            }
        } else {
            this.stats.totalListeners = 0;
            for (const eventName of this.listeners.keys()) {
                this.listeners.set(eventName, []);
            }
        }
    }

    /**
     * Clear event history
     */
    clearHistory(eventName = null) {
        if (eventName) {
            this.eventHistory = this.eventHistory.filter(e => e.name !== eventName);
        } else {
            this.eventHistory = [];
        }
    }

    /**
     * Create namespace for organized events
     */
    createNamespace(namespace) {
        return {
            emit: (eventName, data) => this.dispatch(`${namespace}:${eventName}`, data),
            on: (eventName, handler, priority) => this.on(`${namespace}:${eventName}`, handler, priority),
            once: (eventName, handler, priority) => this.once(`${namespace}:${eventName}`, handler, priority),
            off: (eventName, handler) => this.off(`${namespace}:${eventName}`, handler)
        };
    }
}
