"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyRole = exports.markAllAsRead = exports.markAsRead = exports.getUserNotifications = exports.createNotification = void 0;
const notificationRepo = __importStar(require("./notification.repo"));
const socket_1 = require("../../lib/socket");
const client_1 = require("@prisma/client");
const createNotification = async (userId, title, message, type, link, metadata) => {
    const notification = await notificationRepo.createNotification({
        user: { connect: { id: userId } },
        title,
        message,
        type,
        // Prisma expects null or string, but link is string | undefined
        link: link ?? null,
        metadata: metadata ?? client_1.Prisma.JsonNull
    });
    // Emit real-time notification
    socket_1.examMonitoring.sendNotification(userId, notification);
    return notification;
};
exports.createNotification = createNotification;
const getUserNotifications = async (userId) => {
    return await notificationRepo.getNotifications(userId);
};
exports.getUserNotifications = getUserNotifications;
const markAsRead = async (id, userId) => {
    return await notificationRepo.markAsRead(id, userId);
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (userId) => {
    return await notificationRepo.markAllAsRead(userId);
};
exports.markAllAsRead = markAllAsRead;
const notifyRole = async (role, title, message, type, link) => {
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
    socket_1.examMonitoring.sendRoleNotification(role, {
        title,
        message,
        type,
        link,
        timestamp: new Date()
    });
};
exports.notifyRole = notifyRole;
//# sourceMappingURL=notification.service.js.map