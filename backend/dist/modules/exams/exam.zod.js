"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExamSchema = exports.studentListExamsSchema = exports.listExamsSchema = exports.assignExamSchema = exports.createExamSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createExamSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, "Title must be at least 3 characters"),
        description: zod_1.z.string().optional(),
        startAt: zod_1.z.string().datetime({ message: "Invalid start date-time format" }),
        endAt: zod_1.z.string().datetime({ message: "Invalid end date-time format" }),
        durationMins: zod_1.z
            .number()
            .int()
            .min(1, { message: "Duration must be a positive integer" }),
        timingMode: zod_1.z.nativeEnum(client_1.TimingMode, {
            message: "Invalid timing mode",
        }),
        sectionLockPolicy: zod_1.z.nativeEnum(client_1.SectionLockPolicy, {
            message: "Invalid section lock policy",
        }),
        randomizeQuestions: zod_1.z.boolean().optional(),
        negativeMarkPerWrong: zod_1.z.number().optional(),
        maxAttempts: zod_1.z.number().int().min(1).nullable().optional(), // null means unlimited, 1+ means limited
        maxTabSwitches: zod_1.z.number().int().min(0).nullable().optional(), // null means unlimited
        allowedLanguages: zod_1.z.array(zod_1.z.string()).optional(), // Array of allowed programming languages
        releaseResults: zod_1.z.boolean().optional().default(true),
    }),
});
exports.assignExamSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        assignToAll: zod_1.z.boolean().optional(),
        cohortYear: zod_1.z.number().int().min(1).max(6).optional(),
        cohortDepartment: zod_1.z.string().max(50).optional(),
        cohortSection: zod_1.z.string().max(10).optional(),
        studentIds: zod_1.z.array(zod_1.z.string().cuid()).max(1000).optional(),
    })
        .refine((data) => {
        const hasCohort = data.cohortYear || data.cohortDepartment || data.cohortSection;
        const hasStudentIds = data.studentIds && data.studentIds.length > 0;
        return data.assignToAll === true || hasCohort || hasStudentIds;
    }, {
        message: "Assignment requires setting assignToAll, providing cohort details, or a list of student IDs",
    })
        .refine((data) => {
        const hasCohort = data.cohortYear || data.cohortDepartment || data.cohortSection;
        const hasStudentIds = data.studentIds && data.studentIds.length > 0;
        if (data.assignToAll === true) {
            return !(hasCohort || hasStudentIds);
        }
        return !(hasCohort && hasStudentIds); // Cannot have both cohort and studentIds
    }, {
        message: "Cannot use assignToAll with other assignment methods, or mix cohort with specific student IDs",
    }),
});
exports.listExamsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce
            .number()
            .int()
            .min(1, "Page must be at least 1")
            .optional()
            .default(1),
        pageSize: zod_1.z.coerce
            .number()
            .int()
            .min(1, "Page size must be at least 1")
            .max(100, "Page size cannot exceed 100")
            .optional()
            .default(10),
        status: zod_1.z.enum([...Object.values(client_1.ExamStatus), 'ALL']).optional().default('ALL'),
        q: zod_1.z.string().optional(),
    }),
});
const studentExamFilter = zod_1.z.enum(["UPCOMING", "LIVE", "COMPLETED"]).optional();
exports.studentListExamsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce
            .number()
            .int()
            .min(1, "Page number must be 1 or greater")
            .optional()
            .default(1),
        pageSize: zod_1.z.coerce
            .number()
            .int()
            .min(1, "Page size must be at least 1")
            .max(100, "Page size cannot exceed 100")
            .optional()
            .default(10),
        filter: studentExamFilter,
        q: zod_1.z.string().optional(),
    }),
});
exports.updateExamSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        title: zod_1.z
            .string()
            .min(3, "Title must be at least 3 characters")
            .optional(),
        description: zod_1.z.string().optional(),
        startAt: zod_1.z
            .string()
            .datetime({ message: "Invalid start date-time format" })
            .optional(),
        endAt: zod_1.z
            .string()
            .datetime({ message: "Invalid end date-time format" })
            .optional(),
        durationMins: zod_1.z
            .number()
            .int()
            .positive("Duration must be a positive integer")
            .optional(),
        timingMode: zod_1.z
            .nativeEnum(client_1.TimingMode, {
            message: "Invalid timing mode",
        })
            .optional(),
        sectionLockPolicy: zod_1.z
            .nativeEnum(client_1.SectionLockPolicy, {
            message: "Invalid section lock policy",
        })
            .optional(),
        randomizeQuestions: zod_1.z.boolean().optional(),
        negativeMarkPerWrong: zod_1.z.number().optional(),
        maxAttempts: zod_1.z.number().int().min(1).nullable().optional(), // null means unlimited, 1+ means limited
        maxTabSwitches: zod_1.z.number().int().min(0).nullable().optional(), // null means unlimited
        allowedLanguages: zod_1.z.array(zod_1.z.string()).optional(), // Array of allowed programming languages
        releaseResults: zod_1.z.boolean().optional(),
    })
        // Add a refinement to ensure if both dates are sent, start is before end
        .refine((data) => {
        if (data.startAt && data.endAt) {
            return new Date(data.startAt) < new Date(data.endAt);
        }
        return true; // Pass if one or both are missing
    }, {
        message: "Exam start date must be before the end date",
        path: ["startAt"], // Report error on the startAt field
    }),
});
//# sourceMappingURL=exam.zod.js.map