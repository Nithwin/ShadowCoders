/**
 * Structured Logger for ShadowCoders Frontend
 * 
 * Provides a consistent way to log errors and events, 
 * preparing for future integration with monitoring services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  error?: Error;
}

class Logger {
  private static isDev = process.env.NODE_ENV === 'development';

  private static format(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    };
  }

  static info(message: string, context?: Record<string, unknown>) {
    const entry = this.format('info', message, context);
    if (this.isDev) {
      console.info(`[INFO] ${message}`, context || '');
    }
    // TODO: Send to analytics/logging service
  }

  static warn(message: string, context?: Record<string, unknown>) {
    const entry = this.format('warn', message, context);
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  static error(message: string, error?: Error, context?: Record<string, unknown>) {
    const entry = this.format('error', message, context, error);
    
    // Always log errors to console, even in prod (for debugging via DevTools)
    console.error(`[ERROR] ${message}`, error || '', context || '');

    // TODO: Send to Sentry/LogRocket
    // Sentry.captureException(error, { extra: context });
  }

  static debug(message: string, context?: Record<string, unknown>) {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }
}

export default Logger;
