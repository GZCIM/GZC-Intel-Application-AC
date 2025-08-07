# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the app (skip TypeScript check for deployment)
RUN npm run build:skip-ts

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA with WebSocket and API proxy support
RUN echo 'server { \
    listen 3500; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /ws_esp { \
        proxy_pass https://fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_connect_timeout 60s; \
        proxy_send_timeout 60s; \
        proxy_read_timeout 60s; \
        proxy_buffering off; \
    } \
    location /ws_rfs { \
        proxy_pass https://fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_connect_timeout 60s; \
        proxy_send_timeout 60s; \
        proxy_read_timeout 60s; \
        proxy_buffering off; \
    } \
    location /ws_execution { \
        proxy_pass https://fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_connect_timeout 60s; \
        proxy_send_timeout 60s; \
        proxy_read_timeout 60s; \
        proxy_buffering off; \
    } \
    location /api/ { \
        proxy_pass https://fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io/; \
        proxy_set_header Host fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3500

CMD ["nginx", "-g", "daemon off;"]