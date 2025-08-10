#!/bin/bash
set -e

# ================================================
# PROPER AZURE CONTAINER APPS DEPLOYMENT SCRIPT
# Based on Microsoft best practices and documentation
# ================================================

echo "🚀 Azure Container Apps - Proper Deployment Process"
echo "===================================================="

# Configuration
ACR_NAME="gzcacr"
APP_NAME="gzc-intel-application-ac"
RESOURCE_GROUP="gzc-kubernetes-rg"
IMAGE_REPO="gzc-intel-app"
FRONTEND_DIR="/Users/mikaeleage/GZC Intel Application AC/Main_Frontend"
PROJECT_ROOT="/Users/mikaeleage/GZC Intel Application AC"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Generate version tag if not provided
if [ -z "$1" ]; then
    VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
    print_status "Generated version tag: $VERSION_TAG"
else
    VERSION_TAG="$1"
    print_status "Using provided version: $VERSION_TAG"
fi

FULL_IMAGE="$ACR_NAME.azurecr.io/$IMAGE_REPO:$VERSION_TAG"
echo ""
echo "📦 Image: $FULL_IMAGE"
echo ""

# Step 1: Build Frontend with version injection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Building Frontend (with version: $VERSION_TAG)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$FRONTEND_DIR"

# Build with version environment variable
# Note: VITE_ prefixed env vars are automatically exposed to the client
if VITE_APP_VERSION="$VERSION_TAG" npx vite build; then
    print_status "Frontend build successful with version $VERSION_TAG"
    # Verify version was injected
    if grep -q "$VERSION_TAG" dist/assets/index-*.js; then
        print_status "Version $VERSION_TAG successfully injected into build"
    else
        print_warning "Version may not have been properly injected"
    fi
else
    print_error "Frontend build failed"
    exit 1
fi

# Step 2: Azure Login & ACR Authentication
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Azure Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if already logged in to Azure
if az account show &>/dev/null; then
    print_status "Already logged in to Azure"
else
    print_warning "Not logged in to Azure. Logging in..."
    if az login; then
        print_status "Azure login successful"
    else
        print_error "Azure login failed"
        exit 1
    fi
fi

# Login to ACR (CRITICAL - often missing!)
echo "Logging in to Azure Container Registry..."
if az acr login --name "$ACR_NAME"; then
    print_status "ACR login successful"
else
    print_error "ACR login failed"
    exit 1
fi

# Step 3: Build Docker Image
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Building Docker Image"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$PROJECT_ROOT"

# Only use --no-cache if explicitly requested
BUILD_ARGS=""
if [ "$2" == "--no-cache" ]; then
    print_warning "Building with --no-cache (slower)"
    BUILD_ARGS="--no-cache"
fi

if docker build $BUILD_ARGS -t "$FULL_IMAGE" --platform linux/amd64 .; then
    print_status "Docker build successful"
else
    print_error "Docker build failed"
    exit 1
fi

# Step 4: Push to ACR
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Pushing to Azure Container Registry"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker push "$FULL_IMAGE"; then
    print_status "Image pushed successfully"
else
    print_error "Docker push failed - check ACR login"
    exit 1
fi

# Verify image exists in ACR
echo "Verifying image in registry..."
if az acr repository show --name "$ACR_NAME" --image "$IMAGE_REPO:$VERSION_TAG" &>/dev/null; then
    print_status "Image verified in ACR"
else
    print_error "Image not found in ACR - push may have failed"
    exit 1
fi

# Step 5: Update Container App
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Updating Azure Container App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update the container app
if az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$FULL_IMAGE" \
    --output json > /tmp/deployment-output.json; then
    print_status "Container app update initiated"
else
    print_error "Container app update failed"
    exit 1
fi

# Extract revision name
REVISION_NAME=$(jq -r '.properties.latestRevisionName' /tmp/deployment-output.json)
print_status "New revision: $REVISION_NAME"

# Step 6: Verify Deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6: Verifying Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for revision to be ready
echo "Waiting for revision to become ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    REVISION_STATUS=$(az containerapp revision show \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --revision "$REVISION_NAME" \
        --query "properties.healthState" \
        --output tsv 2>/dev/null)
    
    if [ "$REVISION_STATUS" == "Healthy" ]; then
        print_status "Revision is healthy!"
        break
    elif [ "$REVISION_STATUS" == "Degraded" ] || [ "$REVISION_STATUS" == "Unhealthy" ]; then
        print_error "Revision is $REVISION_STATUS"
        echo "Check logs with: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP"
        exit 1
    else
        echo -n "."
        sleep 5
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    print_warning "Timeout waiting for revision to be ready"
fi

# Get deployment details
DEPLOYMENT_INFO=$(az containerapp revision show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --revision "$REVISION_NAME" \
    --query "{active:properties.active,replicas:properties.replicas,trafficWeight:properties.trafficWeight,healthState:properties.healthState}" \
    --output json)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Deployment Summary:"
echo "  • Version: $VERSION_TAG"
echo "  • Image: $FULL_IMAGE"
echo "  • Revision: $REVISION_NAME"
echo "  • Status: $(echo $DEPLOYMENT_INFO | jq -r '.healthState')"
echo "  • Active: $(echo $DEPLOYMENT_INFO | jq -r '.active')"
echo "  • Replicas: $(echo $DEPLOYMENT_INFO | jq -r '.replicas')"
echo "  • Traffic: $(echo $DEPLOYMENT_INFO | jq -r '.trafficWeight')%"
echo ""
echo "🌐 Application URL:"
echo "   https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"
echo ""
echo "📊 Useful Commands:"
echo "  • View logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "  • List revisions: az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "  • Rollback: ./scripts/rollback.sh <previous-revision>"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"