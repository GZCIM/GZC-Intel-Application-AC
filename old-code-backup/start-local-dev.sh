#!/bin/bash

# GZC Intel Local Development Environment
# Uses the working production container as local development

echo "🚀 Starting GZC Intel Local Development"
echo "Using production container: gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix"

# Stop any existing containers
echo "Stopping existing containers..."
docker stop gzc-production 2>/dev/null || true
docker rm gzc-production 2>/dev/null || true

# Kill any local npm/vite processes that might conflict
echo "Stopping conflicting processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Start the production container with development settings
echo "Starting production container for local development..."

# Check if Redis password is set
if [ -z "$REDIS_PASSWORD" ]; then
    echo "⚠️  Redis password not set. Using default from .env"
    if [ -f "fx-websocket-backend/.env" ]; then
        export REDIS_PASSWORD=$(grep REDIS_PASSWORD fx-websocket-backend/.env | cut -d'=' -f2 | tr -d '"')
    else
        export REDIS_PASSWORD="[PRODUCTION_PASSWORD_FROM_AZURE_KEYVAULT]="
    fi
fi

docker run -d \
  --name gzc-production \
  --platform linux/amd64 \
  -p 3500:3500 \
  -p 5100:5100 \
  -e FIX_SOCKET_HOST=fixapi-nysim1.fxspotstream.com \
  -e FIX_SOCKET_PORT=5015 \
  -e FIX_TARGET_COMP_ID=FXSPOTSTREAM \
  -e FIX_SENDER_COMP_ID=GZCIM \
  -e REDIS_HOST=gzc-redis.redis.cache.windows.net \
  -e REDIS_PORT=6380 \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e REDIS_SSL=true \
  gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix

echo "⏳ Waiting for container to start..."
sleep 5

# Check if container is running
if docker ps | grep -q gzc-production; then
    echo "✅ Local development environment ready!"
    echo ""
    echo "🌐 Access your app at: http://localhost:3500"
    echo ""
    echo "Features available:"
    echo "  ✅ Tools tab with live data"
    echo "  ✅ Working WebSocket connections"
    echo "  ✅ Live FX quotes from Azure Redis"
    echo "  ✅ Portfolio management"
    echo "  ✅ Real-time analytics"
    echo ""
    echo "📝 To stop: docker stop gzc-production"
    echo "📊 Check status: docker logs gzc-production"
else
    echo "❌ Failed to start container"
    echo "Check logs: docker logs gzc-production"
    exit 1
fi