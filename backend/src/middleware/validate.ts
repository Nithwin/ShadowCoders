import { RequestHandler } from 'express';
import { ZodObject, ZodRawShape, ZodError, ZodIssue } from 'zod';

// Keep the schema type compatible with current Zod (v4): use ZodObject<ZodRawShape>
export const validate = (schema: ZodObject<ZodRawShape>): RequestHandler => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body;
      return next();
    } catch (error) {
      // If it's a Zod validation error, format and return 400
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: error.issues.map((e: ZodIssue) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      // Unexpected error: log and return 500 (or forward to error handler)
      // eslint-disable-next-line no-console
      console.error('Unexpected error during validation:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation.',
      });
      // Alternatively: return next({ status: 500, message: 'Unexpected validation error' });
    }
  };
};