import { Queue, QueueEvents } from 'bullmq';
import { getRedisClient, createRedisConnection } from './redis';

/**
 * BullMQ Queue Producer
 * 
 * Replaces the ShadowQueue postgres-polling approach with Redis-backed BullMQ.
 * Benefits:
 * - No polling (uses Redis pub/sub internally)
 * - Built-in retries, backoff, rate limiting
 * - Job priority
 * - Proper backpressure
 * - Dashboard via Bull Board (optional)
 */

// ============================================================
// CODE EXECUTION QUEUE
// ============================================================

const CODE_QUEUE_NAME = 'code-execution';

let codeQueue: Queue | null = null;
let codeQueueEvents: QueueEvents | null = null;

export function getCodeQueue(): Queue {
  if (!codeQueue) {
    codeQueue = new Queue(CODE_QUEUE_NAME, {
      connection: getRedisClient() as any,
      defaultJobOptions: {
        attempts: 1,           // No retries for code execution (deterministic)
        removeOnComplete: {
          age: 300,            // Keep completed jobs for 5 minutes
          count: 1000,         // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 3600,           // Keep failed jobs for 1 hour (for debugging)
          count: 500,
        },
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
      },
    });

    codeQueue.on('error', (err: Error) => {
      console.error('[CodeQueue] Queue error:', err.message);
    });
  }

  return codeQueue;
}

export function getCodeQueueEvents(): QueueEvents {
  if (!codeQueueEvents) {
    codeQueueEvents = new QueueEvents(CODE_QUEUE_NAME, {
      connection: createRedisConnection() as any,
    });
  }
  return codeQueueEvents;
}

// ============================================================
// AI GRADING QUEUE
// ============================================================

const AI_QUEUE_NAME = 'ai-grading';

let aiQueue: Queue | null = null;

export function getAiQueue(): Queue {
  if (!aiQueue) {
    aiQueue = new Queue(AI_QUEUE_NAME, {
      connection: getRedisClient() as any,
      defaultJobOptions: {
        attempts: 2,            // Retry once for AI grading (API can be flaky)
        removeOnComplete: {
          age: 600,
          count: 500,
        },
        removeOnFail: {
          age: 7200,
          count: 200,
        },
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  }
  return aiQueue;
}

// ============================================================
// Job Submission Helpers
// ============================================================

export interface CodeExecutionJobData {
  jobId: string;            // GradingJob ID in postgres
  responseId: string;       // Response ID
  code: string;
  language: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    timeoutMs?: number;
    isHidden?: boolean;
    originalIndex?: number;
  }>;
  customInput?: string;
  runAllTests?: boolean;
  timeoutMs?: number;
  maxPoints?: number;
}

export interface AiGradingJobData {
  jobId: string;
  responseId: string;
  provider: string;
}

/**
 * Submit a code execution job to the queue.
 * Returns the BullMQ job for tracking.
 */
export async function submitCodeJob(data: CodeExecutionJobData) {
  const queue = getCodeQueue();
  
  // Check queue depth for backpressure
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  
  const MAX_QUEUE_DEPTH = parseInt(process.env.MAX_QUEUE_SIZE || '500', 10);
  
  if (waiting > MAX_QUEUE_DEPTH) {
    const estimatedWait = Math.ceil((waiting / 4) * 5); // 4 workers, ~5s/job
    const error = new Error(
      `Server is busy (${waiting} jobs queued). Estimated wait: ${estimatedWait}s. Please try again shortly.`
    );
    (error as any).status = 503;
    (error as any).estimatedWaitMs = estimatedWait * 1000;
    throw error;
  }

  const job = await queue.add('execute', data, {
    priority: data.runAllTests ? 1 : 2, // Final submissions get higher priority
    jobId: data.jobId,                   // Use GradingJob ID as BullMQ job ID
  });

  return job;
}

/**
 * Submit an AI grading job
 */
export async function submitAiJob(data: AiGradingJobData) {
  const queue = getAiQueue();
  const job = await queue.add('grade', data, {
    jobId: data.jobId,
  });
  return job;
}

/**
 * Wait for a code execution job to complete.
 * Uses QueueEvents (pub/sub) instead of DB polling.
 */
export async function waitForJobResult(
  jobId: string,
  timeoutMs: number = 30000
): Promise<any> {
  const queue = getCodeQueue();
  const events = getCodeQueueEvents();

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Execution timed out'));
    }, timeoutMs);

    try {
      // Check if already completed
      const existingJob = await queue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === 'completed') {
          clearTimeout(timeout);
          return resolve(existingJob.returnvalue);
        }
        if (state === 'failed') {
          clearTimeout(timeout);
          return reject(new Error(existingJob.failedReason || 'Job failed'));
        }
      }

      // Wait for completion event
      const onCompleted = async (args: { jobId: string; returnvalue: string }) => {
        if (args.jobId === jobId) {
          clearTimeout(timeout);
          events.off('completed', onCompleted);
          events.off('failed', onFailed);
          try {
            const result = JSON.parse(args.returnvalue);
            resolve(result);
          } catch {
            resolve(args.returnvalue);
          }
        }
      };

      const onFailed = async (args: { jobId: string; failedReason: string }) => {
        if (args.jobId === jobId) {
          clearTimeout(timeout);
          events.off('completed', onCompleted);
          events.off('failed', onFailed);
          reject(new Error(args.failedReason || 'Job failed'));
        }
      };

      events.on('completed', onCompleted);
      events.on('failed', onFailed);
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

/**
 * Get queue statistics (for health monitoring)
 */
export async function getQueueStats() {
  const queue = getCodeQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  const estimatedWaitMs = waiting > 0 ? Math.ceil((waiting / 4) * 5000) : 0;

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active,
    estimatedWaitMs,
  };
}

/**
 * Graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  if (codeQueue) {
    await codeQueue.close();
    codeQueue = null;
  }
  if (codeQueueEvents) {
    await codeQueueEvents.close();
    codeQueueEvents = null;
  }
  if (aiQueue) {
    await aiQueue.close();
    aiQueue = null;
  }
  console.log('[Queue] All queues closed');
}
