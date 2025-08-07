# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL - READ FIRST ⚠️
**DO NOT MODIFY THE FRONTEND SUBMODULE** - It was broken by another agent but the production container works perfectly. We are running the exact Azure production container locally. See CURRENT-STATE.md for details.

## Project Overview

GZC Intel Application AC - Multi-repo structure for the GZC Intel financial application with real-time FX trading capabilities.

## Current Working State
- Running production container `gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix`
- Access at http://localhost:3500
- Backend: Flask with Socket.IO on port 5100
- Features: WebSockets, Redis quotes, FIX protocol connections

## Repository Structure
```
GZC Intel Application AC/
├── fx-websocket-backend/     # Flask backend (source code)
├── gzc-intel-frontend/       # React frontend (submodule - DO NOT MODIFY)
├── run-azure-replica.sh      # Run production container
├── docker-compose.prod-replica.yml
└── CURRENT-STATE.md         # Current state documentation
```

## How to Run
```bash
# Use the production container (recommended)
REDIS_PASSWORD="[PRODUCTION_PASSWORD_FROM_AZURE_KEYVAULT]" ./run-azure-replica.sh
```

## Important Notes
1. The frontend submodule is broken but the production container has everything working
2. Do NOT attempt to "fix" the submodule - use the container
3. Redis password is in fx-websocket-backend/.env
4. This runs the EXACT same code as https://gzc-intel-app.agreeablepond-1a74a92d.eastus.azurecontainerapps.io