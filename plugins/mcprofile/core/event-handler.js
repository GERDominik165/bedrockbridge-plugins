/**
 * Event Handler
 * @version 2.0.0
 *
 * Manages player join/leave events and other server events
 * Integrates with Bedrock Bridge event system
 */

import { world, system } from '@minecraft/server';

class EventHandler {
    constructor() {
        this.listeners = new Map();
        this.joinListeners = [];
        this.leaveListeners = [];
        this.chatListeners = [];
        this.initialized = false;
    }

    /**
     * Initialize event listeners
     */
    initialize() {
        if (this.initialized) return;

        try {
            // Subscribe to player join event
            world.afterEvents.playerSpawn.subscribe((event) => {
                const player = event.player;
                if (player && !player.isFirstSaturation) { // First spawn
                    this.emit('playerJoin', player);
                }
            });

            // Subscribe to chat message event
            world.beforeEvents.chatSend.subscribe((event) => {
                const player = event.sender;
                const message = event.message;
                this.emit('chatMessage', player, message);
            });

            this.initialized = true;
        } catch (error) {
            console.error(`Error initializing event handler: ${error.message}`);
        }
    }

    /**
     * Register event listener
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        this.listeners.get(eventName).push(callback);

        switch (eventName) {
            case 'playerJoin':
                this.joinListeners.push(callback);
                break;
            case 'playerLeave':
                this.leaveListeners.push(callback);
                break;
            case 'chatMessage':
                this.chatListeners.push(callback);
                break;
        }
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (!this.listeners.has(eventName)) return;

        const callbacks = this.listeners.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }

        switch (eventName) {
            case 'playerJoin':
                const joinIndex = this.joinListeners.indexOf(callback);
                if (joinIndex > -1) this.joinListeners.splice(joinIndex, 1);
                break;
            case 'playerLeave':
                const leaveIndex = this.leaveListeners.indexOf(callback);
                if (leaveIndex > -1) this.leaveListeners.splice(leaveIndex, 1);
                break;
            case 'chatMessage':
                const chatIndex = this.chatListeners.indexOf(callback);
                if (chatIndex > -1) this.chatListeners.splice(chatIndex, 1);
                break;
        }
    }

    /**
     * Register one-time listener
     */
    once(eventName, callback) {
        const wrapper = (...args) => {
            callback(...args);
            this.off(eventName, wrapper);
        };

        this.on(eventName, wrapper);
    }

    /**
     * Emit event
     */
    async emit(eventName, ...args) {
        if (!this.listeners.has(eventName)) return;

        const callbacks = this.listeners.get(eventName);
        for (const callback of callbacks) {
            try {
                await callback(...args);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}: ${error.message}`);
            }
        }
    }

    /**
     * Get all listeners for event
     */
    listeners(eventName) {
        return this.listeners.get(eventName) || [];
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.listeners.clear();
        this.joinListeners = [];
        this.leaveListeners = [];
        this.chatListeners = [];
    }

    /**
     * Get event stats
     */
    getStats() {
        const stats = {};
        for (const [eventName, callbacks] of this.listeners) {
            stats[eventName] = callbacks.length;
        }
        return stats;
    }
}

export default EventHandler;
