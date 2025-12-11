"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPictureData = exports.createUser = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const prisma_1 = require("../../lib/prisma");
const db_health_1 = require("../../lib/db-health");
const bcrypt_1 = __importDefault(require("bcrypt"));
const getAllUsers = async (params = {}) => {
    const { role, department, year, sortBy, sortOrder } = params;
    const where = {};
    if (role)
        where.role = role;
    if (department)
        where.department = { contains: department, mode: 'insensitive' };
    if (year)
        where.year = year;
    const orderBy = {};
    if (sortBy) {
        orderBy[sortBy] = sortOrder || 'asc';
    }
    else {
        orderBy.createdAt = 'desc';
    }
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findMany({
        where,
        orderBy,
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            pictureUrl: true,
            createdAt: true,
            reg_no: true,
            department: true,
            year: true,
            section: true,
            leetcodeId: true,
            leetcodeStats: true,
        }
    }), 'getAllUsers');
};
exports.getAllUsers = getAllUsers;
const getUserById = async (id) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findUnique({
        where: { id },
    }), 'getUserById');
};
exports.getUserById = getUserById;
const updateUser = async (id, data) => {
    if (data.password && typeof data.password === 'string') {
        const salt = await bcrypt_1.default.genSalt(10);
        data.password = await bcrypt_1.default.hash(data.password, salt);
    }
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.update({
        where: { id },
        data,
    }), 'updateUser');
};
exports.updateUser = updateUser;
const deleteUser = async (id) => {
    return (0, db_health_1.withDatabaseErrorHandling)(async () => {
        // Use transaction to ensure atomicity
        return await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Get all attempts for this user
            const attempts = await tx.attempt.findMany({
                where: { studentId: id },
                select: { id: true },
            });
            const attemptIds = attempts.map(a => a.id);
            if (attemptIds.length > 0) {
                // 2. Get all response IDs
                const responses = await tx.response.findMany({
                    where: { attemptId: { in: attemptIds } },
                    select: { id: true },
                });
                const responseIds = responses.map(r => r.id);
                if (responseIds.length > 0) {
                    // 3. Delete grading jobs (references Response)
                    await tx.gradingJob.deleteMany({
                        where: { responseId: { in: responseIds } },
                    });
                    // 4. Delete evaluations (references Response)
                    await tx.evaluation.deleteMany({
                        where: { responseId: { in: responseIds } },
                    });
                    // 5. Delete response artifacts (references Response)
                    await tx.responseArtifact.deleteMany({
                        where: { responseId: { in: responseIds } },
                    });
                    // 6. Delete responses
                    await tx.response.deleteMany({
                        where: { attemptId: { in: attemptIds } },
                    });
                }
                // 7. Delete attempt sections
                await tx.attemptSection.deleteMany({
                    where: { attemptId: { in: attemptIds } },
                });
                // 8. Delete attempts
                await tx.attempt.deleteMany({
                    where: { studentId: id },
                });
            }
            // 9. Delete question reports by this user
            await tx.questionReport.deleteMany({
                where: { studentId: id },
            });
            // 10. Delete refresh tokens
            await tx.refreshToken.deleteMany({
                where: { userId: id },
            });
            // 11. Finally, delete the user
            return await tx.user.delete({
                where: { id },
            });
        });
    }, 'deleteUser');
};
exports.deleteUser = deleteUser;
const createUser = async (data) => {
    // Hash password if provided
    if (data.password) {
        const salt = await bcrypt_1.default.genSalt(10);
        data.password = await bcrypt_1.default.hash(data.password, salt);
    }
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.create({
        data
    }), 'createUser');
};
exports.createUser = createUser;
const getUserPictureData = async (id) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findUnique({
        where: { id },
        select: { pictureData: true, pictureMimeType: true }
    }), 'getUserPictureData');
};
exports.getUserPictureData = getUserPictureData;
//# sourceMappingURL=users.service.js.map