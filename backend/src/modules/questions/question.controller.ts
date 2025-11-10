/**
 * Handles the request to list all questions for an exam.
 */
export const listQuestionsForExamHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    const questions = await questionService.listQuestionsForExam(examId);
    res.status(200).json(questions);
  } catch (error) {
    next(error);
  }
};
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
    
    // Get validated data from middleware if available, otherwise use req.body
    const questions = req.validatedData?.body?.questions || req.body.questions;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'At least one question must be provided' 
      });
    }

    await questionService.addQuestionsToExam(examId, questions);

    res.status(201).json({ 
      message: 'Questions added successfully',
      count: questions.length 
    });
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
    // Use validatedData from middleware, fallback to req.body if not available
    const updateData = req.validatedData?.body || req.body;

    if (!questionId) {
      return next({ status: 400, message: 'Question ID parameter is required' });
    }

    console.log('Update question request:', {
      questionId,
      updateData: JSON.stringify(updateData, null, 2),
      testcases: updateData.testcases,
      testcasesType: typeof updateData.testcases,
      testcasesIsArray: Array.isArray(updateData.testcases),
    });

    const updatedQuestion = await questionService.updateQuestion(
      questionId,
      updateData
    );

    res.status(200).json(updatedQuestion);
  } catch (error) {
    next(error);
  }
};

export const deleteQuestionHandler: RequestHandler = async (req, res, next) => {
  try {
    const questionId = req.params.questionId;

    if (!questionId) {
      return next({ status: 400, message: 'Question ID parameter is required' });
    }

    const result = await questionService.deleteQuestion(questionId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};