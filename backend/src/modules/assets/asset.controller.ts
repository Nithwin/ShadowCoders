import { RequestHandler } from 'express';
import * as assetService from './asset.service';
import { z } from 'zod';
import { createAssetSchema } from './asset.zod';

export const createAssetHandler: RequestHandler = async (req, res, next) => {
  try {
    // 1. Get the file from req.file (Multer puts it here)
    const file = req.file; 
    
    // 2. Get the validated metadata from req.body
    // (Our 'validate' middleware will run before this handler)
    const metadata = req.body as z.infer<typeof createAssetSchema>['body'];

    if (!file) {
      throw { status: 400, message: 'No file was uploaded' };
    }

    // 3. Call the service with both metadata and the file
    const newAsset = await assetService.createAsset(metadata, file);

    res.status(201).json(newAsset);

  } catch (error) {
    next(error);
  }
};