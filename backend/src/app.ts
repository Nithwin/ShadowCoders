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
    registerQuestionRoutes(app);
    registerAttemptRoutes(app);
    registerEvaluationRoutes(app);
    registerRubricRoutes(app);
    registerAssetRoutes(app);
    registerSectionRoutes(app);
    app.use(errorHandler);

    return app;
}