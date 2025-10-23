import { RequestHandler } from 'express';
import { ZodObject, ZodRawShape, ZodError, ZodIssue } from 'zod';

export const validate = (schema: ZodObject<ZodRawShape>): RequestHandler => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body;
      
      if (parsed.query !== undefined) {
        const parsedQuery = parsed.query as Record<string, any>;
        const reqQuery = req.query as Record<string, any>;
        
        Object.getOwnPropertyNames(reqQuery).forEach(key => delete reqQuery[key]);
        Object.getOwnPropertyNames(parsedQuery).forEach(key => {
          reqQuery[key] = parsedQuery[key];
        });
      }
      
      if (parsed.params !== undefined) {
        const parsedParams = parsed.params as Record<string, any>;
        Object.keys(req.params).forEach(key => delete req.params[key]);
        Object.assign(req.params, parsedParams);
      }

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