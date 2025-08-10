#!/bin/bash
set -e

# GZC Intel Application AC - UNIFIED DEPLOYMENT SCRIPT
# This is the ONLY deployment script you need

echo "🚀 GZC Intel Application AC - Unified Deployment"
echo "================================================"

# Configuration
ACR_NAME="gzcacr"
APP_NAME="gzc-intel-application-ac"
RESOURCE_GROUP="gzc-kubernetes-rg"
IMAGE_REPO="gzc-intel-app"

# Get version tag or generate one
if [ -z "$1" ]; then
  VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
  echo "⏰ Auto-generated version: $VERSION_TAG"
else
  VERSION_TAG="$1"
  echo "📌 Using provided version: $VERSION_TAG"
fi

FULL_IMAGE="$ACR_NAME.azurecr.io/$IMAGE_REPO:$VERSION_TAG"
echo "🖼️  Docker image: $FULL_IMAGE"
echo ""

# Step 1: Build the frontend
echo "🏗️  Step 1: Building frontend..."
cd "/Users/mikaeleage/GZC Intel Application AC/Main_Frontend"
npx vite build || {
  echo "❌ Frontend build failed"
  exit 1
}
echo "✅ Frontend build complete"

# Step 2: Build Docker image
echo ""
echo "🐳 Step 2: Building Docker image..."
cd "/Users/mikaeleage/GZC Intel Application AC"
docker build --no-cache -t "$FULL_IMAGE" --platform linux/amd64 . || {
  echo "❌ Docker build failed"
  exit 1
}
echo "✅ Docker build complete"

# Step 3: Push to Azure Container Registry
echo ""
echo "☁️  Step 3: Pushing to Azure Container Registry..."
az acr login --name "$ACR_NAME" || {
  echo "❌ ACR login failed - check your Azure credentials"
  exit 1
}
docker push "$FULL_IMAGE" || {
  echo "❌ Docker push failed"
  exit 1
}
echo "✅ Image pushed to ACR"

# Step 4: Deploy to Azure Container Apps
echo ""
echo "🌐 Step 4: Deploying to Azure Container Apps..."
DEPLOYMENT_OUTPUT=$(az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$FULL_IMAGE" \
  --output json) || {
  echo "❌ Container app deployment failed"
  exit 1
}

# Extract revision name from deployment output
REVISION_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.latestRevisionName')
echo "✅ Deployed to revision: $REVISION_NAME"

# Step 5: Verify deployment
echo ""
echo "🔍 Step 5: Verifying deployment..."
sleep 10  # Give Azure a moment to update

REVISION_STATUS=$(az containerapp revision show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --revision "$REVISION_NAME" \
  --query "{healthState:properties.healthState,active:properties.active,replicas:properties.replicas}" \
  --output json)

HEALTH_STATE=$(echo "$REVISION_STATUS" | jq -r '.healthState')
IS_ACTIVE=$(echo "$REVISION_STATUS" | jq -r '.active')
REPLICAS=$(echo "$REVISION_STATUS" | jq -r '.replicas')

if [ "$HEALTH_STATE" = "Healthy" ] && [ "$IS_ACTIVE" = "true" ] && [ "$REPLICAS" -gt 0 ]; then
  echo "✅ Deployment successful!"
  echo "   Health: $HEALTH_STATE"
  echo "   Active: $IS_ACTIVE"
  echo "   Replicas: $REPLICAS"
else
  echo "⚠️  Deployment may have issues:"
  echo "   Health: $HEALTH_STATE"
  echo "   Active: $IS_ACTIVE"
  echo "   Replicas: $REPLICAS"
fi

# Step 6: Display results
echo ""
echo "🎉 DEPLOYMENT COMPLETE"
echo "================================================"
echo "✅ Version: $VERSION_TAG"
echo "✅ Image: $FULL_IMAGE"
echo "✅ Revision: $REVISION_NAME"
echo "✅ URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"
echo ""
echo "📋 Next Steps:"
echo "   1. Test your deployment: curl -I https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"
echo "   2. Check status anytime: ./scripts/deployment-status.sh"
echo "   3. View logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🔄 To deploy again: ./scripts/deploy.sh [version-tag]"
echo "================================================"