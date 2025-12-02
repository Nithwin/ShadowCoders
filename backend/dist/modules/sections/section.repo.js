"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeQuestionFromSection = exports.deleteSection = exports.updateSection = exports.addQuestionsToSection = exports.createSection = void 0;
const prisma_1 = require("../../lib/prisma");
/**
 * Creates a new exam section linked to a specific exam.
 */
const createSection = (examId, data // We omit 'exam' because we connect it manually
) => {
    return prisma_1.prisma.examSection.create({
        data: {
            ...data,
            exam: {
                connect: { id: examId }, // Link this section to the parent exam
            },
        },
        select: {
            id: true,
            title: true,
            order: true,
            description: true,
            durationMins: true,
        },
    });
};
exports.createSection = createSection;
const addQuestionsToSection = (sectionId, questionsData) => {
    // Use createMany for efficient bulk insertion
    return prisma_1.prisma.sectionQuestion.createMany({
        data: questionsData.map((q) => ({
            ...q,
            sectionId: sectionId, // Ensure the sectionId is correctly set
        })),
        skipDuplicates: true, // In case a link already exists
    });
};
exports.addQuestionsToSection = addQuestionsToSection;
const updateSection = (sectionId, data) => {
    return prisma_1.prisma.examSection.update({
        where: { id: sectionId },
        data: data,
        select: {
            id: true,
            title: true,
            order: true,
            description: true,
            durationMins: true,
        },
    });
};
exports.updateSection = updateSection;
const deleteSection = (sectionId) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        // 1. Delete all links from questions to this section
        await tx.sectionQuestion.deleteMany({
            where: { sectionId: sectionId },
        });
        // 2. Delete all student attempt progress for this section
        await tx.attemptSection.deleteMany({
            where: { sectionId: sectionId },
        });
        // 3. Finally, delete the section itself
        const deletedSection = await tx.examSection.delete({
            where: { id: sectionId },
        });
        return deletedSection;
    });
};
exports.deleteSection = deleteSection;
const removeQuestionFromSection = (sectionId, questionId) => {
    return prisma_1.prisma.sectionQuestion.delete({
        where: {
            sectionId_questionId: {
                sectionId: sectionId,
                questionId: questionId,
            },
        },
    });
};
exports.removeQuestionFromSection = removeQuestionFromSection;
//# sourceMappingURL=section.repo.js.map