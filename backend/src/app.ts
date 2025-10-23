import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { registerAuthRoutes } from './modules/auth/auth.routes';
import { registerExamRoutes } from './modules/exams/exam.routes';
import { errorHandler } from './middleware/error';

export const createApp = () => {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(cookieParser());

    app.get('/api/healthz', (_req, res) => {
        res.json({status:'healthy'});
    })

    registerAuthRoutes(app);
    registerExamRoutes(app);

    app.use(errorHandler);

    return app;
}