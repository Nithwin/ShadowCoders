"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExamAndChildren = exports.updateExam = exports.listExamsForStudent = exports.findExamByIdForStudent = exports.listExams = exports.findExamById = exports.updateExamStatus = exports.deleteExamAssignment = exports.createExamAssignment = exports.createExam = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const createExam = (data) => {
    return prisma_1.prisma.exam.create({
        data: data,
    });
};
exports.createExam = createExam;
const createExamAssignment = (examId, assignmentData) => {
    return prisma_1.prisma.examAssignment.create({
        data: {
            ...assignmentData,
            exam: {
                connect: { id: examId },
            },
        },
    });
};
exports.createExamAssignment = createExamAssignment;
const deleteExamAssignment = (assignmentId) => {
    return prisma_1.prisma.examAssignment.delete({
        where: { id: assignmentId },
    });
};
exports.deleteExamAssignment = deleteExamAssignment;
const updateExamStatus = (examId, status) => {
    return prisma_1.prisma.exam.update({
        where: { id: examId },
        data: { status },
    });
};
exports.updateExamStatus = updateExamStatus;
const findExamById = (examId) => {
    return prisma_1.prisma.exam.findUnique({
        where: { id: examId },
        include: {
            sections: {
                include: {
                    sectionQuestions: {
                        include: {
                            question: true,
                        },
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
                orderBy: {
                    order: 'asc',
                },
            },
            questions: {
                orderBy: {
                    order: 'asc',
                },
            },
            assignments: true,
            _count: {
                select: {
                    questions: true,
                    sections: true,
                    attempts: true,
                },
            },
        },
    });
};
exports.findExamById = findExamById;
const listExams = async (params) => {
    const { status, searchQuery, page, pageSize } = params;
    const skip = (page - 1) * pageSize;
    const whereClause = {};
    if (status) {
        // For CLOSED status, include exams that are either:
        // 1. Explicitly marked as CLOSED, OR
        // 2. Have endAt date in the past (exam has completed)
        if (status === 'CLOSED') {
            const now = new Date();
            whereClause.OR = [
                { status: 'CLOSED' },
                { endAt: { lt: now } }
            ];
        }
        else {
            whereClause.status = status;
        }
    }
    if (searchQuery) {
        // If we already have an OR clause for CLOSED status, we need to combine it with search
        if (whereClause.OR) {
            whereClause.AND = [
                { OR: whereClause.OR },
                {
                    OR: [
                        { title: { contains: searchQuery, mode: "insensitive" } },
                        { description: { contains: searchQuery, mode: "insensitive" } },
                    ]
                }
            ];
            delete whereClause.OR;
        }
        else {
            whereClause.OR = [
                { title: { contains: searchQuery, mode: "insensitive" } },
                { description: { contains: searchQuery, mode: "insensitive" } },
            ];
        }
    }
    const exams = await prisma_1.prisma.exam.findMany({
        where: whereClause,
        skip: skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            durationMins: true,
            status: true,
            timingMode: true,
            sectionLockPolicy: true,
            randomizeQuestions: true,
            negativeMarkPerWrong: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    questions: true,
                    sections: true,
                    attempts: true,
                },
            },
        },
    });
    const totalCount = await prisma_1.prisma.exam.count({
        where: whereClause,
    });
    return {
        exams,
        totalCount,
    };
};
exports.listExams = listExams;
const findExamByIdForStudent = async (params) => {
    const { examId, student } = params;
    const whereClause = {
        id: examId,
        // Must be published
        status: client_1.ExamStatus.PUBLISHED,
        // Filter by assignment
        assignments: {
            some: {
                OR: [
                    // Condition 1: Assigned to all students
                    {
                        assignToAll: true,
                    },
                    // Condition 2: Assigned via cohort match (only if student has cohort info)
                    // Condition 2: Assigned via cohort match (flexible)
                    {
                        AND: [
                            // If student has year, match assignment year OR assignment has no year (applies to all years)
                            student.year ? { OR: [{ cohortYear: null }, { cohortYear: student.year }] } : {},
                            // If student has department, match assignment dept OR assignment has no dept
                            student.department ? { OR: [{ cohortDepartment: null }, { cohortDepartment: student.department }] } : {},
                            // If student has section, match assignment section OR assignment has no section
                            student.section ? { OR: [{ cohortSection: null }, { cohortSection: student.section }] } : {},
                            // Ensure we are not matching purely empty assignments if assignToAll is false (though create validation prevents this)
                            { assignToAll: false }
                        ]
                    },
                    // Condition 3: Assigned directly via student ID
                    {
                        studentIds: {
                            path: ["$"],
                            array_contains: student.id,
                        },
                    },
                ],
            },
        },
    };
    // Fetch the exam with attempt status and question types
    const exam = await prisma_1.prisma.exam.findFirst({
        where: whereClause,
        select: {
            id: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            durationMins: true,
            status: true,
            allowedLanguages: true, // Include allowed languages for coding questions
            maxAttempts: true, // Include maxAttempts
            // Include attempts to check if student has completed this exam
            attempts: {
                where: {
                    studentId: student.id,
                    status: 'SUBMITTED',
                },
                select: {
                    id: true,
                    status: true,
                    submittedAt: true,
                },
                orderBy: {
                    attemptNo: 'desc',
                },
            },
            // Include question types to check if exam has speaking questions
            questions: {
                select: {
                    type: true,
                },
                distinct: ['type'],
            },
            // Count attempts
            _count: {
                select: {
                    attempts: {
                        where: {
                            studentId: student.id,
                        },
                    },
                },
            },
        },
    });
    if (!exam) {
        return null;
    }
    // Transform to include attempt status and question types
    const hasCompletedAttempt = exam.attempts && exam.attempts.length > 0;
    const { attempts, questions, _count, ...examData } = exam;
    // Extract unique question types
    const questionTypes = questions ? [...new Set(questions.map(q => q.type))] : [];
    const hasSpeakingQuestions = questionTypes.includes('SPEAKING');
    return {
        ...examData,
        hasAttempt: hasCompletedAttempt,
        attemptId: hasCompletedAttempt ? exam.attempts[0].id : null,
        questionTypes,
        hasSpeakingQuestions,
        attemptCount: _count.attempts,
    };
};
exports.findExamByIdForStudent = findExamByIdForStudent;
const listExamsForStudent = async (params) => {
    const { student, filter, searchQuery, page, pageSize } = params;
    const now = new Date();
    const skip = (page - 1) * pageSize;
    // Base where clause - must be published and assigned
    const baseWhereClause = {
        // Must be published
        status: client_1.ExamStatus.PUBLISHED,
        // Filter by search query (title/description)
        ...(searchQuery && {
            OR: [
                { title: { contains: searchQuery, mode: "insensitive" } },
                { description: { contains: searchQuery, mode: "insensitive" } },
            ],
        }),
        // Filter by assignment
        assignments: {
            some: {
                OR: [
                    // Condition 1: Assigned to all students
                    {
                        assignToAll: true,
                    },
                    // Condition 2: Assigned via cohort match (only if student has cohort info)
                    // Condition 2: Assigned via cohort match (flexible)
                    {
                        AND: [
                            student.year ? { OR: [{ cohortYear: null }, { cohortYear: student.year }] } : {},
                            student.department ? { OR: [{ cohortDepartment: null }, { cohortDepartment: student.department }] } : {},
                            student.section ? { OR: [{ cohortSection: null }, { cohortSection: student.section }] } : {},
                            { assignToAll: false }
                        ]
                    },
                    // Condition 3: Assigned directly via student ID
                    {
                        studentIds: {
                            path: ["$"],
                            array_contains: student.id,
                        },
                    },
                ],
            },
        },
    };
    // Build filter-specific where clause
    let whereClause = { ...baseWhereClause };
    if (filter === "UPCOMING") {
        // UPCOMING: Exams that haven't started yet AND student hasn't submitted an attempt
        whereClause = {
            ...baseWhereClause,
            startAt: { gt: now },
            // Exclude exams where student has submitted attempts
            attempts: {
                none: {
                    studentId: student.id,
                    status: 'SUBMITTED',
                },
            },
        };
    }
    else if (filter === "LIVE") {
        // LIVE: Exams that are currently active
        // Show exams where student can still attempt (either no attempts, or has attempts but can retake based on maxAttempts)
        // We can't filter by maxAttempts in Prisma easily, so we'll fetch all live exams and filter in the service
        whereClause = {
            ...baseWhereClause,
            startAt: { lte: now },
            endAt: { gt: now },
        };
    }
    else if (filter === "COMPLETED") {
        // COMPLETED: Exams that have ended OR student has submitted an attempt
        whereClause = {
            ...baseWhereClause,
            OR: [
                // Option 1: Exam has ended
                { endAt: { lte: now } },
                // Option 2: Student has submitted an attempt (regardless of exam end time)
                {
                    attempts: {
                        some: {
                            studentId: student.id,
                            status: 'SUBMITTED',
                        },
                    },
                },
            ],
        };
    }
    // Fetch the exams for the current page
    const exams = await prisma_1.prisma.exam.findMany({
        where: whereClause,
        skip: skip,
        take: pageSize,
        orderBy: {
            startAt: filter === "COMPLETED" ? "desc" : "asc", // Show completed newest first, others oldest first
        },
        // Select only needed fields
        select: {
            id: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            durationMins: true,
            status: true,
            maxAttempts: true,
            // Include ALL attempts (not just SUBMITTED) to get the latest attempt
            attempts: {
                where: {
                    studentId: student.id,
                },
                select: {
                    id: true,
                    status: true,
                    submittedAt: true,
                    attemptNo: true,
                    score: true,
                    maxScore: true,
                },
                orderBy: {
                    attemptNo: 'desc', // Get the latest attempt first
                },
            },
        },
    });
    // Fetch the total count matching the filters
    const totalCount = await prisma_1.prisma.exam.count({
        where: whereClause,
    });
    return { exams, totalCount };
};
exports.listExamsForStudent = listExamsForStudent;
const updateExam = (examId, data // Use the generic update input type
) => {
    return prisma_1.prisma.exam.update({
        where: { id: examId },
        data: data,
        select: {
            id: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            durationMins: true,
            timingMode: true,
            sectionLockPolicy: true,
            status: true,
            releaseResults: true,
        },
    });
};
exports.updateExam = updateExam;
const deleteExamAndChildren = (examId) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        // Get all response IDs for this exam's attempts
        const responses = await tx.response.findMany({
            where: { attempt: { examId: examId } },
            select: { id: true },
        });
        const responseIds = responses.map((r) => r.id);
        // 1. Delete all grading jobs (which reference responses)
        if (responseIds.length > 0) {
            await tx.gradingJob.deleteMany({
                where: { responseId: { in: responseIds } },
            });
        }
        // 2. Delete all response artifacts (which reference responses)
        if (responseIds.length > 0) {
            await tx.responseArtifact.deleteMany({
                where: { responseId: { in: responseIds } },
            });
        }
        // 3. Delete all evaluations (which are linked to responses)
        if (responseIds.length > 0) {
            await tx.evaluation.deleteMany({
                where: { responseId: { in: responseIds } },
            });
        }
        // 4. Delete all responses (which are linked to attempts)
        await tx.response.deleteMany({
            where: { attempt: { examId: examId } },
        });
        // 5. Delete all attempt sections
        await tx.attemptSection.deleteMany({
            where: { attempt: { examId: examId } },
        });
        // 6. Delete all attempts for this exam
        await tx.attempt.deleteMany({
            where: { examId: examId },
        });
        // 7. Delete links from sections to questions
        await tx.sectionQuestion.deleteMany({
            where: { section: { examId: examId } },
        });
        // 8. Delete all questions for this exam
        await tx.question.deleteMany({
            where: { examId: examId },
        });
        // 9. Delete all sections for this exam
        await tx.examSection.deleteMany({
            where: { examId: examId },
        });
        // 10. Delete all assignments for this exam
        await tx.examAssignment.deleteMany({
            where: { examId: examId },
        });
        // 11. Finally, delete the exam itself
        const deletedExam = await tx.exam.delete({
            where: { id: examId },
        });
        return deletedExam;
    });
};
exports.deleteExamAndChildren = deleteExamAndChildren;
//# sourceMappingURL=exam.repo.js.map