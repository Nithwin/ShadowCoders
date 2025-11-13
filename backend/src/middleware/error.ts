import { ErrorRequestHandler } from 'express';
import { buildAllowedOrigins, isOriginAllowed } from '../config/cors';

interface AppError extends Error {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (err: AppError, req, res, _next) => {
  // Log full error for debugging
  console.error('Error:', err);
  if (err.stack) {
    console.error('Stack:', err.stack);
  }

  const status = err.status || 500;

  const errorBody: Record<string, unknown> = {
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
    const allowedOrigins = buildAllowedOrigins();
    const allowedOrigin = isOriginAllowed(origin, allowedOrigins);
    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.status(status).json({ error: errorBody });
};