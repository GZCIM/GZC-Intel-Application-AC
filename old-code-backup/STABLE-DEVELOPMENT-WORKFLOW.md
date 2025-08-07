# Stable Development Workflow - GZC Intel Application

## Source Code Repositories (REAL)

1. **Backend**: https://github.com/GZCIM/portfolio_agregator/tree/alex_integration/back_end
2. **Frontend**: https://github.com/GZCIM/gzc-intel-app (main branch)  
3. **FXSpotStream**: https://github.com/GZCIM/FXSpotStream/tree/alex_new

## Local Development Setup

```bash
# 1. Clone all source repositories
cd source-repos/
git clone -b alex_integration https://github.com/GZCIM/portfolio_agregator.git
git clone -b alex_new https://github.com/GZCIM/FXSpotStream.git  
git clone https://github.com/GZCIM/gzc-intel-app.git

# 2. Start Backend
cd portfolio_agregator/back_end/
poetry install
poetry run python run.py

# 3. Start Frontend  
cd ../../gzc-intel-app/
npm install
npm run dev
```

## Adding Bloomberg Volatility Component

### Step 1: Add Component to Frontend
```bash
cd source-repos/gzc-intel-app/src/components/
# Copy Bloomberg component files here
# Update ComponentInventory.ts
# Update enhancedComponentRegistry.ts
```

### Step 2: Build and Test
```bash
cd source-repos/gzc-intel-app/
npm run build
npm run preview  # Test production build
```

### Step 3: Build Docker Image
```bash
# Create multi-stage Dockerfile that:
# 1. Builds frontend (npm run build)
# 2. Copies backend source
# 3. Sets up nginx + python
# 4. Copies built assets to /var/www/html/

docker build -t gzc-intel-app:bloomberg-integration .
```

### Step 4: Deploy to Azure
```bash
# Tag and push to Azure Container Registry
docker tag gzc-intel-app:bloomberg-integration gzcacr.azurecr.io/gzc-intel-app:bloomberg-integration
az acr login --name gzcacr
docker push gzcacr.azurecr.io/gzc-intel-app:bloomberg-integration

# Update Azure Container App
az containerapp update \
  --name gzc-intel-app \
  --resource-group your-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:bloomberg-integration
```

## Benefits of This Workflow

✅ **Stable source code** from actual repositories
✅ **Proper build pipeline** (not runtime modifications)  
✅ **Version control** for all changes
✅ **Reproducible deployments** 
✅ **Clean separation** of concerns
✅ **No more confusion** about which version is which

## Next Steps

1. Set up local development with real source code
2. Add Bloomberg component to frontend source
3. Test locally 
4. Build Docker image
5. Deploy to Azure

This workflow ensures we never lose changes and always have a clean build process.