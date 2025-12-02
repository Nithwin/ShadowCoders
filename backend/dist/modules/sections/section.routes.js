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
exports.registerSectionRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const auth_2 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const section_zod_1 = require("./section.zod");
const sectionController = __importStar(require("./section.controller"));
const registerSectionRoutes = (app) => {
    // Get all sections for an exam
    app.get('/api/admin/exams/:examId/sections', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), sectionController.listSectionsForExamHandler);
    app.post('/api/admin/exams/:examId/sections', auth_1.verifyAccess, // 1. Must be logged in
    (0, auth_2.requireRole)('STAFF'), // 2. Must be staff
    (0, validate_1.validate)(section_zod_1.createSectionSchema), // 3. Data must be valid
    sectionController.createSectionHandler // 4. Run the controller
    );
    app.post('/api/admin/sections/:sectionId/questions', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), (0, validate_1.validate)(section_zod_1.addQuestionsToSectionSchema), sectionController.addQuestionsToSectionHandler);
    app.put('/api/admin/sections/:sectionId', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), (0, validate_1.validate)(section_zod_1.updateSectionSchema), sectionController.updateSectionHandler);
    app.delete('/api/admin/sections/:sectionId', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), 
    // No Zod validation needed for a simple delete
    sectionController.deleteSectionHandler);
    app.delete('/api/admin/sections/:sectionId/questions/:questionId', auth_1.verifyAccess, (0, auth_2.requireRole)('STAFF'), 
    // No Zod validation needed, IDs are in params
    sectionController.removeQuestionFromSectionHandler);
    // We can add routes for GET, PUT, DELETE for sections here later
};
exports.registerSectionRoutes = registerSectionRoutes;
//# sourceMappingURL=section.routes.js.map