import { Request, Response } from 'express';
import * as leetcodeService from './leetcode.service';

export const syncStats = async (req: Request, res: Response) => {
  try {
    const userId = req.body?.userId; // Optional: sync specific user
    console.log('[LeetCode Sync] Starting sync...', userId ? `for user ${userId}` : 'for all users');
    const result = await leetcodeService.syncStudentStats(userId);
    console.log('[LeetCode Sync] Completed:', result);
    res.json(result);
  } catch (error: any) {
    console.error('[LeetCode Sync] Error:', error);
    console.error('[LeetCode Sync] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to sync LeetCode stats',
      error: error.message 
    });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboard = await leetcodeService.getLeetCodeLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
};
