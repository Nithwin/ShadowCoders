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
exports.registerUserRoutes = void 0;
const express_1 = require("express");
const userController = __importStar(require("./users.controller"));
const auth_1 = require("../../middleware/auth");
const registerUserRoutes = (app) => {
    const router = (0, express_1.Router)();
    // Routes requiring only authentication (Student + Staff)
    router.use(auth_1.verifyAccess);
    router.get('/:id/picture', userController.getUserPicture);
    // Routes requiring STAFF (Admin) role
    const adminRouter = (0, express_1.Router)();
    adminRouter.use((0, auth_1.requireRole)('STAFF'));
    adminRouter.get('/', userController.getAllUsers);
    adminRouter.post('/', userController.createUser);
    adminRouter.get('/:id', userController.getUserById);
    adminRouter.put('/:id', userController.updateUser);
    adminRouter.delete('/:id', userController.deleteUser);
    // Mount admin routes (effectively applying the middleware to them)
    router.use('/', adminRouter);
    app.use('/api/users', router);
};
exports.registerUserRoutes = registerUserRoutes;
//# sourceMappingURL=users.routes.js.map