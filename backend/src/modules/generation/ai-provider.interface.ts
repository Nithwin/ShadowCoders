
export interface AIProvider {
  /**
   * Generates a coding question based on the topic and difficulty.
   * Returns a JSON object with title, description, code stub, and testcases.
   */
  generateQuestion(topic: string, difficulty: string, customPrompt?: string): Promise<GeneratedQuestion>;

  /**
   * Validates if the provider is healthy/reachable.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Analyzes code for Time and Space Complexity.
   */
  analyzeComplexity(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; explanation: string }>;
}

export interface GeneratedQuestion {
  title: string;
  description: string;
  difficulty: 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD';
  topic: string;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  starterCode: {
    language: string;
    code: string;
  }[];
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
}
