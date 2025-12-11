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
exports.registerPointsRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const pointsController = __importStar(require("./points.controller"));
const points_zod_1 = require("./points.zod");
const registerPointsRoutes = (app) => {
    // Student routes
    app.get('/api/student/points', auth_1.verifyAccess, pointsController.getMyPoints);
    app.get('/api/student/points/history', auth_1.verifyAccess, (0, validate_1.validate)(points_zod_1.getPointsHistorySchema), pointsController.getMyPointsHistory);
    // Admin routes
    app.post('/api/admin/points/adjust', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(points_zod_1.adjustPointsSchema), pointsController.adjustPoints);
    // Admin route to add points by email (for testing)
    app.post('/api/admin/points/add-by-email', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(points_zod_1.addPointsByEmailSchema), pointsController.addPointsByEmail);
};
exports.registerPointsRoutes = registerPointsRoutes;
//# sourceMappingURL=points.routes.js.map