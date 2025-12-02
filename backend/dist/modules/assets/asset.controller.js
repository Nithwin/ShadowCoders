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
exports.createStudentAssetHandler = exports.createAssetHandler = void 0;
const assetService = __importStar(require("./asset.service"));
const client_1 = require("@prisma/client");
const createAssetHandler = async (req, res, next) => {
    try {
        // 1. Get the file from req.file (Multer puts it here)
        const file = req.file;
        // 2. Get the validated metadata from req.body
        // (Our 'validate' middleware will run before this handler)
        const metadata = req.body;
        if (!file) {
            throw { status: 400, message: 'No file was uploaded' };
        }
        // 3. Call the service with both metadata and the file
        const newAsset = await assetService.createAsset(metadata, file);
        res.status(201).json(newAsset);
    }
    catch (error) {
        next(error);
    }
};
exports.createAssetHandler = createAssetHandler;
const createStudentAssetHandler = async (req, res, next) => {
    try {
        // 1. Get the file from req.file (Multer puts it here)
        const file = req.file;
        // 2. Get the validated metadata from req.body
        const metadata = req.body;
        if (!file) {
            throw { status: 400, message: 'No file was uploaded' };
        }
        // 3. Students can only upload AUDIO files (for speaking responses)
        if (metadata.kind !== client_1.AssetKind.AUDIO) {
            throw { status: 403, message: 'Students can only upload audio files' };
        }
        // 4. Call the service with both metadata and the file
        const newAsset = await assetService.createAsset(metadata, file);
        res.status(201).json(newAsset);
    }
    catch (error) {
        next(error);
    }
};
exports.createStudentAssetHandler = createStudentAssetHandler;
//# sourceMappingURL=asset.controller.js.map