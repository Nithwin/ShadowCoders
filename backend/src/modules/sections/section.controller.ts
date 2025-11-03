import { RequestHandler } from 'express';
import * as sectionService from './section.service';
import { z } from 'zod';
import { addQuestionsToSectionSchema, createSectionSchema } from './section.zod';

export const createSectionHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId; // Get examId from the URL
    const sectionData = req.body as z.infer<typeof createSectionSchema>['body'];

    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    // Call the service to create the section
    const newSection = await sectionService.createSection(examId, sectionData);

    // Send back the newly created section
    res.status(201).json(newSection);

  } catch (error) {
    next(error);
  }
};

export const addQuestionsToSectionHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const sectionId = req.params.sectionId; // Get sectionId from the URL
    const { questions } = req.body as z.infer<
      typeof addQuestionsToSectionSchema
    >['body'];

    if (!sectionId) {
      return next({ status: 400, message: 'Section ID parameter is required' });
    }

    // Call the service
    const result = await sectionService.addQuestionsToSection(sectionId, questions);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};