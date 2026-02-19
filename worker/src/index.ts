import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from './redis';
import { processCodeExecution } from './processor';
import { startHealthServer } from './health';
import os from 'os';

const QUEUE_NAME = 'code-execution';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '1', 10);
const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;

console.log(`[Worker:${WORKER_ID}] Starting...`);
console.log(`[Worker:${WORKER_ID}] Concurrency: ${CONCURRENCY}`);
console.log(`[Worker:${WORKER_ID}] Redis: ${process.env.REDIS_URL || 'redis://127.0.0.1:6379'}`);

// ============================================================
// Create BullMQ Worker
// ============================================================

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    console.log(`[Worker:${WORKER_ID}] Processing job ${job.id} (${job.data.language})`);

    const startTime = Date.now();

    try {
      const result = await processCodeExecution(job.data);
      const duration = Date.now() - startTime;
      console.log(`[Worker:${WORKER_ID}] Job ${job.id} completed in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Worker:${WORKER_ID}] Job ${job.id} failed after ${duration}ms:`, error.message);
      throw error;
    }
  },
  {
    connection: createRedisConnection() as any,
    concurrency: CONCURRENCY,
    limiter: {
      max: 10,          // Max 10 jobs per duration window
      duration: 10000,  // 10 second window (1 job/second/worker)
    },
    lockDuration: 60000, // 60s lock (max time to hold a job before considered stalled)
    stalledInterval: 30000,
    maxStalledCount: 1,
  }
);

// ============================================================
// Worker Events
// ============================================================

worker.on('completed', (job: Job) => {
  // Already logged in the processor
});

worker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`[Worker:${WORKER_ID}] Job ${job?.id} FAILED:`, error.message);
});

worker.on('error', (error: Error) => {
  console.error(`[Worker:${WORKER_ID}] Worker error:`, error.message);
});

worker.on('stalled', (jobId: string) => {
  console.warn(`[Worker:${WORKER_ID}] Job ${jobId} stalled (took too long)`);
});

// ============================================================
// Graceful Shutdown
// ============================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Worker:${WORKER_ID}] ${signal} received, shutting down gracefully...`);
  console.log(`[Worker:${WORKER_ID}] Waiting for active jobs to complete...`);

  try {
    // Close worker (waits for active jobs to finish, up to 30s)
    await worker.close();
    console.log(`[Worker:${WORKER_ID}] Worker closed`);
  } catch (err) {
    console.error(`[Worker:${WORKER_ID}] Error during shutdown:`, err);
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  console.error(`[Worker:${WORKER_ID}] Uncaught Exception:`, error);
  // PM2 will restart the process
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error(`[Worker:${WORKER_ID}] Unhandled Rejection:`, reason);
  process.exit(1);
});

// ============================================================
// Start Health Check Server
// ============================================================

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '9999', 10);
startHealthServer(HEALTH_PORT, worker);

console.log(`[Worker:${WORKER_ID}] Ready and waiting for jobs...`);
