/**
 * Execution Queue System
 * Manages concurrent code executions with configurable limits
 * Prevents system overload by queuing and processing executions sequentially
 */
interface QueueStats {
    total: number;
    running: number;
    queued: number;
    completed: number;
    failed: number;
}
declare class ExecutionQueue {
    private queue;
    private running;
    private maxConcurrent;
    private stats;
    constructor(maxConcurrent?: number);
    /**
     * Set maximum concurrent executions
     * Useful for dynamic adjustment based on system resources
     */
    setMaxConcurrent(max: number): void;
    /**
     * Get current queue statistics
     */
    getStats(): QueueStats;
    /**
     * Add a job to the queue
     * @param execute Function that executes the code
     * @param priority Optional priority (higher = executed first)
     * @returns Promise that resolves when execution completes
     */
    enqueue<T>(execute: () => Promise<T>, priority?: number): Promise<T>;
    /**
     * Process the queue - runs jobs up to maxConcurrent limit
     */
    private processQueue;
    /**
     * Execute a single job
     */
    private executeJob;
    /**
     * Clear the queue (useful for shutdown or reset)
     */
    clear(): void;
    /**
     * Get estimated wait time for a new job
     */
    getEstimatedWaitTime(): number;
}
export declare const executionQueue: ExecutionQueue;
export { ExecutionQueue };
//# sourceMappingURL=execution-queue.d.ts.map