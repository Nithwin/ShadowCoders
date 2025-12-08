import { RequestHandler } from 'express';
import * as gradingService from './grading.service';
import { z } from 'zod';
import { runCodeSchema, autoGradeEssaySchema } from './grading.zod';
import { executionQueue } from '../../lib/execution-queue';

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

export const gradeEssayHandler: RequestHandler = async (req, res, next) => {
  try {
    // req.body should be validated by autoGradeEssaySchema
    const { responseId } = req.body;
    const result = await gradingService.gradeEssay(responseId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getQueueStatusHandler: RequestHandler = async (req, res, next) => {
  try {
    const stats = executionQueue.getStats();
    const estimatedWaitTime = executionQueue.getEstimatedWaitTime();
    
    res.status(200).json({
      ...stats,
      estimatedWaitTimeMs: estimatedWaitTime,
    });
  } catch (error) {
    next(error);
  }
};

export const overrideResponseGradeHandler: RequestHandler = async (req, res, next) => {
  try {
    const { responseId } = req.params;
    const { score, feedback } = req.body;

    if (!responseId) {
        return next({ status: 400, message: 'Response ID is required' });
    }
    
    // Simple validation
    if (score === undefined || score === null || isNaN(Number(score))) {
        return next({ status: 400, message: 'Valid score is required' });
    }

    const result = await gradingService.overrideResponseGrade(responseId, Number(score), feedback);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};