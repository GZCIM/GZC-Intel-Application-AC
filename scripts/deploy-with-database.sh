#!/bin/bash

# Deploy GZC Intel Application AC with Database Support
# This includes both FSS_Socket and Main_Gateway backends

set -e

print_status() {
    echo -e "\n\033[1;34m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m✓\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m✗\033[0m $1"
}

# Generate version tag
VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
IMAGE_TAG="gzcacr.azurecr.io/gzc-intel-app:${VERSION_TAG}"
LATEST_TAG="gzcacr.azurecr.io/gzc-intel-app:latest"

print_status "Starting deployment with database support - Version: ${VERSION_TAG}"

# Login to Azure Container Registry
print_status "Logging into Azure Container Registry..."
if az acr login --name gzcacr; then
    print_success "Successfully logged into ACR"
else
    print_error "Failed to login to ACR"
    exit 1
fi

# Build Docker image with both backends
print_status "Building Docker image with both backends..."
if docker build -f Dockerfile-with-gateway -t "${IMAGE_TAG}" -t "${LATEST_TAG}" --platform linux/amd64 .; then
    print_success "Docker image built successfully"
else
    print_error "Docker build failed"
    exit 1
fi

# Push image to ACR
print_status "Pushing image to Azure Container Registry..."
if docker push "${IMAGE_TAG}" && docker push "${LATEST_TAG}"; then
    print_success "Image pushed successfully"
else
    print_error "Failed to push image to ACR"
    exit 1
fi

# Update Container App
print_status "Updating Azure Container App..."
if az containerapp update \
    --name gzc-intel-application-ac \
    --resource-group gzc-kubernetes-rg \
    --image "${IMAGE_TAG}" \
    --revision-suffix "db-support-${VERSION_TAG##v-}" \
    --query properties.latestRevisionName -o tsv; then
    print_success "Container App updated successfully"
else
    print_error "Failed to update Container App"
    exit 1
fi

# Get the application URL
APP_URL=$(az containerapp show \
    --name gzc-intel-application-ac \
    --resource-group gzc-kubernetes-rg \
    --query properties.configuration.ingress.fqdn -o tsv)

if [ -n "$APP_URL" ]; then
    print_status "Waiting for deployment to stabilize (30 seconds)..."
    sleep 30
    
    # Verify the health endpoints
    print_status "Verifying health endpoints..."
    
    # Check FSS backend
    if curl -s "https://${APP_URL}/api/health" | grep -q "up"; then
        print_success "FSS Backend is healthy"
    else
        print_error "FSS Backend health check failed"
    fi
    
    # Check Gateway backend
    if curl -s "https://${APP_URL}/api/user-memory/health" | grep -q "healthy"; then
        print_success "Gateway Backend with database is healthy"
    else
        print_error "Gateway Backend health check failed"
    fi
    
    print_success "Deployment completed successfully!"
    echo -e "\n\033[1;32m🚀 Application URL:\033[0m https://${APP_URL}"
    echo -e "\033[1;33m📊 Database persistence is now enabled!\033[0m"
    echo -e "\nTo verify database persistence:"
    echo "1. Add/modify components in the Dynamic Canvas"
    echo "2. Refresh the page - components should persist"
    echo "3. Check logs: az containerapp logs show -n gzc-intel-application-ac -g gzc-kubernetes-rg"
else
    print_error "Could not retrieve application URL"
fi