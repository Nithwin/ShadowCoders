import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis Client Singleton
 * Used for BullMQ job queue, caching, and pub/sub
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const MAX_RETRY_ATTEMPTS = 50; // Stop retrying after 50 attempts (~4 minutes)

let redisClient: Redis | null = null;
const trackedConnections: Redis[] = []; // Track all connections for cleanup

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy(times: number) {
        if (times > MAX_RETRY_ATTEMPTS) {
          console.error(`[Redis] Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Giving up.`);
          return null; // Stop retrying
        }
        const delay = Math.min(times * 200, 5000);
        console.log(`[Redis] Reconnecting... attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      reconnectOnError(err: Error) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY error
        }
        return false;
      },
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });

    redisClient.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('close', () => {
      console.warn('[Redis] Connection closed');
    });
  }

  return redisClient;
}

/**
 * Create a NEW Redis connection (for BullMQ workers/subscribers)
 * BullMQ requires separate connections for different roles
 * All connections are tracked for graceful shutdown
 */
export function createRedisConnection(): Redis {
  const conn = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      if (times > MAX_RETRY_ATTEMPTS) return null;
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });
  trackedConnections.push(conn);
  return conn;
}

/**
 * Graceful shutdown — close main client + all tracked connections
 */
export async function closeRedis(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (redisClient) {
    closePromises.push(redisClient.quit().then(() => { redisClient = null; }));
  }

  for (const conn of trackedConnections) {
    try {
      closePromises.push(conn.quit().then(() => {}));
    } catch { /* already closed */ }
  }
  trackedConnections.length = 0;

  await Promise.allSettled(closePromises);
  console.log('[Redis] All connections disconnected');
}
