"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const cors_1 = require("../config/cors");
const errorHandler = (err, req, res, _next) => {
    const status = err.status || 500;
    // Only log actual errors (not 401 authentication failures which are expected)
    if (status >= 500 || (status >= 400 && status !== 401 && status !== 404)) {
        console.error('Error:', err);
        if (err.stack) {
            console.error('Stack:', err.stack);
        }
    }
    const errorBody = {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
    };
    if (typeof err.details !== 'undefined') {
        errorBody.details = err.details;
    }
    // Add helpful message for database connection errors
    if (err.code === 'DATABASE_CONNECTION_ERROR' || err.message?.includes('database')) {
        errorBody.help = 'Check your database connection. See: backend/DB_CONNECTION_FIX.md';
    }
    // Ensure CORS headers are set even on error responses
    const origin = req.headers.origin;
    if (origin) {
        const allowedOrigins = (0, cors_1.buildAllowedOrigins)();
        const allowedOrigin = (0, cors_1.isOriginAllowed)(origin, allowedOrigins);
        if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }
    res.status(status).json({ error: errorBody });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.js.map