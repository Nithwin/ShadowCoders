import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, GeneratedQuestion } from "../ai-provider.interface";
import { env } from "../../../config/env";

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.model.generateContent("Hello");
      return true;
    } catch (e) {
      console.error("Gemini Health Check Failed:", e);
      return false;
    }
  }

  async generateQuestion(topic: string, difficulty: string, customPrompt?: string): Promise<GeneratedQuestion> {
    const coreInstruction = customPrompt 
      ? `Instruction: ${customPrompt}. Context: Topic "${topic}", Difficulty ${difficulty}.`
      : `Generate a unique coding interview question about "${topic}" with ${difficulty} difficulty.`;

    const prompt = `
      ${coreInstruction}
      
      Return STRICT JSON format with no markdown formatting.
      Structure:
      {
        "title": "string",
        "description": "string (short summary)",
        "problemStatement": "string (detailed)",
        "inputFormat": "string",
        "outputFormat": "string",
        "constraints": "string",
        "starterCode": [
          { "language": "javascript", "code": "function solve(input) {\n  // Write your code here\n}" }
        ],
        "testCases": [
          { "input": "string", "expectedOutput": "string", "isHidden": false },
          { "input": "string", "expectedOutput": "string", "isHidden": true }
        ]
      }
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean markdown if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const json = JSON.parse(cleanText);
      return {
        ...json,
        topic,
        difficulty
      };
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to parse AI response");
    }
  }

  async analyzeComplexity(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; explanation: string }> {
    const prompt = `
      Analyze the Time and Space Complexity of the following ${language} code.
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`

      Return STRICT JSON format:
      {
        "timeComplexity": "O(...)",
        "spaceComplexity": "O(...)",
        "explanation": "Brief explanation..."
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("Gemini Complexity Analysis Failed:", e);
      return { timeComplexity: "Unknown", spaceComplexity: "Unknown", explanation: "Failed to analyze" };
    }
  }
}
