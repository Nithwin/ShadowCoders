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
    // Validate points field to prevent integer overflow (INT4 max: 2,147,483,647)
    if (data.points !== undefined) {
        const INT4_MAX = 2147483647;
        const INT4_MIN = -2147483648;
        // Helper function to validate and convert points value
        const validatePointsValue = (value) => {
            // Convert string to number if needed
            let numValue;
            if (typeof value === 'string') {
                numValue = Number(value);
                if (isNaN(numValue)) {
                    throw {
                        status: 400,
                        message: `Invalid points value: ${value}. Must be a valid number.`,
                    };
                }
            }
            else if (typeof value === 'number') {
                numValue = value;
            }
            else {
                throw {
                    status: 400,
                    message: `Invalid points value type. Expected number or string, got ${typeof value}.`,
                };
            }
            // Check range
            if (numValue > INT4_MAX || numValue < INT4_MIN || !Number.isInteger(numValue)) {
                throw {
                    status: 400,
                    message: `Points value ${numValue} is out of range or not an integer. Maximum allowed: ${INT4_MAX}, Minimum allowed: ${INT4_MIN}`,
                };
            }
            return numValue;
        };
        // Handle different Prisma update input types
        if (typeof data.points === 'object' && data.points !== null) {
            if ('set' in data.points) {
                const value = validatePointsValue(data.points.set);
                data.points.set = value;
            }
            else if ('increment' in data.points) {
                // Check if increment would cause overflow
                const currentUser = await prisma_1.prisma.user.findUnique({
                    where: { id },
                    select: { points: true },
                });
                const currentPoints = currentUser?.points ?? 0;
                const incrementValue = validatePointsValue(data.points.increment);
                const newValue = currentPoints + incrementValue;
                if (newValue > INT4_MAX || newValue < INT4_MIN) {
                    throw {
                        status: 400,
                        message: `Points increment would result in value ${newValue} which is out of range. Maximum allowed: ${INT4_MAX}, Minimum allowed: ${INT4_MIN}`,
                    };
                }
                data.points.increment = incrementValue;
            }
            else if ('decrement' in data.points) {
                // Check if decrement would cause underflow
                const currentUser = await prisma_1.prisma.user.findUnique({
                    where: { id },
                    select: { points: true },
                });
                const currentPoints = currentUser?.points ?? 0;
                const decrementValue = validatePointsValue(data.points.decrement);
                const newValue = currentPoints - decrementValue;
                if (newValue > INT4_MAX || newValue < INT4_MIN) {
                    throw {
                        status: 400,
                        message: `Points decrement would result in value ${newValue} which is out of range. Maximum allowed: ${INT4_MAX}, Minimum allowed: ${INT4_MIN}`,
                    };
                }
                data.points.decrement = decrementValue;
            }
        }
        else {
            // Direct number or string assignment
            const validatedValue = validatePointsValue(data.points);
            data.points = validatedValue;
        }
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