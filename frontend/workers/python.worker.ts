/* eslint-disable no-restricted-globals */
// python.worker.ts

// Define types for worker messages since we can't import them inside the worker easily
// without complex build configurations.
type WorkerMessage = 
  | { type: 'INIT'; payload: { pyodideUrl: string } }
  | { type: 'RUN_CODE'; payload: { code: string; input?: string } };

// Fix for 'Cannot find name' errors in Worker environment
declare function importScripts(...urls: string[]): void;
declare function loadPyodide(config: any): Promise<any>;

// Web Worker Global Scope
const ctx: Worker = self as any;

let pyodide: any = null;
let pyodideReadyPromise: Promise<void> | null = null;

// Function to load Pyodide
async function loadPyodideAndPackages(url: string) {
    if (pyodide) return pyodide;

    try {
        // ImportScripts is standard in Workers to load external scripts
        importScripts(url);
        
        // @ts-ignore - loadPyodide is global after importScripts
        pyodide = await loadPyodide({
            indexURL: url.substring(0, url.lastIndexOf('/'))
        });

        // Load commonly used packages
        // await pyodide.loadPackage(['numpy', 'pandas']); 
        // For basic algorithm problems, standard library is usually enough and faster to load.
        // We can add lazy loading for packages later if needed.

        return pyodide;
    } catch (err) {
        console.error("Failed to load Pyodide:", err);
        throw err;
    }
}

// Redirect stdout/stderr to main thread
function setupStreams(pyodideInstance: any) {
    // Pyodide allows setting stdout/stderr during initialization or runPython
    // But for persistent interception we can override sys.stdout
    pyodideInstance.runPython(`
import sys
import io

class JSWriter(io.TextIOBase):
    def write(self, s):
        # Call JS function 'postMessage' via 'js' module? 
        # Easier: Just print, and we capture it via setStdout?
        pass
`);
}

// Handle messages from main thread
ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    try {
        if (type === 'INIT') {
            const { pyodideUrl } = payload;
            if (!pyodideReadyPromise) {
                pyodideReadyPromise = loadPyodideAndPackages(pyodideUrl);
            }
            await pyodideReadyPromise;
            
            // Customize stdout
            pyodide.setStdout({
                batched: (msg: string) => {
                   ctx.postMessage({ type: 'STDOUT', payload: msg });
                }
            });
            pyodide.setStderr({
                batched: (msg: string) => {
                    ctx.postMessage({ type: 'STDERR', payload: msg });
                }
            });

            ctx.postMessage({ type: 'READY' });
        } 
        else if (type === 'RUN_CODE') {
            if (!pyodide) {
                throw new Error("Pyodide not initialized");
            }

            const { code, input } = payload;

            // Reset stdin if input is provided
            if (input !== undefined) {
               // Safer input injection using globals
               pyodide.globals.set("stdin_input", input);
               const pythonInputMock = `
import sys
import io
from js import stdin_input
sys.stdin = io.StringIO(stdin_input)
`;
               await pyodide.runPythonAsync(pythonInputMock);
            }

            const startTime = performance.now();
            
            // Run the user code
            // runPythonAsync is safer for event loop
            await pyodide.runPythonAsync(code);

            const endTime = performance.now();

            ctx.postMessage({ 
                type: 'EXECUTION_COMPLETE', 
                payload: { 
                    time: endTime - startTime 
                } 
            });
        }
    } catch (error: any) {
        ctx.postMessage({ 
            type: 'ERROR', 
            payload: { 
                message: error.message || String(error),
                stack: error.stack 
            } 
        });
    }
};

export {};
