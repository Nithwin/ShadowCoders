"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
// Configure Prisma client with the correct database URL from env config
exports.prisma = globalForPrisma.prisma || new client_1.PrismaClient({
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