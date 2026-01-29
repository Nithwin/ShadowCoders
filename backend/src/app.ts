import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { buildAllowedOrigins, isOriginAllowed } from './config/cors';
import { errorHandler } from './middleware/error';
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


export const createApp = () => {
    const app = express();

    // Trust proxy to get correct client info
    app.set('trust proxy', true);

    // Configure helmet to not interfere with CORS
    app.use(helmet({
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
    }));

    // Rate limiting: 100 requests per 15 minutes
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Too many requests, please try again later.'
            }
        }
    });

    // Apply rate limiting to all requests
    app.use(limiter);

    // Custom CORS handler - completely bypass cors package to avoid * issues
    const allowedOrigins = buildAllowedOrigins();

    // CRITICAL: Intercept setHeader BEFORE any other middleware to prevent * from ever being set
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        const originalSetHeader = res.setHeader.bind(res);

        // Override setHeader to NEVER allow * when there's an origin
        res.setHeader = function (name: string, value: string | number | string[]) {
            if (name.toLowerCase() === 'access-control-allow-origin') {
                if (origin && (value === '*' || value === 'null')) {
                    const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
                    if (allowedOrigin) {
                        return originalSetHeader(name, allowedOrigin);
                    }
                }
            }
            return originalSetHeader(name, value);
        };

        next();
    });

    // Set CORS headers on ALL requests (including OPTIONS)
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        const originalEnd = res.end.bind(res);
        const originalJson = res.json.bind(res);
        const originalWriteHead = res.writeHead.bind(res);

        // Function to force-set correct CORS headers
        const forceCorsHeaders = () => {
            if (origin) {
                const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
                if (allowedOrigin) {
                    // CRITICAL: Always remove first, then set to ensure no * can exist
                    const current = res.getHeader('Access-Control-Allow-Origin');
                    if (current === '*' || current !== allowedOrigin) {
                        // Remove any existing CORS headers first
                        res.removeHeader('Access-Control-Allow-Origin');
                        res.removeHeader('Access-Control-Allow-Credentials');
                        // Set correct headers
                        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
                        res.setHeader('Access-Control-Allow-Credentials', 'true');
                        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie');
                        res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Disposition, Content-Type');

                    }
                } else {
                    if (env.NODE_ENV !== 'production') {
                        console.warn(`[CORS] ❌ Rejected origin: ${origin}`);
                        console.warn(`[CORS] Allowed origins:`, allowedOrigins);
                    }
                }
            }
        };

        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
            forceCorsHeaders();
            res.setHeader('Access-Control-Max-Age', '86400');
            return res.status(204).end();
        }

        // Set headers immediately
        forceCorsHeaders();

        // Override response methods to ensure headers are set right before sending
        res.writeHead = function (statusCode: number, ...args: any[]) {
            forceCorsHeaders();
            return originalWriteHead(statusCode, ...args);
        };

        res.end = function (...args: any[]) {
            forceCorsHeaders();
            return originalEnd(...args);
        };

        res.json = function (body: any) {
            forceCorsHeaders();
            return originalJson(body);
        };

        next();
    });

    // Body parsing middleware
    app.use(express.json());

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
            // Allow CORS for media files
            const origin = (res.req as any).headers?.origin;
            if (origin) {
                const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
                if (allowedOrigin) {
                    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                }
            }

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

    // Final CORS fix middleware - runs after all routes to ensure headers are correct
    app.use((req, res, next) => {
        const origin = req.headers.origin;

        // Listen for the 'finish' event which fires right before headers are sent
        res.on('finish', () => {
            if (origin) {
                const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
                if (allowedOrigin) {
                    const current = res.getHeader('Access-Control-Allow-Origin');
                    // Force fix if it's * or wrong - but we can't change headers after finish
                    // So we need to intercept earlier
                    if (current === '*' && env.NODE_ENV !== 'production') {
                        console.warn(`[CORS-FINAL] WARNING: * detected but too late to fix!`);
                    }
                }
            }
        });

        // Intercept response methods to fix headers before they're sent
        const originalEnd = res.end.bind(res);
        const originalJson = res.json.bind(res);
        const originalWriteHead = res.writeHead.bind(res);

        const fixCorsBeforeSend = () => {
            if (origin) {
                const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
                if (allowedOrigin) {
                    const current = res.getHeader('Access-Control-Allow-Origin');
                    // ALWAYS remove and reset to ensure no * can slip through
                    if (current === '*' || current !== allowedOrigin) {
                        // Remove ALL CORS headers first
                        res.removeHeader('Access-Control-Allow-Origin');
                        res.removeHeader('Access-Control-Allow-Credentials');
                        // Set correct headers
                        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
                        res.setHeader('Access-Control-Allow-Credentials', 'true');
                        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie');
                        res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Disposition, Content-Type');
                    }
                }
            }
        };

        res.writeHead = function (statusCode: number, ...args: any[]) {
            fixCorsBeforeSend();
            return originalWriteHead(statusCode, ...args);
        };

        res.end = function (...args: any[]) {
            fixCorsBeforeSend();
            return originalEnd(...args);
        };

        res.json = function (body: any) {
            fixCorsBeforeSend();
            return originalJson(body);
        };

        next();
    });

    app.use(errorHandler);

    return app;
}