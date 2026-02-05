import { Request, Response, NextFunction } from 'express';
import { adaptiveService } from './adaptive.service';

export const getNextQuestionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { examId } = req.params;
    const studentId = (req as any).user.sub;

    if (!examId) throw { status: 400, message: "Exam ID required" };

    const question = await adaptiveService.getNextQuestion(studentId, examId);

    if (!question) {
      // Means exam is finished or no questions available
      return res.status(200).json({ 
        finished: true, 
        message: "You have completed the required number of questions." 
      });
    }

    res.json({
      finished: false,
      question: question
    });
  } catch (error) {
    next(error);
  }
};
