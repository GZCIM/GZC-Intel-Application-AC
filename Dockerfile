# GZC Intel Application AC - Production Dockerfile
# Cross-platform compatible (Windows/Mac/Linux development)
# Deploys to Azure Container Apps (linux/amd64)

# Stage 1: Build Frontend
FROM mcr.microsoft.com/devcontainers/javascript-node:20 AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY Main_Frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY Main_Frontend/ ./

# Build frontend with Application Insights, Azure AD and Version (skip TypeScript check for faster builds)
ARG VITE_APPLICATIONINSIGHTS_CONNECTION_STRING
ARG VITE_CLIENT_ID
ARG VITE_TENANT_ID
ARG VITE_APP_VERSION=dev
ENV VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=${VITE_APPLICATIONINSIGHTS_CONNECTION_STRING}
ENV VITE_CLIENT_ID=${VITE_CLIENT_ID}
ENV VITE_TENANT_ID=${VITE_TENANT_ID}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
RUN npm run build:skip-ts

# Stage 2: Production Container
FROM mcr.microsoft.com/devcontainers/python:3.11

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for both backends
COPY FSS_Socket/backend/requirements.txt /tmp/fss_requirements.txt
COPY Main_Gateway/backend/requirements.txt /tmp/gateway_requirements.txt
RUN pip install --no-cache-dir -r /tmp/fss_requirements.txt
RUN pip install --no-cache-dir -r /tmp/gateway_requirements.txt

# Copy built frontend to nginx directory
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy backend applications
COPY FSS_Socket/backend/ /app/fss_backend/
COPY Main_Gateway/backend/ /app/gateway_backend/

# Copy nginx config (use our provided config)
COPY nginx-config/nginx.conf /etc/nginx/nginx.conf
COPY nginx-config/mime.types /etc/nginx/mime.types
COPY nginx-config/sites-available/default /etc/nginx/conf.d/default.conf

# Copy environment variable injection script
COPY inject-env.sh /usr/local/bin/inject-env.sh
RUN chmod +x /usr/local/bin/inject-env.sh

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
[program:fss_backend] \n\
command=python /app/fss_backend/run.py \n\
directory=/app/fss_backend \n\
autostart=true \n\
autorestart=true \n\
stdout_logfile=/dev/stdout \n\
stdout_logfile_maxbytes=0 \n\
stderr_logfile=/dev/stderr \n\
stderr_logfile_maxbytes=0 \n\
environment=PYTHONUNBUFFERED="1",FLASK_PORT="5100",FLASK_HOST="0.0.0.0" \n\
\n\
[program:gateway_backend] \n\
command=python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 \n\
directory=/app/gateway_backend \n\
autostart=true \n\
autorestart=true \n\
stdout_logfile=/dev/stdout \n\
stdout_logfile_maxbytes=0 \n\
stderr_logfile=/dev/stderr \n\
stderr_logfile_maxbytes=0 \n\
environment=PYTHONUNBUFFERED="1",KEY_VAULT_URL="https://gzc-finma-keyvault.vault.azure.net/",ENVIRONMENT="production"' > /etc/supervisor/conf.d/supervisord.conf

# Expose port 80 for the application
EXPOSE 80

# Start with environment injection then supervisor
CMD ["/bin/bash", "-c", "echo 'Container starting...' && /usr/local/bin/inject-env.sh 2>&1 && echo 'Starting supervisord...' && /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf"]
