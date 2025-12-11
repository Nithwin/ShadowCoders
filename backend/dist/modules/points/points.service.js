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
exports.awardPointsForExam = exports.getPointsHistory = exports.addPoints = exports.getUserPoints = void 0;
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
const awardPointsForExam = async (userId, attemptId, score, maxScore) => {
    if (maxScore === 0)
        return 0;
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
//# sourceMappingURL=points.service.js.map