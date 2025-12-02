import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const globalForPrisma = global as unknown as {prisma: PrismaClient};

// Configure Prisma client with the correct database URL from env config
export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Configure connection pool settings via environment variables
// This helps handle concurrent exam attempts from multiple students
if(process.env.NODE_ENV !== 'production'){
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
    
    process.on('SIGINT', async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}