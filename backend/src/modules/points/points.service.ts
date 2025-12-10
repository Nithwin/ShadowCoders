import * as pointsRepo from './points.repo';

export const getUserPoints = async (userId: string) => {
  return await pointsRepo.getUserPoints(userId);
};

export const addPoints = async (userId: string, points: number, description?: string, relatedId?: string, relatedType?: string) => {
  return await pointsRepo.addPoints(userId, points, description, relatedId, relatedType);
};

export const getPointsHistory = async (userId: string, page: number = 1, limit: number = 20, type?: string) => {
  return await pointsRepo.getPointsHistory(userId, page, limit, type);
};

// Award points based on exam performance
export const awardPointsForExam = async (userId: string, attemptId: string, score: number, maxScore: number) => {
  if (maxScore === 0) return 0;
  
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
  } else if (percentage >= 80) {
    pointsAwarded = 75;
  } else if (percentage >= 70) {
    pointsAwarded = 50;
  } else if (percentage >= 60) {
    pointsAwarded = 25;
  } else {
    pointsAwarded = 10;
  }
  
  await pointsRepo.addPoints(
    userId,
    pointsAwarded,
    `Exam performance: ${percentage.toFixed(1)}%`,
    attemptId,
    'ATTEMPT'
  );
  
  return pointsAwarded;
};

