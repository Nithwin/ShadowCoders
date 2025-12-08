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
  }),
});

export const assignExamSchema = z.object({
  body: z
    .object({
      assignToAll: z.boolean().optional(),
      cohortYear: z.number().int().min(1).max(6).optional(),
      cohortDepartment: z.string().max(50).optional(),
      cohortSection: z.string().max(10).optional(),
      studentIds: z.array(z.string().cuid()).max(1000).optional(),
    })
    .refine(
      (data) => {
        const hasCohort =
          data.cohortYear || data.cohortDepartment || data.cohortSection;
        const hasStudentIds = data.studentIds && data.studentIds.length > 0;
        return data.assignToAll === true || hasCohort || hasStudentIds;
      },
      {
        message:
          "Assignment requires setting assignToAll, providing cohort details, or a list of student IDs",
      }
    )
    .refine(
      (data) => {
        const hasCohort =
          data.cohortYear || data.cohortDepartment || data.cohortSection;
        const hasStudentIds = data.studentIds && data.studentIds.length > 0;
        if (data.assignToAll === true) {
          return !(hasCohort || hasStudentIds);
        }
        return !(hasCohort && hasStudentIds); // Cannot have both cohort and studentIds
      },
      {
        message:
          "Cannot use assignToAll with other assignment methods, or mix cohort with specific student IDs",
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
