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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAssetRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const auth_2 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const asset_zod_1 = require("./asset.zod");
const assetController = __importStar(require("./asset.controller"));
const multer_1 = __importDefault(require("multer"));
// 1. Configure Multer
// We'll use memoryStorage to temporarily hold the file in memory
// before our service uploads it to the (mock) cloud storage.
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    },
});
const registerAssetRoutes = (app) => {
    // Admin asset upload (requires STAFF role)
    app.post('/api/admin/assets', auth_1.verifyAccess, // 1. Must be logged in
    (0, auth_2.requireRole)('STAFF'), // 2. Must be staff
    // 3. Multer middleware runs first to handle the file
    // 'assetFile' is the field name the frontend must use
    upload.single('assetFile'), 
    // 4. Validate the non-file form fields (like 'kind')
    (0, validate_1.validate)(asset_zod_1.createAssetSchema), 
    // 5. Run the controller
    assetController.createAssetHandler);
    // Student asset upload (for speaking responses - only AUDIO allowed)
    app.post('/api/student/assets', auth_1.verifyAccess, // 1. Must be logged in (any authenticated user)
    // 2. Multer middleware runs first to handle the file
    upload.single('assetFile'), 
    // 3. Validate the non-file form fields (like 'kind')
    (0, validate_1.validate)(asset_zod_1.createAssetSchema), 
    // 4. Run the controller (same handler, but students can only upload AUDIO)
    assetController.createStudentAssetHandler);
};
exports.registerAssetRoutes = registerAssetRoutes;
//# sourceMappingURL=asset.routes.js.map