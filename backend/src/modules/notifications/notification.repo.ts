import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export const createNotification = async (data: Prisma.NotificationCreateInput) => {
  return await prisma.notification.create({
    data,
  });
};

export const getNotifications = async (userId: string, limit: number = 20) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

export const markAsRead = async (id: string, userId: string) => {
  return await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};
