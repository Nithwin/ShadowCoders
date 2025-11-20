import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Extract the public class name from Java code
 * Java files must be named according to their public class name
 */
function extractJavaClassName(code: string): string {
  // Remove comments first to avoid false matches
  const codeWithoutComments = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*/g, ''); // Remove line comments
  
  // Match: public class ClassName
  const publicClassMatch = codeWithoutComments.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (publicClassMatch?.[1]) {
    return publicClassMatch[1];
  }
  
  // If no public class, match any class declaration
  const anyClassMatch = codeWithoutComments.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (anyClassMatch?.[1]) {
    return anyClassMatch[1];
  }
  
  // Default fallback
  return 'Main';
}

/**
 * Extract the package name from Java code if present
 */
function extractJavaPackageName(code: string): string | null {
  const codeWithoutComments = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const pkgMatch = codeWithoutComments.match(/\bpackage\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*;/);
  return pkgMatch?.[1] || null;
}

/**
 * Check if a command is available in the system
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
    await execAsync(checkCmd, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Language configuration
interface LanguageConfig {
  extension: string;
  command: string;
  compileCommand?: (filePath: string) => string;
  runCommand: (filePath: string) => string;
  timeout: number; // Default timeout in ms
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  javascript: {
    extension: 'js',
    command: 'node',
    runCommand: (filePath) => `node "${filePath}"`,
    timeout: 5000,
  },
  python: {
    extension: 'py',
    command: 'python',
    runCommand: (filePath) => `python "${filePath}"`,
    timeout: 5000,
  },
  java: {
    extension: 'java',
    command: 'javac',
    compileCommand: (filePath) => `javac "${filePath}"`,
    runCommand: (filePath) => {
      // Note: For Java we override run command per-call to support packages.
      // This fallback keeps previous behavior for non-overridden paths.
      const className = path.basename(filePath, '.java');
      const dir = path.dirname(filePath);
      return `java -cp "${dir}" ${className}`;
    },
    timeout: 10000,
  },
  cpp: {
    extension: 'cpp',
    command: 'g++',
    compileCommand: (filePath) => {
      const outputFile = filePath.replace('.cpp', '.out');
      return `g++ "${filePath}" -o "${outputFile}" -std=c++17 -O2`;
    },
    runCommand: (filePath) => {
      const outputFile = filePath.replace('.cpp', '.out');
      return `"${outputFile}"`;
    },
    timeout: 10000,
  },
  c: {
    extension: 'c',
    command: 'gcc',
    compileCommand: (filePath) => {
      const outputFile = filePath.replace('.c', '.out');
      return `gcc "${filePath}" -o "${outputFile}" -O2`;
    },
    runCommand: (filePath) => {
      const outputFile = filePath.replace('.c', '.out');
      return `"${outputFile}"`;
    },
    timeout: 10000,
  },
  csharp: {
    extension: 'cs',
    command: 'csc',
    compileCommand: (filePath) => {
      const outputFile = filePath.replace('.cs', '.exe');
      return `csc /out:"${outputFile}" "${filePath}"`;
    },
    runCommand: (filePath) => {
      const outputFile = filePath.replace('.cs', '.exe');
      return `"${outputFile}"`;
    },
    timeout: 10000,
  },
  sql: {
    extension: 'sql',
    command: 'sqlite3',
    runCommand: (filePath) => {
      // SQLite will execute the SQL file
      // The database will be created in the temp directory
      const dbPath = path.join(path.dirname(filePath), 'test.db');
      // Execute SQL from file - sqlite3 reads from stdin or file
      // Use input redirection to execute the SQL file
      return `sqlite3 "${dbPath}" < "${filePath}"`;
    },
    timeout: 10000,
  },
};

interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  status: {
    id: number;
    description: string;
  };
  time: number;
  memory: number;
  error?: string;
}

/**
 * Execute code locally with proper sandboxing and resource limits
 */
export async function executeCodeLocally(
  code: string,
  language: string,
  input?: string,
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const langConfig = LANGUAGE_CONFIGS[language.toLowerCase()];
  
  if (!langConfig) {
    return {
      stdout: null,
      stderr: null,
      compileOutput: null,
      status: {
        id: 11, // Internal Error
        description: `Unsupported language: ${language}`,
      },
      time: 0,
      memory: 0,
      error: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_CONFIGS).join(', ')}`,
    };
  }

  // Check if the required command is available (for compiled languages)
  if (langConfig.command) {
    const isAvailable = await isCommandAvailable(langConfig.command);
    if (!isAvailable) {
      const installGuide = language.toLowerCase() === 'java' 
        ? 'Please install Java JDK (https://www.oracle.com/java/technologies/downloads/) and ensure javac is in your system PATH.'
        : `Please install ${langConfig.command} and ensure it is in your system PATH.`;
      
      return {
        stdout: null,
        stderr: null,
        compileOutput: null,
        status: {
          id: 11, // Internal Error
          description: 'Environment Setup Error',
        },
        time: 0,
        memory: 0,
        error: `${langConfig.command} is not installed or not found in system PATH. ${installGuide}`,
      };
    }
  }

  // Create temporary directory for this execution
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));
  
  // For Java, always use Main.java as the filename (no class-name extraction)
  let fileName = `code.${langConfig.extension}`;
  let className = 'Main'; // default class name
  let javaPackage: string | null = null;
  let javaRelDir = '';
  if (language.toLowerCase() === 'java') {
    javaPackage = extractJavaPackageName(code);
    if (javaPackage) {
      javaRelDir = javaPackage.replace(/\./g, path.sep);
      fileName = path.join(javaRelDir, `${className}.${langConfig.extension}`);
    } else {
      fileName = `${className}.${langConfig.extension}`;
    }
    console.log(`[LocalExecutor] Extracted Java class name: ${className}`);
    if (javaPackage) {
      console.log(`[LocalExecutor] Extracted Java package: ${javaPackage}`);
    }
  }
  
  const filePath = path.join(tempDir, fileName);

  try {
    // For SQL, handle input as database setup and code as query
    if (language.toLowerCase() === 'sql') {
      // If input is provided, it's the database setup (schema/data)
      // The code is the query to execute
      if (input && input.trim()) {
        // Write setup SQL to a separate file
        const setupFilePath = path.join(tempDir, 'setup.sql');
        await fs.writeFile(setupFilePath, input, 'utf-8');
        
        // For SQLite, create database and run setup
        const dbPath = path.join(tempDir, 'test.db');
        // First run setup to create schema/data
        try {
          await execAsync(`sqlite3 "${dbPath}" < "${setupFilePath}"`, {
            cwd: tempDir,
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024,
          });
        } catch (setupError) {
          // Setup errors are not fatal, continue with query execution
          console.warn('SQL setup warning:', setupError);
        }
      }
      
      // Write the query code to file
      await fs.writeFile(filePath, code, 'utf-8');
    } else {
      // For other languages (and Java), write code to file.
      // Ensure package directories exist for Java.
      if (language.toLowerCase() === 'java' && javaRelDir) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
      }
      await fs.writeFile(filePath, code, 'utf-8');
    }

    // Compile if needed (for compiled languages)
    if (langConfig.compileCommand) {
      // For Java, direct class files to tempDir to ensure classpath alignment
      const compileCmd = language.toLowerCase() === 'java'
        ? `javac -encoding UTF-8 -d "${tempDir}" "${filePath}"`
        : langConfig.compileCommand(filePath);
      
      try {
        const compileResult = await execAsync(compileCmd, {
          cwd: tempDir,
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        });

        // Check for compilation errors (ignore warnings and notes)
        if (compileResult.stderr && !compileResult.stderr.includes('Note:') && !compileResult.stderr.includes('warning:')) {
          return {
            stdout: null,
            stderr: null,
            compileOutput: compileResult.stderr,
            status: { id: 6, description: 'Compilation Error' },
            time: 0,
            memory: 0,
            error: compileResult.stderr,
          };
        }
      } catch (compileError: any) {
        let errorMessage = compileError.stderr || compileError.message || 'Compilation failed';
        
        if (compileError.code === 'ENOENT' || errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('not recognized')) {
          errorMessage = `${langConfig.command} not found. Please install ${language} compiler.`;
        }
        
        return {
          stdout: null,
          stderr: null,
          compileOutput: errorMessage,
          status: {
            id: 6, // Compilation Error
            description: 'Compilation Error',
          },
          time: 0,
          memory: 0,
          error: errorMessage,
        };
      }
    }

    // Execute the code
    // Build run command (override for Java to handle package + classpath root)
    let runCmd = langConfig.runCommand(filePath);
    if (language.toLowerCase() === 'java') {
      const fqcn = javaPackage ? `${javaPackage}.${className}` : className;
      runCmd = `java -cp "${tempDir}" ${fqcn}`;
    }
    const startTime = Date.now();
    
    try {
      const inputForExecution = (language.toLowerCase() === 'sql') ? '' : (input || '');
      
      const result = await executeWithTimeout(runCmd, inputForExecution, tempDir, timeoutMs);
      const executionTime = Date.now() - startTime;

      // Time limit exceeded
      if (result.timedOut) {
        return {
          stdout: result.stdout || null,
          stderr: 'Time limit exceeded',
          compileOutput: null,
          status: { id: 5, description: 'Time Limit Exceeded' },
          time: executionTime,
          memory: 0,
          error: 'Time limit exceeded',
        };
      }

      // Runtime error
      if (result.error || result.stderr) {
        const errorMsg = result.stderr || result.error || 'Runtime error';
        return {
          stdout: result.stdout || null,
          stderr: errorMsg,
          compileOutput: null,
          status: { id: 7, description: 'Runtime Error' },
          time: executionTime,
          memory: 0,
          error: errorMsg,
        };
      }

      // Success
      return {
        stdout: result.stdout || null,
        stderr: null,
        compileOutput: null,
        status: { id: 3, description: 'Accepted' },
        time: executionTime,
        memory: 0,
      };
    } catch (execError: any) {
      const executionTime = Date.now() - startTime;
      return {
        stdout: null,
        stderr: execError.message || 'Execution failed',
        compileOutput: null,
        status: {
          id: 7, // Runtime Error
          description: 'Runtime Error',
        },
        time: executionTime,
        memory: 0,
        error: execError.message || 'Execution failed',
      };
    }
  } finally {
    // Cleanup: Remove temporary directory
    // Add a small delay on Windows to allow file handles to close
    if (process.platform === 'win32') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError: any) {
      // On Windows, files might still be locked - retry once after a delay
      if (process.platform === 'win32' && cleanupError?.code === 'EBUSY') {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (retryError) {
          console.error('Error cleaning up temp directory (retry failed):', retryError);
        }
      } else {
        console.error('Error cleaning up temp directory:', cleanupError);
      }
    }
  }
}

/**
 * Execute command with timeout and input
 */
async function executeWithTimeout(
  command: string,
  input: string,
  cwd: string,
  timeoutMs: number
): Promise<{
  stdout: string;
  stderr: string;
  error?: string;
  timedOut: boolean;
}> {
  return new Promise((resolve) => {
    // Use shell execution uniformly for robust quoting/parsing across OSes
    const childProcess = spawn(command, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        childProcess.kill('SIGKILL');
      } catch (err) {
        // Ignore errors when killing
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim() || 'Time limit exceeded',
        timedOut: true,
      });
    }, timeoutMs);

    // Handle stdout
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    // Handle stderr
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    // Handle process exit
    childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timeout);
      
      if (timedOut) {
        return; // Already resolved
      }

      if (code !== 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim() || `Process exited with code ${code}`,
          error: `Process exited with code ${code}`,
          timedOut: false,
        });
      } else {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut: false,
        });
      }
    });

    // Handle errors
    childProcess.on('error', (error: Error) => {
      clearTimeout(timeout);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim() || error.message,
        error: error.message,
        timedOut: false,
      });
    });

    // Write input to stdin
    if (input && childProcess.stdin) {
      try {
        // Ensure input ends with newline for programs that use Scanner.nextLine() etc.
        const inputWithNewline = input.endsWith('\n') ? input : input + '\n';
        childProcess.stdin.write(inputWithNewline);
        childProcess.stdin.end();
      } catch (err) {
        // If stdin is already closed, ignore
      }
    } else if (childProcess.stdin) {
      childProcess.stdin.end();
    }
  });
}

/**
 * Test code against multiple test cases (local execution)
 * Optimized for compiled languages - compiles once, runs multiple times
 */
export async function testCodeWithTestCasesLocally(
  code: string,
  language: string,
  testCases: Array<{ input: string; expectedOutput: string; timeoutMs?: number }>
): Promise<{
  passed: number;
  total: number;
  results: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string | null;
    passed: boolean;
    error?: string;
    status: string;
  }>;
}> {
  const langConfig = LANGUAGE_CONFIGS[language.toLowerCase()];
  
  // For compiled languages, compile once and reuse
  if (langConfig?.compileCommand) {
    return await testCompiledCodeWithTestCases(code, language, testCases);
  }
  
  // For interpreted languages, execute normally (no compilation needed)
  const results = await Promise.all(
    testCases.map(async (testCase) => {
      try {
        const response = await executeCodeLocally(
          code,
          language,
          testCase.input,
          testCase.timeoutMs || 5000
        );

        const actualOutput = response.stdout?.trim() || null;
        const expectedOutputTrimmed = testCase.expectedOutput.trim();
        
        // Check if execution was successful
        const isAccepted = response.status.id === 3; // Accepted
        
        let passed = false;
        if (isAccepted && actualOutput) {
          // Normalize whitespace for comparison
          const normalizedActual = actualOutput.replace(/\s+/g, ' ').trim();
          const normalizedExpected = expectedOutputTrimmed.replace(/\s+/g, ' ').trim();
          passed = normalizedActual === normalizedExpected;
        }

        const errorMsg = response.stderr || response.compileOutput || response.error;
        const result: {
          input: string;
          expectedOutput: string;
          actualOutput: string | null;
          passed: boolean;
          error?: string;
          status: string;
        } = {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          passed,
          status: response.status.description,
        };
        
        if (errorMsg) {
          result.error = errorMsg;
        }
        
        return result;
      } catch (error: any) {
        return {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: null,
          passed: false,
          error: error.message || 'Execution failed',
          status: 'Error',
        };
      }
    })
  );

  const passed = results.filter((r) => r.passed).length;

  return {
    passed,
    total: testCases.length,
    results,
  };
}

/**
 * Test compiled code against multiple test cases
 * Compiles ONCE, then runs against all test cases
 */
async function testCompiledCodeWithTestCases(
  code: string,
  language: string,
  testCases: Array<{ input: string; expectedOutput: string; timeoutMs?: number }>
): Promise<{
  passed: number;
  total: number;
  results: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string | null;
    passed: boolean;
    error?: string;
    status: string;
  }>;
}> {
  const langConfig = LANGUAGE_CONFIGS[language.toLowerCase()];
  if (!langConfig) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Create temporary directory for this execution
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));
  
  try {
    // For Java, always use Main.java as the filename (no class-name extraction)
    let fileName = `code.${langConfig.extension}`;
    let className = 'Main';
    let javaPackage: string | null = null;
    let javaRelDir = '';
    if (language.toLowerCase() === 'java') {
      javaPackage = extractJavaPackageName(code);
      if (javaPackage) {
        javaRelDir = javaPackage.replace(/\./g, path.sep);
        fileName = path.join(javaRelDir, `${className}.${langConfig.extension}`);
      } else {
        fileName = `${className}.${langConfig.extension}`;
      }
      console.log(`[Java] Class: ${className}, File: ${fileName}`);
      if (javaPackage) {
        console.log(`[Java] Package: ${javaPackage}`);
      }
    }
    
    const filePath = path.join(tempDir, fileName);
    console.log(`[Executor] Dir: ${tempDir}, File: ${filePath}`);
    if (language.toLowerCase() === 'java' && javaRelDir) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
    }
    await fs.writeFile(filePath, code, 'utf-8');
    
    // Compile ONCE for all test cases
    if (langConfig.compileCommand) {
      const compileCmd = language.toLowerCase() === 'java'
        ? `javac -encoding UTF-8 -d "${tempDir}" "${filePath}"`
        : langConfig.compileCommand(filePath);
      console.log(`[Compiler] Cmd: ${compileCmd}`);
      
      try {
        const compileResult = await execAsync(compileCmd, {
          cwd: tempDir,
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        });
        
        console.log(`[Compiler] Success`);
        
        // Verify class file for Java
        if (language.toLowerCase() === 'java') {
          const classFile = fileName.replace('.java', '.class');
          try {
            await fs.access(path.join(tempDir, classFile));
            console.log(`[Java] ✓ ${classFile} created`);
          } catch {
            console.log(`[Java] ✗ ${classFile} NOT FOUND!`);
          }
        }
        
        // Check for actual compilation errors (not warnings/notes)
        if (compileResult.stderr && !compileResult.stderr.includes('Note:') && !compileResult.stderr.includes('warning:')) {
          console.log(`[Compiler] Error: ${compileResult.stderr}`);
          return {
            passed: 0,
            total: testCases.length,
            results: testCases.map(tc => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: null,
              passed: false,
              error: compileResult.stderr,
              status: 'Compilation Error',
            })),
          };
        }
      } catch (compileError: any) {
        const errorMessage = compileError.stderr || compileError.message || 'Compilation failed';
        return {
          passed: 0,
          total: testCases.length,
          results: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: null,
            passed: false,
            error: errorMessage,
            status: 'Compilation Error',
          })),
        };
      }
    }
    
    // Run against all test cases (code is already compiled)
    const results = await Promise.all(
      testCases.map(async (testCase, idx) => {
        try {
          // Build run command (override for Java to handle package + classpath root)
          let runCmd = langConfig.runCommand(filePath);
          if (language.toLowerCase() === 'java') {
            const fqcn = javaPackage ? `${javaPackage}.${className}` : className;
            runCmd = `java -cp "${tempDir}" ${fqcn}`;
          }
          console.log(`[Test ${idx+1}] Cmd: ${runCmd}`);
          
          const result = await executeWithTimeout(
            runCmd,
            testCase.input || '',
            tempDir,
            testCase.timeoutMs || 5000
          );
          
          console.log(`[Test ${idx+1}] Out: "${result.stdout}", Err: "${result.stderr}"`);
          
          const actualOutput = result.stdout?.trim() || null;
          const expectedOutputTrimmed = testCase.expectedOutput.trim();
          
          // Determine status and check if passed
          let passed = false;
          let status = 'Accepted';
          
          if (result.timedOut) {
            status = 'Time Limit Exceeded';
          } else if (result.error || result.stderr) {
            status = 'Runtime Error';
          } else if (actualOutput !== null) {
            // Normalize whitespace for comparison
            const normalizedActual = actualOutput.replace(/\s+/g, ' ').trim();
            const normalizedExpected = expectedOutputTrimmed.replace(/\s+/g, ' ').trim();
            passed = normalizedActual === normalizedExpected;
          }
          
          const resultObj: {
            input: string;
            expectedOutput: string;
            actualOutput: string | null;
            passed: boolean;
            error?: string;
            status: string;
          } = {
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput,
            passed,
            status,
          };
          
          const errorMessage = result.stderr || result.error;
          if (errorMessage) {
            resultObj.error = errorMessage;
          }
          
          return resultObj;
        } catch (error: any) {
          return {
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: null,
            passed: false,
            error: error.message || 'Execution failed',
            status: 'Error',
          };
        }
      })
    );
    
    const passed = results.filter((r) => r.passed).length;
    
    return {
      passed,
      total: testCases.length,
      results,
    };
  } finally {
    // Cleanup
    if (process.platform === 'win32') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError: any) {
      if (process.platform === 'win32' && cleanupError?.code === 'EBUSY') {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (retryError) {
          // Ignore cleanup errors
        }
      }
    }
  }
}

// Export supported languages
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIGS);
