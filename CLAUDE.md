# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GZC Intel Application - Production copy extracted from Azure Container Registry (`gzcacr.azurecr.io/gzc-intel-app:latest`)

## What This Is

This is the EXACT production application running in Azure, including:
- Frontend with the Tools menu (that was missing from GitHub repos)
- FXSpotStream backend with WebSocket support
- Nginx configuration for proper routing
- All production configurations

## Directory Structure
```
.
├── frontend/              # Production frontend build (with Tools menu!)
├── app/
│   └── backend/          # FXSpotStream Flask backend
├── nginx-config/         # Production nginx configuration
├── supervisor-config/    # Process management
├── docker-compose.yml    # Docker setup for local development
├── start-local.sh        # Docker-based startup script
├── start-simple.sh       # Simple Python-based startup
└── old-code-backup/      # Previous code moved here for reference
```

## How to Run

### Quick Start (No Docker)
```bash
./start-simple.sh
```

### Full Setup (With Docker)
```bash
export REDIS_PASSWORD="[from Azure Key Vault or app/backend/.env]"
./start-local.sh
```

## Access Points
- Frontend: http://localhost:3500 (with Tools menu!)
- Backend API: http://localhost:5100
- WebSocket endpoints: /ws_esp, /ws_rfs, /ws_execution

## Important Notes

1. This is production code - handle with care
2. The frontend is a compiled build, not source code
3. Backend requires Redis for real-time quotes
4. All previous attempts and broken code are in `old-code-backup/`

## Deployment

To deploy changes:
```bash
# Build new image
docker build -t gzcacr.azurecr.io/gzc-intel-app:new-version .

# Push to ACR
az acr login --name gzcacr
docker push gzcacr.azurecr.io/gzc-intel-app:new-version

# Update Container App
az containerapp update --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:new-version
```