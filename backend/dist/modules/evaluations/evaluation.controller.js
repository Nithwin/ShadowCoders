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
exports.createManualEvaluationHandler = void 0;
const evaluationService = __importStar(require("./evaluation.service"));
const createManualEvaluationHandler = async (req, res, next) => {
    try {
        const assessorId = req.user?.sub; // ID of the STAFF user
        const responseId = req.params.responseId; // ID of the answer being graded
        // Get validated data from middleware
        const evaluationData = req.validatedData?.body || req.body;
        if (!assessorId) {
            return next({ status: 401, message: 'Unauthorized: Assessor ID not found' });
        }
        if (!responseId) {
            return next({ status: 400, message: 'Response ID parameter is required' });
        }
        // Call the service to create the evaluation and update scores
        const newEvaluation = await evaluationService.createManualEvaluation(responseId, assessorId, evaluationData);
        // Send back the newly created evaluation
        res.status(201).json(newEvaluation);
    }
    catch (error) {
        next(error);
    }
};
exports.createManualEvaluationHandler = createManualEvaluationHandler;
//# sourceMappingURL=evaluation.controller.js.map