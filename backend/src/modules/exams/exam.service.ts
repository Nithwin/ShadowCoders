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
import * as userRepo from '../auth/auth.repo'; 
import { prisma } from '../../lib/prisma';
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
  const dataToSave = {
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
  };

  const newExam = await examRepo.createExam(dataToSave);
  
  // Create default sections automatically
  await createDefaultSections(newExam.id);
  
  return newExam;
};

type AssignExamInput = z.infer<typeof assignExamSchema>["body"];

export const assignExam = async (examId: string, input: AssignExamInput) => {
  const dataToSave = {
    assignToAll: input.assignToAll ?? false,
    cohortYear: input.cohortYear ?? null,
    cohortDepartment: input.cohortDepartment ?? null,
    cohortSection: input.cohortSection ?? null,
    studentIds: input.studentIds
      ? (input.studentIds as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };
  const assignment = await examRepo.createExamAssignment(examId, dataToSave);
  return assignment;
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
    // Check if student has any submitted attempts
    const submittedAttempts = exam.attempts?.filter(a => a.status === 'SUBMITTED') || [];
    const hasCompletedAttempt = submittedAttempts.length > 0;
    const latestAttempt = exam.attempts && exam.attempts.length > 0 ? exam.attempts[0] : null;
    
    // Remove attempts from response (we only needed it for checking)
    const { attempts, ...examData } = exam;
    return {
      ...examData,
      hasAttempt: hasCompletedAttempt,
      attemptId: latestAttempt?.id || null,
      attemptStatus: latestAttempt?.status || null,
      attemptCount: exam.attempts?.length || 0,
      submittedAttemptCount: submittedAttempts.length,
      latestScore: latestAttempt?.score ? Number(latestAttempt.score) : null,
      latestMaxScore: latestAttempt?.maxScore ? Number(latestAttempt.maxScore) : null,
    };
  });

  // 5. Adjust totalCount for LIVE filter (since we filter in service layer)
  // For LIVE, the actual count is the filtered exams count
  // But we need to recalculate totalPages based on the actual filtered count
  // Since we're doing pagination at DB level, we'll use the original totalCount
  // but note that for LIVE, the actual visible count might be less
  const adjustedTotalCount = filter === "LIVE" 
    ? examsWithAttemptStatus.length // For LIVE, use filtered count (approximate)
    : totalCount;

  // 6. Return the data and metadata
  return {
    data: examsWithAttemptStatus,
    meta: {
      page,
      pageSize,
      totalCount: adjustedTotalCount,
      totalPages: Math.ceil(adjustedTotalCount / pageSize),
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
  const exam = await examRepo.findExamById(examId);
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
      await sectionRepo.createSection(examId, {
        title: section.title,
        order: section.order,
        description: section.description,
        durationMins: null,
      });
    }
  }
};

/**
 * Fetches a single exam's details for editing.
 * Ensures default sections exist before returning.
 */
export const getExamById = async (examId: string) => {
  const exam = await examRepo.findExamById(examId);
  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }
  
  // Ensure default sections exist
  await ensureDefaultSections(examId);
  
  // Fetch again to get the sections
  return await examRepo.findExamById(examId);
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