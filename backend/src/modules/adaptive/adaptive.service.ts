import { prisma } from "../../lib/prisma";
import { Difficulty, QType } from "@prisma/client";

interface QuestionHistoryItem {
  questionPoolId: string;
  questionId: string; // The specific Question ID created in the main table
  difficulty: Difficulty;
  timeTaken: number;
  passed: boolean;
  timestamp: string;
}

export class AdaptiveService {

  /**
   * Starts or retrieves an existing dynamic session
   */
  async getOrCreateSession(studentId: string, examId: string) {
    let session = await prisma.dynamicExamSession.findUnique({
      where: {
        studentId_examId: {
          studentId,
          examId
        }
      }
    });

    if (!session) {
      session = await prisma.dynamicExamSession.create({
        data: {
          studentId,
          examId,
          currentDifficulty: 'MEDIUM', // Start at Medium
          questionsAnswered: 0,
          history: []
        }
      });
    }

    return session;
  }

  /**
   * Determines the next difficulty based on the LAST response
   */
  calculateNextDifficulty(lastHistoryItem: QuestionHistoryItem | null): Difficulty {
    if (!lastHistoryItem) return 'MEDIUM'; // Start

    const { difficulty, timeTaken, passed } = lastHistoryItem;

    // Rules from Spec
    // 1. Pass + Fast (< 60s) -> Increase Difficulty (HARD)
    // 2. Fail + Slow (> 600s) -> Decrease Difficulty (VERY_EASY)
    // 3. Otherwise -> Maintain or slight adjust

    if (passed) {
      if (timeTaken < 60) {
        // Boost!
        if (difficulty === 'VERY_EASY') return 'EASY';
        if (difficulty === 'EASY') return 'MEDIUM';
        return 'HARD'; // Cap at HARD
      } else {
        // Standard pass -> Maintain or slight increase if was VERY_EASY
        if (difficulty === 'VERY_EASY') return 'EASY';
        return difficulty;
      }
    } else {
      // Failed
      if (timeTaken > 600) {
        // Stuck for 10 mins -> Rescue!
        return 'VERY_EASY';
      } else {
        // Standard fail -> Decrease
        if (difficulty === 'HARD') return 'MEDIUM';
        if (difficulty === 'MEDIUM') return 'EASY';
        return 'VERY_EASY';
      }
    }
  }

  /**
   * Fetches the next question for the student
   */
  async getNextQuestion(studentId: string, examId: string) {
    // 1. Get Session
    const session = await this.getOrCreateSession(studentId, examId);
    
    // 2. Check Limit (Admin configured or default 5)
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const limit = exam?.dynamicQuestionCount || 5;

    if (session.questionsAnswered >= limit) {
      return null; // Exam finished
    }

    // 3. Calculate Difficulty
    const history = (session.history as unknown as QuestionHistoryItem[]) || [];
    let lastItem: QuestionHistoryItem | null = null;
    if (history.length > 0) {
      lastItem = history[history.length - 1] || null;
    }
    const nextDifficulty = this.calculateNextDifficulty(lastItem);

    // 4. Get Seen IDs to exclude
    const seenPoolIds = history.map(h => h.questionPoolId);

    // 5. Fetch Candidate from Pool
    // We need to pick a question from the Exam's assigned topics
    // Since we don't have topics stored on the session yet, we assume the Pool is generic or we filter by exam topics
    // The Exam model has `dynamicTopics`
    const allowedTopics = exam?.dynamicTopics || [];
    
    // Find ONE random unused question
    // Prisma doesn't support RAND() easily, so we fetch a few and pick one JS-side
    // Or fetch first one not in seen list
    
    const candidate = await prisma.questionPool.findFirst({
      where: {
        difficulty: nextDifficulty,
        ...(allowedTopics.length > 0 ? { topic: { in: allowedTopics } } : {}),
        id: { notIn: seenPoolIds }
      }
    });

    if (!candidate) {
      console.warn(`[Adaptive] No ${nextDifficulty} questions left for topic(s) ${allowedTopics}! Fallback to ANY.`);
       // Fallback: try any difficulty if we ran out of specific level
      const fallback = await prisma.questionPool.findFirst({
         where: {
          ...(allowedTopics.length > 0 ? { topic: { in: allowedTopics } } : {}),
           id: { notIn: seenPoolIds }
         }
       });
       if (!fallback) {
         throw new Error("Question Pool is empty! Please ask admin to generate questions.");
       }
       return this.instantiateQuestionForStudent(fallback, nextDifficulty, studentId, examId, session.id); // Use fallback
    }

    return this.instantiateQuestionForStudent(candidate, nextDifficulty, studentId, examId, session.id);
  }

  /**
   * "Instantiates" a pool question into a real Question record for the student to attempt
   */
  private async instantiateQuestionForStudent(poolItem: any, difficulty: Difficulty, studentId: string, examId: string, sessionId: string) {
    // We create a real Question in the DB so standard GradingService works!
    // But this question is linked to THIS exam and is temporary/dynamic?
    // Actually, to keep it clean, we can create a Question record that is NOT linked to the "ExamSection" flow
    // But GradingService expects a Question ID.

    const poolData = poolItem.data;
    
    // Create the Question record
    const question = await prisma.question.create({
      data: {
        examId: examId, // Link to exam so rights check passes
        type: QType.CODING,
        points: difficulty === 'HARD' ? 20 : (difficulty === 'MEDIUM' ? 10 : 5),
        prompt: poolData.problemStatement,
        starterCode: poolData.starterCode?.[0]?.code || '', // Assuming JS/TS for now or first available
        testcases: poolData.testCases || [],
        order: 999, // Dynamic questions don't have order in sections
        config: {
          dynamic: true,
          poolId: poolItem.id,
          difficulty: difficulty,
          topic: poolItem.topic,
          sessionId: sessionId
        }
      }
    });

    return question;
  }

  /**
   * Record the result of an attempt to update history
   */
  async recordResult(sessionId: string, questionId: string, poolId: string, difficulty: Difficulty, timeTaken: number, passed: boolean) {
    const session = await prisma.dynamicExamSession.findUnique({ where: { id: sessionId } });
    if (!session) return;

    const history = (session.history as unknown as QuestionHistoryItem[]) || [];
    
    const newItem: QuestionHistoryItem = {
      questionPoolId: poolId,
      questionId,
      difficulty,
      timeTaken,
      passed,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...history, newItem];

    await prisma.dynamicExamSession.update({
      where: { id: sessionId },
      data: {
        history: newHistory as any,
        questionsAnswered: { increment: 1 },
        currentDifficulty: difficulty // Store what WAS just attempted? Or what is next? keep it simple
      }
    });
  }
}

export const adaptiveService = new AdaptiveService();
