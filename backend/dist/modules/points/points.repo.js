"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointsHistory = exports.addPoints = exports.getUserPoints = void 0;
const prisma_1 = require("../../lib/prisma");
const getUserPoints = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, points: true },
    });
    return user?.points || 0;
};
exports.getUserPoints = getUserPoints;
const addPoints = async (userId, points, description, relatedId, relatedType) => {
    // Get current balance
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
    });
    if (!user) {
        throw { status: 404, message: 'User not found' };
    }
    const newBalance = user.points + points;
    // Update user points
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { points: newBalance },
    });
    // Create history entry
    await prisma_1.prisma.pointsHistory.create({
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
exports.addPoints = addPoints;
const getPointsHistory = async (userId, page = 1, limit = 20, type) => {
    const skip = (page - 1) * limit;
    const where = {
        userId,
    };
    if (type && type !== 'ALL') {
        where.type = type;
    }
    const [history, total] = await Promise.all([
        prisma_1.prisma.pointsHistory.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.pointsHistory.count({ where }),
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
exports.getPointsHistory = getPointsHistory;
//# sourceMappingURL=points.repo.js.map