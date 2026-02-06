import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

/**
 * Validates required environment variables and throws an error if any are missing
 */
function validateEnv(): void {
    const errors: string[] = [];
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Required in all environments
    if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required');
    } else if (process.env.JWT_SECRET.length < 32 && isProduction) {
        errors.push('JWT_SECRET must be at least 32 characters long in production');
    }
    
    // Database validation
    const useSupabase = process.env.USE_SUPABASE !== 'false';
    if (useSupabase) {
        if (!process.env.DATABASE_URL) {
            errors.push('DATABASE_URL is required when USE_SUPABASE is true');
        }
    } else {
        if (!process.env.LOCAL_DATABASE_URL && !process.env.DATABASE_URL) {
            errors.push('LOCAL_DATABASE_URL or DATABASE_URL is required when USE_SUPABASE is false');
        }
    }
    
    // Production-specific validations
    if (isProduction) {
        if (!process.env.FRONTEND_ORIGIN && !process.env.ALLOWED_ORIGINS) {
            errors.push('FRONTEND_ORIGIN or ALLOWED_ORIGINS must be set in production');
        }
        
        // Note: ALLOW_ALL_ORIGINS warning removed - allowed for local server deployments
    }
    
    if (errors.length > 0) {
        console.error('\n❌ Environment Variable Validation Failed:\n');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.\n');
        process.exit(1);
    }
}

// Validate environment variables on module load
validateEnv();

export const env = {
    PORT: process.env.PORT || '4000',
    NODE_ENV: process.env.NODE_ENV || 'development',
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
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    FRONTEND_URL: process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    // Comma-separated list of allowed origins (e.g., "http://localhost:3000,http://localhost:3001")
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    // Allow ALL origins (bypass CORS restrictions) - WARNING: Only use in development!
    // When true: allows any origin (but still sets specific origin header, not *)
    // When false: enforces CORS restrictions based on allowed origins list
    ALLOW_ALL_ORIGINS: process.env.ALLOW_ALL_ORIGINS === 'true',
    // Maximum concurrent code executions (default: 5, recommended: 5-10 for moderate systems, 10-20 for powerful systems)
    // Maximum concurrent code executions (default: 3)
    MAX_CONCURRENT_EXECUTIONS: process.env.MAX_CONCURRENT_EXECUTIONS || '3',
    // Maximum queue size before rejecting new requests (default: 50)
    MAX_QUEUE_SIZE: process.env.MAX_QUEUE_SIZE || '50',
    // File uploads directory (optional - defaults to 'uploads' in project root)
    // Used for storing LISTENING audio files and SPEAKING recordings
    UPLOADS_DIR: process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'),
    // OS for code execution: 'windows', 'linux', or 'darwin' (macOS)
    // Used to determine correct commands (e.g., python vs python3)
    EXECUTION_OS: process.env.EXECUTION_OS || 'windows',
    // AI Configuration
    AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3',
}