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
exports.bulkAwardPointsForExam = exports.awardPointsForExam = exports.getPointsHistory = exports.addPoints = exports.getUserPoints = void 0;
const pointsRepo = __importStar(require("./points.repo"));
const getUserPoints = async (userId) => {
    return await pointsRepo.getUserPoints(userId);
};
exports.getUserPoints = getUserPoints;
const addPoints = async (userId, points, description, relatedId, relatedType) => {
    return await pointsRepo.addPoints(userId, points, description, relatedId, relatedType);
};
exports.addPoints = addPoints;
const getPointsHistory = async (userId, page = 1, limit = 20, type) => {
    return await pointsRepo.getPointsHistory(userId, page, limit, type);
};
exports.getPointsHistory = getPointsHistory;
// Award points based on exam performance
// Checks if points were already awarded and if it's a retake (attemptNo > 1)
const awardPointsForExam = async (userId, attemptId, score, maxScore, attemptNo) => {
    if (maxScore === 0)
        return 0;
    // Don't award points for retakes (attemptNo > 1)
    if (attemptNo && attemptNo > 1) {
        return 0;
    }
    // Check if points were already awarded for this attempt
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../lib/prisma')));
    const existingPoints = await prisma.pointsHistory.findFirst({
        where: {
            userId: userId,
            relatedId: attemptId,
            relatedType: 'ATTEMPT',
        },
    });
    if (existingPoints) {
        // Points already awarded, return existing amount
        return existingPoints.points;
    }
    const percentage = (score / maxScore) * 100;
    // Award points based on performance:
    // 90-100%: 100 points
    // 80-89%: 75 points
    // 70-79%: 50 points
    // 60-69%: 25 points
    // Below 60%: 10 points (participation)
    let pointsAwarded = 0;
    if (percentage >= 90) {
        pointsAwarded = 100;
    }
    else if (percentage >= 80) {
        pointsAwarded = 75;
    }
    else if (percentage >= 70) {
        pointsAwarded = 50;
    }
    else if (percentage >= 60) {
        pointsAwarded = 25;
    }
    else {
        pointsAwarded = 10;
    }
    await pointsRepo.addPoints(userId, pointsAwarded, `Exam performance: ${percentage.toFixed(1)}%`, attemptId, 'ATTEMPT');
    return pointsAwarded;
};
exports.awardPointsForExam = awardPointsForExam;
// Bulk award points for multiple attempts
const bulkAwardPointsForExam = async (examId) => {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../lib/prisma')));
    // Get all submitted attempts for this exam (only latest attempt per student)
    const latestAttempts = await prisma.attempt.groupBy({
        by: ['studentId'],
        where: {
            examId: examId,
            status: 'SUBMITTED',
        },
        _max: {
            attemptNo: true,
        },
    });
    if (latestAttempts.length === 0) {
        return { awarded: 0, skipped: 0, errors: 0 };
    }
    // Fetch full attempt details
    const attempts = await prisma.attempt.findMany({
        where: {
            examId: examId,
            OR: latestAttempts.map(la => ({
                studentId: la.studentId,
                attemptNo: la._max.attemptNo || 1,
            })),
            status: 'SUBMITTED',
        },
        select: {
            id: true,
            studentId: true,
            score: true,
            maxScore: true,
            attemptNo: true,
        },
    });
    let awarded = 0;
    let skipped = 0;
    let errors = 0;
    for (const attempt of attempts) {
        try {
            // Check if points already awarded
            const existingPoints = await prisma.pointsHistory.findFirst({
                where: {
                    userId: attempt.studentId,
                    relatedId: attempt.id,
                    relatedType: 'ATTEMPT',
                },
            });
            if (existingPoints) {
                skipped++;
                continue;
            }
            // Don't award for retakes
            if (attempt.attemptNo > 1) {
                skipped++;
                continue;
            }
            // Award points
            await (0, exports.awardPointsForExam)(attempt.studentId, attempt.id, Number(attempt.score || 0), Number(attempt.maxScore || 0), attempt.attemptNo);
            awarded++;
        }
        catch (error) {
            console.error(`Error awarding points for attempt ${attempt.id}:`, error);
            errors++;
        }
    }
    return { awarded, skipped, errors };
};
exports.bulkAwardPointsForExam = bulkAwardPointsForExam;
//# sourceMappingURL=points.service.js.map