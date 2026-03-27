import { z } from 'zod';
import {
  createExamSchema,
  assignExamSchema,
  listExamsSchema,
  studentListExamsSchema,
  updateExamSchema,
} from "./exam.zod";
import * as examRepo from "./exam.repo";
import { ExamStatus, Prisma, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import * as userRepo from '../auth/auth.repo'; 
import * as sectionRepo from '../sections/section.repo';

type CreateExamInput = z.infer<typeof createExamSchema>["body"];

/**
 * Creates default sections for an exam: Coding, MCQ, and Essay
 */
const createDefaultSections = async (examId: string) => {
  const defaultSections = [
    { title: 'Multiple Choice', order: 1, description: 'Answer multiple choice questions' },
    { title: 'Coding', order: 2, description: 'Solve coding problems' },
    { title: 'Essay', order: 3, description: 'Write essay responses' },
  ];

  for (const section of defaultSections) {
    await sectionRepo.createSection(examId, {
      title: section.title,
      order: section.order,
      description: section.description,
      durationMins: null,
    });
  }
};

export const createExam = async (input: CreateExamInput) => {
  if (new Date(input.startAt) >= new Date(input.endAt)) {
    throw {
      status: 400,
      message: "Exam start date must be before the end date",
    };
  }
  const dataToSave: Prisma.ExamCreateInput = {
    ...input,
    description: input.description ?? null,
    negativeMarkPerWrong: input.negativeMarkPerWrong ?? null,
    maxAttempts: input.maxAttempts ?? null, // null means unlimited
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    timingMode: input.timingMode,
    sectionLockPolicy: input.sectionLockPolicy,
    randomizeQuestions: input.randomizeQuestions ?? false,
    allowedLanguages: input.allowedLanguages ? (input.allowedLanguages as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    maxTabSwitches: input.maxTabSwitches ?? null,
    enableProctoring: input.enableProctoring ?? false,
    dynamicTopics: input.dynamicTopics ?? [],
    generationPrompt: input.generationPrompt ?? null,
  };

  const newExam = await examRepo.createExam(dataToSave);
  
  // Create default sections automatically
  await createDefaultSections(newExam.id);

  // --- Auto-generation removed by request ---
  // Questions will only be generated via manual trigger
  
  
  return newExam;
};

type AssignExamInput = z.infer<typeof assignExamSchema>["body"];

export const assignExam = async (examId: string, input: AssignExamInput) => {
  let studentIds: string[] | null = null;
  
  // If regNos are provided, convert them to student IDs
  if (input.regNos && Array.isArray(input.regNos) && input.regNos.length > 0) {
    // Normalize regNos to lowercase for case-insensitive matching
    const normalizedRegNos = input.regNos.map(regNo => regNo.toLowerCase().trim());
    
    // Use case-insensitive matching with OR conditions since PostgreSQL's 'in' operator is case-sensitive
    // Prisma doesn't support mode: 'insensitive' with 'in', so we use OR with equals
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        OR: normalizedRegNos.map(regNo => ({
          reg_no: {
            equals: regNo,
            mode: 'insensitive',
          },
        })),
      },
      select: {
        id: true,
        reg_no: true,
      },
    });
    
    // Check for invalid reg_nos (case-insensitive comparison)
    const foundRegNosLower = new Set(students.map(s => s.reg_no?.toLowerCase()));
    const invalidRegNos = input.regNos.filter(regNo => !foundRegNosLower.has(regNo.toLowerCase().trim()));
    
    if (invalidRegNos.length > 0) {
      throw {
        status: 400,
        message: `Invalid registration numbers: ${invalidRegNos.join(', ')}. Please check the format (e.g., 22cs001).`,
      };
    }
    
    studentIds = students.map(s => s.id);
  } else if (input.studentIds && input.studentIds.length > 0) {
    // Use provided student IDs directly
    studentIds = input.studentIds;
  }
  
  const dataToSave = {
    assignToAll: input.assignToAll ?? false,
    cohortYear: input.cohortYear ?? null,
    cohortDepartment: input.cohortDepartment ?? null,
    cohortSection: input.cohortSection ?? null,
    studentIds: studentIds
      ? (studentIds as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };
  const assignment = await examRepo.createExamAssignment(examId, dataToSave);
  return assignment;
};

export const deleteAssignment = async (examId: string, assignmentId: string) => {
  // Check if exam exists? (Optional, but good practice)
  const exam = await examRepo.findExamById(examId);
  if (!exam) {
    throw { status: 404, message: "Exam not found" };
  }
  
  // Delete the assignment
  try {
    await examRepo.deleteExamAssignment(assignmentId);
    return { message: "Assignment deleted successfully" };
  } catch (error) {
    // Check if error is "Record to delete does not exist"
    throw { status: 404, message: "Assignment not found" };
  }
};

export const pubishExam = async (examId: string) => {
  const exam = await examRepo.findExamById(examId);

  if (!exam) {
    throw {
      status: 404,
      message: "Exam not found",
    };
  }

  if (exam.status !== ExamStatus.DRAFT) {
    throw {
      status: 400,
      message: `Exam cannot be published. Current status: ${exam.status}`,
    };
  }

  if (!exam.assignments || exam.assignments.length === 0) {
    throw {
      status: 400,
      message: "Exam cannot be published. You must assign it to at least one student or cohort first.",
    };
  }

  const updatedExam = await examRepo.updateExamStatus(
    examId,
    ExamStatus.PUBLISHED
  );
  return updatedExam;
};

type ListExamQuery = z.infer<typeof listExamsSchema>["query"];

export const listExams = async (query: ListExamQuery) => {
  const { page, pageSize, status, q } = query;

  const repoParams: {
    page: number;
    pageSize: number;
    status?: ExamStatus;
    searchQuery?: string;
  } = {
    page,
    pageSize,
  };

  if (status && status !== 'ALL') {
    repoParams.status = status;
  }

  if (q) {
    repoParams.searchQuery = q;
  }

  const { exams, totalCount } = await examRepo.listExams(repoParams);

  const processedExams = exams.map(exam => ({
    ...exam,
    negativeMarkPerWrong: exam.negativeMarkPerWrong?.toString() ?? null,
  }));

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: processedExams,
    meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
    }
  };
};

type StudentListExamsQuery = z.infer<typeof studentListExamsSchema>['query'];

export const listExamsForStudent = async (studentId: string, query: StudentListExamsQuery) => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const { filter, q } = query;

  // 1. Fetch the student's details (needed for cohort matching)
  const student = await userRepo.findStudentWithCohortInfo(studentId);
  
  if (!student) {
    throw { status: 404, message: 'Student not found' };
  }

  // 2. Call the repository to get exams and the total count
  const { exams, totalCount } = await examRepo.listExamsForStudent({
    student: {
      id: student.id,
      year: student.year, 
      department: student.department,
      section: student.section,
    },
    ...(filter && { filter }),
    ...(q && { searchQuery: q }),
    page,
    pageSize,
  });

  // 3. Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / pageSize);

  // 4. Transform exams to include attempt status and filter LIVE exams
  let examsToReturn = exams;
  
  // For LIVE filter, filter out exams where student has reached max attempts
  if (filter === "LIVE") {
    examsToReturn = exams.filter((exam) => {
      const submittedAttempts = exam.attempts?.filter(a => a.status === 'SUBMITTED') || [];
      const submittedCount = submittedAttempts.length;
      
      // If maxAttempts is null/undefined, unlimited attempts allowed - always show
      if (exam.maxAttempts === null || exam.maxAttempts === undefined) {
        return true;
      }
      
      // If maxAttempts is set, only show if student hasn't reached the limit
      return submittedCount < exam.maxAttempts;
    });
  }
  
  const examsWithAttemptStatus = examsToReturn.map((exam) => {
    // Ensure attempts are sorted by attemptNo descending (latest first)
    const sortedAttempts = exam.attempts?.sort((a, b) => b.attemptNo - a.attemptNo) || [];
    
    // Check if student has any submitted attempts
    const submittedAttempts = sortedAttempts.filter(a => a.status === 'SUBMITTED');
    const hasCompletedAttempt = submittedAttempts.length > 0;
    const latestAttempt = sortedAttempts.length > 0 ? sortedAttempts[0] : null;
    
    // Remove attempts from response (we only needed it for checking)
    const { attempts, ...examData } = exam;
    return {
      ...examData,
      hasAttempt: hasCompletedAttempt,
      attemptId: latestAttempt?.id || null,
      attemptStatus: latestAttempt?.status || null,
      attemptCount: sortedAttempts.length,
      submittedAttemptCount: submittedAttempts.length,
      latestScore: latestAttempt?.score ? parseFloat(String(latestAttempt.score)) : null,
      latestMaxScore: latestAttempt?.maxScore ? parseFloat(String(latestAttempt.maxScore)) : null,
    };
  });

  // 5. Return the data and metadata
  // Note: For LIVE filter, we filter after DB pagination so the count is approximate.
  // We keep totalCount from DB (pre-filter) as a reasonable upper bound for pagination.
  // This ensures pagination controls remain stable even though some pages may have
  // fewer items than pageSize.
  return {
    data: examsWithAttemptStatus,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
};



type UpdateExamInput = z.infer<typeof updateExamSchema>['body'];

export const updateExam = async (examId: string, input: UpdateExamInput) => {
  // 1. --- Validation ---
  const existingExam = await examRepo.findExamById(examId);
  if (!existingExam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // 2. --- Prepare Data for Repository ---
  // Manually build the update object to satisfy exactOptionalPropertyTypes
  const dataToUpdate: Prisma.ExamUpdateInput = {};

  if (input.title !== undefined) {
    dataToUpdate.title = input.title;
  }
  if (input.description !== undefined) {
    dataToUpdate.description = input.description ?? null;
  }
  if (input.startAt !== undefined) {
    dataToUpdate.startAt = new Date(input.startAt);
  }
  if (input.endAt !== undefined) {
    dataToUpdate.endAt = new Date(input.endAt);
  }
  if (input.durationMins !== undefined) {
    dataToUpdate.durationMins = input.durationMins;
  }
  if (input.timingMode !== undefined) {
    dataToUpdate.timingMode = input.timingMode;
  }
  if (input.sectionLockPolicy !== undefined) {
    dataToUpdate.sectionLockPolicy = input.sectionLockPolicy;
  }
  if (input.randomizeQuestions !== undefined) {
    dataToUpdate.randomizeQuestions = input.randomizeQuestions;
  }
  if (input.negativeMarkPerWrong !== undefined) {
    dataToUpdate.negativeMarkPerWrong = input.negativeMarkPerWrong ?? null;
  }
  if (input.maxAttempts !== undefined) {
    dataToUpdate.maxAttempts = input.maxAttempts ?? null; // null means unlimited
  }
  if (input.allowedLanguages !== undefined) {
    dataToUpdate.allowedLanguages = input.allowedLanguages ? (input.allowedLanguages as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
  }
  if (input.maxTabSwitches !== undefined) {
    dataToUpdate.maxTabSwitches = input.maxTabSwitches ?? null;
  }
  if (input.enableProctoring !== undefined) {
    dataToUpdate.enableProctoring = input.enableProctoring;
  }
  if (input.releaseResults !== undefined) {
    dataToUpdate.releaseResults = input.releaseResults;
  }
  if (input.mode !== undefined) {
    dataToUpdate.mode = input.mode;
  }
  if (input.dynamicQuestionCount !== undefined) {
    dataToUpdate.dynamicQuestionCount = input.dynamicQuestionCount;
  }
  if (input.dynamicTopics !== undefined) {
    dataToUpdate.dynamicTopics = input.dynamicTopics;
  }
  if (input.generationPrompt !== undefined) {
    dataToUpdate.generationPrompt = input.generationPrompt ?? null;
  }

  const effectiveTimingMode = input.timingMode ?? existingExam.timingMode;
  if (effectiveTimingMode === 'BOTH') {
    const configuredDurations = (existingExam.sections || [])
      .map((section) => section.durationMins)
      .filter((duration): duration is number => typeof duration === 'number' && duration > 0);

    if (configuredDurations.length > 0) {
      dataToUpdate.durationMins = configuredDurations.reduce((sum, mins) => sum + mins, 0);
    }
  }


  // 3. --- Call Repository ---
  // Note: We allow editing even if the exam is published
  // Admin should be aware that changes might affect active attempts
  const updatedExam = await examRepo.updateExam(examId, dataToUpdate);

  return updatedExam;
};

export const deleteExam = async (examId: string, force: boolean = false) => {
  // 1. --- Validation: Check if the exam exists ---
  const existingExam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      _count: {
        select: { attempts: true, questions: true }, // Count attempts and questions
      },
    },
  });

  if (!existingExam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // 2. --- Business Logic: Allow deletion even with attempts if force is true ---
  // If force is false and there are attempts, warn but don't block
  // The frontend should show a warning, but backend allows it
  if (!force && existingExam._count.attempts > 0) {
    // Just log a warning, but allow deletion
    console.warn(`⚠️ Deleting exam ${examId} with ${existingExam._count.attempts} attempts. This will delete all attempts and results.`);
  }

  // 3. --- Call Repository to delete exam and all related data ---
  // This will cascade delete attempts, responses, questions, etc.
  await examRepo.deleteExamAndChildren(examId);

  return { 
    message: `Exam and all related data deleted successfully. ${existingExam._count.attempts} attempts were deleted.`,
    deletedAttempts: existingExam._count.attempts,
  };
};

/**
 * Ensures default sections exist for an exam (creates them if missing)
 */
export const ensureDefaultSections = async (examId: string) => {
  // Optimization: Don't fetch the full heavy exam object, just check existence
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Check if sections already exist
  const existingSections = await prisma.examSection.findMany({
    where: { examId },
    select: { title: true },
  });

  const existingTitles = new Set(existingSections.map(s => s.title));
  const defaultSections = [
    { title: 'Multiple Choice', order: 1, description: 'Answer multiple choice questions' },
    { title: 'Coding', order: 2, description: 'Solve coding problems' },
    { title: 'Essay', order: 3, description: 'Write essay responses' },
  ];

  // Create missing sections
  for (const section of defaultSections) {
    if (!existingTitles.has(section.title)) {
      try {
        await sectionRepo.createSection(examId, {
          title: section.title,
          order: section.order,
          description: section.description,
          durationMins: null,
        });
      } catch (err) {
        console.error(`Failed to create default section ${section.title} for exam ${examId}:`, err);
        // Swallow error to avoid crashing the request
      }
    }
  }
};

/**
 * Fetches a single exam's details for editing.
 * Ensures default sections exist before returning.
 */
export const getExamById = async (examId: string) => {
  try {
    // Ensure default sections exist (swallow errors to prevent blocking read)
    try {
      await ensureDefaultSections(examId);
    } catch (e) {
      console.error('ensureDefaultSections failed:', e);
    }
    
    const exam = await examRepo.findExamById(examId);
    if (!exam) {
      throw { status: 404, message: 'Exam not found' };
    }
    
    return exam;
  } catch (error) {
    // Log fatal errors to file for debugging
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'error_log.txt');
      const logs = `\n[${new Date().toISOString()}] FATAL Error in getExamById: ${error instanceof Error ? error.stack : JSON.stringify(error)}`;
      fs.appendFileSync(logPath, logs);
    } catch (logErr) {
       console.error('Failed to write to log file:', logErr);
    }
    throw error;
  }
};

/**
 * Fetches a single exam's details for a student.
 * Checks if the student has access to the exam (assigned and published).
 */
export const getExamByIdForStudent = async (studentId: string, examId: string) => {
  // 1. Fetch the student's details (needed for cohort matching)
  const student = await userRepo.findStudentWithCohortInfo(studentId);
  
  if (!student) {
    throw { status: 404, message: 'Student not found' };
  }

  // 2. Fetch the exam using the same logic as listExamsForStudent
  const exam = await examRepo.findExamByIdForStudent({
    examId,
    student: {
      id: student.id,
      year: student.year,
      department: student.department,
      section: student.section,
    },
  });

  if (!exam) {
    throw { status: 404, message: 'Exam not found or not accessible' };
  }

  // 3. Return only the fields students need (no sensitive admin data)
  // The repo already includes hasAttempt and attemptId
  return exam;
};

// Manual trigger for generation
export const triggerManualGeneration = async (examId: string, customPrompt?: string) => {
  const exam = await examRepo.findExamById(examId);
  if (!exam) throw { status: 404, message: 'Exam not found' };
  
  if (exam.mode !== 'DYNAMIC' || !exam.dynamicTopics || exam.dynamicTopics.length === 0) {
    throw { status: 400, message: 'Exam is not dynamic or has no topics configured' };
  }

  const topic = exam.dynamicTopics[0];
  const count = exam.dynamicQuestionCount || 5;
  const promptToUse = customPrompt || exam.generationPrompt || undefined;

  // Run in background / detached
  import('../generation/generation.service').then(({ generationService }) => {
     console.log(`[ExamService] Manual generation trigger for Exam ${exam.id}`);
     if (typeof topic === 'string') {
        generationService.bulkGenerate(
           topic, 
           count, 
           ['EASY', 'MEDIUM', 'HARD'], 
           promptToUse,
           exam.id
        )
        .then(res => console.log(`[ExamService] Manual generation complete for ${exam.id}:`, res))
        .catch(err => console.error(`[ExamService] Manual generation failed for ${exam.id}:`, err));
     }
  }).catch(err => {
     console.error(`[ExamService] Failed to load generation service for ${exam.id}:`, err);
  });

  return { message: 'Generation started in background' };
};