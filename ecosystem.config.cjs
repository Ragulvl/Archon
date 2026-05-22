const path = require('path');

module.exports = {
  apps: [
    {
      name:   'archon-backend',

      // Path is relative to cwd below.
      // backend/tsconfig.json sets outDir: "./dist" → compiled output is backend/dist/
      // The compiled server entry is: backend/dist/backend/src/server.js
      // BUT since cwd is set to the backend/ folder, node resolves:
      //   dist/backend/src/server.js  (from inside /backend)
      script: 'dist/backend/src/server.js',
      cwd:    path.resolve(__dirname, 'backend'),

      // Cluster mode — 2 workers. Use 'max' on bigger instances.
      instances:  2,
      exec_mode:  'cluster',

      watch:  false,
      autorestart: true,
      max_memory_restart: '512M',

      // How long to wait for graceful shutdown before SIGKILL
      kill_timeout: 15000,
      // How long to wait for app to be ready before marking as failed
      listen_timeout: 10000,

      // ── Environment variables ────────────────────────────────────────────────
      // These are always injected regardless of --env flag.
      // Sensitive values (DATABASE_URL, JWT_SECRET, API keys) must be in
      // /home/<user>/app/backend/.env — DO NOT put secrets here.
      env: {
        NODE_ENV: 'development',
        PORT:     5000,
      },

      // Injected when started with: pm2 start ecosystem.config.cjs --env production
      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
      },

      // ── Logs ────────────────────────────────────────────────────────────────
      // Absolute paths prevent CWD-dependent failures
      error_file:      path.resolve(__dirname, 'logs', 'backend-error.log'),
      out_file:        path.resolve(__dirname, 'logs', 'backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs:      true,

      // ── Advanced ─────────────────────────────────────────────────────────────
      source_map_support: true,
      node_args: ['--enable-source-maps'],
    },
  ],
};
