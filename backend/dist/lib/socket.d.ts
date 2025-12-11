import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Role } from '@prisma/client';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: Role;
    examId?: string;
    attemptId?: string;
}
interface ExamActivity {
    examId: string;
    attemptId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    currentQuestionIndex: number;
    totalQuestions: number;
    answeredCount: number;
    timeSpent: number;
    lastActivity: Date;
    status: 'active' | 'idle' | 'submitted';
    currentSection?: string;
}
declare class ExamMonitoringService {
    private io;
    private examRooms;
    private studentActivities;
    private socketToAttempt;
    private keyboardViolations;
    initialize(server: HTTPServer): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    getExamStats(examId: string): {
        totalStudents: number;
        activeStudents: number;
        idleStudents: number;
        submittedStudents: number;
        averageProgress: number;
        activities: ExamActivity[];
    };
    notifyQuestionUpdate(examId: string, questionId: string, data: any): void;
    notifyReport(examId: string, report: any): void;
    sendNotification(userId: string, notification: any): void;
    sendRoleNotification(role: Role, notification: any): void;
}
export declare const examMonitoring: ExamMonitoringService;
export {};
//# sourceMappingURL=socket.d.ts.map