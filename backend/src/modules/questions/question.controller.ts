import { RequestHandler } from 'express';
import * as questionService from './question.service';

export const addQuestionsHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    
    if (!examId) {
      return res.status(400).json({ error: 'Exam ID is required' });
    }
    
    const questions = req.body.questions;

    await questionService.addQuestionsToExam(examId, questions);

    res.status(201).send('Questions added successfully');
  } catch (error) {
    next(error);
  }
};