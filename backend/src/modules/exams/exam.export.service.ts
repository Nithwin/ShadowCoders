import * as ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { QType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const exportExamResultsToExcel = async (examId: string): Promise<ExcelJS.Workbook> => {
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

  // 4. Define columns
  const columns = [
    { header: 'Student Name', key: 'studentName', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Registration No', key: 'regNo', width: 15 },
    { header: 'Started At', key: 'startedAt', width: 20 },
    { header: 'Submitted At', key: 'submittedAt', width: 20 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Max Score', key: 'maxScore', width: 10 },
    { header: 'Percentage', key: 'percentage', width: 12 },
  ];

  // Add question columns
  exam.questions.forEach((question) => {
    columns.push({
      header: `Q${question.order} (${question.points} pts)`,
      key: `q${question.id}`,
      width: 15,
    });
  });

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
  if (attempts.length > 0) {
    attempts.forEach((attempt) => {
      // Convert Decimal to number if needed
      const score = attempt.score instanceof Decimal 
        ? attempt.score.toNumber() 
        : (typeof attempt.score === 'string' ? parseFloat(attempt.score) : (attempt.score ?? 0));
      const maxScore = attempt.maxScore instanceof Decimal
        ? attempt.maxScore.toNumber()
        : (typeof attempt.maxScore === 'string' ? parseFloat(attempt.maxScore) : (attempt.maxScore ?? 0));
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      const rowData: any = {
        studentName: attempt.student.name || 'Unknown',
        email: attempt.student.email || 'N/A',
        regNo: attempt.student.reg_no || 'N/A',
        startedAt: attempt.startedAt.toLocaleString(),
        submittedAt: attempt.submittedAt?.toLocaleString() || 'N/A',
        score: score.toFixed(2),
        maxScore: maxScore.toFixed(2),
        percentage: `${percentage}%`,
      };

      // Add question scores
      exam.questions.forEach((question) => {
        const response = attempt.responses.find((r) => r.question.id === question.id);
        if (response) {
          // Convert Decimal to number if needed
          const earnedPoints = response.earnedPoints instanceof Decimal
            ? response.earnedPoints.toNumber()
            : (typeof response.earnedPoints === 'string' 
              ? parseFloat(response.earnedPoints) 
              : (response.earnedPoints ?? 0));
          const questionPoints = question.points instanceof Decimal
            ? question.points.toNumber()
            : (typeof question.points === 'string' ? parseFloat(question.points) : question.points);
          rowData[`q${question.id}`] = `${earnedPoints.toFixed(2)} / ${questionPoints}`;
        } else {
          const questionPoints = question.points instanceof Decimal
            ? question.points.toNumber()
            : (typeof question.points === 'string' ? parseFloat(question.points) : question.points);
          rowData[`q${question.id}`] = `0 / ${questionPoints}`;
        }
      });

      const row = worksheet.addRow(rowData);
      
      // Style score cells
      row.getCell('score').numFmt = '0.00';
      row.getCell('maxScore').numFmt = '0.00';
      
      // Color code percentage
      if (percentage >= 80) {
        row.getCell('percentage').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }, // Light green
        };
      } else if (percentage >= 60) {
        row.getCell('percentage').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' }, // Yellow
        };
      } else if (percentage >= 40) {
        row.getCell('percentage').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' }, // Orange
        };
      } else {
        row.getCell('percentage').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }, // Light red
        };
      }
    });
  } else {
    // Add a row indicating no submissions
    worksheet.addRow({
      studentName: 'No submissions yet',
      email: '-',
      regNo: '-',
      startedAt: '-',
      submittedAt: '-',
      score: '-',
      maxScore: '-',
      percentage: '-',
    });
  }

  // 7. Add summary row
  if (attempts.length > 0) {
    const totalStudents = attempts.length;
    const avgScore = attempts.reduce((sum, a) => {
      const score = a.score instanceof Decimal
        ? a.score.toNumber()
        : (typeof a.score === 'string' ? parseFloat(a.score) : (a.score ?? 0));
      return sum + score;
    }, 0) / totalStudents;
    const avgMaxScore = attempts.reduce((sum, a) => {
      const maxScore = a.maxScore instanceof Decimal
        ? a.maxScore.toNumber()
        : (typeof a.maxScore === 'string' ? parseFloat(a.maxScore) : (a.maxScore ?? 0));
      return sum + maxScore;
    }, 0) / totalStudents;
    const avgPercentage = avgMaxScore > 0 ? Math.round((avgScore / avgMaxScore) * 100) : 0;

    worksheet.addRow({}); // Empty row
    const summaryRow = worksheet.addRow({
      studentName: 'SUMMARY',
      email: `Total Students: ${totalStudents}`,
      score: avgScore.toFixed(2),
      maxScore: avgMaxScore.toFixed(2),
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
  infoSheet.addRow({ property: 'Total Students', value: attempts.length.toString() });

  return workbook;
};

