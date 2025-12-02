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
    initialize(server: HTTPServer): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    getExamStats(examId: string): {
        totalStudents: number;
        activeStudents: number;
        idleStudents: number;
        submittedStudents: number;
        averageProgress: number;
        activities: ExamActivity[];
    };
}
export declare const examMonitoring: ExamMonitoringService;
export {};
//# sourceMappingURL=socket.d.ts.map