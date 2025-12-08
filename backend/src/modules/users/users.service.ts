import { Prisma, User, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withDatabaseErrorHandling } from '../../lib/db-health';
import bcrypt from 'bcrypt';

export const getAllUsers = async (params: {
  role?: Role;
  department?: string;
  year?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) => {
  const { role, department, year, sortBy, sortOrder } = params;

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (department) where.department = { contains: department, mode: 'insensitive' };
  if (year) where.year = year;

  const orderBy: Prisma.UserOrderByWithRelationInput = {};
  if (sortBy) {
    orderBy[sortBy as keyof Prisma.UserOrderByWithRelationInput] = sortOrder || 'asc';
  } else {
    orderBy.createdAt = 'desc';
  }

  return withDatabaseErrorHandling(
    () => prisma.user.findMany({
      where,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pictureUrl: true,
        createdAt: true,
        reg_no: true,
        department: true,
        year: true,
        section: true,
        leetcodeId: true,
        leetcodeStats: true,
      }
    }),
    'getAllUsers'
  );
};

export const getUserById = async (id: string) => {
  return withDatabaseErrorHandling(
    () => prisma.user.findUnique({
      where: { id },
    }),
    'getUserById'
  );
};

export const updateUser = async (id: string, data: Prisma.UserUpdateInput) => {
  if (data.password && typeof data.password === 'string') {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  return withDatabaseErrorHandling(
    () => prisma.user.update({
      where: { id },
      data,
    }),
    'updateUser'
  );
};

export const deleteUser = async (id: string) => {
  return withDatabaseErrorHandling(
    async () => {
      // Use transaction to ensure atomicity
      return await prisma.$transaction(async (tx) => {
        // 1. Get all attempts for this user
        const attempts = await tx.attempt.findMany({
          where: { studentId: id },
          select: { id: true },
        });
        
        const attemptIds = attempts.map(a => a.id);
        
        if (attemptIds.length > 0) {
          // 2. Get all response IDs
          const responses = await tx.response.findMany({
            where: { attemptId: { in: attemptIds } },
            select: { id: true },
          });
          
          const responseIds = responses.map(r => r.id);
          
          if (responseIds.length > 0) {
            // 3. Delete grading jobs (references Response)
            await tx.gradingJob.deleteMany({
              where: { responseId: { in: responseIds } },
            });
            
            // 4. Delete evaluations (references Response)
            await tx.evaluation.deleteMany({
              where: { responseId: { in: responseIds } },
            });
            
            // 5. Delete response artifacts (references Response)
            await tx.responseArtifact.deleteMany({
              where: { responseId: { in: responseIds } },
            });
            
            // 6. Delete responses
            await tx.response.deleteMany({
              where: { attemptId: { in: attemptIds } },
            });
          }
          
          // 7. Delete attempt sections
          await tx.attemptSection.deleteMany({
            where: { attemptId: { in: attemptIds } },
          });
          
          // 8. Delete attempts
          await tx.attempt.deleteMany({
            where: { studentId: id },
          });
        }
        
        // 9. Delete question reports by this user
        await tx.questionReport.deleteMany({
          where: { studentId: id },
        });
        
        // 10. Delete refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId: id },
        });
        
        // 11. Finally, delete the user
        return await tx.user.delete({
          where: { id },
        });
      });
    },
    'deleteUser'
  );
};

export const createUser = async (data: Prisma.UserCreateInput) => {
    // Hash password if provided
    if (data.password) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    }

    return withDatabaseErrorHandling(
        () => prisma.user.create({
            data
        }),
        'createUser'
    );
}

export const getUserPictureData = async (id: string) => {
  return withDatabaseErrorHandling(
    () => prisma.user.findUnique({
      where: { id },
      select: { pictureData: true, pictureMimeType: true }
    }),
    'getUserPictureData'
  );
};
