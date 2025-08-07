# Azure Production Configuration (GOLDEN MASTER)

## Environment Variables (WORKING PRODUCTION)
```bash
# FIX Protocol Settings (DO NOT CHANGE)
FIX_SOCKET_HOST=fixapi-nysim1.fxspotstream.com
FIX_SOCKET_PORT=5015
FIX_TARGET_COMP_ID=FXSPOTSTREAM
FIX_SENDER_COMP_ID=GZCIM

# Redis Cache Settings (DO NOT CHANGE)
REDIS_HOST=gzc-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=[PRODUCTION_PASSWORD_FROM_AZURE_KEYVAULT]
REDIS_SSL=true

# Application Settings
FLASK_PORT=5100
PYTHONPATH=/app/backend
PYTHONUNBUFFERED=1
PYTHONIOENCODING=utf-8
```

## Nginx Configuration (EXACT COPY FROM PRODUCTION)
```nginx
server {
    listen 3500;
    server_name localhost;
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # WebSocket Endpoints - CRITICAL FOR LIVE DATA
    location /ws_esp {
        proxy_pass http://localhost:5100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
    
    location /ws_rfs {
        proxy_pass http://localhost:5100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
    
    location /ws_execution {
        proxy_pass http://localhost:5100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
    
    location /api/ {
        proxy_pass http://localhost:5100/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Supervisor Configuration (PROCESS MANAGEMENT)
```ini
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisord.log

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/var/log/nginx.err.log
stdout_logfile=/var/log/nginx.out.log

[program:fxspotstream]
command=/app/start-backend.sh
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/fxspotstream.err.log
stdout_logfile=/var/log/fxspotstream.out.log
environment=PYTHONPATH="/app/backend",FLASK_PORT="5100"
```

## CRITICAL RULES
⚠️ **NEVER CHANGE THESE SETTINGS**:
- FIX connection details (whitelisted IP)
- Redis connection (production cache)
- WebSocket proxy configuration
- Port mappings (3500 → nginx, 5100 → Flask)

✅ **SAFE TO MODIFY**:
- Frontend assets in `/var/www/html/`
- Backend application code (not connection settings)
- Component additions

## Dockerfile Template
Use this exact configuration in any new Docker build:
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y nginx supervisor

# Copy configurations
COPY nginx.conf /etc/nginx/sites-available/default
COPY supervisord.conf /etc/supervisor/conf.d/
COPY start-backend.sh /app/

# Environment variables
ENV FIX_SOCKET_HOST=fixapi-nysim1.fxspotstream.com
ENV FIX_SOCKET_PORT=5015
ENV REDIS_HOST=gzc-redis.redis.cache.windows.net
ENV REDIS_PORT=6380
ENV REDIS_SSL=true

# Start supervisor (manages nginx + flask)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```