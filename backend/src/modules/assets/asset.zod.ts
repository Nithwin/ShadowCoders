import { z } from 'zod';
import { AssetKind } from '@prisma/client'; // Import the AssetKind enum

// This schema validates the form fields sent along with the file
export const createAssetSchema = z.object({
  body: z.object({
    kind: z.enum(AssetKind, {
      message: 'Invalid asset kind. Must be AUDIO, VIDEO, IMAGE, FILE, or TEXT',
    }),
    // We can add more metadata fields here later if needed
    // e.g., durationSec: z.coerce.number().optional()
  }),
});