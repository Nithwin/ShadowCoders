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
exports.addPointsByEmail = exports.adjustPoints = exports.getMyPointsHistory = exports.getMyPoints = void 0;
const pointsService = __importStar(require("./points.service"));
const prisma_1 = require("../../lib/prisma");
const getMyPoints = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const points = await pointsService.getUserPoints(userId);
        res.json({ points });
    }
    catch (error) {
        console.error('Error getting points:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch points' });
    }
};
exports.getMyPoints = getMyPoints;
const getMyPointsHistory = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { page = 1, limit = 20, type } = req.query;
        const result = await pointsService.getPointsHistory(userId, page, limit, type);
        res.json(result);
    }
    catch (error) {
        console.error('Error getting points history:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to fetch points history' });
    }
};
exports.getMyPointsHistory = getMyPointsHistory;
const adjustPoints = async (req, res) => {
    try {
        const { userId, points, description } = req.validatedData?.body || req.body;
        const newBalance = await pointsService.addPoints(userId, points, description);
        res.json({
            message: 'Points adjusted successfully',
            newBalance,
        });
    }
    catch (error) {
        console.error('Error adjusting points:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to adjust points' });
    }
};
exports.adjustPoints = adjustPoints;
const addPointsByEmail = async (req, res) => {
    try {
        const { email, points, description } = req.validatedData?.body || req.body;
        // Find user by email
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, points: true },
        });
        if (!user) {
            return res.status(404).json({ message: `User with email ${email} not found` });
        }
        const newBalance = await pointsService.addPoints(user.id, points, description || `Points added via API for testing`);
        res.json({
            message: 'Points added successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            pointsAdded: points,
            previousBalance: user.points || 0,
            newBalance,
        });
    }
    catch (error) {
        console.error('Error adding points by email:', error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to add points' });
    }
};
exports.addPointsByEmail = addPointsByEmail;
//# sourceMappingURL=points.controller.js.map