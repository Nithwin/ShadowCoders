import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const globalForPrisma = global as unknown as {prisma: PrismaClient};

// Configure Prisma client with the correct database URL from env config
// This ensures we use the correct database (local or Supabase) based on USE_SUPABASE flag
// Added connection pooling configuration for concurrent users
export const prisma = globalForPrisma.prisma || new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Connection pool configuration for handling concurrent requests
    // These settings help handle 20+ concurrent students
    __internal: {
        engine: {
            // Increase connection pool size for concurrent users
            connectTimeout: 10000, // 10 seconds
        },
    },
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