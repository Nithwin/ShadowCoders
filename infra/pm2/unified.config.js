/**
 * Unified PM2 Configuration — ShadowCoders
 * 
 * Runs API, Frontend, and Worker on a single machine.
 * Usage: pm2 start infra/pm2/unified.config.js
 */
module.exports = {
  apps: [
    {
      name: 'sc-api',
      script: 'dist/index.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'sc-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './frontend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'sc-worker',
      script: 'dist/index.js',
      cwd: './worker',
      instances: 4,
      exec_mode: 'fork',
      increment_var: 'HEALTH_PORT',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 1,
        HEALTH_PORT: 9100,
        DOCKER_IMAGE: 'shadowcoders-sandbox:latest'
      }
    }
  ]
};
