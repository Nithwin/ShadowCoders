import { RequestHandler } from 'express';
import * as attemptService from './attempt.service';
import { listAttemptsSchema, submitAnswerSchema } from './attempt.zod';
import z from 'zod';

export const startAttemptHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub; // From verifyAccess middleware
    const examId = req.params.examId;   // From URL parameter

    if (!studentId) {
      // Should be caught by verifyAccess, but good to check
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    // Call the service to perform checks and create the attempt
    const newAttempt = await attemptService.startAttempt(studentId, examId);

    // Send back the details of the newly created attempt
    res.status(201).json(newAttempt);

  } catch (error) {
    // Pass errors (like eligibility failures or constraint violations)
    // to the central error handler
    next(error);
  }
};


export const submitAnswerHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const attemptId = req.params.attemptId;
    // Get the validated body data
    const answerData = req.body as z.infer<typeof submitAnswerSchema>['body'];

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to validate and save the answer
    await attemptService.submitAnswer(studentId, attemptId, answerData);

    // Send a success response (e.g., 200 OK or 204 No Content)
    res.status(200).json({ message: 'Answer submitted successfully' });

  } catch (error) {
    next(error);
  }
};


export const submitAttemptHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub; // From verifyAccess middleware
    const attemptId = req.params.attemptId;   // From URL parameter

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to validate, grade, and submit the attempt
    const submittedAttempt = await attemptService.submitAttempt(studentId, attemptId);

    // Send back the details of the submitted attempt (score, status, etc.)
    res.status(200).json(submittedAttempt);

  } catch (error) {
    // Pass errors (like 'Attempt not in progress') to the central handler
    next(error);
  }
};

export const getAttemptDetailsHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub; // From verifyAccess middleware
    const attemptId = req.params.attemptId;   // From URL parameter

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to get the attempt details
    const attemptDetails = await attemptService.getAttemptDetails(studentId, attemptId);

    // Send back the full details
    res.status(200).json(attemptDetails);

  } catch (error) {
    // Pass errors (like 404 Not Found or 403 Forbidden) to the central handler
    next(error);
  }
};

export const getAttemptResultsHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub; // From verifyAccess middleware
    const attemptId = req.params.attemptId;   // From URL parameter

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to get the attempt results
    const attemptResults = await attemptService.getAttemptResults(studentId, attemptId);

    // Send back the full results
    res.status(200).json(attemptResults);

  } catch (error) {
    // Pass errors (404, 403) to the central handler
    next(error);
  }
};

export const listAttemptsForExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    
    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    // Get validated query params
    const queryParams = req.query as unknown as z.infer<typeof listAttemptsSchema>['query'];
    
    // Call the ATTEMPT service to get the data
    const result = await attemptService.listAttemptsForExam(examId, queryParams);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};