import { ErrorRequestHandler } from 'express';

interface AppError extends Error {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (err: AppError, _req, res, _next) => {
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

  res.status(status).json({ error: errorBody });
};