import { env } from '../config/env';

/**
 * Centralized logging utility
 * Prevents console spam in production while maintaining debug capabilities in development
 */
export const logger = {
  /**
   * Log errors (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log warnings (only in non-production)
   */
  warn: (...args: any[]) => {
    if (env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  },

  /**
   * Log info messages (only in non-production)
   */
  info: (...args: any[]) => {
    if (env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]) => {
    if (env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
};
