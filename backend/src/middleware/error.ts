import { ErrorRequestHandler } from 'express';

// Define an interface for potential error objects passed via next()
interface AppError extends Error {
  status?: number;
  message: string;
  code?: string;
  details?: any; // For Zod validation errors, etc.
}

export const errorHandler: ErrorRequestHandler = (err: AppError, _req, res, _next) => {
  // Log the error for server-side debugging (use console.error for errors)
  console.error('Error:', err); // Change console.log(err) to console.error(err)

  // Determine the status code - use err.status if provided, otherwise default to 500
  const status = err.status || 500;

  // Send a structured JSON error response
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      // Include details only if they exist (like Zod validation errors)
      ...(err.details && { details: err.details }),
    },
  });
};