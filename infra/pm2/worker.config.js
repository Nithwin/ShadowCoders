/**
 * PM2 Configuration — Worker Service
 * 
 * Run with: pm2 start infra/pm2/worker.config.js
 * 
 * FORK mode (not cluster) — each worker is independent.
 * 4 instances on a 4-core VPS (1 worker per core).
 * Each worker processes 1 Docker container at a time.
 */
module.exports = {
  apps: [
    {
      name: 'shadowcoders-worker',
      script: 'dist/index.js',
      cwd: './worker',
      instances: 4,              // 4 worker instances
      exec_mode: 'fork',         // Fork mode (NOT cluster)
      
      // Environment
      node_args: '--max-old-space-size=256',  // 256MB heap per worker
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 1,   // 1 concurrent job per worker process
        HEALTH_PORT: 0,          // Dynamic port (or disable per-instance)
        DOCKER_IMAGE: 'shadowcoders-sandbox',
        MAX_MEMORY: '128m',
        MAX_CPUS: '0.5',
        MAX_PIDS: '32',
      },
      
      // Increment health port per instance
      // Worker 0: 9999, Worker 1: 10000, etc.
      increment_var: 'HEALTH_PORT',
      
      // Restart policy
      max_restarts: 20,          // More retries (Docker can be flaky)
      min_uptime: '5s',
      restart_delay: 3000,       // 3s between restarts
      
      // Memory limit
      max_memory_restart: '400M',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/worker-error.log',
      out_file: '/var/log/pm2/worker-out.log',
      merge_logs: false,         // Separate logs per instance
      
      // Graceful shutdown — give Docker containers time to finish
      kill_timeout: 30000,       // 30s to gracefully shutdown
      
      // Watch (DISABLED in production)
      watch: false,
    },
  ],
};
