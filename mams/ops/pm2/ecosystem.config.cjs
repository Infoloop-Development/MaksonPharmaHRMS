module.exports = {
  apps: [
    {
      name: 'mams-server',
      cwd: '/opt/mams/current/mams-server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: '/var/log/mams/server.log',
      error_file: '/var/log/mams/server-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
