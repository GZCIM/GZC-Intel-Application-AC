# GitHub Actions CI/CD Deployment

## Overview
The GZC Intel Application now uses GitHub Actions for automated CI/CD deployment to Azure Container Apps. This replaces the manual Docker build/push/deploy process, reducing deployment time from 7+ minutes to ~5 minutes.

## How It Works

### Automatic Deployment
Every push to the following branches triggers automatic deployment:
- `main` 
- `component-state-refactor`

### Manual Deployment
You can also trigger deployment manually from GitHub:
1. Go to [Actions tab](https://github.com/GZCIM/GZC-Intel-Application-AC/actions)
2. Select "Deploy to Azure Container Apps"
3. Click "Run workflow"

## Deployment Process

### Step-by-Step Flow
1. **Code Push** → GitHub detects changes
2. **Node.js Build** → Builds frontend with Vite (~1 min)
3. **Docker Build** → Creates container image (~2 min)
4. **Push to ACR** → Uploads to Azure Container Registry (~1 min)
5. **Deploy** → Updates Azure Container Apps (~1.5 min)

**Total Time: ~5 minutes**

## Configuration

### GitHub Secrets (Required)
The following secrets are configured in the repository:

| Secret Name | Description | Location |
|------------|-------------|----------|
| `AZURE_CREDENTIALS` | Service principal JSON | Settings → Secrets → Actions |
| `ACR_USERNAME` | Azure Container Registry username | Settings → Secrets → Actions |
| `ACR_PASSWORD` | Azure Container Registry password | Settings → Secrets → Actions |

### Service Principal
- **Name**: `gzc-intel-github-actions`
- **Role**: Contributor
- **Scope**: `/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg`

### Container Registry
- **Registry**: `gzcacr.azurecr.io`
- **Container App**: `gzc-intel-application-ac`
- **Resource Group**: `gzc-kubernetes-rg`

## Workflow File

Location: `.github/workflows/deploy.yml`

Key features:
- Builds from source code
- Uses Microsoft Container Registry base images (avoids Docker Hub rate limits)
- Tagged with timestamp for versioning
- Automatic deployment to Azure Container Apps

## Monitoring

### View Deployments
- **GitHub Actions**: https://github.com/GZCIM/GZC-Intel-Application-AC/actions
- **Live App**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

### Check Status from Terminal
```bash
# List recent runs
gh run list --repo GZCIM/GZC-Intel-Application-AC

# View specific run
gh run view <RUN_ID> --repo GZCIM/GZC-Intel-Application-AC

# View logs
gh run view --log --repo GZCIM/GZC-Intel-Application-AC
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failed
**Error**: `Not all values are present. Ensure 'client-id' and 'tenant-id' are supplied`
**Solution**: Check `AZURE_CREDENTIALS` secret is properly formatted JSON

#### 2. Docker Hub Rate Limit
**Error**: `429 Too Many Requests`
**Solution**: Already fixed - using Microsoft Container Registry base images

#### 3. ACR Authentication Failed
**Error**: `unauthorized: authentication required`
**Solution**: Verify `ACR_USERNAME` and `ACR_PASSWORD` secrets

## Quick Commands

### Deploy Now
```bash
# Push to trigger deployment
git push origin component-state-refactor
```

### Re-run Failed Deployment
```bash
gh run rerun <RUN_ID> --repo GZCIM/GZC-Intel-Application-AC
```

### Update Service Principal
```bash
az ad sp create-for-rbac --name "gzc-intel-github-actions" \
  --role contributor \
  --scopes /subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg \
  --json-auth
```

## Migration from Docker Commands

### Old Process (Manual - 7+ minutes)
```bash
docker build -t gzcacr.azurecr.io/gzc-intel-app:latest .
docker push gzcacr.azurecr.io/gzc-intel-app:latest
az containerapp update --name gzc-intel-application-ac ...
```

### New Process (Automatic - 5 minutes)
```bash
git push origin component-state-refactor
# That's it! Watch at: https://github.com/GZCIM/GZC-Intel-Application-AC/actions
```

## Benefits

1. **Speed**: 30% faster deployments
2. **Automation**: No manual commands needed
3. **Reliability**: Consistent process every time
4. **Visibility**: Clear logs and status in GitHub
5. **Versioning**: Automatic timestamp tagging
6. **Parallel**: Multiple deployments can run simultaneously

---

Last Updated: 2025-08-11
Deployment Method: GitHub Actions CI/CD
Average Deployment Time: 5 minutes