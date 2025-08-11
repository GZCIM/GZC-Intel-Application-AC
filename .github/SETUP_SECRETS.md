# GitHub Actions Secrets Setup

## Required Secrets for Deployment

Add these secrets to your repository at: Settings → Secrets and variables → Actions

### 1. AZURE_CREDENTIALS
Azure service principal for authentication.
```bash
# Create service principal if you don't have one:
az ad sp create-for-rbac --name "gzc-intel-github-actions" \
  --role contributor \
  --scopes /subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg \
  --sdk-auth
```
Copy the entire JSON output as the secret value.

### 2. ACR_USERNAME
Username for Azure Container Registry.
```bash
az acr credential show --name gzcacr --query username -o tsv
```

### 3. ACR_PASSWORD  
Password for Azure Container Registry.
```bash
az acr credential show --name gzcacr --query passwords[0].value -o tsv
```

### 4. VITE_APPLICATIONINSIGHTS_CONNECTION_STRING
Application Insights connection string for telemetry.
```
InstrumentationKey=068ac725-7cac-4272-8392-16ad8f1f3d9b;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=db6b4c43-b80a-43b4-89eb-f617082eb000
```

## Verify Secrets
After adding all secrets, you should see 4 secrets in your repository settings:
- AZURE_CREDENTIALS
- ACR_USERNAME
- ACR_PASSWORD
- VITE_APPLICATIONINSIGHTS_CONNECTION_STRING

## Test the Workflow
1. Commit and push changes to the `main` or `component-state-refactor` branch
2. Or manually trigger from Actions tab → Deploy to Azure Container Apps → Run workflow

## What the Workflow Does
1. Builds the frontend with Application Insights integration
2. Creates a Docker image with versioned tag
3. Pushes to Azure Container Registry
4. Deploys to Azure Container Apps
5. Shows deployment summary with version and URL