import { executeCodeLocally } from './local-executor';
import * as fs from 'fs/promises';
import { exec } from 'child_process';

// We'll mock fs and exec to avoid actual file system/process operations where possible,
// BUT for end-to-end local execution tests we might want to let them run if dependencies (python) are present.
// However, strictly unit testing implies mocking. Given the instructions "Verify stability", 
// running ACTUAL simple code execution is better proof than mocking everything.
// So we will NOT mock fs/exec here, but instead run simple self-contained tests 
// (Javascript/Python) that verify the logic works.

describe('LocalExecutor', () => {
    // Note: These tests assume 'node' is available (which it is).
    // Python tests assume 'python3' or 'python' is available.

    describe('JavaScript Execution', () => {
        it('should execute simple javascript code', async () => {
            const code = 'console.log("Hello World");';
            const result = await executeCodeLocally(code, 'javascript');

            expect(result.status.description).toBe('Accepted');
            expect(result.stdout).toBe('Hello World');
            expect(result.stderr).toBeNull();
        }, 15000);

        it('should capture stderr', async () => {
            const code = 'console.error("Error Message");';
            const result = await executeCodeLocally(code, 'javascript');

            expect(result.status.description).toBe('Runtime Error'); // JS runtime error for syntax or stderr output
            // Note: Our executor implementation might treat stderr as success if exit code is 0,
            // or we might want to check how it actually behaves.
            // Looking at the code: "if (result.stderr) ... return Runtime Error".
            // So if console.error is used, it might be classified as Runtime Error.
            // Let's verify this behavior.
            expect(result.stderr).toContain('Error Message');
        }, 15000);

        it('should handle infinite loops (timeout)', async () => {
            const code = 'while(true) {}';
            const result = await executeCodeLocally(code, 'javascript', '', 1000); // 1s timeout

            expect(result.status.description).toBe('Time Limit Exceeded');
        }, 15000);

        it('should handle syntax errors', async () => {
            const code = 'syntax error here';
            const result = await executeCodeLocally(code, 'javascript');

            expect(result.status.description).toBe('Runtime Error'); // JS runtime error for syntax
            expect(result.stderr).toBeTruthy();
        }, 15000);
    });

    describe('Unsupported Language', () => {
        it('should return error for unsupported language', async () => {
            const result = await executeCodeLocally('print "hi"', 'brainfuck');
            expect(result.status.description).toContain('Unsupported language');
        });
    });
});
