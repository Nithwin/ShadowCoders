"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRedeemOrder = exports.getRedeemOrderById = exports.getRedeemOrders = exports.createRedeemOrder = exports.updateRedeemItem = exports.createRedeemItem = exports.getRedeemItemById = exports.getAllRedeemItems = void 0;
const prisma_1 = require("../../lib/prisma");
const getAllRedeemItems = async (activeOnly = false) => {
    const where = {};
    if (activeOnly) {
        where.isActive = true;
    }
    return await prisma_1.prisma.redeemItem.findMany({
        where,
        orderBy: { pointsCost: 'asc' },
    });
};
exports.getAllRedeemItems = getAllRedeemItems;
const getRedeemItemById = async (id) => {
    return await prisma_1.prisma.redeemItem.findUnique({
        where: { id },
    });
};
exports.getRedeemItemById = getRedeemItemById;
const createRedeemItem = async (data) => {
    return await prisma_1.prisma.redeemItem.create({
        data,
    });
};
exports.createRedeemItem = createRedeemItem;
const updateRedeemItem = async (id, data) => {
    return await prisma_1.prisma.redeemItem.update({
        where: { id },
        data,
    });
};
exports.updateRedeemItem = updateRedeemItem;
const createRedeemOrder = async (userId, itemId, leaveDate, message) => {
    // Get item and user in a transaction
    const [item, user] = await Promise.all([
        prisma_1.prisma.redeemItem.findUnique({ where: { id: itemId } }),
        prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
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
    return await prisma_1.prisma.$transaction(async (tx) => {
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
exports.createRedeemOrder = createRedeemOrder;
const getRedeemOrders = async (filters) => {
    const { userId, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (userId) {
        where.userId = userId;
    }
    if (status) {
        where.status = status;
    }
    const [orders, total] = await Promise.all([
        prisma_1.prisma.redeemOrder.findMany({
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
        prisma_1.prisma.redeemOrder.count({ where }),
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
exports.getRedeemOrders = getRedeemOrders;
const getRedeemOrderById = async (id) => {
    return await prisma_1.prisma.redeemOrder.findUnique({
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
exports.getRedeemOrderById = getRedeemOrderById;
const updateRedeemOrder = async (id, data) => {
    const order = await prisma_1.prisma.redeemOrder.findUnique({
        where: { id },
    });
    if (!order) {
        throw { status: 404, message: 'Order not found' };
    }
    // If rejecting, refund points
    if (data.status === 'REJECTED' && order.status !== 'REJECTED') {
        return await prisma_1.prisma.$transaction(async (tx) => {
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
        return await prisma_1.prisma.redeemOrder.update({
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
    return await prisma_1.prisma.redeemOrder.update({
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
exports.updateRedeemOrder = updateRedeemOrder;
//# sourceMappingURL=redeem.repo.js.map