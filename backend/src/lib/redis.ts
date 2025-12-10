import { Redis } from 'ioredis';
import { env } from '../config/env';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection for Workers (reused)
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection Error:', err);
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

// Helper to create a new connection (BullMQ needs separate connections for blocking commands)
export const createRedisConnection = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
};
