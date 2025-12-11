/**
 * Retry utility with exponential backoff
 * Handles transient database errors and race conditions
 */
interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
}
/**
 * Retry a function with exponential backoff
 * Useful for handling transient database errors and race conditions
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Check if an error is a unique constraint violation
 */
export declare function isUniqueConstraintError(error: any): boolean;
export {};
//# sourceMappingURL=retry.d.ts.map