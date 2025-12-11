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
exports.updateOrder = exports.getOrderById = exports.getAllOrders = exports.updateItem = exports.createItem = exports.getAllItems = exports.getMyOrders = exports.createOrder = exports.getAvailableItems = void 0;
const redeemService = __importStar(require("./redeem.service"));
// Student routes
const getAvailableItems = async (req, res) => {
    try {
        const items = await redeemService.getAllRedeemItems(true);
        res.json(items);
    }
    catch (error) {
        console.error('Error getting redeem items:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch redeem items' });
    }
};
exports.getAvailableItems = getAvailableItems;
const createOrder = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // cast to any for extended validation prop or use proper type if available
        const { itemId, leaveDate, message } = req.validatedData?.body || req.body;
        const order = await redeemService.createRedeemOrder(userId, itemId, leaveDate, message);
        res.status(201).json(order);
    }
    catch (error) {
        console.error('Error creating redeem order:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to create redeem order' });
    }
};
exports.createOrder = createOrder;
const getMyOrders = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { status, page = 1, limit = 20 } = req.query;
        const result = await redeemService.getRedeemOrders({
            userId,
            status: status,
            page: page,
            limit: limit,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error getting my orders:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch orders' });
    }
};
exports.getMyOrders = getMyOrders;
// Admin routes
const getAllItems = async (req, res) => {
    try {
        const items = await redeemService.getAllRedeemItems(false);
        res.json(items);
    }
    catch (error) {
        console.error('Error getting all redeem items:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch redeem items' });
    }
};
exports.getAllItems = getAllItems;
const createItem = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error creating redeem item:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to create redeem item' });
    }
};
exports.createItem = createItem;
const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            throw new Error("ID is required");
        const item = await redeemService.updateRedeemItem(id, req.body);
        res.json(item);
    }
    catch (error) {
        console.error('Error updating redeem item:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to update redeem item' });
    }
};
exports.updateItem = updateItem;
const getAllOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const result = await redeemService.getRedeemOrders({
            status: status,
            page: page,
            limit: limit,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error getting all orders:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch orders' });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            throw new Error("ID is required");
        const order = await redeemService.getRedeemOrderById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        console.error('Error getting order:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch order' });
    }
};
exports.getOrderById = getOrderById;
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            throw new Error("ID is required");
        const adminId = req.user?.sub;
        const { status, adminNotes, rejectionReason, reportUrl } = req.body;
        const order = await redeemService.updateRedeemOrder(id, {
            status,
            adminNotes,
            rejectionReason,
            reportUrl,
            ...(adminId ? { processedById: adminId } : {}),
        });
        res.json(order);
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to update order' });
    }
};
exports.updateOrder = updateOrder;
//# sourceMappingURL=redeem.controller.js.map