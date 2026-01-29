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
  if (!answer?.chosenOptionIds || !correctOptionIds || correctOptionIds.length === 0) {
    return {
      earnedPoints: 0,
      verdict: 'FAIL',
      gradingMode: GradingMode.AUTO,
    };
  }

  const chosenIds = answer.chosenOptionIds;
  const correctIds = correctOptionIds;

  // Calculate matches (correctly selected)
  const matches = chosenIds.filter(id => correctIds.includes(id)).length;
  // Calculate mismatches (incorrectly selected)
  const mismatches = chosenIds.filter(id => !correctIds.includes(id)).length;

  const totalCorrect = correctIds.length;

  // Formula: (matches - mismatches) / totalCorrect * points
  // Ensure score is not negative
  let rawScore = ((matches - mismatches) / totalCorrect) * points;
  if (rawScore < 0) rawScore = 0;

  // Format to 2 decimal places
  const earnedPoints = parseFloat(rawScore.toFixed(2));

  let verdict = 'FAIL';
  if (matches === totalCorrect && mismatches === 0) {
    verdict = 'PASS';
  } else if (earnedPoints > 0) {
    verdict = 'PARTIAL';
  }

  return {
    earnedPoints,
    verdict,
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

    // Partial grading logic
    // Calculate ratio of passed test cases
    const totalTestCases = testResults.total;
    const passedTestCases = testResults.passed;

    // Avoid division by zero
    const passedRatio = totalTestCases > 0 ? (passedTestCases / totalTestCases) : 0;

    // Earned points proportional to passed test cases
    // Use Math.max(0, ...) to be safe, though passedRatio should be >= 0
    let earnedPoints = parseFloat((passedRatio * points).toFixed(2));

    // Determine verdict
    let verdict = 'FAIL';
    if (passedTestCases === totalTestCases && totalTestCases > 0) {
      verdict = 'PASS';
    } else if (passedTestCases > 0) {
      verdict = 'PARTIAL';
    }
    // else verdict remains 'FAIL'

    return {
      earnedPoints,
      verdict,
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
