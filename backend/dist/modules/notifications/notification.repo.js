"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = exports.createNotification = void 0;
const prisma_1 = require("../../lib/prisma");
const createNotification = async (data) => {
    return await prisma_1.prisma.notification.create({
        data,
    });
};
exports.createNotification = createNotification;
const getNotifications = async (userId, limit = 20) => {
    return await prisma_1.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
};
exports.getNotifications = getNotifications;
const markAsRead = async (id, userId) => {
    return await prisma_1.prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
    });
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (userId) => {
    return await prisma_1.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
};
exports.markAllAsRead = markAllAsRead;
//# sourceMappingURL=notification.repo.js.map