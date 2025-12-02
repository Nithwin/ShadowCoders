"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCodeSchema = void 0;
const zod_1 = require("zod");
// Validates the body of the "Run Code" request
exports.runCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        questionId: zod_1.z.string().cuid('Invalid question ID'),
        code: zod_1.z.string().min(1, 'Code cannot be empty'),
        language: zod_1.z.string().min(1, 'Language must be specified'), // e.g., "javascript", "python"
        customInput: zod_1.z.string().optional(), // Optional custom input for testing
        runAllTests: zod_1.z.boolean().optional(), // If true, run all test cases including hidden ones
        // If customInput is provided, run with custom input; otherwise run against visible test cases (or all if runAllTests is true)
    }),
});
//# sourceMappingURL=grading.zod.js.map