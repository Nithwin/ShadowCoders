import { RequestHandler } from 'express';
import { ZodObject, ZodRawShape } from 'zod';

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
    } catch (error: any) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.errors.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
  };
};