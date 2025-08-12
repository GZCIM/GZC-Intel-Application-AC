# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GZC Intel Application - Production-grade application with secure gateway architecture and Azure cloud services integration.

## What This Is

Production application with enterprise security architecture:
- **Frontend**: React application with Tools menu and user memory persistence
- **FSS Backend**: FXSpotStream WebSocket service for trading infrastructure
- **Security Gateway**: Nginx with TLS 1.3, Azure AD auth, rate limiting
- **Database**: PostgreSQL (gzc_intel) for user preferences and memory
- **Cache**: Azure Redis for real-time data and session management
- **Deployment**: Azure Container Apps with managed identities

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

### Production (Azure)
- **FSS Service**: https://fxspotstream.delightfulground-653e61be.eastus.azurecontainerapps.io
- **WebSocket Endpoints**: 
  - ESP: `wss://fxspotstream.delightfulground-653e61be.eastus.azurecontainerapps.io/ws_esp`
  - RFS: `wss://fxspotstream.delightfulground-653e61be.eastus.azurecontainerapps.io/ws_rfs`
  - Execution: `wss://fxspotstream.delightfulground-653e61be.eastus.azurecontainerapps.io/ws_execution`
- **Health Check**: `GET /health` and `GET /api/preferences/health`

### Local Development
- Frontend: http://localhost:3500
- Backend API: http://localhost:5100
- WebSocket endpoints: /ws_esp, /ws_rfs, /ws_execution

## Important Notes

1. This is production code - handle with care
2. The frontend is a compiled build, not source code
3. Backend requires Redis for real-time quotes
4. All previous attempts and broken code are in `old-code-backup/`

## Latest Deployment - v20250809-143545

**Component Modal Fix Successfully Deployed**
- Fixed AnimatePresence implementation for proper modal visibility
- Users can now add multiple components to tabs via Tools → Add Component
- All 4 components from ComponentInventory are accessible
- See `/journal/2025-01-09/modal-visibility-fix.md` for full details

## Deployment

**CRITICAL: Use the correct container app name!**
- Production App: `gzc-intel-application-ac` (NOT gzc-intel-app)
- URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

## User Memory Persistence Architecture

### Database Schema (PostgreSQL - gzc_intel)
- **user_preferences**: User settings, tab configurations, layouts
- **user_sessions**: Cross-browser tab synchronization state
- **component_memory**: Per-component state persistence

### Redis Cache Strategy  
- **Session Store**: Real-time user state (Redis DB 1)
- **Component Cache**: Frequently accessed component data
- **WebSocket State**: Active connection management

### FSS Integration
- **Preferences API**: `/api/preferences/*` - User settings management
- **Health Monitoring**: Database and Redis connectivity validation
- **Authentication**: Azure AD token validation (dev mode available)

## Deployment (Updated 2025-08-11)

### GitHub Actions CI/CD (RECOMMENDED - 5 minutes)
```bash
# Just push your code!
git push origin component-state-refactor

# Watch deployment at:
# https://github.com/GZCIM/GZC-Intel-Application-AC/actions
```

### Manual Docker Deployment (Legacy - 7+ minutes)
```bash
# Build new image (use --no-cache when fixing issues)
docker build --no-cache -t gzcacr.azurecr.io/gzc-intel-app:latest --platform linux/amd64 .

# Push to ACR
az acr login --name gzcacr
docker push gzcacr.azurecr.io/gzc-intel-app:latest

# Update Container App (USE CORRECT NAME!)
az containerapp update --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:latest
```

**NEW: GitHub Actions is configured and working! See `/docs/GITHUB_ACTIONS_DEPLOYMENT.md` for details.**

**Common Deployment Issues:**
1. Wrong app name - Always use `gzc-intel-application-ac`
2. Docker cache - Use `--no-cache` when fixes aren't working
3. Browser cache - Force refresh with Ctrl+Shift+R
4. Database missing - Create with `az postgres flexible-server db create`