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
exports.getUserStatsHandler = exports.getUserActivityHandler = void 0;
const activityService = __importStar(require("./activity.service"));
const getUserActivityHandler = async (req, res, next) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        const year = req.query.year ? parseInt(req.query.year) : undefined;
        const activityData = await activityService.getUserActivityData(userId, year);
        res.json(activityData);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserActivityHandler = getUserActivityHandler;
const getUserStatsHandler = async (req, res, next) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        const stats = await activityService.getUserStats(userId);
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserStatsHandler = getUserStatsHandler;
//# sourceMappingURL=activity.controller.js.map