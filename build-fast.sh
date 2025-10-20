#!/bin/bash

# Fast Docker build script with BuildKit optimizations
set -e

echo "🚀 Starting fast Docker build..."

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with maximum parallelism and caching
docker build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --build-arg VITE_APPLICATIONINSIGHTS_CONNECTION_STRING="$VITE_APPLICATIONINSIGHTS_CONNECTION_STRING" \
    --build-arg VITE_CLIENT_ID="$VITE_CLIENT_ID" \
    --build-arg VITE_TENANT_ID="$VITE_TENANT_ID" \
    --build-arg VITE_APP_VERSION="$VITE_APP_VERSION" \
    --progress=plain \
    --no-cache \
    -t gzc-intel-app:latest \
    .

echo "✅ Build completed!"
