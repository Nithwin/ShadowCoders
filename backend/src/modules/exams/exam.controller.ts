import { RequestHandler } from "express";
import * as examService from './exam.service';
import { listExamsSchema, studentListExamsSchema, updateExamSchema } from './exam.zod';
import { z } from 'zod';

export const createExamHandler: RequestHandler = async (req,res,next) => {
    try{
        const newExam = await examService.createExam(req.body);
        res.status(201).json(newExam);
    } catch(error){
        next(error);
    }
}

export const assignExamHandler: RequestHandler = async (req,res,next) => {
    try{
        const examId = req.params.examId;
        const assignmentData = req.body;

        if(!examId){
            return res.status(400).json({ error: 'Exam ID is required' });
        }

        const assignment = await examService.assignExam(examId, assignmentData);
        
        res.status(201).json(assignment);
    } catch(error){
        next(error);
    }
}

export const publishExamHandler: RequestHandler = async (req,res,next) => {
    try{
        const examId = req.params.examId;

        if(!examId){
            return res.status(400).json({ error: 'Exam ID is required' });
        }

        const updatedExam = await examService.pubishExam(examId);
        res.status(200).json(updatedExam);
    }
    catch(error){
        next(error);
    }
}

export const listExamsHandler: RequestHandler = async (req,res,next) => {
    try{
        const queryParams = req.validatedData?.query as z.infer<typeof listExamsSchema>['query'];
        const result = await examService.listExams(queryParams);
        res.status(200).json(result);
    } catch(error){
        next(error);
    }
}

export const listExamsForStudentHandler: RequestHandler = async (req,res,next) => {

    try{
        const studentId = req.user?.sub;
        if(!studentId){
            return next({ status: 401, message: 'Unauthorized' });
        }

        const queryParams = req.validatedData?.query as z.infer<typeof studentListExamsSchema>['query'];
        const result = await examService.listExamsForStudent(studentId, queryParams);
        res.status(200).json(result);
    } catch(error){
        next(error);
    }
}

export const updateExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    // Get the validated data from the body
    const examData = req.body as z.infer<typeof updateExamSchema>['body'];

    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    // Call the service to update the exam
    const updatedExam = await examService.updateExam(examId, examData);

    // Send back the updated exam details
    res.status(200).json(updatedExam);

  } catch (error) {
    next(error);
  }
};

export const deleteExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }

    const result = await examService.deleteExam(examId);

    // Send a 200 OK or 204 No Content response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};