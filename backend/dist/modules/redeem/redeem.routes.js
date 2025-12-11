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
exports.registerRedeemRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const redeemController = __importStar(require("./redeem.controller"));
const redeem_zod_1 = require("./redeem.zod");
const registerRedeemRoutes = (app) => {
    // Student routes
    app.get('/api/student/redeem/items', auth_1.verifyAccess, redeemController.getAvailableItems);
    app.post('/api/student/redeem/orders', auth_1.verifyAccess, (0, validate_1.validate)(redeem_zod_1.createRedeemOrderSchema), redeemController.createOrder);
    app.get('/api/student/redeem/orders', auth_1.verifyAccess, (0, validate_1.validate)(redeem_zod_1.listRedeemOrdersSchema), redeemController.getMyOrders);
    // Admin routes
    app.get('/api/admin/redeem/items', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), redeemController.getAllItems);
    app.post('/api/admin/redeem/items', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(redeem_zod_1.createRedeemItemSchema), redeemController.createItem);
    app.put('/api/admin/redeem/items/:id', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(redeem_zod_1.updateRedeemItemSchema), redeemController.updateItem);
    app.get('/api/admin/redeem/orders', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(redeem_zod_1.listRedeemOrdersSchema), redeemController.getAllOrders);
    app.get('/api/admin/redeem/orders/:id', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), redeemController.getOrderById);
    app.put('/api/admin/redeem/orders/:id', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(redeem_zod_1.updateRedeemOrderSchema), redeemController.updateOrder);
};
exports.registerRedeemRoutes = registerRedeemRoutes;
//# sourceMappingURL=redeem.routes.js.map