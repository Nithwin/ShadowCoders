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
exports.updateRedeemOrder = exports.getRedeemOrderById = exports.getRedeemOrders = exports.createRedeemOrder = exports.updateRedeemItem = exports.createRedeemItem = exports.getRedeemItemById = exports.getAllRedeemItems = void 0;
const redeemRepo = __importStar(require("./redeem.repo"));
const client_1 = require("@prisma/client");
const notificationService = __importStar(require("../notifications/notification.service"));
const getAllRedeemItems = async (activeOnly = false) => {
    return await redeemRepo.getAllRedeemItems(activeOnly);
};
exports.getAllRedeemItems = getAllRedeemItems;
const getRedeemItemById = async (id) => {
    return await redeemRepo.getRedeemItemById(id);
};
exports.getRedeemItemById = getRedeemItemById;
const createRedeemItem = async (data) => {
    return await redeemRepo.createRedeemItem(data);
};
exports.createRedeemItem = createRedeemItem;
const updateRedeemItem = async (id, data) => {
    return await redeemRepo.updateRedeemItem(id, data);
};
exports.updateRedeemItem = updateRedeemItem;
const createRedeemOrder = async (userId, itemId, leaveDate, message) => {
    const order = await redeemRepo.createRedeemOrder(userId, itemId, leaveDate, message);
    // Notify Admins (STAFF)
    // We use the new role-based notification helper or socket emission for now.
    await notificationService.notifyRole(client_1.Role.STAFF, 'New Redeem Request', `A student has requested to redeem ${order.item.name}.`, 'REDEEM', `/admin/redeem`);
    return order;
};
exports.createRedeemOrder = createRedeemOrder;
const getRedeemOrders = async (filters) => {
    return await redeemRepo.getRedeemOrders(filters);
};
exports.getRedeemOrders = getRedeemOrders;
const getRedeemOrderById = async (id) => {
    return await redeemRepo.getRedeemOrderById(id);
};
exports.getRedeemOrderById = getRedeemOrderById;
const updateRedeemOrder = async (id, data) => {
    const updatedOrder = await redeemRepo.updateRedeemOrder(id, data);
    // Notify Student if status changed
    if (data.status) {
        let message = `Your redeem request for ${updatedOrder.item.name} has been updated to ${data.status}.`;
        if (data.status === client_1.RedeemOrderStatus.APPROVED) {
            message = `Your redeem request for ${updatedOrder.item.name} has been APPROVED!`;
        }
        else if (data.status === client_1.RedeemOrderStatus.REJECTED) {
            message = `Your redeem request for ${updatedOrder.item.name} has been REJECTED. reason: ${data.rejectionReason || 'No reason provided'}`;
        }
        await notificationService.createNotification(updatedOrder.userId, 'Redeem Request Update', message, 'REDEEM', '/student/redeem');
    }
    return updatedOrder;
};
exports.updateRedeemOrder = updateRedeemOrder;
//# sourceMappingURL=redeem.service.js.map