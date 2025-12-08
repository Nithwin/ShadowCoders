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
exports.gradeEssay = exports.runCode = void 0;
const gradingRepo = __importStar(require("./grading.repo"));
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
const local_executor_1 = require("../../lib/local-executor");
const env_1 = require("../../config/env");
const execution_queue_1 = require("../../lib/execution-queue");
/**
 * Handles the logic for running a student's code submission.
 */
const runCode = async (studentId, attemptId, input) => {
    const { questionId, code, language, customInput, runAllTests } = input;
    // 1. --- Validation: Check Attempt ---
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
    // Allow students to run code even after submission
    // We allow running code for both IN_PROGRESS and SUBMITTED status
    // 2. --- Validation: Check Question ---
    const question = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
        select: { examId: true, type: true, testcases: true },
    });
    if (!question) {
        throw { status: 404, message: 'Question not found' };
    }
    if (question.examId !== attempt.examId) {
        throw { status: 403, message: 'Question is not part of this exam' };
    }
    if (question.type !== client_1.QType.CODING) {
        throw { status: 400, message: 'This is not a coding question' };
    }
    // 3. --- Upsert Response (create if doesn't exist) ---
    // This allows students to test code before final submission
    let response = await prisma_1.prisma.response.findFirst({
        where: { attemptId: attemptId, questionId: questionId },
        select: { id: true }
    });
    if (!response) {
        // Create a response record if it doesn't exist
        const newResponse = await prisma_1.prisma.response.create({
            data: {
                attemptId: attemptId,
                questionId: questionId,
                type: client_1.QType.CODING,
                answer: { code, language },
            },
            select: { id: true }
        });
        response = newResponse;
    }
    else {
        // Update the existing response with the latest code
        await prisma_1.prisma.response.update({
            where: { id: response.id },
            data: {
                answer: { code, language },
            },
        });
    }
    // 4. --- Create Grading Job ---
    const jobData = {
        provider: 'local',
        status: 'QUEUED',
        payload: { code, language, customInput: customInput || null },
        response: { connect: { id: response.id } },
    };
    const job = await gradingRepo.createGradingJob(jobData);
    // 5. --- Execute Code (via Queue) ---
    let result;
    if (customInput !== undefined && customInput !== null && customInput !== '') {
        // Run with custom input (single execution) - queued
        const executionResult = await execution_queue_1.executionQueue.enqueue(async () => {
            return await (0, local_executor_1.executeCodeLocally)(code, language, customInput, 5000);
        });
        // Format result for custom input
        result = {
            passed: 0,
            total: 0,
            testResults: [],
            message: 'Custom input execution',
            customOutput: {
                input: customInput,
                output: executionResult.stdout || '',
                error: executionResult.stderr || ('compile_output' in executionResult ? executionResult.compile_output : null) || ('message' in executionResult ? executionResult.message : null) || ('error' in executionResult ? executionResult.error : null) || null,
                status: executionResult.status.description,
                time: typeof executionResult.time === 'string' ? parseFloat(executionResult.time) : executionResult.time,
                memory: executionResult.memory || 0,
            },
        };
    }
    else {
        // Run against visible test cases
        if (!question.testcases || question.testcases.length === 0) {
            throw { status: 400, message: 'No test cases found for this question' };
        }
        const testCases = question.testcases;
        // Filter test cases: if runAllTests is true, use all test cases; otherwise only visible ones
        const testCasesToRun = runAllTests
            ? testCases
            : testCases.filter((tc) => !tc.isHidden);
        if (testCasesToRun.length === 0) {
            const errorMessage = runAllTests
                ? 'No test cases found for this question'
                : 'No visible test cases found for this question';
            throw { status: 400, message: errorMessage };
        }
        // Test code against test cases using local executor - queued
        const testResults = await execution_queue_1.executionQueue.enqueue(async () => {
            return await (0, local_executor_1.testCodeWithTestCasesLocally)(code, language, testCasesToRun.map((tc) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                timeoutMs: tc.timeoutMs || 5000, // Default 5 seconds for local execution
            })));
        });
        // Format Result
        result = {
            passed: testResults.passed,
            total: testResults.total,
            testResults: testResults.results,
            message: testResults.passed === testResults.total
                ? 'All test cases passed!'
                : `${testResults.passed}/${testResults.total} test cases passed`,
            customOutput: null,
        };
    }
    // 6. --- Update Job with Result ---
    const jobStatus = result.customOutput
        ? (result.customOutput.error ? 'FAILED' : 'SUCCEEDED')
        : (result.passed === result.total ? 'SUCCEEDED' : 'FAILED');
    const finalJob = await gradingRepo.updateGradingJob(job.id, jobStatus, result);
    // 7. Return the execution result
    return finalJob.result;
};
exports.runCode = runCode;
// --- ESSAY GRADING LOGIC ---
// Create a dedicated queue with concurrency 1 for essay grading to save CPU
// This ensures only ONE essay is graded at a time by the local LLM
const execution_queue_2 = require("../../lib/execution-queue");
const essayGradingQueue = new execution_queue_2.ExecutionQueue(1);
const gradeEssay = async (responseId) => {
    // 1. Validation
    const response = await prisma_1.prisma.response.findUnique({
        where: { id: responseId },
        include: {
            question: {
                include: { rubric: true }
            }
        }
    });
    if (!response) {
        throw { status: 404, message: 'Response not found' };
    }
    if (response.question.type !== client_1.QType.ESSAY) {
        throw { status: 400, message: 'This is not an essay response' };
    }
    // 2. Extact text answer
    // Handle both possible locations for essay text (answer JSON or textAnswer field)
    let studentText = response.textAnswer;
    if (!studentText && response.answer && typeof response.answer === 'object') {
        studentText = response.answer.textAnswer || response.answer.text;
    }
    if (!studentText || studentText.trim().length === 0) {
        throw { status: 400, message: 'Essay is empty, cannot grade.' };
    }
    // 3. Create GradingJob (Queued)
    const jobData = {
        provider: env_1.env.AI_PROVIDER || 'gemini',
        status: 'QUEUED',
        payload: { responseId },
        response: { connect: { id: response.id } },
    };
    const job = await gradingRepo.createGradingJob(jobData);
    // 4. Enqueue the grading task
    essayGradingQueue.enqueue(async () => {
        try {
            console.log(`[EssayGrade] Starting job ${job.id} for response ${response.id}`);
            // Update job to RUNNING
            await gradingRepo.updateGradingJob(job.id, 'RUNNING', null);
            // Prepare Prompt
            const questionPrompt = response.question.prompt || 'No prompt provided';
            const maxPoints = Number(response.question.points);
            const rubricText = response.question.rubric
                ? JSON.stringify(response.question.rubric.criteria)
                : 'No specific rubric provided. Grade based on clarity, relevance, and completeness.';
            const systemPrompt = `You are a strict academic grader. 
Grade the following essay based on the provided Question and Rubric.

**Question:**
${questionPrompt}

**Rubric/Criteria:**
${rubricText}

**Max Points:** ${maxPoints}

**Student Answer:**
${studentText}

**INSTRUCTIONS:**
1. Analyze the student's answer against the rubric.
2. Assign a score between 0 and ${maxPoints}. Use decimal points if needed (e.g., 8.5).
3. Provide constructive feedback explaining the score.
4. Return ONLY a valid JSON object in this format:
{
  "score": <number>,
  "feedback": "<string>"
}
`;
            // Call AI Service
            let aiResponseString = '';
            if (env_1.env.AI_PROVIDER === 'ollama') {
                const { generateJsonFromOllama } = await Promise.resolve().then(() => __importStar(require('../../lib/ollama')));
                aiResponseString = await generateJsonFromOllama(systemPrompt);
            }
            else {
                const { generateJsonFromAi } = await Promise.resolve().then(() => __importStar(require('../../lib/gemini')));
                aiResponseString = await generateJsonFromAi(systemPrompt);
            }
            // Parse Result
            // Clean up markdown code blocks if present
            let cleaned = aiResponseString.trim();
            if (cleaned.startsWith('```')) {
                const lines = cleaned.split('\n');
                lines.shift();
                if (lines[lines.length - 1]?.trim() === '```')
                    lines.pop();
                cleaned = lines.join('\n');
            }
            const resultJson = JSON.parse(cleaned);
            // Validate result structure
            if (typeof resultJson.score !== 'number' || typeof resultJson.feedback !== 'string') {
                throw new Error('AI returned invalid JSON structure');
            }
            // 5. Save Evaluation
            await prisma_1.prisma.evaluation.create({
                data: {
                    responseId: response.id,
                    kind: 'AI',
                    score: resultJson.score,
                    comments: resultJson.feedback,
                    isFinal: false, // Teacher must approve
                    createdAt: new Date(),
                }
            });
            // 6. Complete Job
            await gradingRepo.updateGradingJob(job.id, 'SUCCEEDED', resultJson);
            console.log(`[EssayGrade] Job ${job.id} completed. Score: ${resultJson.score}`);
            return resultJson;
        }
        catch (error) {
            console.error(`[EssayGrade] Job ${job.id} failed:`, error);
            await gradingRepo.updateGradingJob(job.id, 'FAILED', { error: error.message });
            throw error;
        }
    });
    return { jobId: job.id, status: 'QUEUED', message: 'Essay grading has been queued.' };
};
exports.gradeEssay = gradeEssay;
//# sourceMappingURL=grading.service.js.map