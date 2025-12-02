import cors from 'cors';
/**
 * Builds the list of allowed origins from environment variables
 * Automatically includes LAN IPs in development mode for cross-device access
 */
export declare const buildAllowedOrigins: () => string[];
/**
 * Checks if an origin should be allowed
 * @param origin - The origin to check
 * @param allowedOrigins - List of explicitly allowed origins
 * @returns The origin string if allowed, false otherwise
 *
 * IMPORTANT: Even when ALLOW_ALL_ORIGINS=true, we return the specific origin string,
 * NOT true or '*', because credentials require a specific origin header.
 */
export declare const isOriginAllowed: (origin: string | undefined, allowedOrigins: string[]) => string | false;
/**
 * Creates CORS configuration options
 */
export declare const createCorsOptions: (allowedOrigins: string[]) => cors.CorsOptions;
//# sourceMappingURL=cors.d.ts.map