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
  const sqlCount = input.sqlCount || 0;
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
- SQL Questions: ${sqlCount}
- Essay Questions: ${essayCount}
- Fill-in-the-Blanks: ${input.fillCount || 0}
- Reading Comprehension: ${input.readingCount || 0}

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
  "prompt": "<question text in Markdown (.md) format - use markdown syntax for formatting, code blocks, lists, etc.>",
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
  "prompt": "<problem description in Markdown (.md) format with clear problem statement, constraints, input/output format, and examples - use markdown syntax for code blocks, lists, headers, etc. DO NOT include any starter code, function signatures, or code snippets in the prompt - only describe the problem>",
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

**For SQL questions - FOLLOW THIS STRUCTURE EXACTLY:**

MANDATORY STRUCTURE (DO NOT SKIP ANY FIELD):
{
  "type": "CODING",
  "language": "sql",
  "order": <number>,
  "points": ${points},
  "starterCode": null,
  "prompt": "<SQL problem description with markdown tables showing schema>",
  "config": {
    "ddl": "CREATE TABLE Departments (department_id INTEGER PRIMARY KEY, department_name TEXT); CREATE TABLE Employees (employee_id INTEGER PRIMARY KEY, employee_name TEXT, department_id INTEGER, salary REAL);"
  },
  "testcases": [
    {
      "input": "CREATE TABLE Departments (department_id INTEGER PRIMARY KEY, department_name TEXT);\nCREATE TABLE Employees (employee_id INTEGER PRIMARY KEY, employee_name TEXT, department_id INTEGER, salary REAL);\nINSERT INTO Departments VALUES (1, 'Engineering'), (2, 'Sales');\nINSERT INTO Employees VALUES (101, 'Alice', 1, 65000), (102, 'Bob', 1, 50000);",
      "expectedOutput": "Alice|65000\nBob|50000",
      "isHidden": false,
      "timeoutMs": 5000
    },
    {
      "input": "CREATE TABLE Departments (department_id INTEGER PRIMARY KEY, department_name TEXT);\nCREATE TABLE Employees (employee_id INTEGER PRIMARY KEY, employee_name TEXT, department_id INTEGER, salary REAL);\nINSERT INTO Departments VALUES (1, 'HR');\nINSERT INTO Employees VALUES (201, 'Charlie', 1, 70000);",
      "expectedOutput": "Charlie|70000",
      "isHidden": false,
      "timeoutMs": 5000
    },
    {
      "input": "CREATE TABLE Departments (department_id INTEGER PRIMARY KEY, department_name TEXT);\nCREATE TABLE Employees (employee_id INTEGER PRIMARY KEY, employee_name TEXT, department_id INTEGER, salary REAL);\nINSERT INTO Departments VALUES (1, 'Marketing');\nINSERT INTO Employees VALUES (301, 'David', 1, 80000), (302, 'Eve', 1, 90000);",
      "expectedOutput": "David|80000\nEve|90000",
      "isHidden": true,
      "timeoutMs": 5000
    },
    {
      "input": "CREATE TABLE Departments (department_id INTEGER PRIMARY KEY, department_name TEXT);\nCREATE TABLE Employees (employee_id INTEGER PRIMARY KEY, employee_name TEXT, department_id INTEGER, salary REAL);\nINSERT INTO Departments VALUES (1, 'Finance');\nINSERT INTO Employees VALUES (401, 'Frank', 1, 60000);",
      "expectedOutput": "Frank|60000",
      "isHidden": true,
      "timeoutMs": 5000
    },
    {
      "input": "CREATE TABLE Departments (department_id INTEGER PRIMARY KEY, department_name TEXT);\nCREATE TABLE Employees (employee_id INTEGER PRIMARY KEY, employee_name TEXT, department_id INTEGER, salary REAL);\nINSERT INTO Departments VALUES (1, 'IT'), (2, 'Support');\nINSERT INTO Employees VALUES (501, 'Grace', 1, 75000), (502, 'Heidi', 2, 55000);",
      "expectedOutput": "Grace|75000\nHeidi|55000",
      "isHidden": true,
      "timeoutMs": 5000
    }
  ]
}

CRITICAL REQUIREMENTS - SQL QUESTIONS WILL BE REJECTED IF:
1. "language" field is missing or not "sql"
2. "config" object is missing
3. Less than 5 test cases (MUST have exactly 2 visible + 3 hidden = 5 total)
4. Test case inputs missing CREATE TABLE statements

STRUCTURE RULES:
- config.ddl: ALL CREATE TABLE statements (for schema visualization)
- testcases[].input: CREATE TABLE + INSERT statements (complete setup for each test)
- Each test case is self-contained with its own schema and data
- expectedOutput: Pipe-delimited format (column1|column2\nrow2col1|row2col2)


**For FILL (Fill-in-the-Blanks) questions:**
{
  "type": "FILL",
  "order": <number>,
  "points": ${points},
  "prompt": "<Instruction for the student, e.g. 'Complete the sentences below.'>",
  "clozeTemplate": "<Text with blanks marked as [blank]. Example: The capital of France is [blank].>",
  "blanks": ["Paris"],
  "clozeConfig": {}
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
  "prompt": "<essay prompt in Markdown (.md) format - use markdown syntax for formatting, lists, emphasis, etc.>",
  "wordLimit": <optional number>
}

**IMPORTANT RULES:**
- Generate exactly ${mcqCount} MCQ questions, ${codingCount} coding questions, ${sqlCount} SQL questions (as CODING type), and ${essayCount} essay questions
- Order numbers should be sequential starting from 1
- **CRITICAL: All question prompts (for MCQ, CODING, and ESSAY) MUST be formatted in Markdown (.md) format**
  - Use markdown syntax for formatting: headers (#, ##), bold (**text**), italic (*text*), code blocks (\`\`\`), lists (- or 1.), links, etc.
  - For code examples in prompts, use markdown code blocks with language specification
  - For structured content, use markdown lists, tables, and other formatting as appropriate
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
  * **CRITICAL: DO NOT include starter code, function signatures, or any code snippets in the "prompt" field**
    - The prompt should ONLY contain the problem description, constraints, input/output format, and examples
    - Starter code should ONLY be in the "starterCode" field (use a simple placeholder like "// write your code here")
    - Do NOT show code examples, function definitions, or any code in the prompt text itself
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
    if ((input.mcqCount || 0) === 0 && (input.codingCount || 0) === 0 && (input.sqlCount || 0) === 0 && (input.essayCount || 0) === 0) {
      throw { status: 400, message: 'At least one question type must be requested (mcqCount, codingCount, sqlCount, or essayCount)' };
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
    
    // Fallback: If not starting with {, try to find the first { and last }
    if (!cleanedResponse.startsWith('{') && cleanedResponse.includes('{')) {
      const start = cleanedResponse.indexOf('{');
      const end = cleanedResponse.lastIndexOf('}');
      if (end > start) {
        cleanedResponse = cleanedResponse.substring(start, end + 1);
      }
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI response was:', cleanedResponse.substring(0, 500));
      throw { status: 500, message: 'AI returned invalid JSON format' };
    }

    // 4. Validate the response structure (ensure it has a 'questions' array)
    if (!parsedJson || !Array.isArray(parsedJson.questions)) {
      console.error('AI response missing questions array or malformed:', parsedJson);
      throw { status: 500, message: 'AI response missing questions array' };
    }

    // 5. CRITICAL: Validate SQL questions have DDL
    for (const question of parsedJson.questions) {
      if (question.type === 'CODING' && question.language === 'sql') {
        if (!question.config || !question.config.ddl) {
          console.error('❌ SQL question missing DDL:', question);
          throw { 
            status: 500, 
            message: 'AI generated SQL question without DDL in config. This is a critical error. Please try again.' 
          };
        }
        console.log('✅ SQL question has DDL:', question.config.ddl.substring(0, 100) + '...');
      }
    }

    // 6. **CRITICAL: Validate the AI's output against our *own* schema.**
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