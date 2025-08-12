# Application Insights - Complete Guide
**GZC Intel Application AC - Azure Monitoring & Telemetry**

## 🎯 Overview
Application Insights provides comprehensive monitoring and telemetry for the GZC Intel Application AC running on Azure Container Apps. This document covers architecture, configuration, troubleshooting, and operations.

---

## 📊 Current Status
**✅ OPERATIONAL** - Application Insights is fully functional as of 2025-08-11

### Quick Status Check
```bash
# Verify telemetry transmission
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --tail 10 | grep "Transmission succeeded"
```

**Expected Output:** `Transmission succeeded: Item received: 3. Items accepted: 3`

---

## 🏗️ Architecture

### Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Frontend      │    │   Main Gateway   │    │  Application        │
│   (React App)   │────│   Backend        │────│  Insights           │
│                 │    │   (FastAPI)      │    │  (claude-code-      │
│ MSAL Telemetry  │    │ OpenTelemetry    │    │   insights)         │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Log Analytics   │
                       │  Workspace       │
                       │ (claude-code-    │
                       │  logs)           │
                       └──────────────────┘
```

### Resources
- **Application Insights:** `claude-code-insights` (gzc-kubernetes-rg)
- **Log Analytics:** `claude-code-logs` (gzc-kubernetes-rg)
- **Container App:** `gzc-intel-application-ac` (gzc-kubernetes-rg)
- **Managed Identity:** `b7746c59-1dfa-4299-840d-bc36ac5cbd65`

---

## 🔧 Configuration

### Environment Variables
The application uses these environment variables for telemetry:

```bash
# Backend (Main Gateway)
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=068ac725-7cac-4272-8392-16ad8f1f3d9b;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=db6b4c43-b80a-43b4-89eb-f617082eb000"

# Frontend
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING="[same as above]"

# Environment
ENVIRONMENT="production"  # or "development"
```

### Backend Configuration
**File:** `/Main_Gateway/backend/app/services/azure_managed_identity.py`

```python
class AzureManagedIdentityService:
    def __init__(self):
        # Dual credential setup for sync/async compatibility
        self.credential = None       # Async for Key Vault
        self.sync_credential = None  # Sync for OpenTelemetry
    
    async def _setup_application_insights(self):
        # Get connection string from environment or Key Vault
        connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        
        if not connection_string:
            connection_string = await self.get_secret("application-insights-connection-string")
        
        if connection_string:
            # Configure with synchronous credential (critical!)
            configure_azure_monitor(
                connection_string=connection_string,
                credential=self.sync_credential  # NOT self.credential
            )
```

### Frontend Configuration
**File:** `/Main_Frontend/src/services/applicationInsights.ts`

```typescript
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true
  }
});

appInsights.loadAppInsights();
export default appInsights;
```

---

## 🛡️ Security & Permissions

### Required RBAC Roles
The container app's managed identity requires:

```bash
# Application Insights resource
az role assignment create \
  --assignee b7746c59-1dfa-4299-840d-bc36ac5cbd65 \
  --role "Monitoring Metrics Publisher" \
  --scope "/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.Insights/components/claude-code-insights"

# Log Analytics workspace (required for modern App Insights)
az role assignment create \
  --assignee b7746c59-1dfa-4299-840d-bc36ac5cbd65 \
  --role "Monitoring Metrics Publisher" \
  --scope "/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.OperationalInsights/workspaces/claude-code-logs"
```

### Authentication Flow
1. Container App uses system-assigned managed identity
2. Azure Identity SDK acquires tokens automatically
3. OpenTelemetry uses synchronous credentials for App Insights
4. Telemetry data flows to Log Analytics workspace

---

## 📋 Monitoring & Operations

### Health Checks

#### Container Logs
```bash
# Real-time monitoring
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --follow

# Check transmission status
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --tail 50 | grep "Transmission"

# Look for errors
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --tail 200 | grep -E "(ERROR|WARN|CRITICAL|Exception|Failed)"
```

#### Application Insights Queries
```kusto
// Request volume (last 24 hours)
requests
| where timestamp > ago(24h)
| summarize count() by bin(timestamp, 1h)
| order by timestamp desc

// Error rate
requests
| where timestamp > ago(24h)
| summarize total = count(), errors = countif(success == false)
| project error_rate = (errors * 100.0) / total

// Custom telemetry
traces
| where timestamp > ago(1h)
| where message contains "Azure Managed Identity"
| order by timestamp desc

// Performance metrics
requests
| where timestamp > ago(24h)
| summarize avg(duration), percentile(duration, 95), percentile(duration, 99) by name
| order by avg_duration desc
```

#### Azure Monitor Integration
```bash
# Check Application Insights metrics
az monitor metrics list \
  --resource "/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.Insights/components/claude-code-insights" \
  --metric "requests/count" \
  --start-time 2025-08-11T00:00:00Z

# List available metrics
az monitor metrics list-definitions \
  --resource "/subscriptions/6f928fec-8d15-47d7-b27b-be8b568e9789/resourceGroups/gzc-kubernetes-rg/providers/Microsoft.Insights/components/claude-code-insights"
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. 403 Forbidden Errors
**Symptoms:** `Operation returned an invalid status 'Forbidden'`
**Cause:** Missing RBAC permissions
**Fix:**
```bash
# Check current role assignments
az role assignment list --assignee b7746c59-1dfa-4299-840d-bc36ac5cbd65 --output table

# Add missing roles (see Security & Permissions section above)
```

#### 2. Sync/Async Credential Errors
**Symptoms:** `'coroutine' object has no attribute 'expires_on'`
**Cause:** OpenTelemetry exporter receiving async credential instead of sync
**Fix:** Ensure `sync_credential` is used in `configure_azure_monitor()`

#### 3. Missing Dependencies
**Symptoms:** `ModuleNotFoundError: No module named 'aiohttp'`
**Cause:** Azure SDK async operations require aiohttp
**Fix:** Add to requirements.txt: `aiohttp>=3.8.0`

#### 4. No Telemetry Data
**Check List:**
1. Environment variables set correctly
2. Managed identity has required roles
3. Connection string is valid
4. No firewall blocking `*.in.applicationinsights.azure.com`
5. Container app is running and not in failed state

### Diagnostic Commands
```bash
# 1. Check container app status
az containerapp show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --query "properties.runningStatus"

# 2. Check managed identity
az containerapp show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --query "identity"

# 3. Check environment variables
az containerapp show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --query "properties.template.containers[0].env[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING']"
```

---

## 🔄 Maintenance

### Regular Tasks

#### Weekly
- Review error logs and performance metrics
- Check for any failed telemetry transmissions
- Verify Application Insights dashboard functionality

#### Monthly
- Review and rotate connection strings if needed
- Check role assignment expiration
- Update Application Insights retention policies
- Review cost and usage metrics

#### Quarterly
- Update OpenTelemetry and Azure Monitor packages
- Review and update alerting rules
- Performance optimization based on telemetry data

### Deployment Updates
When deploying new versions:

1. **Verify telemetry flow post-deployment**
2. **Check for any new permission requirements**

```bash
# Post-deployment verification
az containerapp logs show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --tail 20 | grep -E "(Transmission|ERROR)"
```

---

## 📈 Metrics & Alerts

### Key Metrics to Monitor
- **Request Volume:** Requests per minute/hour
- **Error Rate:** Percentage of failed requests
- **Response Time:** P95 and P99 latencies
- **Availability:** Uptime percentage
- **Dependency Failures:** External service call failures

### Recommended Alerts
```bash
# High error rate (>5%)
# Response time degradation (P95 > 2 seconds)
# Complete telemetry loss (no data for 10 minutes)
# Container app restarts
# Failed dependency calls
```

---

## 🔗 Integration Points

### With Other Azure Services
- **Azure Container Apps:** Primary host platform
- **Azure Key Vault:** Secure secret storage
- **Log Analytics:** Data storage and querying
- **Azure Monitor:** Alerting and dashboards
- **Azure Active Directory:** Authentication integration

### With Application Components
- **Frontend (React):** Browser-side telemetry via MSAL
- **Main Gateway (FastAPI):** Server-side telemetry via OpenTelemetry
- **FSS Backend (Flask):** WebSocket and trading telemetry
- **Database Layer:** Query performance monitoring

---

## 📚 References

### Documentation
- [Azure Application Insights](https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [OpenTelemetry for Python](https://opentelemetry-python.readthedocs.io/)
- [Azure Container Apps Monitoring](https://docs.microsoft.com/azure/container-apps/monitoring)

### Internal Resources
- **Fix Report:** `/reports/application-insights-fix-report-2025-08-11.md`
- **CLAUDE.md:** Project configuration and Bloomberg integration
- **Deployment History:** Container app revisions and changes

---

## 🏷️ Metadata
- **Created:** 2025-08-11
- **Last Updated:** 2025-08-11
- **Version:** v1.0
- **Status:** Operational ✅
- **Contact:** System Manager Shell
- **Next Review:** 2025-09-11

---

*This documentation is maintained by the System Manager and updated with each significant change to the Application Insights configuration.*