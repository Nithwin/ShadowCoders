"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeetCodeLeaderboard = exports.syncStudentStats = exports.fetchLeetCodeStats = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../../lib/prisma");
const db_health_1 = require("../../lib/db-health");
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
      rating
      ranking
      contest {
        title
        startTime
      }
      problemsSolved
      totalProblems
      finishTimeInSeconds
    }
  }
`;
const fetchLeetCodeStats = async (username) => {
    try {
        // Try the GraphQL API first
        const response = await axios_1.default.post(LEETCODE_GRAPHQL_URL, {
            query: USER_PROFILE_QUERY,
            variables: { username },
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://leetcode.com',
            },
            timeout: 10000, // 10 second timeout
        });
        if (response.data.errors) {
            console.error(`LeetCode API errors for ${username}:`, response.data.errors);
            throw new Error('GraphQL API returned errors');
        }
        if (!response.data.data || !response.data.data.matchedUser) {
            throw new Error('User not found or invalid response');
        }
        return response.data.data;
    }
    catch (error) {
        console.error(`Failed to fetch LeetCode stats for ${username}:`, error.message);
        // Fallback: Try the public API endpoint
        try {
            const publicApiUrl = `https://leetcode-stats-api.herokuapp.com/${username}`;
            const fallbackResponse = await axios_1.default.get(publicApiUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            if (fallbackResponse.data && fallbackResponse.data.status === 'success') {
                // Transform the fallback API response to match our expected format
                const data = fallbackResponse.data;
                return {
                    matchedUser: {
                        username: username,
                        submitStats: {
                            acSubmissionNum: [
                                { difficulty: 'All', count: data.totalSolved || 0 },
                                { difficulty: 'Easy', count: data.easySolved || 0 },
                                { difficulty: 'Medium', count: data.mediumSolved || 0 },
                                { difficulty: 'Hard', count: data.hardSolved || 0 },
                            ],
                        },
                    },
                    userContestRanking: data.ranking ? {
                        attendedContestsCount: data.ranking.attendedContestsCount || 0,
                        rating: data.ranking.rating || 0,
                        globalRanking: data.ranking.globalRanking || 0,
                        topPercentage: data.ranking.topPercentage || 0,
                    } : null,
                    userContestRankingHistory: [], // Fallback API doesn't provide this
                };
            }
        }
        catch (fallbackError) {
            console.error(`Fallback API also failed for ${username}:`, fallbackError.message);
        }
        return null;
    }
};
exports.fetchLeetCodeStats = fetchLeetCodeStats;
const syncStudentStats = async (userId) => {
    // If userId is provided, sync only that user. Otherwise, sync all users with a leetcodeId.
    const whereClause = userId
        ? { id: userId, leetcodeId: { not: null } }
        : { leetcodeId: { not: null } };
    const students = await prisma_1.prisma.user.findMany({
        where: whereClause,
        select: { id: true, leetcodeId: true }
    });
    const results = {
        total: students.length,
        success: 0,
        failed: 0,
        errors: []
    };
    for (const student of students) {
        if (!student.leetcodeId)
            continue;
        const data = await (0, exports.fetchLeetCodeStats)(student.leetcodeId);
        if (data && data.matchedUser) {
            // Parse contest history to get detailed contest data
            const contestHistory = data.userContestRankingHistory || [];
            const weeklyContests = [];
            const biweeklyContests = [];
            contestHistory.forEach((contest) => {
                if (!contest.attended)
                    return;
                const contestData = {
                    title: contest.contest?.title || '',
                    date: contest.contest?.startTime ? new Date(contest.contest.startTime * 1000).toISOString() : '',
                    rating: contest.rating || 0,
                    ranking: contest.ranking || 0,
                    problemsSolved: contest.problemsSolved || 0,
                    totalProblems: contest.totalProblems || 4,
                    finishTime: contest.finishTimeInSeconds || 0,
                    // Q1-Q4 solved status (1 = solved, 0 = not solved)
                    q1: contest.problemsSolved >= 1 ? 1 : 0,
                    q2: contest.problemsSolved >= 2 ? 1 : 0,
                    q3: contest.problemsSolved >= 3 ? 1 : 0,
                    q4: contest.problemsSolved >= 4 ? 1 : 0,
                };
                if (contest.contest?.title?.includes('Weekly Contest')) {
                    weeklyContests.push(contestData);
                }
                else if (contest.contest?.title?.includes('Biweekly Contest')) {
                    biweeklyContests.push(contestData);
                }
            });
            // Sort contests by date (most recent first)
            weeklyContests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            biweeklyContests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const stats = {
                easy: data.matchedUser.submitStats.acSubmissionNum.find((s) => s.difficulty === 'Easy')?.count || 0,
                medium: data.matchedUser.submitStats.acSubmissionNum.find((s) => s.difficulty === 'Medium')?.count || 0,
                hard: data.matchedUser.submitStats.acSubmissionNum.find((s) => s.difficulty === 'Hard')?.count || 0,
                total: data.matchedUser.submitStats.acSubmissionNum.find((s) => s.difficulty === 'All')?.count || 0,
                contest: data.userContestRanking ? {
                    attended: data.userContestRanking.attendedContestsCount,
                    rating: Math.round(data.userContestRanking.rating),
                    globalRanking: data.userContestRanking.globalRanking,
                    topPercentage: data.userContestRanking.topPercentage,
                    weeklyAttended: weeklyContests.length,
                    biweeklyAttended: biweeklyContests.length,
                    weeklyContests: weeklyContests,
                    biweeklyContests: biweeklyContests,
                    latestWeekly: weeklyContests[0] || null,
                    latestBiweekly: biweeklyContests[0] || null,
                } : null,
                lastUpdated: new Date().toISOString()
            };
            await prisma_1.prisma.user.update({
                where: { id: student.id },
                data: { leetcodeStats: stats }
            });
            results.success++;
        }
        else {
            results.failed++;
            results.errors.push(`Failed to fetch data for user ${student.leetcodeId}`);
        }
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
};
exports.syncStudentStats = syncStudentStats;
const getLeetCodeLeaderboard = async () => {
    return (0, db_health_1.withDatabaseErrorHandling)(() => prisma_1.prisma.user.findMany({
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
    }), 'getLeetCodeLeaderboard');
};
exports.getLeetCodeLeaderboard = getLeetCodeLeaderboard;
//# sourceMappingURL=leetcode.service.js.map