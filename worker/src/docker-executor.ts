import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Docker Sandbox Executor
 * 
 * Executes untrusted code inside a Docker container with:
 * - Memory limit (128MB)
 * - CPU limit (0.5 cores)
 * - No network access
 * - Read-only filesystem
 * - Process limit (prevents fork bombs)
 * - File size limit
 * - Timeout enforcement (double: Docker timeout + host kill)
 */

const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'shadowcoders-sandbox';
const MAX_MEMORY = process.env.MAX_MEMORY || '128m';
const MAX_CPUS = process.env.MAX_CPUS || '0.5';
const MAX_PIDS = process.env.MAX_PIDS || '32';
const MAX_OUTPUT_SIZE = 1024 * 256; // 256KB max output

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

// Language configurations
interface LangConfig {
  extension: string;
  compileCmd?: (filename: string) => string;
  runCmd: (filename: string) => string;
}

const LANG_CONFIGS: Record<string, LangConfig> = {
  c: {
    extension: 'c',
    compileCmd: (f) => `gcc /sandbox/${f} -o /tmp/a.out -O2 -lm`,
    runCmd: () => `/tmp/a.out`,
  },
  cpp: {
    extension: 'cpp',
    compileCmd: (f) => `g++ /sandbox/${f} -o /tmp/a.out -std=c++17 -O2`,
    runCmd: () => `/tmp/a.out`,
  },
  java: {
    extension: 'java',
    compileCmd: (f) => `javac -d /tmp /sandbox/${f}`,
    runCmd: () => `java -cp /tmp Main`,
  },
  python: {
    extension: 'py',
    runCmd: (f) => `python3 /sandbox/${f}`,
  },
  javascript: {
    extension: 'js',
    runCmd: (f) => `node /sandbox/${f}`,
  },
};

/**
 * Execute code inside a Docker container.
 * 
 * @param code        Source code string
 * @param language    Language (c, cpp, java, python, javascript)
 * @param input       Stdin input
 * @param timeoutMs   Timeout in milliseconds
 * @param compileOnly If true, only compile (for pre-compilation in test cases)
 */
export async function executeInDocker(
  code: string,
  language: string,
  input: string = '',
  timeoutMs: number = 10000,
  compileOnly: boolean = false,
): Promise<ExecutionResult> {
  const langConfig = LANG_CONFIGS[language.toLowerCase()];
  if (!langConfig) {
    return {
      stdout: null,
      stderr: null,
      compileOutput: null,
      status: { id: 11, description: `Unsupported language: ${language}` },
      time: 0,
      memory: 0,
      error: `Unsupported language: ${language}. Supported: ${Object.keys(LANG_CONFIGS).join(', ')}`,
    };
  }

  // Create temp directory for this execution
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-exec-'));
  const filename = language.toLowerCase() === 'java' ? 'Main.java' : `code.${langConfig.extension}`;
  const codePath = path.join(tempDir, filename);
  const inputPath = path.join(tempDir, 'input.txt');

  try {
    // Write code and input to temp files
    fs.writeFileSync(codePath, code, 'utf-8');
    fs.writeFileSync(inputPath, input || '', 'utf-8');

    // Build the command to run inside the container
    const timeoutSec = Math.ceil(timeoutMs / 1000);
    let containerCmd: string;

    if (langConfig.compileCmd) {
      if (compileOnly) {
        containerCmd = langConfig.compileCmd(filename);
      } else {
        // Compile and run
        containerCmd = `${langConfig.compileCmd(filename)} && timeout ${timeoutSec} ${langConfig.runCmd(filename)} < /sandbox/input.txt`;
      }
    } else {
      // Interpreted language — just run
      containerCmd = `timeout ${timeoutSec} ${langConfig.runCmd(filename)} < /sandbox/input.txt`;
    }

    // Build Docker run command with ALL security flags
    const dockerArgs = [
      'run',
      '--rm',                                    // Auto-remove container
      '--network', 'none',                       // NO network access
      '--memory', MAX_MEMORY,                    // Memory limit
      '--memory-swap', MAX_MEMORY,               // No swap (hard limit)
      '--cpus', MAX_CPUS,                        // CPU limit
      '--pids-limit', MAX_PIDS,                  // Process limit (anti fork-bomb)
      '--read-only',                             // Read-only root filesystem
      '--tmpfs', '/tmp:rw,size=16m,noexec',      // Small writable /tmp
      '--security-opt', 'no-new-privileges',     // No privilege escalation
      '--ulimit', 'nproc=32:32',                 // Process limit backup
      '--ulimit', 'fsize=1048576:1048576',       // Max 1MB file write
      '--ulimit', 'nofile=64:64',                // Max 64 open files
      '--user', 'sandbox',                       // Non-root user
      '-v', `${tempDir}:/sandbox:ro`,            // Mount code read-only
      '-w', '/sandbox',                          // Working directory
      DOCKER_IMAGE,                              // Image name
      '/bin/sh', '-c', containerCmd,             // Command
    ];

    const startTime = Date.now();

    return await new Promise<ExecutionResult>((resolve) => {
      const proc = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Host-side timeout (safety net beyond Docker's timeout command)
      const hostTimeout = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch (e) {
          // Ignore
        }
      }, timeoutMs + 5000); // Extra 5s grace for Docker overhead

      proc.stdout?.on('data', (data: Buffer) => {
        if (stdout.length < MAX_OUTPUT_SIZE) {
          const chunk = data.toString();
          stdout += chunk.substring(0, MAX_OUTPUT_SIZE - stdout.length);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        if (stderr.length < MAX_OUTPUT_SIZE) {
          const chunk = data.toString();
          stderr += chunk.substring(0, MAX_OUTPUT_SIZE - stderr.length);
        }
      });

      proc.on('exit', (code: number | null, signal: string | null) => {
        clearTimeout(hostTimeout);
        const executionTime = Date.now() - startTime;

        if (timedOut || code === 124) {
          // 124 = timeout command exit code
          resolve({
            stdout: stdout.trim() || null,
            stderr: 'Time Limit Exceeded',
            compileOutput: null,
            status: { id: 5, description: 'Time Limit Exceeded' },
            time: executionTime,
            memory: 0,
            error: 'Time Limit Exceeded',
          });
          return;
        }

        if (code === 137) {
          // SIGKILL — usually OOM
          resolve({
            stdout: stdout.trim() || null,
            stderr: 'Memory Limit Exceeded (process killed)',
            compileOutput: null,
            status: { id: 9, description: 'Memory Limit Exceeded' },
            time: executionTime,
            memory: 0,
            error: 'Memory Limit Exceeded',
          });
          return;
        }

        // Check for compilation errors
        if (stderr && langConfig.compileCmd) {
          const stderrLower = stderr.toLowerCase();
          if (stderrLower.includes('error:') && 
              (stderrLower.includes('.c:') || stderrLower.includes('.cpp:') || 
               stderrLower.includes('.java:') || stderrLower.includes('cannot find symbol'))) {
            resolve({
              stdout: null,
              stderr: null,
              compileOutput: stderr.trim(),
              status: { id: 6, description: 'Compilation Error' },
              time: executionTime,
              memory: 0,
              error: stderr.trim(),
            });
            return;
          }
        }

        if (code !== 0) {
          resolve({
            stdout: stdout.trim() || null,
            stderr: stderr.trim() || `Process exited with code ${code}`,
            compileOutput: null,
            status: { id: 7, description: 'Runtime Error' },
            time: executionTime,
            memory: 0,
            error: stderr.trim() || `Process exited with code ${code}`,
          });
          return;
        }

        // Success
        resolve({
          stdout: stdout.trim() || null,
          stderr: stderr.trim() || null,
          compileOutput: null,
          status: { id: 3, description: 'Accepted' },
          time: executionTime,
          memory: 0,
        });
      });

      proc.on('error', (error: Error) => {
        clearTimeout(hostTimeout);
        resolve({
          stdout: null,
          stderr: error.message,
          compileOutput: null,
          status: { id: 11, description: 'Internal Error' },
          time: Date.now() - startTime,
          memory: 0,
          error: `Docker execution failed: ${error.message}`,
        });
      });
    });
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Retry after small delay
      setTimeout(() => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.error('[DockerExecutor] Failed to cleanup temp dir:', tempDir);
        }
      }, 1000);
    }
  }
}

/**
 * Pre-build the Docker sandbox image.
 * Call this on worker startup to ensure the image exists.
 */
export function ensureDockerImage(): boolean {
  try {
    // Check if image exists
    execSync(`docker image inspect ${DOCKER_IMAGE}`, { stdio: 'pipe' });
    console.log(`[DockerExecutor] Image '${DOCKER_IMAGE}' found`);
    return true;
  } catch {
    console.warn(`[DockerExecutor] Image '${DOCKER_IMAGE}' not found. Build it with:`);
    console.warn(`  docker build -t ${DOCKER_IMAGE} -f docker/sandbox/Dockerfile.sandbox docker/sandbox/`);
    return false;
  }
}
