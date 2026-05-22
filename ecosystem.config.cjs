module.exports = {
  apps: [
    {
      name:         'archon-backend',
      script:       'dist/backend/src/server.js',
      cwd:          './backend',
      instances:    2,
      exec_mode:    'cluster',
      watch:        false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV:    'production',
        PORT:        5000,
      },
      error_file:   '../logs/backend-error.log',
      out_file:     '../logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
