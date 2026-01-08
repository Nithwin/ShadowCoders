import { RequestHandler } from 'express';
import * as examService from './exam.service';
import * as exportService from './exam.export.service';
import { z } from 'zod';
import { listExamsSchema, studentListExamsSchema } from './exam.zod';

export const listExamsHandler: RequestHandler = async (req, res, next) => {
  try {
    const queryParams = req.validatedData?.query as z.infer<typeof listExamsSchema>['query'];

    const result = await examService.listExams(queryParams);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getExamByIdHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }
    const exam = await examService.getExamById(examId);

    if (!exam) {
      return next({ status: 404, message: 'Exam not found' });
    }

    res.status(200).json(exam);
  } catch (error) {
    next(error);
  }
};

export const createExamHandler: RequestHandler = async (req, res, next) => {
  try {
    // Get validated data from middleware, fallback to req.body
    const examData = req.validatedData?.body || req.body;
    const newExam = await examService.createExam(examData);

    res.status(201).json(newExam);
  } catch (error) {
    next(error);
  }
};

export const updateExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }
    // Get validated data from middleware, fallback to req.body
    const examData = req.validatedData?.body || req.body;
    const updatedExam = await examService.updateExam(examId, examData);

    if (!updatedExam) {
      return next({ status: 404, message: 'Exam not found' });
    }

    res.status(200).json(updatedExam);
  } catch (error) {
    next(error);
  }
};

export const deleteExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Exam ID parameter is required' });
    }
    // Allow force deletion via query parameter (e.g., ?force=true)
    const force = req.query.force === 'true';

    const result = await examService.deleteExam(examId, force);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const studentListExamsHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const queryParams = req.validatedData?.query as z.infer<typeof studentListExamsSchema>['query'];

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    const result = await examService.listExamsForStudent(studentId, queryParams);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getExamByIdForStudentHandler: RequestHandler = async (req, res, next) => {
  try {
    const studentId = req.user?.sub;
    const examId = req.params.examId;

    if (!studentId) {
      return next({ status: 401, message: 'Unauthorized' });
    }
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }

    const exam = await examService.getExamByIdForStudent(studentId, examId);

    if (!exam) {
      return next({ status: 404, message: 'Exam not found or not assigned to you' });
    }

    res.status(200).json(exam);
  } catch (error) {
    next(error);
  }
};

export const assignExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }
    // Get validated data from middleware, fallback to req.body
    const assignmentData = req.validatedData?.body || req.body;
    const assignment = await examService.assignExam(examId, assignmentData);

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

export const deleteAssignmentHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const assignmentId = req.params.assignmentId;

    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }
    if (!assignmentId) {
      return next({ status: 400, message: 'Missing assignmentId parameter' });
    }

    const result = await examService.deleteAssignment(examId, assignmentId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const publishExamHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }
    const updatedExam = await examService.pubishExam(examId);

    res.status(200).json(updatedExam);
  } catch (error) {
    next(error);
  }
};

export const exportExamResultsHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }

    // Parse field selection from query parameters
    const fieldsParam = req.query.fields;
    let fields: exportService.ExportField[] | undefined = undefined;
    if (fieldsParam) {
      if (Array.isArray(fieldsParam)) {
        fields = fieldsParam as exportService.ExportField[];
      } else if (typeof fieldsParam === 'string') {
        fields = fieldsParam.split(',') as exportService.ExportField[];
      }
    }

    const includeSummary = req.query.includeSummary !== 'false';
    const includeExamInfo = req.query.includeExamInfo !== 'false';
    const roundScores = req.query.roundScores === 'true';
    const sortBy = req.query.sortBy as 'score_desc' | 'score_asc' | 'studentName_asc' | 'submittedAt_desc' | undefined;

    const options: exportService.ExportOptions = {
      ...(fields && { fields }),
      includeSummary,
      includeExamInfo,
      roundScores,
      ...(sortBy && { sortBy }),
    };

    const workbook = await exportService.exportExamResultsToExcel(examId, options);

    // Get exam title for filename
    const exam = await examService.getExamById(examId);
    const safeTitle = exam?.title?.replace(/[^a-z0-9]/gi, '_') || examId;
    const filename = `exam_results_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Transfer-Encoding', 'binary');

    // Write workbook to buffer, then send
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const toggleResultLockHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      return next({ status: 400, message: 'Missing examId parameter' });
    }

    const { releaseResults } = req.body;
    if (typeof releaseResults !== 'boolean') {
      return next({ status: 400, message: 'releaseResults must be a boolean' });
    }

    const updated = await examService.updateExam(examId, { releaseResults });

    if (!updated) {
      return next({ status: 404, message: 'Exam not found' });
    }

    res.status(200).json({
      message: releaseResults ? 'Results released successfully' : 'Results locked successfully',
      releaseResults: updated.releaseResults
    });
  } catch (error) {
    next(error);
  }
};
