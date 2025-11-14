import cors from 'cors';
import { env } from './env';
import os from 'os';

/**
 * Gets the local network IP address for LAN access
 */
const getLocalIP = (): string | null => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (nets) {
            for (const net of nets) {
                // Skip internal (loopback) and non-IPv4 addresses
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
    }
    return null;
};

/**
 * Builds the list of allowed origins from environment variables
 * Automatically includes LAN IPs in development mode for cross-device access
 */
export const buildAllowedOrigins = (): string[] => {
    const allowedOrigins: string[] = [];
    
    // Add default localhost origins for development
    if (env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
        
        // Automatically add LAN IP origins for cross-device access
        const localIP = getLocalIP();
        if (localIP) {
            allowedOrigins.push(
                `http://${localIP}:3000`,
                `http://${localIP}:3001`
            );
            if (env.NODE_ENV !== 'production') {
                console.log(`[CORS] Auto-allowing LAN origins: http://${localIP}:3000, http://${localIP}:3001`);
            }
        }
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
    
    // In development, also check if origin is a LAN IP with common frontend ports
    // This helps when accessing from different devices on the same network
    if (env.NODE_ENV !== 'production') {
        try {
            const url = new URL(normalizedOrigin);
            const hostname = url.hostname;
            const port = url.port || (url.protocol === 'https:' ? '443' : '80');
            
            // Check if it's a LAN IP (not localhost, not public domain)
            const isLanIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) && 
                           hostname !== '127.0.0.1' && 
                           !hostname.startsWith('0.');
            
            // Allow LAN IPs on common frontend ports (3000, 3001, etc.)
            if (isLanIP && ['3000', '3001', '3002', '3003'].includes(port)) {
                if (env.NODE_ENV !== 'production') {
                    console.log(`[CORS] Auto-allowing LAN origin: ${normalizedOrigin}`);
                }
                return normalizedOrigin;
            }
        } catch (error) {
            // Invalid URL format, skip LAN IP check
        }
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

