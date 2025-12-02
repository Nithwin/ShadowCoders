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
exports.generateQuestionsHandler = void 0;
const aiService = __importStar(require("./ai.service"));
const generateQuestionsHandler = async (req, res, next) => {
    try {
        // Get validated data from the middleware
        const input = req.validatedData?.body;
        if (!input) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid request body',
            });
        }
        // Call the service to get the generated questions
        const questions = await aiService.generateQuestions(input);
        // Send the array of questions back to the frontend
        res.status(200).json(questions);
    }
    catch (error) {
        // Pass error to error handler middleware
        next(error);
    }
};
exports.generateQuestionsHandler = generateQuestionsHandler;
//# sourceMappingURL=ai.controller.js.map