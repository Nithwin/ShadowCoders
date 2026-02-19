/**
 * PM2 Configuration — Express API Server
 * 
 * Run with: pm2 start infra/pm2/api.config.js
 * 
 * Uses cluster mode for multi-core utilization.
 * 2 instances on a 4-core VPS (leaves room for Next.js, DB, Redis).
 */
module.exports = {
  apps: [
    {
      name: 'shadowcoders-api',
      script: 'dist/index.js',
      cwd: './backend',
      instances: 2,              // 2 cluster instances
      exec_mode: 'cluster',      // Cluster mode for load balancing
      
      // Environment
      node_args: '--max-old-space-size=512',  // 512MB heap per instance
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,       // 2s between restarts
      
      // Memory limit — restart if exceeded
      max_memory_restart: '600M',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/api-error.log',
      out_file: '/var/log/pm2/api-out.log',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 10000,       // 10s to gracefully shutdown
      listen_timeout: 8000,      // 8s to start listening
      
      // Watch (DISABLED in production)
      watch: false,
      
      // Source map support
      source_map_support: true,
    },
  ],
};
