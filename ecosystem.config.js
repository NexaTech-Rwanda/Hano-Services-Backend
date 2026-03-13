module.exports = {
  apps: [
    {
      name: 'hano-services-api',
      script: 'dist/index.js',       // Ensure package is built before running
      instances: 'max',              // Run across all available CPU cores (cluster mode)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,                  // Disable watch in production to avoid restart loops
      max_memory_restart: '1G',      // Restart if memory exceeds 1 GB
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
};
