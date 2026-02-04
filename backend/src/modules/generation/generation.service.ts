import { prisma } from "../../lib/prisma";
import { AIProvider } from "./ai-provider.interface";
import { GeminiProvider } from "./providers/gemini.provider";
import { LocalProvider } from "./providers/local.provider";
import { env } from "../../config/env";
import { Difficulty } from "@prisma/client";

export class GenerationService {
  private provider: AIProvider;

  constructor() {
    // Default to Gemini if not specified or typo
    if (env.AI_PROVIDER === 'ollama' || env.AI_PROVIDER === 'local') {
      console.log('Initialize GenerationService with LocalProvider (Ollama)');
      this.provider = new LocalProvider();
    } else {
      console.log('Initialize GenerationService with GeminiProvider');
      this.provider = new GeminiProvider();
    }
  }

  /**
   * bulkGenerate
   * Generates 'count' questions for EACH difficulty level for a given topic.
   * e.g. count=5 -> 5 Easy, 5 Medium, 5 Hard = 15 questions total.
   */
  async bulkGenerate(topic: string, countPerLevel: number, difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'], customPrompt?: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    console.log(`[Generation] Starting bulk generation for topic "${topic}". Target: ${countPerLevel} per level.`);

    for (const difficulty of difficulties) {
      console.log(`[Generation] Generating ${countPerLevel} questions for ${difficulty}...`);
      
      for (let i = 0; i < countPerLevel; i++) {
        try {
          // 1. Generate via AI
          const questionData = await this.provider.generateQuestion(topic, difficulty, customPrompt);

          // 2. Validate essential fields
          if (!questionData.title || !questionData.problemStatement || !questionData.starterCode) {
            throw new Error("AI returned incomplete data structure");
          }

          // 3. Save to Pool
          await prisma.questionPool.create({
            data: {
              topic: topic,
              difficulty: difficulty,
              data: questionData as any, // Cast specific JSON structure
              isUsed: false
            }
          });

          results.success++;
          // Small delay to behave nicely with rate limits
          await new Promise(r => setTimeout(r, 1000));

        } catch (error: any) {
          console.error(`[Generation] Failed to generate ${difficulty} question ${i+1}:`, error.message);
          results.failed++;
          results.errors.push(`${difficulty} Q${i+1}: ${error.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Health Check
   */
  async healthCheck() {
    return this.provider.healthCheck();
  }

  async analyzeComplexity(code: string, language: string) {
    return this.provider.analyzeComplexity(code, language);
  }
}

export const generationService = new GenerationService();
