# GZC Intel Application AC

Financial intelligence dashboard with Bloomberg Terminal integration, drag-and-drop components, real-time FX volatility surfaces, and portfolio management.

## Quick Start

```bash
# Local development
cd Main_Frontend
npm install
npm run dev

# Deploy to Azure
docker build --no-cache -t gzcacr.azurecr.io/gzc-intel-app:latest --platform linux/amd64 .
docker push gzcacr.azurecr.io/gzc-intel-app:latest
az containerapp update --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:latest
```

**Production URL**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

## Architecture

```
Main_Frontend/          # React frontend with drag-drop grid
├── src/
│   ├── components/
│   │   ├── canvas/     # Grid layout system
│   │   ├── gzc-portfolio/  # Portfolio component
│   │   └── bloomberg-volatility/  # FX volatility surfaces
│   └── core/
│       └── components/ # Component inventory & constraints
│
FSS_Socket/backend/     # Flask WebSocket backend
├── app/
└── requirements.txt
│
K8s Bloomberg Gateway/  # Kubernetes-deployed Bloomberg proxy
├── Deployment: bloomberg-gateway (52.149.235.82)
└── Endpoints: /api/bloomberg/reference, /api/volatility-surface
```

## Key Features

- **Bloomberg Terminal Integration**: Real-time FX volatility surfaces with ATM, risk reversals, and butterflies
- **Dynamic Canvas**: Drag-and-drop component grid with size constraints
- **Portfolio Management**: Real-time FX trades and positions
- **K8s Bloomberg Gateway**: Secure proxy for Bloomberg Terminal data (no mixed content issues)
- **Theme System**: Dark/light themes with CSS variables
- **WebSocket Data**: Real-time market data streams

## Development Journal

See `/journal/` for daily progress and decisions:
- `/journal/2025-01-08/` - Grid resize fixes, deployment issues

## Core Systems

### Bloomberg Terminal Integration
- **Volatility Surface Component**: Professional FX options visualization
  - Supported pairs: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF, USDCAD, NZDUSD
  - Tenors: ON, 1W, 2W, 1M, 2M, 3M, 6M, 9M, 1Y, 18M, 2Y
  - Data: ATM volatility, risk reversals (5D-35D), butterflies
- **K8s Gateway**: Centralized Bloomberg data proxy
  - LoadBalancer: 52.149.235.82
  - Redis caching with 15-minute TTL
  - Endpoints: `/api/bloomberg/reference`, `/api/volatility-surface/{pair}`
- **Bloomberg VM**: Direct Terminal connection (20.172.249.92:8080)

### Component Grid Layout
- 12-column responsive grid
- Min/max size constraints per component
- Edit mode for arrangement
- Persistence via localStorage

### Authentication
- Azure MSAL integration
- PostgreSQL for user preferences
- Redis for session management

### Deployment Pipeline
- Docker multi-stage build
- Azure Container Apps hosting
- Nginx static serving + Flask API

## Common Tasks

### Add Bloomberg Volatility Component
1. Navigate to Tools → Add Component
2. Select "Bloomberg Volatility Analysis" from Visualization category
3. Drag to resize, displays real-time FX volatility surfaces
4. Data flows through K8s gateway (no direct Bloomberg VM access)

### Fix Component Not Resizing
Check `DynamicCanvas.tsx` data-grid attributes - must include minW/minH/maxW/maxH

### Deployment Not Updating
1. Use `docker build --no-cache`
2. Verify correct app: `gzc-intel-application-ac`
3. Clear browser cache (Ctrl+Shift+R)

### Database Connection Failed
```bash
az postgres flexible-server db create \
  --resource-group AEWS \
  --server-name gzcdevserver \
  --database-name gzc_intel
```

## Environment Variables

Required for backend:
- `POSTGRES_PASSWORD` - PostgreSQL password
- `REDIS_URL` - Redis connection string
- `AZURE_CLIENT_ID` - MSAL authentication

## Testing

```bash
# Frontend tests
cd Main_Frontend
npm test

# Check deployment
curl https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io/health
```

## Documentation

- [Bloomberg Integration Guide](docs/BLOOMBERG_INTEGRATION.md) - Complete Bloomberg Terminal integration documentation
- [CLAUDE.md](CLAUDE.md) - AI assistance context and project guidelines

---

### Option 1: Docker Compose (Recommended)
```bash
# Set Redis password (get from Azure Key Vault or backend/.env)
export REDIS_PASSWORD="your-redis-password"

# Start everything
./start-local.sh
```

### Option 2: Simple Python Server
```bash
# For quick testing without Docker
./start-simple.sh
```

## Access Points

- Frontend: http://localhost:3500
- Backend API: http://localhost:5100
- WebSocket endpoints: /ws_esp, /ws_rfs, /ws_execution

## Directory Structure
```
gzc-intel-production-copy/
├── frontend/              # Production frontend build
│   ├── assets/           # Compiled JS/CSS with Tools menu
│   └── index.html        # Entry point
├── app/
│   └── backend/          # FXSpotStream backend
├── nginx-config/         # Nginx routing configuration
├── supervisor-config/    # Process management
├── docker-compose.yml    # Docker setup
├── start-local.sh        # Docker starter script
└── start-simple.sh       # Non-Docker starter script
```

## Important Notes

1. This is the EXACT production code from `gzcacr.azurecr.io/gzc-intel-app:latest`
2. The frontend includes the Tools menu that was missing from the GitHub repos
3. Backend requires Redis connection for real-time quotes
4. WebSocket proxying only works with Docker/nginx setup

## Deployment

To deploy a new version:
1. Make your changes
2. Build new Docker image
3. Push to ACR
4. Update Container App in Azure

```bash
# Build
docker build -t gzcacr.azurecr.io/gzc-intel-app:new-version .

# Push
docker push gzcacr.azurecr.io/gzc-intel-app:new-version

# Update in Azure
az containerapp update --name gzc-intel-app --image gzcacr.azurecr.io/gzc-intel-app:new-version
```