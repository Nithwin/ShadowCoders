import { RequestHandler } from 'express';

/**
 * Per-User Submission Throttle
 * 
 * WHY NEEDED:
 * The global rate limiter (express-rate-limit) is IP-based and SKIPS exam endpoints.
 * This means a single student can submit code 100 times per second.
 * Each submission triggers Docker execution → 100 Docker containers → server crash.
 * 
 * This middleware limits each student to N submissions per time window.
 * Uses in-memory store (resets on restart, which is acceptable).
 */

interface ThrottleOptions {
  maxSubmissions: number;     // Max submissions per window
  windowMs: number;           // Time window in ms
  keyExtractor?: (req: any) => string | null;  // How to identify the user
}

interface ThrottleEntry {
  count: number;
  resetAt: number;
}

class UserThrottle {
  private store: Map<string, ThrottleEntry> = new Map();
  private maxSubmissions: number;
  private windowMs: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: ThrottleOptions) {
    this.maxSubmissions = options.maxSubmissions;
    this.windowMs = options.windowMs;

    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.resetAt) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  check(key: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;

    if (entry.count > this.maxSubmissions) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.resetAt - now,
      };
    }

    return {
      allowed: true,
      remaining: this.maxSubmissions - entry.count,
      retryAfterMs: 0,
    };
  }

  stop() {
    clearInterval(this.cleanupInterval);
  }
}

// ============================================================
// Code Submission Throttle
// Max 5 submissions per 10 seconds per student
// ============================================================

const codeSubmissionThrottle = new UserThrottle({
  maxSubmissions: 5,
  windowMs: 10000, // 10 seconds
});

export const throttleCodeSubmission: RequestHandler = (req, res, next) => {
  // Extract user ID from JWT (set by auth middleware)
  const userId = (req as any).user?.sub || req.ip || 'anonymous';
  
  const result = codeSubmissionThrottle.check(userId);

  // Add rate limit headers
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());

  if (!result.allowed) {
    return res.status(429).json({
      error: {
        code: 'SUBMISSION_THROTTLED',
        message: `Too many code submissions. Please wait ${Math.ceil(result.retryAfterMs / 1000)} seconds.`,
        retryAfterMs: result.retryAfterMs,
      },
    });
  }

  next();
};

// ============================================================
// Generic API Throttle
// Max 30 requests per 10 seconds per user
// ============================================================

const apiThrottle = new UserThrottle({
  maxSubmissions: 30,
  windowMs: 10000,
});

export const throttleApiPerUser: RequestHandler = (req, res, next) => {
  const userId = (req as any).user?.sub || req.ip || 'anonymous';
  const result = apiThrottle.check(userId);

  if (!result.allowed) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down.',
        retryAfterMs: result.retryAfterMs,
      },
    });
  }

  next();
};
