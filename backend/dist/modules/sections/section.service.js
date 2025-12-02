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
exports.listSectionsForExam = exports.removeQuestionFromSection = exports.deleteSection = exports.updateSection = exports.addQuestionsToSection = exports.createSection = void 0;
const sectionRepo = __importStar(require("./section.repo"));
// We need to import the exam repo to check if the exam exists
const examRepo = __importStar(require("../exams/exam.repo"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const createSection = async (examId, input) => {
    // 1. --- Validation ---
    // Check if the parent exam exists first
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // 2. --- Prepare Data ---
    // Convert optional undefined fields to null for Prisma
    const dataToSave = {
        ...input,
        description: input.description ?? null,
        durationMins: input.durationMins ?? null,
    };
    // 3. --- Call Repository ---
    const newSection = await sectionRepo.createSection(examId, dataToSave);
    return newSection;
};
exports.createSection = createSection;
const addQuestionsToSection = async (sectionId, questions) => {
    // 1. --- Validation: Check if the section exists ---
    const section = await prisma_1.prisma.examSection.findUnique({
        where: { id: sectionId },
        select: { examId: true }, // Get the parent examId
    });
    if (!section) {
        throw { status: 404, message: 'Section not found' };
    }
    // 2. --- Validation: Check if all questions exist and belong to the same exam ---
    const questionIds = questions.map((q) => q.questionId);
    const questionsFromDb = await prisma_1.prisma.question.findMany({
        where: {
            id: { in: questionIds },
            examId: section.examId, // CRITICAL: Ensure all questions are from the same exam
        },
        select: { id: true },
    });
    if (questionsFromDb.length !== questionIds.length) {
        throw {
            status: 400,
            message: 'One or more questions do not exist or do not belong to this exam',
        };
    }
    // 3. --- Prepare Data for Repository ---
    const dataToSave = questions.map((q) => ({
        questionId: q.questionId,
        order: q.order,
        sectionId: sectionId, // This will be set by the repo, but good practice
    }));
    // 4. --- Call Repository ---
    await sectionRepo.addQuestionsToSection(sectionId, dataToSave);
    return { message: 'Questions added to section successfully' };
};
exports.addQuestionsToSection = addQuestionsToSection;
const updateSection = async (sectionId, input) => {
    // 1. --- Validation: Check if the section exists ---
    // We can use prisma directly for this simple check
    const existingSection = await prisma_1.prisma.examSection.findUnique({
        where: { id: sectionId },
        select: { id: true },
    });
    if (!existingSection) {
        throw { status: 404, message: 'Section not found' };
    }
    // 2. --- Prepare Data for Repository ---
    // Manually build the update object to satisfy exactOptionalPropertyTypes
    // and handle converting undefined to null for optional fields.
    const dataToUpdate = {};
    if (input.title !== undefined) {
        dataToUpdate.title = input.title;
    }
    if (input.order !== undefined) {
        dataToUpdate.order = input.order;
    }
    if (input.description !== undefined) {
        dataToUpdate.description = input.description ?? null;
    }
    if (input.durationMins !== undefined) {
        dataToUpdate.durationMins = input.durationMins ?? null;
    }
    // 3. --- Call Repository ---
    const updatedSection = await sectionRepo.updateSection(sectionId, dataToUpdate);
    return updatedSection;
};
exports.updateSection = updateSection;
const deleteSection = async (sectionId) => {
    // 1. --- Validation: Check if the section exists ---
    const existingSection = await prisma_1.prisma.examSection.findUnique({
        where: { id: sectionId },
        include: {
            _count: {
                select: { attempts: true }, // Count how many AttemptSection records exist
            },
        },
    });
    if (!existingSection) {
        throw { status: 404, message: 'Section not found' };
    }
    // 2. --- Business Logic: Prevent deleting a section with student progress ---
    if (existingSection._count.attempts > 0) {
        throw {
            status: 400,
            message: 'Cannot delete a section that students have already started. Please delete the parent exam instead if no attempts exist.',
        };
    }
    // 3. --- Call Repository (if safe) ---
    await sectionRepo.deleteSection(sectionId);
    return { message: 'Section and all related question links deleted successfully' };
};
exports.deleteSection = deleteSection;
const removeQuestionFromSection = async (sectionId, questionId) => {
    try {
        // Call the repository to delete the link
        await sectionRepo.removeQuestionFromSection(sectionId, questionId);
        return { message: 'Question removed from section successfully' };
    }
    catch (error) {
        // Handle cases where the link doesn't exist (P2025: Record not found)
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025') {
            throw { status: 404, message: 'Link between section and question not found' };
        }
        // Re-throw other errors
        throw error;
    }
};
exports.removeQuestionFromSection = removeQuestionFromSection;
const listSectionsForExam = async (examId) => {
    // Check if exam exists
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
        throw { status: 404, message: 'Exam not found' };
    }
    // Fetch all sections for this exam with their questions
    const sections = await prisma_1.prisma.examSection.findMany({
        where: { examId },
        include: {
            sectionQuestions: {
                include: {
                    question: {
                        select: {
                            id: true,
                            type: true,
                            prompt: true,
                            points: true,
                            order: true,
                        },
                    },
                },
                orderBy: {
                    order: 'asc',
                },
            },
        },
        orderBy: {
            order: 'asc',
        },
    });
    return sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
        durationMins: section.durationMins,
        questions: section.sectionQuestions.map((sq) => ({
            questionId: sq.questionId,
            order: sq.order,
            question: sq.question,
        })),
    }));
};
exports.listSectionsForExam = listSectionsForExam;
//# sourceMappingURL=section.service.js.map