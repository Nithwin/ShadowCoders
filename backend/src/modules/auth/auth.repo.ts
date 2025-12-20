import { Prisma , User} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { withDatabaseErrorHandling } from "../../lib/db-health";




export const findUserByEmail = (email: string): Promise<User | null> => {
    return withDatabaseErrorHandling(
        () => prisma.user.findUnique({
            where:{
                email
            },
        }),
        'findUserByEmail'
    );
}

export const findUserById = (id: string) => {
    return withDatabaseErrorHandling(
        () => prisma.user.findUnique({
            where:{id},
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

export const saveRefreshToken = (userId: string, tokenHash: string, expiresAt: Date) => {
  return withDatabaseErrorHandling(
    () => prisma.refreshToken.create({
      data: {
        userId: userId,
        tokenHash: tokenHash,
        expiresAt: expiresAt,
      },
    }),
    'saveRefreshToken'
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