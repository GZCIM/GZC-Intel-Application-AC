#!/bin/bash

echo "Testing Azure AD authentication fix locally..."

# Build and run the Main_Gateway locally to test the fix
cd Main_Gateway/backend

# Install dependencies if needed
pip install -r requirements.txt

# Set environment variables
export AZURE_AD_TENANT_ID="8274c97d-de9d-4328-98cf-2d4ee94bf104"
export AZURE_AD_CLIENT_ID="a873f2d7-2ab9-4d59-a54c-90859226bf2e"
export COSMOS_ENDPOINT="https://cosmos-research-analytics-prod.documents.azure.com:443/"
export KEY_VAULT_URL="https://gzc-finma-keyvault.vault.azure.net/"

# Run the backend locally
echo "Starting Main_Gateway on port 5000..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload