import cors from 'cors';
import { env } from './env';

/**
 * Builds the list of allowed origins from environment variables
 */
export const buildAllowedOrigins = (): string[] => {
    const allowedOrigins: string[] = [];
    
    // Add default localhost origins for development
    if (env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
    }
    
    // Add FRONTEND_ORIGIN if specified
    if (env.FRONTEND_ORIGIN) {
        allowedOrigins.push(env.FRONTEND_ORIGIN);
    }
    
    // Add multiple origins from ALLOWED_ORIGINS (comma-separated)
    if (env.ALLOWED_ORIGINS) {
        const origins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o);
        allowedOrigins.push(...origins);
    }
    
    return allowedOrigins;
};

/**
 * Checks if an origin should be allowed
 * @param origin - The origin to check
 * @param allowedOrigins - List of explicitly allowed origins
 * @returns The origin string if allowed, false otherwise
 * 
 * IMPORTANT: Even when ALLOW_ALL_ORIGINS=true, we return the specific origin string,
 * NOT true or '*', because credentials require a specific origin header.
 */
export const isOriginAllowed = (
    origin: string | undefined,
    allowedOrigins: string[]
): string | false => {
    if (!origin) {
        return false;
    }
    
    const normalizedOrigin = origin.trim();
    
    // If ALLOW_ALL_ORIGINS is true, allow any origin (but return specific origin, not *)
    if (env.ALLOW_ALL_ORIGINS) {
        if (env.NODE_ENV !== 'production') {
            console.log(`[CORS] ALLOW_ALL_ORIGINS=true: Allowing origin: ${normalizedOrigin}`);
        }
        return normalizedOrigin; // Return specific origin, NOT true or '*'
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(normalizedOrigin)) {
        return normalizedOrigin;
    }
    
    return false;
};

/**
 * Creates CORS configuration options
 */
export const createCorsOptions = (allowedOrigins: string[]): cors.CorsOptions => {
    return {
        origin: (origin, callback) => {
            // Allow requests without origin (direct API calls, health checks, etc.)
            // These don't use credentials, so it's safe
            if (!origin) {
                return callback(null, true);
            }
            
            const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
            
            if (allowedOrigin) {
                // CRITICAL: Return the origin string, NOT true (which sets *)
                if (env.NODE_ENV !== 'production') {
                    console.log(`[CORS] Allowing origin: ${origin} -> ${allowedOrigin}`);
                }
                return callback(null, allowedOrigin);
            }
            
            // Log rejected origin for debugging (only in development)
            if (env.NODE_ENV !== 'production') {
                console.warn(`[CORS] Rejected origin: ${origin}`);
                console.warn(`[CORS] Allowed origins:`, allowedOrigins);
            }
            
            callback(new Error(`Not allowed by CORS: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
        exposedHeaders: ['Set-Cookie', 'Content-Disposition', 'Content-Type'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
};

