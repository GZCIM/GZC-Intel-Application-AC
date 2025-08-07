# Deployment Workflow

## Development → Docker → Azure Pattern

### 1. Local Development
```bash
# Stop production container first
docker stop gzc-production

# Frontend development
cd gzc-intel-frontend
npm install
npm run dev  # Runs on http://localhost:3500

# Backend development (in another terminal)
cd fx-websocket-backend
python3 run.py  # Runs on http://localhost:5100
```

### 2. Test with Docker Locally
```bash
# Build new Docker image with your changes
docker build -t gzc-intel-app:test .

# Run locally to test
docker run -d \
  --name gzc-test \
  -p 3500:3500 \
  -p 5100:5100 \
  -e REDIS_PASSWORD="[PRODUCTION_PASSWORD_FROM_AZURE_KEYVAULT]=" \
  gzc-intel-app:test

# Test at http://localhost:3500
# Check logs: docker logs gzc-test
```

### 3. Deploy to Azure
```bash
# Tag for Azure Container Registry
docker tag gzc-intel-app:test gzcacr.azurecr.io/gzc-intel-app:v1.1

# Login to Azure Container Registry
az acr login --name gzcacr

# Push to registry
docker push gzcacr.azurecr.io/gzc-intel-app:v1.1

# Update Azure Container App
az containerapp update \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:v1.1

# Verify deployment
az containerapp show \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --query "properties.latestRevisionFqdn" -o tsv
```

## Quick Commands

### Build Docker Image
```bash
# From project root
docker build -f deployment/Dockerfile -t gzc-intel-app:latest .
```

### Common Issues
1. **Port conflicts**: Stop existing containers first
2. **Redis connection**: Ensure REDIS_PASSWORD is set
3. **FIX connection**: Works in Azure (NAT gateway) or whitelisted IPs

## Rollback if Needed
```bash
# List revisions
az containerapp revision list \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg -o table

# Activate previous revision
az containerapp revision activate \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --revision <previous-revision-name>
```