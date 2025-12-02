import * as ExcelJS from 'exceljs';
export type ExportField = 'studentName' | 'email' | 'regNo' | 'startedAt' | 'submittedAt' | 'score' | 'maxScore' | 'percentage' | 'questionScores' | 'questionAnswers' | 'questionVerdicts';
export interface ExportOptions {
    fields?: ExportField[];
    includeSummary?: boolean;
    includeExamInfo?: boolean;
}
export declare const exportExamResultsToExcel: (examId: string, options?: ExportOptions) => Promise<ExcelJS.Workbook>;
//# sourceMappingURL=exam.export.service.d.ts.map