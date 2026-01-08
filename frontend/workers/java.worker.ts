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
            // Trigger fallback to server
            ctx.postMessage({
                type: 'ERROR',
                payload: {
                    message: "Client-side Java execution not yet implemented. FALLBACK_TRIGGERED"
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

export { };
