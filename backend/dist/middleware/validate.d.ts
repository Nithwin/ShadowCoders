import { RequestHandler } from 'express';
import { ZodObject, ZodRawShape } from 'zod';
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
export declare const validate: (schema: ZodObject<ZodRawShape>) => RequestHandler;
//# sourceMappingURL=validate.d.ts.map