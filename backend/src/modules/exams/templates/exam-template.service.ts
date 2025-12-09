import { Prisma } from "@prisma/client";
import * as templateRepo from "./exam-template.repo";
import * as examRepo from "../exam.repo";
import * as sectionRepo from "../../sections/section.repo";
import * as questionRepo from "../../questions/question.repo";
import { prisma } from "../../../lib/prisma";

export const createTemplateFromExam = async (
  examId: string,
  userId: string,
  metadata: { title: string; description?: string; isPublic: boolean }
) => {
  // 1. Fetch full exam details
  const exam = await examRepo.findExamById(examId);
  if (!exam) {
    throw { status: 404, message: "Exam not found" };
  }

  // 2. Extract structure (sections, questions, settings)
  // Helper to sanitize data for JSON storage (handle Decimals, Dates, etc)
  const sanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'function') return undefined;
    if (typeof obj !== 'object') return obj;
    
    // Handle Date
    if (obj instanceof Date) return obj.toISOString();
    
    // Handle Decimal (Prisma)
    if (typeof obj.toNumber === 'function') return obj.toNumber();
    if (typeof obj.toString === 'function' && obj.constructor.name === 'Decimal') return obj.toString();

    // Handle Array
    if (Array.isArray(obj)) return obj.map(sanitize);

    // Handle Object
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = sanitize(obj[key]);
        if (value !== undefined) {
          result[key] = value;
        }
      }
    }
    return result;
  };

  // Identify questions used in sections
  const sectionQuestionIds = new Set<string>();
  exam.sections.forEach((section) => {
    section.sectionQuestions.forEach((sq) => {
      sectionQuestionIds.add(sq.questionId);
    });
  });

  // Filter for top-level questions (not in any section)
  const topLevelQuestions = exam.questions.filter(
    (q) => !sectionQuestionIds.has(q.id)
  );

  const structure = sanitize({
    durationMins: exam.durationMins,
    timingMode: exam.timingMode,
    sectionLockPolicy: exam.sectionLockPolicy,
    randomizeQuestions: exam.randomizeQuestions,
    negativeMarkPerWrong: exam.negativeMarkPerWrong,
    maxAttempts: exam.maxAttempts,
    maxTabSwitches: exam.maxTabSwitches,
    allowedLanguages: exam.allowedLanguages,
    questions: topLevelQuestions.map((q) => ({
      ...q,
      order: q.order,
    })),
    sections: exam.sections.map((section) => ({
      title: section.title,
      order: section.order,
      description: section.description,
      durationMins: section.durationMins,
      questions: section.sectionQuestions.map((sq) => ({
        ...sq.question,
        order: sq.order, // Use order from section link
      })),
    })),
  });

  console.log("Creating template with structure:", JSON.stringify(structure, null, 2));

  // 3. Create template
  try {
    return await templateRepo.createTemplate({
      title: metadata.title,
      description: metadata.description || null,
      isPublic: metadata.isPublic,
      structure: structure as Prisma.InputJsonValue,
      creator: { connect: { id: userId } },
    });
  } catch (error) {
    console.error("Error in templateRepo.createTemplate:", error);
    throw error;
  }
};

export const createExamFromTemplate = async (
  templateId: string,
  userId: string,
  examData: { title: string; startAt: Date; endAt: Date }
) => {
  // 1. Fetch template
  const template = await templateRepo.findTemplateById(templateId);
  if (!template) {
    throw { status: 404, message: "Template not found" };
  }

  const structure = template.structure as any;

  // 2. Create new exam with template settings
  const newExam = await examRepo.createExam({
    title: examData.title,
    description: template.description, // Inherit description
    startAt: examData.startAt,
    endAt: examData.endAt,
    durationMins: structure.durationMins,
    timingMode: structure.timingMode,
    sectionLockPolicy: structure.sectionLockPolicy,
    randomizeQuestions: structure.randomizeQuestions,
    negativeMarkPerWrong: structure.negativeMarkPerWrong,
    maxAttempts: structure.maxAttempts ?? 1, // Default to 1 if not present
    maxTabSwitches: structure.maxTabSwitches ?? 1, // Default to 1 if not present
    allowedLanguages: structure.allowedLanguages,
    status: "DRAFT",
  });

  // 3. Recreate sections and questions
  // Note: We need to clone questions because they are unique entities
  if (structure.sections) {
    for (const sectionData of structure.sections) {
      const newSection = await sectionRepo.createSection(newExam.id, {
        title: sectionData.title,
        order: sectionData.order,
        description: sectionData.description,
        durationMins: sectionData.durationMins,
      });

      for (const questionData of sectionData.questions) {
        // Create a copy of the question
        const { id, examId, createdAt, updatedAt, ...questionProps } = questionData;
        
        // Create question directly (bypassing service to avoid overhead)
        const newQuestion = await prisma.question.create({
          data: {
            ...questionProps,
            examId: newExam.id,
            order: questionData.order, // Use preserved order
          },
        });

        // Link to section
        await prisma.sectionQuestion.create({
          data: {
            sectionId: newSection.id,
            questionId: newQuestion.id,
            order: questionData.order,
          },
        });
      }
    }
  }

  // 4. Recreate top-level questions (not in sections)
  if (structure.questions && Array.isArray(structure.questions)) {
    for (const questionData of structure.questions) {
      const { id, examId, createdAt, updatedAt, ...questionProps } = questionData;
      
      await prisma.question.create({
        data: {
          ...questionProps,
          examId: newExam.id,
          order: questionData.order,
        },
      });
    }
  }

  return newExam;
};

export const listTemplates = async (userId: string, query: any) => {
  return templateRepo.listTemplates({
    userId,
    isPublic: query.isPublic === 'true',
    searchQuery: query.q,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 10,
  });
};

export const deleteTemplate = async (templateId: string, userId: string) => {
  const template = await templateRepo.findTemplateById(templateId);
  if (!template) {
    throw { status: 404, message: "Template not found" };
  }

  if (template.createdBy !== userId) {
    throw { status: 403, message: "You can only delete your own templates" };
  }

  return templateRepo.deleteTemplate(templateId);
};

export const getTemplateById = async (templateId: string) => {
  const template = await templateRepo.findTemplateById(templateId);
  if (!template) {
    throw { status: 404, message: "Template not found" };
  }
  return template;
};
