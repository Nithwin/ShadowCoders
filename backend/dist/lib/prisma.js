"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("../config/env");
const globalForPrisma = global;
// Create PostgreSQL connection pool
const pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
});
// Create Prisma adapter for PostgreSQL
const adapter = new adapter_pg_1.PrismaPg(pool);
// Configure Prisma client with PostgreSQL adapter for Prisma 7
exports.prisma = globalForPrisma.prisma || new client_1.PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// Configure connection pool settings via environment variables
// This helps handle concurrent exam attempts from multiple students
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
// Graceful shutdown handler
if (typeof process !== 'undefined') {
    process.on('beforeExit', async () => {
        await exports.prisma.$disconnect();
    });
    process.on('SIGINT', async () => {
        await exports.prisma.$disconnect();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await exports.prisma.$disconnect();
        process.exit(0);
    });
}
//# sourceMappingURL=prisma.js.map