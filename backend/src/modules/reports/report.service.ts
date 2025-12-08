import { prisma } from '../../lib/prisma';
import { ReportStatus } from '@prisma/client';
import { examMonitoring } from '../../lib/socket';

export const reportService = {
  createReport: async (studentId: string, examId: string, questionId: string, description?: string) => {
    // Check if already reported by this student? 
    // User requirement: "one student reported that question other should can't report it" -> implying global lock or global visibility.
    // We will check if ANY open report exists for this question.

    const existingReport = await prisma.questionReport.findFirst({
        where: {
            questionId,
            status: { not: ReportStatus.RESOLVED } // Check if there's an active report
        }
    });

    if (existingReport) {
        // Already reported. Return it or throw?
        // If we want to prevent duplicates, we can return the existing one.
        return existingReport;
    }

    const report = await prisma.questionReport.create({
      data: {
        studentId,
        examId,
        questionId,
        description: description ?? null,
        status: ReportStatus.OPEN
      },
      include: {
        student: {
            select: { name: true, reg_no: true }
        },
        question: {
            select: { order: true, type: true }
        }
      }
    });

    // Notify admins via socket
    // using generic emit or a specific channel
    // We don't have a direct 'report-created' method in `lib/socket.ts` yet, but we can emit to the admin room.
    // The `examMonitoring` class handles sockets. We might need to expose the IO instance or add a method.
    // For now, we will add a TODO or try to access io if possible.
    // Actually, `examMonitoring` has `io` private. We should add a method to it.
    
    // Notify admins via socket
    examMonitoring.notifyReport(examId, report);

    return report;

  },

  getReports: async (filters: { examId?: string; status?: ReportStatus }) => {
    return prisma.questionReport.findMany({
      where: filters,
      include: {
        student: {
            select: { id: true, name: true, email: true, reg_no: true }
        },
        question: true
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  updateStatus: async (reportId: string, status: ReportStatus) => {
      return prisma.questionReport.update({
          where: { id: reportId },
          data: { status }
      });
  }
};
