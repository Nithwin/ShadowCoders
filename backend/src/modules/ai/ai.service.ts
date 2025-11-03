import { z } from 'zod';
import { generateQuestionsSchema } from './ai.zod';
import { generateJsonFromAi } from '../../lib/gemini';
// We import the QUESTION schema to validate the AI's output
import { addQuestionsSchema } from '../questions/question.zod';

type GenerateInput = z.infer<typeof generateQuestionsSchema>['body'];

// This is the "meta-prompt" - the instructions we give to the AI.
const buildSystemPrompt = (input: GenerateInput): string => {
  return `
    You are an expert exam question generator for a platform called "ShadowCoders".
    A staff member needs you to generate a set of exam questions.

    **Generation Request:**
    - Topic: ${input.topic}
    - Difficulty: ${input.difficulty}
    - Number of MCQs: ${input.mcqCount}
    - Number of Coding Questions: ${input.codingCount} (Language: ${input.language || 'any'})
    - Number of Essay Questions: ${input.essayCount}

    **Your Task:**
    You MUST return your response as a single, valid JSON object.
    This object must have a key "questions" which is an array.
    Each question in the array MUST strictly follow this JSON structure:
    
    {
      "order": number, // The order of the question, e.g., 1, 2, 3...
      "type": "MCQ" | "CODING" | "ESSAY",
      "points": number, // e.g., 10 for EASY, 20 for MEDIUM
      "prompt": "The text of the question...",
      
      // --- For MCQ ---
      "options": [
        { "id": "opt1", "text": "Answer choice 1" },
        { "id": "opt2", "text": "Answer choice 2" },
        { "id": "opt3", "text": "Answer choice 3" },
        { "id": "opt4", "text": "Answer choice 4" }
      ],
      "correctOptionIds": ["opt2"], // The 'id' of the correct option

      // --- For CODING ---
      "starterCode": "function problem() {\n  // your code here\n}",
      "testcases": [
        { "input": "input1", "expectedOutput": "output1", "isHidden": false, "timeoutMs": 2000 },
        { "input": "input2", "expectedOutput": "output2", "isHidden": true, "timeoutMs": 2000 }
      ],

      // --- For ESSAY ---
      "wordLimit": 500
    }

    **Instructions:**
    - Generate exactly the number of questions requested for each type.
    - Omit type-specific fields if not applicable (e.g., 'options' should not be in a CODING question).
    - Ensure 'points' is 10 for EASY, 20 for MEDIUM, 30 for HARD.
    - For CODING questions, provide at least 3 test cases, with at least one not hidden.
    - Do not include any text, greetings, or explanations outside of the single JSON object.
  `;
};

export const generateQuestions = async (input: GenerateInput) => {
  // 1. Build the prompt for the AI
  const prompt = buildSystemPrompt(input);

  // 2. Call the AI service
  const aiResponseString = await generateJsonFromAi(prompt);

  // 3. Parse the AI's string response
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(aiResponseString);
  } catch (error) {
    console.error('AI returned invalid JSON:', aiResponseString);
    throw { status: 500, message: 'AI returned malformed data' };
  }

  // 4. **CRITICAL: Validate the AI's output against our *own* schema.**
  // We use the `addQuestionsSchema` from the 'questions' module for this.
  const validationResult = addQuestionsSchema.shape.body.safeParse(parsedJson);

  if (!validationResult.success) {
    console.error('AI output failed our validation:', validationResult.error.flatten());
    throw { status: 500, message: 'AI output did not match expected question structure' };
  }

  // 5. Return the clean, validated list of questions
  return validationResult.data.questions;
};