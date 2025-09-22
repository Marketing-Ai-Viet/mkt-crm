module.exports = {
  apps: [
    {
      name: 'twenty-server',
      script: './dist/src/main.js',
      cwd: '/var/www/api-crm.mktsoftware.vn/packages/twenty-server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_file: '/var/log/twenty-crm/server.log',
      error_file: '/var/log/twenty-crm/server-error.log',
      out_file: '/var/log/twenty-crm/server-out.log',
      max_memory_restart: '1G',
      restart_delay: 5000,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'twenty-worker',
      script: './dist/src/queue-worker/queue-worker.js',
      cwd: '/var/www/api-crm.mktsoftware.vn/packages/twenty-server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_file: '/var/log/twenty-crm/worker.log',
      error_file: '/var/log/twenty-crm/worker-error.log',
      out_file: '/var/log/twenty-crm/worker-out.log',
      max_memory_restart: '1G',
      restart_delay: 5000,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
