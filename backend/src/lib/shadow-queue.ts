import { prisma } from './prisma';
import { env } from '../config/env';
import { GradingJob, Prisma } from '@prisma/client';

/**
 * ShadowQueue: A persistent, postgres-backed job queue.
 * Replaces in-memory queues to ensure zero data loss on restart.
 */
export class ShadowQueue {
  private isProcessing: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private workerId: string;

  constructor() {
    this.workerId = `worker-${Math.random().toString(36).substring(7)}`;
    console.log(`[ShadowQueue] Initialized worker: ${this.workerId}`);
  }

  /**
   * Start the worker polling loop
   */
  start() {
    if (this.intervalId) return;
    this.isProcessing = true;
    console.log('[ShadowQueue] Starting worker loop...');
    
    // Poll every 1 second
    this.intervalId = setInterval(() => this.processNextJob(), 1000);
  }

  /**
   * Stop the worker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isProcessing = false;
    console.log('[ShadowQueue] Worker stopped.');
  }

  /**
   * Process the next available job
   */
  private async processNextJob() {
    try {
      // 1. Atomic Fetch & Lock
      // Find oldest QUEUED job and mark it RUNNING
      // We use a transaction or raw query to ensure atomicity if needed, 
      // but Prisma's updateMany doesn't return the updated record easily in SQLite/older Postgres.
      // Better approach using a transaction:
      
      const job = await prisma.$transaction(async (tx) => {
        // Find one queued job
        const candidate = await tx.gradingJob.findFirst({
          where: { status: 'QUEUED' },
          orderBy: { createdAt: 'asc' },
        });

        if (!candidate) return null;

        // Lock it
        const locked = await tx.gradingJob.update({
          where: { id: candidate.id },
          data: { status: 'RUNNING' }, // We could add lockedBy: workerId column in future
        });

        return locked;
      });

      if (!job) return; // Queue empty

      console.log(`[ShadowQueue] Processing Job ${job.id} (${job.provider})`);

      // 2. Execute Logic
      await this.executeJob(job);

    } catch (error) {
      console.error('[ShadowQueue] Worker error:', error);
    }
  }

  /**
   * Dispatch job to appropriate handler based on provider
   */
  private async executeJob(job: GradingJob) {
    try {
      let result: any = null;

      if (job.provider === 'local') {
        const { executeCodeJob } = require('../modules/grading/grading.processors');
        result = await executeCodeJob(job);
      } else if (job.provider === 'gemini' || job.provider === 'ollama') {
        const { executeAiGradingJob } = require('../modules/grading/grading.processors');
        result = await executeAiGradingJob(job);
      } else {
        throw new Error(`Unknown provider: ${job.provider}`);
      }

      // 3. Mark Success
      await prisma.gradingJob.update({
        where: { id: job.id },
        data: { 
          status: 'SUCCEEDED',
          result: result === null ? Prisma.JsonNull : result
        }
      });
      // console.log(`[ShadowQueue] Job ${job.id} SUCCEEDED`);

    } catch (error: any) {
      console.error(`[ShadowQueue] Job ${job.id} FAILED:`, error.message);
      
      // 4. Mark Failed
      await prisma.gradingJob.update({
        where: { id: job.id },
        data: { 
          status: 'FAILED',
          result: { error: error.message }
        }
      });
    }
  }

  /**
   * Helper to wait for a specific job to complete (for synchronous API behavior)
   */
  async waitForResult(jobId: string, timeoutMs: number = 30000): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const job = await prisma.gradingJob.findUnique({
        where: { id: jobId },
        select: { status: true, result: true }
      });

      if (!job) throw new Error('Job not found');

      if (job.status === 'SUCCEEDED') return job.result;
      if (job.status === 'FAILED') throw new Error((job.result as any)?.error || 'Job failed');
      
      // Wait 500ms before next poll
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Job timed out');
  }
}

// Singleton instance
export const shadowQueue = new ShadowQueue();
