import { Express } from "express";
import * as authController from './auth.controller';
import { verifyAccess } from "../../middleware/auth";

export const registerAuthRoutes = (app:Express) => {
    app.post('/api/auth/google/callback/', authController.googleOAuthHandler);

    app.post('/api/auth/login', authController.emailLoginHandler);

    app.get('/api/me', verifyAccess, authController.getMeHandler);
    app.patch('/api/me', verifyAccess, authController.updateMeHandler);

    app.post('/api/auth/refresh', authController.refreshAccessTokenHandler);
    
    app.post('/api/auth/logout', authController.logoutHandler);
}