import { GradingMode } from "@prisma/client";
import { testCodeWithTestCasesLocally } from '../../lib/local-executor';

export const areArraysEqual = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  const sortedArr1 = [...arr1].map(String).sort();
  const sortedArr2 = [...arr2].map(String).sort();
  return sortedArr1.every((value, index) => value === sortedArr2[index]);
};

export const gradeMCQ = (
  answer: { chosenOptionIds?: string[] } | null,
  correctOptionIds: string[],
  points: number
) => {
  if (!answer?.chosenOptionIds || !correctOptionIds) {
    return {
      earnedPoints: 0,
      verdict: 'FAIL',
      gradingMode: GradingMode.AUTO,
    };
  }

  const isCorrect = areArraysEqual(answer.chosenOptionIds, correctOptionIds);
  
  return {
    earnedPoints: isCorrect ? points : 0,
    verdict: isCorrect ? 'PASS' : 'FAIL',
    gradingMode: GradingMode.AUTO,
  };
};

export const gradeCoding = async (
  answer: { code?: string; language?: string } | null,
  testcases: Array<{ input: string; expectedOutput: string; isHidden?: boolean; timeoutMs?: number }> | null,
  points: number
) => {
  if (!answer?.code || answer.code.trim().length === 0) {
    return {
      earnedPoints: 0,
      verdict: 'FAIL',
      gradingMode: GradingMode.AUTO,
    };
  }

  if (!testcases || testcases.length === 0) {
    // No test cases, cannot auto-grade properly, maybe give 0 or full?
    // For now, fail safely
    return {
      earnedPoints: 0,
      verdict: 'FAIL',
      gradingMode: GradingMode.AUTO,
    };
  }

  const code = answer.code.trim();
  const language = answer.language || 'javascript';

  try {
    const testResults = await testCodeWithTestCasesLocally(
      code,
      language,
      testcases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        timeoutMs: tc.timeoutMs || 2000,
      }))
    );

    const passedRatio = testResults.total > 0 ? testResults.passed / testResults.total : 0;
    const earnedPoints = Math.round(points * passedRatio * 100) / 100;

    return {
      earnedPoints,
      verdict: testResults.passed === testResults.total ? 'PASS' : 'PARTIAL',
      gradingMode: GradingMode.AUTO,
    };
  } catch (e) {
    console.error('Error auto-grading coding question:', e);
    return {
      earnedPoints: 0,
      verdict: 'FAIL',
      gradingMode: GradingMode.AUTO,
    };
  }
};
