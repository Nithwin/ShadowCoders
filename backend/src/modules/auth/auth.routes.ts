import { Express } from "express";
import * as authController from './auth.controller';
import { verifyAccess } from "../../middleware/auth";
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../../config/constants';
import { env } from '../../config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Rate limiter for authentication endpoints (prevents brute force)
const isLocalDevRequest = (ip?: string): boolean => {
  if (env.NODE_ENV === 'production') return false;
  if (!ip) return false;

  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  );
};

const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: {
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalDevRequest(req.ip),
});

export const registerAuthRoutes = (app:Express) => {

    // Public routes with rate limiting
    app.post('/api/auth/login', authLimiter, authController.emailLoginHandler);
    app.post('/api/auth/refresh', authLimiter, authController.refreshAccessTokenHandler);
    app.post('/api/auth/logout', authController.logoutHandler);

    // Protected routes
    app.get('/api/auth/me', verifyAccess, authController.getMeHandler);
    app.patch('/api/auth/me', verifyAccess, authController.updateMeHandler);
    app.post('/api/auth/change-password', verifyAccess, authController.changePasswordHandler);
    app.post('/api/auth/me/picture', verifyAccess, upload.single('picture'), authController.uploadProfilePictureHandler);
}
