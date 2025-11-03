import { RequestHandler } from 'express';
import * as evaluationService from './evaluation.service';
import { z } from 'zod';
import { createEvaluationSchema } from './evaluation.zod';

export const createManualEvaluationHandler: RequestHandler = async (req, res, next) => {
  try {
    const assessorId = req.user?.sub; // ID of the STAFF user
    const responseId = req.params.responseId; // ID of the answer being graded
    const evaluationData = req.body as z.infer<typeof createEvaluationSchema>['body'];

    if (!assessorId) {
      return next({ status: 401, message: 'Unauthorized: Assessor ID not found' });
    }
    if (!responseId) {
      return next({ status: 400, message: 'Response ID parameter is required' });
    }

    // Call the service to create the evaluation and update scores
    const newEvaluation = await evaluationService.createManualEvaluation(
      responseId,
      assessorId,
      evaluationData
    );

    // Send back the newly created evaluation
    res.status(201).json(newEvaluation);

  } catch (error) {
    next(error);
  }
};