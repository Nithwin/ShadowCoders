import { Express } from "express";
import * as authController from './auth.controller';
import { verifyAccess } from "../../middleware/auth";
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const registerAuthRoutes = (app:Express) => {
    app.post('/api/auth/google/callback/', authController.googleOAuthHandler);

    app.post('/api/auth/login', authController.emailLoginHandler);

    app.get('/api/auth/me', verifyAccess, authController.getMeHandler);
    app.patch('/api/auth/me', verifyAccess, authController.updateMeHandler);
    app.post('/api/auth/change-password', verifyAccess, authController.changePasswordHandler);
    app.post('/api/auth/me/picture', verifyAccess, upload.single('picture'), authController.uploadProfilePictureHandler);

    app.post('/api/auth/refresh', authController.refreshAccessTokenHandler);
    
    app.post('/api/auth/logout', authController.logoutHandler);
}