
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { forceSubmitAttempt } from '../modules/attempts/attempt.service';
import { AttemptStatus } from '@prisma/client';

export const initAutoSubmitCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Calculate buffer (e.g., 2 minutes past end time to allow for clock drift/latency)
    //   const bufferTime = new Date(now.getTime() - 2 * 60 * 1000); 

      // Find all IN_PROGRESS attempts for exams that have ended
      // We look for exams where endAt < NOW and the attempt is still IN_PROGRESS
      const expiredAttempts = await prisma.attempt.findMany({
        where: {
          status: AttemptStatus.IN_PROGRESS,
          exam: {
            endAt: {
              lt: now, // Exam ended strictly before now
            },
          },
        },
        select: {
          id: true,
          studentId: true,
          exam: {
              select: { title: true }
          }
        },
        take: 50, // Process in batches of 50 to avoid overloading logic
      });

      if (expiredAttempts.length > 0) {
        console.log(`[AutoSubmit] Found ${expiredAttempts.length} expired attempts. Force submitting...`);
        
        // Process sequentially or with limited concurrency to be safe
        for (const attempt of expiredAttempts) {
          try {
            await forceSubmitAttempt(attempt.id, 'Auto-submitted by system (Time Expired)');
            console.log(`[AutoSubmit] Successfully submitted attempt ${attempt.id} for student ${attempt.studentId}`);
          } catch (err) {
            console.error(`[AutoSubmit] Failed to submit attempt ${attempt.id}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('[AutoSubmit] Cron job error:', error);
    }
  });
  
  console.log('[Cron] Auto-submit job initialized (running every minute)');
};
