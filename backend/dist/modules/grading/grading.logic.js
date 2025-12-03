"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeCoding = exports.gradeMCQ = exports.areArraysEqual = void 0;
const client_1 = require("@prisma/client");
const local_executor_1 = require("../../lib/local-executor");
const areArraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length)
        return false;
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
};
exports.areArraysEqual = areArraysEqual;
const gradeMCQ = (answer, correctOptionIds, points) => {
    if (!answer?.chosenOptionIds || !correctOptionIds) {
        return {
            earnedPoints: 0,
            verdict: 'FAIL',
            gradingMode: client_1.GradingMode.AUTO,
        };
    }
    const isCorrect = (0, exports.areArraysEqual)(answer.chosenOptionIds, correctOptionIds);
    return {
        earnedPoints: isCorrect ? points : 0,
        verdict: isCorrect ? 'PASS' : 'FAIL',
        gradingMode: client_1.GradingMode.AUTO,
    };
};
exports.gradeMCQ = gradeMCQ;
const gradeCoding = async (answer, testcases, points) => {
    if (!answer?.code || answer.code.trim().length === 0) {
        return {
            earnedPoints: 0,
            verdict: 'FAIL',
            gradingMode: client_1.GradingMode.AUTO,
        };
    }
    if (!testcases || testcases.length === 0) {
        // No test cases, cannot auto-grade properly, maybe give 0 or full?
        // For now, fail safely
        return {
            earnedPoints: 0,
            verdict: 'FAIL',
            gradingMode: client_1.GradingMode.AUTO,
        };
    }
    const code = answer.code.trim();
    const language = answer.language || 'javascript';
    try {
        const testResults = await (0, local_executor_1.testCodeWithTestCasesLocally)(code, language, testcases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            timeoutMs: tc.timeoutMs || 2000,
        })));
        const passedRatio = testResults.total > 0 ? testResults.passed / testResults.total : 0;
        const earnedPoints = Math.round(points * passedRatio * 100) / 100;
        return {
            earnedPoints,
            verdict: testResults.passed === testResults.total ? 'PASS' : 'PARTIAL',
            gradingMode: client_1.GradingMode.AUTO,
        };
    }
    catch (e) {
        console.error('Error auto-grading coding question:', e);
        return {
            earnedPoints: 0,
            verdict: 'FAIL',
            gradingMode: client_1.GradingMode.AUTO,
        };
    }
};
exports.gradeCoding = gradeCoding;
//# sourceMappingURL=grading.logic.js.map