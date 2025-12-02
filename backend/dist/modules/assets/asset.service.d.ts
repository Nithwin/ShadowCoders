import { z } from 'zod';
import { createAssetSchema } from './asset.zod';
import { Prisma } from '@prisma/client';
import 'multer';
type CreateAssetInput = z.infer<typeof createAssetSchema>['body'];
/**
 * Processes a file upload, "sends" it to cloud storage,
 * and saves the metadata to the database.
 */
export declare const createAsset: (input: CreateAssetInput, file: Express.Multer.File) => Promise<{
    meta: Prisma.JsonValue;
    id: string;
    createdAt: Date;
    kind: import(".prisma/client").$Enums.AssetKind;
    url: string;
}>;
export {};
//# sourceMappingURL=asset.service.d.ts.map