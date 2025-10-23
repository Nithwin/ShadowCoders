import { ErrorRequestHandler } from 'express';

interface AppError extends Error {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (err: AppError, _req, res, _next) => {
  console.error('Error:', err);

  const status = err.status || 500;

  const errorBody: Record<string, unknown> = {
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
  };
  if (typeof err.details !== 'undefined') {
    errorBody.details = err.details;
  }

  res.status(status).json({ error: errorBody });
};