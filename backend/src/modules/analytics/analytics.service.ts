import { prisma } from '../../lib/prisma';
import { Prisma, QType, GradingMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate question difficulty (p-value) - proportion of students who answered correctly
 * Range: 0 (very difficult) to 1 (very easy)
 */
export const calculateQuestionDifficulty = async (questionId: string): Promise<number | null> => {
  const responses = await prisma.response.findMany({
    where: {
      questionId,
      attempt: {
        status: 'SUBMITTED',
      },
    },
    select: {
      earnedPoints: true,
      question: {
        select: {
          points: true,
        },
      },
    },
  });

  if (responses.length === 0) return null;

  const totalStudents = responses.length;
  let correctAnswers = 0;

  responses.forEach((response) => {
    const earned = response.earnedPoints?.toNumber() || 0;
    const total = response.question.points?.toNumber() || 0;
    
    // Consider a question correct if earned >= 50% of points
    if (total > 0 && earned / total >= 0.5) {
      correctAnswers++;
    }
  });

  return correctAnswers / totalStudents;
};

/**
 * Calculate discrimination index - ability to distinguish between high and low performers
 * Range: -1 (high performers do worse) to +1 (high performers do better)
 * Values > 0.3 are considered good discrimination
 */
export const calculateDiscriminationIndex = async (questionId: string): Promise<number | null> => {
  const attempts = await prisma.attempt.findMany({
    where: {
      status: 'SUBMITTED',
      exam: {
        questions: {
          some: { id: questionId },
        },
      },
    },
    select: {
      id: true,
      score: true,
      maxScore: true,
      responses: {
        where: { questionId },
        select: {
          earnedPoints: true,
          question: {
            select: {
              points: true,
            },
          },
        },
      },
    },
  });

  if (attempts.length < 2) return null;

  // Calculate total scores for each attempt
  const attemptScores = attempts.map((attempt) => {
    const total = attempt.maxScore?.toNumber() || 0;
    const score = attempt.score?.toNumber() || 0;
    return {
      attemptId: attempt.id,
      percentage: total > 0 ? score / total : 0,
      questionResponse: attempt.responses[0],
    };
  });

  // Sort by total exam score
  attemptScores.sort((a, b) => b.percentage - a.percentage);

  // Split into upper 27% and lower 27% (Kelley's criterion)
  const n = attemptScores.length;
  const upperCount = Math.max(1, Math.floor(n * 0.27));
  const lowerCount = Math.max(1, Math.floor(n * 0.27));

  const upperGroup = attemptScores.slice(0, upperCount);
  const lowerGroup = attemptScores.slice(n - lowerCount);

  // Calculate proportion correct in each group
  const calculateProportionCorrect = (group: typeof attemptScores) => {
    let correct = 0;
    group.forEach((item) => {
      const earned = item.questionResponse?.earnedPoints?.toNumber() || 0;
      const total = item.questionResponse?.question.points?.toNumber() || 0;
      if (total > 0 && earned / total >= 0.5) {
        correct++;
      }
    });
    return correct / group.length;
  };

  const upperProportion = calculateProportionCorrect(upperGroup);
  const lowerProportion = calculateProportionCorrect(lowerGroup);

  return upperProportion - lowerProportion;
};

/**
 * Get question performance metrics for an exam
 */
export const getQuestionPerformanceMetrics = async (examId: string) => {
  const questions = await prisma.question.findMany({
    where: {
      examId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      order: true,
      prompt: true,
      type: true,
      points: true,
    },
    orderBy: { order: 'asc' },
  });

  const metrics = await Promise.all(
    questions.map(async (question) => {
      const responses = await prisma.response.findMany({
        where: {
          questionId: question.id,
          attempt: {
            examId,
            status: 'SUBMITTED',
          },
        },
        select: {
          earnedPoints: true,
          attempt: {
            select: {
              timeSpentSec: true,
            },
          },
        },
      });

      if (responses.length === 0) {
        return {
          questionId: question.id,
          questionOrder: question.order,
          questionPrompt: question.prompt?.substring(0, 100) || '',
          questionType: question.type,
          totalPoints: question.points?.toNumber() || 0,
          totalAttempts: 0,
          averageScore: 0,
          averagePercentage: 0,
          passRate: 0,
          averageTimeSpent: 0,
          difficulty: null,
          discriminationIndex: null,
        };
      }

      const totalAttempts = responses.length;
      const totalPoints = question.points?.toNumber() || 0;
      
      let totalEarned = 0;
      let totalTimeSpent = 0;
      let passedCount = 0;

      responses.forEach((response) => {
        const earned = response.earnedPoints?.toNumber() || 0;
        totalEarned += earned;
        totalTimeSpent += response.attempt.timeSpentSec || 0;
        
        if (totalPoints > 0 && earned / totalPoints >= 0.5) {
          passedCount++;
        }
      });

      const averageScore = totalEarned / totalAttempts;
      const averagePercentage = totalPoints > 0 ? (averageScore / totalPoints) * 100 : 0;
      const passRate = (passedCount / totalAttempts) * 100;
      const averageTimeSpent = totalTimeSpent / totalAttempts;

      // Calculate difficulty and discrimination
      const difficulty = await calculateQuestionDifficulty(question.id);
      const discriminationIndex = await calculateDiscriminationIndex(question.id);

      return {
        questionId: question.id,
        questionOrder: question.order,
        questionPrompt: question.prompt?.substring(0, 100) || '',
        questionType: question.type,
        totalPoints,
        totalAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        averageTimeSpent: Math.round(averageTimeSpent),
        difficulty: difficulty !== null ? Math.round(difficulty * 1000) / 1000 : null,
        discriminationIndex: discriminationIndex !== null ? Math.round(discriminationIndex * 1000) / 1000 : null,
      };
    })
  );

  return metrics;
};

/**
 * Get student performance trends over time for an exam
 */
export const getStudentPerformanceTrends = async (examId: string) => {
  const attempts = await prisma.attempt.findMany({
    where: {
      examId,
      status: 'SUBMITTED',
    },
    select: {
      id: true,
      studentId: true,
      score: true,
      maxScore: true,
      submittedAt: true,
      student: {
        select: {
          name: true,
          email: true,
          reg_no: true,
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  const trends = attempts.map((attempt, index) => {
    const score = attempt.score?.toNumber() || 0;
    const maxScore = attempt.maxScore?.toNumber() || 0;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    return {
      attemptNumber: index + 1,
      studentId: attempt.studentId,
      studentName: attempt.student.name || attempt.student.email,
      studentRegNo: attempt.student.reg_no,
      score: Math.round(score * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      submittedAt: attempt.submittedAt,
    };
  });

  return trends;
};

/**
 * Get time spent analysis per question
 */
export const getTimeSpentAnalysis = async (examId: string) => {
  const questions = await prisma.question.findMany({
    where: {
      examId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      order: true,
      prompt: true,
      type: true,
    },
    orderBy: { order: 'asc' },
  });

  const analysis = await Promise.all(
    questions.map(async (question) => {
      // Get responses with attempt timing data
      const responses = await prisma.response.findMany({
        where: {
          questionId: question.id,
          attempt: {
            examId,
            status: 'SUBMITTED',
          },
        },
        select: {
          attempt: {
            select: {
              timeSpentSec: true,
            },
          },
        },
      });

      const totalResponses = responses.length;

      if (totalResponses === 0) {
        return {
          questionId: question.id,
          questionOrder: question.order,
          questionType: question.type,
          averageTimeSpent: 0,
          minTimeSpent: 0,
          maxTimeSpent: 0,
          medianTimeSpent: 0,
          totalResponses: 0,
        };
      }

      const timeSpent = responses
        .map((r) => r.attempt.timeSpentSec || 0)
        .filter((t) => t > 0)
        .sort((a, b) => a - b);

      if (timeSpent.length === 0) {
        return {
          questionId: question.id,
          questionOrder: question.order,
          questionType: question.type,
          averageTimeSpent: 0,
          minTimeSpent: 0,
          maxTimeSpent: 0,
          medianTimeSpent: 0,
          totalResponses,
        };
      }

      const average = timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length;
      const min = timeSpent[0];
      const max = timeSpent[timeSpent.length - 1];
      const median =
        timeSpent.length % 2 === 0
          ? (timeSpent[timeSpent.length / 2 - 1] + timeSpent[timeSpent.length / 2]) / 2
          : timeSpent[Math.floor(timeSpent.length / 2)];

      return {
        questionId: question.id,
        questionOrder: question.order,
        questionType: question.type,
        averageTimeSpent: Math.round(average),
        minTimeSpent: min,
        maxTimeSpent: max,
        medianTimeSpent: Math.round(median),
        totalResponses,
      };
    })
  );

  return analysis;
};

/**
 * Get overall exam statistics
 */
export const getExamStatistics = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      durationMins: true,
      startAt: true,
      endAt: true,
      _count: {
        select: {
          attempts: true,
          questions: true,
        },
      },
    },
  });

  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  const submittedAttempts = await prisma.attempt.findMany({
    where: {
      examId,
      status: 'SUBMITTED',
    },
    select: {
      score: true,
      maxScore: true,
      timeSpentSec: true,
    },
  });

  if (submittedAttempts.length === 0) {
    return {
      exam: {
        id: exam.id,
        title: exam.title,
        durationMins: exam.durationMins,
        startAt: exam.startAt,
        endAt: exam.endAt,
      },
      totalAttempts: 0,
      submittedAttempts: 0,
      totalQuestions: exam._count.questions,
      averageScore: 0,
      averagePercentage: 0,
      highestScore: 0,
      lowestScore: 0,
      averageTimeSpent: 0,
      completionRate: 0,
    };
  }

  const scores = submittedAttempts
    .filter((a) => a.score !== null && a.maxScore !== null)
    .map((a) => {
      const score = a.score?.toNumber() || 0;
      const maxScore = a.maxScore?.toNumber() || 0;
      return {
        score,
        maxScore,
        percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
        timeSpent: a.timeSpentSec || 0,
      };
    });

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const totalMaxScore = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const totalTimeSpent = scores.reduce((sum, s) => sum + s.timeSpent, 0);

  const averageScore = totalScore / scores.length;
  const averagePercentage = scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length;
  const highestScore = Math.max(...scores.map((s) => s.score));
  const lowestScore = Math.min(...scores.map((s) => s.score));
  const averageTimeSpent = totalTimeSpent / scores.length;

  const allAttempts = await prisma.attempt.count({
    where: { examId },
  });

  const completionRate = allAttempts > 0 ? (submittedAttempts.length / allAttempts) * 100 : 0;

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      durationMins: exam.durationMins,
      startAt: exam.startAt,
      endAt: exam.endAt,
    },
    totalAttempts: allAttempts,
    submittedAttempts: submittedAttempts.length,
    totalQuestions: exam._count.questions,
    averageScore: Math.round(averageScore * 100) / 100,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    highestScore: Math.round(highestScore * 100) / 100,
    lowestScore: Math.round(lowestScore * 100) / 100,
    averageTimeSpent: Math.round(averageTimeSpent),
    completionRate: Math.round(completionRate * 100) / 100,
  };
};

/**
 * Get comprehensive analytics for an exam
 */
export const getExamAnalytics = async (examId: string) => {
  const [statistics, questionMetrics, performanceTrends, timeAnalysis] = await Promise.all([
    getExamStatistics(examId),
    getQuestionPerformanceMetrics(examId),
    getStudentPerformanceTrends(examId),
    getTimeSpentAnalysis(examId),
  ]);

  return {
    statistics,
    questionMetrics,
    performanceTrends,
    timeAnalysis,
  };
};

