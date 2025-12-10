import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import * as gradingRepo from '../../modules/grading/grading.repo';
import { env } from '../../config/env';
import { QType } from '@prisma/client';

export const ESSAY_QUEUE_NAME = 'grading-essay';

// Create the Queue
export const essayQueue = new Queue(ESSAY_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
  },
});

// Worker Processor
const workerProcessor = async (job: Job) => {
  const { responseId, jobId: dbJobId } = job.data;
  // console.log(`[EssayWorker] Processing job ${job.id} for Response ${responseId}`);

  try {
     if (dbJobId) {
       await gradingRepo.updateGradingJob(dbJobId, 'RUNNING', null);
    }

    // 1. Fetch Data
    const response = await prisma.response.findUnique({
        where: { id: responseId },
        include: {
          question: {
            include: { rubric: true }
          }
        }
      });
  
    if (!response) throw new Error('Response not found');
    if (response.question.type !== QType.ESSAY) throw new Error('Not an essay response');
    
    // 2. Extract Text
    let studentText = response.textAnswer;
    if (!studentText && response.answer && typeof response.answer === 'object') {
      studentText = (response.answer as any).textAnswer || (response.answer as any).text;
    }
  
    if (!studentText || studentText.trim().length === 0) {
      throw new Error('Essay is empty');
    }

    // 3. Prepare AI Prompt
    const questionPrompt = response.question.prompt || 'No prompt provided';
    const maxPoints = response.question.points ? parseFloat(String(response.question.points)) : 0;
    const rubricText = response.question.rubric 
        ? JSON.stringify(response.question.rubric.criteria) 
        : 'No specific rubric provided. Grade based on clarity, relevance, and completeness.';

    const systemPrompt = `You are a strict academic grader. 
Grade the following essay based on the provided Question and Rubric.

**Question:**
${questionPrompt}

**Rubric/Criteria:**
${rubricText}

**Max Points:** ${maxPoints}

**Student Answer:**
${studentText}

**INSTRUCTIONS:**
1. Analyze the student's answer against the rubric.
2. Assign a score between 0 and ${maxPoints}. Use decimal points if needed (e.g., 8.5).
3. Provide constructive feedback explaining the score.
4. Return ONLY a valid JSON object in this format:
{
  "score": <number>,
  "feedback": "<string>"
}
`;

    // 4. Call AI Service
    let aiResponseString = '';
    if (env.AI_PROVIDER === 'ollama') {
      const { generateJsonFromOllama } = await import('../../lib/ollama');
      aiResponseString = await generateJsonFromOllama(systemPrompt);
    } else {
      const { generateJsonFromAi } = await import('../../lib/gemini');
      aiResponseString = await generateJsonFromAi(systemPrompt);
    }

    // 5. Parse Result
    let cleaned = aiResponseString.trim();
    if (cleaned.startsWith('```')) {
        const lines = cleaned.split('\n');
        lines.shift();
        if (lines[lines.length - 1]?.trim() === '```') lines.pop();
        cleaned = lines.join('\n');
    }
    
    const resultJson = JSON.parse(cleaned);

    if (typeof resultJson.score !== 'number' || typeof resultJson.feedback !== 'string') {
        throw new Error('AI returned invalid JSON structure');
    }

    // 6. Save Evaluation
    await prisma.evaluation.create({
        data: {
            responseId: response.id,
            kind: 'AI',
            score: resultJson.score,
            comments: resultJson.feedback,
            isFinal: false,
            createdAt: new Date(),
        }
    });

    // 7. Update Job Status
    if (dbJobId) {
        await gradingRepo.updateGradingJob(dbJobId, 'SUCCEEDED', resultJson);
    }

    // console.log(`[EssayWorker] Job ${job.id} succeeded. Score: ${resultJson.score}`);
    return resultJson;

  } catch (error: any) {
    console.error(`[EssayWorker] Job ${job.id} failed:`, error);
    if (dbJobId) {
        await gradingRepo.updateGradingJob(dbJobId, 'FAILED', { error: error.message });
    }
    throw error;
  }
};

// Create Worker
export const essayWorker = new Worker(ESSAY_QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: 1, // Keep strictly 1 concurrent essay grading to save API/CPU usage
});

essayWorker.on('completed', (job) => { /* ... */ });
essayWorker.on('failed', (job, err) => { /* ... */ });
