# Current Status - GZC Intel Application AC

## Two Different Versions Running

### 1. Local Development (Broken Frontend)
- **URL**: http://localhost:3500 (when running `npm run dev`)
- **Status**: BROKEN - wrong version overwritten by another agent
- **Features**:
  - ✅ Bloomberg Volatility component integrated
  - ❌ Missing Tools tab
  - ❌ Broken WebSocket connections
  - ❌ Missing production features

### 2. Production Container
- **URL**: http://localhost:3500 (when running Docker container)
- **Image**: `gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix`
- **Status**: WORKING - exact copy from Azure
- **Features**:
  - ✅ Tools tab present
  - ✅ Working WebSocket connections
  - ✅ Live FX quotes from Redis
  - ❌ Missing Bloomberg Volatility component

## Next Steps

1. Extract working frontend from production container
2. Add Bloomberg Volatility component to extracted code
3. Build new Docker image with both features
4. Deploy to Azure

## Commands

```bash
# Run production container (WORKING)
REDIS_PASSWORD="[PRODUCTION_PASSWORD_FROM_AZURE_KEYVAULT]=" ./run-azure-replica.sh

# Run local development (BROKEN but has Bloomberg component)
cd gzc-intel-frontend && npm run dev
```