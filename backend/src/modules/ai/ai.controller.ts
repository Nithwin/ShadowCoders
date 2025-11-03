import { RequestHandler } from 'express';
import * as aiService from './ai.service';
import { z } from 'zod';
import { generateQuestionsSchema } from './ai.zod';

export const generateQuestionsHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof generateQuestionsSchema>['body'];

    // Call the service to get the generated questions
    const questions = await aiService.generateQuestions(input);

    // Send the array of questions back to the frontend
    res.status(200).json(questions);
  } catch (error) {
    next(error);
  }
};