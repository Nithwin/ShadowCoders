import { RequestHandler } from 'express';
import * as aiService from './ai.service';
import { z } from 'zod';
import { generateQuestionsSchema } from './ai.zod';

export const generateQuestionsHandler: RequestHandler = async (req, res, next) => {
  try {
    // Get validated data from the middleware
    const input = req.validatedData?.body as z.infer<typeof generateQuestionsSchema>['body'];

    if (!input) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request body',
      });
    }

    // Call the service to get the generated questions
    const questions = await aiService.generateQuestions(input);

    // Send the array of questions back to the frontend
    res.status(200).json(questions);
  } catch (error: any) {
    // Pass error to error handler middleware
    next(error);
  }
};