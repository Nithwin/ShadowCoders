import { RequestHandler } from 'express';
import * as rubricService from './rubric.service';
import { z } from 'zod';
import { createRubricSchema, updateRubricSchema, listRubricsSchema } from './rubric.zod';

export const createRubricHandler: RequestHandler = async (req, res, next) => {
  try {
    const creatorId = req.user?.sub; // ID of the STAFF user
    const rubricData = req.validatedData?.body as z.infer<typeof createRubricSchema>['body'] || req.body;

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

export const listRubricsHandler: RequestHandler = async (req, res, next) => {
  try {
    const queryParams = req.validatedData?.query as z.infer<typeof listRubricsSchema>['query'];
    const result = await rubricService.listRubrics(queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getRubricByIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const rubricId = req.params.rubricId;
    if (!rubricId) {
      return next({ status: 400, message: 'Missing rubricId parameter' });
    }
    const rubric = await rubricService.getRubricById(rubricId);
    res.status(200).json(rubric);
  } catch (error) {
    next(error);
  }
};

export const updateRubricHandler: RequestHandler = async (req, res, next) => {
  try {
    const rubricId = req.params.rubricId;
    if (!rubricId) {
      return next({ status: 400, message: 'Missing rubricId parameter' });
    }
    const rubricData = req.validatedData?.body as z.infer<typeof updateRubricSchema>['body'] || req.body;
    const updatedRubric = await rubricService.updateRubric(rubricId, rubricData);
    res.status(200).json(updatedRubric);
  } catch (error) {
    next(error);
  }
};

export const deleteRubricHandler: RequestHandler = async (req, res, next) => {
  try {
    const rubricId = req.params.rubricId;
    if (!rubricId) {
      return next({ status: 400, message: 'Missing rubricId parameter' });
    }
    await rubricService.deleteRubric(rubricId);
    res.status(200).json({ message: 'Rubric deleted successfully' });
  } catch (error) {
    next(error);
  }
};