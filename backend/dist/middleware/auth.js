"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.verifyAccess = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const verifyAccess = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next({ status: 401, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return next({ status: 401, message: 'Unauthorized' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (typeof decoded === 'object' && decoded.sub && decoded.role) {
            req.user = {
                sub: decoded.sub,
                role: String(decoded.role),
            };
            next();
        }
        else {
            throw new Error("invalid token payload");
        }
    }
    catch (error) {
        return next({ status: 401, message: 'Unauthorized' });
    }
};
exports.verifyAccess = verifyAccess;
const requireRole = (role) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || user.role != role) {
            return next({ status: 403, message: 'Forbidden' });
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map