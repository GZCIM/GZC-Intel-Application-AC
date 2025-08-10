#!/bin/bash
set -e

# FAST DEVELOPMENT DEPLOYMENT
# For quick iterations during development

echo "⚡ FAST DEV DEPLOYMENT"
echo "====================="

cd "/Users/mikaeleage/GZC Intel Application AC/Main_Frontend"

# Kill any existing dev server
echo "🔄 Stopping any existing dev server..."
pkill -f "vite" || true
sleep 2

# Build quickly (skip TypeScript checks)
echo "🏗️  Quick build..."
npx vite build || {
  echo "❌ Build failed"
  exit 1
}

# Quick Docker build and push
echo "🐳 Building and pushing..."
cd "/Users/mikaeleage/GZC Intel Application AC"
VERSION_TAG="dev-$(date +%H%M%S)"
FULL_IMAGE="gzcacr.azurecr.io/gzc-intel-app:$VERSION_TAG"

# Build with cache to speed up
docker build -t "$FULL_IMAGE" --platform linux/amd64 . && \
docker push "$FULL_IMAGE" && \
az containerapp update \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image "$FULL_IMAGE"

echo ""
echo "✅ DEV DEPLOYMENT COMPLETE: $VERSION_TAG"
echo "🌐 URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"