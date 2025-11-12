import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { registerAuthRoutes } from './modules/auth/auth.routes';
import { registerExamRoutes } from './modules/exams/exam.routes';
import { errorHandler } from './middleware/error';
import { registerQuestionRoutes } from './modules/questions/question.routes';
import { registerAttemptRoutes } from './modules/attempts/attempt.routes';
import { registerEvaluationRoutes } from './modules/evaluations/evaluation.routes';
import { registerRubricRoutes } from './modules/rubrics/rubric.routes';
import { registerAssetRoutes } from './modules/assets/asset.routes';
import { registerSectionRoutes } from './modules/sections/section.routes';
import { registerAiRoutes } from './modules/ai/ai.routes';
import { registerGradingRoutes } from './modules/grading/grading.routes';
import { env } from './config/env';

export const createApp = () => {
    const app = express();

    app.use(helmet());

    // Configure CORS to allow cookies (credentials) from the frontend origin
    // Build allowed origins list from environment variables
    const allowedOrigins: string[] = [];
    
    // Add default localhost origins for development
    if (env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
    }
    
    // Add FRONTEND_ORIGIN if specified
    if (env.FRONTEND_ORIGIN) {
        allowedOrigins.push(env.FRONTEND_ORIGIN);
    }
    
    // Add multiple origins from ALLOWED_ORIGINS (comma-separated)
    if (env.ALLOWED_ORIGINS) {
        const origins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o);
        allowedOrigins.push(...origins);
    }
    
    const corsOptions: cors.CorsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) {
                return callback(null, true);
            }
            
            // Check if origin is in allowed list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            
            // Allow ngrok URLs dynamically if enabled (for development/testing)
            if (env.ALLOW_NGROK && origin.includes('.ngrok-free.app')) {
                return callback(null, true);
            }
            
            // Also allow ngrok.io domains (legacy ngrok domains)
            if (env.ALLOW_NGROK && origin.includes('.ngrok.io')) {
                return callback(null, true);
            }
            
            // Allow custom ngrok domains if pattern matches
            if (env.ALLOW_NGROK && origin.includes('.ngrok.app')) {
                return callback(null, true);
            }
            
            // Reject all other origins
            callback(new Error(`Not allowed by CORS: ${origin}`));
        },
        credentials: true,
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
        exposedHeaders: ['Set-Cookie', 'Content-Disposition', 'Content-Type'],
    };
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(cookieParser());

    app.get('/api/healthz', async (_req, res) => {
        const { checkDatabaseHealth } = await import('./lib/db-health');
        const dbHealth = await checkDatabaseHealth();
        
        if (dbHealth.connected) {
            res.json({
                status: 'healthy',
                database: {
                    connected: true,
                    timestamp: dbHealth.timestamp,
                }
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                database: {
                    connected: false,
                    error: dbHealth.error,
                    errorCode: dbHealth.errorCode,
                    details: dbHealth.details,
                    timestamp: dbHealth.timestamp,
                },
                help: 'See backend/DB_CONNECTION_FIX.md for troubleshooting steps'
            });
        }
    })

    registerAuthRoutes(app);
    registerExamRoutes(app);
    registerQuestionRoutes(app);
    registerAttemptRoutes(app);
    registerEvaluationRoutes(app);
    registerRubricRoutes(app);
    registerAssetRoutes(app);
    registerSectionRoutes(app);
    registerAiRoutes(app);
    registerGradingRoutes(app);
    app.use(errorHandler);

    return app;
}