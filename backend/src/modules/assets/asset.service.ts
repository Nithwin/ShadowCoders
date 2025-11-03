import { z } from 'zod';
import { createAssetSchema } from './asset.zod';
import * as assetRepo from './asset.repo';
import { Prisma, AssetKind } from '@prisma/client';

// Import 'multer' just for its type definitions
import 'multer'; 

// We can remove 'Express' from this import as it's not directly used
// (the 'file' parameter type will be read from the global namespace)

// Infer the TypeScript type from the Zod schema's body
type CreateAssetInput = z.infer<typeof createAssetSchema>['body'];

/**
 * --- MOCK UPLOAD FUNCTION ---
 * (This part is unchanged)
 */
const uploadFileToCloudStorage = async (file: Express.Multer.File) => {
  await new Promise(resolve => setTimeout(resolve, 100)); 
  
  const mockUrl = `/uploads/mock/${file.filename}-${Date.now()}`;
  const meta = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeInBytes: file.size,
  };
  
  return { url: mockUrl, meta: meta };
};
// --- END OF MOCK UPLOAD FUNCTION ---


/**
 * Processes a file upload, "sends" it to cloud storage,
 * and saves the metadata to the database.
 */
export const createAsset = async (
  input: CreateAssetInput,
  file: Express.Multer.File // This type will now be recognized
) => {
  // 1. --- Validation ---
  if (!file) {
    throw { status: 400, message: 'No file was uploaded' };
  }

  // 2. --- Upload to Cloud Storage (Simulated) ---
  const { url, meta } = await uploadFileToCloudStorage(file);

  // 3. --- Prepare Data for Database ---
  const dataToSave: Prisma.AssetCreateInput = {
    kind: input.kind,
    url: url,
    meta: meta as unknown as Prisma.InputJsonValue,
  };

  // 4. --- Call Repository to Save ---
  const newAsset = await assetRepo.createAsset(dataToSave);
  
  return newAsset;
};