"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createManualEvaluation = void 0;
// We don't need evaluationRepo, so the import is removed.
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
const createManualEvaluation = async (responseId, assessorId, // The ID of the STAFF user
input) => {
    // 1. --- Validation ---
    const response = await prisma_1.prisma.response.findUnique({
        where: { id: responseId },
        select: { attemptId: true },
    });
    if (!response) {
        throw { status: 404, message: 'Response not found' };
    }
    // 2. --- Prepare Data ---
    const dataForRepo = {
        kind: client_1.EvaluationKind.MANUAL,
        score: input.score,
        comments: input.comments ?? null,
        breakdown: input.breakdown ? input.breakdown : client_1.Prisma.JsonNull,
        isFinal: input.isFinal,
        assessor: { connect: { id: assessorId } },
    };
    // 3. --- Run as a Transaction ---
    try {
        const transactionResult = await prisma_1.prisma.$transaction(async (tx) => {
            // Step A: Create the new Evaluation
            const newEvaluation = await tx.evaluation.create({
                data: {
                    ...dataForRepo,
                    response: { connect: { id: responseId } },
                },
            });
            // Step B: If this grade is final, update the parent Response
            if (newEvaluation.isFinal) {
                await tx.response.update({
                    where: { id: responseId },
                    data: {
                        earnedPoints: newEvaluation.score,
                        feedback: newEvaluation.comments,
                        gradingMode: 'MANUAL',
                        // FIX: Convert newEvaluation.score to a number before comparing
                        verdict: newEvaluation.score && newEvaluation.score.toNumber() > 0 ? 'PASS' : 'FAIL',
                    },
                });
                // Step C: Recalculate the total score for the entire Attempt
                const attemptId = response.attemptId;
                const scoreAggregation = await tx.response.aggregate({
                    _sum: { earnedPoints: true },
                    where: { attemptId: attemptId },
                });
                // Convert Decimal sum to number, default to 0
                const totalScore = scoreAggregation._sum.earnedPoints?.toNumber() ?? 0;
                await tx.attempt.update({
                    where: { id: attemptId },
                    data: { score: totalScore },
                });
            }
            return newEvaluation;
        });
        return transactionResult;
    }
    catch (error) {
        // Transaction failed while creating evaluation; let the caller handle this error
        throw { status: 500, message: 'Failed to save evaluation' };
    }
};
exports.createManualEvaluation = createManualEvaluation;
//# sourceMappingURL=evaluation.service.js.map