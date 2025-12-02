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
exports.getExamByIdForStudent = exports.getExamById = exports.ensureDefaultSections = exports.deleteExam = exports.updateExam = exports.listExamsForStudent = exports.listExams = exports.pubishExam = exports.assignExam = exports.createExam = void 0;
const examRepo = __importStar(require("./exam.repo"));
const client_1 = require("@prisma/client");
const userRepo = __importStar(require("../auth/auth.repo"));
const prisma_1 = require("../../lib/prisma");
const sectionRepo = __importStar(require("../sections/section.repo"));
/**
 * Creates default sections for an exam: Coding, MCQ, and Essay
 */
const createDefaultSections = async (examId) => {
    const defaultSections = [
        { title: 'Multiple Choice', order: 1, description: 'Answer multiple choice questions' },
        { title: 'Coding', order: 2, description: 'Solve coding problems' },
        { title: 'Essay', order: 3, description: 'Write essay responses' },
    ];
    for (const section of defaultSections) {
        await sectionRepo.createSection(examId, {
            title: section.title,
            order: section.order,
            description: section.description,
            durationMins: null,
        });
    }
};
const createExam = async (input) => {
    if (new Date(input.startAt) >= new Date(input.endAt)) {
        throw {
            status: 400,
            message: "Exam start date must be before the end date",
        };
    }
    const dataToSave = {
        ...input,
        description: input.description ?? null,
        negativeMarkPerWrong: input.negativeMarkPerWrong ?? null,
        maxAttempts: input.maxAttempts ?? null, // null means unlimited
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        timingMode: input.timingMode,
        sectionLockPolicy: input.sectionLockPolicy,
        randomizeQuestions: input.randomizeQuestions ?? false,
        allowedLanguages: input.allowedLanguages ? input.allowedLanguages : client_1.Prisma.JsonNull,
    };
    const newExam = await examRepo.createExam(dataToSave);
    // Create default sections automatically
    await createDefaultSections(newExam.id);
    return newExam;
};
exports.createExam = createExam;
const assignExam = async (examId, input) => {
    const dataToSave = {
        assignToAll: input.assignToAll ?? false,
        cohortYear: input.cohortYear ?? null,
        cohortDepartment: input.cohortDepartment ?? null,
        cohortSection: input.cohortSection ?? null,
        studentIds: input.studentIds
            ? input.studentIds
            : client_1.Prisma.JsonNull,
    };
    const assignment = await examRepo.createExamAssignment(examId, dataToSave);
    return assignment;
};
exports.assignExam = assignExam;
const pubishExam = async (examId) => {
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
        throw {
            status: 404,
            message: "Exam not found",
        };
    }
    if (exam.status !== client_1.ExamStatus.DRAFT) {
        throw {
            status: 400,
            message: `Exam cannot be published. Current status: ${exam.status}`,
        };
    }
    const updatedExam = await examRepo.updateExamStatus(examId, client_1.ExamStatus.PUBLISHED);
    return updatedExam;
};
exports.pubishExam = pubishExam;
const listExams = async (query) => {
    const { page, pageSize, status, q } = query;
    const repoParams = {
        page,
        pageSize,
    };
    if (status && status !== 'ALL') {
        repoParams.status = status;
    }
    if (q) {
        repoParams.searchQuery = q;
    }
    const { exams, totalCount } = await examRepo.listExams(repoParams);
    const processedExams = exams.map(exam => ({
        ...exam,
        negativeMarkPerWrong: exam.negativeMarkPerWrong?.toString() ?? null,
    }));
    const totalPages = Math.ceil(totalCount / pageSize);
    return {
        data: processedExams,
        meta: {
            page,
            pageSize,
            totalCount,
            totalPages,
        }
    };
};
exports.listExams = listExams;
const listExamsForStudent = async (studentId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const { filter, q } = query;
    // 1. Fetch the student's details (needed for cohort matching)
    const student = await userRepo.findStudentWithCohortInfo(studentId);
    if (!student) {
        throw { status: 404, message: 'Student not found' };
    }
    // 2. Call the repository to get exams and the total count
    const { exams, totalCount } = await examRepo.listExamsForStudent({
        student: {
            id: student.id,
            year: student.year,
            department: student.department,
            section: student.section,
        },
        ...(filter && { filter }),
        ...(q && { searchQuery: q }),
        page,
        pageSize,
    });
    // 3. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    // 4. Transform exams to include attempt status and filter LIVE exams
    let examsToReturn = exams;
    // For LIVE filter, filter out exams where student has reached max attempts
    if (filter === "LIVE") {
        examsToReturn = exams.filter((exam) => {
            const submittedAttempts = exam.attempts?.filter(a => a.status === 'SUBMITTED') || [];
            const submittedCount = submittedAttempts.length;
            // If maxAttempts is null/undefined, unlimited attempts allowed - always show
            if (exam.maxAttempts === null || exam.maxAttempts === undefined) {
                return true;
            }
            // If maxAttempts is set, only show if student hasn't reached the limit
            return submittedCount < exam.maxAttempts;
        });
    }
    const examsWithAttemptStatus = examsToReturn.map((exam) => {
        // Check if student has any submitted attempts
        const submittedAttempts = exam.attempts?.filter(a => a.status === 'SUBMITTED') || [];
        const hasCompletedAttempt = submittedAttempts.length > 0;
        const latestAttempt = exam.attempts && exam.attempts.length > 0 ? exam.attempts[0] : null;
        // Remove attempts from response (we only needed it for checking)
        const { attempts, ...examData } = exam;
        return {
            ...examData,
            hasAttempt: hasCompletedAttempt,
            attemptId: latestAttempt?.id || null,
            attemptStatus: latestAttempt?.status || null,
            attemptCount: exam.attempts?.length || 0,
            submittedAttemptCount: submittedAttempts.length,
            latestScore: latestAttempt?.score ? Number(latestAttempt.score) : null,
            latestMaxScore: latestAttempt?.maxScore ? Number(latestAttempt.maxScore) : null,
        };
    });
    // 5. Adjust totalCount for LIVE filter (since we filter in service layer)
    // For LIVE, the actual count is the filtered exams count
    // But we need to recalculate totalPages based on the actual filtered count
    // Since we're doing pagination at DB level, we'll use the original totalCount
    // but note that for LIVE, the actual visible count might be less
    const adjustedTotalCount = filter === "LIVE"
        ? examsWithAttemptStatus.length // For LIVE, use filtered count (approximate)
        : totalCount;
    // 6. Return the data and metadata
    return {
        data: examsWithAttemptStatus,
        meta: {
            page,
            pageSize,
            totalCount: adjustedTotalCount,
            totalPages: Math.ceil(adjustedTotalCount / pageSize),
        },
    };
};
exports.listExamsForStudent = listExamsForStudent;
const updateExam = async (examId, input) => {
    // 1. --- Validation ---
    const existingExam = await examRepo.findExamById(examId);
    if (!existingExam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // 2. --- Prepare Data for Repository ---
    // Manually build the update object to satisfy exactOptionalPropertyTypes
    const dataToUpdate = {};
    if (input.title !== undefined) {
        dataToUpdate.title = input.title;
    }
    if (input.description !== undefined) {
        dataToUpdate.description = input.description ?? null;
    }
    if (input.startAt !== undefined) {
        dataToUpdate.startAt = new Date(input.startAt);
    }
    if (input.endAt !== undefined) {
        dataToUpdate.endAt = new Date(input.endAt);
    }
    if (input.durationMins !== undefined) {
        dataToUpdate.durationMins = input.durationMins;
    }
    if (input.timingMode !== undefined) {
        dataToUpdate.timingMode = input.timingMode;
    }
    if (input.sectionLockPolicy !== undefined) {
        dataToUpdate.sectionLockPolicy = input.sectionLockPolicy;
    }
    if (input.randomizeQuestions !== undefined) {
        dataToUpdate.randomizeQuestions = input.randomizeQuestions;
    }
    if (input.negativeMarkPerWrong !== undefined) {
        dataToUpdate.negativeMarkPerWrong = input.negativeMarkPerWrong ?? null;
    }
    if (input.maxAttempts !== undefined) {
        dataToUpdate.maxAttempts = input.maxAttempts ?? null; // null means unlimited
    }
    if (input.allowedLanguages !== undefined) {
        dataToUpdate.allowedLanguages = input.allowedLanguages ? input.allowedLanguages : client_1.Prisma.JsonNull;
    }
    // 3. --- Call Repository ---
    // Note: We allow editing even if the exam is published
    // Admin should be aware that changes might affect active attempts
    const updatedExam = await examRepo.updateExam(examId, dataToUpdate);
    return updatedExam;
};
exports.updateExam = updateExam;
const deleteExam = async (examId, force = false) => {
    // 1. --- Validation: Check if the exam exists ---
    const existingExam = await prisma_1.prisma.exam.findUnique({
        where: { id: examId },
        include: {
            _count: {
                select: { attempts: true, questions: true }, // Count attempts and questions
            },
        },
    });
    if (!existingExam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // 2. --- Business Logic: Allow deletion even with attempts if force is true ---
    // If force is false and there are attempts, warn but don't block
    // The frontend should show a warning, but backend allows it
    if (!force && existingExam._count.attempts > 0) {
        // Just log a warning, but allow deletion
        console.warn(`⚠️ Deleting exam ${examId} with ${existingExam._count.attempts} attempts. This will delete all attempts and results.`);
    }
    // 3. --- Call Repository to delete exam and all related data ---
    // This will cascade delete attempts, responses, questions, etc.
    await examRepo.deleteExamAndChildren(examId);
    return {
        message: `Exam and all related data deleted successfully. ${existingExam._count.attempts} attempts were deleted.`,
        deletedAttempts: existingExam._count.attempts,
    };
};
exports.deleteExam = deleteExam;
/**
 * Ensures default sections exist for an exam (creates them if missing)
 */
const ensureDefaultSections = async (examId) => {
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // Check if sections already exist
    const existingSections = await prisma_1.prisma.examSection.findMany({
        where: { examId },
        select: { title: true },
    });
    const existingTitles = new Set(existingSections.map(s => s.title));
    const defaultSections = [
        { title: 'Multiple Choice', order: 1, description: 'Answer multiple choice questions' },
        { title: 'Coding', order: 2, description: 'Solve coding problems' },
        { title: 'Essay', order: 3, description: 'Write essay responses' },
    ];
    // Create missing sections
    for (const section of defaultSections) {
        if (!existingTitles.has(section.title)) {
            await sectionRepo.createSection(examId, {
                title: section.title,
                order: section.order,
                description: section.description,
                durationMins: null,
            });
        }
    }
};
exports.ensureDefaultSections = ensureDefaultSections;
/**
 * Fetches a single exam's details for editing.
 * Ensures default sections exist before returning.
 */
const getExamById = async (examId) => {
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // Ensure default sections exist
    await (0, exports.ensureDefaultSections)(examId);
    // Fetch again to get the sections
    return await examRepo.findExamById(examId);
};
exports.getExamById = getExamById;
/**
 * Fetches a single exam's details for a student.
 * Checks if the student has access to the exam (assigned and published).
 */
const getExamByIdForStudent = async (studentId, examId) => {
    // 1. Fetch the student's details (needed for cohort matching)
    const student = await userRepo.findStudentWithCohortInfo(studentId);
    if (!student) {
        throw { status: 404, message: 'Student not found' };
    }
    // 2. Fetch the exam using the same logic as listExamsForStudent
    const exam = await examRepo.findExamByIdForStudent({
        examId,
        student: {
            id: student.id,
            year: student.year,
            department: student.department,
            section: student.section,
        },
    });
    if (!exam) {
        throw { status: 404, message: 'Exam not found or not accessible' };
    }
    // 3. Return only the fields students need (no sensitive admin data)
    // The repo already includes hasAttempt and attemptId
    return exam;
};
exports.getExamByIdForStudent = getExamByIdForStudent;
//# sourceMappingURL=exam.service.js.map