import { Prisma, User, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withDatabaseErrorHandling } from '../../lib/db-health';
import bcrypt from 'bcrypt';

type UserSettings = {
  githubUrl?: string | null;
  [key: string]: unknown;
};

type StoredGithubStats = {
  hasGithub: boolean;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  github?: unknown;
  githubUrl?: string | null;
  message?: string;
};

type GithubStatsCache = {
  githubStats?: StoredGithubStats;
  githubStatsUpdatedAt?: string;
};

type GithubRepo = {
  stargazers_count: number;
  forks_count: number;
  size: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getGithubUrlFromSettings = (settings: unknown): string | null => {
  if (!isPlainObject(settings)) return null;
  const rawUrl = settings.githubUrl;
  return typeof rawUrl === 'string' && rawUrl.trim().length > 0 ? rawUrl.trim() : null;
};

const parseGithubUsername = (input: string | null | undefined): string | null => {
  if (!input || !input.trim()) return null;
  const value = input.trim();

  if (!value.includes('github.com')) {
    return value.replace(/^@/, '').trim() || null;
  }

  try {
    const normalized = value.startsWith('http') ? value : `https://${value}`;
    const url = new URL(normalized);
    const segments = url.pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];
    if (!firstSegment) return null;

    if (firstSegment.toLowerCase() === 'u' || firstSegment.toLowerCase() === 'users') {
      const secondSegment = segments[1];
      return secondSegment ? secondSegment.replace(/^@/, '').trim() : null;
    }

    return firstSegment.replace(/^@/, '').trim();
  } catch {
    return null;
  }
};

const buildGithubProfileUrl = (username: string): string => `https://github.com/${username}`;

export const getAllUsers = async (params: {
  role?: Role;
  department?: string;
  year?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) => {
  const { role, department, year, sortBy, sortOrder } = params;

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (department) where.department = { contains: department, mode: 'insensitive' };
  if (year) where.year = year;

  const orderBy: Prisma.UserOrderByWithRelationInput = {};
  if (sortBy) {
    orderBy[sortBy as keyof Prisma.UserOrderByWithRelationInput] = sortOrder || 'asc';
  } else {
    orderBy.createdAt = 'desc';
  }

  return withDatabaseErrorHandling(
    async () => {
      const users = await prisma.user.findMany({
      where,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pictureUrl: true,
        createdAt: true,
        reg_no: true,
        department: true,
        year: true,
        section: true,
        leetcodeId: true,
        leetcodeStats: true,
        settings: true,
      }
    });

      return users.map((user) => {
        const { settings, ...rest } = user;
        return {
          ...rest,
          githubUrl: getGithubUrlFromSettings(settings),
        };
      });
    },
    'getAllUsers'
  );
};

export const getUserById = async (id: string) => {
  return withDatabaseErrorHandling(
    async () => {
      const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pictureUrl: true,
        reg_no: true,
        department: true,
        year: true,
        section: true,
        leetcodeId: true,
        leetcodeStats: true,
        points: true,
        settings: true,
        createdAt: true,
        // Explicitly excluding pictureData and pictureMimeType for performance
      }
    });

      if (!user) {
        return null;
      }

      const { settings, ...rest } = user;
      return {
        ...rest,
        githubUrl: getGithubUrlFromSettings(settings),
      };
    },
    'getUserById'
  );
};

export const updateUser = async (
  id: string,
  data: Prisma.UserUpdateInput & { githubUrl?: string | null }
) => {
  const githubUrl = data.githubUrl;
  if ('githubUrl' in data) {
    delete (data as Record<string, unknown>).githubUrl;
  }

  if (githubUrl !== undefined) {
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { settings: true },
    });

    const baseSettings: UserSettings = isPlainObject(existingUser?.settings)
      ? { ...(existingUser?.settings as UserSettings) }
      : {};
    baseSettings.githubUrl = githubUrl?.trim() || null;
    data.settings = baseSettings as unknown as Prisma.InputJsonValue;
  }

  if (data.password && typeof data.password === 'string') {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  // Validate points field to prevent integer overflow (INT4 max: 2,147,483,647)
  if (data.points !== undefined) {
    const INT4_MAX = 2147483647;
    const INT4_MIN = -2147483648;
    
    // Helper function to validate and convert points value
    const validatePointsValue = (value: any): number => {
      // Convert string to number if needed
      let numValue: number;
      if (typeof value === 'string') {
        numValue = Number(value);
        if (isNaN(numValue)) {
          throw {
            status: 400,
            message: `Invalid points value: ${value}. Must be a valid number.`,
          };
        }
      } else if (typeof value === 'number') {
        numValue = value;
      } else {
        throw {
          status: 400,
          message: `Invalid points value type. Expected number or string, got ${typeof value}.`,
        };
      }
      
      // Check range
      if (numValue > INT4_MAX || numValue < INT4_MIN || !Number.isInteger(numValue)) {
        throw {
          status: 400,
          message: `Points value ${numValue} is out of range or not an integer. Maximum allowed: ${INT4_MAX}, Minimum allowed: ${INT4_MIN}`,
        };
      }
      
      return numValue;
    };
    
    // Handle different Prisma update input types
    if (typeof data.points === 'object' && data.points !== null) {
      if ('set' in data.points) {
        const value = validatePointsValue(data.points.set);
        (data.points as { set: number }).set = value;
      } else if ('increment' in data.points) {
        // Check if increment would cause overflow
        const currentUser = await prisma.user.findUnique({
          where: { id },
          select: { points: true },
        });
        const currentPoints = currentUser?.points ?? 0;
        const incrementValue = validatePointsValue(data.points.increment);
        const newValue = currentPoints + incrementValue;
        if (newValue > INT4_MAX || newValue < INT4_MIN) {
          throw {
            status: 400,
            message: `Points increment would result in value ${newValue} which is out of range. Maximum allowed: ${INT4_MAX}, Minimum allowed: ${INT4_MIN}`,
          };
        }
        (data.points as { increment: number }).increment = incrementValue;
      } else if ('decrement' in data.points) {
        // Check if decrement would cause underflow
        const currentUser = await prisma.user.findUnique({
          where: { id },
          select: { points: true },
        });
        const currentPoints = currentUser?.points ?? 0;
        const decrementValue = validatePointsValue(data.points.decrement);
        const newValue = currentPoints - decrementValue;
        if (newValue > INT4_MAX || newValue < INT4_MIN) {
          throw {
            status: 400,
            message: `Points decrement would result in value ${newValue} which is out of range. Maximum allowed: ${INT4_MAX}, Minimum allowed: ${INT4_MIN}`,
          };
        }
        (data.points as { decrement: number }).decrement = decrementValue;
      }
    } else {
      // Direct number or string assignment
      const validatedValue = validatePointsValue(data.points);
      data.points = validatedValue;
    }
  }

  return withDatabaseErrorHandling(
    () => prisma.user.update({
      where: { id },
      data,
    }),
    'updateUser'
  );
};

export const deleteUser = async (id: string) => {
  return withDatabaseErrorHandling(
    async () => {
      // Use transaction to ensure atomicity
      return await prisma.$transaction(async (tx) => {
        // 1. Get all attempts for this user
        const attempts = await tx.attempt.findMany({
          where: { studentId: id },
          select: { id: true },
        });
        
        const attemptIds = attempts.map(a => a.id);
        
        if (attemptIds.length > 0) {
          // 2. Get all response IDs
          const responses = await tx.response.findMany({
            where: { attemptId: { in: attemptIds } },
            select: { id: true },
          });
          
          const responseIds = responses.map(r => r.id);
          
          if (responseIds.length > 0) {
            // 3. Delete grading jobs (references Response)
            await tx.gradingJob.deleteMany({
              where: { responseId: { in: responseIds } },
            });
            
            // 4. Delete evaluations (references Response)
            await tx.evaluation.deleteMany({
              where: { responseId: { in: responseIds } },
            });
            
            // 5. Delete response artifacts (references Response)
            await tx.responseArtifact.deleteMany({
              where: { responseId: { in: responseIds } },
            });
            
            // 6. Delete responses
            await tx.response.deleteMany({
              where: { attemptId: { in: attemptIds } },
            });
          }
          
          // 7. Delete attempt sections
          await tx.attemptSection.deleteMany({
            where: { attemptId: { in: attemptIds } },
          });
          
          // 8. Delete attempts
          await tx.attempt.deleteMany({
            where: { studentId: id },
          });
        }
        
        // 9. Delete question reports by this user
        await tx.questionReport.deleteMany({
          where: { studentId: id },
        });
        
        // 10. Delete refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId: id },
        });
        
        // 11. Finally, delete the user
        return await tx.user.delete({
          where: { id },
        });
      });
    },
    'deleteUser'
  );
};

export const createUser = async (data: Prisma.UserCreateInput) => {
    // Hash password if provided
    if (data.password) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    }

    return withDatabaseErrorHandling(
        () => prisma.user.create({
            data
        }),
        'createUser'
    );
}

export const getUserGithubStats = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      settings: true,
    },
  });

  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  const settings = isPlainObject(user.settings) ? { ...(user.settings as Record<string, unknown>) } : {};
  const cache = settings as GithubStatsCache;
  const githubUrl = getGithubUrlFromSettings(settings);
  const username = parseGithubUsername(githubUrl);

  if (cache.githubStats && cache.githubStatsUpdatedAt) {
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    if (new Date(cache.githubStatsUpdatedAt).getTime() >= sixHoursAgo) {
      return cache.githubStats as StoredGithubStats;
    }
  }

  if (!username) {
    const payload = {
      hasGithub: false,
      githubUrl,
      message: 'GitHub profile is not linked for this user.',
    };
    await prisma.user.update({
      where: { id },
      data: {
        settings: {
          ...(settings as Record<string, unknown>),
          githubStats: payload,
          githubStatsUpdatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    return payload;
  }

  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ShadowCoders-GitHub-Stats',
  };

  const profileRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!profileRes.ok) {
    if (profileRes.status === 404) {
      const payload = {
        hasGithub: false,
        githubUrl: buildGithubProfileUrl(username),
        message: 'GitHub user not found. Please verify the linked profile URL.',
      };
      await prisma.user.update({
        where: { id },
        data: {
          settings: {
            ...(settings as Record<string, unknown>),
            githubUrl: buildGithubProfileUrl(username),
            githubStats: payload,
            githubStatsUpdatedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      return payload;
    }
    throw { status: 502, message: 'Failed to fetch GitHub profile data' };
  }

  const profileData = await profileRes.json() as {
    login: string;
    html_url: string;
    public_repos: number;
    followers: number;
    following: number;
    public_gists: number;
    created_at: string;
    updated_at: string;
  };

  const allRepos: GithubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= 5) {
    const repoRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&type=owner&sort=updated`,
      { headers }
    );
    if (!repoRes.ok) break;
    const repos = await repoRes.json() as GithubRepo[];
    if (!Array.isArray(repos) || repos.length === 0) break;
    allRepos.push(...repos);
    if (repos.length < perPage) break;
    page += 1;
  }

  const totalStars = allRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const totalForks = allRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
  const totalRepoSizeKB = allRepos.reduce((sum, repo) => sum + (repo.size || 0), 0);
  const totalOpenIssues = allRepos.reduce((sum, repo) => sum + (repo.open_issues_count || 0), 0);
  const totalWatchers = allRepos.reduce((sum, repo) => sum + (repo.watchers_count || 0), 0);
  const estimatedTotalLines = Math.round(totalRepoSizeKB * 20);

  const languageBreakdown: Record<string, number> = {};
  for (const repo of allRepos) {
    if (!repo.language) continue;
    languageBreakdown[repo.language] = (languageBreakdown[repo.language] || 0) + 1;
  }

  const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { headers });
  let recentPushEvents = 0;
  let recentCommitCount = 0;
  let lastActivityAt: string | null = null;

  if (eventsRes.ok) {
    const events = await eventsRes.json() as Array<{
      type: string;
      created_at: string;
      payload?: { commits?: unknown[] };
    }>;
    if (Array.isArray(events)) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      for (const event of events) {
        const eventTs = new Date(event.created_at).getTime();
        if (!lastActivityAt) {
          lastActivityAt = event.created_at;
        }
        if (eventTs < thirtyDaysAgo) continue;
        if (event.type === 'PushEvent') {
          recentPushEvents += 1;
          recentCommitCount += Array.isArray(event.payload?.commits) ? event.payload!.commits!.length : 0;
        }
      }
    }
  }

  const payload = {
    hasGithub: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    github: {
      username: profileData.login,
      profileUrl: profileData.html_url || buildGithubProfileUrl(username),
      publicRepos: profileData.public_repos,
      followers: profileData.followers,
      following: profileData.following,
      publicGists: profileData.public_gists,
      accountCreatedAt: profileData.created_at,
      profileUpdatedAt: profileData.updated_at,
      totals: {
        reposFetched: allRepos.length,
        stars: totalStars,
        forks: totalForks,
        openIssues: totalOpenIssues,
        watchers: totalWatchers,
        repoSizeKB: totalRepoSizeKB,
        estimatedLines: estimatedTotalLines,
      },
      recentActivity: {
        pushEventsLast30d: recentPushEvents,
        commitsLast30d: recentCommitCount,
        lastActivityAt,
      },
      languageBreakdown,
      note: 'Estimated lines are approximate, derived from GitHub repository size.',
    },
  };

  await prisma.user.update({
    where: { id },
    data: {
      settings: {
        ...(settings as Record<string, unknown>),
        githubUrl: buildGithubProfileUrl(profileData.login),
        githubStats: payload,
        githubStatsUpdatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  return payload;
};

export const getUserPictureData = async (id: string) => {
  return withDatabaseErrorHandling(
    () => prisma.user.findUnique({
      where: { id },
      select: { pictureData: true, pictureMimeType: true }
    }),
    'getUserPictureData'
  );
};
