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
    
    const candidate = await (prisma.questionPool as any).findFirst({
      where: {
        examId: examId, 
        difficulty: nextDifficulty,
        ...(allowedTopics.length > 0 ? { topic: { in: allowedTopics } } : {}),
        id: { notIn: seenPoolIds }
      }
    });

    if (!candidate) {
      console.warn(`[Adaptive] No ${nextDifficulty} questions left for Exam ${examId}! Fallback to ANY difficulty for this exam.`);
       // Fallback: try any difficulty but STILL RESTRICTED TO EXAM
      const fallback = await (prisma.questionPool as any).findFirst({
         where: {
           examId: examId,
          ...(allowedTopics.length > 0 ? { topic: { in: allowedTopics } } : {}),
           id: { notIn: seenPoolIds }
         }
       });
       if (!fallback) {
         console.error("[Adaptive] Question Pool is empty for exam", examId);
         return null; // Return null instead of throwing to prevent 500
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
        starterCode: '', // User requested NO snippet (IO format)
        testcases: poolData.testCases || [],
        maxDurationSec: 300, // 5 minutes per question for dynamic mode
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


  /**
   * Starts a dynamic session for an attempt
   */
  async startSession(studentId: string, examId: string, attemptId: string) {
    // 1. Create or Get Session
    const session = await this.getOrCreateSession(studentId, examId);

    // 2. Do we already have questions for this attempt?
    // If getting an existing session, we might already have history.
    // But for a NEW attempt (which triggered this), we MUST reset the session standard
    // to ensure they don't inherit "finished" state from a previous attempt.
    
    // We assume if attempt.orderMap is empty, we need a question.
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    const orderMap = (attempt?.orderMap as string[]) || [];

    if (orderMap.length > 0) {
      return; // Already initialized, don't reset
    }

    // RESET SESSION for new attempt
    await prisma.dynamicExamSession.update({
      where: { id: session.id },
      data: {
        questionsAnswered: 0,
        history: [],
        currentDifficulty: 'MEDIUM' 
      }
    });

    // 3. Get First Question
    // Calculate difficulty based on empty history (MEDIUM)
    const nextQuestion = await this.getNextQuestion(studentId, examId);
    
    if (nextQuestion) {
      // 4. Update Attempt
      await prisma.attempt.update({
        where: { id: attemptId },
        data: {
          orderMap: [nextQuestion.id]
        }
      });
    }
  }

  /**
   * Progresses the session after a response (or timeout)
   */
  async progressSession(attemptId: string, lastResponse: { questionId: string; verdict: string | null; earnedPoints?: any; timeSpent?: number }) {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { exam: true }
    });

    if (!attempt || attempt.exam.mode !== 'DYNAMIC') return;

    // 1. Get Session
    const session = await this.getOrCreateSession(attempt.studentId, attempt.examId);

    // 2. Identify the Question Pool ID from the Question Config
    // We need to know which "Pool Item" this question corresponded to, to update history correctly.
    const question = await prisma.question.findUnique({ where: { id: lastResponse.questionId } });
    if (!question) return;
    const config = question.config as any;
    const poolId = config?.poolId;
    const difficulty = config?.difficulty as Difficulty;

    // 3. Record Result
    if (poolId && difficulty) {
      // Estimate time taken? 
      // ideally we track start/end of question. For now use a heuristic or passed value.
      // We can use (now - lastResponse.createdAt) or similar if we had it.
      // Let's assume 5 mins if not known, or use the timer.
      const timeTaken = lastResponse.timeSpent || 60; 
      
      const passed = lastResponse.verdict === 'PASS';
      
      await this.recordResult(session.id, question.id, poolId, difficulty, timeTaken, passed);
    }

    // 4. Get Next Question
    const nextQuestion = await this.getNextQuestion(attempt.studentId, attempt.examId);

    if (nextQuestion) {
      // 5. Append to OrderMap
      const currentMap = (attempt.orderMap as string[]) || [];
      // Ensure unique
      if (!currentMap.includes(nextQuestion.id)) {
        await prisma.attempt.update({
          where: { id: attemptId },
          data: {
            orderMap: [...currentMap, nextQuestion.id]
          }
        });
      }
    } else {
        // No more questions - Mark exam as potentially complete?
        // Or just let the user see the "Finish" screen.
    }
  }


}

export const adaptiveService = new AdaptiveService();
