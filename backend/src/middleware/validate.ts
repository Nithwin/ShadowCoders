import { RequestHandler } from 'express';
import { ZodObject, ZodRawShape, ZodError, ZodIssue } from 'zod';

// Extend the Express Request type to include validatedData
declare global {
  namespace Express {
    interface Request {
      validatedData?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export const validate = (schema: ZodObject<ZodRawShape>): RequestHandler => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Store validated data in a custom property
      req.validatedData = {
        body: parsed.body,
        query: parsed.query,
        params: parsed.params
      };

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: error.issues.map((e: ZodIssue) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      
      console.error('Unexpected error during validation:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation.',
      });
    }
  };
};