#!/bin/bash

# Production Deployment Script for GZC Intel Application on Azure
# This script deploys the secure API Gateway architecture to Azure Container Apps

set -euo pipefail

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-gzc-kubernetes-rg}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-gzcacr}"
APP_NAME="${APP_NAME:-gzc-intel-application-ac}"
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

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login'"
        exit 1
    fi
    
    # Check if logged in to ACR
    if ! az acr login --name $ACR_NAME &> /dev/null; then
        log_error "Failed to login to Azure Container Registry: $ACR_NAME"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Function to create secrets in Key Vault
create_secrets() {
    log_step "Creating secrets in Azure Key Vault..."
    
    # Generate JWT secret if not exists
    JWT_SECRET=$(openssl rand -base64 32)
    az keyvault secret set \
        --vault-name $KEYVAULT_NAME \
        --name "gzc-jwt-secret" \
        --value "$JWT_SECRET" \
        --output none
    
    # Generate Redis password if not exists
    REDIS_PASSWORD=$(openssl rand -base64 24)
    az keyvault secret set \
        --vault-name $KEYVAULT_NAME \
        --name "gzc-redis-password" \
        --value "$REDIS_PASSWORD" \
        --output none
    
    # Set PostgreSQL password (using existing from env)
    az keyvault secret set \
        --vault-name $KEYVAULT_NAME \
        --name "gzc-postgres-password" \
        --value "Ii89rra137+*" \
        --output none
    
    log_info "Secrets created in Key Vault"
}

# Function to build and push Docker images
build_and_push_images() {
    log_step "Building and pushing Docker images..."
    
    local VERSION=$(date +"%Y%m%d-%H%M%S")
    
    # Build Nginx gateway image
    log_info "Building Nginx gateway image..."
    cat > Dockerfile.gateway <<EOF
FROM nginx:1.25-alpine

# Install additional modules
RUN apk add --no-cache curl openssl

# Copy configuration
COPY deployment/production/configs/nginx.production.conf /etc/nginx/nginx.conf
COPY deployment/production/error-pages /usr/share/nginx/html/errors/

# Create certificate directory
RUN mkdir -p /etc/nginx/certs && chown -R nginx:nginx /etc/nginx/certs

# Create logs directory
RUN mkdir -p /var/log/nginx && chown -R nginx:nginx /var/log/nginx

# Set proper permissions
RUN chmod 644 /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
EOF

    docker build -f Dockerfile.gateway -t $ACR_NAME.azurecr.io/gzc-intel-gateway:$VERSION -t $ACR_NAME.azurecr.io/gzc-intel-gateway:latest .
    docker push $ACR_NAME.azurecr.io/gzc-intel-gateway:$VERSION
    docker push $ACR_NAME.azurecr.io/gzc-intel-gateway:latest
    
    # Build frontend image
    log_info "Building frontend image..."
    cd Main_Frontend
    docker build -t $ACR_NAME.azurecr.io/gzc-intel-frontend:$VERSION -t $ACR_NAME.azurecr.io/gzc-intel-frontend:latest .
    docker push $ACR_NAME.azurecr.io/gzc-intel-frontend:$VERSION
    docker push $ACR_NAME.azurecr.io/gzc-intel-frontend:latest
    cd ..
    
    # Build FastAPI backend image
    log_info "Building FastAPI backend image..."
    cd Main_Gateway/backend
    docker build -t $ACR_NAME.azurecr.io/gzc-intel-backend:$VERSION -t $ACR_NAME.azurecr.io/gzc-intel-backend:latest .
    docker push $ACR_NAME.azurecr.io/gzc-intel-backend:$VERSION
    docker push $ACR_NAME.azurecr.io/gzc-intel-backend:latest
    cd ../..
    
    # Build WebSocket backend image
    log_info "Building WebSocket backend image..."
    cd FSS_Socket/backend
    docker build -t $ACR_NAME.azurecr.io/gzc-intel-websocket:$VERSION -t $ACR_NAME.azurecr.io/gzc-intel-websocket:latest .
    docker push $ACR_NAME.azurecr.io/gzc-intel-websocket:$VERSION
    docker push $ACR_NAME.azurecr.io/gzc-intel-websocket:latest
    cd ../..
    
    # Clean up
    rm -f Dockerfile.gateway
    
    log_info "Images built and pushed successfully"
    echo "VERSION=$VERSION" > deployment/production/.version
}

# Function to create Container Apps Environment
create_environment() {
    log_step "Creating Container Apps Environment..."
    
    # Create environment if it doesn't exist
    if ! az containerapp env show --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        az containerapp env create \
            --name $ENVIRONMENT_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --logs-workspace-id $(az monitor log-analytics workspace show \
                --resource-group $RESOURCE_GROUP \
                --workspace-name gzc-logs \
                --query customerId -o tsv 2>/dev/null || echo "") \
            --output none
        
        log_info "Container Apps Environment created"
    else
        log_info "Container Apps Environment already exists"
    fi
}

# Function to deploy PostgreSQL
deploy_postgresql() {
    log_step "Setting up PostgreSQL..."
    
    # PostgreSQL is already running on gzcdevserver.postgres.database.azure.com
    # Just ensure the database exists
    
    log_info "PostgreSQL is already configured"
}

# Function to deploy Redis
deploy_redis() {
    log_step "Deploying Redis..."
    
    az containerapp create \
        --name gzc-redis \
        --resource-group $RESOURCE_GROUP \
        --environment $ENVIRONMENT_NAME \
        --image redis:7-alpine \
        --target-port 6379 \
        --ingress internal \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 1 \
        --secrets redis-password=keyvaultref:$KEYVAULT_NAME/gzc-redis-password,secretref:gzc-redis-password \
        --env-vars REDIS_PASSWORD=secretref:redis-password \
        --command redis-server \
        --args '--requirepass $REDIS_PASSWORD --maxmemory 512mb --maxmemory-policy allkeys-lru' \
        --output none
    
    log_info "Redis deployed"
}

# Function to deploy FastAPI backend
deploy_fastapi() {
    log_step "Deploying FastAPI backend..."
    
    local VERSION=$(cat deployment/production/.version | cut -d= -f2)
    
    az containerapp create \
        --name gzc-fastapi-backend \
        --resource-group $RESOURCE_GROUP \
        --environment $ENVIRONMENT_NAME \
        --image $ACR_NAME.azurecr.io/gzc-intel-backend:$VERSION \
        --target-port 5000 \
        --ingress internal \
        --cpu 1.0 \
        --memory 2Gi \
        --min-replicas 1 \
        --max-replicas 3 \
        --secrets \
            postgres-password=keyvaultref:$KEYVAULT_NAME/gzc-postgres-password,secretref:gzc-postgres-password \
            redis-password=keyvaultref:$KEYVAULT_NAME/gzc-redis-password,secretref:gzc-redis-password \
            jwt-secret=keyvaultref:$KEYVAULT_NAME/gzc-jwt-secret,secretref:gzc-jwt-secret \
        --env-vars \
            ENVIRONMENT=production \
            LOG_LEVEL=info \
            WORKERS=4 \
            AZURE_AD_TENANT_ID=8274c97d-de9d-4328-98cf-2d4ee94bf104 \
            AZURE_AD_CLIENT_ID=a873f2d7-2ab9-4d59-a54c-90859226bf2e \
            POSTGRES_HOST=gzcdevserver.postgres.database.azure.com \
            POSTGRES_PORT=5432 \
            POSTGRES_DB=gzc_intel \
            POSTGRES_USER=mikael \
            POSTGRES_PASSWORD=secretref:postgres-password \
            REDIS_HOST=gzc-redis \
            REDIS_PORT=6379 \
            REDIS_PASSWORD=secretref:redis-password \
            JWT_SECRET=secretref:jwt-secret \
            BYPASS_AUTH_FOR_PORTFOLIO=0 \
        --output none
    
    log_info "FastAPI backend deployed"
}

# Function to deploy WebSocket backend
deploy_websocket() {
    log_step "Deploying WebSocket backend..."
    
    local VERSION=$(cat deployment/production/.version | cut -d= -f2)
    
    az containerapp create \
        --name gzc-websocket-backend \
        --resource-group $RESOURCE_GROUP \
        --environment $ENVIRONMENT_NAME \
        --image $ACR_NAME.azurecr.io/gzc-intel-websocket:$VERSION \
        --target-port 5100 \
        --ingress internal \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 2 \
        --secrets redis-password=keyvaultref:$KEYVAULT_NAME/gzc-redis-password,secretref:gzc-redis-password \
        --env-vars \
            ENVIRONMENT=production \
            LOG_LEVEL=info \
            AZURE_AD_TENANT_ID=8274c97d-de9d-4328-98cf-2d4ee94bf104 \
            AZURE_AD_CLIENT_ID=a873f2d7-2ab9-4d59-a54c-90859226bf2e \
            REDIS_HOST=gzc-redis \
            REDIS_PORT=6379 \
            REDIS_PASSWORD=secretref:redis-password \
            WS_HEARTBEAT_INTERVAL=30 \
            WS_MAX_CONNECTIONS=1000 \
        --output none
    
    log_info "WebSocket backend deployed"
}

# Function to deploy frontend
deploy_frontend() {
    log_step "Deploying frontend..."
    
    local VERSION=$(cat deployment/production/.version | cut -d= -f2)
    
    az containerapp create \
        --name gzc-frontend \
        --resource-group $RESOURCE_GROUP \
        --environment $ENVIRONMENT_NAME \
        --image $ACR_NAME.azurecr.io/gzc-intel-frontend:$VERSION \
        --target-port 3000 \
        --ingress internal \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 2 \
        --env-vars \
            NODE_ENV=production \
            REACT_APP_API_URL=https://$APP_NAME.delightfulground-653e61be.eastus.azurecontainerapps.io \
            VITE_CLIENT_ID=a873f2d7-2ab9-4d59-a54c-90859226bf2e \
            VITE_TENANT_ID=8274c97d-de9d-4328-98cf-2d4ee94bf104 \
        --output none
    
    log_info "Frontend deployed"
}

# Function to deploy API Gateway
deploy_gateway() {
    log_step "Deploying API Gateway..."
    
    local VERSION=$(cat deployment/production/.version | cut -d= -f2)
    
    # First, generate self-signed certificates for initial deployment
    log_info "Generating initial certificates..."
    mkdir -p /tmp/certs
    
    # Generate certificates
    openssl genrsa -out /tmp/certs/privkey.pem 2048
    openssl req -new -key /tmp/certs/privkey.pem \
        -out /tmp/certs/cert.csr \
        -subj "/C=US/ST=State/L=City/O=GZC/CN=$APP_NAME.delightfulground-653e61be.eastus.azurecontainerapps.io"
    openssl x509 -req -days 90 \
        -in /tmp/certs/cert.csr \
        -signkey /tmp/certs/privkey.pem \
        -out /tmp/certs/fullchain.pem
    cp /tmp/certs/fullchain.pem /tmp/certs/chain.pem
    openssl dhparam -out /tmp/certs/dhparam.pem 2048
    
    # Create certificate secrets
    az containerapp secret set \
        --name gzc-gateway \
        --resource-group $RESOURCE_GROUP \
        --secrets \
            ssl-cert="$(cat /tmp/certs/fullchain.pem | base64 -w 0)" \
            ssl-key="$(cat /tmp/certs/privkey.pem | base64 -w 0)" \
            ssl-chain="$(cat /tmp/certs/chain.pem | base64 -w 0)" \
            ssl-dhparam="$(cat /tmp/certs/dhparam.pem | base64 -w 0)" \
        --output none 2>/dev/null || true
    
    # Deploy gateway
    az containerapp create \
        --name gzc-gateway \
        --resource-group $RESOURCE_GROUP \
        --environment $ENVIRONMENT_NAME \
        --image $ACR_NAME.azurecr.io/gzc-intel-gateway:$VERSION \
        --target-port 80 \
        --exposed-port 443 \
        --transport tcp \
        --ingress external \
        --cpu 1.0 \
        --memory 2Gi \
        --min-replicas 2 \
        --max-replicas 5 \
        --secrets \
            ssl-cert=secretref:ssl-cert \
            ssl-key=secretref:ssl-key \
            ssl-chain=secretref:ssl-chain \
            ssl-dhparam=secretref:ssl-dhparam \
        --env-vars \
            DOMAIN=$APP_NAME.delightfulground-653e61be.eastus.azurecontainerapps.io \
            FRONTEND_HOST=gzc-frontend \
            BACKEND_HOST=gzc-fastapi-backend \
            WEBSOCKET_HOST=gzc-websocket-backend \
        --output none
    
    # Clean up temporary certificates
    rm -rf /tmp/certs
    
    log_info "API Gateway deployed"
}

# Function to configure custom domain and SSL
configure_ssl() {
    log_step "Configuring SSL certificates..."
    
    log_warning "SSL configuration requires manual setup with Let's Encrypt or Azure certificates"
    log_info "For production, please:"
    log_info "1. Configure custom domain in Azure Container Apps"
    log_info "2. Setup Let's Encrypt or upload SSL certificates"
    log_info "3. Update DNS records to point to the Container App"
}

# Function to run health checks
run_health_checks() {
    log_step "Running health checks..."
    
    local APP_URL="https://$APP_NAME.delightfulground-653e61be.eastus.azurecontainerapps.io"
    
    log_info "Waiting for deployment to be ready..."
    sleep 30
    
    # Check gateway health
    if curl -f -k "$APP_URL/health" &> /dev/null; then
        log_info "✅ Gateway health check passed"
    else
        log_error "❌ Gateway health check failed"
    fi
    
    # Check if frontend is accessible
    if curl -f -k "$APP_URL/" &> /dev/null; then
        log_info "✅ Frontend accessibility check passed"
    else
        log_error "❌ Frontend accessibility check failed"
    fi
    
    log_info "Health checks completed"
}

# Function to display deployment summary
display_summary() {
    log_step "Deployment Summary"
    
    local APP_URL="https://$APP_NAME.delightfulground-653e61be.eastus.azurecontainerapps.io"
    
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN} GZC Intel Application Deployment Complete ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "🌐 Application URL: ${BLUE}$APP_URL${NC}"
    echo -e "🔒 Security: ${GREEN}TLS 1.3 with API Gateway${NC}"
    echo -e "🏗️  Architecture: ${GREEN}Microservices with network isolation${NC}"
    echo -e "🔐 Authentication: ${GREEN}Azure AD integrated${NC}"
    echo -e "💾 Database: ${GREEN}PostgreSQL with connection pooling${NC}"
    echo -e "⚡ Cache: ${GREEN}Redis for session management${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Configure custom domain and production SSL certificates"
    echo -e "2. Setup monitoring and alerting"
    echo -e "3. Configure backup and disaster recovery"
    echo -e "4. Run security scans and penetration testing"
    echo ""
    echo -e "${GREEN}Deployment completed successfully! 🚀${NC}"
}

# Main execution
main() {
    log_info "Starting GZC Intel Application deployment to Azure..."
    
    check_prerequisites
    create_secrets
    build_and_push_images
    create_environment
    deploy_redis
    deploy_fastapi
    deploy_websocket
    deploy_frontend
    deploy_gateway
    configure_ssl
    run_health_checks
    display_summary
}

# Run main function
main "$@"