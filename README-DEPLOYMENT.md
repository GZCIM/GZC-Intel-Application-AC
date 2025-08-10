# 🚀 GZC Intel Application AC - Deployment Guide

## FLUENT DEPLOYMENT - ONE COMMAND

### Production Deployment
```bash
./scripts/deploy.sh
```
This handles EVERYTHING:
- ✅ Frontend build
- ✅ Docker image build  
- ✅ Push to Azure Container Registry
- ✅ Deploy to Azure Container Apps
- ✅ Health verification
- ✅ Status reporting

### Development Deployment (Fast)
```bash
./scripts/dev-deploy.sh
```
For quick iterations - uses Docker cache and skips checks.

### Check Status
```bash
./scripts/deployment-status.sh
```
Shows current state of all deployments.

### Emergency Rollback
```bash
./scripts/rollback.sh <revision-name>
```

## 🎯 SINGLE SOURCE OF TRUTH

**Production App:** `gzc-intel-application-ac`
**Production URL:** https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
**Container Registry:** `gzcacr.azurecr.io/gzc-intel-app`

## 🔧 What Was Fixed

### Before (CHAOS):
- ❌ Multiple apps with similar names
- ❌ Scripts targeting wrong apps
- ❌ Inconsistent image tags
- ❌ No deployment visibility
- ❌ Hours debugging wrong resources

### After (FLUENT):
- ✅ Single production app
- ✅ All scripts use correct target
- ✅ Automated health verification
- ✅ Clear status reporting
- ✅ Emergency rollback capability

## 📋 Quick Commands

```bash
# Deploy new version
./scripts/deploy.sh v2.0.1

# Check what's running
./scripts/deployment-status.sh

# Quick dev deployment  
./scripts/dev-deploy.sh

# Emergency rollback
./scripts/rollback.sh gzc-intel-application-ac--0000064

# View logs
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg
```

## 🚨 OLD SCRIPTS (DEPRECATED)

These are now INCONSISTENT and should NOT be used:
- ~~`Main_Frontend/quick-deploy.sh`~~ (fixed but use `./scripts/deploy.sh` instead)
- ~~`Main_Frontend/deploy-with-env.sh`~~ (fixed but use `./scripts/deploy.sh` instead)
- ~~`build-and-deploy.sh`~~ (creates new apps instead of updating)

## ⚡ Emergency Procedures

### If Deployment Fails:
```bash
# 1. Check status
./scripts/deployment-status.sh

# 2. View logs  
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg

# 3. Rollback if needed
./scripts/rollback.sh <previous-working-revision>
```

### If Site is Down:
```bash
# Check Azure status
az containerapp show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --query "properties.provisioningState"

# Restart if needed
az containerapp revision restart --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg
```

## 🎉 Success Metrics

A fluent deployment should:
1. ⏱️  Complete in under 5 minutes
2. ✅ Show clear success/failure status
3. 🔍 Provide immediate verification
4. 🆘 Offer rollback if needed
5. 📊 Give visibility into what's running

---
**Updated:** 2025-01-10  
**Status:** Production Ready ✅