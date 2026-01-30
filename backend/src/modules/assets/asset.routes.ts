import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createAssetSchema } from './asset.zod';
import * as assetController from './asset.controller';
import multer from 'multer';
import { FILE_UPLOAD } from '../../config/constants';

// 1. Configure Multer
// We'll use memoryStorage to temporarily hold the file in memory
// before our service uploads it to the (mock) cloud storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE, // 10MB file size limit
    files: FILE_UPLOAD.MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    // Allow audio, image, and video files
    const allowedTypes: string[] = [
      ...FILE_UPLOAD.ALLOWED_AUDIO,
      ...FILE_UPLOAD.ALLOWED_IMAGES,
      ...FILE_UPLOAD.ALLOWED_VIDEOS,
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: audio, image, video.`));
    }
  },
});

export const registerAssetRoutes = (app: Express) => {
  // Admin asset upload (requires STAFF role)
  app.post(
    '/api/admin/assets',
    verifyAccess,              // 1. Must be logged in
    requireRole('STAFF'),      // 2. Must be staff
    
    // 3. Multer middleware runs first to handle the file
    // 'assetFile' is the field name the frontend must use
    upload.single('assetFile'), 
    
    // 4. Validate the non-file form fields (like 'kind')
    validate(createAssetSchema), 
    
    // 5. Run the controller
    assetController.createAssetHandler 
  );

  // Student asset upload (for speaking responses - only AUDIO allowed)
  app.post(
    '/api/student/assets',
    verifyAccess,              // 1. Must be logged in (any authenticated user)
    
    // 2. Multer middleware runs first to handle the file
    upload.single('assetFile'), 
    
    // 3. Validate the non-file form fields (like 'kind')
    validate(createAssetSchema), 
    
    // 4. Run the controller (same handler, but students can only upload AUDIO)
    assetController.createStudentAssetHandler 
  );
};