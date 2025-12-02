"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
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
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Log the validation error details for debugging
                console.error('❌ Validation Error Details:');
                console.error('Request Body:', JSON.stringify(req.body, null, 2));
                console.error('Validation Issues:', JSON.stringify(error.issues, null, 2));
                return res.status(400).json({
                    error: 'Validation failed',
                    issues: error.issues.map((e) => ({
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
exports.validate = validate;
//# sourceMappingURL=validate.js.map