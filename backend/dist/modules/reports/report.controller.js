"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReportStatus = exports.getReports = exports.createReport = void 0;
const report_service_1 = require("./report.service");
const client_1 = require("@prisma/client");
const createReport = async (req, res, next) => {
    try {
        const { questionId, examId, description } = req.body;
        const studentId = req.user.sub;
        const report = await report_service_1.reportService.createReport(studentId, examId, questionId, description);
        res.status(201).json({
            success: true,
            data: report
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createReport = createReport;
const getReports = async (req, res, next) => {
    try {
        const { examId, status } = req.query;
        // Only staff can see all reports
        if (req.user.role !== client_1.Role.STAFF) {
            // Students might only see their own? Or not needed.
            // For now, restrict to staff
            throw new Error('Unauthorized'); // Should be handled by middleware mostly
        }
        const filters = {};
        if (examId)
            filters.examId = examId;
        if (status)
            filters.status = status;
        const reports = await report_service_1.reportService.getReports(filters);
        res.json({
            success: true,
            data: reports
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReports = getReports;
const updateReportStatus = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;
        if (!status) {
            throw new Error('Status is required');
        }
        const report = await report_service_1.reportService.updateStatus(reportId, status);
        res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateReportStatus = updateReportStatus;
//# sourceMappingURL=report.controller.js.map