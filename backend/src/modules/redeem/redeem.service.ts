import * as redeemRepo from './redeem.repo';
import { RedeemOrderStatus } from '@prisma/client';

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
  return await redeemRepo.createRedeemOrder(userId, itemId, leaveDate, message);
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
  return await redeemRepo.updateRedeemOrder(id, data);
};

