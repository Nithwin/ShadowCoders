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
exports.registerTemplateRoutes = void 0;
const express_1 = require("express");
const templateController = __importStar(require("./exam-template.controller"));
const auth_1 = require("../../../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Create template from existing exam
router.post("/exams/:examId/template", auth_1.verifyAccess, (0, auth_1.requireRole)(client_1.Role.STAFF), templateController.createTemplateFromExam);
// Create exam from template
router.post("/templates/:templateId/exam", auth_1.verifyAccess, (0, auth_1.requireRole)(client_1.Role.STAFF), templateController.createExamFromTemplate);
// List templates
router.get("/templates", auth_1.verifyAccess, (0, auth_1.requireRole)(client_1.Role.STAFF), templateController.listTemplates);
// Delete template
router.delete("/templates/:templateId", auth_1.verifyAccess, (0, auth_1.requireRole)(client_1.Role.STAFF), templateController.deleteTemplate);
const registerTemplateRoutes = (app) => {
    app.use("/api/admin", router);
};
exports.registerTemplateRoutes = registerTemplateRoutes;
//# sourceMappingURL=exam-template.routes.js.map