"use strict";
/**
 * Answer Submission Queue System
 * Handles concurrent answer submissions with proper sequencing
 * Prevents race conditions by processing requests for the same (attemptId, questionId) sequentially
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswerQueue = exports.answerQueue = void 0;
class AnswerQueue {
    constructor(maxConcurrent = 20, maxConcurrentPerKey = 1) {
        // Main queue for all jobs
        this.queue = [];
        // Track running jobs by key (attemptId:questionId)
        this.runningByKey = new Map();
        // Track all running jobs
        this.running = new Set();
        this.stats = {
            total: 0,
            running: 0,
            queued: 0,
            completed: 0,
            failed: 0,
            byKey: {},
        };
        this.maxConcurrent = maxConcurrent;
        this.maxConcurrentPerKey = maxConcurrentPerKey; // Only 1 job per key at a time to prevent race conditions
    }
    /**
     * Get queue key for a job (attemptId:questionId)
     */
    getKey(attemptId, questionId) {
        return `${attemptId}:${questionId}`;
    }
    /**
     * Set maximum concurrent executions
     */
    setMaxConcurrent(max) {
        if (max < 1) {
            throw new Error('Max concurrent must be at least 1');
        }
        this.maxConcurrent = max;
        this.processQueue();
    }
    /**
     * Get current queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            running: this.running.size,
            queued: this.queue.length,
            byKey: Object.fromEntries(Array.from(this.runningByKey.entries()).map(([key, set]) => [key, set.size])),
        };
    }
    /**
     * Add a job to the queue
     * Jobs with the same (attemptId, questionId) are processed sequentially
     */
    async enqueue(attemptId, questionId, execute, priority = 0) {
        const jobId = `answer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const key = this.getKey(attemptId, questionId);
        this.stats.total++;
        return new Promise((resolve, reject) => {
            const job = {
                id: jobId,
                attemptId,
                questionId,
                execute,
                priority,
                resolve,
                reject,
                timestamp: Date.now(),
            };
            // Insert job based on priority (higher priority first)
            // For same key, maintain order (FIFO) - process sequentially
            const insertIndex = this.queue.findIndex((j) => {
                if (j.priority !== priority) {
                    return (j.priority || 0) < priority;
                }
                // Same priority - maintain order (FIFO)
                return false;
            });
            if (insertIndex === -1) {
                this.queue.push(job);
            }
            else {
                this.queue.splice(insertIndex, 0, job);
            }
            this.stats.queued = this.queue.length;
            this.stats.byKey[key] = (this.stats.byKey[key] || 0) + 1;
            // Try to process immediately
            this.processQueue();
        });
    }
    /**
     * Check if a job can run (not at capacity for key or globally)
     */
    canRun(job) {
        const key = this.getKey(job.attemptId, job.questionId);
        // Check global capacity
        if (this.running.size >= this.maxConcurrent) {
            return false;
        }
        // Check per-key capacity (only 1 job per key at a time to prevent race conditions)
        const runningForKey = this.runningByKey.get(key);
        if (runningForKey && runningForKey.size >= this.maxConcurrentPerKey) {
            return false;
        }
        return true;
    }
    /**
     * Process the queue
     */
    async processQueue() {
        // Process jobs that can run
        // Process one job at a time to avoid index issues
        while (this.queue.length > 0) {
            // Find first job that can run
            let jobIndex = -1;
            for (let i = 0; i < this.queue.length; i++) {
                const candidateJob = this.queue[i];
                if (candidateJob && this.canRun(candidateJob)) {
                    jobIndex = i;
                    break;
                }
            }
            // No jobs can run right now
            if (jobIndex === -1) {
                break;
            }
            // Get and remove the job
            const jobs = this.queue.splice(jobIndex, 1);
            const job = jobs[0];
            if (!job) {
                continue;
            }
            // Mark as running
            const key = this.getKey(job.attemptId, job.questionId);
            if (!this.runningByKey.has(key)) {
                this.runningByKey.set(key, new Set());
            }
            this.runningByKey.get(key).add(job.id);
            this.running.add(job.id);
            this.stats.queued = this.queue.length;
            this.stats.running = this.running.size;
            // Update stats for this key
            const currentKeyCount = this.stats.byKey[key] || 0;
            this.stats.byKey[key] = Math.max(0, currentKeyCount - 1);
            if (this.stats.byKey[key] <= 0) {
                delete this.stats.byKey[key];
            }
            // Execute job asynchronously (don't await - let it run in background)
            this.executeJob(job).finally(() => {
                // Remove from running sets
                this.running.delete(job.id);
                const keySet = this.runningByKey.get(key);
                if (keySet) {
                    keySet.delete(job.id);
                    if (keySet.size === 0) {
                        this.runningByKey.delete(key);
                    }
                }
                this.stats.running = this.running.size;
                // Process next job in queue
                this.processQueue();
            });
        }
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
            job.resolve(result);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.stats.failed++;
            console.error(`[AnswerQueue] Job ${job.id} failed after ${duration}ms:`, error);
            job.reject(error);
        }
    }
    /**
     * Clear the queue
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
    getEstimatedWaitTime(attemptId, questionId) {
        const key = this.getKey(attemptId, questionId);
        const runningForKey = this.runningByKey.get(key);
        // If no jobs running for this key and we have capacity, can start immediately
        if ((!runningForKey || runningForKey.size === 0) && this.running.size < this.maxConcurrent) {
            return 0;
        }
        // Count jobs ahead in queue for this key
        const jobsAhead = this.queue.filter((j) => this.getKey(j.attemptId, j.questionId) === key).length;
        // Rough estimate: average execution time * jobs ahead
        const avgExecutionTime = 100; // 100ms average for answer submission
        return Math.ceil(jobsAhead * avgExecutionTime);
    }
}
exports.AnswerQueue = AnswerQueue;
// Create singleton instance
const getMaxConcurrent = () => {
    const envValue = process.env.MAX_CONCURRENT_ANSWER_SUBMISSIONS;
    if (envValue) {
        const parsed = parseInt(envValue, 10);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    // Default: 20 concurrent submissions globally
    return 20;
};
exports.answerQueue = new AnswerQueue(getMaxConcurrent(), 1);
//# sourceMappingURL=answer-queue.js.map