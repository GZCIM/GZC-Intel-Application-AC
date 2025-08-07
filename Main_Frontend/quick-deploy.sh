#!/bin/bash
set -e

echo "Quick deploy with Bloomberg Volatility component..."

# Build the app
echo "Building app..."
npm run build:skip-ts

# Build and push Docker image directly using buildx (faster)
echo "Building Docker image..."
IMAGE_TAG="bloomberg-vol-$(date +%Y%m%d-%H%M%S)"
FULL_IMAGE="gzcacr.azurecr.io/gzc-intel-app:${IMAGE_TAG}"

# Use ACR build but with a smaller context
echo "Creating minimal build context..."
mkdir -p .docker-build
cp Dockerfile .docker-build/
cp -r dist .docker-build/
cp -r public .docker-build/ 2>/dev/null || true
cp package*.json .docker-build/
cp index.html .docker-build/ 2>/dev/null || true
cp -r src .docker-build/ 2>/dev/null || true
cp tsconfig*.json .docker-build/ 2>/dev/null || true
cp vite.config.ts .docker-build/ 2>/dev/null || true
cp -r scripts .docker-build/ 2>/dev/null || true

# Build in ACR with minimal context
echo "Building in ACR..."
cd .docker-build
az acr build --registry gzcacr --image "gzc-intel-app:${IMAGE_TAG}" . --timeout 600

cd ..
rm -rf .docker-build

# Update the container app
echo "Updating container app..."
az containerapp update \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --image "${FULL_IMAGE}"

echo "Deployment complete!"
echo "Image: ${FULL_IMAGE}"
echo "App URL: https://gzc-intel-app.agreeablepond-1a74a92d.eastus.azurecontainerapps.io"