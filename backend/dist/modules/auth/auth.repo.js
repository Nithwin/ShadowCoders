"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.deleteRefreshToken = exports.findRefreshToken = exports.saveRefreshToken = exports.updateUser = exports.findStudentWithCohortInfo = exports.findUserById = exports.findUserByEmail = void 0;
const prisma_1 = require("../../lib/prisma");
const db_health_1 = require("../../lib/db-health");
const findUserByEmail = (email) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findUnique({
        where: {
            email
        },
        select: {
            id: true,
            email: true,
            password: true,
            role: true,
            name: true,
            pictureUrl: true,
            reg_no: true,
            department: true,
            year: true,
            section: true,
            leetcodeId: true,
            // Excluding pictureData
        }
    }), 'findUserByEmail');
};
exports.findUserByEmail = findUserByEmail;
const findUserById = (id) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            pictureUrl: true,
            reg_no: true,
            department: true,
            year: true,
            section: true,
            leetcodeId: true,
            createdAt: true,
            // Explicitly excluding pictureData and pictureMimeType for performance
        }
    }), 'findUserById');
};
exports.findUserById = findUserById;
const findStudentWithCohortInfo = (id) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            year: true,
            department: true,
            section: true,
        }
    }), 'findStudentWithCohortInfo');
};
exports.findStudentWithCohortInfo = findStudentWithCohortInfo;
const updateUser = (id, data) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.update({
        where: { id },
        data,
    }), 'updateUser');
};
exports.updateUser = updateUser;
const saveRefreshToken = (userId, tokenHash, expiresAt) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.refreshToken.create({
        data: {
            userId: userId,
            tokenHash: tokenHash,
            expiresAt: expiresAt,
        },
    }), 'saveRefreshToken');
};
exports.saveRefreshToken = saveRefreshToken;
/**
 * Finds an active refresh token by its hash.
 */
const findRefreshToken = (tokenHash) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.refreshToken.findUnique({
        where: {
            tokenHash: tokenHash,
            // Optional: Add check to ensure it hasn't expired
            // expiresAt: { gt: new Date() } 
        },
    }), 'findRefreshToken');
};
exports.findRefreshToken = findRefreshToken;
/**
 * Deletes a refresh token from the database (used for logout).
 */
const deleteRefreshToken = (tokenHash) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.refreshToken.delete({
        where: { tokenHash: tokenHash },
    }), 'deleteRefreshToken');
};
exports.deleteRefreshToken = deleteRefreshToken;
const updatePassword = (id, passwordHash) => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.update({
        where: { id },
        data: { password: passwordHash },
    }), 'updatePassword');
};
exports.updatePassword = updatePassword;
//# sourceMappingURL=auth.repo.js.map