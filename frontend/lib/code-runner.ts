// lib/code-runner.ts
import { io, Socket } from 'socket.io-client';

export type ExecutionResult = {
  output: string | null;
  error: string | null;
  status: { id: number; description: string };
  time: number;
  memory: number;
};

// Worker Manager to reuse workers
class WorkerManager {
  private pythonWorker: Worker | null = null;
  private javaWorker: Worker | null = null;
  private isPythonReady = false;
  private isJavaReady = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Lazy init?
    }
  }

  async getPythonWorker(): Promise<Worker> {
    if (!this.pythonWorker) {
      this.pythonWorker = new Worker(new URL('../workers/python.worker.ts', import.meta.url));

      // Init Pyodide
      this.pythonWorker.postMessage({
        type: 'INIT',
        payload: { pyodideUrl: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js' }
      });

      // Wait for ready
      await new Promise<void>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'READY') {
            this.isPythonReady = true;
            this.pythonWorker?.removeEventListener('message', handler);
            resolve();
          } else if (e.data.type === 'ERROR') {
            reject(e.data.payload.message);
          }
        };
        this.pythonWorker?.addEventListener('message', handler);
      });
    }
    return this.pythonWorker!;
  }

  async getJavaWorker(): Promise<Worker> {
    if (!this.javaWorker) {
      this.javaWorker = new Worker(new URL('../workers/java.worker.ts', import.meta.url));

      // Init CheerpJ
      this.javaWorker.postMessage({
        type: 'INIT',
        payload: { cheerpjUrl: 'https://cjrtnc.leaningtech.com/3.0/cj3loader.js' }
      });

      // Wait for ready
      await new Promise<void>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'READY') {
            this.isJavaReady = true;
            this.javaWorker?.removeEventListener('message', handler);
            resolve();
          } else if (e.data.type === 'ERROR') {
            reject(e.data.payload.message);
          }
        };
        this.javaWorker?.addEventListener('message', handler);
      });
    }
    return this.javaWorker!;
  }

  terminate() {
    this.pythonWorker?.terminate();
    this.pythonWorker = null;
    this.isPythonReady = false;

    this.javaWorker?.terminate();
    this.javaWorker = null;
    this.isJavaReady = false;
  }
}

export const workerManager = new WorkerManager();

/**
 * Execute code on the CLIENT SIDE (if supported) or fallback to server
 */
export async function runCode(
  code: string,
  language: string,
  input: string
): Promise<ExecutionResult> {
  const lang = language.toLowerCase();

  // 1. PYTHON (Client Side)
  if (lang === 'python') {
    try {
      const worker = await workerManager.getPythonWorker();

      return new Promise((resolve) => {
        let outputBuffer = "";
        let errorBuffer = "";

        const handler = (e: MessageEvent) => {
          const { type, payload } = e.data;

          if (type === 'STDOUT') {
            outputBuffer += payload + "\n";
          } else if (type === 'STDERR') {
            errorBuffer += payload + "\n";
          } else if (type === 'EXECUTION_COMPLETE') {
            worker.removeEventListener('message', handler);
            resolve({
              output: outputBuffer || null,
              error: errorBuffer || null,
              status: { id: 3, description: 'Accepted' },
              time: payload.time,
              memory: 0 // Client side memory tracking is hard
            });
          } else if (type === 'ERROR') {
            worker.removeEventListener('message', handler);
            resolve({
              output: outputBuffer || null,
              error: (errorBuffer + "\n" + payload.message).trim(),
              status: { id: 11, description: 'Runtime Error' },
              time: 0,
              memory: 0
            });
          }
        };

        worker.addEventListener('message', handler);

        // Send Run Command
        worker.postMessage({
          type: 'RUN_CODE',
          payload: { code, input }
        });

        // Timeout Safety (5s)
        setTimeout(() => {
          worker.removeEventListener('message', handler);
          // We might need to terminate worker if it's stuck?
          // implemented via wrapper if needed.
          // For now, let's assume valid Pyodide usage.
          if (!outputBuffer && !errorBuffer) {
            resolve({
              output: null,
              error: "Time Limit Exceeded (Client)",
              status: { id: 5, description: "Time Limit Exceeded" },
              time: 5000,
              memory: 0
            });
          }
        }, 10000);
      });
    } catch (err) {
      console.warn("Client-side execution failed, falling back to server...", err);
      // Fallback to server execution below
    }
  }

  // 2. JAVA (Client Side - CheerpJ)
  if (lang === 'java') {
    try {
      const worker = await workerManager.getJavaWorker();

      return new Promise((resolve, reject) => {
        let outputBuffer = "";
        let errorBuffer = "";

        const handler = (e: MessageEvent) => {
          const { type, payload } = e.data;

          if (type === 'STDOUT') {
            outputBuffer += payload + "\n";
          } else if (type === 'STDERR') {
            errorBuffer += payload + "\n";
          } else if (type === 'EXECUTION_COMPLETE') {
            worker.removeEventListener('message', handler);
            resolve({
              output: outputBuffer || null,
              error: errorBuffer || null,
              status: { id: 3, description: 'Accepted' },
              time: payload.time,
              memory: 0
            });
          } else if (type === 'ERROR') {
            worker.removeEventListener('message', handler);

            // Check if this is a fallback trigger
            if (payload.message && payload.message.includes('FALLBACK_TRIGGERED')) {
              reject(new Error(payload.message));
              return;
            }

            resolve({
              output: outputBuffer || null,
              error: (errorBuffer + "\n" + payload.message).trim(),
              status: { id: 11, description: 'Runtime Error' },
              time: 0,
              memory: 0
            });
          }
        };

        worker.addEventListener('message', handler);

        // Send Run Command (Extract class name if possible, default to Main)
        // Simple regex to find "public class X"
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';

        worker.postMessage({
          type: 'RUN_CODE',
          payload: { code, input, className }
        });

        // Timeout Safety (10s for Java as it can be slower)
        setTimeout(() => {
          worker.removeEventListener('message', handler);
          if (!outputBuffer && !errorBuffer) {
            resolve({
              output: null,
              error: "Time Limit Exceeded (Client)",
              status: { id: 5, description: "Time Limit Exceeded" },
              time: 10000,
              memory: 0
            });
          }
        }, 20000);
      });
    } catch (err) {
      console.warn("Client-side Java execution failed, falling back to server...", err);
      // Fallback handled by caller
    }
  }

  // 2. JAVASCRIPT (Client Side)
  if (lang === 'javascript') {
    // Implement JS worker similarly
  }

  // 3. FALLBACK: Server-Side Execution (for other languages or if client fails)
  // THIS IS WHAT WE WANT TO AVOID but we keep it as backup
  throw new Error("Client side execution not implemented for " + language);
}
