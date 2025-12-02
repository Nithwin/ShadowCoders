import { z } from 'zod';
export declare const createAssetSchema: z.ZodObject<{
    body: z.ZodObject<{
        kind: z.ZodEnum<{
            AUDIO: "AUDIO";
            VIDEO: "VIDEO";
            IMAGE: "IMAGE";
            FILE: "FILE";
            TEXT: "TEXT";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=asset.zod.d.ts.map