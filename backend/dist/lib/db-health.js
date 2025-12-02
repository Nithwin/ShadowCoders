"use strict";
/**
 * Database Health Check Utility
 *
 * Provides functions to check database connectivity and health status.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.withDatabaseErrorHandling = withDatabaseErrorHandling;
const prisma_1 = require("./prisma");
/**
 * Checks if the database is reachable and responsive.
 * Returns health status with error details if connection fails.
 */
async function checkDatabaseHealth() {
    const status = {
        connected: false,
        timestamp: new Date(),
    };
    try {
        // Simple query to test connection
        await prisma_1.prisma.$queryRaw `SELECT 1 as test`;
        status.connected = true;
        return status;
    }
    catch (error) {
        status.connected = false;
        status.error = error.message || 'Unknown database error';
        // Handle Prisma connection errors
        if (error.name === 'PrismaClientInitializationError') {
            status.errorCode = error.errorCode || 'P1001';
            // Provide helpful error messages based on error code
            switch (error.errorCode) {
                case 'P1001':
                    status.details = 'Cannot reach database server. Check your DATABASE_URL and ensure the database server is running.';
                    break;
                case 'P1000':
                    status.details = 'Authentication failed. Verify your database credentials.';
                    break;
                case 'P1002':
                    status.details = 'Database does not exist. Verify the database name in your connection string.';
                    break;
                case 'P1003':
                    status.details = 'Database file does not exist.';
                    break;
                default:
                    status.details = 'Database connection error. See backend/DB_CONNECTION_FIX.md for troubleshooting.';
            }
        }
        else if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
            status.errorCode = 'P1001';
            status.details = 'Cannot reach database server. Check your DATABASE_URL and ensure the database server is running.';
        }
        else {
            status.details = error.message || 'Unknown database error occurred.';
        }
        return status;
    }
}
/**
 * Wraps a Prisma operation to handle connection errors gracefully.
 * Throws a formatted error that can be caught by the error handler.
 */
async function withDatabaseErrorHandling(operation, context) {
    try {
        return await operation();
    }
    catch (error) {
        // Check if it's a database connection error
        if (error.name === 'PrismaClientInitializationError' ||
            error.code === 'P1001' ||
            error.message?.includes("Can't reach database server") ||
            error.message?.includes('database server')) {
            const errorMessage = context
                ? `Database connection failed during ${context}`
                : 'Database connection failed';
            throw {
                status: 503,
                message: errorMessage,
                code: 'DATABASE_CONNECTION_ERROR',
                details: 'The application cannot connect to the database. Please verify your DATABASE_URL and ensure the database server is running. See backend/DB_CONNECTION_FIX.md for troubleshooting steps.',
                originalError: error.message,
            };
        }
        // Re-throw other errors as-is
        throw error;
    }
}
//# sourceMappingURL=db-health.js.map