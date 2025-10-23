import { z } from 'zod';
import { TimingMode, SectionLockPolicy, ExamStatus } from '@prisma/client';

export const createExamSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    
    startAt: z.string().datetime({ message: 'Invalid start date-time format' }),
    endAt: z.string().datetime({ message: 'Invalid end date-time format' }),
    
    durationMins: z
      .number()
      .int()
      .min(1, { message: 'Duration must be a positive integer' }),

    timingMode: z.nativeEnum(TimingMode, {
      message: 'Invalid timing mode',
    }),
    sectionLockPolicy: z.nativeEnum(SectionLockPolicy, {
      message: 'Invalid section lock policy',
    }),

    randomizeQuestions: z.boolean().optional(),
    negativeMarkPerWrong: z.number().optional(),
  }),
});

export const assignExamSchema = z.object({
  body: z.object({
    cohortYear: z.number().int().min(1).max(6).optional(),
    cohortDepartment: z.string().max(50).optional(),
    cohortSection: z.string().max(10).optional(),
    studentIds: z.array(z.string().cuid()).max(1000).optional(),
  })
  .refine(
    (data) => {
      const hasCohort = data.cohortYear || data.cohortDepartment || data.cohortSection;
      const hasStudentIds = data.studentIds && data.studentIds.length > 0;
      return hasCohort || hasStudentIds; // Must have one or the other
    },
    { message: 'Assignment requires either cohort details or a list of student IDs' }
  )
  .refine(
    (data) => {
      const hasCohort = data.cohortYear || data.cohortDepartment || data.cohortSection;
      const hasStudentIds = data.studentIds && data.studentIds.length > 0;
      return !(hasCohort && hasStudentIds); // Cannot have both
    },
    { message: 'Cannot assign by both cohort and specific student IDs simultaneously' }
  ),
})

export const listExamsSchema = z.object({
  query: z.object({
    page:z.coerce
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
    pageSize: z.coerce
    .number()
    .int()
    .min(1, 'Page size must be at least 1')
    .max(100, 'Page size cannot exceed 100')
    .optional() 
    .default(10),
    status: z.enum(ExamStatus, {
      message: 'Invalid exam status filter',
    }).optional(),
    q: z.string().optional()
  })
})