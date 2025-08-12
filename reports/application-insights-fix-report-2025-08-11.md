# Application Insights Fix Report - 2025-08-11

## Executive Summary
**STATUS: ✅ RESOLVED** - Application Insights telemetry is now working correctly on Azure Container App `gzc-intel-application-ac`.

## Original Problem
User reported: "is hte applciaiton insight on azure yorking ?"

**Evidence of Issue:**
- Azure CLI queries showed ZERO telemetry data in last 24 hours
- Container logs showed repeated 403 Forbidden errors from Application Insights
- Error: `'coroutine' object has no attribute 'expires_on'` indicating sync/async mismatch

## Root Cause Analysis
1. **Sync/Async Credential Mismatch**: OpenTelemetry Azure Monitor exporter expected synchronous credentials but received async coroutine objects
2. **Missing RBAC Permissions**: Container App's managed identity lacked `Monitoring Metrics Publisher` role on Application Insights resources
3. **Missing Dependency**: `aiohttp` package required for Azure SDK async operations was not in requirements.txt

## Solutions Implemented

### 1. Fixed Sync/Async Credential Issue
**File:** `/Main_Gateway/backend/app/services/azure_managed_identity.py`

**Changes:**
```python
# Added separate async and sync credentials
from azure.identity.aio import DefaultAzureCredential as AsyncDefaultAzureCredential
from azure.identity import DefaultAzureCredential

# In __init__:
self.credential = None  # Async credential for Key Vault operations
self.sync_credential = None  # Sync credential for OpenTelemetry

# In initialize():
if self.environment == "development":
    self.credential = AsyncDefaultAzureCredential()
    self.sync_credential = DefaultAzureCredential()
else:
    self.credential = AsyncManagedIdentityCredential()
    self.sync_credential = ManagedIdentityCredential()

# In _setup_application_insights():
configure_azure_monitor(
    connection_string=connection_string,
    credential=self.sync_credential  # Using sync credential
)
```

### 2. Added Missing Dependency
**File:** `/Main_Gateway/backend/requirements.txt`
```
aiohttp>=3.8.0  # Added for Azure SDK async operations
```

### 3. Assigned Required RBAC Roles
**Managed Identity:** `b7746c59-1dfa-4299-840d-bc36ac5cbd65`

**Role Assignments Created:**
```bash
# Application Insights resource
az role assignment create \
  --assignee b7746c59-1dfa-4299-840d-bc36ac5cbd65 \
  --role "Monitoring Metrics Publisher" \
  --scope "/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.Insights/components/claude-code-insights"

# Log Analytics workspace (required for modern Application Insights)
az role assignment create \
  --assignee b7746c59-1dfa-4299-840d-bc36ac5cbd65 \
  --role "Monitoring Metrics Publisher" \
  --scope "/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.OperationalInsights/workspaces/claude-code-logs"
```

## Deployment
**Version:** `v20250811-193228`
**Status:** Successfully deployed to Azure Container Apps

## Verification Results

### Container Logs (Evidence of Success)
**Before Fix:**
```
ERROR - Retryable server side error: Operation returned an invalid status 'Forbidden'
AttributeError: 'coroutine' object has no attribute 'expires_on'
```

**After Fix:**
```
INFO - Response status: 200
INFO - Transmission succeeded: Item received: 3. Items accepted: 3
```

### Continuous Monitoring
Application Insights now receives telemetry data every 5 seconds with successful transmissions.

## Outstanding Issue Discovered
**❌ NGINX Routing Problem**: The `/health` endpoint is serving frontend HTML instead of backend JSON.

**Evidence:**
```bash
curl https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io/health
# Returns: <!DOCTYPE html> (frontend) instead of JSON health status
```

**Root Cause:** Missing nginx route for `/health` endpoint in `nginx.conf`

**Fix Prepared:** Added nginx route to proxy `/health` to backend port 5000 (requires deployment)

## Resources Involved
- **Container App:** `gzc-intel-application-ac` in `gzc-kubernetes-rg`
- **Application Insights:** `claude-code-insights` in `gzc-kubernetes-rg`
- **Log Analytics:** `claude-code-logs` in `gzc-kubernetes-rg`
- **Managed Identity:** System-assigned with principal ID `b7746c59-1dfa-4299-840d-bc36ac5cbd65`

## Next Steps
1. **Optional**: Deploy nginx routing fix to resolve `/health` endpoint issue
2. **Monitor**: Application Insights dashboard should now show telemetry data
3. **Verify**: Frontend telemetry should also be flowing through

## Key Learnings
- Modern Application Insights uses workspace-based authentication requiring roles on both App Insights AND Log Analytics
- OpenTelemetry Azure Monitor exporter requires synchronous credentials, not async
- Azure SDK async operations need `aiohttp` dependency

---
**Report Generated:** 2025-08-11T17:54:32Z  
**Status:** Application Insights telemetry is fully operational ✅