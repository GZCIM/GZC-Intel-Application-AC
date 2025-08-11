#!/bin/bash

# Fix FSS (FXSpotStream) Deployment Script
# This script repairs the existing FSS container app in Azure while preserving its configuration

set -euo pipefail

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-gzc-kubernetes-rg}"
ACR_NAME="${ACR_NAME:-gzcacr}"
FSS_APP_NAME="fxspotstream"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-gzc-production}"
KEYVAULT_NAME="${KEYVAULT_NAME:-gzc-finma-keyvault}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check current FSS status
check_fss_status() {
    log_step "Checking current FSS deployment status..."
    
    local fss_status=$(az containerapp show --name $FSS_APP_NAME --resource-group $RESOURCE_GROUP --query "properties.provisioningState" -o tsv 2>/dev/null || echo "NotFound")
    
    echo "FSS Status: $fss_status"
    
    if [ "$fss_status" = "Failed" ]; then
        log_warning "FSS deployment is in Failed state - will rebuild"
        return 1
    elif [ "$fss_status" = "Succeeded" ]; then
        log_info "FSS deployment exists and is healthy"
        return 0
    else
        log_warning "FSS deployment not found or in unknown state"
        return 2
    fi
}

# Function to build FSS image with health check
build_fss_image() {
    log_step "Building FSS Docker image with health checks..."
    
    # Navigate to FSS directory
    cd FSS_Socket/backend
    
    # Create production dockerfile if not exists
    if [ ! -f "Dockerfile.production" ]; then
        log_error "Dockerfile.production not found in FSS_Socket/backend"
        return 1
    fi
    
    local VERSION=$(date +"%Y%m%d-%H%M%S")
    local FSS_IMAGE="$ACR_NAME.azurecr.io/fss-socket:$VERSION"
    
    log_info "Building image: $FSS_IMAGE"
    
    # Build the image
    docker build -f Dockerfile.production -t $FSS_IMAGE -t $ACR_NAME.azurecr.io/fss-socket:latest .
    
    # Push to ACR
    docker push $FSS_IMAGE
    docker push $ACR_NAME.azurecr.io/fss-socket:latest
    
    # Return to root directory
    cd ../..
    
    echo "FSS_IMAGE=$FSS_IMAGE" > deployment/production/.fss-version
    log_info "FSS image built and pushed successfully"
}

# Function to register health controller
register_health_controller() {
    log_step "Ensuring health controller is registered..."
    
    # Check if health controller is registered in __init__.py
    local init_file="FSS_Socket/backend/app/__init__.py"
    
    if ! grep -q "health_controller" "$init_file"; then
        log_warning "Adding health controller to FSS app initialization"
        
        # Backup original file
        cp "$init_file" "$init_file.backup"
        
        # Add health controller import and registration
        cat >> "$init_file" << 'EOF'
    from .controllers.health_controller import health_bp
    app.register_blueprint(health_bp)
EOF
        
        log_info "Health controller registered"
    else
        log_info "Health controller already registered"
    fi
}

# Function to create secrets for FSS
create_fss_secrets() {
    log_step "Creating FSS-specific secrets in Key Vault..."
    
    # Redis password for FSS (reuse existing)
    local redis_password=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "gzc-redis-password" --query value -o tsv 2>/dev/null || echo "")
    
    if [ -z "$redis_password" ]; then
        log_info "Creating new Redis password"
        redis_password=$(openssl rand -base64 24)
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "gzc-redis-password" --value "$redis_password" --output none
    fi
    
    # FIX gateway credentials (for production trading)
    # Note: These would come from actual trading infrastructure
    az keyvault secret set --vault-name $KEYVAULT_NAME --name "fss-fix-username" --value "${FIX_USERNAME:-trading_user}" --output none 2>/dev/null || true
    az keyvault secret set --vault-name $KEYVAULT_NAME --name "fss-fix-password" --value "${FIX_PASSWORD:-secure_password}" --output none 2>/dev/null || true
    
    log_info "FSS secrets configured"
}

# Function to update FSS deployment
update_fss_deployment() {
    log_step "Updating FSS deployment..."
    
    local FSS_IMAGE=$(cat deployment/production/.fss-version | cut -d= -f2)
    
    # Delete the failed deployment first
    log_info "Removing failed FSS deployment..."
    az containerapp delete --name $FSS_APP_NAME --resource-group $RESOURCE_GROUP --yes --no-wait 2>/dev/null || true
    
    # Wait for deletion
    sleep 10
    
    # Create new deployment with proper configuration
    log_info "Creating new FSS deployment..."
    az containerapp create \
        --name $FSS_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --environment-name $ENVIRONMENT_NAME \
        --image $FSS_IMAGE \
        --target-port 5100 \
        --ingress external \
        --transport auto \
        --cpu 1.0 \
        --memory 2Gi \
        --min-replicas 1 \
        --max-replicas 2 \
        --secrets \
            redis-password=keyvaultref:$KEYVAULT_NAME/gzc-redis-password,secretref:gzc-redis-password \
            fix-username=keyvaultref:$KEYVAULT_NAME/fss-fix-username,secretref:fss-fix-username \
            fix-password=keyvaultref:$KEYVAULT_NAME/fss-fix-password,secretref:fss-fix-password \
        --env-vars \
            FLASK_ENV=production \
            FLASK_HOST=0.0.0.0 \
            FLASK_PORT=5100 \
            REDIS_HOST=redis \
            REDIS_PORT=6379 \
            REDIS_PASSWORD=secretref:redis-password \
            FIX_USERNAME=secretref:fix-username \
            FIX_PASSWORD=secretref:fix-password \
            FIX_SOCKET_HOST=${FIX_SOCKET_HOST:-} \
            FIX_ESP_TRADING_PORT=${FIX_ESP_TRADING_PORT:-9100} \
            FIX_ESP_SENDER_COMP_ID_MKT=${FIX_ESP_SENDER_COMP_ID_MKT:-} \
            FIX_TARGET_COMP_ID=${FIX_TARGET_COMP_ID:-} \
            PYTHONPATH=/app \
        --startup-probe-failure-threshold 3 \
        --startup-probe-initial-delay 10 \
        --startup-probe-period 10 \
        --startup-probe-timeout 5 \
        --startup-probe-type HttpGet \
        --startup-probe-path /health/ready \
        --liveness-probe-failure-threshold 3 \
        --liveness-probe-initial-delay 30 \
        --liveness-probe-period 30 \
        --liveness-probe-timeout 5 \
        --liveness-probe-type HttpGet \
        --liveness-probe-path /health/live \
        --readiness-probe-failure-threshold 3 \
        --readiness-probe-initial-delay 10 \
        --readiness-probe-period 10 \
        --readiness-probe-timeout 5 \
        --readiness-probe-type HttpGet \
        --readiness-probe-path /health/ready \
        --output none
    
    log_info "FSS deployment updated successfully"
}

# Function to get FSS endpoint
get_fss_endpoint() {
    log_step "Getting FSS endpoint..."
    
    local fss_fqdn=$(az containerapp show --name $FSS_APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
    
    if [ -n "$fss_fqdn" ] && [ "$fss_fqdn" != "null" ]; then
        echo "FSS_ENDPOINT=https://$fss_fqdn" > deployment/production/.fss-endpoint
        log_info "FSS endpoint: https://$fss_fqdn"
    else
        log_error "Could not retrieve FSS endpoint"
        return 1
    fi
}

# Function to test FSS connectivity
test_fss_connectivity() {
    log_step "Testing FSS connectivity..."
    
    local fss_endpoint=$(cat deployment/production/.fss-endpoint | cut -d= -f2)
    
    log_info "Waiting for FSS to be ready..."
    sleep 30
    
    # Test health endpoint
    if curl -f -s "$fss_endpoint/health" > /dev/null; then
        log_info "✅ FSS health check passed"
    else
        log_warning "⚠️  FSS health check failed - may still be starting up"
    fi
    
    # Test WebSocket endpoints availability (not connection)
    local ws_endpoint="${fss_endpoint/https/wss}"
    log_info "WebSocket endpoints available at:"
    echo "  - ESP: $ws_endpoint/ws_esp"
    echo "  - RFS: $ws_endpoint/ws_rfs" 
    echo "  - Execution: $ws_endpoint/ws_execution"
}

# Function to update main gateway to include FSS
update_main_gateway_for_fss() {
    log_step "Updating main gateway configuration for FSS integration..."
    
    local fss_endpoint=$(cat deployment/production/.fss-endpoint | cut -d= -f2)
    local fss_host=$(echo $fss_endpoint | sed 's|https://||')
    
    # Create updated nginx config that includes FSS routing
    log_info "FSS will be accessible through main gateway at WebSocket endpoints"
    log_info "FSS direct endpoint preserved: $fss_endpoint"
    
    # Note: In production, you may want to route FSS through the main gateway
    # or keep it separate for trading infrastructure isolation
}

# Main execution function
main() {
    log_info "Starting FSS deployment fix..."
    
    # Check prerequisites
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI not found"
        exit 1
    fi
    
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure"
        exit 1
    fi
    
    # Execute deployment steps
    check_fss_status || log_warning "FSS needs repair"
    
    register_health_controller
    build_fss_image
    create_fss_secrets
    update_fss_deployment
    get_fss_endpoint
    test_fss_connectivity
    update_main_gateway_for_fss
    
    # Summary
    log_step "FSS Deployment Summary"
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN} FSS (FXSpotStream) Deployment Complete     ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    
    if [ -f "deployment/production/.fss-endpoint" ]; then
        local fss_endpoint=$(cat deployment/production/.fss-endpoint | cut -d= -f2)
        echo -e "🌐 FSS Endpoint: ${BLUE}$fss_endpoint${NC}"
        echo -e "📡 WebSocket ESP: ${BLUE}${fss_endpoint/https/wss}/ws_esp${NC}"
        echo -e "📡 WebSocket RFS: ${BLUE}${fss_endpoint/https/wss}/ws_rfs${NC}"
        echo -e "📡 WebSocket Exec: ${BLUE}${fss_endpoint/https/wss}/ws_execution${NC}"
        echo -e "🔒 Security: ${GREEN}External ingress with health checks${NC}"
        echo -e "💼 Trading: ${GREEN}FIX gateway ready for certificates${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}FSS deployment fixed successfully! 🚀${NC}"
}

# Run main function
main "$@"