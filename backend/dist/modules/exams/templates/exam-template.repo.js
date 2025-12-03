"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTemplate = exports.listTemplates = exports.findTemplateById = exports.createTemplate = void 0;
const prisma_1 = require("../../../lib/prisma");
const createTemplate = (data) => {
    return prisma_1.prisma.examTemplate.create({
        data,
    });
};
exports.createTemplate = createTemplate;
const findTemplateById = (id) => {
    return prisma_1.prisma.examTemplate.findUnique({
        where: { id },
        include: {
            creator: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
};
exports.findTemplateById = findTemplateById;
const listTemplates = async (params) => {
    const { userId, isPublic, searchQuery, page, pageSize } = params;
    const skip = (page - 1) * pageSize;
    const whereClause = {
        OR: [
            { createdBy: userId }, // My templates
            ...(isPublic ? [{ isPublic: true }] : []), // Public templates (if requested)
        ],
    };
    if (searchQuery) {
        whereClause.AND = {
            OR: [
                { title: { contains: searchQuery, mode: "insensitive" } },
                { description: { contains: searchQuery, mode: "insensitive" } },
            ],
        };
    }
    const templates = await prisma_1.prisma.examTemplate.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
            creator: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    const totalCount = await prisma_1.prisma.examTemplate.count({
        where: whereClause,
    });
    return { templates, totalCount };
};
exports.listTemplates = listTemplates;
const deleteTemplate = (id) => {
    return prisma_1.prisma.examTemplate.delete({
        where: { id },
    });
};
exports.deleteTemplate = deleteTemplate;
//# sourceMappingURL=exam-template.repo.js.map