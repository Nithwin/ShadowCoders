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
exports.runCode = exports.resetAttempts = exports.getAttemptForAdmin = exports.getStudentAttempts = exports.listAttemptsForExam = exports.getAttemptResults = exports.getQuestionForStudent = exports.getQuestionById = exports.getAttemptDetails = exports.submitAttempt = exports.submitAnswer = exports.startAttempt = void 0;
const attemptRepo = __importStar(require("./attempt.repo"));
const client_1 = require("@prisma/client");
const utils_1 = require("../../lib/utils");
const prisma_1 = require("../../lib/prisma");
const userRepo = __importStar(require("../auth/auth.repo"));
const grading_logic_1 = require("../grading/grading.logic");
const local_executor_1 = require("../../lib/local-executor");
const startAttempt = async (studentId, examId) => {
    const exam = await prisma_1.prisma.exam.findUnique({
        where: { id: examId },
        include: {
            assignments: true,
            questions: { select: { id: true } },
            attempts: {
                where: {
                    studentId: studentId,
                },
                select: {
                    id: true,
                    attemptNo: true,
                    status: true,
                },
                orderBy: {
                    attemptNo: 'desc',
                },
            },
        },
    });
    if (!exam) {
        throw { status: 404, message: "Exam not found" };
    }
    if (exam.status !== client_1.ExamStatus.PUBLISHED) {
        throw { status: 403, message: "Exam is not published" };
    }
    const now = new Date();
    if (now < exam.startAt || now > exam.endAt) {
        throw { status: 403, message: "Exam is not currently active" };
    }
    // Fetch student cohort info for assignment matching
    const student = await userRepo.findStudentWithCohortInfo(studentId);
    if (!student) {
        throw { status: 404, message: "Student not found" };
    }
    // Determine if the exam is assigned to this student
    const isAssigned = exam.assignments.some((a) => {
        // Assigned to all
        if (a.assignToAll)
            return true;
        // Direct assignment by student id
        const ids = a.studentIds ?? null;
        if (ids && ids.includes(studentId))
            return true;
        // Cohort-based assignment (requires all fields to match)
        if (a.cohortYear != null &&
            a.cohortDepartment != null &&
            a.cohortSection != null &&
            student.year != null &&
            student.department != null &&
            student.section != null) {
            if (a.cohortYear === student.year &&
                a.cohortDepartment === student.department &&
                a.cohortSection === student.section) {
                return true;
            }
        }
        return false;
    });
    if (!isAssigned) {
        throw { status: 403, message: "You are not assigned to this exam" };
    }
    // Use a transaction to prevent race conditions when multiple students start simultaneously
    // This ensures atomicity and prevents duplicate attempts
    return await prisma_1.prisma.$transaction(async (tx) => {
        // Re-fetch attempts within transaction to get latest state
        const currentAttempts = await tx.attempt.findMany({
            where: {
                examId: examId,
                studentId: studentId,
            },
            select: {
                id: true,
                attemptNo: true,
                status: true,
            },
            orderBy: {
                attemptNo: 'desc',
            },
        });
        const submittedAttempts = currentAttempts.filter(a => a.status === client_1.AttemptStatus.SUBMITTED);
        const submittedAttemptCount = submittedAttempts.length;
        // Check if student has reached max attempts
        if (exam.maxAttempts !== null && exam.maxAttempts !== undefined) {
            if (submittedAttemptCount >= exam.maxAttempts) {
                throw {
                    status: 403,
                    message: `You have reached the maximum number of attempts (${exam.maxAttempts}) for this exam.`
                };
            }
        }
        // Check if there's an in-progress attempt (within transaction)
        const inProgressAttempt = currentAttempts.find(a => a.status === client_1.AttemptStatus.IN_PROGRESS);
        if (inProgressAttempt) {
            // Return the existing in-progress attempt
            return await tx.attempt.findUnique({
                where: { id: inProgressAttempt.id },
                select: {
                    id: true,
                    examId: true,
                    studentId: true,
                    startedAt: true,
                    status: true,
                    orderMap: true,
                    attemptNo: true,
                },
            });
        }
        // Calculate the next attempt number
        const nextAttemptNo = currentAttempts.length + 1;
        let orderMap = null;
        if (exam.randomizeQuestions && exam.questions.length > 0) {
            const questionIds = exam.questions.map((q) => q.id);
            orderMap = (0, utils_1.shuffleArray)(questionIds);
        }
        const attemptData = {
            status: client_1.AttemptStatus.IN_PROGRESS,
            attemptNo: nextAttemptNo,
            orderMap: orderMap ?? client_1.Prisma.JsonNull,
            student: { connect: { id: studentId } },
            exam: { connect: { id: examId } },
        };
        try {
            const newAttempt = await tx.attempt.create({
                data: attemptData,
                select: {
                    id: true,
                    examId: true,
                    studentId: true,
                    startedAt: true,
                    status: true,
                    orderMap: true,
                    attemptNo: true,
                },
            });
            return newAttempt;
        }
        catch (error) {
            // Handle race condition: if another attempt was created between our check and create
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                // Re-check for in-progress attempt (it might have been created by another request)
                const latestAttempt = await tx.attempt.findFirst({
                    where: {
                        examId: examId,
                        studentId: studentId,
                        status: client_1.AttemptStatus.IN_PROGRESS,
                    },
                    select: {
                        id: true,
                        examId: true,
                        studentId: true,
                        startedAt: true,
                        status: true,
                        orderMap: true,
                        attemptNo: true,
                    },
                    orderBy: {
                        startedAt: 'desc',
                    },
                });
                if (latestAttempt) {
                    return latestAttempt;
                }
                throw { status: 409, message: "Attempt already exists. Please refresh and try again." };
            }
            throw error;
        }
    }, {
        // Increase timeout for transaction (in case of high concurrency)
        timeout: 10000, // 10 seconds
        isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable, // Strongest isolation
    });
};
exports.startAttempt = startAttempt;
const submitAnswer = async (studentId, attemptId, input) => {
    const { questionId, answer } = input;
    const attempt = await prisma_1.prisma.attempt.findUnique({
        where: { id: attemptId },
        select: {
            studentId: true,
            status: true,
            examId: true,
        },
    });
    if (!attempt) {
        throw { status: 404, message: "Attempt not found" };
    }
    if (attempt.studentId !== studentId) {
        throw {
            status: 403,
            message: "You are not authorized to modify this attempt",
        };
    }
    // Allow students to edit answers even after submission
    // We allow editing for both IN_PROGRESS and SUBMITTED status
    const question = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
        select: { examId: true, type: true },
    });
    if (!question) {
        throw { status: 404, message: "Question not found" };
    }
    if (question.examId !== attempt.examId) {
        throw {
            status: 403,
            message: "Forbidden: Question does not belong to this exam",
        };
    }
    // For SPEAKING questions, extract audioAssetId from answer if present
    let audioAssetId;
    if (question.type === client_1.QType.SPEAKING && answer && typeof answer === 'object' && 'audioAssetId' in answer) {
        audioAssetId = answer.audioAssetId;
    }
    const responseData = {
        attemptId: attemptId,
        questionId: questionId,
        answer: answer ? answer : client_1.Prisma.JsonNull,
        type: question.type,
        ...(audioAssetId && { audioAssetId }),
    };
    const savedResponse = await attemptRepo.upsertResponse(responseData);
    return savedResponse;
};
exports.submitAnswer = submitAnswer;
const submitAttempt = async (studentId, attemptId, submissionReason) => {
    // 1. Fetch all data needed for grading
    const attempt = await attemptRepo.getAttemptForSubmission(attemptId);
    // 2. --- Validation Checks ---
    if (!attempt) {
        throw { status: 404, message: 'Attempt not found' };
    }
    if (attempt.studentId !== studentId) {
        throw { status: 403, message: 'Forbidden: Attempt does not belong to this student' };
    }
    if (attempt.status !== client_1.AttemptStatus.IN_PROGRESS) {
        throw { status: 403, message: `Attempt has already been ${attempt.status.toLowerCase()}` };
    }
    let totalScore = 0;
    let maxScore = 0;
    for (const question of attempt.exam.questions) {
        // Add question's points to the max possible score
        // Convert Decimal to number for calculation
        const questionPoints = Number(question.points);
        maxScore += questionPoints;
        // Find the student's response for this question
        const response = attempt.responses.find((r) => r.questionId === question.id);
        if (response && response.answer) {
            // Auto-grade based on question type
            let gradingResult = {
                earnedPoints: 0,
                verdict: 'FAIL',
                gradingMode: client_1.GradingMode.MANUAL, // Default to manual if not auto-graded
            };
            switch (question.type) {
                case client_1.QType.MCQ:
                    gradingResult = (0, grading_logic_1.gradeMCQ)(response.answer, question.correctOptionIds, questionPoints);
                    break;
                case client_1.QType.CODING:
                    gradingResult = await (0, grading_logic_1.gradeCoding)(response.answer, question.testcases, questionPoints);
                    break;
                case client_1.QType.ESSAY:
                case client_1.QType.SPEAKING:
                    // Manual grading required
                    gradingResult = {
                        earnedPoints: 0,
                        verdict: 'PENDING', // Or FAIL/PASS based on policy, usually PENDING for manual
                        gradingMode: client_1.GradingMode.MANUAL,
                    };
                    break;
                default:
                    gradingResult = {
                        earnedPoints: 0,
                        verdict: 'FAIL',
                        gradingMode: client_1.GradingMode.MANUAL,
                    };
            }
            // Update total score if auto-graded
            if (gradingResult.gradingMode === client_1.GradingMode.AUTO) {
                totalScore += gradingResult.earnedPoints;
            }
            // Update the response in the database
            // Only update if we actually have a result (even 0 points)
            if (gradingResult.gradingMode === client_1.GradingMode.AUTO) {
                await prisma_1.prisma.response.updateMany({
                    where: {
                        attemptId: attemptId,
                        questionId: question.id,
                    },
                    data: {
                        earnedPoints: gradingResult.earnedPoints,
                        verdict: gradingResult.verdict,
                        gradingMode: gradingResult.gradingMode,
                    },
                });
            }
        }
    }
    // 4. --- Update the Attempt in the Database ---
    // Determine submission type
    const submissionType = submissionReason ? 'AUTO' : 'NORMAL';
    const submittedAttempt = await prisma_1.prisma.attempt.update({
        where: { id: attemptId },
        data: {
            status: client_1.AttemptStatus.SUBMITTED,
            submittedAt: new Date(),
            score: totalScore,
            maxScore: maxScore,
            submissionType: submissionType,
            submissionReason: submissionReason || null,
            // Calculate time spent
            timeSpentSec: Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000),
        },
    });
    return submittedAttempt;
};
exports.submitAttempt = submitAttempt;
const getAttemptDetails = async (studentId, attemptId) => {
    // 1. Fetch all attempt data from the repository
    const attempt = await attemptRepo.getAttemptDetails(attemptId);
    // 2. --- Validation Checks ---
    if (!attempt) {
        throw { status: 404, message: 'Attempt not found' };
    }
    // 3. --- Security Check ---
    // Ensure the logged-in student is the one who owns this attempt
    if (attempt.studentId !== studentId) {
        throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
    }
    // (Optional) You could also check if the attempt is IN_PROGRESS,
    // but it's often useful to let students view submitted attempts too.
    // We'll leave this check out for now.
    // 4. Return the full attempt details
    return attempt;
};
exports.getAttemptDetails = getAttemptDetails;
const getQuestionById = (questionId) => {
    return prisma_1.prisma.question.findUnique({
        where: { id: questionId },
        select: {
            id: true,
            examId: true,
            type: true,
            prompt: true,
            points: true,
            order: true,
            // Include all fields a student might need
            options: true,
            starterCode: true,
            languageHints: true,
            wordLimit: true,
            mediaAssetId: true,
            mediaAsset: {
                select: {
                    id: true,
                    url: true,
                    kind: true,
                },
            },
            passageAssetId: true,
            maxDurationSec: true,
            clozeTemplate: true,
            config: true,
            // Explicitly select fields needed for scrubbing
            testcases: true,
            // We do NOT select correctOptionIds or blanks, 
            // as the service layer will handle scrubbing.
            // Or, we can select them and trust the service layer to remove them.
            // Let's select them for now.
            correctOptionIds: true,
            blanks: true
        },
    });
};
exports.getQuestionById = getQuestionById;
const getQuestionForStudent = async (attemptId, questionId, studentId) => {
    // 1. Verify the attempt belongs to the student
    const attempt = await prisma_1.prisma.attempt.findUnique({
        where: { id: attemptId },
        select: { studentId: true, examId: true, status: true },
    });
    if (!attempt) {
        throw { status: 404, message: 'Attempt not found' };
    }
    if (attempt.studentId !== studentId) {
        throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
    }
    // 2. Get the question
    const question = await (0, exports.getQuestionById)(questionId);
    if (!question) {
        throw { status: 404, message: 'Question not found' };
    }
    if (question.examId !== attempt.examId) {
        throw { status: 403, message: 'Question is not part of this exam' };
    }
    // 3. Scrub the question data for students
    const scrubbedQuestion = {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        order: question.order,
        options: question.options,
        starterCode: question.starterCode,
        wordLimit: question.wordLimit,
        // Remove correctOptionIds and blanks
        // For coding questions, only show visible test cases
        testcases: question.type === client_1.QType.CODING && question.testcases
            ? question.testcases.filter((tc) => !tc.isHidden)
            : undefined,
    };
    return scrubbedQuestion;
};
exports.getQuestionForStudent = getQuestionForStudent;
const getAttemptResults = async (studentId, attemptId) => {
    // 1. Fetch all result data from the repository
    const attemptResults = await attemptRepo.getAttemptResults(attemptId);
    // 2. --- Validation Checks ---
    if (!attemptResults) {
        throw { status: 404, message: 'Attempt not found' };
    }
    // 3. --- Security Check ---
    // Ensure the logged-in student is the one who owns this attempt
    if (attemptResults.studentId !== studentId) {
        throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
    }
    // 4. --- Business Logic Check ---
    // Ensure the student can only see results for a submitted exam
    if (attemptResults.status !== client_1.AttemptStatus.SUBMITTED) {
        throw { status: 403, message: 'Forbidden: Results are not available for this attempt yet' };
    }
    // 5. Sort responses by question order for consistent display
    if (attemptResults.responses && Array.isArray(attemptResults.responses)) {
        attemptResults.responses.sort((a, b) => {
            const orderA = a.question?.order ?? 999;
            const orderB = b.question?.order ?? 999;
            return orderA - orderB;
        });
    }
    // 6. Return the full results
    return attemptResults;
};
exports.getAttemptResults = getAttemptResults;
const listAttemptsForExam = async (examId, query) => {
    // Ensure page and pageSize are numbers
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) : (query.page ?? 1);
    const pageSize = typeof query.pageSize === 'string' ? parseInt(query.pageSize, 10) : (query.pageSize ?? 20);
    // 1. Call the repository to get attempts and the total count
    const { attempts, totalCount } = await attemptRepo.listAttemptsForExam({
        examId,
        page,
        pageSize,
    });
    // 2. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    // 3. Return the data and metadata
    return {
        data: attempts,
        meta: {
            page,
            pageSize,
            totalCount,
            totalPages,
        },
    };
};
exports.listAttemptsForExam = listAttemptsForExam;
const getStudentAttempts = async (studentId) => {
    // Get all submitted attempts for this student
    const attempts = await attemptRepo.getStudentAttempts(studentId);
    return attempts;
};
exports.getStudentAttempts = getStudentAttempts;
const getAttemptForAdmin = async (attemptId) => {
    // 1. Fetch all attempt data from the repository
    const attempt = await attemptRepo.getFullAttemptForAdmin(attemptId);
    // 2. --- Validation Check ---
    if (!attempt) {
        throw { status: 404, message: 'Attempt not found' };
    }
    // 3. Sort responses by question order for consistent display
    if (attempt.responses && Array.isArray(attempt.responses)) {
        attempt.responses.sort((a, b) => {
            const orderA = a.question?.order ?? 999;
            const orderB = b.question?.order ?? 999;
            return orderA - orderB;
        });
    }
    // 4. Return the full attempt details
    return attempt;
};
exports.getAttemptForAdmin = getAttemptForAdmin;
const resetAttempts = async (input) => {
    const { examId, studentIds, resetAll } = input;
    // Verify exam exists
    const exam = await prisma_1.prisma.exam.findUnique({
        where: { id: examId },
        select: { id: true, title: true },
    });
    if (!exam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // Build where clause for attempts to delete
    const whereClause = {
        examId: examId,
        status: client_1.AttemptStatus.SUBMITTED, // Only delete submitted attempts
    };
    if (!resetAll && studentIds && studentIds.length > 0) {
        whereClause.studentId = { in: studentIds };
    }
    // Get all attempts to delete
    const attemptsToDelete = await prisma_1.prisma.attempt.findMany({
        where: whereClause,
        select: { id: true },
    });
    const attemptIds = attemptsToDelete.map(a => a.id);
    if (attemptIds.length === 0) {
        return {
            deletedCount: 0,
            message: 'No submitted attempts found to reset',
        };
    }
    // Get all response IDs for these attempts
    const responsesToDelete = await prisma_1.prisma.response.findMany({
        where: {
            attemptId: { in: attemptIds },
        },
        select: { id: true },
    });
    const responseIds = responsesToDelete.map(r => r.id);
    // Delete related records in correct order (respecting foreign key constraints)
    if (responseIds.length > 0) {
        // 1. Delete GradingJobs (references Response)
        await prisma_1.prisma.gradingJob.deleteMany({
            where: {
                responseId: { in: responseIds },
            },
        });
        // 2. Delete Evaluations (references Response)
        await prisma_1.prisma.evaluation.deleteMany({
            where: {
                responseId: { in: responseIds },
            },
        });
        // 3. Delete ResponseArtifacts (references Response)
        await prisma_1.prisma.responseArtifact.deleteMany({
            where: {
                responseId: { in: responseIds },
            },
        });
        // 4. Delete Responses
        await prisma_1.prisma.response.deleteMany({
            where: {
                attemptId: { in: attemptIds },
            },
        });
    }
    // 5. Delete section progress
    await prisma_1.prisma.attemptSection.deleteMany({
        where: {
            attemptId: { in: attemptIds },
        },
    });
    // 6. Delete attempts
    const result = await prisma_1.prisma.attempt.deleteMany({
        where: whereClause,
    });
    return {
        deletedCount: result.count,
        message: `Successfully reset ${result.count} attempt(s)`,
    };
};
exports.resetAttempts = resetAttempts;
const runCode = async (studentId, attemptId, questionId, code, language, customInput, runAllTests) => {
    // 1. Verify attempt
    const attempt = await prisma_1.prisma.attempt.findUnique({
        where: { id: attemptId },
        select: { studentId: true, examId: true, status: true },
    });
    if (!attempt) {
        throw { status: 404, message: 'Attempt not found' };
    }
    if (attempt.studentId !== studentId) {
        throw { status: 403, message: 'Forbidden' };
    }
    // 2. Get question
    const question = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
        select: { id: true, type: true, testcases: true },
    });
    if (!question) {
        throw { status: 404, message: 'Question not found' };
    }
    if (question.type !== client_1.QType.CODING) {
        throw { status: 400, message: 'Not a coding question' };
    }
    // 3. Execute code
    if (customInput) {
        // Run with custom input
        const result = await (0, local_executor_1.executeCodeLocally)(code, language, customInput);
        return {
            passed: result.status.id === 3 ? 1 : 0,
            total: 1,
            testResults: [{
                    input: customInput,
                    expectedOutput: '(Custom Input)',
                    actualOutput: result.stdout,
                    passed: result.status.id === 3,
                    status: result.status.description,
                    error: result.stderr || result.error
                }],
            message: result.stderr ? 'Execution Error' : 'Execution Successful'
        };
    }
    else {
        // Run with test cases
        const testCases = question.testcases || [];
        // If runAllTests is true (submit mode), run all. Otherwise only visible ones.
        const testsToRun = runAllTests ? testCases : testCases.filter(tc => !tc.isHidden);
        const results = await (0, local_executor_1.testCodeWithTestCasesLocally)(code, language, testsToRun);
        return {
            passed: results.passed,
            total: results.total,
            testResults: results.results,
            message: results.passed === results.total ? 'All tests passed' : `${results.passed}/${results.total} tests passed`
        };
    }
};
exports.runCode = runCode;
//# sourceMappingURL=attempt.service.js.map