import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export const getUserPoints = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, points: true },
  });
  return user?.points || 0;
};

export const addPoints = async (userId: string, points: number, description?: string, relatedId?: string, relatedType?: string) => {
  // Get current balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  
  const newBalance = user.points + points;
  
  // Update user points
  await prisma.user.update({
    where: { id: userId },
    data: { points: newBalance },
  });
  
  // Create history entry
  await prisma.pointsHistory.create({
    data: {
      userId,
      points,
      balance: newBalance,
      type: points > 0 ? 'EARNED' : 'SPENT',
      description: description ?? null,
      relatedId: relatedId ?? null,
      relatedType: relatedType ?? null,
    },
  });
  
  return newBalance;
};

export const getPointsHistory = async (userId: string, page: number = 1, limit: number = 20, type?: string) => {
  const skip = (page - 1) * limit;
  
  const where: Prisma.PointsHistoryWhereInput = {
    userId,
  };
  
  if (type && type !== 'ALL') {
    where.type = type;
  }
  
  const [history, total] = await Promise.all([
    prisma.pointsHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.pointsHistory.count({ where }),
  ]);
  
  return {
    history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

