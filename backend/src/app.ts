import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { env } from './config/env';
import { buildAllowedOrigins, createCorsOptions } from './config/cors';
import { errorHandler } from './middleware/error';
import { circuitBreakerMiddleware, getSystemHealth } from './middleware/circuit-breaker';
import { throttleCodeSubmission, throttleApiPerUser } from './middleware/throttle';
import { validateCodeInput } from './middleware/input-validation';
import { registerAuthRoutes } from './modules/auth/auth.routes';
import { registerExamRoutes } from './modules/exams/exam.routes';
import { registerQuestionRoutes } from './modules/questions/question.routes';
import { registerAttemptRoutes } from './modules/attempts/attempt.routes';
import { registerEvaluationRoutes } from './modules/evaluations/evaluation.routes';
import { registerRubricRoutes } from './modules/rubrics/rubric.routes';
import { registerAssetRoutes } from './modules/assets/asset.routes';
import { registerSectionRoutes } from './modules/sections/section.routes';
import { registerAiRoutes } from './modules/ai/ai.routes';
import { registerGradingRoutes } from './modules/grading/grading.routes';
import { registerAnalyticsRoutes } from './modules/analytics/analytics.routes';
import { registerSettingsRoutes } from './modules/settings/settings.routes';
import { registerUserRoutes } from './modules/users/users.routes';
import { registerTemplateRoutes } from './modules/exams/templates/exam-template.routes';
import { registerLeetCodeRoutes } from './modules/leetcode/leetcode.routes';
import { reportRoutes } from './modules/reports/report.routes';
import { registerPointsRoutes } from './modules/points/points.routes';
import { registerRedeemRoutes } from './modules/redeem/redeem.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import { registerSystemRoutes } from './modules/system/system.routes';
import proctoringRoutes from './modules/proctoring/proctoring.routes';
import generationRoutes from './modules/generation/generation.routes';
import adaptiveRoutes from './modules/adaptive/adaptive.routes';


export const createApp = () => {
    const app = express();

    // Trust proxy to get correct client info (set to 1 for single proxy, not true for security)
    app.set('trust proxy', 1);

    // Configure helmet to not interfere with CORS
    app.use(helmet({
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
    }));

    // CORS MUST come before rate limiting to handle OPTIONS preflight requests
    // Standard CORS Middleware
    const allowedOrigins = buildAllowedOrigins();
    const corsOptions = createCorsOptions(allowedOrigins);
    app.use(cors(corsOptions));

    // Rate limiting: 100 requests per 15 minutes
    // Skip rate limiting for OPTIONS requests (CORS preflight) and exam/proctoring endpoints
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
          // Skip preflight requests
          if (req.method === 'OPTIONS') return true;
          
          // Skip exam attempt endpoints (students rapidly save answers during exams)
          if (req.path.includes('/student/attempts/')) return true;
          
          // Skip proctoring endpoints
          if (req.path.includes('/api/proctoring/')) return true;
          
          return false;
        },
        message: {
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Too many requests, please try again later.'
            }
        }
    });

    // Apply rate limiting to all requests (except OPTIONS, exam attempts, and proctoring)
    app.use(limiter);

    // Compression middleware (gzip responses > 1KB)
    app.use(compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }));

    // Circuit breaker: reject requests when system is overloaded (CPU>90% or mem>85%)
    app.use(circuitBreakerMiddleware);

    // Request timeout middleware (prevents hanging requests)
    app.use((req, res, next) => {
        req.setTimeout(30000); // 30 seconds
        res.setTimeout(30000);
        next();
    });
    
    // Body parsing middleware with size limit
    app.use(express.json({ limit: '1mb' }));

    // Graceful handling of JSON parsing errors (prevents server crash on malformed JSON)
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
            console.error('❌ Malformed JSON received:', err.message);
            return res.status(400).json({
                error: {
                    code: 'INVALID_JSON',
                    message: 'Invalid JSON format in request body'
                }
            });
        }
        next(err);
    });
    app.use(cookieParser());

    // Serve uploaded files statically
    // Files are stored in: uploads/{year}/{month}/{filename}
    const uploadsDir = env.UPLOADS_DIR;
    app.use('/uploads', express.static(uploadsDir, {
        // Set appropriate headers for audio/video files
        setHeaders: (res, filePath) => {
            // Set cache headers for media files
            if (filePath.endsWith('.mp3') || filePath.endsWith('.wav') || filePath.endsWith('.webm') || filePath.endsWith('.ogg')) {
                res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
            }
        }
    }));

    // Test endpoint for CORS debugging
    app.get('/api/test-cors', (_req, res) => {
        res.json({
            message: 'CORS test successful',
            origin: _req.headers.origin || 'no origin',
            timestamp: new Date().toISOString(),
        });
    });
    
    app.get('/api/healthz', async (_req, res) => {
        const { checkDatabaseHealth } = await import('./lib/db-health');
        const dbHealth = await checkDatabaseHealth();
        const system = getSystemHealth();

        if (dbHealth.connected) {
            res.json({
                status: 'healthy',
                database: {
                    connected: true,
                    timestamp: dbHealth.timestamp,
                },
                system,
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
                system,
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
    registerAnalyticsRoutes(app);
    registerSettingsRoutes(app);
    registerUserRoutes(app);
    registerTemplateRoutes(app);
    registerLeetCodeRoutes(app);
    app.use('/api/reports', reportRoutes);
    registerPointsRoutes(app);
    registerRedeemRoutes(app);
    app.use('/api/notifications', notificationRoutes);
    registerSystemRoutes(app);
    app.use('/api/proctoring', proctoringRoutes);
    app.use('/api/generation', generationRoutes);
    
    // Generic Code Execution (with throttle + validation middleware)
    const { registerExecutionRoutes } = require('./modules/execution/execution.routes');
    registerExecutionRoutes(app, { throttleCodeSubmission, validateCodeInput });

    app.use('/api/adaptive', adaptiveRoutes);


    // In production, serve the built frontend (Next.js static export)
    if (env.NODE_ENV === 'production') {
        const frontendOutDir = path.resolve(__dirname, '../../frontend/out');
        if (fs.existsSync(frontendOutDir)) {
            // Serve static assets
            app.use(express.static(frontendOutDir));

            // Serve index.html for non-API routes (client-side routing fallback)
            app.get('*', (req, res, next) => {
                const url = req.path;
                if (
                    url.startsWith('/api') ||
                    url.startsWith('/uploads') ||
                    url.startsWith('/socket.io')
                ) {
                    return next();
                }
                return res.sendFile(path.join(frontendOutDir, 'index.html'));
            });
        } else if (env.NODE_ENV !== 'production') {
            console.warn(`[FE] Frontend build not found at ${frontendOutDir}`);
        }
    }

    app.use(errorHandler);

    // Initialize Redis connection eagerly so BullMQ is ready
    // (queues are lazy-initialized on first use, but we verify connectivity here)
    import('./lib/redis').then(({ getRedisClient }) => {
      try {
        getRedisClient();
        console.log('[App] Redis connection initialized for BullMQ');
      } catch (err) {
        console.warn('[App] Redis not available — code execution will fail until Redis is ready');
      }
    });

    return app;
}