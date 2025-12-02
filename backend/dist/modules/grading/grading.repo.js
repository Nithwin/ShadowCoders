"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGradingJob = exports.createGradingJob = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
/**
 * Creates a new grading job in the database.
 */
const createGradingJob = (data) => {
    return prisma_1.prisma.gradingJob.create({
        data,
        select: {
            id: true,
            status: true,
        },
    });
};
exports.createGradingJob = createGradingJob;
/**
 * Updates a grading job with the result from the code judge.
 */
const updateGradingJob = (jobId, status, result // <-- This allows null
) => {
    return prisma_1.prisma.gradingJob.update({
        where: { id: jobId },
        data: {
            status: status,
            // FIX: Check for null and convert to Prisma.JsonNull
            result: result === null ? client_1.Prisma.JsonNull : result,
        },
        select: {
            id: true,
            status: true,
            result: true,
        },
    });
};
exports.updateGradingJob = updateGradingJob;
//# sourceMappingURL=grading.repo.js.map