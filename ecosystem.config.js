/**
 * PM2 Ecosystem Configuration
 * Production-ready configuration with auto-recovery, health checks, and monitoring
 */

module.exports = {
  apps: [
    {
      name: 'protocoale-terapeutice',
      script: 'node_modules/.bin/next',
      args: 'start -p 4444',
      cwd: '/home/runcloud/webapps/protocoale-terapeutice',
      instances: 1, // Single instance for now, can be increased to 'max' for cluster mode
      exec_mode: 'fork', // Use 'cluster' for multi-instance

      // Auto-recovery mechanisms
      autorestart: true, // Automatically restart if app crashes
      max_restarts: 10, // Maximum number of restarts within min_uptime
      min_uptime: '10s', // Minimum uptime before considering app stable
      max_memory_restart: '1G', // Restart if memory exceeds 1GB

      // Restart strategies
      exp_backoff_restart_delay: 100, // Exponential backoff between restarts (ms)
      restart_delay: 4000, // Delay between restart attempts (ms)

      // Health monitoring
      listen_timeout: 10000, // Wait 10s for app to be ready
      kill_timeout: 5000, // Wait 5s for graceful shutdown

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 4444,
      },

      // Logging
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Process management
      watch: false, // Don't watch files in production
      ignore_watch: ['node_modules', 'logs', '.next', 'data'],

      // Graceful shutdown
      shutdown_with_message: true,
      wait_ready: true,

      // Advanced options
      vizion: false, // Disable version control features for performance
      post_update: ['npm install', 'npm run build'], // Commands after update

      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',

      // Health check (optional - requires pm2-health-check module)
      // For HTTP health checks, ensure /api/health endpoint exists
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'runcloud',
      host: '162.55.247.245',
      ref: 'origin/main',
      repo: 'git@github.com:username/protocoale-terapeutice.git',
      path: '/home/runcloud/webapps/protocoale-terapeutice',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
