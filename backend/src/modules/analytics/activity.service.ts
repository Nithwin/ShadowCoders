import { prisma } from '../../lib/prisma';
import { AttemptStatus } from '@prisma/client';

export interface ActivityData {
  date: string;
  count: number;
}

export const getUserActivityData = async (userId: string, year?: number): Promise<ActivityData[]> => {
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  // Get all submitted attempts for the user in the given year
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: userId,
      status: AttemptStatus.SUBMITTED,
      submittedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      submittedAt: true,
    },
  });

  // Group by date
  const activityMap = new Map<string, number>();
  
  attempts.forEach(attempt => {
    if (attempt.submittedAt) {
      const dateKey = attempt.submittedAt.toISOString().split('T')[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    }
  });

  // Convert to array format
  const activityData: ActivityData[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    activityData.push({
      date: dateKey,
      count: activityMap.get(dateKey) || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return activityData;
};

export const getUserStats = async (userId: string) => {
  // Get all submitted attempts
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: userId,
      status: AttemptStatus.SUBMITTED,
    },
    select: {
      score: true,
      maxScore: true,
      submittedAt: true,
      exam: {
        select: {
          title: true,
        },
      },
    },
  });

  const totalExams = attempts.length;
  const totalScore = attempts.reduce((sum, a) => {
    const score = a.score ? parseFloat(String(a.score)) : 0;
    return sum + score;
  }, 0);
  const totalMaxScore = attempts.reduce((sum, a) => {
    const maxScore = a.maxScore ? parseFloat(String(a.maxScore)) : 0;
    return sum + maxScore;
  }, 0);
  
  const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
  
  // Calculate current streak (consecutive days with activity)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const datesWithActivity = new Set(
    attempts
      .filter(a => a.submittedAt)
      .map(a => {
        const date = new Date(a.submittedAt!);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      })
  );

  let checkDate = new Date(today);
  while (datesWithActivity.has(checkDate.toISOString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Longest streak
  let longestStreak = 0;
  let currentStreak = 0;
  const sortedDates = Array.from(datesWithActivity).sort();
  
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    totalExams,
    averageScore: Math.round(averageScore),
    currentStreak,
    longestStreak,
    totalScore: Math.round(totalScore),
    totalMaxScore: Math.round(totalMaxScore),
  };
};

