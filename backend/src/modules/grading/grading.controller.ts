import { RequestHandler } from 'express';
import * as gradingService from './grading.service';
import { z } from 'zod';
import { runCodeSchema } from './grading.zod';

export const runCodeHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const attemptId = req.params.attemptId;
    const runData = req.body as z.infer<typeof runCodeSchema>['body'];

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!attemptId) {
      return next({ status: 400, message: 'Attempt ID parameter is required' });
    }

    // Call the service to run the code
    const result = await gradingService.runCode(studentId, attemptId, runData);

    // Send back the result from the code judge
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};