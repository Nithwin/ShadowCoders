import { Request, Response } from 'express';
import * as leetcodeService from './leetcode.service';

export const syncStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // Optional: sync specific user
    const result = await leetcodeService.syncStudentStats(userId);
    res.json(result);
  } catch (error) {
    console.error('Error syncing LeetCode stats:', error);
    res.status(500).json({ message: 'Failed to sync LeetCode stats' });
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
