import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";

const globalForPrisma = global as unknown as {prisma: PrismaClient};

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

// Create Prisma adapter for PostgreSQL
const adapter = new PrismaPg(pool);

// Configure Prisma client with PostgreSQL adapter for Prisma 7
export const prisma = globalForPrisma.prisma || new PrismaClient({
    adapter,
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