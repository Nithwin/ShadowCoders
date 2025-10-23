import { RequestHandler } from "express";
import * as examService from './exam.service';

export const createExamHandler: RequestHandler = async (req,res,next) => {
    try{
        const newExam = await examService.createExam(req.body);
        res.status(201).json(newExam);
    } catch(error){
        next(error);
    }
}