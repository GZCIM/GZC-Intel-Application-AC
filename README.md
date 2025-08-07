# GZC Intel Application AC

Financial intelligence dashboard with drag-and-drop components, real-time data visualization, and portfolio management.

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
│   │   └── gzc-portfolio/  # Portfolio component
│   └── core/
│       └── components/ # Component inventory & constraints
│
FSS_Socket/backend/     # Flask WebSocket backend
├── app/
└── requirements.txt
```

## Key Features

- **Dynamic Canvas**: Drag-and-drop component grid with size constraints
- **Portfolio Management**: Real-time FX trades and positions
- **Theme System**: Dark/light themes with CSS variables
- **WebSocket Data**: Real-time market data streams

## Development Journal

See `/journal/` for daily progress and decisions:
- `/journal/2025-01-08/` - Grid resize fixes, deployment issues

## Core Systems

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

---
For AI assistance context, see `CLAUDE.md`

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