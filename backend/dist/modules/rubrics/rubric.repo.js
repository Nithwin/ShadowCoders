"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRubric = exports.updateRubric = exports.getRubricById = exports.listRubrics = exports.createRubric = void 0;
const prisma_1 = require("../../lib/prisma");
/**
 * Creates a new rubric record in the database.
 */
const createRubric = (data) => {
    return prisma_1.prisma.rubric.create({
        data,
        select: {
            id: true,
            name: true,
            criteria: true,
            createdAt: true,
        },
    });
};
exports.createRubric = createRubric;
/**
 * Lists all rubrics with pagination and search
 */
const listRubrics = async (params) => {
    const { page, pageSize, searchQuery } = params;
    const skip = (page - 1) * pageSize;
    const where = searchQuery
        ? {
            name: {
                contains: searchQuery,
                mode: 'insensitive',
            },
        }
        : {};
    const [rubrics, totalCount] = await Promise.all([
        prisma_1.prisma.rubric.findMany({
            where,
            select: {
                id: true,
                name: true,
                criteria: true,
                createdAt: true,
                _count: {
                    select: {
                        questions: true,
                        evaluations: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: pageSize,
        }),
        prisma_1.prisma.rubric.count({ where }),
    ]);
    return { rubrics, totalCount };
};
exports.listRubrics = listRubrics;
/**
 * Gets a single rubric by ID
 */
const getRubricById = (id) => {
    return prisma_1.prisma.rubric.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            criteria: true,
            createdAt: true,
            _count: {
                select: {
                    questions: true,
                    evaluations: true,
                },
            },
        },
    });
};
exports.getRubricById = getRubricById;
/**
 * Updates a rubric
 */
const updateRubric = (id, data) => {
    return prisma_1.prisma.rubric.update({
        where: { id },
        data,
        select: {
            id: true,
            name: true,
            criteria: true,
            createdAt: true,
        },
    });
};
exports.updateRubric = updateRubric;
/**
 * Deletes a rubric
 */
const deleteRubric = (id) => {
    return prisma_1.prisma.rubric.delete({
        where: { id },
    });
};
exports.deleteRubric = deleteRubric;
//# sourceMappingURL=rubric.repo.js.map