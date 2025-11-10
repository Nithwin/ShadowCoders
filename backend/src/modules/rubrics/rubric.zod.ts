import { z } from 'zod';

// First, we define what a single criterion object looks like
const criterionSchema = z.object({
  id: z.string().min(1), // e.g., 'clarity'
  label: z.string().min(1), // e.g., 'Clarity and Cohesion'
  maxPoints: z.number().int().positive('Max points must be positive'),
  descriptor: z.string().optional(), // e.g., 'Student expresses ideas clearly...'
  weight: z.number().min(0).max(1).optional(), // e.g., 0.4 (for 40%)
});

// Now, we define the schema for the request body
export const createRubricSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Rubric name must be at least 3 characters'),
    
    // 'criteria' must be a JSON array containing at least one criterion object
    criteria: z.array(criterionSchema).min(1, 'Rubric must have at least one criterion'),
  }),
});

// Schema for updating a rubric
export const updateRubricSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Rubric name must be at least 3 characters').optional(),
    criteria: z.array(criterionSchema).min(1, 'Rubric must have at least one criterion').optional(),
  }),
});

// Schema for listing rubrics (query params)
export const listRubricsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    q: z.string().optional(), // search query
  }),
});