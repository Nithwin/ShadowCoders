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
exports.deleteQuestionHandler = exports.updateQuestionHandler = exports.getQuestionHandler = exports.addQuestionsHandler = exports.listQuestionsForExamHandler = void 0;
/**
 * Handles the request to list all questions for an exam.
 */
const listQuestionsForExamHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Exam ID parameter is required' });
        }
        const questions = await questionService.listQuestionsForExam(examId);
        res.status(200).json(questions);
    }
    catch (error) {
        next(error);
    }
};
exports.listQuestionsForExamHandler = listQuestionsForExamHandler;
const questionService = __importStar(require("./question.service"));
const addQuestionsHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return res.status(400).json({ error: 'Exam ID is required' });
        }
        // Get validated data from middleware if available, otherwise use req.body
        const questions = req.validatedData?.body?.questions || req.body.questions;
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'At least one question must be provided'
            });
        }
        await questionService.addQuestionsToExam(examId, questions);
        res.status(201).json({
            message: 'Questions added successfully',
            count: questions.length
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addQuestionsHandler = addQuestionsHandler;
const getQuestionHandler = async (req, res, next) => {
    try {
        const studentId = req.user?.sub;
        const { attemptId, questionId } = req.params;
        if (!studentId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        if (!attemptId || !questionId) {
            return next({ status: 400, message: 'Attempt ID and Question ID are required' });
        }
        // Call the service to get the scrubbed question
        const scrubbedQuestion = await questionService.getQuestionForStudent(studentId, attemptId, questionId);
        res.status(200).json(scrubbedQuestion);
    }
    catch (error) {
        // Pass errors (404, 403) to the central handler
        next(error);
    }
};
exports.getQuestionHandler = getQuestionHandler;
const updateQuestionHandler = async (req, res, next) => {
    try {
        const questionId = req.params.questionId;
        // Use validatedData from middleware, fallback to req.body if not available
        const updateData = req.validatedData?.body || req.body;
        if (!questionId) {
            return next({ status: 400, message: 'Question ID parameter is required' });
        }
        const updatedQuestion = await questionService.updateQuestion(questionId, updateData);
        res.status(200).json(updatedQuestion);
    }
    catch (error) {
        next(error);
    }
};
exports.updateQuestionHandler = updateQuestionHandler;
const deleteQuestionHandler = async (req, res, next) => {
    try {
        const questionId = req.params.questionId;
        if (!questionId) {
            return next({ status: 400, message: 'Question ID parameter is required' });
        }
        const result = await questionService.deleteQuestion(questionId);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteQuestionHandler = deleteQuestionHandler;
//# sourceMappingURL=question.controller.js.map