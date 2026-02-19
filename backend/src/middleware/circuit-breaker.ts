import { RequestHandler } from 'express';
import os from 'os';

/**
 * Circuit Breaker Middleware
 * 
 * Rejects incoming requests when system resources are critically low.
 * This prevents cascading failures when the server is overloaded.
 * 
 * WHY NEEDED:
 * - Without this, an overloaded server keeps accepting requests
 * - New requests make the situation worse (memory grows, CPU pegs)
 * - Eventually the kernel OOM-kills the process
 * - With a circuit breaker, we return 503 early and let the system recover
 */

interface CircuitBreakerOptions {
  cpuThreshold?: number;        // CPU % to trip (default: 90)
  memoryThreshold?: number;     // Heap % to trip (default: 85)
  checkIntervalMs?: number;     // How often to check (default: 5000)
  cooldownMs?: number;          // How long to stay open (default: 10000)
}

class CircuitBreaker {
  private isOpen = false;
  private cpuThreshold: number;
  private memoryThreshold: number;
  private cooldownMs: number;
  private lastCpuUsage = 0;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(options: CircuitBreakerOptions = {}) {
    this.cpuThreshold = options.cpuThreshold || 90;
    this.memoryThreshold = options.memoryThreshold || 85;
    this.cooldownMs = options.cooldownMs || 10000;

    // Start monitoring
    const intervalMs = options.checkIntervalMs || 5000;
    this.startMonitoring(intervalMs);
  }

  private startMonitoring(intervalMs: number) {
    let prevCpuInfo = this.getCpuInfo();

    this.checkInterval = setInterval(() => {
      const currentCpuInfo = this.getCpuInfo();
      
      // Calculate CPU usage since last check
      const idleDiff = currentCpuInfo.idle - prevCpuInfo.idle;
      const totalDiff = currentCpuInfo.total - prevCpuInfo.total;
      this.lastCpuUsage = totalDiff > 0 ? 100 - (100 * idleDiff / totalDiff) : 0;

      prevCpuInfo = currentCpuInfo;

      // Check memory
      const heapUsed = process.memoryUsage().heapUsed;
      const heapTotal = process.memoryUsage().heapTotal;
      const memoryPercent = (heapUsed / heapTotal) * 100;

      // Trip the circuit breaker
      if (this.lastCpuUsage > this.cpuThreshold || memoryPercent > this.memoryThreshold) {
        if (!this.isOpen) {
          console.warn(
            `[CircuitBreaker] TRIPPED — CPU: ${this.lastCpuUsage.toFixed(1)}%, ` +
            `Memory: ${memoryPercent.toFixed(1)}%. Rejecting requests for ${this.cooldownMs / 1000}s`
          );
          this.isOpen = true;

          // Auto-close after cooldown
          setTimeout(() => {
            this.isOpen = false;
            console.log('[CircuitBreaker] Circuit closed, accepting requests again');
          }, this.cooldownMs);
        }
      }
    }, intervalMs);
  }

  private getCpuInfo(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }
    return { idle, total };
  }

  get tripped(): boolean {
    return this.isOpen;
  }

  get cpuUsage(): number {
    return this.lastCpuUsage;
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Singleton
export const circuitBreaker = new CircuitBreaker({
  cpuThreshold: 90,
  memoryThreshold: 85,
  checkIntervalMs: 5000,
  cooldownMs: 10000,
});

/**
 * Express middleware that returns 503 when circuit is open.
 * Apply to routes that should be protected (e.g., code execution, heavy endpoints).
 */
export const circuitBreakerMiddleware: RequestHandler = (req, res, next) => {
  if (circuitBreaker.tripped) {
    return res.status(503).json({
      error: {
        code: 'SERVICE_OVERLOADED',
        message: 'Server is under heavy load. Please try again in a few seconds.',
        retryAfterMs: 10000,
      },
    });
  }
  next();
};

/**
 * Get current system health (for monitoring endpoints)
 */
export function getSystemHealth() {
  const mem = process.memoryUsage();
  return {
    circuitBreaker: circuitBreaker.tripped ? 'OPEN' : 'CLOSED',
    cpu: `${circuitBreaker.cpuUsage.toFixed(1)}%`,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    uptime: process.uptime(),
  };
}
