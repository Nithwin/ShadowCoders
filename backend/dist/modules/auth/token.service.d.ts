import { User } from '@prisma/client';
export interface UserPayLoad {
    sub: string;
    role: string;
}
/**
 * Generates a short-lived access token.
 */
export declare const generateAccessToken: (payload: UserPayLoad) => string;
/**
 * 1. Generates a new, long-lived refresh token.
 * 2. Hashes the token using bcrypt.
 * 3. Saves the HASH to the database, linked to the user.
 * 4. Returns the raw (un-hashed) token to be set in the cookie.
 */
export declare const generateAndSaveRefreshToken: (userId: string) => Promise<string>;
/**
 * Verifies a raw refresh token, checks it against the DB,
 * and returns the user payload if valid.
 */
export declare const verifyAndFindUser: (rawToken: string) => Promise<User | null>;
export declare const findAndRemoveRefreshToken: (rawToken: string) => Promise<boolean>;
//# sourceMappingURL=token.service.d.ts.map