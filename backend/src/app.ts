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
    const allowedOrigins = [
        env.FRONTEND_ORIGIN || 'http://localhost:3000',
        'http://localhost:3001'
    ];
    const corsOptions: cors.CorsOptions = {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
        exposedHeaders: ['Set-Cookie', 'Content-Disposition', 'Content-Type'],
    };
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(cookieParser());

    app.get('/api/healthz', (_req, res) => {
        res.json({status:'healthy'});
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