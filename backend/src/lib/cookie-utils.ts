import { Request } from 'express';

/**
 * Determines if a request is cross-origin
 * Cross-origin means frontend and backend are on different domains
 */
export const isCrossOriginRequest = (req: Request): boolean => {
    const origin = req.headers.origin;
    
    if (!origin) {
        // No origin header = direct API call (not browser), treat as same-origin
        return false;
    }
    
    const host = req.get('host') || '';
    const protocol = req.protocol || 'http';
    const backendUrl = `${protocol}://${host}`;
    
    // Normalize URLs (remove trailing slashes, convert to lowercase)
    const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '');
    const normalizedBackend = backendUrl.trim().toLowerCase().replace(/\/$/, '');
    
    // If origin and backend are different, it's cross-origin
    return normalizedOrigin !== normalizedBackend;
};

/**
 * Determines if the request is secure (HTTPS)
 */
export const isSecureRequest = (req: Request): boolean => {
    // req.secure is true if trust proxy is set and x-forwarded-proto is https
    if (req.secure) {
        return true;
    }
    
    // Check if behind a proxy
    const forwardedProto = req.get('x-forwarded-proto');
    if (forwardedProto === 'https') {
        return true;
    }
    
    return false;
};

/**
 * Gets cookie options for setting/clearing cookies
 * 
 * Important: When using SameSite=None, the secure flag MUST be true.
 * However, for localhost development (HTTP), we use SameSite=Lax instead.
 */
export const getCookieOptions = (req: Request) => {
    const isCrossOrigin = isCrossOriginRequest(req);
    const isSecure = isSecureRequest(req);
    
    // CRITICAL: Browsers reject SameSite=None without secure=true
    // Since we can't use secure=true on HTTP, we must NEVER use SameSite=None on HTTP
    // For HTTP (non-secure), always use 'lax' even if cross-origin
    // Cookies will work if frontend and backend are on same IP (different ports are same-origin)
    let sameSite: 'none' | 'lax' | 'strict';
    
    if (!isSecure) {
        // HTTP: Always use 'lax' (never 'none' without secure)
        // Note: Different ports on same IP are considered same-origin for cookies
        // So http://10.11.16.132:3000 and http://10.11.16.132:4000 will work with 'lax'
        sameSite = 'lax';
    } else if (isCrossOrigin && isSecure) {
        // HTTPS cross-origin: use 'none' with secure=true
        sameSite = 'none';
    } else {
        // HTTPS same-origin: use 'lax'
        sameSite = 'lax';
    }
    
    // Cookie options
    const cookieOptions: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'none' | 'lax' | 'strict';
        path: string;
        domain?: string;
    } = {
        httpOnly: true,
        // secure=true is REQUIRED when sameSite='none'
        // For HTTP, we use sameSite='lax' so secure=false is fine
        // For HTTPS, we should always use secure=true if possible
        secure: isSecure || sameSite === 'none',
        sameSite: sameSite,
        path: '/',
    };
    
    // For localhost or LAN IP (HTTP), don't set domain (browsers handle this automatically)
    // Setting domain explicitly can cause issues with localhost/LAN IP cookies
    
    // For Production/Tunnel (HTTPS), we need to set the domain to share cookies across subdomains
    // We detect this checks if the host is NOT localhost or an IP address
    const host = req.get('host') || '';
    const isLocalhost = host.includes('localhost') || host === '127.0.0.1' || host.startsWith('192.168.');
    
    // If we are NOT on localhost (e.g. tunnel or prod), OR if it's securely serving
    if (!isLocalhost || isSecure) {
        // Force secure to true for any public access (Cloudflare, Vercel, etc.)
        // even if the internal node process thinks it's HTTP
        cookieOptions.secure = true;
        
        // If we have a COOKIE_DOMAIN env var, use it
        if (process.env.COOKIE_DOMAIN) {
            cookieOptions.domain = process.env.COOKIE_DOMAIN;
        } 
        // Auto-detect root domain for subdomains
        else if (host.includes('.') && !host.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            const parts = host.split('.');
            if (parts.length >= 2) {
                // Get the last two parts (e.g. shadowcoders.app)
                const rootDomain = parts.slice(-2).join('.');
                cookieOptions.domain = '.' + rootDomain;
            }
        }
    }
    
    return cookieOptions;
};

