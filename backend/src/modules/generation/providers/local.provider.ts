import axios from 'axios';
import { AIProvider, GeneratedQuestion } from "../ai-provider.interface";
import { env } from "../../../config/env";

export class LocalProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = env.OLLAMA_MODEL || "codellama:7b";
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch (e) {
      console.error("Ollama Health Check Failed:", e);
      return false;
    }
  }

  async generateQuestion(topic: string, difficulty: string, customPrompt?: string): Promise<GeneratedQuestion> {
    const coreInstruction = customPrompt 
      ? `Instruction: ${customPrompt}. Context: Topic "${topic}", Difficulty ${difficulty}.`
      : `Generate a unique coding interview question about "${topic}" with ${difficulty} difficulty.`;

    const prompt = `
      You are a coding question generator.
      ${coreInstruction}
      
      Return ONLY STRICT VALID JSON. No extra text.
      JSON Schema:
      {
        "title": "string",
        "description": "string",
        "problemStatement": "string",
        "inputFormat": "string",
        "outputFormat": "string",
        "constraints": "string",
        "starterCode": [
            { "language": "javascript", "code": "..." }
        ],
        "testCases": [
            { "input": "...", "expectedOutput": "...", "isHidden": false }
        ]
      }
    `;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: "json" // Force JSON mode
      });

      const json = JSON.parse(response.data.response);
      return {
        ...json,
        topic,
        difficulty
      };
    } catch (e) {
      console.error("Ollama Generation Failed:", e);
      throw new Error("Failed to generate question via Local AI");
    }
  }

  async analyzeComplexity(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; explanation: string }> {
    const prompt = `
      Analyze the Time and Space Complexity of this ${language} code.
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Return ONLY STRICT VALID JSON. Schema:
      { "timeComplexity": "O(...)", "spaceComplexity": "O(...)", "explanation": "string" }
    `;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: "json"
      });
      return JSON.parse(response.data.response);
    } catch (e) {
      console.error("Local Complexity Analysis Failed:", e);
      return { timeComplexity: "Unknown", spaceComplexity: "Unknown", explanation: "Failed to analyze locally" };
    }
  }
}
