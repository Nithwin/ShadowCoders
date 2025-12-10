import * as notificationRepo from './notification.repo';
import { examMonitoring } from '../../lib/socket';
import { Role, Prisma } from '@prisma/client';

export const createNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: string, 
  link?: string,
  metadata?: any
) => {
  const notification = await notificationRepo.createNotification({
    user: { connect: { id: userId } },
    title,
    message,
    type,
    // Prisma expects null or string, but link is string | undefined
    link: link ?? null,
    metadata: metadata ?? Prisma.JsonNull
  });

  // Emit real-time notification
  examMonitoring.sendNotification(userId, notification);

  return notification;
};

export const getUserNotifications = async (userId: string) => {
  return await notificationRepo.getNotifications(userId);
};

export const markAsRead = async (id: string, userId: string) => {
  return await notificationRepo.markAsRead(id, userId);
};

export const markAllAsRead = async (userId: string) => {
  return await notificationRepo.markAllAsRead(userId);
};

export const notifyRole = async (role: Role, title: string, message: string, type: string, link?: string) => {
    // This is a bit complex since we need actual userIds to create DB records.
    // For now, we will just emit the socket event for real-time alert, 
    // BUT we should ideally fetch all users with that role and create notifications.
    // However, for high-volume roles (like STUDENT), this is bad. For STAFF, it's okay.
    
    // NOTE: For this specific task (Redeem), we probably only need to notify persistent DB notifications 
    // to specific users (the student who requested, and maybe specific admins if we had that logic).
    // Broadcasting to all STAFF via socket is fine for real-time, but persistence needs consideration.
    
    // Solution: Emit socket event to 'role:STAFF' so they get a toast/badge update.
    // Individual persistent notifications might be created only when a specific admin acts, 
    // OR we just rely on the UI fetching "pending orders" for the red dot on the Redeem page itself.
    
    // Implementing purely socket-based role notification for now to keep it lightweight.
    
    examMonitoring.sendRoleNotification(role, {
        title,
        message,
        type,
        link,
        timestamp: new Date()
    });
};
