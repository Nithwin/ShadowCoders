import { z } from "zod";
import { TimingMode, SectionLockPolicy, ExamStatus } from "@prisma/client";

export const createExamSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().optional(),

    startAt: z.string().datetime({ message: "Invalid start date-time format" }),
    endAt: z.string().datetime({ message: "Invalid end date-time format" }),

    durationMins: z
      .number()
      .int()
      .min(1, { message: "Duration must be a positive integer" }),

    timingMode: z.nativeEnum(TimingMode, {
      message: "Invalid timing mode",
    }),
    sectionLockPolicy: z.nativeEnum(SectionLockPolicy, {
      message: "Invalid section lock policy",
    }),

    randomizeQuestions: z.boolean().optional(),
    negativeMarkPerWrong: z.number().optional(),
    maxAttempts: z.number().int().min(1).nullable().optional(), // null means unlimited, 1+ means limited
    maxTabSwitches: z.number().int().min(0).nullable().optional(), // null means unlimited
    allowedLanguages: z.array(z.string()).optional(), // Array of allowed programming languages
    releaseResults: z.boolean().optional().default(true),
    enableProctoring: z.boolean().optional().default(false),
    mode: z.enum(['STANDARD', 'DYNAMIC']).optional().default('STANDARD'),
    dynamicQuestionCount: z.number().int().min(1).optional().default(5),
    dynamicTopics: z.array(z.string()).optional(),
    generationPrompt: z.string().optional(),
  }),
});

export const assignExamSchema = z.object({
  body: z
    .object({
      assignToAll: z.boolean().optional(),
      cohortYear: z.number().int().min(1).max(6).optional(),
      cohortDepartment: z.string().max(50).optional(),
      cohortSection: z.string().max(10).optional(),
      // Accept either student IDs (CUIDs) or reg_no (registration numbers)
      studentIds: z.array(z.string()).max(1000).optional(),
      // Accept reg_no list (comma-separated string or array)
      // Transform string to array, or keep array as is
      regNos: z.preprocess(
        (val) => {
          if (!val) return undefined;
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            // Split comma-separated string and trim
            const regNos = val.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
            return regNos.length > 0 ? regNos : undefined;
          }
          return undefined;
        },
        z.array(z.string()).max(1000).optional()
      ),
    })
    .refine(
      (data) => {
        const hasCohort =
          data.cohortYear || data.cohortDepartment || data.cohortSection;
        const hasStudentIds = data.studentIds && data.studentIds.length > 0;
        const hasRegNos = data.regNos && Array.isArray(data.regNos) && data.regNos.length > 0;
        return data.assignToAll === true || hasCohort || hasStudentIds || hasRegNos;
      },
      {
        message:
          "Assignment requires setting assignToAll, providing cohort details, a list of student IDs, or registration numbers",
      }
    )
    .refine(
      (data) => {
        const hasCohort =
          data.cohortYear || data.cohortDepartment || data.cohortSection;
        const hasStudentIds = data.studentIds && data.studentIds.length > 0;
        const hasRegNos = data.regNos && Array.isArray(data.regNos) && data.regNos.length > 0;
        if (data.assignToAll === true) {
          return !(hasCohort || hasStudentIds || hasRegNos);
        }
        // Cannot have both cohort and studentIds/regNos, and cannot have both studentIds and regNos
        if (hasCohort && (hasStudentIds || hasRegNos)) return false;
        if (hasStudentIds && hasRegNos) return false;
        return true;
      },
      {
        message:
          "Cannot use assignToAll with other assignment methods, or mix cohort with specific student IDs/registration numbers, or mix student IDs with registration numbers",
      }
    ),
});

export const listExamsSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1, "Page must be at least 1")
      .optional()
      .default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, "Page size must be at least 1")
      .max(100, "Page size cannot exceed 100")
      .optional()
      .default(10),
    status: z.enum([...Object.values(ExamStatus), 'ALL'] as const).optional().default('ALL'),
    q: z.string().optional(),
  }),
});

const studentExamFilter = z.enum(["UPCOMING", "LIVE", "COMPLETED"]).optional();
export const studentListExamsSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1, "Page number must be 1 or greater")
      .optional()
      .default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, "Page size must be at least 1")
      .max(100, "Page size cannot exceed 100")
      .optional()
      .default(10),
    filter: studentExamFilter,
    q: z.string().optional(),
  }),
});

export const updateExamSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .optional(),
      description: z.string().optional(),
      startAt: z
        .string()
        .datetime({ message: "Invalid start date-time format" })
        .optional(),
      endAt: z
        .string()
        .datetime({ message: "Invalid end date-time format" })
        .optional(),
      durationMins: z
        .number()
        .int()
        .positive("Duration must be a positive integer")
        .optional(),
      timingMode: z
        .nativeEnum(TimingMode, {
          message: "Invalid timing mode",
        })
        .optional(),
      sectionLockPolicy: z
        .nativeEnum(SectionLockPolicy, {
          message: "Invalid section lock policy",
        })
        .optional(),
      randomizeQuestions: z.boolean().optional(),
      negativeMarkPerWrong: z.number().optional(),
      maxAttempts: z.number().int().min(1).nullable().optional(), // null means unlimited, 1+ means limited
      maxTabSwitches: z.number().int().min(0).nullable().optional(), // null means unlimited
      allowedLanguages: z.array(z.string()).optional(), // Array of allowed programming languages
      releaseResults: z.boolean().optional(),
      enableProctoring: z.boolean().optional(),
      mode: z.enum(['STANDARD', 'DYNAMIC']).optional(),
      dynamicQuestionCount: z.number().int().min(1).optional(),
      dynamicTopics: z.array(z.string()).optional(),
      generationPrompt: z.string().optional(),
    })
    // Add a refinement to ensure if both dates are sent, start is before end
    .refine(
      (data) => {
        if (data.startAt && data.endAt) {
          return new Date(data.startAt) < new Date(data.endAt);
        }
        return true; // Pass if one or both are missing
      },
      {
        message: "Exam start date must be before the end date",
        path: ["startAt"], // Report error on the startAt field
      }
    ),
});
