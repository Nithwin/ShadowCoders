import { RequestHandler } from 'express';
import * as attemptService from './attempt.service';
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema, runCodeSchema, forceSubmitAttemptSchema, resumeAttemptsSchema } from './attempt.zod';
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

export const runCodeHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const attemptId = req.params.attemptId;
    const { questionId, code, language, customInput, runAllTests } = req.body as z.infer<typeof runCodeSchema>['body'];

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    const result = await attemptService.runCode(
      studentId, 
      attemptId, 
      questionId, 
      code, 
      language, 
      customInput,
      runAllTests
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


export const submitAttemptHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub; // From verifyAccess middleware
    const attemptId = req.params.attemptId;   // From URL parameter
    const { submissionReason } = req.body;

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to validate, grade, and submit the attempt
    const submittedAttempt = await attemptService.submitAttempt(studentId, attemptId, submissionReason);

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

export const getQuestionHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const attemptId = req.params.attemptId;
    const questionId = req.params.questionId;

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId || !questionId) {
      return next({ status: 400, message: 'Attempt ID and Question ID are required' });
    }

    // Get the question with scrubbed test cases (only visible ones)
    const question = await attemptService.getQuestionForStudent(attemptId, questionId, studentId);

    res.status(200).json(question);
  } catch (error) {
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

export const getStudentAttemptsHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub; // From verifyAccess middleware

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    // Call the service to get all submitted attempts for this student
    const attempts = await attemptService.getStudentAttempts(studentId);

    // Send back the list of attempts
    res.status(200).json(attempts);

  } catch (error) {
    // Pass errors to the central handler
    next(error);
  }
};

export const listAttemptsForExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    
    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    // Get validated query params from middleware
    const queryParams = req.validatedData?.query as z.infer<typeof listAttemptsSchema>['query'] || {
      page: 1,
      pageSize: 20,
    };
    
    // Pass the query object directly to the service (it expects { page, pageSize, q })
    const validatedParams = {
      page: Number(queryParams.page) || 1,
      pageSize: Number(queryParams.pageSize) || 20,
      q: queryParams.q?.trim() || undefined,
    };
    
    // Call the ATTEMPT service to get the data
    const result = await attemptService.listAttemptsForExam(examId, validatedParams);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAttemptForAdminHandler: RequestHandler = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId; // Get attemptId from URL

    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to get the full attempt data
    const attemptDetails = await attemptService.getAttemptForAdmin(attemptId);

    // Send back the full details
    res.status(200).json(attemptDetails);

  } catch (error) {
    // Pass errors (like 404 Not Found) to the central handler
    next(error);
  }
};

export const resetAttemptsHandler: RequestHandler = async (req, res, next) => {
  try {
    // Get validated body data
    const resetData = req.validatedData?.body as z.infer<typeof resetAttemptsSchema>['body'] || req.body;

    if (!resetData.examId) {
      return next({ status: 400, message: 'Exam ID is required' });
    }

    if (!resetData.resetAll && (!resetData.studentIds || resetData.studentIds.length === 0)) {
      return next({ status: 400, message: 'Either resetAll must be true or studentIds must be provided' });
    }

    // Call the service to reset attempts
    const result = await attemptService.resetAttempts(resetData);

    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};

export const resumeAttemptsHandler: RequestHandler = async (req, res, next) => {
  try {
    // Get validated body data
    const resumeData = req.validatedData?.body as z.infer<typeof resumeAttemptsSchema>['body'] || req.body;

    if (!resumeData.examId) {
      return next({ status: 400, message: 'Exam ID is required' });
    }

    if (!resumeData.resumeAll && (!resumeData.studentIds || resumeData.studentIds.length === 0)) {
      return next({ status: 400, message: 'Either resumeAll must be true or studentIds must be provided' });
    }

    // Call the service to resume attempts
    const result = await attemptService.resumeAttempts(resumeData);

    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};

export const forceSubmitAttemptHandler: RequestHandler = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;
    const { submissionReason } = req.body;

    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to force submit the attempt
    const submittedAttempt = await attemptService.forceSubmitAttempt(attemptId, submissionReason);

    // Send back the details of the submitted attempt
    res.status(200).json(submittedAttempt);

  } catch (error) {
    next(error);
  }
};

export const getExamLeaderboardHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const examId = req.params.examId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    // Call the service to get the leaderboard
    const leaderboard = await attemptService.getExamLeaderboard(examId, studentId, limit);

    res.status(200).json(leaderboard);

  } catch (error) {
    next(error);
  }
};