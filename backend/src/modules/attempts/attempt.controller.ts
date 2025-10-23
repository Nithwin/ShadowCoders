import { RequestHandler } from 'express';
import * as attemptService from './attempt.service';

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