"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clashService = exports.ClashService = void 0;
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
const clash_question_service_1 = require("./clash-question.service");
// Generate a unique 6-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
class ClashService {
    /**
     * Create a new clash room
     */
    async createRoom(userId, data) {
        // Get a random question
        const question = await clash_question_service_1.clashQuestionService.getRandomQuestion(data.mode, data.difficulty);
        if (!question) {
            throw new Error('No questions available');
        }
        // Generate unique room code
        let code = generateRoomCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await prisma_1.prisma.clashRoom.findUnique({ where: { code } });
            if (!existing)
                break;
            code = generateRoomCode();
            attempts++;
        }
        if (attempts >= 10) {
            throw new Error('Failed to generate unique room code');
        }
        // Create the room
        const room = await prisma_1.prisma.clashRoom.create({
            data: {
                code,
                createdById: userId,
                questionId: question.id,
                mode: question.mode,
                status: client_1.ClashRoomStatus.WAITING,
                maxParticipants: data.maxParticipants || 8,
                timeLimitMins: data.timeLimitMins || 15,
                isPrivate: data.isPrivate || false,
                allowedLanguages: data.allowedLanguages || [],
            },
            include: {
                question: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        // Automatically add creator as participant
        await prisma_1.prisma.clashParticipant.create({
            data: {
                roomId: room.id,
                userId,
            },
        });
        return room;
    }
    /**
     * Join a clash room
     */
    async joinRoom(userId, roomCode) {
        const room = await prisma_1.prisma.clashRoom.findUnique({
            where: { code: roomCode },
            include: {
                participants: true,
                question: true,
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        if (room.status !== client_1.ClashRoomStatus.WAITING) {
            throw new Error('Room is not accepting new participants');
        }
        if (room.participants.length >= room.maxParticipants) {
            throw new Error('Room is full');
        }
        // Check if user is already a participant
        const existing = room.participants.find(p => p.userId === userId);
        if (existing) {
            throw new Error('You are already in this room');
        }
        // Add participant
        await prisma_1.prisma.clashParticipant.create({
            data: {
                roomId: room.id,
                userId,
            },
        });
        return await this.getRoomDetails(room.id, userId);
    }
    /**
     * Leave a clash room
     */
    async leaveRoom(userId, roomId) {
        const room = await prisma_1.prisma.clashRoom.findUnique({
            where: { id: roomId },
            include: {
                participants: true,
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        if (room.status !== client_1.ClashRoomStatus.WAITING) {
            throw new Error('Cannot leave a room that has started');
        }
        // Remove participant
        await prisma_1.prisma.clashParticipant.deleteMany({
            where: {
                roomId,
                userId,
            },
        });
        // If creator left and there are other participants, assign new creator
        if (room.createdById === userId && room.participants.length > 1) {
            const newCreator = room.participants.find(p => p.userId !== userId);
            if (newCreator) {
                await prisma_1.prisma.clashRoom.update({
                    where: { id: roomId },
                    data: { createdById: newCreator.userId },
                });
            }
        }
        // If no participants left, delete the room
        if (room.participants.length === 1) {
            await prisma_1.prisma.clashRoom.delete({ where: { id: roomId } });
        }
        return { success: true };
    }
    /**
     * Start a clash room (creator only)
     */
    async startRoom(userId, roomId) {
        const room = await prisma_1.prisma.clashRoom.findUnique({
            where: { id: roomId },
            include: {
                participants: true,
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        if (room.createdById !== userId) {
            throw new Error('Only the room creator can start the clash');
        }
        if (room.status !== client_1.ClashRoomStatus.WAITING) {
            throw new Error('Room has already started');
        }
        if (room.participants.length < 2) {
            throw new Error('Need at least 2 participants to start');
        }
        // Update room status to STARTING (countdown phase)
        await prisma_1.prisma.clashRoom.update({
            where: { id: roomId },
            data: {
                status: client_1.ClashRoomStatus.STARTING,
            },
        });
        // After 3 seconds, update to IN_PROGRESS (this will be handled by WebSocket)
        setTimeout(async () => {
            await prisma_1.prisma.clashRoom.update({
                where: { id: roomId },
                data: {
                    status: client_1.ClashRoomStatus.IN_PROGRESS,
                    startedAt: new Date(),
                },
            });
        }, 3000);
        return { success: true, countdown: 3 };
    }
    /**
     * Submit code for a clash
     */
    async submitCode(userId, roomId, code, language) {
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
        if (room.status !== client_1.ClashRoomStatus.IN_PROGRESS) {
            throw new Error('Room is not in progress');
        }
        if (room.participants.length === 0) {
            throw new Error('You are not a participant in this room');
        }
        // Check if allowed language
        const allowedLangs = room.allowedLanguages;
        if (allowedLangs && allowedLangs.length > 0 && !allowedLangs.includes(language)) {
            throw new Error('Language not allowed in this room');
        }
        // Execute code against test cases (reuse existing code execution service)
        const { executeCode } = await Promise.resolve().then(() => __importStar(require('../../lib/code-execution')));
        const testcases = room.question.testcases;
        const results = [];
        let allPassed = true;
        for (const testcase of testcases) {
            try {
                const result = await executeCode({
                    code,
                    language,
                    input: testcase.input,
                    timeLimit: room.question.timeLimit,
                    memoryLimit: room.question.memoryLimit,
                });
                const passed = result.output?.trim() === testcase.output?.trim();
                results.push({
                    input: testcase.input,
                    expectedOutput: testcase.output,
                    actualOutput: result.output,
                    passed,
                    error: result.error,
                });
                if (!passed) {
                    allPassed = false;
                }
            }
            catch (error) {
                results.push({
                    input: testcase.input,
                    expectedOutput: testcase.output,
                    actualOutput: null,
                    passed: false,
                    error: error.message,
                });
                allPassed = false;
            }
        }
        // Calculate score based on mode
        const timeTaken = Math.floor((new Date().getTime() - new Date(room.startedAt).getTime()) / 1000);
        const codeLength = code.replace(/\s/g, '').length;
        let score = 0;
        if (room.mode === client_1.ClashMode.FASTEST) {
            score = allPassed ? timeTaken : 999999;
        }
        else if (room.mode === client_1.ClashMode.SHORTEST) {
            score = allPassed ? codeLength : 999999;
        }
        else if (room.mode === client_1.ClashMode.REVERSE) {
            score = allPassed ? timeTaken : 999999;
        }
        // Save submission
        const submission = await prisma_1.prisma.clashSubmission.create({
            data: {
                roomId,
                userId,
                code,
                language,
                passed: allPassed,
                testResults: results,
                executionTime: timeTaken,
                codeLength,
            },
        });
        // Update participant score
        await prisma_1.prisma.clashParticipant.update({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
            data: {
                score,
            },
        });
        return {
            submission,
            results,
            passed: allPassed,
            score,
        };
    }
    /**
     * Get room details with leaderboard
     */
    async getRoomDetails(roomId, userId) {
        const room = await prisma_1.prisma.clashRoom.findFirst({
            where: {
                OR: [
                    { id: roomId },
                    { code: roomId },
                ],
            },
            include: {
                question: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        score: 'asc', // Lower score is better (time/characters)
                    },
                },
                submissions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        submittedAt: 'desc',
                    },
                },
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        // Calculate ranks
        const participantsWithRank = room.participants.map((p, index) => ({
            ...p,
            rank: p.score > 0 ? index + 1 : null,
        }));
        // Hide question description for REVERSE mode until room starts
        let question = room.question;
        if (room.mode === client_1.ClashMode.REVERSE && room.status === client_1.ClashRoomStatus.WAITING) {
            question = {
                ...question,
                description: '(Hidden - will be revealed from test cases)',
            };
        }
        else if (room.mode === client_1.ClashMode.REVERSE && room.status !== client_1.ClashRoomStatus.WAITING) {
            question = {
                ...question,
                description: '(Deduce from test cases)',
            };
        }
        return {
            ...room,
            question,
            participants: participantsWithRank,
        };
    }
    /**
     * Get available public rooms
     */
    async getAvailableRooms() {
        const rooms = await prisma_1.prisma.clashRoom.findMany({
            where: {
                status: client_1.ClashRoomStatus.WAITING,
                isPrivate: false,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                participants: {
                    select: {
                        id: true,
                    },
                },
                question: {
                    select: {
                        difficulty: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20,
        });
        return rooms.map(room => ({
            ...room,
            participantCount: room.participants.length,
        }));
    }
    /**
     * Finish a room (auto-called when time expires)
     */
    async finishRoom(roomId) {
        const room = await prisma_1.prisma.clashRoom.findUnique({
            where: { id: roomId },
            include: {
                participants: {
                    orderBy: {
                        score: 'asc',
                    },
                },
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        // Update participant ranks
        for (let i = 0; i < room.participants.length; i++) {
            await prisma_1.prisma.clashParticipant.update({
                where: { id: room.participants[i].id },
                data: { rank: i + 1 },
            });
        }
        // Update room status
        await prisma_1.prisma.clashRoom.update({
            where: { id: roomId },
            data: {
                status: client_1.ClashRoomStatus.FINISHED,
                finishedAt: new Date(),
            },
        });
        // Award points based on rank
        const pointsMap = {
            1: 50,
            2: 30,
            3: 20,
            4: 10,
            5: 5,
        };
        for (const participant of room.participants) {
            if (participant.rank && participant.rank <= 5) {
                const points = pointsMap[participant.rank] || 0;
                // Update user points
                await prisma_1.prisma.user.update({
                    where: { id: participant.userId },
                    data: {
                        points: {
                            increment: points,
                        },
                    },
                });
                // Record in points history
                await prisma_1.prisma.pointsHistory.create({
                    data: {
                        userId: participant.userId,
                        points,
                        balance: 0, // Will be updated by trigger
                        type: 'EARNED',
                        description: `Clash of Codes - Rank #${participant.rank}`,
                        relatedId: roomId,
                        relatedType: 'CLASH',
                    },
                });
            }
        }
        return { success: true };
    }
}
exports.ClashService = ClashService;
exports.clashService = new ClashService();
//# sourceMappingURL=clash.service.js.map