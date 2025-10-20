# GZC Intel Application AC - Production Dockerfile
# Cross-platform compatible (Windows/Mac/Linux development)
# Deploys to Azure Container Apps (linux/amd64)

# Stage 1: Build Frontend
FROM mcr.microsoft.com/devcontainers/javascript-node:20 AS frontend-builder

WORKDIR /app/frontend

# Configure npm for maximum speed
RUN npm config set fetch-retries 3 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retry-maxtimeout 60000 \
    && npm config set registry https://registry.npmjs.org \
    && npm config set prefer-offline true \
    && npm config set audit false \
    && npm config set fund false

# Copy frontend package files
COPY Main_Frontend/package*.json ./

# Install dependencies with aggressive caching
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/frontend/node_modules \
    npm ci --prefer-offline --no-audit --no-fund --silent

# Copy frontend source
COPY Main_Frontend/ ./

# Build frontend with Application Insights, Azure AD and Version
ARG VITE_APPLICATIONINSIGHTS_CONNECTION_STRING
ARG VITE_CLIENT_ID
ARG VITE_TENANT_ID
ARG VITE_APP_VERSION=dev
ENV VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=${VITE_APPLICATIONINSIGHTS_CONNECTION_STRING}
ENV VITE_CLIENT_ID=${VITE_CLIENT_ID}
ENV VITE_TENANT_ID=${VITE_TENANT_ID}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

# Build with caching and parallel processing
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/frontend/node_modules \
    npm run build:skip-ts

# Stage 2: Production Container
FROM mcr.microsoft.com/devcontainers/python:3.11

WORKDIR /app

# Install system dependencies in parallel
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Python dependencies for both backends in parallel
COPY FSS_Socket/backend/requirements.txt /tmp/fss_requirements.txt
COPY Main_Gateway/backend/requirements.txt /tmp/gateway_requirements.txt

# Install Python packages with aggressive caching and parallel processing
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /tmp/fss_requirements.txt && \
    pip install --no-cache-dir -r /tmp/gateway_requirements.txt

# Copy all files in parallel to minimize layers
COPY --from=frontend-builder /app/frontend/dist /var/www/html
COPY FSS_Socket/backend/ /app/fss_backend/
COPY Main_Gateway/backend/ /app/gateway_backend/
COPY nginx-config/nginx.conf /etc/nginx/nginx.conf
COPY nginx-config/mime.types /etc/nginx/mime.types
COPY nginx-config/sites-available/default /etc/nginx/conf.d/default.conf
COPY inject-env.sh /usr/local/bin/inject-env.sh

# Set permissions
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
