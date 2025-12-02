"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsset = void 0;
const assetRepo = __importStar(require("./asset.repo"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
// Import 'multer' just for its type definitions
require("multer");
/**
 * Get the uploads directory path
 * Creates the directory if it doesn't exist
 */
const getUploadsDirectory = async () => {
    // Import env config for type safety
    const { env } = await Promise.resolve().then(() => __importStar(require('../../config/env')));
    const uploadsDir = env.UPLOADS_DIR;
    // Create directory structure: uploads/{kind}/{year}/{month}
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const fullPath = path.join(uploadsDir, year, month);
    try {
        await fs.mkdir(fullPath, { recursive: true });
    }
    catch (error) {
        // Directory might already exist, that's fine
        console.log(`Uploads directory check: ${fullPath}`);
    }
    return fullPath;
};
/**
 * Generate a unique filename to prevent collisions
 */
const generateUniqueFilename = (originalName) => {
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
const uploadFileToStorage = async (file, kind) => {
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
const createAsset = async (input, file // This type will now be recognized
) => {
    // 1. --- Validation ---
    if (!file) {
        throw { status: 400, message: 'No file was uploaded' };
    }
    // 2. --- Upload to Storage (Local filesystem) ---
    const { url, meta } = await uploadFileToStorage(file, input.kind);
    // 3. --- Prepare Data for Database ---
    const dataToSave = {
        kind: input.kind,
        url: url,
        meta: meta,
    };
    // 4. --- Call Repository to Save ---
    const newAsset = await assetRepo.createAsset(dataToSave);
    return newAsset;
};
exports.createAsset = createAsset;
//# sourceMappingURL=asset.service.js.map