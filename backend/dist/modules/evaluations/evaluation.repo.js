"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvaluation = void 0;
const prisma_1 = require("../../lib/prisma");
/**
 * Creates a new evaluation record for a specific response.
 */
const createEvaluation = (responseId, assessorId, // The ID of the STAFF user doing the grading
data) => {
    return prisma_1.prisma.evaluation.create({
        data: {
            ...data,
            // Connect this evaluation to the response and the assessor (grader)
            response: {
                connect: { id: responseId },
            },
            assessor: {
                connect: { id: assessorId },
            },
            // Note: Connecting a rubric would follow the same pattern if rubricId is provided in 'data'
        },
        select: {
            id: true,
            kind: true,
            score: true,
            comments: true,
            isFinal: true,
        },
    });
};
exports.createEvaluation = createEvaluation;
//# sourceMappingURL=evaluation.repo.js.map