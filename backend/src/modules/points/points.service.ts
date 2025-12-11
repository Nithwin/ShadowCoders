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
// Checks if points were already awarded and if it's a retake (attemptNo > 1)
export const awardPointsForExam = async (userId: string, attemptId: string, score: number, maxScore: number, attemptNo?: number) => {
  if (maxScore === 0) return 0;
  
  // Don't award points for retakes (attemptNo > 1)
  if (attemptNo && attemptNo > 1) {
    return 0;
  }
  
  // Check if points were already awarded for this attempt
  const { prisma } = await import('../../lib/prisma');
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

// Bulk award points for multiple attempts
export const bulkAwardPointsForExam = async (examId: string) => {
  const { prisma } = await import('../../lib/prisma');
  
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
      await awardPointsForExam(
        attempt.studentId,
        attempt.id,
        Number(attempt.score || 0),
        Number(attempt.maxScore || 0),
        attempt.attemptNo
      );
      awarded++;
    } catch (error) {
      console.error(`Error awarding points for attempt ${attempt.id}:`, error);
      errors++;
    }
  }
  
  return { awarded, skipped, errors };
};

