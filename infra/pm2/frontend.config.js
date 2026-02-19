/**
 * PM2 Configuration — Next.js Frontend
 * 
 * Run with: pm2 start infra/pm2/frontend.config.js
 */
module.exports = {
  apps: [
    {
      name: 'shadowcoders-frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: './frontend',
      instances: 2,              // 2 instances
      exec_mode: 'cluster',
      
      node_args: '--max-old-space-size=384',  // 384MB heap per instance
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      
      // Memory limit
      max_memory_restart: '500M',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/frontend-error.log',
      out_file: '/var/log/pm2/frontend-out.log',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 8000,
      
      watch: false,
    },
  ],
};
