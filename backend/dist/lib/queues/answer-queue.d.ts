/**
 * Answer Submission Queue System
 * Handles concurrent answer submissions with proper sequencing
 * Prevents race conditions by processing requests for the same (attemptId, questionId) sequentially
 */
interface QueueStats {
    total: number;
    running: number;
    queued: number;
    completed: number;
    failed: number;
    byKey: Record<string, number>;
}
declare class AnswerQueue {
    private queue;
    private runningByKey;
    private running;
    private maxConcurrent;
    private maxConcurrentPerKey;
    private stats;
    constructor(maxConcurrent?: number, maxConcurrentPerKey?: number);
    /**
     * Get queue key for a job (attemptId:questionId)
     */
    private getKey;
    /**
     * Set maximum concurrent executions
     */
    setMaxConcurrent(max: number): void;
    /**
     * Get current queue statistics
     */
    getStats(): QueueStats;
    /**
     * Add a job to the queue
     * Jobs with the same (attemptId, questionId) are processed sequentially
     */
    enqueue<T>(attemptId: string, questionId: string, execute: () => Promise<T>, priority?: number): Promise<T>;
    /**
     * Check if a job can run (not at capacity for key or globally)
     */
    private canRun;
    /**
     * Process the queue
     */
    private processQueue;
    /**
     * Execute a single job
     */
    private executeJob;
    /**
     * Clear the queue
     */
    clear(): void;
    /**
     * Get estimated wait time for a new job
     */
    getEstimatedWaitTime(attemptId: string, questionId: string): number;
}
export declare const answerQueue: AnswerQueue;
export { AnswerQueue };
//# sourceMappingURL=answer-queue.d.ts.map