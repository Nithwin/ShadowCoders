"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAndRemoveRefreshToken = exports.verifyAndFindUser = exports.generateAndSaveRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const authRepo = __importStar(require("./auth.repo"));
const prisma_1 = require("../../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_health_1 = require("../../lib/db-health");
const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
/**
 * Generates a short-lived access token.
 */
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};
exports.generateAccessToken = generateAccessToken;
/**
 * 1. Generates a new, long-lived refresh token.
 * 2. Hashes the token using bcrypt.
 * 3. Saves the HASH to the database, linked to the user.
 * 4. Returns the raw (un-hashed) token to be set in the cookie.
 */
const generateAndSaveRefreshToken = async (userId) => {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    // 1. Create the raw token
    const rawToken = jsonwebtoken_1.default.sign({ sub: userId }, env_1.env.JWT_SECRET, {
        expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });
    // 2. Hash the token
    const tokenHash = await bcrypt_1.default.hash(rawToken, SALT_ROUNDS);
    // 3. Save the hash to the database
    try {
        await authRepo.saveRefreshToken(userId, tokenHash, expiresAt);
    }
    catch (error) {
        // Failed to save refresh token to DB. Let caller handle the error.
        throw new Error('Could not save refresh token.');
    }
    // 4. Return the raw token
    return rawToken;
};
exports.generateAndSaveRefreshToken = generateAndSaveRefreshToken;
/**
 * Verifies a raw refresh token, checks it against the DB,
 * and returns the user payload if valid.
 */
const verifyAndFindUser = async (rawToken) => {
    let payload;
    try {
        // 1. Verify the token's signature and that it's not expired
        payload = jsonwebtoken_1.default.verify(rawToken, env_1.env.JWT_SECRET);
    }
    catch (error) {
        return null; // Token is invalid, expired, or tampered with
    }
    // 2. Get all saved token hashes for this user
    const userTokens = await (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.refreshToken.findMany({
        where: { userId: payload.sub },
    }), 'verifyAndFindUser - findMany refreshToken');
    if (userTokens.length === 0) {
        return null; // User has no saved refresh tokens
    }
    // 3. Compare the raw token to all saved hashes
    let validTokenRecord = null;
    for (const record of userTokens) {
        const isMatch = await bcrypt_1.default.compare(rawToken, record.tokenHash);
        if (isMatch) {
            validTokenRecord = record;
            break;
        }
    }
    if (!validTokenRecord) {
        return null; // No matching hash found in the DB
    }
    // 4. Check DB-side expiry (an extra layer of security)
    if (validTokenRecord.expiresAt < new Date()) {
        // Clean up expired token
        await authRepo.deleteRefreshToken(validTokenRecord.tokenHash).catch();
        return null; // Token is expired
    }
    // 5. Token is valid, return the user
    const user = await authRepo.findUserById(validTokenRecord.userId);
    return user;
};
exports.verifyAndFindUser = verifyAndFindUser;
const findAndRemoveRefreshToken = async (rawToken) => {
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(rawToken, env_1.env.JWT_SECRET);
    }
    catch (error) {
        return false; // Invalid token, nothing to remove
    }
    // Find the matching token hash in the DB
    const userTokens = await (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.refreshToken.findMany({
        where: { userId: payload.sub },
    }), 'findAndRemoveRefreshToken - findMany refreshToken');
    let validTokenHash = null;
    for (const record of userTokens) {
        const isMatch = await bcrypt_1.default.compare(rawToken, record.tokenHash);
        if (isMatch) {
            validTokenHash = record.tokenHash;
            break;
        }
    }
    if (validTokenHash) {
        // Delete the token from the DB
        await authRepo.deleteRefreshToken(validTokenHash);
        return true;
    }
    return false;
};
exports.findAndRemoveRefreshToken = findAndRemoveRefreshToken;
//# sourceMappingURL=token.service.js.map