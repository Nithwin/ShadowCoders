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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfilePicture = exports.changePassword = exports.updateUserProfile = exports.handleLogout = exports.handleRefreshToken = exports.findUserById = exports.handleEmailLogin = void 0;
const authRepo = __importStar(require("./auth.repo"));
const tokenService = __importStar(require("./token.service"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../lib/prisma");
// --- (Your GoogleProfile interface) ---
const handleEmailLogin = async (input) => {
    try {
        // Normalize email to lowercase for consistent lookup
        const normalizedEmail = input.email?.toLowerCase().trim();
        if (!normalizedEmail || !input.password) {
            throw { status: 400, message: 'Email and password are required' };
        }
        const user = await authRepo.findUserByEmail(normalizedEmail);
        // Check for database connection errors
        if (!user || !user.password) {
            throw { status: 401, message: 'Invalid email or password' };
        }
        const isPasswordValid = await bcrypt_1.default.compare(input.password, user.password);
        if (!isPasswordValid) {
            throw { status: 401, message: 'Invalid email or password' };
        }
        const payload = { sub: user.id, role: user.role };
        // **UPDATED:** Use new token service
        const accessToken = tokenService.generateAccessToken(payload);
        const refreshToken = await tokenService.generateAndSaveRefreshToken(user.id);
        return { accessToken, refreshToken };
    }
    catch (error) {
        // Handle database connection errors
        if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database server')) {
            throw {
                status: 503,
                message: 'Database connection failed. Please check your database configuration.',
                code: 'DATABASE_CONNECTION_ERROR',
                details: 'The application cannot connect to the database. Please verify your DATABASE_URL and ensure the database server is running.'
            };
        }
        // Re-throw other errors (like 401)
        throw error;
    }
};
exports.handleEmailLogin = handleEmailLogin;
// --- (Your existing findUserById function) ---
const findUserById = async (id) => {
    return authRepo.findUserById(id);
};
exports.findUserById = findUserById;
// --- **NEW FUNCTION TO ADD** ---
/**
 * Verifies a refresh token and issues a new access token.
 */
const handleRefreshToken = async (rawRefreshToken) => {
    // 1. Verify token and find the user
    const user = await tokenService.verifyAndFindUser(rawRefreshToken);
    if (!user) {
        throw { status: 401, message: 'Invalid or expired refresh token' };
    }
    // 2. Issue a new access token
    const payload = { sub: user.id, role: user.role };
    const newAccessToken = tokenService.generateAccessToken(payload);
    return newAccessToken;
};
exports.handleRefreshToken = handleRefreshToken;
const handleLogout = async (rawRefreshToken) => {
    // Call the token service to find and remove the token from the DB
    const success = await tokenService.findAndRemoveRefreshToken(rawRefreshToken);
    if (!success) {
        // This isn't a critical error; token may already be invalid or removed.
    }
    return true;
};
exports.handleLogout = handleLogout;
const updateUserProfile = async (userId, updateData) => {
    // Only allow updating specific fields
    const dataToUpdate = {};
    if (updateData.name !== undefined) {
        dataToUpdate.name = updateData.name;
    }
    // reg_no is INTENTIONALLY OMITTED to prevent updates
    if (updateData.year !== undefined) {
        dataToUpdate.year = updateData.year;
    }
    if (updateData.department !== undefined) {
        dataToUpdate.department = updateData.department;
    }
    if (updateData.section !== undefined) {
        dataToUpdate.section = updateData.section;
    }
    if (updateData.pictureUrl !== undefined) {
        dataToUpdate.pictureUrl = updateData.pictureUrl;
    }
    if (updateData.leetcodeId !== undefined) {
        dataToUpdate.leetcodeId = updateData.leetcodeId;
    }
    return authRepo.updateUser(userId, dataToUpdate);
};
exports.updateUserProfile = updateUserProfile;
const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await authRepo.findUserById(userId);
    if (!user || !user.password) {
        throw { status: 404, message: 'User not found' };
    }
    const isPasswordValid = await bcrypt_1.default.compare(currentPassword, user.password);
    if (!isPasswordValid) {
        throw { status: 400, message: 'Invalid current password' };
    }
    const salt = await bcrypt_1.default.genSalt(10);
    const hashedPassword = await bcrypt_1.default.hash(newPassword, salt);
    return authRepo.updatePassword(userId, hashedPassword);
};
exports.changePassword = changePassword;
const updateProfilePicture = async (userId, file) => {
    const user = await authRepo.findUserById(userId);
    if (!user) {
        throw { status: 404, message: 'User not found' };
    }
    // Store image directly in the database
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            pictureData: file.buffer,
            pictureMimeType: file.mimetype,
            // Update pictureUrl to point to the endpoint that serves the DB image
            pictureUrl: `/api/users/${userId}/picture`
        }
    });
    return `/api/users/${userId}/picture`;
};
exports.updateProfilePicture = updateProfilePicture;
//# sourceMappingURL=auth.service.js.map