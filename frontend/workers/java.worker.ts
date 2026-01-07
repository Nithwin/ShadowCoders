/* eslint-disable no-restricted-globals */
// java.worker.ts

// Define types
type WorkerMessage = 
  | { type: 'INIT'; payload: { cheerpjUrl: string } }
  | { type: 'RUN_CODE'; payload: { code: string; input?: string; className?: string } };

// Fix for 'Cannot find name' errors
declare function importScripts(...urls: string[]): void;

// Web Worker Global Scope
const ctx: Worker = self as any;

let cheerpjReady = false;
let cheerpjPromise: Promise<void> | null = null;

// CheerpJ globals (injected by script)
declare const cheerpjInit: (options?: any) => Promise<void>;
declare const cheerpjRunMain: (className: string, ...args: string[]) => Promise<void>;
declare const cjFileBlob: (content: any) => Blob;

// Minimal CheerpJ loader
async function loadCheerpJ(url: string) {
    if (cheerpjReady) return;

    try {
        // Import CheerpJ loader script
        // Note: CheerpJ 3.0 usually requires a specific loader script
        importScripts(url);
        
        // Initialize CheerpJ
        // Check documentation for updated init methods for 3.0
        // Currently assuming 3.0 (cheerpjInit is standard)
        await cheerpjInit({
             status: "splash", // hidden splash
             // mounts, etc.
             preloadResources: [] 
        });

        cheerpjReady = true;
    } catch (err) {
        console.error("Failed to load CheerpJ:", err);
        throw err;
    }
}

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    try {
        if (type === 'INIT') {
            const { cheerpjUrl } = payload;
            if (!cheerpjPromise) {
                cheerpjPromise = loadCheerpJ(cheerpjUrl);
            }
            await cheerpjPromise;
            ctx.postMessage({ type: 'READY' });
        } 
        else if (type === 'RUN_CODE') {
            if (!cheerpjReady) {
                throw new Error("Java Runtime not initialized");
            }

            const { code, input, className = 'Main' } = payload;
            
            // 1. Compile Java Code? 
            // CheerpJ usually runs .jar or .class files. 
            // Running SOURCE code completely client-side in Java requires a Java Compiler (javac) running in Wasm.
            // This is heavy.
            
            // ALTERNATIVE for "Run Code" in browser for Java:
            // We need 'javac' available. 
            // CheerpJ supports running `javac` if we provide the tools.jar.
            
            // For this iteration, since user asked to "download them not after they take exam", 
            // implies we rely on heavy cache.
            
            // Simplified execution flow for now:
            // Just mocking the success message as placeholder until full CheerpJ compiler setup is confirmed (requires ~40MB download).
            // But we will implement the structure.
            
            // NOTE: Real-world Java-in-browser compilation is complex. 
            // Common approach: Server-side compile -> Client-side run (Hybrid) 
            // OR Download full JDK to browser (Very Heavy).
            
            const startTime = performance.now();

            // Mocking execution for safety until JARs are ready
            // Real implementation requires '/str/javac' command mapping.
            
            ctx.postMessage({ type: 'STDOUT', payload: 'Java execution in browser requires full JDK download (implemented in Phase 3).' });
            ctx.postMessage({ type: 'STDOUT', payload: `Simulated Output for: ${className}` });
            
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
