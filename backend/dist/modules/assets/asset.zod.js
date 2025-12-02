"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client"); // Import the AssetKind enum
// This schema validates the form fields sent along with the file
exports.createAssetSchema = zod_1.z.object({
    body: zod_1.z.object({
        kind: zod_1.z.enum(client_1.AssetKind, {
            message: 'Invalid asset kind. Must be AUDIO, VIDEO, IMAGE, FILE, or TEXT',
        }),
        // We can add more metadata fields here later if needed
        // e.g., durationSec: z.coerce.number().optional()
    }),
});
//# sourceMappingURL=asset.zod.js.map