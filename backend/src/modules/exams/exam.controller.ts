import { RequestHandler } from "express";
import * as examService from './exam.service';
import { listExamsSchema, studentListExamsSchema } from './exam.zod';
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
        const queryParams = req.query as unknown as z.infer<typeof listExamsSchema>['query'];
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

        const queryParams = req.query as unknown as z.infer<typeof studentListExamsSchema>['query'];
        const result = await examService.listExamsForStudent(studentId, queryParams);
        res.status(200).json(result);
    } catch(error){
        next(error);
    }
}