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
    () => prisma.user.delete({
      where: { id },
    }),
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
