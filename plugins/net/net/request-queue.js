/**
 * Request queue for managing pending HTTP requests
 * Maintains order and tracks request lifecycle
 */

export class RequestQueue {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 5;
        this.queue = [];
        this.active = new Map(); // Store active requests
        this.completed = [];
        this.failed = [];
        this.maxHistory = options.maxHistory || 100;

        this.stats = {
            totalQueued: 0,
            totalCompleted: 0,
            totalFailed: 0,
            totalCancelled: 0
        };
    }

    /**
     * Add request to queue
     */
    enqueue(request) {
        const id = this.generateId();

        const queuedRequest = {
            id,
            request,
            status: 'queued',
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
            error: null,
            result: null,
            priority: request.priority || 0
        };

        // Insert by priority (higher priority first)
        let inserted = false;
        for (let i = 0; i < this.queue.length; i++) {
            if (queuedRequest.priority > this.queue[i].priority) {
                this.queue.splice(i, 0, queuedRequest);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            this.queue.push(queuedRequest);
        }

        this.stats.totalQueued++;
        return id;
    }

    /**
     * Dequeue and start request
     */
    dequeue() {
        if (this.queue.length === 0 || this.active.size >= this.maxConcurrent) {
            return null;
        }

        const queuedRequest = this.queue.shift();
        queuedRequest.status = 'active';
        queuedRequest.startedAt = Date.now();

        this.active.set(queuedRequest.id, queuedRequest);

        return queuedRequest;
    }

    /**
     * Complete request
     */
    complete(id, result) {
        const queuedRequest = this.active.get(id);

        if (!queuedRequest) return false;

        queuedRequest.status = 'completed';
        queuedRequest.result = result;
        queuedRequest.completedAt = Date.now();

        this.active.delete(id);
        this.addToHistory(queuedRequest, 'completed');

        this.stats.totalCompleted++;

        return true;
    }

    /**
     * Fail request
     */
    fail(id, error) {
        const queuedRequest = this.active.get(id);

        if (!queuedRequest) return false;

        queuedRequest.status = 'failed';
        queuedRequest.error = error;
        queuedRequest.completedAt = Date.now();

        this.active.delete(id);
        this.addToHistory(queuedRequest, 'failed');

        this.stats.totalFailed++;

        return true;
    }

    /**
     * Cancel request
     */
    cancel(id, reason = 'Cancelled by user') {
        // Check if in queue
        const queueIndex = this.queue.findIndex(r => r.id === id);
        if (queueIndex !== -1) {
            const queuedRequest = this.queue.splice(queueIndex, 1)[0];
            queuedRequest.status = 'cancelled';
            queuedRequest.error = reason;
            queuedRequest.completedAt = Date.now();
            this.addToHistory(queuedRequest, 'cancelled');
            this.stats.totalCancelled++;
            return true;
        }

        // Check if active
        const active = this.active.get(id);
        if (active) {
            active.status = 'cancelled';
            active.error = reason;
            active.completedAt = Date.now();
            this.active.delete(id);
            this.addToHistory(active, 'cancelled');
            this.stats.totalCancelled++;
            return true;
        }

        return false;
    }

    /**
     * Add to history
     */
    addToHistory(request, finalStatus) {
        const historyRequest = { ...request, status: finalStatus };

        if (finalStatus === 'completed') {
            this.completed.push(historyRequest);
            if (this.completed.length > this.maxHistory) {
                this.completed.shift();
            }
        } else if (finalStatus === 'failed') {
            this.failed.push(historyRequest);
            if (this.failed.length > this.maxHistory) {
                this.failed.shift();
            }
        }
    }

    /**
     * Get request status
     */
    getStatus(id) {
        // Check active
        const active = this.active.get(id);
        if (active) return active;

        // Check queued
        const queued = this.queue.find(r => r.id === id);
        if (queued) return queued;

        // Check history
        const completed = this.completed.find(r => r.id === id);
        if (completed) return completed;

        const failed = this.failed.find(r => r.id === id);
        if (failed) return failed;

        return null;
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            queued: this.queue.length,
            active: this.active.size,
            maxConcurrent: this.maxConcurrent,
            canProcess: this.active.size < this.maxConcurrent,
            nextRequest: this.queue.length > 0 ? this.queue[0] : null
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            queued: this.queue.length,
            active: this.active.size,
            completedHistory: this.completed.length,
            failedHistory: this.failed.length,
            totalProcessed: this.stats.totalCompleted + this.stats.totalFailed + this.stats.totalCancelled
        };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get active requests
     */
    getActive() {
        return Array.from(this.active.values());
    }

    /**
     * Get queued requests
     */
    getQueued() {
        return [...this.queue];
    }

    /**
     * Clear completed history
     */
    clearCompletedHistory() {
        this.completed = [];
    }

    /**
     * Clear failed history
     */
    clearFailedHistory() {
        this.failed = [];
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.completed = [];
        this.failed = [];
    }

    /**
     * Cancel all pending requests
     */
    cancelAll(reason = 'Cancelled') {
        const cancelled = [];

        // Cancel queued
        while (this.queue.length > 0) {
            const request = this.queue.shift();
            request.status = 'cancelled';
            request.error = reason;
            request.completedAt = Date.now();
            cancelled.push(request.id);
            this.stats.totalCancelled++;
        }

        // Cancel active
        for (const [id, request] of this.active.entries()) {
            request.status = 'cancelled';
            request.error = reason;
            request.completedAt = Date.now();
            cancelled.push(id);
            this.stats.totalCancelled++;
        }
        this.active.clear();

        return cancelled;
    }
}

export default RequestQueue;
