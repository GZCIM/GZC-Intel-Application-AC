#!/bin/bash
# Safe deployment script - only deploys known working version

set -e

echo "=================================="
echo "GZC Intel App - Safe Deployment"
echo "=================================="

# Configuration
RESOURCE_GROUP="gzc-kubernetes-rg"
CONTAINER_APP="gzc-intel-app"
WORKING_IMAGE="gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix"

echo ""
echo "Deploying KNOWN WORKING version..."
echo "Image: $WORKING_IMAGE"
echo ""

# Deploy
az containerapp update \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --image $WORKING_IMAGE

echo ""
echo "✅ Deployment complete!"
echo "URL: https://gzc-intel-app.agreeablepond-1a74a92d.eastus.azurecontainerapps.io"
echo ""
echo "WebSockets should be working at:"
echo "- /ws_esp"
echo "- /ws_rfs"
echo "- /ws_execution"