
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../../lib/prisma';

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

export const mockDbError = (code: string = 'P2002') => {
  const error = new Error('Database Error');
  (error as any).code = code;
  return error;
};
