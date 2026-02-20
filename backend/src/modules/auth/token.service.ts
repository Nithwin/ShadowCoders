import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
  tid?: string; // tokenId for O(1) DB lookup
}

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '3h'; // 3 hours (sufficient for most exams)
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

  // Generate a unique tokenId for O(1) DB lookup
  const tokenId = crypto.randomBytes(16).toString('hex');

  // 1. Create the raw token (includes tokenId for direct lookup)
  const rawToken = jwt.sign({ sub: userId, tid: tokenId }, env.JWT_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });

  // 2. Hash the token
  const tokenHash = await bcrypt.hash(rawToken, SALT_ROUNDS);

  // 3. Save the hash + tokenId to the database
  try {
    await authRepo.saveRefreshToken(userId, tokenHash, expiresAt, tokenId);
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
) => {
  let payload: UserPayLoad;
  try {
    // 1. Verify the token's signature and that it's not expired
    payload = jwt.verify(rawToken, env.JWT_SECRET) as UserPayLoad;
  } catch (error) {
    return null; // Token is invalid, expired, or tampered with
  }

  // 2. Use tokenId for O(1) lookup if available (new tokens have it)
  if (payload.tid) {
    const tid = payload.tid;
    const tokenRecord = await withDatabaseErrorHandling(
      () => prisma.refreshToken.findUnique({
        where: { tokenId: tid },
      }),
      'verifyAndFindUser - findUnique by tokenId'
    );

    if (!tokenRecord) return null;

    // Single bcrypt compare to verify integrity
    const isMatch = await bcrypt.compare(rawToken, tokenRecord.tokenHash);
    if (!isMatch) return null;

    // Check DB-side expiry
    if (tokenRecord.expiresAt < new Date()) {
      await authRepo.deleteRefreshTokenById(tokenRecord.tokenId).catch(() => {});
      return null;
    }

    return await authRepo.findUserById(tokenRecord.userId);
  }

  // 3. Fallback: Legacy tokens without tokenId — O(N) scan (will be phased out)
  const userTokens = await withDatabaseErrorHandling(
    () => prisma.refreshToken.findMany({
      where: { userId: payload.sub },
    }),
    'verifyAndFindUser - findMany refreshToken (legacy)'
  );

  if (userTokens.length === 0) return null;

  let validTokenRecord: RefreshToken | null = null;
  for (const record of userTokens) {
    const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
    if (isMatch) {
      validTokenRecord = record;
      break;
    }
  }

  if (!validTokenRecord) return null;

  if (validTokenRecord.expiresAt < new Date()) {
    await authRepo.deleteRefreshToken(validTokenRecord.tokenHash).catch(() => {});
    return null;
  }

  return await authRepo.findUserById(validTokenRecord.userId);
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

  // Fast path: use tokenId for O(1) lookup if available
  if (payload.tid) {
    const tid = payload.tid;
    const tokenRecord = await withDatabaseErrorHandling(
      () => prisma.refreshToken.findUnique({
        where: { tokenId: tid },
      }),
      'findAndRemoveRefreshToken - findUnique by tokenId'
    );

    if (tokenRecord) {
      const isMatch = await bcrypt.compare(rawToken, tokenRecord.tokenHash);
      if (isMatch) {
        await authRepo.deleteRefreshTokenById(tokenRecord.tokenId);
        return true;
      }
    }
    return false;
  }

  // Legacy fallback: O(N) scan for tokens without tokenId
  const userTokens = await withDatabaseErrorHandling(
    () => prisma.refreshToken.findMany({
      where: { userId: payload.sub },
    }),
    'findAndRemoveRefreshToken - findMany refreshToken (legacy)'
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
    await authRepo.deleteRefreshToken(validTokenHash);
    return true;
  }

  return false;
};