import * as redeemRepo from './redeem.repo';
import { RedeemOrderStatus, Role } from '@prisma/client';
import * as notificationService from '../notifications/notification.service';

export const getAllRedeemItems = async (activeOnly: boolean = false) => {
  return await redeemRepo.getAllRedeemItems(activeOnly);
};

export const getRedeemItemById = async (id: string) => {
  return await redeemRepo.getRedeemItemById(id);
};

export const createRedeemItem = async (data: {
  name: string;
  description?: string;
  pointsCost: number;
  itemType: string;
  metadata?: any;
}) => {
  return await redeemRepo.createRedeemItem(data);
};

export const updateRedeemItem = async (id: string, data: {
  name?: string;
  description?: string;
  pointsCost?: number;
  isActive?: boolean;
  metadata?: any;
}) => {
  return await redeemRepo.updateRedeemItem(id, data);
};

export const createRedeemOrder = async (
  userId: string, 
  itemId: string, 
  leaveDate?: Date, 
  message?: string
) => {
  const order = await redeemRepo.createRedeemOrder(userId, itemId, leaveDate, message);
  
  // Notify Admins (STAFF)
  // We use the new role-based notification helper or socket emission for now.
  await notificationService.notifyRole(
      Role.STAFF,
      'New Redeem Request',
      `A student has requested to redeem ${order.item.name}.`,
      'REDEEM',
      `/admin/redeem`
  );
  
  return order;
};

export const getRedeemOrders = async (filters: {
  userId?: string;
  status?: RedeemOrderStatus;
  page?: number;
  limit?: number;
}) => {
  return await redeemRepo.getRedeemOrders(filters);
};

export const getRedeemOrderById = async (id: string) => {
  return await redeemRepo.getRedeemOrderById(id);
};

export const updateRedeemOrder = async (
  id: string,
  data: {
    status?: RedeemOrderStatus;
    adminNotes?: string;
    rejectionReason?: string;
    reportUrl?: string;
    processedById?: string;
  }
) => {
  const updatedOrder = await redeemRepo.updateRedeemOrder(id, data);

  // Notify Student if status changed
  if (data.status) {
      let message = `Your redeem request for ${updatedOrder.item.name} has been updated to ${data.status}.`;
      if (data.status === RedeemOrderStatus.APPROVED) {
          message = `Your redeem request for ${updatedOrder.item.name} has been APPROVED!`;
      } else if (data.status === RedeemOrderStatus.REJECTED) {
          message = `Your redeem request for ${updatedOrder.item.name} has been REJECTED. reason: ${data.rejectionReason || 'No reason provided'}`;
      }

      await notificationService.createNotification(
          updatedOrder.userId,
          'Redeem Request Update',
          message,
          'REDEEM',
          '/student/redeem'
      );
  }

  return updatedOrder;
};

