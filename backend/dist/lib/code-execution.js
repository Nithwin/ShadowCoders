"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCode = executeCode;
const local_executor_1 = require("./local-executor");
/**
 * Execute code and return simplified result
 */
async function executeCode(request) {
    const result = await (0, local_executor_1.executeCodeLocally)(request.code, request.language, request.input, request.timeLimit || 5000);
    return {
        output: result.stdout,
        error: result.stderr || result.compileOutput || result.error || null,
        status: result.status,
        time: result.time,
        memory: result.memory,
    };
}
//# sourceMappingURL=code-execution.js.map