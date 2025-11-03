import { RequestHandler } from 'express';
import * as questionService from './question.service';
import { updateQuestionSchema } from './question.zod';
import z from 'zod';

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

export const getQuestionHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const { attemptId, questionId } = req.params;

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId || !questionId) {
      return next({ status: 400, message: 'Attempt ID and Question ID are required' });
    }

    // Call the service to get the scrubbed question
    const scrubbedQuestion = await questionService.getQuestionForStudent(
      studentId,
      attemptId,
      questionId
    );

    res.status(200).json(scrubbedQuestion);

  } catch (error) {
    // Pass errors (404, 403) to the central handler
    next(error);
  }
};

export const updateQuestionHandler: RequestHandler = async (req, res, next) => {
  try {
    const questionId = req.params.questionId;
    const updateData = req.body as z.infer<typeof updateQuestionSchema>['body'];

    if (!questionId) {
      return next({ status: 400, message: 'Question ID parameter is required' });
    }

    const updatedQuestion = await questionService.updateQuestion(
      questionId,
      updateData
    );

    res.status(200).json(updatedQuestion);
  } catch (error) {
    next(error);
  }
};