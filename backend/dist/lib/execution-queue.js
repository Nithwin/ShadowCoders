"use strict";
/**
 * Execution Queue System
 * Manages concurrent code executions with configurable limits
 * Prevents system overload by queuing and processing executions sequentially
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionQueue = exports.executionQueue = void 0;
class ExecutionQueue {
    constructor(maxConcurrent = 5) {
        this.queue = [];
        this.running = new Set();
        this.stats = {
            total: 0,
            running: 0,
            queued: 0,
            completed: 0,
            failed: 0,
        };
        this.maxConcurrent = maxConcurrent;
        // console.log(`[ExecutionQueue] Initialized with max concurrent: ${maxConcurrent}`);
    }
    /**
     * Set maximum concurrent executions
     * Useful for dynamic adjustment based on system resources
     */
    setMaxConcurrent(max) {
        if (max < 1) {
            throw new Error('Max concurrent must be at least 1');
        }
        this.maxConcurrent = max;
        // console.log(`[ExecutionQueue] Max concurrent updated to: ${max}`);
        // Process queue with new limit
        this.processQueue();
    }
    /**
     * Get current queue statistics
     */
    getStats() {
        return {
            total: this.stats.total,
            running: this.running.size,
            queued: this.queue.length,
            completed: this.stats.completed,
            failed: this.stats.failed,
        };
    }
    /**
     * Add a job to the queue
     * @param execute Function that executes the code
     * @param priority Optional priority (higher = executed first)
     * @returns Promise that resolves when execution completes
     */
    async enqueue(execute, priority = 0) {
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.stats.total++;
        return new Promise((resolve, reject) => {
            const job = {
                id: jobId,
                execute,
                priority,
                resolve,
                reject,
                timestamp: Date.now(),
            };
            // Insert job based on priority (higher priority first)
            const insertIndex = this.queue.findIndex((j) => (j.priority || 0) < priority);
            if (insertIndex === -1) {
                this.queue.push(job);
            }
            else {
                this.queue.splice(insertIndex, 0, job);
            }
            this.stats.queued = this.queue.length;
            // console.log(`[ExecutionQueue] Job ${jobId} enqueued. Queue size: ${this.queue.length}, Running: ${this.running.size}`);
            // Try to process immediately
            this.processQueue();
        });
    }
    /**
     * Process the queue - runs jobs up to maxConcurrent limit
     */
    async processQueue() {
        // Don't process if we're at capacity
        if (this.running.size >= this.maxConcurrent) {
            return;
        }
        // Don't process if queue is empty
        if (this.queue.length === 0) {
            return;
        }
        // Get next job from queue
        const job = this.queue.shift();
        if (!job) {
            return;
        }
        // Mark as running
        this.running.add(job.id);
        this.stats.queued = this.queue.length;
        this.stats.running = this.running.size;
        // console.log(`[ExecutionQueue] Starting job ${job.id}. Running: ${this.running.size}/${this.maxConcurrent}, Queued: ${this.queue.length}`);
        // Execute job asynchronously
        this.executeJob(job).finally(() => {
            // Remove from running set
            this.running.delete(job.id);
            this.stats.running = this.running.size;
            // Process next job in queue
            this.processQueue();
        });
    }
    /**
     * Execute a single job
     */
    async executeJob(job) {
        const startTime = Date.now();
        try {
            const result = await job.execute();
            const duration = Date.now() - startTime;
            this.stats.completed++;
            // console.log(`[ExecutionQueue] Job ${job.id} completed in ${duration}ms`);
            job.resolve(result);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.stats.failed++;
            console.error(`[ExecutionQueue] Job ${job.id} failed after ${duration}ms:`, error);
            job.reject(error);
        }
    }
    /**
     * Clear the queue (useful for shutdown or reset)
     */
    clear() {
        const cleared = this.queue.length;
        this.queue.forEach((job) => {
            job.reject(new Error('Queue cleared'));
        });
        this.queue = [];
        this.stats.queued = 0;
    }
    /**
     * Get estimated wait time for a new job
     */
    getEstimatedWaitTime() {
        if (this.running.size < this.maxConcurrent) {
            return 0; // Can start immediately
        }
        // Rough estimate: average execution time * jobs ahead
        // This is a simple heuristic - you could make it more sophisticated
        const avgExecutionTime = 2000; // 2 seconds average
        const jobsAhead = this.queue.length;
        const slotsAvailable = this.maxConcurrent - this.running.size;
        if (slotsAvailable > 0) {
            return 0;
        }
        // Estimate: (jobs ahead / max concurrent) * avg time
        return Math.ceil((jobsAhead / this.maxConcurrent) * avgExecutionTime);
    }
}
exports.ExecutionQueue = ExecutionQueue;
// Create singleton instance
// Max concurrent can be configured via environment variable
const getMaxConcurrent = () => {
    const envValue = process.env.MAX_CONCURRENT_EXECUTIONS;
    if (envValue) {
        const parsed = parseInt(envValue, 10);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    // Default based on system resources
    // For production, recommend 5-10 for moderate systems, 10-20 for powerful systems
    const defaultConcurrent = 5;
    // console.log(`[ExecutionQueue] Using default max concurrent: ${defaultConcurrent} (set MAX_CONCURRENT_EXECUTIONS env var to customize)`);
    return defaultConcurrent;
};
exports.executionQueue = new ExecutionQueue(getMaxConcurrent());
//# sourceMappingURL=execution-queue.js.map