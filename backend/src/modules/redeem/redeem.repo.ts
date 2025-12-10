import { prisma } from '../../lib/prisma';
import { RedeemOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const getAllRedeemItems = async (activeOnly: boolean = false) => {
  const where: Prisma.RedeemItemWhereInput = {};
  if (activeOnly) {
    where.isActive = true;
  }
  
  return await prisma.redeemItem.findMany({
    where,
    orderBy: { pointsCost: 'asc' },
  });
};

export const getRedeemItemById = async (id: string) => {
  return await prisma.redeemItem.findUnique({
    where: { id },
  });
};

export const createRedeemItem = async (data: {
  name: string;
  description?: string;
  pointsCost: number;
  itemType: string;
  metadata?: any;
}) => {
  return await prisma.redeemItem.create({
    data,
  });
};

export const updateRedeemItem = async (id: string, data: {
  name?: string;
  description?: string;
  pointsCost?: number;
  isActive?: boolean;
  metadata?: any;
}) => {
  return await prisma.redeemItem.update({
    where: { id },
    data,
  });
};

export const createRedeemOrder = async (
  userId: string, 
  itemId: string, 
  leaveDate?: Date, 
  message?: string
) => {
  // Get item and user in a transaction
  const [item, user] = await Promise.all([
    prisma.redeemItem.findUnique({ where: { id: itemId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
  ]);
  
  if (!item) {
    throw { status: 404, message: 'Redeem item not found' };
  }
  
  if (!item.isActive) {
    throw { status: 400, message: 'This item is not available for redemption' };
  }
  
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  
  if (user.points < item.pointsCost) {
    throw { status: 400, message: 'Insufficient points' };
  }
  
  // Create order and deduct points in a transaction
  return await prisma.$transaction(async (tx) => {
    // Deduct points
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { points: { decrement: item.pointsCost } },
    });
    
    // Create points history entry
    await tx.pointsHistory.create({
      data: {
        userId,
        points: -item.pointsCost,
        balance: updatedUser.points,
        type: 'SPENT',
        description: `Redeemed: ${item.name}`,
        relatedId: null,
        relatedType: 'ORDER',
      },
    });
    
    // Create order
    const order = await tx.redeemOrder.create({
      data: {
        userId,
        itemId,
        pointsCost: item.pointsCost,
        status: 'PENDING',
        leaveDate: leaveDate || null,
        message: message || null,
      },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reg_no: true,
          },
        },
      },
    });
    
    return order;
  });
};

export const getRedeemOrders = async (filters: {
  userId?: string;
  status?: RedeemOrderStatus;
  page?: number;
  limit?: number;
}) => {
  const { userId, status, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;
  
  const where: Prisma.RedeemOrderWhereInput = {};
  if (userId) {
    where.userId = userId;
  }
  if (status) {
    where.status = status;
  }
  
  const [orders, total] = await Promise.all([
    prisma.redeemOrder.findMany({
      where,
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reg_no: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.redeemOrder.count({ where }),
  ]);
  
  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getRedeemOrderById = async (id: string) => {
  return await prisma.redeemOrder.findUnique({
    where: { id },
    include: {
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
    },
  });
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
  const order = await prisma.redeemOrder.findUnique({
    where: { id },
  });
  
  if (!order) {
    throw { status: 404, message: 'Order not found' };
  }
  
  // If rejecting, refund points
  if (data.status === 'REJECTED' && order.status !== 'REJECTED') {
    return await prisma.$transaction(async (tx) => {
      // Refund points
      const updatedUser = await tx.user.update({
        where: { id: order.userId },
        data: { points: { increment: order.pointsCost } },
      });
      
      // Create points history entry
      await tx.pointsHistory.create({
        data: {
          userId: order.userId,
          points: order.pointsCost,
          balance: updatedUser.points,
          type: 'REFUND',
          description: `Refund for rejected order: ${order.id}`,
          relatedId: order.id,
          relatedType: 'ORDER',
        },
      });
      
      // Update order
      return await tx.redeemOrder.update({
        where: { id },
        data: {
          ...data,
          processedAt: new Date(),
        },
        include: {
          item: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              reg_no: true,
            },
          },
        },
      });
    });
  }
  
  // If approving, just update the order
  if (data.status === 'APPROVED' || data.status === 'COMPLETED') {
    return await prisma.redeemOrder.update({
      where: { id },
      data: {
        ...data,
        processedAt: new Date(),
      },
      include: {
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reg_no: true,
          },
        },
      },
    });
  }
  
  // For other status updates
  return await prisma.redeemOrder.update({
    where: { id },
    data,
    include: {
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
    },
  });
};

