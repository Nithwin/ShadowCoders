/**
 * Database Health Check Utility
 *
 * Provides functions to check database connectivity and health status.
 */
export interface DatabaseHealthStatus {
    connected: boolean;
    error?: string;
    errorCode?: string;
    details?: string;
    timestamp: Date;
}
/**
 * Checks if the database is reachable and responsive.
 * Returns health status with error details if connection fails.
 */
export declare function checkDatabaseHealth(): Promise<DatabaseHealthStatus>;
/**
 * Wraps a Prisma operation to handle connection errors gracefully.
 * Throws a formatted error that can be caught by the error handler.
 */
export declare function withDatabaseErrorHandling<T>(operation: () => Promise<T>, context?: string): Promise<T>;
//# sourceMappingURL=db-health.d.ts.map