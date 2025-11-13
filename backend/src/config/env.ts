import dotenv from 'dotenv';


dotenv.config();

export const env = {
    PORT:process.env.PORT!,
    NODE_ENV:process.env.NODE_ENV!,
    // Database configuration
    // If USE_SUPABASE=true, use DATABASE_URL (Supabase connection string)
    // If USE_SUPABASE=false, use LOCAL_DATABASE_URL (local PostgreSQL)
    USE_SUPABASE: process.env.USE_SUPABASE !== 'false', // Default to true if not specified
    // Use LOCAL_DATABASE_URL if USE_SUPABASE is false, otherwise use DATABASE_URL
    DATABASE_URL: process.env.USE_SUPABASE === 'false' 
        ? (process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shadowcoders?schema=public')
        : (process.env.DATABASE_URL || ''),
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shadowcoders?schema=public',
    // DIRECT_URL is only needed for Supabase (for migrations)
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_SECRET: process.env.JWT_SECRET!,
    GOOGLE_API_KEY:process.env.GOOGLE_API_KEY!,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    // Comma-separated list of allowed origins (e.g., "http://localhost:3000,http://localhost:3001")
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    // Allow ALL origins (bypass CORS restrictions) - WARNING: Only use in development!
    // When true: allows any origin (but still sets specific origin header, not *)
    // When false: enforces CORS restrictions based on allowed origins list
    ALLOW_ALL_ORIGINS: process.env.ALLOW_ALL_ORIGINS === 'true',
    JUDGE0_API_URL: process.env.JUDGE0_API_URL || 'https://ce.judge0.com',
    JUDGE0_API_KEY: process.env.JUDGE0_API_KEY || '', // Optional: for RapidAPI Judge0 or custom Judge0 instance
    JUDGE0_RAPIDAPI_HOST: process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com',
    // Code execution provider: 'judge0' or 'local'
    CODE_EXECUTION_PROVIDER: process.env.CODE_EXECUTION_PROVIDER || 'judge0',
    // Maximum concurrent code executions (default: 5, recommended: 5-10 for moderate systems, 10-20 for powerful systems)
    MAX_CONCURRENT_EXECUTIONS: process.env.MAX_CONCURRENT_EXECUTIONS || '5',
}