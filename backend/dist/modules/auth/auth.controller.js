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
exports.uploadProfilePictureHandler = exports.changePasswordHandler = exports.updateMeHandler = exports.logoutHandler = exports.refreshAccessTokenHandler = exports.getMeHandler = exports.emailLoginHandler = exports.googleOAuthHandler = void 0;
const authService = __importStar(require("./auth.service"));
const cookie_utils_1 = require("../../lib/cookie-utils");
const googleOAuthHandler = async (req, res, next) => {
    try {
        const userProfile = req.body;
        const { accessToken, refreshToken } = await authService.handleGoogleLogin(userProfile);
        const cookieOptions = (0, cookie_utils_1.getCookieOptions)(req);
        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.json({ accessToken });
    }
    catch (error) {
        next(error);
    }
};
exports.googleOAuthHandler = googleOAuthHandler;
const emailLoginHandler = async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = await authService.handleEmailLogin(req.body);
        const cookieOptions = (0, cookie_utils_1.getCookieOptions)(req);
        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.json({ accessToken });
    }
    catch (error) {
        next(error);
    }
};
exports.emailLoginHandler = emailLoginHandler;
const getMeHandler = async (req, res, next) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        const user = await authService.findUserById(userId);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
};
exports.getMeHandler = getMeHandler;
const refreshAccessTokenHandler = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return next({ status: 401, message: 'Refresh token not found' });
        }
        const newAccessToken = await authService.handleRefreshToken(refreshToken);
        res.json({ accessToken: newAccessToken });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshAccessTokenHandler = refreshAccessTokenHandler;
const logoutHandler = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            // 1. Tell the service to delete the token from the database
            await authService.handleLogout(refreshToken);
        }
        // 2. Clear the httpOnly cookie from the browser
        // Use same settings as when setting the cookie
        const cookieOptions = (0, cookie_utils_1.getCookieOptions)(req);
        res.clearCookie('refreshToken', cookieOptions);
        // 3. Send a success response
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.logoutHandler = logoutHandler;
const updateMeHandler = async (req, res, next) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        const updateData = req.body;
        const updatedUser = await authService.updateUserProfile(userId, updateData);
        res.json(updatedUser);
    }
    catch (error) {
        next(error);
    }
};
exports.updateMeHandler = updateMeHandler;
const changePasswordHandler = async (req, res, next) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        await authService.changePassword(userId, req.body);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.changePasswordHandler = changePasswordHandler;
const uploadProfilePictureHandler = async (req, res, next) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        if (!req.file) {
            return next({ status: 400, message: 'No file uploaded' });
        }
        const pictureUrl = await authService.updateProfilePicture(userId, req.file);
        res.json({ pictureUrl });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadProfilePictureHandler = uploadProfilePictureHandler;
//# sourceMappingURL=auth.controller.js.map