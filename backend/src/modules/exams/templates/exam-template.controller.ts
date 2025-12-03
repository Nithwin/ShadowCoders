import { Request, Response } from "express";
import * as templateService from "./exam-template.service";

export const createTemplateFromExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { title, description, isPublic } = req.body;
    const userId = (req as any).user.sub;

    if (!examId) throw { status: 400, message: "Exam ID is required" };

    const template = await templateService.createTemplateFromExam(examId, userId, {
      title,
      description,
      isPublic,
    });

    res.status(201).json(template);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const createExamFromTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { title, startAt, endAt } = req.body;
    const userId = (req as any).user.sub;

    if (!templateId) throw { status: 400, message: "Template ID is required" };

    const exam = await templateService.createExamFromTemplate(templateId, userId, {
      title,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    });

    res.status(201).json(exam);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const listTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.sub;
    const result = await templateService.listTemplates(userId, req.query);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const userId = (req as any).user.sub;
    
    if (!templateId) throw { status: 400, message: "Template ID is required" };

    await templateService.deleteTemplate(templateId, userId);
    res.json({ message: "Template deleted successfully" });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    
    if (!templateId) throw { status: 400, message: "Template ID is required" };

    const template = await templateService.getTemplateById(templateId);
    res.json(template);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
