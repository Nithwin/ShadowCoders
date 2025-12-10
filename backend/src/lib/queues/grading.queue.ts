import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { executeCodeLocally, testCodeWithTestCasesLocally } from '../local-executor';
import { prisma } from '../prisma';
import * as gradingRepo from '../../modules/grading/grading.repo';

export const CODING_QUEUE_NAME = 'grading-coding';

// Create the Queue
export const codingQueue = new Queue(CODING_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 1000, // Keep last 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 1 week for debugging
    }
  },
});

// Worker Processor Logic
const workerProcessor = async (job: Job) => {
  const { type, payload, jobId: dbJobId } = job.data;
  
  // console.log(`[CodingWorker] Processing job ${job.id} (DB ID: ${dbJobId}) - Type: ${type}`);
  
  try {
    // Update DB status to RUNNING
    if (dbJobId) {
       await gradingRepo.updateGradingJob(dbJobId, 'RUNNING', null);
    }

    let result;
    const { code, language, customInput, testCases } = payload;

    if (type === 'custom-input') {
      // 1. Custom Input Execution
      const executionResult = await executeCodeLocally(code, language, customInput, 5000);
      
      result = {
        passed: 0,
        total: 0,
        testResults: [],
        message: 'Custom input execution',
        customOutput: {
          input: customInput,
          output: executionResult.stdout || '',
          error: executionResult.stderr || ('compile_output' in executionResult ? executionResult.compile_output : null) || ('message' in executionResult ? executionResult.message : null) || ('error' in executionResult ? (executionResult as any).error : null) || null,
          status: executionResult.status.description,
          time: typeof executionResult.time === 'string' ? parseFloat(executionResult.time) : executionResult.time,
          memory: executionResult.memory || 0,
        },
      };

    } else if (type === 'test-cases') {
      // 2. Test Cases execution
      const testResults = await testCodeWithTestCasesLocally(
        code, 
        language, 
        testCases.map((tc: any) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          timeoutMs: tc.timeoutMs || 5000,
        }))
      );

      result = {
        passed: testResults.passed,
        total: testResults.total,
        testResults: testResults.results,
        message: testResults.passed === testResults.total
          ? 'All test cases passed!'
          : `${testResults.passed}/${testResults.total} test cases passed`,
        customOutput: null,
      };
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }

    // Determine Status
    const jobStatus = result.customOutput 
      ? (result.customOutput.error ? 'FAILED' : 'SUCCEEDED')
      : (result.passed === result.total ? 'SUCCEEDED' : 'FAILED');

    // Update DB with Final Result
    if (dbJobId) {
      await gradingRepo.updateGradingJob(dbJobId, jobStatus, result);
    }

    // console.log(`[CodingWorker] Job ${job.id} completed. Status: ${jobStatus}`);
    return result;

  } catch (error: any) {
    console.error(`[CodingWorker] Job ${job.id} failed:`, error);
    
    // Update DB status to FAILED on final attempt or critical error
    if (dbJobId) {
        await gradingRepo.updateGradingJob(dbJobId, 'FAILED', { error: error.message });
    }
    throw error; // Rethrow to let BullMQ handle retries if applicable
  }
};

// Create the Worker
export const codingWorker = new Worker(CODING_QUEUE_NAME, workerProcessor, {
  connection: redisConnection,
  concurrency: 5, // Process 5 jobs at a time (matching previous limit)
});

codingWorker.on('completed', (job) => {
//   console.log(`[CodingWorker] Job ${job.id} has completed!`);
});

codingWorker.on('failed', (job, err) => {
  console.error(`[CodingWorker] Job ${job?.id} has failed with ${err.message}`);
});
