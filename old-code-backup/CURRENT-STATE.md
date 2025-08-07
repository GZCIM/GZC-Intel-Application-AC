# CURRENT STATE - DO NOT MODIFY WITHOUT ASKING

Last updated: 2025-08-06 21:28

## What's Running
- **Production Container**: `gzc-production` running on ports 3500 (frontend) and 5100 (backend)
- **Image**: `gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix`
- **Access**: http://localhost:3500
- **Features**: WebSockets ✓, Redis quotes ✓, FIX connections ✓

## How to Run
```bash
cd "/Users/mikaeleage/Projects Container/GZC Intel Application AC"
REDIS_PASSWORD="[PRODUCTION_PASSWORD_FROM_AZURE_KEYVAULT]" ./run-azure-replica.sh
```

## Repository Structure
- `fx-websocket-backend/` - Flask backend with FIX connections (source code)
- `gzc-intel-frontend/` - Frontend (submodule currently broken, but production container works)
- `run-azure-replica.sh` - Script to run production container
- `.env` file in backend has Redis password

## GitHub
- Repository: https://github.com/GZCIM/GZC-Intel-Application-AC
- Current commit: 572d89d (working version)

## DO NOT
- Touch the frontend submodule (it's broken but container works)
- Change any configurations
- Try to "fix" anything without explicit request

## Production URL
https://gzc-intel-app.agreeablepond-1a74a92d.eastus.azurecontainerapps.io

This is the EXACT same code running locally via Docker container.