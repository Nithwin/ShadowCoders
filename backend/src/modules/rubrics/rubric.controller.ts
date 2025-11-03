import { RequestHandler } from 'express';
import * as rubricService from './rubric.service';
import { z } from 'zod';
import { createRubricSchema } from './rubric.zod';

export const createRubricHandler: RequestHandler = async (req, res, next) => {
  try {
    const creatorId = req.user?.sub; // ID of the STAFF user
    const rubricData = req.body as z.infer<typeof createRubricSchema>['body'];

    if (!creatorId) {
      return next({ status: 401, message: 'Unauthorized: Creator ID not found' });
    }

    // Call the service to create the rubric
    const newRubric = await rubricService.createRubric(
      creatorId,
      rubricData
    );

    // Send back the newly created rubric
    res.status(201).json(newRubric);

  } catch (error) {
    next(error);
  }
};