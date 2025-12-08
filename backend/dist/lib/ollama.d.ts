/**
 * Sends a prompt to the local Ollama instance and expects a JSON string back.
 * Uses the 'json' format parameter to force JSON output (requires supported models like llama3, mistral).
 */
export declare const generateJsonFromOllama: (prompt: string) => Promise<string>;
//# sourceMappingURL=ollama.d.ts.map