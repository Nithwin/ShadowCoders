import { Prisma , User} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { withDatabaseErrorHandling } from "../../lib/db-health";




export const findUserByEmail = (email: string) => {
    return withDatabaseErrorHandling(
        () => prisma.user.findUnique({
            where:{
                email
            },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                name: true,
                pictureUrl: true,
                reg_no: true,
                department: true, 
                year: true,
                section: true,
                leetcodeId: true,
                leetcodeStats: true,
                settings: true,
                // Excluding pictureData
            }
        }),
        'findUserByEmail'
    );
}

export const findUserById = (id: string) => {
    return withDatabaseErrorHandling(
        () => prisma.user.findUnique({
            where:{id},
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                pictureUrl: true,
                reg_no: true,
                department: true,
                year: true,
                section: true,
                leetcodeId: true,
                leetcodeStats: true,
                password: true,
                settings: true,
                createdAt: true,
                updatedAt: true,
                // Explicitly excluding pictureData and pictureMimeType for performance
            }
        }),
        'findUserById'
    );
}

export const findStudentWithCohortInfo = (id: string) => {
    return withDatabaseErrorHandling(
        () => prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                year: true,
                department: true,
                section: true,
            }
        }),
        'findStudentWithCohortInfo'
    );
}

export const updateUser = (id: string, data: Prisma.UserUpdateInput) => {
    return withDatabaseErrorHandling(
        () => prisma.user.update({
            where: { id },
            data,
        }),
        'updateUser'
    );
}

export const saveRefreshToken = (userId: string, tokenHash: string, expiresAt: Date, tokenId: string) => {
  return withDatabaseErrorHandling(
    () => prisma.refreshToken.create({
      data: {
        userId: userId,
        tokenHash: tokenHash,
        tokenId: tokenId,
        expiresAt: expiresAt,
      },
    }),
    'saveRefreshToken'
  );
};

/**
 * Finds an active refresh token by its tokenId (O(1) lookup).
 */
export const findRefreshTokenById = (tokenId: string) => {
  return withDatabaseErrorHandling(
    () => prisma.refreshToken.findUnique({
      where: { tokenId },
    }),
    'findRefreshTokenById'
  );
};

/**
 * Finds an active refresh token by its hash.
 */
export const findRefreshToken = (tokenHash: string) => {
  return withDatabaseErrorHandling(
    () => prisma.refreshToken.findUnique({
      where: {
        tokenHash: tokenHash,
        // Optional: Add check to ensure it hasn't expired
        // expiresAt: { gt: new Date() } 
      },
    }),
    'findRefreshToken'
  );
};

/**
 * Deletes a refresh token from the database by tokenId.
 */
export const deleteRefreshTokenById = (tokenId: string) => {
  return withDatabaseErrorHandling(
    () => prisma.refreshToken.delete({
      where: { tokenId },
    }),
    'deleteRefreshTokenById'
  );
};

/**
 * Deletes a refresh token from the database (used for logout).
 */
export const deleteRefreshToken = (tokenHash: string) => {
  return withDatabaseErrorHandling(
    () => prisma.refreshToken.delete({
      where: { tokenHash: tokenHash },
    }),
    'deleteRefreshToken'
  );
};

export const updatePassword = (id: string, passwordHash: string) => {
    return withDatabaseErrorHandling(
        () => prisma.user.update({
            where: { id },
            data: { password: passwordHash },
        }),
        'updatePassword'
    );
}