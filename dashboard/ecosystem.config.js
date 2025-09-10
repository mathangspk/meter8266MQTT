module.exports = {
  apps: [{
    name: 'meter-dashboard',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      HTTP_PORT: 3000,
      WS_PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      HTTP_PORT: 3000,
      WS_PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};