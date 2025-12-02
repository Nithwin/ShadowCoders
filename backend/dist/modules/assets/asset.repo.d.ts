import { Prisma } from '@prisma/client';
/**
 * Creates a new asset record in the database.
 */
export declare const createAsset: (data: Prisma.AssetCreateInput) => Prisma.Prisma__AssetClient<{
    meta: Prisma.JsonValue;
    id: string;
    createdAt: Date;
    kind: import(".prisma/client").$Enums.AssetKind;
    url: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=asset.repo.d.ts.map