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
exports.exportExamResultsHandler = exports.publishExamHandler = exports.assignExamHandler = exports.getExamByIdForStudentHandler = exports.studentListExamsHandler = exports.deleteExamHandler = exports.updateExamHandler = exports.createExamHandler = exports.getExamByIdHandler = exports.listExamsHandler = void 0;
const examService = __importStar(require("./exam.service"));
const exportService = __importStar(require("./exam.export.service"));
const listExamsHandler = async (req, res, next) => {
    try {
        const queryParams = req.validatedData?.query;
        const result = await examService.listExams(queryParams);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.listExamsHandler = listExamsHandler;
const getExamByIdHandler = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.getExamByIdHandler = getExamByIdHandler;
const createExamHandler = async (req, res, next) => {
    try {
        // Get validated data from middleware, fallback to req.body
        const examData = req.validatedData?.body || req.body;
        const newExam = await examService.createExam(examData);
        res.status(201).json(newExam);
    }
    catch (error) {
        next(error);
    }
};
exports.createExamHandler = createExamHandler;
const updateExamHandler = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateExamHandler = updateExamHandler;
const deleteExamHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Exam ID parameter is required' });
        }
        // Allow force deletion via query parameter (e.g., ?force=true)
        const force = req.query.force === 'true';
        const result = await examService.deleteExam(examId, force);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteExamHandler = deleteExamHandler;
const studentListExamsHandler = async (req, res, next) => {
    try {
        const studentId = req.user?.sub;
        const queryParams = req.validatedData?.query;
        if (!studentId) {
            return next({ status: 401, message: 'Unauthorized' });
        }
        const result = await examService.listExamsForStudent(studentId, queryParams);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.studentListExamsHandler = studentListExamsHandler;
const getExamByIdForStudentHandler = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.getExamByIdForStudentHandler = getExamByIdForStudentHandler;
const assignExamHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        // Get validated data from middleware, fallback to req.body
        const assignmentData = req.validatedData?.body || req.body;
        const assignment = await examService.assignExam(examId, assignmentData);
        res.status(201).json(assignment);
    }
    catch (error) {
        next(error);
    }
};
exports.assignExamHandler = assignExamHandler;
const publishExamHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        const updatedExam = await examService.pubishExam(examId);
        res.status(200).json(updatedExam);
    }
    catch (error) {
        next(error);
    }
};
exports.publishExamHandler = publishExamHandler;
const exportExamResultsHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        // Parse field selection from query parameters
        const fieldsParam = req.query.fields;
        let fields = undefined;
        if (fieldsParam) {
            if (Array.isArray(fieldsParam)) {
                fields = fieldsParam;
            }
            else if (typeof fieldsParam === 'string') {
                fields = fieldsParam.split(',');
            }
        }
        const includeSummary = req.query.includeSummary !== 'false';
        const includeExamInfo = req.query.includeExamInfo !== 'false';
        const options = {
            ...(fields && { fields }),
            includeSummary,
            includeExamInfo,
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
    }
    catch (error) {
        next(error);
    }
};
exports.exportExamResultsHandler = exportExamResultsHandler;
//# sourceMappingURL=exam.controller.js.map