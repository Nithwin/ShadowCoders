import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { env } from '../config/env'; // Assuming your env.ts has GOOGLE_API_KEY

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);

// Configure the model for JSON output
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
  },
  // Safety settings (optional, but good for this use case)
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

/**
 * Sends a structured prompt to the Gemini API and expects a JSON string back.
 */
export const generateJsonFromAi = async (prompt: string): Promise<string> => {
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return responseText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw { status: 500, message: 'Failed to generate content from AI' };
  }
};