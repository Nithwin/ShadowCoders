import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  let status = err.status || 500;
  let message = err.message || 'An unexpected error occurred';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || undefined;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    status = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    details = err.issues;
  }
  
  // Handle Prisma Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      status = 409;
      message = 'Resource already exists';
      code = 'DUPLICATE_RESOURCE';
      details = err.meta;
    } 
    // Record not found
    else if (err.code === 'P2025') {
        status = 404;
        message = 'Resource not found';
        code = 'RESOURCE_NOT_FOUND';
    }
    // Foreign key constraint violation
    else if (err.code === 'P2003') {
        status = 400;
        message = 'Invalid reference';
        code = 'INVALID_REFERENCE';
        details = err.meta;
    }
  }

  // Only log actual errors (not 401 authentication failures or 404s)
  if (status >= 500) {
    console.error('SERVER ERROR:', err);
    if (err.stack) console.error(err.stack);
  } else if (status === 400 && code !== 'VALIDATION_ERROR') {
      // Log unexpected bad requests
      console.warn('BAD REQUEST:', err);
  }

  // Common Database Connection Help
  if (message.includes('database') || code === 'DATABASE_CONNECTION_ERROR') {
      // This is a hint, not necessarily a change in the error itself
      (details as any) = { ...(details as object || {}), help: 'Check your database connection.' };
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
    }
  });
};