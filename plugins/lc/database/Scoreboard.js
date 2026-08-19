/**
 * 📊 Scoreboard Storage System
 * Professional persistent storage using Minecraft Scoreboards
 * Integrated from v1.2 LandClaim System
 * Enhanced for v2.0.0+ compatibility
 */

import { Entity, ScoreboardIdentity, ScoreboardObjective, system, world } from "@minecraft/server";

/**
 * Scoreboard Manager Class
 * Manages individual scoreboard objectives
 */
export class Scoreboard {
    /**
     * Create a new Scoreboard
     * @param {string} objectiveId - Unique identifier for objective
     * @param {string} objectiveDisplayName - Display name (optional)
     */
    constructor(objectiveId, objectiveDisplayName = objectiveId) {
        system.run(() => {
            this.objectiveId = objectiveId;
            this.objectiveDisplayName = objectiveDisplayName;

            // Create objective if it doesn't exist
            if (!Scoreboard.hasObjective(objectiveId)) {
                world.scoreboard.addObjective(objectiveId, objectiveDisplayName);
            }

            this.objective = world.scoreboard.getObjective(this.objectiveId);
            this.objectiveDisplayName = this.objective.displayName;
        });
    }

    /**
     * Get an objective by ID (static)
     * @param {string} objectiveId - Objective identifier
     * @returns {ScoreboardObjective|undefined} The objective or undefined
     */
    static getObjective(objectiveId) {
        return world.scoreboard.getObjective(objectiveId);
    }

    /**
     * Get all participants (static)
     * @returns {ScoreboardIdentity[]} Array of participants
     */
    static getParticipants() {
        return world.scoreboard.getParticipants();
    }

    /**
     * Get all objectives (static)
     * @returns {ScoreboardObjective[]} Array of objectives
     */
    static getObjectives() {
        return world.scoreboard.getObjectives();
    }

    /**
     * Add new objective (static)
     * @param {string} objectiveId - Unique identifier
     * @param {string} displayName - Display name
     * @returns {ScoreboardObjective} The created objective
     */
    static addObjective(objectiveId, displayName = objectiveId) {
        return world.scoreboard.addObjective(objectiveId, displayName);
    }

    /**
     * Remove objective (static)
     * @param {string} objectiveId - Objective identifier
     * @returns {boolean} Success status
     */
    static removeObjective(objectiveId) {
        return world.scoreboard.removeObjective(objectiveId);
    }

    /**
     * Check if objective exists (static)
     * @param {string} objectiveId - Objective identifier
     * @returns {boolean} True if exists
     */
    static hasObjective(objectiveId) {
        return world.scoreboard.getObjective(objectiveId) !== undefined;
    }

    /**
     * Get objective information
     * @returns {object|undefined} Objective info with size
     */
    getObjectiveInfo() {
        const objective = this.objective;
        return objective ? { ...objective, size: this.size } : undefined;
    }

    /**
     * Get score for participant
     * @param {string|Entity|ScoreboardIdentity} participant - The participant
     * @returns {number|undefined} The score
     */
    getScore(participant) {
        return this.objective.getScore(participant);
    }

    /**
     * Set score for participant
     * @param {string|Entity|ScoreboardIdentity} participant - The participant
     * @param {number} score - Score value
     * @returns {number|undefined} The set score
     */
    setScore(participant, score) {
        this.objective.setScore(participant, score);
        return this.getScore(participant);
    }

    /**
     * Clear all participants
     */
    clearParticipants() {
        world.scoreboard.getParticipants().forEach(participant => {
            this.removeParticipant(participant.displayName);
        });
    }

    /**
     * Check if participant exists
     * @param {string|Entity|ScoreboardIdentity} participant - The participant
     * @returns {boolean} True if exists
     */
    hasParticipant(participant) {
        return this.objective.hasParticipant(participant);
    }

    /**
     * Get all participants in this objective
     * @returns {ScoreboardIdentity[]} Array of participants
     */
    getParticipants() {
        let participants = [];
        system.run(() => {
            participants = world.scoreboard.getObjective(this.objectiveId)?.getParticipants() || [];
        });
        return participants;
    }

    /**
     * Remove participant
     * @param {string|Entity|ScoreboardIdentity} participant - The participant
     * @returns {boolean} Success status
     */
    removeParticipant(participant) {
        return this.objective.removeParticipant(participant);
    }

    /**
     * Get number of participants
     */
    get size() {
        return this.objective.getParticipants().length;
    }
}

export default Scoreboard;
