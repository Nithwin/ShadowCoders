"use strict";
/**
 * Retry utility with exponential backoff
 * Handles transient database errors and race conditions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
exports.isUniqueConstraintError = isUniqueConstraintError;
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    initialDelay: 50, // 50ms
    maxDelay: 1000, // 1 second
    backoffMultiplier: 2,
    retryableErrors: ['P2002', 'P2034'], // Unique constraint, serialization failure
};
/**
 * Retry a function with exponential backoff
 * Useful for handling transient database errors and race conditions
 */
async function retryWithBackoff(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError;
    let delay = opts.initialDelay;
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            // Check if error is retryable
            const errorCode = error?.code || error?.meta?.code;
            const isRetryable = opts.retryableErrors.includes(errorCode) ||
                opts.retryableErrors.some(code => errorCode?.includes?.(code));
            // Don't retry if it's the last attempt or error is not retryable
            if (attempt === opts.maxRetries || !isRetryable) {
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
        }
    }
    throw lastError;
}
/**
 * Check if an error is a unique constraint violation
 */
function isUniqueConstraintError(error) {
    return error?.code === 'P2002' ||
        error?.meta?.target?.includes('attemptId') && error?.meta?.target?.includes('questionId');
}
//# sourceMappingURL=retry.js.map