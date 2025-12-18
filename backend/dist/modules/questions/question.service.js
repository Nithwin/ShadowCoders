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
exports.deleteQuestion = exports.updateQuestion = exports.getQuestionForStudent = exports.addQuestionsToExam = exports.listQuestionsForExam = void 0;
/**
 * Fetches all questions for a specific exam.
 */
const listQuestionsForExam = async (examId) => {
    // We can add validation here later, but for now, just call the repo
    const questions = await questionRepo.listQuestionsForExam(examId);
    return questions;
};
exports.listQuestionsForExam = listQuestionsForExam;
const questionRepo = __importStar(require("./question.repo"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const addQuestionsToExam = async (examId, questions) => {
    const questionsData = questions.map((q) => {
        const baseData = {
            examId,
            order: q.order,
            points: q.points,
            type: q.type,
            prompt: q.prompt ?? null,
        };
        switch (q.type) {
            case client_1.QType.MCQ:
                baseData.options = q.options ? q.options : client_1.Prisma.JsonNull;
                baseData.correctOptionIds = q.correctOptionIds ? q.correctOptionIds : client_1.Prisma.JsonNull;
                break;
            case client_1.QType.CODING:
                baseData.starterCode = q.starterCode ?? null;
                baseData.testcases = q.testcases ? q.testcases : client_1.Prisma.JsonNull;
                break;
            case client_1.QType.ESSAY:
                baseData.wordLimit = q.wordLimit ?? null;
                break;
            case client_1.QType.LISTENING:
                baseData.options = q.options ? q.options : client_1.Prisma.JsonNull;
                baseData.correctOptionIds = q.correctOptionIds ? q.correctOptionIds : client_1.Prisma.JsonNull;
                // Use mediaAssetId directly (createMany doesn't support relation syntax)
                baseData.mediaAssetId = q.mediaAssetId ?? null;
                baseData.config = q.maxListenCount ? { maxListenCount: q.maxListenCount } : client_1.Prisma.JsonNull;
                break;
            case client_1.QType.SPEAKING:
                baseData.maxDurationSec = q.maxDurationSec ?? null;
                baseData.config = q.maxReattempts !== undefined ? { maxReattempts: q.maxReattempts } : client_1.Prisma.JsonNull;
                break;
            case client_1.QType.SQL:
                baseData.config = q.config ? q.config : client_1.Prisma.JsonNull;
                baseData.testcases = q.testcases ? q.testcases : client_1.Prisma.JsonNull;
                break;
            case client_1.QType.FILL:
            case client_1.QType.READING:
                // Handle other types if necessary or just break if they share base structure
                break;
            default:
                const exhaustiveCheck = q;
                throw new Error(`Unsupported question type encountered: ${JSON.stringify(exhaustiveCheck)}`);
        }
        return baseData;
    });
    return questionRepo.createManyQuestions(examId, questionsData);
};
exports.addQuestionsToExam = addQuestionsToExam;
const getQuestionForStudent = async (studentId, attemptId, questionId) => {
    // 1. --- Validate Attempt ---
    // We must check the attempt first to get the examId
    const attempt = await prisma_1.prisma.attempt.findUnique({
        where: { id: attemptId },
        select: { studentId: true, status: true, examId: true },
    });
    if (!attempt) {
        throw { status: 404, message: 'Attempt not found' };
    }
    if (attempt.studentId !== studentId) {
        throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
    }
    if (attempt.status !== client_1.AttemptStatus.IN_PROGRESS) {
        throw { status: 403, message: `Cannot fetch question. Attempt status is ${attempt.status}` };
    }
    // 2. --- Fetch and Validate Question ---
    const question = await questionRepo.getQuestionById(questionId);
    if (!question) {
        throw { status: 404, message: 'Question not found' };
    }
    // Ensure the question belongs to the exam the student is attempting
    if (question.examId !== attempt.examId) {
        throw { status: 403, message: 'Forbidden: Question is not part of this exam' };
    }
    // 3. --- Scrub the Answer Data ---
    // Create a copy of the question and remove sensitive fields
    const scrubbedQuestion = { ...question };
    delete scrubbedQuestion.correctOptionIds;
    delete scrubbedQuestion.blanks;
    // For coding and SQL questions, only return non-hidden test cases
    if ((question.type === client_1.QType.CODING || question.type === client_1.QType.SQL) && Array.isArray(question.testcases)) {
        scrubbedQuestion.testcases = question.testcases
            .filter((tc) => tc && tc.isHidden === false)
            .map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
        }));
    }
    else {
        // Ensure testcases are removed for other question types
        delete scrubbedQuestion.testcases;
    }
    // For LISTENING questions, include mediaAsset but remove correctOptionIds
    if (question.type === client_1.QType.LISTENING) {
        // mediaAsset is already included in the question object
        delete scrubbedQuestion.correctOptionIds;
    }
    // Handle reports status
    // Check if there are any open reports?
    // User Requirement: "if one student reported that question other should can't report it"
    // So we check if reports array is not empty (assuming repo returns active reports or all)
    // We selected { id: true, status: true } in repo.
    const hasActiveReport = question.reports && question.reports.some((r) => r.status === 'OPEN');
    scrubbedQuestion.isReported = !!hasActiveReport;
    delete scrubbedQuestion.reports;
    return scrubbedQuestion;
};
exports.getQuestionForStudent = getQuestionForStudent;
const updateQuestion = async (questionId, input) => {
    // 1. --- Validation: Check if the question exists ---
    // 1. --- Validation: Check if the question exists ---
    const existingQuestion = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
        include: {
            _count: {
                select: { responses: true },
            },
        },
    });
    if (!existingQuestion) {
        throw { status: 404, message: 'Question not found' };
    }
    // Prevent modifying points if responses exist (to avoid score corruption)
    if (input.points !== undefined && existingQuestion._count.responses > 0) {
        // Only throw if the points value is actually different
        if (existingQuestion.points.toNumber() !== input.points) {
            throw {
                status: 400,
                message: 'Cannot change points for a question that has already been answered. This would corrupt existing exam scores.'
            };
        }
    }
    // 2. --- Prepare Data (Type-Safe Update) ---
    // Manually build the update object to ensure we only update
    // fields relevant to this question's type.
    const dataToUpdate = {};
    // Add common fields if they are provided
    if (input.order !== undefined)
        dataToUpdate.order = input.order;
    if (input.points !== undefined)
        dataToUpdate.points = input.points;
    if (input.prompt !== undefined)
        dataToUpdate.prompt = input.prompt;
    // Add type-specific fields
    switch (existingQuestion.type) {
        case client_1.QType.MCQ:
            if (input.options !== undefined)
                dataToUpdate.options = input.options;
            if (input.correctOptionIds !== undefined)
                dataToUpdate.correctOptionIds = input.correctOptionIds;
            break;
        case client_1.QType.CODING:
            if (input.starterCode !== undefined)
                dataToUpdate.starterCode = input.starterCode ?? null;
            if (input.testcases !== undefined) {
                // Validate that testcases is an array and has at least one item
                if (Array.isArray(input.testcases)) {
                    if (input.testcases.length === 0) {
                        throw { status: 400, message: 'Coding question must have at least one test case' };
                    }
                    // Validate each testcase has required fields
                    for (let i = 0; i < input.testcases.length; i++) {
                        const tc = input.testcases[i];
                        if (!tc || !tc.input || !tc.expectedOutput) {
                            throw { status: 400, message: `Test case ${i + 1} must have both input and expectedOutput` };
                        }
                    }
                    dataToUpdate.testcases = input.testcases;
                }
                else {
                    throw { status: 400, message: 'Testcases must be an array' };
                }
            }
            break;
        case client_1.QType.ESSAY:
            if (input.wordLimit !== undefined)
                dataToUpdate.wordLimit = input.wordLimit ?? null;
            break;
        case client_1.QType.LISTENING:
            if (input.options !== undefined)
                dataToUpdate.options = input.options;
            if (input.correctOptionIds !== undefined)
                dataToUpdate.correctOptionIds = input.correctOptionIds;
            if (input.mediaAssetId !== undefined) {
                if (input.mediaAssetId) {
                    dataToUpdate.mediaAsset = { connect: { id: input.mediaAssetId } };
                }
            }
            if (input.config !== undefined)
                dataToUpdate.config = input.config;
            break;
        case client_1.QType.SPEAKING:
            if (input.maxDurationSec !== undefined)
                dataToUpdate.maxDurationSec = input.maxDurationSec ?? null;
            if (input.config !== undefined)
                dataToUpdate.config = input.config;
            break;
        case client_1.QType.SQL:
            if (input.config !== undefined)
                dataToUpdate.config = input.config;
            if (input.testcases !== undefined)
                dataToUpdate.testcases = input.testcases;
            break;
        case client_1.QType.FILL:
        case client_1.QType.READING:
            // Handle other types if necessary
            break;
    }
    // Add other optional fields (only if not already handled in switch)
    if (input.mediaAssetId !== undefined && existingQuestion.type !== client_1.QType.LISTENING && input.mediaAssetId) {
        dataToUpdate.mediaAsset = { connect: { id: input.mediaAssetId } };
    }
    if (input.passageAssetId !== undefined && input.passageAssetId) {
        dataToUpdate.passageAsset = { connect: { id: input.passageAssetId } };
    }
    if (input.config !== undefined) {
        dataToUpdate.config = input.config;
    }
    // Call Repository
    const updatedQuestion = await questionRepo.updateQuestion(questionId, dataToUpdate);
    // Verify the update was successful
    const verifiedQuestion = await questionRepo.getQuestionById(questionId);
    // Notify students via socket
    if (verifiedQuestion) {
        const { examMonitoring } = await Promise.resolve().then(() => __importStar(require('../../lib/socket')));
        examMonitoring.notifyQuestionUpdate(verifiedQuestion.examId, questionId, verifiedQuestion);
    }
    return updatedQuestion;
};
exports.updateQuestion = updateQuestion;
const deleteQuestion = async (questionId) => {
    // 1. --- Validation: Check if the question exists AND has responses ---
    const existingQuestion = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
        include: {
            _count: {
                select: { responses: true }, // Count how many responses it has
            },
        },
    });
    if (!existingQuestion) {
        throw { status: 404, message: 'Question not found' };
    }
    // 2. --- Business Logic: PREVENT DELETING A QUESTION WITH SUBMISSIONS ---
    if (existingQuestion._count.responses > 0) {
        throw {
            status: 400,
            message: 'Cannot delete a question that has already been answered by students.',
        };
    }
    // 3. --- Call Repository (if safe) ---
    // If there are no responses, it's safe to delete the question and its links
    await questionRepo.deleteQuestion(questionId);
    return { message: 'Question deleted successfully' };
};
exports.deleteQuestion = deleteQuestion;
//# sourceMappingURL=question.service.js.map