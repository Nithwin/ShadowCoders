import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const globalForPrisma = global as unknown as {prisma: PrismaClient};

// Configure Prisma client with the correct database URL from env config
// This ensures we use the correct database (local or Supabase) based on USE_SUPABASE flag
export const prisma = globalForPrisma.prisma || new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if(process.env.NODE_ENV !== 'production'){
    globalForPrisma.prisma = prisma;
}