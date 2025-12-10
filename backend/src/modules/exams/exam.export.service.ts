import * as ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { QType } from '@prisma/client';

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
      'questionAnswers',
    ],
    includeSummary = true,
    includeExamInfo = true,
  } = options;
// 1. Fetch exam details
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
          options: true, // Include options for MCQ mapping
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

  // 2. Fetch all submitted attempts for this exam
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
      responses: {
        select: {
          questionId: true,
          answer: true,
          earnedPoints: true,
          verdict: true,
          audioAsset: true,
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
    orderBy: {
      submittedAt: 'desc',
    },
  });

  // 3. Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Exam Results');

  // 4. Define columns based on selected fields
  const columns: any[] = [];
  
  if (fields.includes('studentName')) {
    columns.push({ header: 'Student Name', key: 'studentName', width: 25 });
  }
  if (fields.includes('email')) {
    columns.push({ header: 'Email', key: 'email', width: 30 });
  }
  if (fields.includes('regNo')) {
    columns.push({ header: 'Registration No', key: 'regNo', width: 20 });
  }
  if (fields.includes('startedAt')) {
    columns.push({ header: 'Started At', key: 'startedAt', width: 22 });
  }
  if (fields.includes('submittedAt')) {
    columns.push({ header: 'Submitted At', key: 'submittedAt', width: 22 });
  }
  if (fields.includes('score')) {
    columns.push({ header: 'Score', key: 'score', width: 12 });
  }
  if (fields.includes('maxScore')) {
    columns.push({ header: 'Max Score', key: 'maxScore', width: 12 });
  }
  if (fields.includes('percentage')) {
    columns.push({ header: 'Percentage', key: 'percentage', width: 15 });
  }

  // Helper to get truncated prompt
  const getHeaderLabel = (q: typeof exam.questions[0]) => {
    const plainPrompt = (q.prompt || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const truncated = plainPrompt.length > 30 ? plainPrompt.substring(0, 30) + '...' : plainPrompt;
    return `Q${q.order}: ${truncated}`;
  };

  // Add question columns based on selected fields
  if (fields.includes('questionScores') || fields.includes('questionAnswers') || fields.includes('questionVerdicts')) {
    exam.questions.forEach((question) => {
      // Skip MCQ questions entirely only show score for them via total score
      if (question.type === 'MCQ') return;

      const headerLabel = getHeaderLabel(question);
      
      if (fields.includes('questionScores')) {
        columns.push({
          header: `${headerLabel} (Score)`,
          key: `q${question.id}_score`,
          width: 15,
        });
      }
      if (fields.includes('questionAnswers')) {
        columns.push({
          header: `${headerLabel} (Answer)`,
          key: `q${question.id}_answer`,
          width: 40, // Wider for answers
        });
      }
      if (fields.includes('questionVerdicts')) {
        columns.push({
          header: `${headerLabel} (Verdict)`,
          key: `q${question.id}_verdict`,
          width: 15,
        });
      }
    });
  }

  worksheet.columns = columns;

  // 5. Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30; // Taller header

  // 6. Add data rows (only if there are attempts)
  if (attempts.length > 0) {
    attempts.forEach((attempt) => {
      // Convert Decimal to number if needed
      const score = attempt.score ? parseFloat(String(attempt.score)) : 0;
      const maxScore = attempt.maxScore ? parseFloat(String(attempt.maxScore)) : 0;
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
          // Skip MCQ questions
          if (question.type === 'MCQ') return;

          const response = attempt.responses.find((r) => r.question.id === question.id);
          const questionPoints = question.points ? parseFloat(String(question.points)) : 0;
          
          if (response) {
            const earnedPoints = response.earnedPoints ? parseFloat(String(response.earnedPoints)) : 0;
            
            if (fields.includes('questionScores')) {
              rowData[`q${question.id}_score`] = `${earnedPoints.toFixed(2)} / ${questionPoints}`;
            }
            if (fields.includes('questionAnswers')) {
              // Format answer based on type
              let formattedAnswer = 'N/A';
              const rawAnswer: any = response.answer;

              if (rawAnswer) {
                // MCQ logic removed as we skip MCQs
                if (question.type === QType.CODING) {
                  formattedAnswer = `[${rawAnswer.language || '?'}] \n${rawAnswer.code || ''}`;
                } else if (question.type === QType.ESSAY) {
                  formattedAnswer = rawAnswer.textAnswer || rawAnswer.text || '';
                } else if (question.type === QType.SPEAKING) {
                  if (response.audioAsset) {
                     // Construct full URL if relative
                     const url = (response.audioAsset as any).url;
                     formattedAnswer = `[Audio] ${url}`;
                  } else {
                    formattedAnswer = '[Audio Not Found]';
                  }
                } else {
                   // Fallback for other types
                   formattedAnswer = JSON.stringify(rawAnswer);
                }
              }
              
              rowData[`q${question.id}_answer`] = formattedAnswer;
            }
            if (fields.includes('questionVerdicts')) {
              rowData[`q${question.id}_verdict`] = response.verdict || 'N/A';
            }
          } else {
            if (fields.includes('questionScores')) {
              rowData[`q${question.id}_score`] = `0.00 / ${questionPoints}`;
            }
            if (fields.includes('questionAnswers')) {
              rowData[`q${question.id}_answer`] = 'Not Answered';
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
          scoreCell.alignment = { horizontal: 'center' };
        }
      }
      if (fields.includes('maxScore')) {
        const maxScoreCell = row.getCell('maxScore');
        if (maxScoreCell) {
          maxScoreCell.numFmt = '0.00';
          maxScoreCell.alignment = { horizontal: 'center' };
        }
      }
      
      // Color code percentage if it exists
      if (fields.includes('percentage')) {
        const percentageCell = row.getCell('percentage');
        if (percentageCell) {
          percentageCell.alignment = { horizontal: 'center' };
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

      // Wrap text for answer columns
      if (fields.includes('questionAnswers')) {
         exam.questions.forEach((q) => {
            const cell = row.getCell(`q${q.id}_answer`);
            if (cell) {
               cell.alignment = { vertical: 'top', wrapText: true };
               // Set a max height for coding questions roughly
               if (q.type === QType.CODING) {
                 row.height = 100; // Allow more height for code
               }
            }
         });
      }
    });

    // Auto-filter for better usability
    worksheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },
      to: {
        row: 1,
        column: columns.length,
      },
    };

  } else {
    // Add a row indicating no submissions
    const emptyRowData: any = {};
    if (fields.includes('studentName')) emptyRowData.studentName = 'No submissions yet';
    // ... rest handled below
    worksheet.addRow(emptyRowData);
  }

  // 7. Add summary row (same as previous but adjusted for new columns)
  if (includeSummary && attempts.length > 0) {
    const totalStudents = attempts.length;
    const avgScore = attempts.reduce((sum, a) => {
      const score = a.score ? parseFloat(String(a.score)) : 0;
      return sum + score;
    }, 0) / totalStudents;
    const avgMaxScore = attempts.reduce((sum, a) => {
      const maxScore = a.maxScore ? parseFloat(String(a.maxScore)) : 0;
      return sum + maxScore;
    }, 0) / totalStudents;
    const avgPercentage = avgMaxScore > 0 ? Math.round((avgScore / avgMaxScore) * 100) : 0;

    worksheet.addRow({}); // Empty row
    
    const summaryRowData: any = {};
    if (fields.includes('studentName')) summaryRowData.studentName = 'SUMMARY / AVERAGE';
    if (fields.includes('email')) summaryRowData.email = `Total Students: ${totalStudents}`;
    if (fields.includes('score')) summaryRowData.score = avgScore.toFixed(2);
    if (fields.includes('maxScore')) summaryRowData.maxScore = avgMaxScore.toFixed(2);
    if (fields.includes('percentage')) summaryRowData.percentage = `${avgPercentage}%`;

    const summaryRow = worksheet.addRow(summaryRowData);
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
      { header: 'Property', key: 'property', width: 25 },
      { header: 'Value', key: 'value', width: 60 },
    ];

    const infoHeaderRow = infoSheet.getRow(1);
    infoHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    infoHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    infoSheet.addRow({ property: 'Exam Title', value: exam.title });
    infoSheet.addRow({ property: 'Start Date', value: exam.startAt.toLocaleString() });
    infoSheet.addRow({ property: 'End Date', value: exam.endAt.toLocaleString() });
    infoSheet.addRow({ property: 'Total Questions', value: exam.questions.length.toString() });
    infoSheet.addRow({ property: 'Total Submissions', value: attempts.length.toString() });
  }

  return workbook;
};

