import { Prisma , User} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { withDatabaseErrorHandling } from "../../lib/db-health";

interface GoogleProfile {
    email: string;
    name?: string | null;
    pictureUrl?: string | null;
    googleId: string;
}

export const findUserByEmailAndLinkGoogle = async ({email, name, pictureUrl, googleId}: GoogleProfile) => {
    return withDatabaseErrorHandling(async () => {
        try{
            const dataToUpdate :Prisma.UserUpdateInput = {
                googleId:googleId,
            }
            if(name !== undefined){
                dataToUpdate.name = name;
            }
            if(pictureUrl !== undefined){
                dataToUpdate.pictureUrl = pictureUrl;
            }
            const user = await prisma.user.update({
                where:{
                    email:email,
                },
                data:dataToUpdate,
            })
            return user;
            
        } catch(error: any){
            if(error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025'){
                console.log('User not found, creating new user with email:', email);
                try {
                    const newUser = await prisma.user.create({
                        data: {
                            email: email,
                            name: name || null,
                            pictureUrl: pictureUrl || null,
                            googleId: googleId,
                            role: 'STUDENT',
                        }
                    });
                    console.log('New user created:', newUser.id);
                    return newUser;
                } catch (createError) {
                    console.error('Failed to create user:', createError);
                    return null;
                }
            }
            console.error('Error in findUserByEmailAndLinkGoogle:', error);
            throw error;
        }
    }, 'findUserByEmailAndLinkGoogle');
}


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