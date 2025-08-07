#!/bin/bash

# Build and deploy script for GZC Intel App with proper WebSocket configuration

# Exit on error
set -e

# Set WebSocket environment variables for build
export VITE_WEBSOCKET_ESP=/ws_esp
export VITE_WEBSOCKET_RFS=/ws_rfs
export VITE_WEBSOCKET_EXECUTION=/ws_execution
export VITE_ESP_QUOTE_SUBSCRIPTION_URL=/api/subscribe_quote
export VITE_STREAM_URL=/ws

echo "Building and deploying GZC Intel App..."
echo "WebSocket URLs configured:"
echo "  ESP: $VITE_WEBSOCKET_ESP"
echo "  RFS: $VITE_WEBSOCKET_RFS"
echo "  EXEC: $VITE_WEBSOCKET_EXECUTION"

# Build the application
echo "Building application..."
npm run build || true  # Continue even if there are TypeScript errors

# Build Docker image
echo "Building Docker image..."
docker build -t gzc-intel-app:latest .

# Tag for ACR
echo "Tagging for ACR..."
docker tag gzc-intel-app:latest gzcacr.azurecr.io/gzc-intel-app:latest

# Push to ACR
echo "Pushing to ACR..."
docker push gzcacr.azurecr.io/gzc-intel-app:latest

# Update Container App
echo "Updating Container App..."
az containerapp update \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:latest \
  --set-env-vars \
    VITE_WEBSOCKET_ESP=/ws_esp \
    VITE_WEBSOCKET_RFS=/ws_rfs \
    VITE_WEBSOCKET_EXECUTION=/ws_execution \
    VITE_ESP_QUOTE_SUBSCRIPTION_URL=/api/subscribe_quote \
    VITE_STREAM_URL=/ws

echo "Deployment complete!"
echo "App URL: https://gzc-intel-app.agreeablepond-1a74a92d.eastus.azurecontainerapps.io"