import { z } from 'zod';
import { createAssetSchema } from './asset.zod';
import * as assetRepo from './asset.repo';
import { Prisma, AssetKind } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

// Import 'multer' just for its type definitions
import 'multer'; 

// Infer the TypeScript type from the Zod schema's body
type CreateAssetInput = z.infer<typeof createAssetSchema>['body'];

/**
 * Get the uploads directory path
 * Creates the directory if it doesn't exist
 */
const getUploadsDirectory = async (): Promise<string> => {
  // Import env config for type safety
  const { env } = await import('../../config/env');
  const uploadsDir = env.UPLOADS_DIR;
  
  // Create directory structure: uploads/{kind}/{year}/{month}
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const fullPath = path.join(uploadsDir, year, month);
  
  try {
    await fs.mkdir(fullPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
    console.log(`Uploads directory check: ${fullPath}`);
  }
  
  return fullPath;
};

/**
 * Generate a unique filename to prevent collisions
 */
const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${baseName}-${timestamp}-${random}${ext}`;
};

/**
 * Upload file to local filesystem storage
 * Files are organized by: uploads/{year}/{month}/{unique-filename}
 */
const uploadFileToStorage = async (file: Express.Multer.File, kind: AssetKind): Promise<{ url: string; meta: Record<string, unknown> }> => {
  if (!file.buffer) {
    throw new Error('File buffer is missing');
  }

  // Get the uploads directory
  const uploadsDir = await getUploadsDirectory();
  
  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(file.originalname || 'file');
  const filePath = path.join(uploadsDir, uniqueFilename);
  
  // Write file to disk
  await fs.writeFile(filePath, file.buffer);
  
  // Generate URL path (relative to server root)
  // This will be served statically or via an API endpoint
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const url = `/uploads/${year}/${month}/${uniqueFilename}`;
  
  const meta = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeInBytes: file.size,
    storedPath: filePath, // Internal path for reference
    storedAt: new Date().toISOString(),
  };
  
  return { url, meta };
};


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

  // 2. --- Upload to Storage (Local filesystem) ---
  const { url, meta } = await uploadFileToStorage(file, input.kind);

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