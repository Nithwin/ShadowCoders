/**
 * Helper function to list available models (for debugging)
 * This can help identify which models are accessible with the API key
 */
export declare const listAvailableModels: () => Promise<{
    availableModels: string[];
    unavailableModels: string[];
}>;
/**
 * Sends a structured prompt to the Gemini API and expects a JSON string back.
 * Tries multiple models in order if one fails.
 */
export declare const generateJsonFromAi: (prompt: string) => Promise<string>;
//# sourceMappingURL=gemini.d.ts.map