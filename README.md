# GZC Intel App - Production Copy

This is an exact copy of the production application extracted from Azure Container Registry.

## What's Included

- **Frontend**: Production build with the Tools menu (from `/var/www/html`)
- **Backend**: FXSpotStream Flask application (from `/app/backend`)
- **Nginx Config**: Production routing configuration
- **Supervisor Config**: Process management configuration

## Quick Start

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