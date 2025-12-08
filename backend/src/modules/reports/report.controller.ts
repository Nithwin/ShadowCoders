import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { AuthenticatedRequest } from '../../middleware/auth';
import { ReportStatus, Role } from '@prisma/client';

export const createReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { questionId, examId, description } = req.body;
    const studentId = req.user!.sub;

    const report = await reportService.createReport(
        studentId, 
        examId as string, 
        questionId as string, 
        description as string | undefined
    );
    
    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { examId, status } = req.query;
    
    // Only staff can see all reports
    if (req.user!.role !== Role.STAFF) {
        // Students might only see their own? Or not needed.
        // For now, restrict to staff
        throw new Error('Unauthorized'); // Should be handled by middleware mostly
    }

    const filters: any = {};
    if (examId) filters.examId = examId as string;
    if (status) filters.status = status as ReportStatus;

    const reports = await reportService.getReports(filters);

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new Error('Status is required');
        }
        const report = await reportService.updateStatus(reportId as string, status as ReportStatus);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        next(error);
    }
}
