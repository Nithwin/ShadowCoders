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
exports.registerRubricRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const auth_2 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const rubric_zod_1 = require("./rubric.zod");
const rubricController = __importStar(require("./rubric.controller"));
const registerRubricRoutes = (app) => {
    // List all rubrics
    app.get('/api/admin/rubrics', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), (0, validate_1.validate)(rubric_zod_1.listRubricsSchema), rubricController.listRubricsHandler);
    // Get a single rubric
    app.get('/api/admin/rubrics/:rubricId', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), rubricController.getRubricByIdHandler);
    // Create a new rubric
    app.post('/api/admin/rubrics', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), (0, validate_1.validate)(rubric_zod_1.createRubricSchema), rubricController.createRubricHandler);
    // Update a rubric
    app.put('/api/admin/rubrics/:rubricId', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), (0, validate_1.validate)(rubric_zod_1.updateRubricSchema), rubricController.updateRubricHandler);
    // Delete a rubric
    app.delete('/api/admin/rubrics/:rubricId', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), rubricController.deleteRubricHandler);
};
exports.registerRubricRoutes = registerRubricRoutes;
//# sourceMappingURL=rubric.routes.js.map