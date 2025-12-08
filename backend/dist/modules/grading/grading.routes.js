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
exports.registerGradingRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const grading_zod_1 = require("./grading.zod");
const gradingController = __importStar(require("./grading.controller"));
const registerGradingRoutes = (app) => {
    // Run code (for students)
    app.post('/api/student/attempts/:attemptId/run-code', auth_1.verifyAccess, (0, validate_1.validate)(grading_zod_1.runCodeSchema), gradingController.runCodeHandler);
    // Auto-grade essay (for admins/staff)
    app.post('/api/grading/essay', 
    // authorize([Role.STAFF]), // Ensure only staff can trigger this
    (0, validate_1.validate)(grading_zod_1.autoGradeEssaySchema), gradingController.gradeEssayHandler);
    // Queue status endpoint (public for students to check wait times)
    app.get('/api/queue/status', gradingController.getQueueStatusHandler);
};
exports.registerGradingRoutes = registerGradingRoutes;
//# sourceMappingURL=grading.routes.js.map