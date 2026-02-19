import { getRedisClient } from './redis';

/**
 * Redis Cache Layer
 * 
 * Provides caching for expensive database queries.
 * Primary use cases:
 * - Leaderboard (recalculated every 30s instead of per-request)
 * - Exam metadata (cached for 5 minutes)
 * - Queue statistics
 */

const redis = getRedisClient();

const DEFAULT_TTL = 60; // 60 seconds

/**
 * Get value from cache, or compute and cache it.
 */
export async function cacheGet<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    // Redis failure — proceed without cache
    console.warn('[Cache] Redis read error:', (err as Error).message);
  }

  // Cache miss — compute value
  const value = await computeFn();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.warn('[Cache] Redis write error:', (err as Error).message);
  }

  return value;
}

/**
 * Invalidate a cache key
 */
export async function cacheInvalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.warn('[Cache] Redis delete error:', (err as Error).message);
  }
}

/**
 * Invalidate all keys matching a pattern
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn('[Cache] Redis pattern delete error:', (err as Error).message);
  }
}

// ============================================================
// Specific cache functions
// ============================================================

/**
 * Cache leaderboard for an exam.
 * TTL: 30 seconds (updated frequently during active exam)
 */
export async function getCachedLeaderboard(
  examId: string,
  computeFn: () => Promise<any>
): Promise<any> {
  return cacheGet(`leaderboard:${examId}`, computeFn, 30);
}

/**
 * Cache exam metadata.
 * TTL: 5 minutes (rarely changes during exam)
 */
export async function getCachedExam(
  examId: string,
  computeFn: () => Promise<any>
): Promise<any> {
  return cacheGet(`exam:${examId}`, computeFn, 300);
}

/**
 * Cache question list for an exam.
 * TTL: 10 minutes
 */
export async function getCachedQuestions(
  examId: string,
  computeFn: () => Promise<any>
): Promise<any> {
  return cacheGet(`questions:${examId}`, computeFn, 600);
}

/**
 * Invalidate all caches for an exam (when exam is modified)
 */
export async function invalidateExamCaches(examId: string): Promise<void> {
  await Promise.all([
    cacheInvalidate(`leaderboard:${examId}`),
    cacheInvalidate(`exam:${examId}`),
    cacheInvalidate(`questions:${examId}`),
  ]);
}
