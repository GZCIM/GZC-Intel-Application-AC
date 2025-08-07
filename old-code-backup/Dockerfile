# Multi-stage build for GZC Intel Application

# Stage 1: Build Frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY gzc-intel-frontend/package*.json ./
RUN npm ci
COPY gzc-intel-frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM python:3.10-slim AS backend
WORKDIR /app/backend
COPY fx-websocket-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY fx-websocket-backend/ ./

# Stage 3: Final Image with nginx
FROM nginx:alpine
# Copy built frontend to nginx
COPY --from=frontend-builder /app/frontend/dist /var/www/html
# Copy backend
COPY --from=backend /app/backend /app/backend
# Install Python in final image
RUN apk add --no-cache python3 py3-pip
RUN pip3 install --no-cache-dir -r /app/backend/requirements.txt

# Copy nginx config
COPY deployment/nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY deployment/startup.sh /startup.sh
RUN chmod +x /startup.sh

EXPOSE 3500 5100

CMD ["/startup.sh"]