import { Express } from "express";
import * as authController from './auth.controller';
import { verifyAccess } from "../../middleware/auth";

export const registerAuthRoutes = (app:Express) => {
    app.post('/api/auth/google/callback/', authController.googleOAuthHandler);

    app.post('/api/auth/login', authController.emailLoginHandler);

    app.get('/api/me', verifyAccess, authController.getMeHandler);
}