import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from './prisma';
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

interface KeyboardViolation {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: 'force-submit' | 'continue';
}

class ExamMonitoringService {
  private io: SocketIOServer | null = null;
  private examRooms: Map<string, Set<string>> = new Map(); // examId -> Set of socketIds
  private studentActivities: Map<string, ExamActivity> = new Map(); // attemptId -> activity
  private socketToAttempt: Map<string, string> = new Map(); // socketId -> attemptId
  private keyboardViolations: Map<string, KeyboardViolation> = new Map(); // attemptId -> violation

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: Role };
        
        if (!decoded.sub || !decoded.role) {
          return next(new Error('Invalid token payload'));
        }

        socket.userId = decoded.sub;
        socket.userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {

      // Join user-specific room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Join role-specific room
      if (socket.userRole) {
        socket.join(`role:${socket.userRole}`);
      }

      // Student joins exam room
      socket.on('join-exam', async (data: { examId: string; attemptId: string }) => {
        try {
          if (socket.userRole !== Role.STUDENT) {
            socket.emit('error', { message: 'Only students can join exam rooms' });
            return;
          }

          // Verify the attempt belongs to the student
          const attempt = await prisma.attempt.findUnique({
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
          this.examRooms.get(data.examId)!.add(socket.id);
          this.socketToAttempt.set(socket.id, data.attemptId);

          // Initialize or update activity
          const questionCount = await prisma.question.count({
            where: { examId: data.examId },
          });

          const activity: ExamActivity = {
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

        } catch (error) {
          console.error('[Socket] Error joining exam:', error);
          socket.emit('error', { message: 'Failed to join exam' });
        }
      });

      // Admin joins exam monitoring room
      socket.on('admin-join-exam', async (data: { examId: string }) => {
        try {
          if (socket.userRole !== Role.STAFF) {
            socket.emit('error', { message: 'Only staff can monitor exams' });
            return;
          }

          const roomName = `admin:exam:${data.examId}`;
          socket.join(roomName);
          socket.examId = data.examId;

          // Send current activity to admin
          // Deduplicate by attemptId (shouldn't be needed since Map is keyed by attemptId, but just in case)
          const activitiesMap = new Map<string, ExamActivity>();
          Array.from(this.studentActivities.values())
            .filter(a => a.examId === data.examId)
            .forEach(activity => {
              // Keep the most recent activity if duplicates exist
              const existing = activitiesMap.get(activity.attemptId);
              if (!existing || new Date(activity.lastActivity) > new Date(existing.lastActivity)) {
                activitiesMap.set(activity.attemptId, activity);
              }
            });
          
          const activities = Array.from(activitiesMap.values());

          socket.emit('exam-activity', {
            totalStudents: activities.length, // Use actual unique activities count
            activities: activities,
          });

        } catch (error) {
          console.error('[Socket] Error admin joining exam:', error);
          socket.emit('error', { message: 'Failed to join monitoring room' });
        }
      });

      // Student activity updates
      socket.on('activity-update', (data: {
        currentQuestionIndex: number;
        answeredCount: number;
        timeSpent: number;
        status?: 'active' | 'idle' | 'submitted';
        currentSection?: string;
      }) => {
        if (!socket.attemptId) return;

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
      socket.on('keyboard-violation', (data: { key?: string }) => {
        if (!socket.attemptId || !socket.examId || socket.userRole !== Role.STUDENT) return;

        const activity = this.studentActivities.get(socket.attemptId);
        if (!activity || activity.status !== 'active') return;

        // Check if there's already an unresolved violation
        const existingViolation = this.keyboardViolations.get(socket.attemptId);
        if (existingViolation && !existingViolation.resolved) {
          // Already has an unresolved violation, don't create another
          return;
        }

        // Create new violation
        const violation: KeyboardViolation = {
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
      socket.on('resolve-keyboard-violation', async (data: { attemptId: string; action: 'force-submit' | 'continue' }) => {
        if (socket.userRole !== Role.STAFF) {
          socket.emit('error', { message: 'Only staff can resolve violations' });
          return;
        }

        const violation = this.keyboardViolations.get(data.attemptId);
        
        // For force-submit, violation might not exist if attempt was already submitted via API
        // Still emit the event to notify the student
        if (!violation) {
          // If violation doesn't exist but action is force-submit, still try to notify
          // This can happen if the attempt was force submitted via API first
          if (data.action === 'force-submit') {
            // Query the database to get examId and studentId from the attempt
            try {
              const attempt = await prisma.attempt.findUnique({
                where: { id: data.attemptId },
                select: {
                  examId: true,
                  studentId: true,
                },
              });

              if (attempt) {
                const violationData = {
                  attemptId: data.attemptId,
                  action: data.action,
                };
                
                // Emit to the specific exam room (consistent with when violation exists)
                this.io?.to(`exam:${attempt.examId}`).emit('violation-resolved', violationData);
                
                // Also emit to the specific student's room for direct delivery
                this.io?.to(`user:${attempt.studentId}`).emit('violation-resolved', violationData);
                
                // Notify all admins monitoring this exam
                this.io?.to(`admin:exam:${attempt.examId}`).emit('violation-resolved', violationData);
              } else {
                // Attempt not found - fallback to global emit (shouldn't happen in normal flow)
                const violationData = {
                  attemptId: data.attemptId,
                  action: data.action,
                };
                this.io?.emit('violation-resolved', violationData);
              }
            } catch (error) {
              console.error(`[Socket] Error querying attempt ${data.attemptId}:`, error);
              // Fallback to global emit if query fails
              const violationData = {
                attemptId: data.attemptId,
                action: data.action,
              };
              this.io?.emit('violation-resolved', violationData);
            }
            
            // Don't log error for force-submit when violation not found - it's expected
            // The API call already handled the submission, we're just notifying
            return;
          }
          
          // For 'continue' action, violation should exist
          // Only emit error for 'continue' action - 'force-submit' is handled above
          // Don't emit error in production to avoid console spam
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Socket] Violation not found for attempt ${data.attemptId} with action ${data.action}`);
            socket.emit('error', { message: 'Violation not found' });
          }
          // In production, silently ignore missing violations for 'continue' action
          return;
        }

        violation.resolved = true;
        violation.resolution = data.action;

        // Notify the student - emit to both exam room and user-specific room for reliability
        const violationData = {
          attemptId: data.attemptId,
          action: data.action,
        };
        
        // Emit to exam room (all students in the exam)
        this.io?.to(`exam:${violation.examId}`).emit('violation-resolved', violationData);
        
        // Also emit to the specific student's room for direct delivery
        this.io?.to(`user:${violation.studentId}`).emit('violation-resolved', violationData);

        // Notify all admins monitoring this exam
        this.io?.to(`admin:exam:${violation.examId}`).emit('violation-resolved', violationData);

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
  getExamStats(examId: string) {
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

  notifyQuestionUpdate(examId: string, questionId: string, data: any) {
    this.io?.to(`exam:${examId}`).emit('question-updated', {
      questionId,
      data
    });
  }

  notifyReport(examId: string, report: any) {
    this.io?.to(`admin:exam:${examId}`).emit('report-created', report);
  }

  sendNotification(userId: string, notification: any) {
    this.io?.to(`user:${userId}`).emit('notification', notification);
  }

  sendRoleNotification(role: Role, notification: any) {
    this.io?.to(`role:${role}`).emit('notification', notification);
  }
}

export const examMonitoring = new ExamMonitoringService();

