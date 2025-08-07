# TLS Certificates Required for FIX Protocol Connection

## Issue
The WebSocket shows as "CONNECTED" but no market data is flowing because the FIX protocol connection to `fixapi-nysim1.fxspotstream.com` requires TLS certificates that are not included in the container.

## Required Files
Based on the production environment configuration, the following certificate files are needed:
- `cert_production_alex@gzcim.com.pem`
- `key_production_alex@gzcim.com.pem`

## Current Status
- ✅ WebSocket connection between frontend and Flask backend is working
- ✅ Flask backend is running on port 5100
- ✅ All FIX protocol credentials are configured
- ❌ TLS certificates are missing from the container
- ❌ FIX connection fails due to missing certificates

## Solution
1. Copy the certificate files to: `/Users/mikaeleage/GZC Intel Workspace/projects/gzcim-apps/gzc-intel-app/backend-source/`
2. Rebuild the container: `az acr build --registry gzcacr --image gzc-intel-app:with-certs -f Dockerfile.unified .`
3. Deploy: `az containerapp update --name gzc-intel-app --resource-group gzc-kubernetes-rg --image gzcacr.azurecr.io/gzc-intel-app:with-certs`

## Alternative Solutions
1. Store certificates in Azure Key Vault and mount as volume
2. Use Azure Container Apps secrets to store certificate content
3. Create a separate secure certificate management service

## Note
The code has been updated to use environment variables for certificate paths:
- `FIX_TLS_CERT` (defaults to `cert_production_alex@gzcim.com.pem`)
- `FIX_TLS_KEY` (defaults to `key_production_alex@gzcim.com.pem`)