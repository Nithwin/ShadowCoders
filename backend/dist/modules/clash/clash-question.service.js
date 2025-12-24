"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clashQuestionService = exports.ClashQuestionService = void 0;
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
class ClashQuestionService {
    /**
     * Get a random question for room creation
     */
    async getRandomQuestion(mode, difficulty) {
        const where = {};
        if (mode) {
            where.mode = mode;
        }
        if (difficulty) {
            where.difficulty = difficulty;
        }
        // Get total count
        const count = await prisma_1.prisma.clashQuestion.count({ where });
        if (count === 0) {
            throw new Error('No questions available for the specified criteria');
        }
        // Get random offset
        const skip = Math.floor(Math.random() * count);
        const question = await prisma_1.prisma.clashQuestion.findFirst({
            where,
            skip,
        });
        return question;
    }
    /**
     * Get question for a room (with appropriate visibility for mode)
     */
    async getQuestionForRoom(roomId, userId) {
        const room = await prisma_1.prisma.clashRoom.findUnique({
            where: { id: roomId },
            include: {
                question: true,
                participants: {
                    where: { userId },
                },
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        if (room.participants.length === 0) {
            throw new Error('User is not a participant in this room');
        }
        const question = room.question;
        // For REVERSE mode, hide the description
        if (room.mode === client_1.ClashMode.REVERSE) {
            return {
                ...question,
                description: '(Hidden - deduce from test cases)',
            };
        }
        return question;
    }
    /**
     * Get all questions (admin only)
     */
    async getAllQuestions(filters) {
        const where = {};
        if (filters?.mode) {
            where.mode = filters.mode;
        }
        if (filters?.difficulty) {
            where.difficulty = filters.difficulty;
        }
        const questions = await prisma_1.prisma.clashQuestion.findMany({
            where,
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
            orderBy: {
                createdAt: 'desc',
            },
        });
        const total = await prisma_1.prisma.clashQuestion.count({ where });
        return {
            questions,
            total,
        };
    }
    /**
     * Create a new question (admin only)
     */
    async createQuestion(data) {
        return await prisma_1.prisma.clashQuestion.create({
            data: {
                title: data.title,
                description: data.description,
                difficulty: data.difficulty,
                mode: data.mode,
                ...(data.starterCode !== undefined && { starterCode: data.starterCode }),
                testcases: data.testcases,
                ...(data.hiddenTests !== undefined && { hiddenTests: data.hiddenTests }),
                timeLimit: data.timeLimit ?? 5000,
                memoryLimit: data.memoryLimit ?? 256,
                ...(data.tags !== undefined && { tags: data.tags }),
                ...(data.source !== undefined && { source: data.source }),
            },
        });
    }
    /**
     * Update a question (admin only)
     */
    async updateQuestion(id, data) {
        return await prisma_1.prisma.clashQuestion.update({
            where: { id },
            data,
        });
    }
    /**
     * Delete a question (admin only)
     */
    async deleteQuestion(id) {
        return await prisma_1.prisma.clashQuestion.delete({
            where: { id },
        });
    }
}
exports.ClashQuestionService = ClashQuestionService;
exports.clashQuestionService = new ClashQuestionService();
//# sourceMappingURL=clash-question.service.js.map