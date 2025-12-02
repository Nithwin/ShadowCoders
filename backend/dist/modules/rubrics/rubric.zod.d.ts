import { z } from 'zod';
export declare const createRubricSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        criteria: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            maxPoints: z.ZodNumber;
            descriptor: z.ZodOptional<z.ZodString>;
            weight: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateRubricSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        criteria: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            maxPoints: z.ZodNumber;
            descriptor: z.ZodOptional<z.ZodString>;
            weight: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const listRubricsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        q: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=rubric.zod.d.ts.map