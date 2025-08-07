# GZC Intel Application AC - Production Dockerfile
# Cross-platform compatible (Windows/Mac/Linux development)
# Deploys to Azure Container Apps (linux/amd64)

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY Main_Frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY Main_Frontend/ ./

# Build frontend (skip TypeScript check for faster builds)
RUN npm run build:skip-ts

# Stage 2: Production Container
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for backend
COPY FSS_Socket/backend/requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy built frontend to nginx directory
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy backend application
COPY FSS_Socket/backend/ /app/backend/

# Copy nginx configuration
COPY nginx-config/ /etc/nginx/sites-available/

# Create nginx config for the application
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /var/www/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://127.0.0.1:5100/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /ws_esp { \
        proxy_pass http://127.0.0.1:5100/ws_esp; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_read_timeout 86400; \
    } \
    \
    location /ws_rfs { \
        proxy_pass http://127.0.0.1:5100/ws_rfs; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_read_timeout 86400; \
    } \
    \
    location /ws_execution { \
        proxy_pass http://127.0.0.1:5100/ws_execution; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_read_timeout 86400; \
    } \
}' > /etc/nginx/sites-enabled/default

# Create supervisor config
RUN echo '[supervisord] \n\
nodaemon=true \n\
\n\
[program:nginx] \n\
command=/usr/sbin/nginx -g "daemon off;" \n\
autostart=true \n\
autorestart=true \n\
stdout_logfile=/dev/stdout \n\
stdout_logfile_maxbytes=0 \n\
stderr_logfile=/dev/stderr \n\
stderr_logfile_maxbytes=0 \n\
\n\
[program:backend] \n\
command=python /app/backend/run.py \n\
directory=/app/backend \n\
autostart=true \n\
autorestart=true \n\
stdout_logfile=/dev/stdout \n\
stdout_logfile_maxbytes=0 \n\
stderr_logfile=/dev/stderr \n\
stderr_logfile_maxbytes=0 \n\
environment=PYTHONUNBUFFERED="1",FLASK_PORT="5100",FLASK_HOST="0.0.0.0"' > /etc/supervisor/conf.d/supervisord.conf

# Expose port 80 for the application
EXPOSE 80

# Start supervisor to manage both nginx and backend
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]