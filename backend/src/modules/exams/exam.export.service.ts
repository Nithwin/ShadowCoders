import * as ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { Prisma, QType } from '@prisma/client';

export type ExportField =
  | 'studentName'
  | 'email'
  | 'regNo'
  | 'startedAt'
  | 'submittedAt'
  | 'score'
  | 'maxScore'
  | 'percentage'
  | 'questionScores'
  | 'questionAnswers'
  | 'questionVerdicts';

export interface ExportOptions {
  fields?: ExportField[];
  includeSummary?: boolean;
  includeExamInfo?: boolean;
  roundScores?: boolean;
  sortBy?: 'score_desc' | 'score_asc' | 'studentName_asc' | 'submittedAt_desc';
}

export const exportExamResultsToExcel = async (
  examId: string,
  options: ExportOptions = {}
): Promise<ExcelJS.Workbook> => {
  const {
    fields = [
      'studentName',
      'email',
      'regNo',
      'startedAt',
      'submittedAt',
      'score',
      'maxScore',
      'percentage',
      'questionScores',
    ],
    includeSummary = true,
    includeExamInfo = true,
    roundScores = false,
    sortBy = 'submittedAt_desc',
  } = options;

  // Determine Prisma orderBy based on sortBy option
  let orderBy: Prisma.AttemptOrderByWithRelationInput = { submittedAt: 'desc' };
  switch (sortBy) {
    case 'score_desc':
      orderBy = { score: 'desc' };
      break;
    case 'score_asc':
      orderBy = { score: 'asc' };
      break;
    case 'studentName_asc':
      orderBy = { student: { name: 'asc' } };
      break;
    case 'submittedAt_desc':
    default:
      orderBy = { submittedAt: 'desc' };
      break;
  }

  // 1. Fetch exam details (unchanged)
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      questions: {
        select: {
          id: true,
          order: true,
          type: true,
          prompt: true,
          points: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // 2. Fetch all submitted attempts for this exam with dyanmic sorting
  const attempts = await prisma.attempt.findMany({
    where: {
      examId: examId,
      status: 'SUBMITTED',
    },
    select: {
      id: true,
      studentId: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
      attemptNo: true,
      responses: {
        select: {
          questionId: true,
          answer: true,
          earnedPoints: true,
          verdict: true,
          question: {
            select: {
              id: true,
              order: true,
              type: true,
              points: true,
            },
          },
        },
      },
    },
    orderBy: orderBy,
  });

  // Filter for latest attempt per student to match UI behavior
  const latestAttemptsMap = new Map<string, typeof attempts[0]>();
  attempts.forEach((a) => {
    const existing = latestAttemptsMap.get(a.studentId);
    if (!existing || a.attemptNo > existing.attemptNo) {
      latestAttemptsMap.set(a.studentId, a);
    }
  });

  // Convert back to array and sort according to original order (or re-sort)
  // Since we used a Map, order might be lost. We should re-sort to be safe.
  // Although 'attempts' was sorted by DB, filtering might need re-sort if we care.
  // But usually sorting by name or score is done AFTER filtering in UI.
  // The DB query had 'orderBy'. Let's preserve that relative order if possible, 
  // or simply re-sort the filtered list.

  // Let's filter first, then rely on the array operations.
  const filteredAttempts = Array.from(latestAttemptsMap.values());

  // Re-apply sort if needed, or if the DB sort was sufficient, we mostly good 
  // ONLY IF the desired sort was not 'attemptNo' dependent. 
  // If sorting by 'score', the latest attempt might have different score.
  // So we should sort `filteredAttempts` in JS.

  const attemptsToExport = filteredAttempts.sort((a, b) => {
    if (sortBy === 'score_desc') {
      // Recalculate scores for sorting to match the export values
      const scoreA = a.responses.reduce((sum, r) => sum + (r.earnedPoints ? parseFloat(String(r.earnedPoints)) : 0), 0);
      const scoreB = b.responses.reduce((sum, r) => sum + (r.earnedPoints ? parseFloat(String(r.earnedPoints)) : 0), 0);
      return scoreB - scoreA;
    } else if (sortBy === 'score_asc') {
      const scoreA = a.responses.reduce((sum, r) => sum + (r.earnedPoints ? parseFloat(String(r.earnedPoints)) : 0), 0);
      const scoreB = b.responses.reduce((sum, r) => sum + (r.earnedPoints ? parseFloat(String(r.earnedPoints)) : 0), 0);
      return scoreA - scoreB;
    } else if (sortBy === 'studentName_asc') {
      return (a.student.name || '').localeCompare(b.student.name || '');
    } else { // submittedAt_desc or default
      return (b.submittedAt ? new Date(b.submittedAt).getTime() : 0) - (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
    }
  });

  // Replace original attempts with filtered list
  // Note: we can't re-assign 'const attempts', so let's use 'attemptsToExport' downstream
  // Actually, I should rename 'attempts' to 'rawAttempts' or just use 'attemptsToExport' 
  // in the loop below.
  // For minimal diff, I'll alias it.

  const uniqueAttempts = attemptsToExport;

  // 3. Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Exam Results');

  // 4. Define columns based on selected fields
  const columns: any[] = [];

  if (fields.includes('studentName')) {
    columns.push({ header: 'Student Name', key: 'studentName', width: 20 });
  }
  if (fields.includes('email')) {
    columns.push({ header: 'Email', key: 'email', width: 30 });
  }
  if (fields.includes('regNo')) {
    columns.push({ header: 'Registration No', key: 'regNo', width: 15 });
  }
  if (fields.includes('startedAt')) {
    columns.push({ header: 'Started At', key: 'startedAt', width: 20 });
  }
  if (fields.includes('submittedAt')) {
    columns.push({ header: 'Submitted At', key: 'submittedAt', width: 20 });
  }
  if (fields.includes('score')) {
    columns.push({ header: 'Score', key: 'score', width: 10 });
  }
  if (fields.includes('maxScore')) {
    columns.push({ header: 'Max Score', key: 'maxScore', width: 10 });
  }
  if (fields.includes('percentage')) {
    columns.push({ header: 'Percentage', key: 'percentage', width: 12 });
  }

  // Add question columns based on selected fields
  if (fields.includes('questionScores') || fields.includes('questionAnswers') || fields.includes('questionVerdicts')) {
    exam.questions.forEach((question) => {
      if (fields.includes('questionScores')) {
        columns.push({
          header: `Q${question.order} Score`,
          key: `q${question.id}_score`,
          width: 15,
        });
      }
      if (fields.includes('questionAnswers')) {
        columns.push({
          header: `Q${question.order} Answer`,
          key: `q${question.id}_answer`,
          width: 30,
        });
      }
      if (fields.includes('questionVerdicts')) {
        columns.push({
          header: `Q${question.order} Verdict`,
          key: `q${question.id}_verdict`,
          width: 12,
        });
      }
    });
  }

  worksheet.columns = columns;

  // 5. Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // 6. Add data rows (only if there are attempts)
  if (uniqueAttempts.length > 0) {
    uniqueAttempts.forEach((attempt) => {
      // Convert Decimal to number if needed
      // Recalculate score from responses to fix potential sync issues (e.g. MCQ auto-grading not updating attempt score)
      const score = attempt.responses.reduce((sum, r) => {
        const points = r.earnedPoints ? parseFloat(String(r.earnedPoints)) : 0;
        return sum + points;
      }, 0);

      // Recalculate maxScore based on the current exam questions to ensure consistency
      const maxScore = exam.questions.reduce((sum, q) => {
        return sum + (q.points ? parseFloat(String(q.points)) : 0);
      }, 0);
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      const rowData: any = {};

      if (fields.includes('studentName')) {
        rowData.studentName = attempt.student.name || 'Unknown';
      }
      if (fields.includes('email')) {
        rowData.email = attempt.student.email || 'N/A';
      }
      if (fields.includes('regNo')) {
        rowData.regNo = attempt.student.reg_no || 'N/A';
      }
      if (fields.includes('startedAt')) {
        rowData.startedAt = attempt.startedAt.toLocaleString();
      }
      if (fields.includes('submittedAt')) {
        rowData.submittedAt = attempt.submittedAt?.toLocaleString() || 'N/A';
      }
      if (fields.includes('score')) {
        rowData.score = score.toFixed(2);
      }
      if (fields.includes('maxScore')) {
        rowData.maxScore = maxScore.toFixed(2);
      }
      if (fields.includes('percentage')) {
        rowData.percentage = `${percentage}%`;
      }

      // Add question data based on selected fields
      if (fields.includes('questionScores') || fields.includes('questionAnswers') || fields.includes('questionVerdicts')) {
        exam.questions.forEach((question) => {
          const response = attempt.responses.find((r) => r.question.id === question.id);
          const questionPoints = question.points ? parseFloat(String(question.points)) : 0;

          if (response) {
            const earnedPoints = response.earnedPoints ? parseFloat(String(response.earnedPoints)) : 0;

            if (fields.includes('questionScores')) {
              rowData[`q${question.id}_score`] = `${earnedPoints.toFixed(2)} / ${questionPoints}`;
            }
            if (fields.includes('questionAnswers')) {
              rowData[`q${question.id}_answer`] = response.answer || 'N/A';
            }
            if (fields.includes('questionVerdicts')) {
              rowData[`q${question.id}_verdict`] = response.verdict || 'N/A';
            }
          } else {
            if (fields.includes('questionScores')) {
              rowData[`q${question.id}_score`] = `0 / ${questionPoints}`;
            }
            if (fields.includes('questionAnswers')) {
              rowData[`q${question.id}_answer`] = 'N/A';
            }
            if (fields.includes('questionVerdicts')) {
              rowData[`q${question.id}_verdict`] = 'N/A';
            }
          }
        });
      }

      const row = worksheet.addRow(rowData);

      // Style score cells if they exist
      if (fields.includes('score')) {
        const scoreCell = row.getCell('score');
        if (scoreCell) {
          scoreCell.numFmt = '0.00';
        }
      }
      if (fields.includes('maxScore')) {
        const maxScoreCell = row.getCell('maxScore');
        if (maxScoreCell) {
          maxScoreCell.numFmt = '0.00';
        }
      }

      // Color code percentage if it exists
      if (fields.includes('percentage')) {
        const percentageCell = row.getCell('percentage');
        if (percentageCell) {
          if (percentage >= 80) {
            percentageCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF90EE90' }, // Light green
            };
          } else if (percentage >= 60) {
            percentageCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF00' }, // Yellow
            };
          } else if (percentage >= 40) {
            percentageCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFA500' }, // Orange
            };
          } else {
            percentageCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF6B6B' }, // Light red
            };
          }
        }
      }
    });
  } else {
    // Add a row indicating no submissions
    const emptyRowData: any = {};
    if (fields.includes('studentName')) emptyRowData.studentName = 'No submissions yet';
    if (fields.includes('email')) emptyRowData.email = '-';
    if (fields.includes('regNo')) emptyRowData.regNo = '-';
    if (fields.includes('startedAt')) emptyRowData.startedAt = '-';
    if (fields.includes('submittedAt')) emptyRowData.submittedAt = '-';
    if (fields.includes('score')) emptyRowData.score = '-';
    if (fields.includes('maxScore')) emptyRowData.maxScore = '-';
    if (fields.includes('percentage')) emptyRowData.percentage = '-';
    worksheet.addRow(emptyRowData);
  }

  // 7. Add summary row
  if (includeSummary && uniqueAttempts.length > 0) {
    const totalStudents = uniqueAttempts.length;
    const avgScore = uniqueAttempts.reduce((sum, a) => {
      // Recalculate score for summary too
      const score = a.responses.reduce((s, r) => s + (r.earnedPoints ? parseFloat(String(r.earnedPoints)) : 0), 0);
      return sum + score;
    }, 0) / totalStudents;

    // Recalculate max score logic (assuming same exam for all, so just use one example or recompute)
    const examMaxScore = exam.questions.reduce((sum, q) => sum + (q.points ? parseFloat(String(q.points)) : 0), 0);

    const avgPercentage = examMaxScore > 0 ? Math.round((avgScore / examMaxScore) * 100) : 0;

    worksheet.addRow({}); // Empty row
    const summaryRow = worksheet.addRow({
      studentName: 'SUMMARY',
      email: `Total Students: ${totalStudents}`,
      score: avgScore.toFixed(2),
      maxScore: examMaxScore.toFixed(2),
      percentage: `${avgPercentage}%`,
    });

    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  }

  // 8. Add exam info sheet
  if (includeExamInfo) {
    const infoSheet = workbook.addWorksheet('Exam Info');
    infoSheet.columns = [
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Value', key: 'value', width: 50 },
    ];

    const infoHeaderRow = infoSheet.getRow(1);
    infoHeaderRow.font = { bold: true };
    infoHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    infoSheet.addRow({ property: 'Exam Title', value: exam.title });
    infoSheet.addRow({ property: 'Start Date', value: exam.startAt.toLocaleString() });
    infoSheet.addRow({ property: 'End Date', value: exam.endAt.toLocaleString() });
    infoSheet.addRow({ property: 'Total Questions', value: exam.questions.length.toString() });
    infoSheet.addRow({ property: 'Total Students', value: uniqueAttempts.length.toString() });
  }

  return workbook;
};

