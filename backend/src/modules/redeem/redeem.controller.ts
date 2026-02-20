import { Request, Response } from 'express';
import * as redeemService from './redeem.service';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../middleware/auth';
import {
  createRedeemItemSchema,
  updateRedeemItemSchema,
  createRedeemOrderSchema,
  updateRedeemOrderSchema,
  listRedeemOrdersSchema,
} from './redeem.zod';

// Student routes
export const getAvailableItems = async (req: Request, res: Response) => {
  try {
    const items = await redeemService.getAllRedeemItems(true);
    res.json(items);
  } catch (error: any) {
    console.error('Error getting redeem items:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch redeem items' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // cast to any for extended validation prop or use proper type if available
    const { itemId, leaveDate, message } = (req as any).validatedData?.body || req.body;
    const order = await redeemService.createRedeemOrder(userId, itemId, leaveDate, message);
    res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating redeem order:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to create redeem order' });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { status, page = '1', limit = '20' } = req.query;
    const result = await redeemService.getRedeemOrders({
      userId,
      status: status as any,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 20,
    });
    
    res.json(result);
  } catch (error: any) {
    console.error('Error getting my orders:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

// Admin routes
export const getAllItems = async (req: Request, res: Response) => {
  try {
    const items = await redeemService.getAllRedeemItems(false);
    res.json(items);
  } catch (error: any) {
    console.error('Error getting all redeem items:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch redeem items' });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { name, description, pointsCost, itemType, metadata } = req.body;
    const item = await redeemService.createRedeemItem({
      name,
      description,
      pointsCost,
      itemType,
      metadata,
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating redeem item:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to create redeem item' });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error("ID is required");
    const item = await redeemService.updateRedeemItem(id, req.body);
    res.json(item);
  } catch (error: any) {
    console.error('Error updating redeem item:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to update redeem item' });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await redeemService.getRedeemOrders({
      status: status as any,
      page: page as number,
      limit: limit as number,
    });
    
    res.json(result);
  } catch (error: any) {
    console.error('Error getting all orders:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error("ID is required");
    const order = await redeemService.getRedeemOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error: any) {
    console.error('Error getting order:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch order' });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error("ID is required");
    const adminId = (req as AuthenticatedRequest).user?.sub;
    const { status, adminNotes, rejectionReason, reportUrl } = req.body;
    
    const order = await redeemService.updateRedeemOrder(id, {
      status,
      adminNotes,
      rejectionReason,
      reportUrl,
      ...(adminId ? { processedById: adminId } : {}),
    });
    
    res.json(order);
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to update order' });
  }
};

