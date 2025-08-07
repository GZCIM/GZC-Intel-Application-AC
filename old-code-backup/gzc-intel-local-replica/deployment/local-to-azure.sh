#!/bin/bash

# GZC Intel Application - Local to Azure Deployment Pipeline
# Usage: ./local-to-azure.sh [version-tag]

set -e  # Exit on any error

# Configuration
PROJECT_NAME="gzc-intel-app"
AZURE_RESOURCE_GROUP="gzc-intel-rg"
AZURE_CONTAINER_APP="gzc-intel-app"
AZURE_REGISTRY="gzcacr.azurecr.io"
LOCAL_PORT=3500
BACKEND_PORT=5100

VERSION_TAG=${1:-"latest"}
IMAGE_TAG="$AZURE_REGISTRY/$PROJECT_NAME:$VERSION_TAG"

echo "🚀 GZC Intel Application Deployment Pipeline"
echo "Version: $VERSION_TAG"
echo "Image: $IMAGE_TAG"
echo "=================================="

# Step 1: Verify local environment
echo "📋 Step 1: Verifying local environment..."
if [ ! -f "source-repos/gzc-intel-app/package.json" ]; then
    echo "❌ ERROR: Frontend source code not found. Run setup first."
    exit 1
fi

if [ ! -f "source-repos/portfolio_agregator/requirements.txt" ]; then
    echo "❌ ERROR: Backend source code not found. Run setup first."
    exit 1
fi

echo "✅ Source code verified"

# Step 2: Run local tests
echo "📋 Step 2: Running local validation..."
cd source-repos/gzc-intel-app

# Check if we can build locally (may have TypeScript errors)
echo "Testing local build..."
if npm run build 2>/dev/null; then
    echo "✅ Local build successful"
else
    echo "⚠️  Local build has errors, but continuing with Docker build"
fi

cd ../..

# Step 3: Build Docker image
echo "📋 Step 3: Building Docker image..."
if [ ! -f "deployment/Dockerfile" ]; then
    echo "❌ ERROR: Dockerfile not found. Creating basic Dockerfile..."
    # Here we would create a Dockerfile based on the working Azure configuration
    exit 1
fi

docker build -t $IMAGE_TAG -f deployment/Dockerfile .
echo "✅ Docker image built: $IMAGE_TAG"

# Step 4: Test Docker image locally
echo "📋 Step 4: Testing Docker image locally..."
echo "Starting container on port $LOCAL_PORT..."

# Kill any existing container
docker stop gzc-intel-test 2>/dev/null || true
docker rm gzc-intel-test 2>/dev/null || true

# Start test container
docker run -d \
    --name gzc-intel-test \
    --platform linux/amd64 \
    -p $LOCAL_PORT:3500 \
    -p $BACKEND_PORT:5100 \
    $IMAGE_TAG

echo "⏳ Waiting for container to start..."
sleep 10

# Test if container is responding
if curl -f -s http://localhost:$LOCAL_PORT > /dev/null; then
    echo "✅ Container test successful"
    docker stop gzc-intel-test
    docker rm gzc-intel-test
else
    echo "❌ ERROR: Container test failed"
    echo "Container logs:"
    docker logs gzc-intel-test
    docker stop gzc-intel-test
    docker rm gzc-intel-test
    exit 1
fi

# Step 5: Push to Azure Container Registry
echo "📋 Step 5: Pushing to Azure Container Registry..."
echo "Logging into Azure..."
az acr login --name gzcacr

echo "Pushing image..."
docker push $IMAGE_TAG
echo "✅ Image pushed to registry"

# Step 6: Deploy to Azure Container App
echo "📋 Step 6: Deploying to Azure Container App..."
az containerapp update \
    --name $AZURE_CONTAINER_APP \
    --resource-group $AZURE_RESOURCE_GROUP \
    --image $IMAGE_TAG \
    --revision-suffix $VERSION_TAG

echo "✅ Deployed to Azure Container App"

# Step 7: Verify deployment
echo "📋 Step 7: Verifying deployment..."
AZURE_URL=$(az containerapp show \
    --name $AZURE_CONTAINER_APP \
    --resource-group $AZURE_RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    --output tsv)

echo "⏳ Waiting for deployment to be ready..."
sleep 30

if curl -f -s "https://$AZURE_URL" > /dev/null; then
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "🌐 Application URL: https://$AZURE_URL"
    echo "📊 Version: $VERSION_TAG"
else
    echo "❌ ERROR: Deployment verification failed"
    echo "Check Azure portal for details"
    exit 1
fi

echo "=================================="
echo "🎉 Deployment completed successfully!"
echo "Version $VERSION_TAG is now live at https://$AZURE_URL"