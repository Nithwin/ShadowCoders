import { Role, User } from '@prisma/client';
import * as authRepo from './auth.repo';
import * as tokenService from './token.service';
import { UserPayLoad } from './token.service'; // Import payload
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken'; // <-- This is the package with .verify()
import { env } from '../../config/env'; // <-- This is your config file
import fs from 'fs';
import path from 'path';

// --- (Your GoogleProfile interface) ---


export const handleEmailLogin = async (input: any) => {
  try {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = input.email?.toLowerCase().trim();

    
    if (!normalizedEmail || !input.password) {
      throw { status: 400, message: 'Email and password are required' };
    }

    const user = await authRepo.findUserByEmail(normalizedEmail);
    
    // Check for database connection errors
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
  } catch (error: any) {
    // Handle database connection errors
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database server')) {
      throw { 
        status: 503, 
        message: 'Database connection failed. Please check your database configuration.',
        code: 'DATABASE_CONNECTION_ERROR',
        details: 'The application cannot connect to the database. Please verify your DATABASE_URL and ensure the database server is running.'
      };
    }
    // Re-throw other errors (like 401)
    throw error;
  }
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
    // This isn't a critical error; token may already be invalid or removed.
  }

  return true;
};

export const updateUserProfile = async (userId: string, updateData: {
  name?: string | null;
  reg_no?: string | null; // Kept in type for compatibility but ignored
  year?: number | null;
  department?: string | null;
  section?: string | null;
  pictureUrl?: string | null;
  leetcodeId?: string | null;
}) => {
  // Only allow updating specific fields
  const dataToUpdate: any = {};
  
  if (updateData.name !== undefined) {
    dataToUpdate.name = updateData.name;
  }
  // reg_no is INTENTIONALLY OMITTED to prevent updates
  if (updateData.year !== undefined) {
    dataToUpdate.year = updateData.year;
  }
  if (updateData.department !== undefined) {
    dataToUpdate.department = updateData.department;
  }
  if (updateData.section !== undefined) {
    dataToUpdate.section = updateData.section;
  }
  if (updateData.pictureUrl !== undefined) {
    dataToUpdate.pictureUrl = updateData.pictureUrl;
  }
  if (updateData.leetcodeId !== undefined) {
    dataToUpdate.leetcodeId = updateData.leetcodeId;
  }

  return authRepo.updateUser(userId, dataToUpdate);
};

export const changePassword = async (userId: string, { currentPassword, newPassword }: any) => {
  const user = await authRepo.findUserById(userId);
  if (!user || !user.password) {
    throw { status: 404, message: 'User not found' };
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw { status: 400, message: 'Invalid current password' };
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  return authRepo.updatePassword(userId, hashedPassword);
};

export const updateProfilePicture = async (userId: string, file: Express.Multer.File) => {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  // Store image directly in the database
  await prisma.user.update({
    where: { id: userId },
    data: {
      pictureData: file.buffer,
      pictureMimeType: file.mimetype,
      // Update pictureUrl to point to the endpoint that serves the DB image
      pictureUrl: `/api/users/${userId}/picture` 
    }
  });

  return `/api/users/${userId}/picture`;
};