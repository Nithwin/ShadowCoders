import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { withDatabaseErrorHandling } from '../../lib/db-health';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const USER_PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      topPercentage
      totalParticipants
    }
    userContestRankingHistory(username: $username) {
      attended
      contest {
        title
      }
    }
  }
`;

export const fetchLeetCodeStats = async (username: string) => {
  try {
    const response = await axios.post(LEETCODE_GRAPHQL_URL, {
      query: USER_PROFILE_QUERY,
      variables: { username },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.data.errors) {
      console.error(`LeetCode API errors for ${username}:`, response.data.errors);
      return null;
    }

    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch LeetCode stats for ${username}:`, error);
    return null;
  }
};

export const syncStudentStats = async (userId?: string) => {
  // If userId is provided, sync only that user. Otherwise, sync all users with a leetcodeId.
  const whereClause = userId 
    ? { id: userId, leetcodeId: { not: null } }
    : { leetcodeId: { not: null } };

  const students = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, leetcodeId: true }
  });

  const results = {
    total: students.length,
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const student of students) {
    if (!student.leetcodeId) continue;

    const data = await fetchLeetCodeStats(student.leetcodeId);
    
    if (data && data.matchedUser) {
      const stats = {
        easy: data.matchedUser.submitStats.acSubmissionNum.find((s: any) => s.difficulty === 'Easy')?.count || 0,
        medium: data.matchedUser.submitStats.acSubmissionNum.find((s: any) => s.difficulty === 'Medium')?.count || 0,
        hard: data.matchedUser.submitStats.acSubmissionNum.find((s: any) => s.difficulty === 'Hard')?.count || 0,
        total: data.matchedUser.submitStats.acSubmissionNum.find((s: any) => s.difficulty === 'All')?.count || 0,
        contest: data.userContestRanking ? {
          attended: data.userContestRanking.attendedContestsCount,
          rating: Math.round(data.userContestRanking.rating),
          globalRanking: data.userContestRanking.globalRanking,
          topPercentage: data.userContestRanking.topPercentage,
          weeklyAttended: data.userContestRankingHistory?.filter((h: any) => h.attended && h.contest?.title?.includes('Weekly Contest')).length || 0,
          biweeklyAttended: data.userContestRankingHistory?.filter((h: any) => h.attended && h.contest?.title?.includes('Biweekly Contest')).length || 0
        } : null,
        lastUpdated: new Date().toISOString()
      };

      await prisma.user.update({
        where: { id: student.id },
        data: { leetcodeStats: stats }
      });
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`Failed to fetch data for user ${student.leetcodeId}`);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
};

export const getLeetCodeLeaderboard = async () => {
  return withDatabaseErrorHandling(
    () => prisma.user.findMany({
      where: { leetcodeId: { not: null } },
      select: {
        id: true,
        name: true,
        reg_no: true,
        leetcodeId: true,
        leetcodeStats: true,
      },
      // We can't easily sort by JSON fields in Prisma without raw queries or post-processing.
      // For now, we'll return all and let frontend sort.
    }),
    'getLeetCodeLeaderboard'
  );
};
