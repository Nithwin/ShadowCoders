import { z } from 'zod';
import { generateQuestionsSchema } from './ai.zod';
import { generateJsonFromAi } from '../../lib/gemini';
import { env } from '../../config/env';
// We import the QUESTION schema to validate the AI's output
import { addQuestionsSchema } from '../questions/question.zod';

type GenerateInput = z.infer<typeof generateQuestionsSchema>['body'];

// This is the "meta-prompt" - the instructions we give to the AI.
const buildSystemPrompt = (input: GenerateInput): string => {
  const mcqCount = input.mcqCount || 0;
  const codingCount = input.codingCount || 0;
  const essayCount = input.essayCount || 0;
  const difficulty = input.difficulty || 'ANY';
  const language = input.language || 'any programming language';

  // Calculate points based on difficulty
  const pointsMap: Record<string, number> = {
    EASY: 10,
    MEDIUM: 20,
    HARD: 30,
    ANY: 15,
  };
  const points = input.points || pointsMap[difficulty] || 15;

  return `You are an expert exam question generator for a platform called "ShadowCoders".
Generate exam questions based on the following requirements:

**Topic:** ${input.topic}
**Difficulty:** ${difficulty}
**Question Types Requested:**
- Multiple Choice Questions (MCQ): ${mcqCount}
- Coding Questions: ${codingCount} (Language: ${language})
- Essay Questions: ${essayCount}

**CRITICAL REQUIREMENTS:**
1. You MUST return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    // Array of question objects (see structure below)
  ]
}

2. Each question object must follow this structure based on its type:

**For MCQ questions:**
{
  "type": "MCQ",
  "order": <number starting from 1>,
  "points": ${points},
  "prompt": "<question text>",
  "options": [
    { "id": "opt1", "text": "<option text>" },
    { "id": "opt2", "text": "<option text>" },
    { "id": "opt3", "text": "<option text>" },
    { "id": "opt4", "text": "<option text>" }
  ],
  "correctOptionIds": ["opt<number>"]
}

**For CODING questions:**
{
  "type": "CODING",
  "order": <number>,
  "points": ${points},
  "prompt": "<problem description with clear problem statement, constraints, input/output format, and examples>",
  "starterCode": "// write your code here",
  "testcases": [
    // EXACTLY 2 sample test cases (visible to students) - MUST be valid and executable
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": false, "timeoutMs": 2000 },
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": false, "timeoutMs": 2000 },
    // EXACTLY 5 hidden test cases (for validation) - MUST be valid and executable
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": true, "timeoutMs": 2000 },
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": true, "timeoutMs": 2000 },
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": true, "timeoutMs": 2000 },
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": true, "timeoutMs": 2000 },
    { "input": "<actual input string>", "expectedOutput": "<actual expected output string>", "isHidden": true, "timeoutMs": 2000 }
  ]
}

**CRITICAL TEST CASE REQUIREMENTS FOR CODING QUESTIONS:**

Test cases MUST be real, executable inputs and outputs that work with standard stdin/stdout I/O.

**INPUT FORMAT (stdin - what the program reads):**
- Single integer: "5"
- Multiple integers on one line: "5 10 15"
- Multiple lines: "5\\n10\\n20" (use \\n for newline in JSON)
- Array of numbers: "1 2 3 4 5" or "1,2,3,4,5"
- String: "hello world"
- Mixed: "5\\nhello\\n10 20"

**OUTPUT FORMAT (stdout - what the program prints):**
- Single value: "15"
- Multiple lines: "15\\n20"
- Array output: "1 2 3" or "[1,2,3]"
- String output: "hello world"
- Must match EXACTLY (whitespace, newlines matter)

**CONCRETE EXAMPLES:**

Example 1 - "Add two numbers":
  Problem: Read two integers and print their sum
  Test Case 1:
    Input: "5\\n10"
    ExpectedOutput: "15"
  Test Case 2:
    Input: "-5\\n10"
    ExpectedOutput: "5"
  Test Case 3:
    Input: "0\\n0"
    ExpectedOutput: "0"

Example 2 - "Find maximum in array":
  Problem: Read n, then n integers, print the maximum
  Test Case 1:
    Input: "5\\n1 5 3 9 2"
    ExpectedOutput: "9"
  Test Case 2:
    Input: "3\\n-1 -5 -3"
    ExpectedOutput: "-1"
  Test Case 3:
    Input: "1\\n42"
    ExpectedOutput: "42"

Example 3 - "Reverse a string":
  Problem: Read a string and print it reversed
  Test Case 1:
    Input: "hello"
    ExpectedOutput: "olleh"
  Test Case 2:
    Input: "abc"
    ExpectedOutput: "cba"
  Test Case 3:
    Input: "a"
    ExpectedOutput: "a"

**REQUIREMENTS:**
- ALL 7 test cases must have REAL, VALID inputs and outputs
- Inputs must be in standard stdin format (what the program reads)
- Outputs must be in standard stdout format (what the program prints)
- Test cases should cover: small inputs, edge cases, normal cases, larger inputs
- Each test case must be independently executable
- Use \\n for newlines in JSON strings
- Numbers must be strings in JSON: "5" not 5
- DO NOT use descriptive formats like "num1=5" or "The answer is 15"
- DO NOT include explanations or extra text in inputs/outputs

**For ESSAY questions:**
{
  "type": "ESSAY",
  "order": <number>,
  "points": ${points},
  "prompt": "<essay prompt>",
  "wordLimit": <optional number>
}

**IMPORTANT RULES:**
- Generate exactly ${mcqCount} MCQ questions, ${codingCount} coding questions, and ${essayCount} essay questions
- Order numbers should be sequential starting from 1
- For MCQ: Include exactly 4 options with unique IDs (opt1, opt2, opt3, opt4), with at least one correct answer marked in correctOptionIds array
- For CODING: You MUST include EXACTLY 7 test cases total:
  * 2 sample test cases with isHidden: false (visible to students for testing their code)
  * 5 hidden test cases with isHidden: true (used for final validation and grading)
  * All testcases must have input (string), expectedOutput (string), isHidden (boolean), and timeoutMs (number)
  * **CRITICAL**: Input and expectedOutput MUST be actual executable test cases:
    - Input should be what the program reads from stdin (e.g., "5\\n10" for two numbers on separate lines)
    - ExpectedOutput should be exactly what the program prints to stdout (e.g., "15" for the result)
    - Use \\n for newlines in JSON strings
    - Numbers should be strings (e.g., "5" not 5)
    - Arrays should be string representations (e.g., "[1,2,3]" or "1 2 3")
    - Test cases must be valid and executable - the code should be able to read the input and produce the expected output
  * Make the problem description clear with:
    - Problem statement
    - Input format specification
    - Output format specification
    - Constraints
    - At least 2 examples showing input/output pairs
- Points should be ${points} for all questions (based on difficulty: ${difficulty})
- DO NOT include any markdown code blocks, explanations, or text outside the JSON object
- Return ONLY the raw JSON object, no markdown formatting, no code blocks, no explanations

**CRITICAL:** Your response must be valid JSON that can be parsed directly. Do not wrap it in markdown code blocks.

**FINAL REMINDER FOR CODING QUESTIONS:**
- Generate EXACTLY 7 test cases total (2 visible with isHidden: false, 5 hidden with isHidden: true)
- Each test case MUST have a real, executable input string and expected output string
- Inputs should be in standard stdin format (what the program reads from standard input)
- Outputs should be in standard stdout format (what the program prints to standard output)
- Test cases must be valid and executable - a correct solution should pass all of them
- Use proper JSON formatting: numbers as strings ("5" not 5), use \\n for newlines
- Test cases should cover different scenarios: small inputs, edge cases, normal cases, larger inputs
- DO NOT use descriptive formats, JSON objects, or verbose outputs
- Follow the examples provided above for correct input/output formats

Generate the questions now and return ONLY the JSON:`;
};

export const generateQuestions = async (input: GenerateInput) => {
  try {
    // Validate that at least one question type is requested
    if ((input.mcqCount || 0) === 0 && (input.codingCount || 0) === 0 && (input.essayCount || 0) === 0) {
      throw { status: 400, message: 'At least one question type must be requested (mcqCount, codingCount, or essayCount)' };
    }

    // 1. Build the prompt for the AI
    const prompt = buildSystemPrompt(input);

    // 2. Call the AI service based on provider
    let aiResponseString: string;
    
    if (env.AI_PROVIDER === 'ollama') {
      try {
        const { generateJsonFromOllama } = await import('../../lib/ollama');
        aiResponseString = await generateJsonFromOllama(prompt);
      } catch (error: any) {
        console.error('Ollama generation failed:', error);
        throw error;
      }
    } else {
      // Default to Gemini
      aiResponseString = await generateJsonFromAi(prompt);
    }

    // 3. Clean and parse the AI's string response
    let cleanedResponse = aiResponseString.trim();
    
    // Remove markdown code blocks if present (```json ... ```)
    if (cleanedResponse.startsWith('```')) {
      const lines = cleanedResponse.split('\n');
      // Remove first line (```json or ```)
      lines.shift();
      // Remove last line (```)
      if (lines.length > 0 && lines[lines.length - 1]!.trim() === '```') {
        lines.pop();
      }
      cleanedResponse = lines.join('\n').trim();
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse AI response. Raw response:', aiResponseString);
      console.error('Cleaned response:', cleanedResponse);
      throw { status: 500, message: 'AI returned malformed JSON data. Please try again.' };
    }

    // 4. **CRITICAL: Validate the AI's output against our *own* schema.**
    // We use the `addQuestionsSchema` from the 'questions' module for this.
    // The schema expects { questions: [...] }
    const validationResult = addQuestionsSchema.shape.body.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.format());
      console.error('AI returned:', JSON.stringify(parsedJson, null, 2));
      
      // Create a more helpful error message
      const issues = validationResult.error.issues || [];
      const errorDetails = issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .slice(0, 5)
        .join('; ');
      
      throw { 
        status: 500, 
        message: `AI output did not match expected question structure. Validation errors: ${errorDetails}. Please try again or adjust your request.` 
      };
    }

    // 5. Return the clean, validated list of questions
    return validationResult.data.questions;
  } catch (error: any) {
    // If it's already an error object with status, rethrow it
    if (error.status) {
      throw error;
    }
    // Otherwise wrap it
    throw { status: 500, message: error.message || 'Failed to generate questions' };
  }
};