import { Role, User } from '@prisma/client';
import * as authRepo from './auth.repo';
import * as tokenService from './token.service';
import { UserPayLoad } from './token.service'; // Import payload
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken'; // <-- This is the package with .verify()
import { env } from '../../config/env'; // <-- This is your config file
// --- (Your GoogleProfile interface) ---
interface GoogleProfile {
  email: string;
  name?: string | null;
  pictureUrl?: string | null;
  googleId: string;
}
// --- (Your PublicUser type) ---
type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  pictureUrl: string | null;
  createdAt: Date;
} | null;

export const handleGoogleLogin = async (profile: GoogleProfile) => {
  const user = await authRepo.findUserByEmailAndLinkGoogle(profile);
  if (!user) {
    throw { status: 403, message: 'Access denied. User is not registered.' };
  }

  const payload: UserPayLoad = { sub: user.id, role: user.role };

  // **UPDATED:** Use new token service
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = await tokenService.generateAndSaveRefreshToken(user.id);

  return { accessToken, refreshToken };
};

export const handleEmailLogin = async (input: any) => {
  const user = await authRepo.findUserByEmail(input.email);
  if (!user || !user.password) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);
  if (!isPasswordValid) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  const payload: UserPayLoad = { sub: user.id, role: user.role };

  // **UPDATED:** Use new token service
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = await tokenService.generateAndSaveRefreshToken(user.id);

  return { accessToken, refreshToken };
};

// --- (Your existing findUserById function) ---
export const findUserById = async (id: string) => {
  return authRepo.findUserById(id);
};

// --- **NEW FUNCTION TO ADD** ---
/**
 * Verifies a refresh token and issues a new access token.
 */
export const handleRefreshToken = async (
  rawRefreshToken: string
): Promise<string> => {
  // 1. Verify token and find the user
  const user = await tokenService.verifyAndFindUser(rawRefreshToken);

  if (!user) {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  // 2. Issue a new access token
  const payload: UserPayLoad = { sub: user.id, role: user.role };
  const newAccessToken = tokenService.generateAccessToken(payload);

  return newAccessToken;
};

export const handleLogout = async (rawRefreshToken: string) => {
  // Call the token service to find and remove the token from the DB
  const success = await tokenService.findAndRemoveRefreshToken(rawRefreshToken);

  if (!success) {
    // This isn't a critical error, just means the token was already invalid
    console.warn('Logout: Could not find matching refresh token to delete.');
  }

  return true;
};