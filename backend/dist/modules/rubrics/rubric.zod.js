"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRubricsSchema = exports.updateRubricSchema = exports.createRubricSchema = void 0;
const zod_1 = require("zod");
// First, we define what a single criterion object looks like
const criterionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1), // e.g., 'clarity'
    label: zod_1.z.string().min(1), // e.g., 'Clarity and Cohesion'
    maxPoints: zod_1.z.number().int().positive('Max points must be positive'),
    descriptor: zod_1.z.string().optional(), // e.g., 'Student expresses ideas clearly...'
    weight: zod_1.z.number().min(0).max(1).optional(), // e.g., 0.4 (for 40%)
});
// Now, we define the schema for the request body
exports.createRubricSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3, 'Rubric name must be at least 3 characters'),
        // 'criteria' must be a JSON array containing at least one criterion object
        criteria: zod_1.z.array(criterionSchema).min(1, 'Rubric must have at least one criterion'),
    }),
});
// Schema for updating a rubric
exports.updateRubricSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3, 'Rubric name must be at least 3 characters').optional(),
        criteria: zod_1.z.array(criterionSchema).min(1, 'Rubric must have at least one criterion').optional(),
    }),
});
// Schema for listing rubrics (query params)
exports.listRubricsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().positive().default(1),
        pageSize: zod_1.z.coerce.number().int().positive().max(100).default(10),
        q: zod_1.z.string().optional(), // search query
    }),
});
//# sourceMappingURL=rubric.zod.js.map