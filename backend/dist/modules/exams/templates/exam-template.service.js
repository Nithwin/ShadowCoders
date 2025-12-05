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
exports.getTemplateById = exports.deleteTemplate = exports.listTemplates = exports.createExamFromTemplate = exports.createTemplateFromExam = void 0;
const templateRepo = __importStar(require("./exam-template.repo"));
const examRepo = __importStar(require("../exam.repo"));
const sectionRepo = __importStar(require("../../sections/section.repo"));
const prisma_1 = require("../../../lib/prisma");
const createTemplateFromExam = async (examId, userId, metadata) => {
    // 1. Fetch full exam details
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
        throw { status: 404, message: "Exam not found" };
    }
    // 2. Extract structure (sections, questions, settings)
    // Helper to sanitize data for JSON storage (handle Decimals, Dates, etc)
    const sanitize = (obj) => {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj === 'function')
            return undefined;
        if (typeof obj !== 'object')
            return obj;
        // Handle Date
        if (obj instanceof Date)
            return obj.toISOString();
        // Handle Decimal (Prisma)
        if (typeof obj.toNumber === 'function')
            return obj.toNumber();
        if (typeof obj.toString === 'function' && obj.constructor.name === 'Decimal')
            return obj.toString();
        // Handle Array
        if (Array.isArray(obj))
            return obj.map(sanitize);
        // Handle Object
        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = sanitize(obj[key]);
                if (value !== undefined) {
                    result[key] = value;
                }
            }
        }
        return result;
    };
    const structure = sanitize({
        durationMins: exam.durationMins,
        timingMode: exam.timingMode,
        sectionLockPolicy: exam.sectionLockPolicy,
        randomizeQuestions: exam.randomizeQuestions,
        negativeMarkPerWrong: exam.negativeMarkPerWrong,
        maxAttempts: exam.maxAttempts,
        maxTabSwitches: exam.maxTabSwitches,
        allowedLanguages: exam.allowedLanguages,
        sections: exam.sections.map((section) => ({
            title: section.title,
            order: section.order,
            description: section.description,
            durationMins: section.durationMins,
            questions: section.sectionQuestions.map((sq) => ({
                ...sq.question,
                order: sq.order, // Use order from section link
            })),
        })),
    });
    console.log("Creating template with structure:", JSON.stringify(structure, null, 2));
    // 3. Create template
    try {
        return await templateRepo.createTemplate({
            title: metadata.title,
            description: metadata.description || null,
            isPublic: metadata.isPublic,
            structure: structure,
            creator: { connect: { id: userId } },
        });
    }
    catch (error) {
        console.error("Error in templateRepo.createTemplate:", error);
        throw error;
    }
};
exports.createTemplateFromExam = createTemplateFromExam;
const createExamFromTemplate = async (templateId, userId, examData) => {
    // 1. Fetch template
    const template = await templateRepo.findTemplateById(templateId);
    if (!template) {
        throw { status: 404, message: "Template not found" };
    }
    const structure = template.structure;
    // 2. Create new exam with template settings
    const newExam = await examRepo.createExam({
        title: examData.title,
        description: template.description, // Inherit description
        startAt: examData.startAt,
        endAt: examData.endAt,
        durationMins: structure.durationMins,
        timingMode: structure.timingMode,
        sectionLockPolicy: structure.sectionLockPolicy,
        randomizeQuestions: structure.randomizeQuestions,
        negativeMarkPerWrong: structure.negativeMarkPerWrong,
        maxAttempts: structure.maxAttempts ?? 1, // Default to 1 if not present
        maxTabSwitches: structure.maxTabSwitches ?? 1, // Default to 1 if not present
        allowedLanguages: structure.allowedLanguages,
        status: "DRAFT",
    });
    // 3. Recreate sections and questions
    // Note: We need to clone questions because they are unique entities
    for (const sectionData of structure.sections) {
        const newSection = await sectionRepo.createSection(newExam.id, {
            title: sectionData.title,
            order: sectionData.order,
            description: sectionData.description,
            durationMins: sectionData.durationMins,
        });
        for (const questionData of sectionData.questions) {
            // Create a copy of the question
            const { id, examId, createdAt, updatedAt, ...questionProps } = questionData;
            // Create question directly (bypassing service to avoid overhead)
            const newQuestion = await prisma_1.prisma.question.create({
                data: {
                    ...questionProps,
                    examId: newExam.id,
                    order: questionData.order, // Use preserved order
                },
            });
            // Link to section
            await prisma_1.prisma.sectionQuestion.create({
                data: {
                    sectionId: newSection.id,
                    questionId: newQuestion.id,
                    order: questionData.order,
                },
            });
        }
    }
    return newExam;
};
exports.createExamFromTemplate = createExamFromTemplate;
const listTemplates = async (userId, query) => {
    return templateRepo.listTemplates({
        userId,
        isPublic: query.isPublic === 'true',
        searchQuery: query.q,
        page: Number(query.page) || 1,
        pageSize: Number(query.pageSize) || 10,
    });
};
exports.listTemplates = listTemplates;
const deleteTemplate = async (templateId, userId) => {
    const template = await templateRepo.findTemplateById(templateId);
    if (!template) {
        throw { status: 404, message: "Template not found" };
    }
    if (template.createdBy !== userId) {
        throw { status: 403, message: "You can only delete your own templates" };
    }
    return templateRepo.deleteTemplate(templateId);
};
exports.deleteTemplate = deleteTemplate;
const getTemplateById = async (templateId) => {
    const template = await templateRepo.findTemplateById(templateId);
    if (!template) {
        throw { status: 404, message: "Template not found" };
    }
    return template;
};
exports.getTemplateById = getTemplateById;
//# sourceMappingURL=exam-template.service.js.map