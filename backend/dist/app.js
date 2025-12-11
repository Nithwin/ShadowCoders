"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./config/env");
const cors_1 = require("./config/cors");
const error_1 = require("./middleware/error");
const auth_routes_1 = require("./modules/auth/auth.routes");
const exam_routes_1 = require("./modules/exams/exam.routes");
const question_routes_1 = require("./modules/questions/question.routes");
const attempt_routes_1 = require("./modules/attempts/attempt.routes");
const evaluation_routes_1 = require("./modules/evaluations/evaluation.routes");
const rubric_routes_1 = require("./modules/rubrics/rubric.routes");
const asset_routes_1 = require("./modules/assets/asset.routes");
const section_routes_1 = require("./modules/sections/section.routes");
const ai_routes_1 = require("./modules/ai/ai.routes");
const grading_routes_1 = require("./modules/grading/grading.routes");
const analytics_routes_1 = require("./modules/analytics/analytics.routes");
const settings_routes_1 = require("./modules/settings/settings.routes");
const users_routes_1 = require("./modules/users/users.routes");
const exam_template_routes_1 = require("./modules/exams/templates/exam-template.routes");
const leetcode_routes_1 = require("./modules/leetcode/leetcode.routes");
const report_routes_1 = require("./modules/reports/report.routes");
const points_routes_1 = require("./modules/points/points.routes");
const redeem_routes_1 = require("./modules/redeem/redeem.routes");
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const system_routes_1 = require("./modules/system/system.routes");
const createApp = () => {
    const app = (0, express_1.default)();
    // Trust proxy to get correct client info
    app.set('trust proxy', true);
    // Configure helmet to not interfere with CORS
    app.use((0, helmet_1.default)({
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
    }));
    // Custom CORS handler - completely bypass cors package to avoid * issues
    const allowedOrigins = (0, cors_1.buildAllowedOrigins)();
    // CRITICAL: Intercept setHeader BEFORE any other middleware to prevent * from ever being set
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        const originalSetHeader = res.setHeader.bind(res);
        // Override setHeader to NEVER allow * when there's an origin
        res.setHeader = function (name, value) {
            if (name.toLowerCase() === 'access-control-allow-origin') {
                if (origin && (value === '*' || value === 'null')) {
                    const allowedOrigin = (0, cors_1.isOriginAllowed)(origin, allowedOrigins);
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
                const allowedOrigin = (0, cors_1.isOriginAllowed)(origin, allowedOrigins);
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
                }
                else {
                    if (env_1.env.NODE_ENV !== 'production') {
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
        res.writeHead = function (statusCode, ...args) {
            forceCorsHeaders();
            return originalWriteHead(statusCode, ...args);
        };
        res.end = function (...args) {
            forceCorsHeaders();
            return originalEnd(...args);
        };
        res.json = function (body) {
            forceCorsHeaders();
            return originalJson(body);
        };
        next();
    });
    // Body parsing middleware
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    // Serve uploaded files statically
    // Files are stored in: uploads/{year}/{month}/{filename}
    const uploadsDir = env_1.env.UPLOADS_DIR;
    app.use('/uploads', express_1.default.static(uploadsDir, {
        // Set appropriate headers for audio/video files
        setHeaders: (res, filePath) => {
            // Allow CORS for media files
            const origin = res.req.headers?.origin;
            if (origin) {
                const allowedOrigin = (0, cors_1.isOriginAllowed)(origin, allowedOrigins);
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
        const { checkDatabaseHealth } = await Promise.resolve().then(() => __importStar(require('./lib/db-health')));
        const dbHealth = await checkDatabaseHealth();
        if (dbHealth.connected) {
            res.json({
                status: 'healthy',
                database: {
                    connected: true,
                    timestamp: dbHealth.timestamp,
                }
            });
        }
        else {
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
    });
    (0, auth_routes_1.registerAuthRoutes)(app);
    (0, exam_routes_1.registerExamRoutes)(app);
    (0, question_routes_1.registerQuestionRoutes)(app);
    (0, attempt_routes_1.registerAttemptRoutes)(app);
    (0, evaluation_routes_1.registerEvaluationRoutes)(app);
    (0, rubric_routes_1.registerRubricRoutes)(app);
    (0, asset_routes_1.registerAssetRoutes)(app);
    (0, section_routes_1.registerSectionRoutes)(app);
    (0, ai_routes_1.registerAiRoutes)(app);
    (0, grading_routes_1.registerGradingRoutes)(app);
    (0, analytics_routes_1.registerAnalyticsRoutes)(app);
    (0, settings_routes_1.registerSettingsRoutes)(app);
    (0, users_routes_1.registerUserRoutes)(app);
    (0, exam_template_routes_1.registerTemplateRoutes)(app);
    (0, leetcode_routes_1.registerLeetCodeRoutes)(app);
    app.use('/api/reports', report_routes_1.reportRoutes);
    (0, points_routes_1.registerPointsRoutes)(app);
    (0, redeem_routes_1.registerRedeemRoutes)(app);
    app.use('/api/notifications', notification_routes_1.default);
    (0, system_routes_1.registerSystemRoutes)(app);
    // In production, serve the built frontend (Next.js static export)
    if (env_1.env.NODE_ENV === 'production') {
        const frontendOutDir = path_1.default.resolve(__dirname, '../../frontend/out');
        if (fs_1.default.existsSync(frontendOutDir)) {
            // Serve static assets
            app.use(express_1.default.static(frontendOutDir));
            // Serve index.html for non-API routes (client-side routing fallback)
            app.get('*', (req, res, next) => {
                const url = req.path;
                if (url.startsWith('/api') ||
                    url.startsWith('/uploads') ||
                    url.startsWith('/socket.io')) {
                    return next();
                }
                return res.sendFile(path_1.default.join(frontendOutDir, 'index.html'));
            });
        }
        else if (env_1.env.NODE_ENV !== 'production') {
            console.warn(`[FE] Frontend build not found at ${frontendOutDir}`);
        }
    }
    // Final CORS fix middleware - runs after all routes to ensure headers are correct
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        // Listen for the 'finish' event which fires right before headers are sent
        res.on('finish', () => {
            if (origin) {
                const allowedOrigin = (0, cors_1.isOriginAllowed)(origin, allowedOrigins);
                if (allowedOrigin) {
                    const current = res.getHeader('Access-Control-Allow-Origin');
                    // Force fix if it's * or wrong - but we can't change headers after finish
                    // So we need to intercept earlier
                    if (current === '*' && env_1.env.NODE_ENV !== 'production') {
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
                const allowedOrigin = (0, cors_1.isOriginAllowed)(origin, allowedOrigins);
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
        res.writeHead = function (statusCode, ...args) {
            fixCorsBeforeSend();
            return originalWriteHead(statusCode, ...args);
        };
        res.end = function (...args) {
            fixCorsBeforeSend();
            return originalEnd(...args);
        };
        res.json = function (body) {
            fixCorsBeforeSend();
            return originalJson(body);
        };
        next();
    });
    app.use(error_1.errorHandler);
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=app.js.map