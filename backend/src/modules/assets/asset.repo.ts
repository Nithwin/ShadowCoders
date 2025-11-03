import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Creates a new asset record in the database.
 */
export const createAsset = (data: Prisma.AssetCreateInput) => {
  return prisma.asset.create({
    data,
    select: {
      id: true,
      kind: true,
      url: true,
      createdAt: true,
      meta: true,
    },
  });
};