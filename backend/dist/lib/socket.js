"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.examMonitoring = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("./prisma");
const client_1 = require("@prisma/client");
class ExamMonitoringService {
    constructor() {
        this.io = null;
        this.examRooms = new Map(); // examId -> Set of socketIds
        this.studentActivities = new Map(); // attemptId -> activity
        this.socketToAttempt = new Map(); // socketId -> attemptId
        this.keyboardViolations = new Map(); // attemptId -> violation
    }
    initialize(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: env_1.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
                credentials: true,
                methods: ['GET', 'POST'],
            },
            transports: ['websocket', 'polling'],
        });
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
                if (!decoded.sub || !decoded.role) {
                    return next(new Error('Invalid token payload'));
                }
                socket.userId = decoded.sub;
                socket.userRole = decoded.role;
                next();
            }
            catch (error) {
                next(new Error('Authentication failed'));
            }
        });
        this.io.on('connection', (socket) => {
            // Join user-specific room
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
            }
            // Join role-specific room
            if (socket.userRole) {
                socket.join(`role:${socket.userRole}`);
            }
            // Student joins exam room
            socket.on('join-exam', async (data) => {
                try {
                    if (socket.userRole !== client_1.Role.STUDENT) {
                        socket.emit('error', { message: 'Only students can join exam rooms' });
                        return;
                    }
                    // Verify the attempt belongs to the student
                    const attempt = await prisma_1.prisma.attempt.findUnique({
                        where: { id: data.attemptId },
                        include: {
                            student: {
                                select: { id: true, name: true, email: true },
                            },
                            exam: {
                                select: { id: true, title: true },
                            },
                        },
                    });
                    if (!attempt || attempt.studentId !== socket.userId) {
                        socket.emit('error', { message: 'Invalid attempt' });
                        return;
                    }
                    socket.examId = data.examId;
                    socket.attemptId = data.attemptId;
                    const roomName = `exam:${data.examId}`;
                    socket.join(roomName);
                    // Track socket in exam room
                    if (!this.examRooms.has(data.examId)) {
                        this.examRooms.set(data.examId, new Set());
                    }
                    this.examRooms.get(data.examId).add(socket.id);
                    this.socketToAttempt.set(socket.id, data.attemptId);
                    // Initialize or update activity
                    const questionCount = await prisma_1.prisma.question.count({
                        where: { examId: data.examId },
                    });
                    const activity = {
                        examId: data.examId,
                        attemptId: data.attemptId,
                        studentId: socket.userId,
                        studentName: attempt.student.name || 'Unknown',
                        studentEmail: attempt.student.email,
                        currentQuestionIndex: 0,
                        totalQuestions: questionCount,
                        answeredCount: 0,
                        timeSpent: 0,
                        lastActivity: new Date(),
                        status: 'active',
                    };
                    this.studentActivities.set(data.attemptId, activity);
                    // Notify admins about new student joining
                    this.io?.to(`admin:exam:${data.examId}`).emit('student-joined', {
                        attemptId: data.attemptId,
                        studentId: socket.userId,
                        studentName: activity.studentName,
                        timestamp: new Date(),
                    });
                    // Send current exam stats to the student
                    socket.emit('exam-stats', {
                        totalStudents: this.examRooms.get(data.examId)?.size || 0,
                    });
                }
                catch (error) {
                    console.error('[Socket] Error joining exam:', error);
                    socket.emit('error', { message: 'Failed to join exam' });
                }
            });
            // Admin joins exam monitoring room
            socket.on('admin-join-exam', async (data) => {
                try {
                    if (socket.userRole !== client_1.Role.STAFF) {
                        socket.emit('error', { message: 'Only staff can monitor exams' });
                        return;
                    }
                    const roomName = `admin:exam:${data.examId}`;
                    socket.join(roomName);
                    socket.examId = data.examId;
                    // Send current activity to admin
                    const activities = Array.from(this.studentActivities.values())
                        .filter(a => a.examId === data.examId);
                    socket.emit('exam-activity', {
                        totalStudents: this.examRooms.get(data.examId)?.size || 0,
                        activities: activities,
                    });
                }
                catch (error) {
                    console.error('[Socket] Error admin joining exam:', error);
                    socket.emit('error', { message: 'Failed to join monitoring room' });
                }
            });
            // Student activity updates
            socket.on('activity-update', (data) => {
                if (!socket.attemptId)
                    return;
                const activity = this.studentActivities.get(socket.attemptId);
                if (activity) {
                    activity.currentQuestionIndex = data.currentQuestionIndex;
                    activity.answeredCount = data.answeredCount;
                    activity.timeSpent = data.timeSpent;
                    activity.lastActivity = new Date();
                    activity.status = data.status || activity.status;
                    if (data.currentSection !== undefined) {
                        activity.currentSection = data.currentSection;
                    }
                    // Broadcast to admins monitoring this exam
                    if (socket.examId) {
                        this.io?.to(`admin:exam:${socket.examId}`).emit('activity-update', {
                            attemptId: socket.attemptId,
                            activity: activity,
                        });
                    }
                }
            });
            // Student heartbeat (to track if they're still active)
            socket.on('heartbeat', () => {
                if (socket.attemptId) {
                    const activity = this.studentActivities.get(socket.attemptId);
                    if (activity) {
                        activity.lastActivity = new Date();
                        activity.status = 'active';
                    }
                }
                socket.emit('heartbeat-ack');
            });
            // Keyboard violation detected
            socket.on('keyboard-violation', (data) => {
                if (!socket.attemptId || !socket.examId || socket.userRole !== client_1.Role.STUDENT)
                    return;
                const activity = this.studentActivities.get(socket.attemptId);
                if (!activity || activity.status !== 'active')
                    return;
                // Check if there's already an unresolved violation
                const existingViolation = this.keyboardViolations.get(socket.attemptId);
                if (existingViolation && !existingViolation.resolved) {
                    // Already has an unresolved violation, don't create another
                    return;
                }
                // Create new violation
                const violation = {
                    attemptId: socket.attemptId,
                    studentId: activity.studentId,
                    studentName: activity.studentName,
                    studentEmail: activity.studentEmail,
                    examId: socket.examId,
                    timestamp: new Date(),
                    resolved: false,
                };
                this.keyboardViolations.set(socket.attemptId, violation);
                // Notify admins
                this.io?.to(`admin:exam:${socket.examId}`).emit('keyboard-violation', {
                    attemptId: socket.attemptId,
                    studentId: activity.studentId,
                    studentName: activity.studentName,
                    studentEmail: activity.studentEmail,
                    timestamp: violation.timestamp,
                });
            });
            // Admin resolves keyboard violation
            socket.on('resolve-keyboard-violation', (data) => {
                if (socket.userRole !== client_1.Role.STAFF) {
                    socket.emit('error', { message: 'Only staff can resolve violations' });
                    return;
                }
                const violation = this.keyboardViolations.get(data.attemptId);
                if (!violation) {
                    socket.emit('error', { message: 'Violation not found' });
                    return;
                }
                violation.resolved = true;
                violation.resolution = data.action;
                // Notify the student
                this.io?.to(`exam:${violation.examId}`).emit('violation-resolved', {
                    attemptId: data.attemptId,
                    action: data.action,
                });
                // Notify all admins monitoring this exam
                this.io?.to(`admin:exam:${violation.examId}`).emit('violation-resolved', {
                    attemptId: data.attemptId,
                    action: data.action,
                });
            });
            // Disconnect handling
            socket.on('disconnect', () => {
                if (socket.examId && socket.attemptId) {
                    // Remove from exam room
                    const examRoom = this.examRooms.get(socket.examId);
                    if (examRoom) {
                        examRoom.delete(socket.id);
                        if (examRoom.size === 0) {
                            this.examRooms.delete(socket.examId);
                        }
                    }
                    // Update activity status
                    const activity = this.studentActivities.get(socket.attemptId);
                    if (activity) {
                        activity.status = 'idle';
                        // Notify admins
                        this.io?.to(`admin:exam:${socket.examId}`).emit('student-disconnected', {
                            attemptId: socket.attemptId,
                            timestamp: new Date(),
                        });
                    }
                    this.socketToAttempt.delete(socket.id);
                }
            });
        });
        // Periodic cleanup of idle students (mark as idle if no activity for 2 minutes)
        setInterval(() => {
            const now = new Date();
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
            this.studentActivities.forEach((activity, attemptId) => {
                if (activity.lastActivity < twoMinutesAgo && activity.status === 'active') {
                    activity.status = 'idle';
                    this.io?.to(`admin:exam:${activity.examId}`).emit('activity-update', {
                        attemptId,
                        activity,
                    });
                }
            });
        }, 30000); // Check every 30 seconds
        return this.io;
    }
    // Get current exam statistics
    getExamStats(examId) {
        const activities = Array.from(this.studentActivities.values())
            .filter(a => a.examId === examId);
        const activeCount = activities.filter(a => a.status === 'active').length;
        const idleCount = activities.filter(a => a.status === 'idle').length;
        const submittedCount = activities.filter(a => a.status === 'submitted').length;
        const avgProgress = activities.length > 0
            ? activities.reduce((sum, a) => sum + (a.answeredCount / a.totalQuestions), 0) / activities.length
            : 0;
        return {
            totalStudents: activities.length,
            activeStudents: activeCount,
            idleStudents: idleCount,
            submittedStudents: submittedCount,
            averageProgress: Math.round(avgProgress * 100),
            activities: activities,
        };
    }
    notifyQuestionUpdate(examId, questionId, data) {
        this.io?.to(`exam:${examId}`).emit('question-updated', {
            questionId,
            data
        });
    }
    notifyReport(examId, report) {
        this.io?.to(`admin:exam:${examId}`).emit('report-created', report);
    }
    sendNotification(userId, notification) {
        this.io?.to(`user:${userId}`).emit('notification', notification);
    }
    sendRoleNotification(role, notification) {
        this.io?.to(`role:${role}`).emit('notification', notification);
    }
}
exports.examMonitoring = new ExamMonitoringService();
//# sourceMappingURL=socket.js.map