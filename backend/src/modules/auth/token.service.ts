import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import * as authRepo from './auth.repo';
import { prisma } from '../../lib/prisma';
import { User, RefreshToken } from '@prisma/client';
import bcrypt from 'bcrypt';
import { withDatabaseErrorHandling } from '../../lib/db-health';

// Note: I'm matching your 'UserPayLoad' casing
export interface UserPayLoad {
  sub: string;
  role: string;
}

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generates a short-lived access token.
 */
export const generateAccessToken = (payload: UserPayLoad): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

/**
 * 1. Generates a new, long-lived refresh token.
 * 2. Hashes the token using bcrypt.
 * 3. Saves the HASH to the database, linked to the user.
 * 4. Returns the raw (un-hashed) token to be set in the cookie.
 */
export const generateAndSaveRefreshToken = async (userId: string): Promise<string> => {
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // 1. Create the raw token
  const rawToken = jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });

  // 2. Hash the token
  const tokenHash = await bcrypt.hash(rawToken, SALT_ROUNDS);

  // 3. Save the hash to the database
  try {
    await authRepo.saveRefreshToken(userId, tokenHash, expiresAt);
  } catch (error) {
    // Failed to save refresh token to DB. Let caller handle the error.
    throw new Error('Could not save refresh token.');
  }

  // 4. Return the raw token
  return rawToken;
};

/**
 * Verifies a raw refresh token, checks it against the DB,
 * and returns the user payload if valid.
 */
export const verifyAndFindUser = async (
  rawToken: string
): Promise<User | null> => {
  let payload: UserPayLoad;
  try {
    // 1. Verify the token's signature and that it's not expired
    payload = jwt.verify(rawToken, env.JWT_SECRET) as UserPayLoad;
  } catch (error) {
    return null; // Token is invalid, expired, or tampered with
  }

  // 2. Get all saved token hashes for this user
  const userTokens = await withDatabaseErrorHandling(
    () => prisma.refreshToken.findMany({
      where: { userId: payload.sub },
    }),
    'verifyAndFindUser - findMany refreshToken'
  );

  if (userTokens.length === 0) {
    return null; // User has no saved refresh tokens
  }

  // 3. Compare the raw token to all saved hashes
  let validTokenRecord: RefreshToken | null = null;
  for (const record of userTokens) {
    const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
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

export const findAndRemoveRefreshToken = async (
  rawToken: string
): Promise<boolean> => {
  let payload: UserPayLoad;
  try {
    payload = jwt.verify(rawToken, env.JWT_SECRET) as UserPayLoad;
  } catch (error) {
    return false; // Invalid token, nothing to remove
  }

  // Find the matching token hash in the DB
  const userTokens = await withDatabaseErrorHandling(
    () => prisma.refreshToken.findMany({
      where: { userId: payload.sub },
    }),
    'findAndRemoveRefreshToken - findMany refreshToken'
  );

  let validTokenHash: string | null = null;
  for (const record of userTokens) {
    const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
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