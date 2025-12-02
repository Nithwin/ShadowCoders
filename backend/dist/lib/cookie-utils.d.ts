import { Request } from 'express';
/**
 * Determines if a request is cross-origin
 * Cross-origin means frontend and backend are on different domains
 */
export declare const isCrossOriginRequest: (req: Request) => boolean;
/**
 * Determines if the request is secure (HTTPS)
 */
export declare const isSecureRequest: (req: Request) => boolean;
/**
 * Gets cookie options for setting/clearing cookies
 *
 * Important: When using SameSite=None, the secure flag MUST be true.
 * However, for localhost development (HTTP), we use SameSite=Lax instead.
 */
export declare const getCookieOptions: (req: Request) => {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax" | "strict";
    path: string;
    domain?: string;
};
//# sourceMappingURL=cookie-utils.d.ts.map