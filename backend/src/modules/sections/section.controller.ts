import { RequestHandler } from 'express';
import * as sectionService from './section.service';
import { z } from 'zod';
import { addQuestionsToSectionSchema, createSectionSchema, updateSectionSchema } from './section.zod';

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

export const updateSectionHandler: RequestHandler = async (req, res, next) => {
  try {
    const sectionId = req.params.sectionId;
    const updateData = req.body as z.infer<typeof updateSectionSchema>['body'];

    if (!sectionId) {
      return next({ status: 400, message: 'Section ID parameter is required' });
    }

    const updatedSection = await sectionService.updateSection(
      sectionId,
      updateData
    );

    res.status(200).json(updatedSection);
  } catch (error) {
    next(error);
  }
};

export const deleteSectionHandler: RequestHandler = async (req, res, next) => {
  try {
    const sectionId = req.params.sectionId;

    if (!sectionId) {
      return next({ status: 400, message: 'Section ID parameter is required' });
    }

    const result = await sectionService.deleteSection(sectionId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const removeQuestionFromSectionHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { sectionId, questionId } = req.params;

    if (!sectionId || !questionId) {
      return next({
        status: 400,
        message: 'Section ID and Question ID are required',
      });
    }

    const result = await sectionService.removeQuestionFromSection(
      sectionId,
      questionId
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const listSectionsForExamHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const examId = req.params.examId;

    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    const sections = await sectionService.listSectionsForExam(examId);
    res.status(200).json(sections);
  } catch (error) {
    next(error);
  }
};